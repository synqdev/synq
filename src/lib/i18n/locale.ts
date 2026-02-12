export type AppLocale = 'en' | 'ja'

export function isLocale(locale: string, expected: AppLocale): boolean {
  return locale === expected
}

export function getLocaleDateTag(locale: string): 'en-US' | 'ja-JP' {
  return locale === 'ja' ? 'ja-JP' : 'en-US'
}

export function getLocalizedName(
  locale: string,
  name: string,
  nameEn?: string | null
): string {
  if (locale === 'ja') {
    return name
  }

  return nameEn || name
}
