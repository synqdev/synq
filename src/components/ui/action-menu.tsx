import { useEffect, useRef, useState } from 'react'
import { Button } from './button'

export interface ActionMenuItem {
  label: string
  onSelect: () => void
  disabled?: boolean
}

export interface ActionMenuProps {
  label?: string
  className?: string
  items?: ActionMenuItem[]
  children?: React.ReactNode
}

export function ActionMenu({
  label = 'ACTIONS',
  className = '',
  items = [],
  children,
}: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <Button
        variant="iso"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        {label}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 origin-top-right bg-white border-2 border-black rounded-xl z-50 overflow-hidden flex flex-col">
          {children && (
            <div className="px-4 py-4 border-b-2 border-black">
              {children}
            </div>
          )}
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                item.onSelect()
                setIsOpen(false)
              }}
              disabled={item.disabled}
              className="px-4 py-3 text-left font-bold hover:bg-black hover:text-white transition-colors border-b-2 border-black uppercase text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
