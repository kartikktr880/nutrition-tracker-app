import { NextResponse } from 'next/server';
import { apiDocs } from '@/lib/api-documentation';

export async function GET() {
  try {
    const spec = apiDocs.generateOpenAPISpec();
    
    return NextResponse.json(spec, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    // OpenAPI spec generation error - handled by error boundary
    return NextResponse.json(
      { error: 'Failed to generate OpenAPI specification' },
      { status: 500 }
    );
  }
} 