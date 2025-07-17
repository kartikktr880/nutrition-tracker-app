'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  sizes?: string;
  fill?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'sync' | 'auto';
  srcSet?: string;
  threshold?: number;
  rootMargin?: string;
  fallbackSrc?: string;
}

interface OptimizedImageProps extends Omit<ImageProps, 'src'> {
  src: string;
  fallbackSrc?: string;
  webp?: boolean;
  avif?: boolean;
  responsive?: boolean;
  aspectRatio?: number;
}

// Image optimization utilities
const optimizeImageUrl = (
  src: string,
  width?: number,
  height?: number,
  quality: number = 80,
  format?: 'webp' | 'avif' | 'jpeg'
): string => {
  // If it's already an optimized URL or external URL, return as is
  if (src.startsWith('data:') || src.startsWith('blob:') || src.includes('http')) {
    return src;
  }

  // For local images, we can add optimization parameters
  // In a real app, this would integrate with an image optimization service
  const url = new URL(src, window.location.origin);
  
  if (width) url.searchParams.set('w', width.toString());
  if (height) url.searchParams.set('h', height.toString());
  url.searchParams.set('q', quality.toString());
  
  if (format) {
    url.searchParams.set('f', format);
  }
  
  return url.toString();
};

// Generate responsive srcset
const generateSrcSet = (
  src: string,
  widths: number[],
  quality: number = 80
): string => {
  return widths
    .map(width => `${optimizeImageUrl(src, width, undefined, quality)} ${width}w`)
    .join(', ');
};

// Generate sizes attribute
const generateSizes = (responsive: boolean, fill: boolean): string => {
  if (fill) {
    return '100vw';
  }
  
  if (responsive) {
    return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
  }
  
  return 'auto';
};

// Base Image component
const BaseImage: React.FC<ImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 80,
  placeholder = 'empty',
  blurDataURL,
  sizes,
  fill = false,
  onLoad,
  onError,
  loading = 'lazy',
  decoding = 'async',
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setCurrentSrc(src);
    setHasError(false);
    setIsLoaded(false);
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const optimizedSrc = optimizeImageUrl(currentSrc, width, height, quality);

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        fill && 'absolute inset-0',
        className
      )}
      style={{
        width: fill ? '100%' : width,
        height: fill ? '100%' : height,
      }}
    >
      {/* Blur placeholder */}
      {placeholder === 'blur' && blurDataURL && !isLoaded && (
        <div
          className="absolute inset-0 bg-cover bg-center blur-sm scale-110"
          style={{
            backgroundImage: `url(${blurDataURL})`,
          }}
        />
      )}

      {/* Loading skeleton */}
      {!isLoaded && !hasError && placeholder === 'empty' && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}

      {/* Main image */}
      <img
        ref={imgRef}
        src={optimizedSrc}
        alt={alt}
        width={width}
        height={height}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          fill && 'object-cover w-full h-full'
        )}
        loading={priority ? 'eager' : loading}
        decoding={decoding}
        sizes={sizes}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          aspectRatio: width && height ? `${width} / ${height}` : undefined,
        }}
      />

      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">
          <div className="text-center">
            <svg
              className="w-8 h-8 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm">Image unavailable</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Optimized Image component with advanced features
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  fallbackSrc,
  webp = true,
  avif = false,
  responsive = false,
  ...props
}) => {
  const [useFallback, setUseFallback] = useState(false);
  const [supportsWebP, setSupportsWebP] = useState(false);
  const [supportsAvif, setSupportsAvif] = useState(false);

  // Check browser support for modern formats
  useEffect(() => {
    const checkFormatSupport = async () => {
      // Check WebP support
      if (webp) {
        const webpSupported = await checkWebPSupport();
        setSupportsWebP(webpSupported);
      }

      // Check AVIF support
      if (avif) {
        const avifSupported = await checkAvifSupport();
        setSupportsAvif(avifSupported);
      }
    };

    checkFormatSupport();
  }, [webp, avif]);

  const handleError = () => {
    if (fallbackSrc && !useFallback) {
      setUseFallback(true);
    }
  };

  const currentSrc = useFallback ? (fallbackSrc || src) : src;
  const _format = supportsAvif ? 'avif' : supportsWebP ? 'webp' : 'jpeg';

  // Generate responsive srcset if needed
  const srcSet = responsive
    ? generateSrcSet(currentSrc, [640, 768, 1024, 1280, 1920], props.quality)
    : undefined;

  const sizes = responsive ? generateSizes(true, props.fill || false) : props.sizes;

  return (
    <BaseImage
      {...props}
      src={currentSrc}
      srcSet={srcSet}
      sizes={sizes}
      onError={handleError}
    />
  );
};

// Check WebP support
const checkWebPSupport = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src =
      'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
};

// Check AVIF support
const checkAvifSupport = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const avif = new Image();
    avif.onload = avif.onerror = () => {
      resolve(avif.height === 1);
    };
    avif.src =
      'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
  });
};

// Lazy Image component with intersection observer
export const LazyImage: React.FC<ImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  threshold = 0.1,
  rootMargin = '50px',
  ...props
}) => {
  const [isInView, setIsInView] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasIntersected) {
          setIsInView(true);
          setHasIntersected(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin, hasIntersected]);

  return (
    <div ref={imgRef} className={className}>
      {isInView ? (
        <BaseImage
          src={src}
          alt={alt}
          width={width}
          height={height}
          {...props}
        />
      ) : (
        <div
          className="bg-gray-200 animate-pulse"
          style={{
            width,
            height,
            aspectRatio: width && height ? `${width} / ${height}` : undefined,
          }}
        />
      )}
    </div>
  );
};

// Background Image component
export const BackgroundImage: React.FC<{
  src: string;
  alt?: string;
  className?: string;
  children?: React.ReactNode;
  overlay?: boolean;
  overlayColor?: string;
  overlayOpacity?: number;
}> = ({
  src,
  alt,
  className,
  children,
  overlay = false,
  overlayColor = 'black',
  overlayOpacity = 0.5,
}) => {
  const optimizedSrc = optimizeImageUrl(src);

  return (
    <div
      className={cn('relative bg-cover bg-center bg-no-repeat', className)}
      style={{
        backgroundImage: `url(${optimizedSrc})`,
      }}
      role={alt ? 'img' : undefined}
      aria-label={alt}
    >
      {overlay && (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: overlayColor,
            opacity: overlayOpacity,
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

// Avatar Image component
export const AvatarImage: React.FC<{
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  className?: string;
}> = ({ src, alt, size = 'md', fallback, className }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <div className={cn('relative rounded-full overflow-hidden', sizeClasses[size], className)}>
      <BaseImage
        src={src}
        alt={alt}
        fill
        className="object-cover"
        fallbackSrc={fallback}
      />
    </div>
  );
};

// Export base component as default
export default BaseImage;

// Export all components
export { BaseImage as Image }; 