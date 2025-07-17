// Image optimization utilities
export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: 'top' | 'right top' | 'right' | 'right bottom' | 'bottom' | 'left bottom' | 'left' | 'left top' | 'center';
  background?: string;
  blur?: number;
  sharpen?: number;
  grayscale?: boolean;
  flip?: 'horizontal' | 'vertical';
  flop?: boolean;
  rotate?: number;
  tint?: string;
  negate?: boolean;
  normalize?: boolean;
  threshold?: number;
  trim?: number;
  gamma?: number;
  brightness?: number;
  saturation?: number;
  hue?: number;
  lightness?: number;
  contrast?: number;
}

// Default optimization options
export const DEFAULT_OPTIMIZATION_OPTIONS: ImageOptimizationOptions = {
  quality: 80,
  format: 'webp',
  fit: 'cover',
  position: 'center',
};

// Generate optimized image URL
export function generateOptimizedImageUrl(
  originalUrl: string,
  options: ImageOptimizationOptions = {}
): string {
  // If it's already an optimized URL or external URL, return as is
  if (originalUrl.startsWith('data:') || originalUrl.startsWith('blob:') || originalUrl.includes('http')) {
    return originalUrl;
  }

  const url = new URL(originalUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  
  // Add optimization parameters
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, value.toString());
    }
  });

  return url.toString();
}

// Generate responsive image srcset
export function generateResponsiveSrcSet(
  originalUrl: string,
  widths: number[],
  options: ImageOptimizationOptions = {}
): string {
  return widths
    .map(width => {
      const optimizedUrl = generateOptimizedImageUrl(originalUrl, {
        ...options,
        width,
      });
      return `${optimizedUrl} ${width}w`;
    })
    .join(', ');
}

// Generate sizes attribute for responsive images
export function generateSizesAttribute(
  breakpoints: { [key: string]: string } = {
    '640px': '100vw',
    '1024px': '50vw',
    '1280px': '33vw',
  }
): string {
  return Object.entries(breakpoints)
    .map(([breakpoint, size]) => `(max-width: ${breakpoint}) ${size}`)
    .join(', ');
}

// Preload critical images
export function preloadImage(src: string, options: ImageOptimizationOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const optimizedSrc = generateOptimizedImageUrl(src, options);
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = optimizedSrc;
    
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to preload image: ${optimizedSrc}`));
    
    document.head.appendChild(link);
  });
}

// Lazy load images with intersection observer
export function createLazyImageLoader(
  selector: string,
  options: {
    threshold?: number;
    rootMargin?: string;
    onLoad?: (img: HTMLImageElement) => void;
    onError?: (img: HTMLImageElement) => void;
  } = {}
): () => void {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    onLoad,
    onError,
  } = options;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const dataSrc = img.dataset.src;
          
          if (dataSrc) {
            img.src = dataSrc;
            img.removeAttribute('data-src');
            
            img.onload = () => {
              img.classList.add('loaded');
              onLoad?.(img);
            };
            
            img.onerror = () => {
              onError?.(img);
            };
            
            observer.unobserve(img);
          }
        }
      });
    },
    { threshold, rootMargin }
  );

  // Observe all images with data-src attribute
  const images = document.querySelectorAll(`${selector}[data-src]`);
  images.forEach((img) => observer.observe(img));

  // Return cleanup function
  return () => observer.disconnect();
}

// Image compression utilities
export class ImageCompressor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  // Compress image with quality control
  async compress(
    file: File,
    options: {
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
      format?: 'jpeg' | 'png' | 'webp';
    } = {}
  ): Promise<File> {
    const {
      quality = 0.8,
      maxWidth,
      maxHeight,
      format = 'jpeg',
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          // Calculate new dimensions
          let { width, height } = img;
          
          if (maxWidth && width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          if (maxHeight && height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          // Set canvas dimensions
          this.canvas.width = width;
          this.canvas.height = height;

          // Draw and compress
          this.ctx.drawImage(img, 0, 0, width, height);
          
          const mimeType = `image/${format}`;
          this.canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: mimeType,
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            mimeType,
            quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  // Generate thumbnail
  async generateThumbnail(
    file: File,
    size: number = 150,
    quality: number = 0.7
  ): Promise<File> {
    return this.compress(file, {
      maxWidth: size,
      maxHeight: size,
      quality,
      format: 'jpeg',
    });
  }

  // Convert image format
  async convertFormat(
    file: File,
    format: 'jpeg' | 'png' | 'webp'
  ): Promise<File> {
    return this.compress(file, { format });
  }
}

// Image analysis utilities
export class ImageAnalyzer {
  // Get image dimensions
  static getDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  // Get file size in human readable format
  static getFileSize(file: File): string {
    const bytes = file.size;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Check if image is too large
  static isImageTooLarge(file: File, maxSizeMB: number = 5): boolean {
    return file.size > maxSizeMB * 1024 * 1024;
  }

  // Get image aspect ratio
  static getAspectRatio(width: number, height: number): number {
    return width / height;
  }

  // Check if image is landscape
  static isLandscape(width: number, height: number): boolean {
    return width > height;
  }

  // Check if image is portrait
  static isPortrait(width: number, height: number): boolean {
    return height > width;
  }

  // Check if image is square
  static isSquare(width: number, height: number): boolean {
    return width === height;
  }
}

// Image validation utilities
export class ImageValidator {
  // Validate file type
  static isValidType(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
    return validTypes.includes(file.type);
  }

  // Validate file size
  static isValidSize(file: File, maxSizeMB: number = 10): boolean {
    return file.size <= maxSizeMB * 1024 * 1024;
  }

  // Validate image dimensions
  static async isValidDimensions(
    file: File,
    minWidth: number = 100,
    minHeight: number = 100,
    maxWidth: number = 5000,
    maxHeight: number = 5000
  ): Promise<boolean> {
    try {
      const { width, height } = await ImageAnalyzer.getDimensions(file);
      return width >= minWidth && height >= minHeight && width <= maxWidth && height <= maxHeight;
    } catch {
      return false;
    }
  }

  // Comprehensive validation
  static async validate(
    file: File,
    options: {
      maxSizeMB?: number;
      minWidth?: number;
      minHeight?: number;
      maxWidth?: number;
      maxHeight?: number;
    } = {}
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!this.isValidType(file)) {
      errors.push('Invalid file type. Please upload JPEG, PNG, WebP, or AVIF images.');
    }

    if (!this.isValidSize(file, options.maxSizeMB)) {
      errors.push(`File size too large. Maximum size is ${options.maxSizeMB || 10}MB.`);
    }

    const isValidDimensions = await this.isValidDimensions(
      file,
      options.minWidth,
      options.minHeight,
      options.maxWidth,
      options.maxHeight
    );

    if (!isValidDimensions) {
      errors.push('Image dimensions are not within the allowed range.');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Export utilities
export const imageUtils = {
  generateOptimizedImageUrl,
  generateResponsiveSrcSet,
  generateSizesAttribute,
  preloadImage,
  createLazyImageLoader,
  ImageCompressor,
  ImageAnalyzer,
  ImageValidator,
}; 