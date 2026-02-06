const TOKYO_OFFSET_HOURS = 9;

export function toTokyoISOString(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  const utc = Date.UTC(year, month - 1, day, hour - TOKYO_OFFSET_HOURS, minute, 0, 0);
  return new Date(utc).toISOString();
}

export function formatDate(
  date: Date,
  locale: 'ja' | 'en'
): { date: string; time: string } {
  try {
    const dateFormatter = new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
      dateStyle: 'full',
      timeZone: 'Asia/Tokyo',
    });
    const timeFormatter = new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
      timeStyle: 'short',
      timeZone: 'Asia/Tokyo',
    });

    return {
      date: dateFormatter.format(date),
      time: timeFormatter.format(date),
    };
  } catch {
    return {
      date: date.toDateString(),
      time: date.toTimeString().slice(0, 5),
    };
  }
}

export function addMinutes(isoString: string, minutes: number): string {
  const date = new Date(isoString);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}
