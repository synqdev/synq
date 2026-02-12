'use client'

import type { ReactNode } from 'react'

export interface SettingsItem {
  id: string
  icon: ReactNode
  href?: string
  label?: string
}

export interface SettingsBarProps {
  items: SettingsItem[]
  activeItemId?: string
  onNavigate?: (item: SettingsItem) => void
  distribution?: 'packed' | 'spread'
  className?: string
}

export function SettingsBar({
  items,
  activeItemId,
  onNavigate,
  distribution = 'packed',
  className = '',
}: SettingsBarProps) {
  const layoutClass = distribution === 'spread' ? 'justify-between' : 'justify-start gap-3'

  return (
    <aside className={`flex w-[74px] shrink-0 flex-col items-center rounded-[28px] bg-[#737373] pt-4 pb-3 text-white ${layoutClass} ${className}`}>
      {items.map((item) => {
        const active = item.id === activeItemId
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate?.(item)}
            className={`rounded-xl p-2 transition ${active ? 'bg-white/14' : 'hover:bg-white/10'}`}
            aria-label={item.label ?? item.id}
            title={item.label}
          >
            {item.icon}
          </button>
        )
      })}
    </aside>
  )
}
