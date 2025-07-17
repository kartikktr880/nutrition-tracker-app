import { NextResponse } from 'next/server';
import { apiDocs } from '@/lib/api-documentation';

export async function GET() {
  try {
    const markdown = apiDocs.generateMarkdownDocs();
    
    return new NextResponse(markdown, {
      headers: {
        'Content-Type': 'text/markdown',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    // Markdown docs generation error - handled by error boundary
    return NextResponse.json(
      { error: 'Failed to generate Markdown documentation' },
      { status: 500 }
    );
  }
} 