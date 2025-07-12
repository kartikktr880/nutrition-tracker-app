import { NextResponse } from 'next/server';

// eslint-disable-next-line import/no-named-as-default
import healthMonitor from '@/lib/health-monitor';
import { performanceAlertService } from '@/lib/performance-alerts';
import { securityService } from '@/lib/security';
import { logError } from '@/utils/logger';

export async function GET() {
  try {
    // Initialize performance alert service
    await performanceAlertService.initialize();

    // Get health status
    const healthStatus = await healthMonitor.getHealthStatus();
    
    // Get security status
    const securityStatus = {
      activeSessions: await securityService.getActiveSessionCount(),
      lockedAccounts: await securityService.getLockedAccountCount(),
      lastCleanup: await securityService.getLastCleanupTime()
    };

    return NextResponse.json({
      status: healthStatus.status,
      timestamp: new Date().toISOString(),
      checks: healthStatus.checks,
      metrics: healthStatus.metrics,
      security: securityStatus
    });
  } catch (error: unknown) {
    logError('Health check failed:', error);
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    );
  }
}

// Add a more detailed health check endpoint
export async function POST(request: Request) {
  try {
    const { checks } = await request.json();
    
    // Run specific health checks if requested
    const results = await Promise.all(
      checks.map(async (check: string) => {
        const status = await healthMonitor.getHealthStatus();
        return {
          name: check,
          status: status.checks.find(c => c.name === check)?.status || 'unknown'
        };
      })
    );

    return NextResponse.json({ results });
  } catch (error: unknown) {
    logError('Detailed health check failed:', error);
    return NextResponse.json(
      { error: 'Detailed health check failed' },
      { status: 500 }
    );
  }
} 






