'use client'

import { forwardRef } from 'react'

export interface SpinnerProps {
  /** Size variant: sm (16px), md (24px), lg (32px) */
  size?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
} as const

/**
 * Spinner component for loading states.
 * Uses CSS animation defined in globals.css.
 */
export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  ({ size = 'md', className = '' }, ref) => {
    return (
      <div
        ref={ref}
        role="status"
        aria-label="Loading"
        className={`inline-block animate-spinner ${sizeClasses[size]} ${className}`}
      >
        <svg
          className="h-full w-full text-current"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="sr-only">Loading...</span>
      </div>
    )
  }
)

Spinner.displayName = 'Spinner'
