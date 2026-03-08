/**
 * Shared constants for karute UI components.
 */

export const categoryColors: Record<string, string> = {
  SYMPTOM: 'bg-red-100 text-red-700',
  TREATMENT: 'bg-blue-100 text-blue-700',
  BODY_AREA: 'bg-purple-100 text-purple-700',
  PREFERENCE: 'bg-pink-100 text-pink-700',
  LIFESTYLE: 'bg-teal-100 text-teal-700',
  NEXT_VISIT: 'bg-indigo-100 text-indigo-700',
  OTHER: 'bg-gray-100 text-gray-700',
}

export const CATEGORY_KEYS = [
  'SYMPTOM',
  'TREATMENT',
  'BODY_AREA',
  'PREFERENCE',
  'LIFESTYLE',
  'NEXT_VISIT',
  'OTHER',
] as const

export type KaruteStatus = 'DRAFT' | 'REVIEW' | 'APPROVED'

export type KaruteEntryCategory = (typeof CATEGORY_KEYS)[number]
