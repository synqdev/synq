'use client'

import { useState, useRef, useEffect, forwardRef } from 'react'

export interface SelectOption {
    value: string
    label: string
}

export interface SelectProps {
    options: SelectOption[]
    value?: string
    onChange?: (value: string) => void
    placeholder?: string
    label?: string
    className?: string
    disabled?: boolean
    error?: string
}

export const Select = forwardRef<HTMLDivElement, SelectProps>(
    ({ options, value, onChange, placeholder = 'Select an option', label, className = '', disabled, error }, ref) => {
        const [isOpen, setIsOpen] = useState(false)
        const containerRef = useRef<HTMLDivElement>(null)

        const selectedOption = options.find(opt => opt.value === value)

        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                    setIsOpen(false)
                }
            }
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }, [])

        const handleSelect = (optionValue: string) => {
            if (disabled) return
            onChange?.(optionValue)
            setIsOpen(false)
        }

        return (
            <div className={`w-full ${className}`} ref={containerRef}>
                {label && (
                    <label className="mb-1.5 block text-sm font-bold uppercase tracking-wide text-black">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => !disabled && setIsOpen(!isOpen)}
                        disabled={disabled}
                        className={`
                            w-full h-12 px-4 py-3 bg-white border-2 rounded-xl flex items-center justify-between
                            transition-colors duration-200 text-left cursor-pointer
                            ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'hover:bg-gray-50'}
                            ${error ? 'border-red-500' : 'border-black'}
                            ${isOpen ? 'bg-gray-50' : ''}
                        `}
                    >
                        <span className={`block truncate ${!selectedOption ? 'text-gray-400' : 'text-black font-medium'}`}>
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`ml-2 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        >
                            <path d="m6 9 6 6 6-6" />
                        </svg>
                    </button>

                    {isOpen && (
                        <div className="absolute z-50 mt-2 w-full bg-white border-2 border-black rounded-xl max-h-60 overflow-auto shadow-[0_4px_0_0_rgba(0,0,0,1)] animate-in fade-in zoom-in-95 duration-100">
                            <ul className="py-1">
                                {options.map((option) => (
                                    <li key={option.value}>
                                        <button
                                            type="button"
                                            onClick={() => handleSelect(option.value)}
                                            className={`
                                                w-full text-left px-4 py-3 font-medium transition-colors
                                                ${option.value === value ? 'bg-gray-100 text-black' : 'text-gray-700 hover:bg-black hover:text-white'}
                                            `}
                                        >
                                            {option.label}
                                        </button>
                                    </li>
                                ))}
                                {options.length === 0 && (
                                    <li className="px-4 py-3 text-gray-400 italic">
                                        No options available
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}
                </div>
                {error && (
                    <p className="mt-1.5 text-sm text-red-600">
                        {error}
                    </p>
                )}
            </div>
        )
    }
)

Select.displayName = 'Select'
