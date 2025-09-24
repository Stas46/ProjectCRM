'use client';

import * as React from 'react';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

export function Avatar({
  src,
  alt,
  name,
  size = 'md',
  className,
}: AvatarProps) {
  const [imageError, setImageError] = React.useState(false);
  
  const handleError = () => {
    setImageError(true);
  };

  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden inline-flex items-center justify-center',
        sizeClasses[size],
        className
      )}
    >
      {src && !imageError ? (
        <img
          src={src}
          alt={alt || name || 'Аватар'}
          className="h-full w-full object-cover"
          onError={handleError}
        />
      ) : name ? (
        <div
          className={cn(
            'flex items-center justify-center w-full h-full text-white font-medium',
            getAvatarColor(name)
          )}
        >
          {getInitials(name)}
        </div>
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-gray-200 text-gray-600 font-medium">
          ?
        </div>
      )}
    </div>
  );
}