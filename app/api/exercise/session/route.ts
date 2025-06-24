import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ExerciseSession } from '@/types/exercise';
import { createValidationMiddleware } from '@/utils/requestValidation';
import { sessionRateLimiter } from '@/utils/rateLimit';
import { decryptData, encryptData } from '@/utils/encryption';
import { validateSessionData } from '@/utils/validation';
import { logAudit } from '@/utils/auditLog';
import { backupSessionData } from '@/utils/backup';
import { recoveryManager } from '@/utils/recovery';
import { errorPreventionManager } from '@/utils/errorPrevention';

const validateRequest = createValidationMiddleware({
  rateLimiter: sessionRateLimiter
});

export async function POST(request: Request) {
  let status = 200;
  let userId = undefined;
  let requestId = request.headers.get('X-Request-ID') || undefined;
  let clientVersion = request.headers.get('X-Client-Version') || undefined;
  let ip = request.headers.get('x-forwarded-for') || undefined;
  let operationId: string | undefined;

  try {
    // Rate limiting check
    const rateLimitResult = await sessionRateLimiter.checkLimit(request);
    if (!rateLimitResult.allowed) {
      status = 429;
      logAudit({
        userId,
        action: 'create_exercise_session',
        endpoint: '/api/exercise/session',
        method: 'POST',
        status,
        requestId,
        clientVersion,
        ip,
        details: { error: 'rate_limit_exceeded' }
      });
      return new NextResponse(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { 
          status,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': rateLimitResult.retryAfter.toString()
          }
        }
      );
    }

    // Validate request
    if (!request.headers.get('Content-Type')?.includes('application/json')) {
      status = 400;
      logAudit({
        userId,
        action: 'create_exercise_session',
        endpoint: '/api/exercise/session',
        method: 'POST',
        status,
        requestId,
        clientVersion,
        ip,
        details: { error: 'invalid_content_type' }
      });
      return new NextResponse(
        JSON.stringify({ error: 'Content-Type must be application/json' }),
        { status }
      );
    }

    // Get and decrypt data
    const encryptedData = await request.json();
    const sessionData = await decryptData(encryptedData);
    userId = sessionData.userId;

    // Validate operation
    const validationResult = await errorPreventionManager.validateOperation('create', sessionData);
    if (!validationResult.valid) {
      status = 400;
      logAudit({
        userId,
        action: 'create_exercise_session',
        endpoint: '/api/exercise/session',
        method: 'POST',
        status,
        requestId,
        clientVersion,
        ip,
        details: { error: validationResult.errors?.join(', ') }
      });
      return new NextResponse(
        JSON.stringify({ error: validationResult.errors?.join(', ') }),
        { status }
      );
    }

    // Track operation
    operationId = await errorPreventionManager.trackOperation('create', sessionData);

    // Verify user session
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.id !== userId) {
      status = 401;
      await errorPreventionManager.updateOperationStatus(operationId, 'failed', 'Unauthorized');
      logAudit({
        userId,
        action: 'create_exercise_session',
        endpoint: '/api/exercise/session',
        method: 'POST',
        status,
        requestId,
        clientVersion,
        ip,
        details: { error: 'unauthorized' }
      });
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status }
      );
    }

    try {
      await errorPreventionManager.updateOperationStatus(operationId, 'processing');

      // Save to database with transaction
      const exerciseSession = await prisma.$transaction(async (tx) => {
        const session = await tx.exerciseSession.create({
      data: {
            userId: sessionData.userId,
            exerciseId: sessionData.exerciseId,
            startTime: new Date(sessionData.startTime),
            endTime: new Date(sessionData.endTime),
            sets: sessionData.sets,
            reps: sessionData.reps,
            weight: sessionData.weight,
            duration: sessionData.duration,
            caloriesBurned: sessionData.caloriesBurned,
            notes: sessionData.notes
          }
        });
        return session;
      });

      await errorPreventionManager.updateOperationStatus(operationId, 'completed');

      // Encrypt response data
      const responseData = await encryptData({
        success: true,
        sessionId: exerciseSession.id,
        timestamp: new Date().toISOString()
      });

      logAudit({
        userId,
        action: 'create_exercise_session',
        endpoint: '/api/exercise/session',
        method: 'POST',
        status,
        requestId,
        clientVersion,
        ip,
        details: { sessionId: exerciseSession.id }
      });

      return new NextResponse(
        JSON.stringify(responseData),
        { 
          status,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId || crypto.randomUUID()
          }
        }
      );
    } catch (dbError) {
      await errorPreventionManager.handleOperationError(
        operationId,
        dbError instanceof Error ? dbError : new Error('database_error'),
        sessionData
      );

      // Backup session data
      await backupSessionData(sessionData);
      
      status = 500;
      logAudit({
        userId,
        action: 'create_exercise_session',
        endpoint: '/api/exercise/session',
        method: 'POST',
        status,
        requestId,
        clientVersion,
        ip,
        details: { 
          error: dbError instanceof Error ? dbError.message : 'database_error',
          operationId 
        }
      });

      return new NextResponse(
        JSON.stringify({ 
          error: 'Failed to save exercise session. Data backed up and queued for recovery.',
          details: {
            error: dbError instanceof Error ? dbError.message : 'Unknown error',
            operationId
          }
        }),
        { status }
      );
    }
  } catch (error) {
    if (operationId) {
      await errorPreventionManager.handleOperationError(
        operationId,
        error instanceof Error ? error : new Error('unknown_error'),
        {} as ExerciseSession
      );
    }

    status = 500;
    logAudit({
      userId,
      action: 'create_exercise_session',
      endpoint: '/api/exercise/session',
      method: 'POST',
      status,
      requestId,
      clientVersion,
      ip,
      details: { 
        error: error instanceof Error ? error.message : 'unknown',
        operationId 
      }
    });
    console.error('Error processing exercise session:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        operationId
      }),
      { status }
    );
  }
}

export async function PUT(request: Request) {
  let status = 200;
  let userId = undefined;
  let requestId = request.headers.get('X-Request-ID') || undefined;
  let clientVersion = request.headers.get('X-Client-Version') || undefined;
  let ip = request.headers.get('x-forwarded-for') || undefined;

  try {
    // Rate limiting check
    const rateLimitResult = await sessionRateLimiter.checkLimit(request);
    if (!rateLimitResult.allowed) {
      status = 429;
      logAudit({
        userId,
        action: 'update_exercise_session',
        endpoint: '/api/exercise/session',
        method: 'PUT',
        status,
        requestId,
        clientVersion,
        ip,
        details: { error: 'rate_limit_exceeded' }
      });
      return new NextResponse(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { 
          status,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': rateLimitResult.retryAfter.toString()
          }
        }
      );
    }

    // Validate request
    if (!request.headers.get('Content-Type')?.includes('application/json')) {
      status = 400;
      logAudit({
        userId,
        action: 'update_exercise_session',
        endpoint: '/api/exercise/session',
        method: 'PUT',
        status,
        requestId,
        clientVersion,
        ip,
        details: { error: 'invalid_content_type' }
      });
      return new NextResponse(
        JSON.stringify({ error: 'Content-Type must be application/json' }),
        { status }
      );
    }

    // Get and decrypt data
    const encryptedData = await request.json();
    const sessionData = await decryptData(encryptedData);
    userId = sessionData.userId;

    // Validate session data
    const validationError = validateSessionData(sessionData);
    if (validationError) {
      status = 400;
      logAudit({
        userId,
        action: 'update_exercise_session',
        endpoint: '/api/exercise/session',
        method: 'PUT',
        status,
        requestId,
        clientVersion,
        ip,
        details: { error: validationError }
      });
      return new NextResponse(
        JSON.stringify({ error: validationError }),
        { status }
      );
    }

    // Verify user session
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.id !== userId) {
      status = 401;
      logAudit({
        userId,
        action: 'update_exercise_session',
        endpoint: '/api/exercise/session',
        method: 'PUT',
        status,
        requestId,
        clientVersion,
        ip,
        details: { error: 'unauthorized' }
      });
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status }
      );
    }

    try {
      // Update in database with transaction
      const exerciseSession = await prisma.$transaction(async (tx) => {
        // First verify the session exists and belongs to the user
        const existingSession = await tx.exerciseSession.findFirst({
          where: {
            id: sessionData.id,
            userId: userId
          }
        });

        if (!existingSession) {
          throw new Error('Exercise session not found or unauthorized');
        }

        // Update the session
        const updatedSession = await tx.exerciseSession.update({
          where: {
            id: sessionData.id
          },
          data: {
            exerciseId: sessionData.exerciseId,
            startTime: new Date(sessionData.startTime),
            endTime: new Date(sessionData.endTime),
            sets: sessionData.sets,
            reps: sessionData.reps,
            weight: sessionData.weight,
            duration: sessionData.duration,
            caloriesBurned: sessionData.caloriesBurned,
            notes: sessionData.notes
          }
        });
        return updatedSession;
      });

      // Encrypt response data
      const responseData = await encryptData({
        success: true,
        sessionId: exerciseSession.id,
        timestamp: new Date().toISOString()
      });

      logAudit({
        userId,
        action: 'update_exercise_session',
        endpoint: '/api/exercise/session',
        method: 'PUT',
        status,
        requestId,
        clientVersion,
        ip,
        details: { sessionId: exerciseSession.id }
      });

      return new NextResponse(
        JSON.stringify(responseData),
        { 
          status,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId || crypto.randomUUID()
          }
        }
      );
    } catch (dbError) {
      // Add to recovery queue if database update fails
      const recoveryId = await recoveryManager.addToRecoveryQueue(
        'update',
        sessionData,
        dbError instanceof Error ? dbError.message : 'database_error'
      );

      // Backup session data
      await backupSessionData(sessionData);
      
      status = 500;
      logAudit({
        userId,
        action: 'update_exercise_session',
        endpoint: '/api/exercise/session',
        method: 'PUT',
        status,
        requestId,
        clientVersion,
        ip,
        details: { 
          error: dbError instanceof Error ? dbError.message : 'database_error',
          recoveryId 
        }
      });

      return new NextResponse(
        JSON.stringify({ 
          error: 'Failed to update exercise session. Data backed up and queued for recovery.',
          details: {
            error: dbError instanceof Error ? dbError.message : 'Unknown error',
            recoveryId
          }
        }),
        { status }
      );
    }
  } catch (error) {
    status = 500;
    logAudit({
      userId,
      action: 'update_exercise_session',
      endpoint: '/api/exercise/session',
      method: 'PUT',
      status,
      requestId,
      clientVersion,
      ip,
      details: { error: error instanceof Error ? error.message : 'unknown' }
    });
    console.error('Error updating exercise session:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status }
    );
  }
}

export async function DELETE(request: Request) {
  let status = 200;
  let userId = undefined;
  let requestId = request.headers.get('X-Request-ID') || undefined;
  let clientVersion = request.headers.get('X-Client-Version') || undefined;
  let ip = request.headers.get('x-forwarded-for') || undefined;

  try {
    // Rate limiting check
    const rateLimitResult = await sessionRateLimiter.checkLimit(request);
    if (!rateLimitResult.allowed) {
      status = 429;
      logAudit({
        userId,
        action: 'delete_exercise_session',
        endpoint: '/api/exercise/session',
        method: 'DELETE',
        status,
        requestId,
        clientVersion,
        ip,
        details: { error: 'rate_limit_exceeded' }
      });
      return new NextResponse(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { 
          status,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': rateLimitResult.retryAfter.toString()
          }
        }
      );
    }

    // Get session ID from URL
    const url = new URL(request.url);
    const sessionId = url.pathname.split('/').pop();

    if (!sessionId) {
      status = 400;
      logAudit({
        userId,
        action: 'delete_exercise_session',
        endpoint: '/api/exercise/session',
        method: 'DELETE',
        status,
        requestId,
        clientVersion,
        ip,
        details: { error: 'missing_session_id' }
      });
      return new NextResponse(
        JSON.stringify({ error: 'Session ID is required' }),
        { status }
      );
    }

    // Verify user session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      status = 401;
      logAudit({
        userId,
        action: 'delete_exercise_session',
        endpoint: '/api/exercise/session',
        method: 'DELETE',
        status,
        requestId,
        clientVersion,
        ip,
        details: { error: 'unauthorized' }
      });
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status }
      );
    }

    try {
      // Delete from database with transaction
      await prisma.$transaction(async (tx) => {
        // First verify the session exists and belongs to the user
        const existingSession = await tx.exerciseSession.findFirst({
          where: {
            id: sessionId,
            userId: session.user.id
          }
        });

        if (!existingSession) {
          throw new Error('Exercise session not found or unauthorized');
        }

        // Delete the session
        await tx.exerciseSession.delete({
          where: {
            id: sessionId
          }
        });
      });

      logAudit({
        userId: session.user.id,
        action: 'delete_exercise_session',
        endpoint: '/api/exercise/session',
        method: 'DELETE',
        status,
        requestId,
        clientVersion,
        ip,
        details: { sessionId }
      });

      return new NextResponse(
        JSON.stringify({ 
          success: true,
          message: 'Session deleted successfully',
          timestamp: new Date().toISOString()
        }),
        { 
          status,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId || crypto.randomUUID()
          }
        }
      );
    } catch (dbError) {
      // Add to recovery queue if database delete fails
      const recoveryId = await recoveryManager.addToRecoveryQueue(
        'delete',
        { id: sessionId, userId: session.user.id } as ExerciseSession,
        dbError instanceof Error ? dbError.message : 'database_error'
      );
      
      status = 500;
      logAudit({
        userId: session.user.id,
        action: 'delete_exercise_session',
        endpoint: '/api/exercise/session',
        method: 'DELETE',
        status,
        requestId,
        clientVersion,
        ip,
        details: { 
          error: dbError instanceof Error ? dbError.message : 'database_error',
          recoveryId 
        }
      });

      return new NextResponse(
        JSON.stringify({ 
          error: 'Failed to delete exercise session. Operation queued for recovery.',
          details: {
            error: dbError instanceof Error ? dbError.message : 'Unknown error',
            recoveryId
          }
        }),
        { status }
      );
    }
  } catch (error) {
    status = 500;
    logAudit({
      userId,
      action: 'delete_exercise_session',
      endpoint: '/api/exercise/session',
      method: 'DELETE',
      status,
      requestId,
      clientVersion,
      ip,
      details: { error: error instanceof Error ? error.message : 'unknown' }
    });
    console.error('Error deleting exercise session:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status }
    );
  }
}

export async function GET(request: Request) {
  let status = 200;
  let userId = undefined;
  let requestId = request.headers.get('X-Request-ID') || undefined;
  let clientVersion = request.headers.get('X-Client-Version') || undefined;
  let ip = request.headers.get('x-forwarded-for') || undefined;
  try {
    // Validate request
    const validationResponse = await validateRequest(request);
    if (validationResponse) {
      status = validationResponse.status || 400;
      logAudit({
        userId,
        action: 'get_exercise_sessions',
        endpoint: '/api/exercise/session',
        method: 'GET',
        status,
        requestId,
        clientVersion,
        ip,
        details: { error: 'validation_failed' }
      });
      return validationResponse;
    }

    // Get user ID from authorization header
    const authHeader = request.headers.get('Authorization');
    userId = authHeader?.split(' ')[1];

    if (!userId) {
      status = 401;
      logAudit({
        userId,
        action: 'get_exercise_sessions',
        endpoint: '/api/exercise/session',
        method: 'GET',
        status,
        requestId,
        clientVersion,
        ip,
        details: { error: 'unauthorized' }
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status }
      );
    }

    // Fetch user's exercise sessions
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const exerciseSessions = await prisma.exerciseSession.findMany({
      where: {
        userId: userId,
        ...(startDate && endDate
          ? {
              startTime: {
                gte: new Date(startDate),
                lte: new Date(endDate),
              },
            }
          : {}),
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    // Encrypt response data
    const encryptedResponse = await encryptData({
      success: true,
      sessions: exerciseSessions,
      timestamp: new Date().toISOString()
    });

    logAudit({
      userId,
      action: 'get_exercise_sessions',
      endpoint: '/api/exercise/session',
      method: 'GET',
      status,
      requestId,
      clientVersion,
      ip,
      details: { sessionCount: exerciseSessions.length }
    });

    return NextResponse.json(encryptedResponse, {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId || crypto.randomUUID()
      }
    });
  } catch (error) {
    status = 500;
    logAudit({
      userId,
      action: 'get_exercise_sessions',
      endpoint: '/api/exercise/session',
      method: 'GET',
      status,
      requestId,
      clientVersion,
      ip,
      details: { error: error instanceof Error ? error.message : 'unknown' }
    });
    console.error('Error fetching exercise sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status }
    );
  }
}

// Add new endpoint for recovery management
export async function PATCH(request: Request) {
  let status = 200;
  let userId = undefined;
  let requestId = request.headers.get('X-Request-ID') || undefined;
  let clientVersion = request.headers.get('X-Client-Version') || undefined;
  let ip = request.headers.get('x-forwarded-for') || undefined;

  try {
    // Verify user session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      status = 401;
      logAudit({
        userId,
        action: 'manage_recovery',
        endpoint: '/api/exercise/session',
        method: 'PATCH',
        status,
        requestId,
        clientVersion,
        ip,
        details: { error: 'unauthorized' }
      });
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status }
      );
    }

    const { action } = await request.json();

    switch (action) {
      case 'process':
        const results = await recoveryManager.processRecoveryQueue();
        return new NextResponse(
          JSON.stringify({ 
            success: true,
            results,
            timestamp: new Date().toISOString()
          }),
          { 
            status,
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': requestId || crypto.randomUUID()
            }
          }
        );

      case 'status':
        const status = await recoveryManager.getRecoveryStatus();
        return new NextResponse(
          JSON.stringify({ 
            success: true,
            status,
            timestamp: new Date().toISOString()
          }),
          { 
            status,
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': requestId || crypto.randomUUID()
            }
          }
        );

      case 'clear':
        await recoveryManager.clearRecoveryQueue();
        return new NextResponse(
          JSON.stringify({ 
            success: true,
            message: 'Recovery queue cleared',
            timestamp: new Date().toISOString()
          }),
          { 
            status,
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': requestId || crypto.randomUUID()
            }
          }
        );

      default:
        status = 400;
        return new NextResponse(
          JSON.stringify({ error: 'Invalid action' }),
          { status }
        );
    }
  } catch (error) {
    status = 500;
    logAudit({
      userId,
      action: 'manage_recovery',
      endpoint: '/api/exercise/session',
      method: 'PATCH',
      status,
      requestId,
      clientVersion,
      ip,
      details: { error: error instanceof Error ? error.message : 'unknown' }
    });
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status }
    );
  }
} 