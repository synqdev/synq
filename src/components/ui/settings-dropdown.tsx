import { useState, useRef, useEffect } from 'react'
import { Button } from './button'

export interface SettingsDropdownProps {
    className?: string
    onLogout?: () => void
    onProfile?: () => void
}

export const SettingsDropdown = ({ className = '', onLogout, onProfile }: SettingsDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close on click outside
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
                SETTINGS
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                    <path d="m6 9 6 6 6-6" />
                </svg>
            </Button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 origin-top-right bg-white border-2 border-black rounded-xl z-50 overflow-hidden flex flex-col">
                    <button
                        onClick={() => { onProfile?.(); setIsOpen(false) }}
                        className="px-4 py-3 text-left font-bold hover:bg-black hover:text-white transition-colors border-b-2 border-black uppercase text-sm"
                    >
                        Profile
                    </button>
                    <button
                        onClick={() => { onLogout?.(); setIsOpen(false) }}
                        className="px-4 py-3 text-left font-bold hover:bg-black hover:text-white transition-colors uppercase text-sm"
                    >
                        Log out
                    </button>
                </div>
            )}
        </div>
    )
}
