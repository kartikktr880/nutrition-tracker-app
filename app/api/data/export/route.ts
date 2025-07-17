import { NextRequest, NextResponse } from 'next/server';
import { DataPortability } from '@/lib/data-portability';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const { format, options } = await request.json();

    if (!format) {
      return NextResponse.json(
        { error: 'Export format is required' },
        { status: 400 }
      );
    }

    // Validate format
    const supportedFormats = DataPortability.getSupportedExportFormats();
    if (!supportedFormats.includes(format)) {
      return NextResponse.json(
        { error: `Unsupported format: ${format}` },
        { status: 400 }
      );
    }

    // Export data
    const result = await DataPortability.exportData(format, options);

    // Return appropriate response based on format
    if (format === 'json') {
      return NextResponse.json(JSON.parse(result as string));
    } else if (format === 'csv') {
      return new NextResponse(result as string, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="nutrition-tracker-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else if (format === 'xml') {
      return new NextResponse(result as string, {
        headers: {
          'Content-Type': 'application/xml',
          'Content-Disposition': `attachment; filename="nutrition-tracker-export-${new Date().toISOString().split('T')[0]}.xml"`,
        },
      });
    } else if (format === 'pdf') {
      return new NextResponse(result as Blob, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="nutrition-tracker-export-${new Date().toISOString().split('T')[0]}.pdf"`,
        },
      });
    }

    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    );

  } catch (error) {
    // Data export error - handled by error boundary
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    );
  }
} 