import { NextResponse } from 'next/server';
import { apiDocs } from '@/lib/api-documentation';

export async function GET() {
  try {
    const types = apiDocs.generateTypeScriptTypes();
    
    return new NextResponse(types, {
      headers: {
        'Content-Type': 'text/typescript',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    // TypeScript types generation error - handled by error boundary
    return NextResponse.json(
      { error: 'Failed to generate TypeScript types' },
      { status: 500 }
    );
  }
} 