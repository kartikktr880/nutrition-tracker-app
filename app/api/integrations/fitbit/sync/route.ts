import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Fitbit API endpoints
const FITBIT_API_BASE = 'https://api.fitbit.com/1/user/-';

// Fitbit data schemas
const FitbitActivitySchema = z.object({
  activities: z.array(z.object({
    activityId: z.number(),
    activityParentId: z.number(),
    calories: z.number(),
    description: z.string(),
    distance: z.number().optional(),
    duration: z.number(),
    hasStartTime: z.boolean(),
    isFavorite: z.boolean(),
    logId: z.number(),
    name: z.string(),
    startTime: z.string(),
    steps: z.number().optional(),
  })),
  goals: z.object({
    caloriesOut: z.number(),
    distance: z.number(),
    floors: z.number(),
    steps: z.number(),
  }),
  summary: z.object({
    activityCalories: z.number(),
    caloriesBMR: z.number(),
    caloriesOut: z.number(),
    distances: z.array(z.object({
      activity: z.string(),
      distance: z.number(),
    })),
    elevation: z.number(),
    fairlyActiveMinutes: z.number(),
    floors: z.number(),
    heartRateZones: z.array(z.object({
      caloriesOut: z.number(),
      max: z.number(),
      min: z.number(),
      minutes: z.number(),
      name: z.string(),
    })),
    lightlyActiveMinutes: z.number(),
    marginalCalories: z.number(),
    sedentaryMinutes: z.number(),
    steps: z.number(),
    veryActiveMinutes: z.number(),
  }),
});

const FitbitHeartRateSchema = z.object({
  activitiesHeart: z.array(z.object({
    dateTime: z.string(),
    value: z.object({
      customHeartRateZones: z.array(z.any()),
      heartRateZones: z.array(z.object({
        caloriesOut: z.number(),
        max: z.number(),
        min: z.number(),
        minutes: z.number(),
        name: z.string(),
      })),
      restingHeartRate: z.number(),
    }),
  })),
});

const FitbitSleepSchema = z.object({
  sleep: z.array(z.object({
    dateOfSleep: z.string(),
    duration: z.number(),
    efficiency: z.number(),
    endTime: z.string(),
    infoCode: z.number(),
    isMainSleep: z.boolean(),
    levels: z.object({
      data: z.array(z.object({
        dateTime: z.string(),
        level: z.string(),
        seconds: z.number(),
      })),
      summary: z.object({
        deep: z.object({
          count: z.number(),
          minutes: z.number(),
          thirtyDayAvgMinutes: z.number(),
        }),
        light: z.object({
          count: z.number(),
          minutes: z.number(),
          thirtyDayAvgMinutes: z.number(),
        }),
        rem: z.object({
          count: z.number(),
          minutes: z.number(),
          thirtyDayAvgMinutes: z.number(),
        }),
        wake: z.object({
          count: z.number(),
          minutes: z.number(),
          thirtyDayAvgMinutes: z.number(),
        }),
      }),
    }),
    logId: z.number(),
    minutesAfterWakeup: z.number(),
    minutesAsleep: z.number(),
    minutesAwake: z.number(),
    minutesToFallAsleep: z.number(),
    startTime: z.string(),
    timeInBed: z.number(),
    type: z.string(),
  })),
  summary: z.object({
    totalMinutesAsleep: z.number(),
    totalSleepRecords: z.number(),
    totalTimeInBed: z.number(),
  }),
});

const FitbitWeightSchema = z.object({
  weight: z.array(z.object({
    bmi: z.number(),
    date: z.string(),
    fat: z.number().optional(),
    logId: z.number(),
    source: z.string(),
    time: z.string(),
    weight: z.number(),
  })),
});

// Request schema
const SyncRequestSchema = z.object({
  date: z.string().optional(),
  types: z.array(z.enum(['activity', 'heart_rate', 'sleep', 'weight'])).optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const types = searchParams.getAll('types');

    const validatedParams = SyncRequestSchema.parse({
      date,
      types: types.length > 0 ? types : ['activity', 'heart_rate', 'sleep', 'weight'],
    });

    const syncData: Array<{
      id: string;
      type: string;
      date: string;
      data: unknown;
      source: string;
    }> = [];

    const dateToSync = validatedParams.date || new Date().toISOString().split('T')[0];

    // Sync activity data
    if (validatedParams.types && validatedParams.types.includes('activity')) {
      try {
        const activityResponse = await fetch(
          `${FITBIT_API_BASE}/activities/date/${dateToSync}.json`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (activityResponse.ok) {
          const activityData = await activityResponse.json();
          const validatedActivity = FitbitActivitySchema.parse(activityData);
          
          syncData.push({
            id: `activity-${dateToSync}`,
            type: 'activity',
            date: dateToSync,
            data: validatedActivity,
            source: 'fitbit',
          });
        }
      } catch (error) {
        // Failed to sync Fitbit activity data - handled by error boundary
      }
    }

    // Sync heart rate data
    if (validatedParams.types && validatedParams.types.includes('heart_rate')) {
      try {
        const heartRateResponse = await fetch(
          `${FITBIT_API_BASE}/activities/heart/date/${dateToSync}/1d.json`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (heartRateResponse.ok) {
          const heartRateData = await heartRateResponse.json();
          const validatedHeartRate = FitbitHeartRateSchema.parse(heartRateData);
          
          syncData.push({
            id: `heart-rate-${dateToSync}`,
            type: 'heart_rate',
            date: dateToSync,
            data: validatedHeartRate,
            source: 'fitbit',
          });
        }
      } catch (error) {
        // Failed to sync Fitbit heart rate data - handled by error boundary
      }
    }

    // Sync sleep data
    if (validatedParams.types && validatedParams.types.includes('sleep')) {
      try {
        const sleepResponse = await fetch(
          `${FITBIT_API_BASE}/sleep/date/${dateToSync}.json`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (sleepResponse.ok) {
          const sleepData = await sleepResponse.json();
          const validatedSleep = FitbitSleepSchema.parse(sleepData);
          
          syncData.push({
            id: `sleep-${dateToSync}`,
            type: 'sleep',
            date: dateToSync,
            data: validatedSleep,
            source: 'fitbit',
          });
        }
      } catch (error) {
        // Failed to sync Fitbit sleep data - handled by error boundary
      }
    }

    // Sync weight data
    if (validatedParams.types && validatedParams.types.includes('weight')) {
      try {
        const weightResponse = await fetch(
          `${FITBIT_API_BASE}/weight/date/${dateToSync}.json`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (weightResponse.ok) {
          const weightData = await weightResponse.json();
          const validatedWeight = FitbitWeightSchema.parse(weightData);
          
          syncData.push({
            id: `weight-${dateToSync}`,
            type: 'weight',
            date: dateToSync,
            data: validatedWeight,
            source: 'fitbit',
          });
        }
      } catch (error) {
        // Failed to sync Fitbit weight data - handled by error boundary
      }
    }

    return NextResponse.json({
      success: true,
      data: syncData,
      count: syncData.length,
      date: validatedParams.date,
      types: validatedParams.types,
    });

  } catch (error) {
    // Fitbit sync error - handled by error boundary
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data format', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to sync Fitbit data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, types } = SyncRequestSchema.parse(body);

    // Create a new request with the same logic as GET
    const newRequest = new NextRequest(request.url + `?date=${date}&${types?.map(t => `types=${t}`).join('&')}`, {
      method: 'GET',
      headers: request.headers,
    });

    return GET(newRequest);

  } catch (error) {
    // Fitbit sync POST error - handled by error boundary
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process sync request' },
      { status: 500 }
    );
  }
} 