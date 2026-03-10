'use client'

import { useTranslations } from 'next-intl'

interface QuickActionsProps {
  customerId: string | null
  onAction: (message: string) => void
  isStreaming: boolean
}

/**
 * Context-aware quick action buttons.
 *
 * Customer-scoped: summarize last visit, treatment history, allergies, next appointment.
 * Global: recent trends, today's appointments.
 * Hidden when streaming.
 */
export function QuickActions({
  customerId,
  onAction,
  isStreaming,
}: QuickActionsProps) {
  const t = useTranslations('admin.chat')

  if (isStreaming) return null

  // Query strings are intentionally in Japanese: the backend builds context
  // from Japanese salon records and the locale parameter controls the response language.
  const customerActions = [
    { key: 'summarizeLastVisit', query: t('summarizeLastVisit') },
    { key: 'showTreatmentHistory', query: t('showTreatmentHistory') },
    { key: 'anyAllergies', query: t('anyAllergies') },
    { key: 'nextAppointment', query: t('nextAppointment') },
  ]

  const globalActions = [
    { key: 'recentTrends', query: t('recentTrends') },
    { key: 'todaysAppointments', query: t('todaysAppointments') },
  ]

  const actions = customerId ? customerActions : globalActions

  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-hide">
      {actions.map((action) => (
        <button
          key={action.key}
          onClick={() => onAction(action.query)}
          className="flex-shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
        >
          {t(action.key)}
        </button>
      ))}
    </div>
  )
}
