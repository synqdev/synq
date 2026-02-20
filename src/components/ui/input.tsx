'use client'

import { forwardRef, useId, type InputHTMLAttributes } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Label text displayed above the input */
  label?: string
  /** Error message displayed below the input */
  error?: string
  /** Visual style variant */
  variant?: 'default' | 'iso'
}

/**
 * Input component with label and error state support.
 * Uses focus-visible for keyboard accessibility.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    // Generate unique ID if not provided
    const generatedId = useId()
    const inputId = id || generatedId
    const errorId = `${inputId}-error`

    const hasError = Boolean(error)

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className={`mb-1.5 block text-sm font-medium ${props.variant === 'iso' ? 'text-black font-bold uppercase tracking-wide' : 'text-secondary-700'
              }`}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          className={`
            w-full transition-colors duration-200
            focus-visible:outline-none 
            disabled:cursor-not-allowed
            ${props.variant === 'iso'
              ? `bg-white text-black border-2 border-black rounded-xl px-4 py-3 h-12 font-medium placeholder:text-gray-400 focus-visible:ring-0 focus-visible:bg-gray-50 hover:bg-gray-50 ${hasError ? 'border-red-500' : ''}`
              : `rounded-lg border px-4 py-2 text-secondary-900 placeholder:text-secondary-400 focus-visible:ring-2 focus-visible:ring-offset-2 disabled:bg-secondary-100 disabled:text-secondary-500 ${hasError
                ? 'border-error-500 focus-visible:ring-error-500'
                : 'border-secondary-300 hover:border-secondary-400 focus-visible:border-primary-500 focus-visible:ring-primary-500'
              }`
            }
            ${className}
          `}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-error-600" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
