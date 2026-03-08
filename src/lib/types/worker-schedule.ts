export interface DaySchedule {
  dayOfWeek: number
  startTime: string
  endTime: string
  isAvailable: boolean
}

export const DEFAULT_SCHEDULES: DaySchedule[] = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i,
  startTime: '09:00',
  endTime: '18:00',
  isAvailable: false,
}))
