'use client'

import { forwardRef, useId, type InputHTMLAttributes } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Label text displayed above the input */
  label?: string
  /** Error message displayed below the input */
  error?: string
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
            className="mb-1.5 block text-sm font-medium text-secondary-700"
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
            w-full rounded-lg border px-4 py-2
            text-secondary-900 placeholder:text-secondary-400
            transition-colors duration-200
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
            disabled:cursor-not-allowed disabled:bg-secondary-100 disabled:text-secondary-500
            ${
              hasError
                ? 'border-error-500 focus-visible:ring-error-500'
                : 'border-secondary-300 hover:border-secondary-400 focus-visible:border-primary-500 focus-visible:ring-primary-500'
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
