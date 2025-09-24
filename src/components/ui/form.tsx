'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export const FormField = ({
  label,
  name,
  error,
  children,
  required = false,
  description,
}: {
  label?: string;
  name: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
  description?: string;
}) => {
  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {description && (
        <p className="text-sm text-gray-500">{description}</p>
      )}
      {children}
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
};

export const FormFooter = ({
  submitText = 'Сохранить',
  cancelText = 'Отмена',
  onCancel,
  isSubmitting = false,
  isFixedFooter = false,
}: {
  submitText?: string;
  cancelText?: string;
  onCancel?: () => void;
  isSubmitting?: boolean;
  isFixedFooter?: boolean;
}) => {
  return (
    <div
      className={cn(
        'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4',
        isFixedFooter && 'sticky bottom-0 bg-white border-t border-gray-200 p-4 mt-6'
      )}
    >
      {onCancel && (
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {cancelText}
        </Button>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {submitText}
      </Button>
    </div>
  );
};

export const FormFieldWithControl = ({
  label,
  name,
  error,
  children,
  required = false,
  description,
}: {
  label?: string;
  name: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
  description?: string;
}) => {
  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {description && (
        <p className="text-sm text-gray-500">{description}</p>
      )}
      {children}
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
};