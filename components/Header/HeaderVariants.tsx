import React from 'react';
import { twMerge } from 'tailwind-merge';

export type HeaderVariant = 'default' | 'transparent' | 'compact' | 'elevated';

interface HeaderVariantProps {
  variant?: HeaderVariant;
  className?: string;
}

export const getHeaderVariantClasses = ({ variant = 'default', className }: HeaderVariantProps) => {
  const baseClasses = 'sticky top-0 z-50 w-full';
  
  const variantClasses = {
    default: 'border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
    transparent: 'bg-transparent',
    compact: 'border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-12',
    elevated: 'border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-md',
  };

  return twMerge(baseClasses, variantClasses[variant], className);
};

export const getNavVariantClasses = ({ variant = 'default' }: HeaderVariantProps) => {
  const variantClasses = {
    default: 'container flex h-14 items-center',
    transparent: 'container flex h-14 items-center',
    compact: 'container flex h-12 items-center',
    elevated: 'container flex h-14 items-center',
  };

  return variantClasses[variant];
};

export const getMobileMenuVariantClasses = ({ variant = 'default' }: HeaderVariantProps) => {
  const variantClasses = {
    default: 'md:hidden',
    transparent: 'md:hidden bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
    compact: 'md:hidden',
    elevated: 'md:hidden shadow-md',
  };

  return variantClasses[variant];
}; 