'use client'

import { forwardRef, type HTMLAttributes } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional title displayed in the card header */
  title?: string
}

/**
 * Card component for content containers.
 * Provides consistent styling with optional title header.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ title, className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          overflow-hidden rounded-lg border border-secondary-200
          bg-white shadow-sm
          ${className}
        `}
        {...props}
      >
        {title && (
          <div className="border-b border-secondary-200 bg-secondary-50 px-4 py-3">
            <h3 className="text-base font-semibold text-secondary-900">
              {title}
            </h3>
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    )
  }
)

Card.displayName = 'Card'

// Compound components for more flexible usage

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * Card header section for custom headers.
 */
export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`border-b border-secondary-200 bg-secondary-50 px-4 py-3 ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardHeader.displayName = 'CardHeader'

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * Card body section for main content.
 */
export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`p-4 ${className}`} {...props}>
        {children}
      </div>
    )
  }
)

CardBody.displayName = 'CardBody'

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * Card footer section for actions.
 */
export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`border-t border-secondary-200 bg-secondary-50 px-4 py-3 ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardFooter.displayName = 'CardFooter'
