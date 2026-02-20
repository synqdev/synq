'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Spinner } from './spinner'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'iso'
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Show loading spinner and disable button */
  loading?: boolean
}

const variantClasses = {
  primary:
    'bg-primary-500 text-white hover:bg-primary-600 focus-visible:ring-primary-500 disabled:bg-primary-300',
  secondary:
    'bg-secondary-500 text-white hover:bg-secondary-600 focus-visible:ring-secondary-500 disabled:bg-secondary-300',
  outline:
    'border-2 border-primary-500 text-primary-500 hover:bg-primary-50 focus-visible:ring-primary-500 disabled:border-primary-300 disabled:text-primary-300',
  ghost:
    'text-secondary-700 hover:bg-secondary-100 focus-visible:ring-secondary-500 disabled:text-secondary-400',
  iso:
    'bg-white text-black border-2 border-black rounded-xl font-black hover:bg-gray-100 transition-colors !h-12 !px-6',
} as const

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
} as const

/**
 * Button component with multiple variants and sizes.
 * Supports loading state with spinner.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center gap-2
          rounded-lg font-medium
          transition-all duration-200
          active:scale-95
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        {...props}
      >
        {loading && (
          <Spinner
            size={size === 'lg' ? 'md' : 'sm'}
            className={variant === 'primary' || variant === 'secondary' ? 'text-white' : ''}
          />
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
