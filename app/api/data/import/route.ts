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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const format = formData.get('format') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!format) {
      return NextResponse.json(
        { error: 'Import format is required' },
        { status: 400 }
      );
    }

    // Validate format
    const supportedFormats = DataPortability.getSupportedImportFormats();
    if (!(supportedFormats as string[]).includes(format)) {
      return NextResponse.json(
        { error: `Unsupported format: ${format}` },
        { status: 400 }
      );
    }

    // Cast format to ImportFormat after validation
    const importFormat = format as import('@/lib/data-portability').ImportFormat;

    // Validate file format
    if (!DataPortability.validateFileFormat(file, importFormat)) {
      return NextResponse.json(
        { error: 'Invalid file format' },
        { status: 400 }
      );
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Import data
    const result = await DataPortability.importData(file, importFormat);

    return NextResponse.json({
      success: result.success,
      imported: result.imported,
      errors: result.errors,
      warnings: result.warnings,
    });

  } catch (error) {
    // Data import error - handled by error boundary
    return NextResponse.json(
      { error: 'Import failed' },
      { status: 500 }
    );
  }
} 