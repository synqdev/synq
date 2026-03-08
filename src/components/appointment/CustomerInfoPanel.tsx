'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

interface CustomerInfoPanelProps {
  customer: {
    id: string
    name: string
    email: string
    phone: string | null
    locale: string
    notes: string | null
    visitCount: number
    lastVisitDate: string | null
  }
  appLocale: string
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return '-'
  return new Date(value).toLocaleDateString(
    locale === 'ja' ? 'ja-JP' : 'en-US',
    { year: 'numeric', month: '2-digit', day: '2-digit' }
  )
}

export function CustomerInfoPanel({ customer, appLocale }: CustomerInfoPanelProps) {
  const t = useTranslations('admin.appointment')

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{customer.name}</h2>
        <Link
          href={`/${appLocale}/admin/customers/${customer.id}`}
          className="text-sm text-primary-600 hover:underline"
        >
          {appLocale === 'ja' ? '詳細を見る' : 'View full profile'}
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="text-xs text-gray-500">
            {appLocale === 'ja' ? 'メールアドレス' : 'Email'}
          </span>
          <p className="text-sm font-medium text-gray-900">{customer.email}</p>
        </div>
        <div>
          <span className="text-xs text-gray-500">
            {appLocale === 'ja' ? '電話番号' : 'Phone'}
          </span>
          <p className="text-sm font-medium text-gray-900">{customer.phone || '-'}</p>
        </div>
        <div>
          <span className="text-xs text-gray-500">
            {appLocale === 'ja' ? '言語' : 'Locale'}
          </span>
          <p className="text-sm font-medium text-gray-900">{customer.locale}</p>
        </div>
        <div>
          <span className="text-xs text-gray-500">
            {appLocale === 'ja' ? '来院回数' : 'Visit count'}
          </span>
          <p className="text-sm font-medium text-gray-900">{customer.visitCount}</p>
        </div>
        <div>
          <span className="text-xs text-gray-500">
            {appLocale === 'ja' ? '最終来院日' : 'Last visit'}
          </span>
          <p className="text-sm font-medium text-gray-900">
            {formatDate(customer.lastVisitDate, appLocale)}
          </p>
        </div>
      </div>

      {customer.notes && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <span className="text-xs text-gray-500">
            {appLocale === 'ja' ? 'メモ' : 'Notes'}
          </span>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{customer.notes}</p>
        </div>
      )}
    </div>
  )
}
