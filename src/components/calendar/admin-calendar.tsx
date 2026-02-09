'use client'

import { forwardRef, useState } from 'react'
import { EmployeeTimeline, type EmployeeTimelineProps } from './employee-timeline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export interface AdminCalendarProps extends EmployeeTimelineProps {
    onDateChange?: (date: Date) => void
    onViewChange?: (view: 'day' | 'week') => void
}

/**
 * AdminCalendar component.
 * Wraps the EmployeeTimeline with admin-specific controls (date navigation, view toggles).
 * Designed to match the 'adminview' mockup structure.
 */
export const AdminCalendar = forwardRef<HTMLDivElement, AdminCalendarProps>(
    (
        {
            date,
            onDateChange,
            onViewChange,
            className = '',
            ...timelineProps
        },
        ref
    ) => {
        // Safe check for date since EmployeeTimeline doesn't strictly require it in props
        // but AdminCalendar logic relies on it for display
        const validDate = typeof date === 'string' ? new Date(date) : (date || new Date())
        
        const [currentView, setCurrentView] = useState<'day' | 'week'>('day')

        const handleViewChange = (view: 'day' | 'week') => {
            setCurrentView(view)
            onViewChange?.(view)
        }

        const formattedDate = validDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })

        return (
            <div ref={ref} className={`flex flex-col gap-4 h-full ${className}`}>
                {/* Admin Toolbar */}
                <div className="flex items-center justify-between bg-white p-4 border-b border-secondary-200">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" onClick={() => { }}>
                                &lt;
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => { }}>
                                Today
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => { }}>
                                &gt;
                            </Button>
                        </div>
                        <h2 className="text-lg font-semibold text-secondary-900">
                            {formattedDate}
                        </h2>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex bg-secondary-100 p-1 rounded-lg">
                            <button
                                onClick={() => handleViewChange('day')}
                                className={`
                  px-3 py-1 text-sm font-medium rounded-md transition-all
                  ${currentView === 'day'
                                        ? 'bg-white text-secondary-900 shadow-sm'
                                        : 'text-secondary-500 hover:text-secondary-700'
                                    }
                `}
                            >
                                Day
                            </button>
                            <button
                                onClick={() => handleViewChange('week')}
                                className={`
                  px-3 py-1 text-sm font-medium rounded-md transition-all
                  ${currentView === 'week'
                                        ? 'bg-white text-secondary-900 shadow-sm'
                                        : 'text-secondary-500 hover:text-secondary-700'
                                    }
                `}
                            >
                                Week
                            </button>
                        </div>
                        <Button variant="primary" size="sm">
                            + New Booking
                        </Button>
                    </div>
                </div>

                {/* Calendar View */}
                <Card className="flex-1 border-0 shadow-none">
                    <EmployeeTimeline
                        {...timelineProps}
                        mode="admin"
                        className="h-full border-0"
                    />
                </Card>
            </div>
        )
    }
)

AdminCalendar.displayName = 'AdminCalendar'
