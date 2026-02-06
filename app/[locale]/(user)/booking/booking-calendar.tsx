'use client';

import { useState, useMemo, useActionState } from 'react';
import { useAvailability, type WorkerWithSlots } from '@/hooks/useAvailability';
import { EmployeeTimeline, type TimelineSlot, type TimelineWorker } from '@/components/calendar';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Card } from '@/components/ui/card';
import { submitBookingForm, type BookingFormState } from '@/app/actions/booking';
import type { CalendarSlot, CalendarWorker } from '@/types/calendar';

interface BookingCalendarProps {
  locale: string;
  labels: {
    book: string;
    loading: string;
    error: string;
    noSlots: string;
    selectSlot: string;
    selectedSlot: string;
  };
}

/**
 * Client-side booking calendar with live availability polling.
 * Uses SWR to poll availability every 10 seconds.
 */
export function BookingCalendar({ locale, labels }: BookingCalendarProps) {
  // Get today's date in YYYY-MM-DD format
  const today = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  // State for selected date and slot
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSlot, setSelectedSlot] = useState<CalendarSlot | null>(null);

  // Form action state
  const [formState, formAction, isPending] = useActionState<BookingFormState, FormData>(
    submitBookingForm,
    null
  );

  // Fetch availability data with SWR polling
  const { workers, isLoading, error, serviceDuration } = useAvailability(selectedDate);

  // Convert API response to calendar format
  const calendarWorkers: CalendarWorker[] = useMemo(
    () =>
      workers.map((w) => ({
        id: w.id,
        name: w.name,
        nameEn: w.nameEn || undefined,
      })),
    [workers]
  );

  const calendarSlots: CalendarSlot[] = useMemo(
    () =>
      workers.flatMap((worker: WorkerWithSlots) =>
        worker.slots.map((slot) => ({
          time: slot.startTime,
          workerId: worker.id,
          resourceId: slot.availableResourceIds[0], // Use first available resource
          isAvailable: true,
        }))
      ),
    [workers]
  );

  // Handle slot selection
  const handleSlotSelect = (slot: CalendarSlot) => {
    if (slot.isAvailable) {
      setSelectedSlot(slot);
    }
  };

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setSelectedSlot(null); // Clear selection when date changes
  };

  // Find worker name for selected slot
  const selectedWorker = selectedSlot
    ? workers.find((w) => w.id === selectedSlot.workerId)
    : null;

  // Loading state
  if (isLoading && workers.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
        <span className="ml-3 text-secondary-600">{labels.loading}</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="bg-error-50 border-error-200">
        <div className="text-error-700 text-center py-4">
          {labels.error}: {error.message}
        </div>
      </Card>
    );
  }

  // Transform to TimelineWorker format for EmployeeTimeline
  const timelineWorkers: TimelineWorker[] = useMemo(() => {
    return workers.map((w) => {
      // Find slots for this worker
      const workerSlots = w.slots.map((s): TimelineSlot => ({
        startTime: s.startTime,
        duration: serviceDuration,
        type: 'available',
        data: {
          resourceIds: s.availableResourceIds,
          endTime: s.endTime
        }
      }));

      return {
        id: w.id,
        name: w.name,
        nameEn: w.nameEn || undefined,
        slots: workerSlots
      };
    });
  }, [workers, serviceDuration]);

  return (
    <div className="space-y-6">
      {/* Date picker */}
      <div className="flex items-center gap-4">
        <label htmlFor="date" className="text-sm font-medium text-secondary-700">
          {locale === 'ja' ? '日付' : 'Date'}:
        </label>
        <input
          type="date"
          id="date"
          value={selectedDate}
          onChange={handleDateChange}
          min={today}
          className="rounded-lg border border-secondary-300 px-3 py-2 text-secondary-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none"
        />
        {isLoading && <Spinner size="sm" />}
      </div>

      {/* Calendar */}
      <EmployeeTimeline
        workers={timelineWorkers}
        mode="user"
        onSlotClick={(slot, workerId) => {
          if (slot.type === 'available') {
            // Reconstruct CalendarSlot for selection
            const calendarSlot: CalendarSlot = {
              time: slot.startTime,
              workerId: workerId,
              resourceId: slot.data?.resourceIds?.[0],
              isAvailable: true
            };
            handleSlotSelect(calendarSlot);
          }
        }}
        timeRange={{ start: '09:00', end: '19:00' }}
        className="min-h-[400px]"
      />

      {/* No slots message */}
      {workers.length > 0 && calendarSlots.length === 0 && (
        <div className="text-center text-secondary-500 py-4">{labels.noSlots}</div>
      )}

      {/* Selected slot display and booking form */}
      {selectedSlot && selectedWorker && (
        <Card className="bg-primary-50 border-primary-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-primary-700">{labels.selectedSlot}</p>
              <p className="text-lg font-semibold text-primary-900">
                {selectedSlot.time} - {locale === 'ja' ? selectedWorker.name : (selectedWorker.nameEn || selectedWorker.name)}
              </p>
            </div>

            {/* Booking form */}
            <form action={formAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="workerId" value={selectedSlot.workerId} />
              <input type="hidden" name="date" value={selectedDate} />
              <input type="hidden" name="time" value={selectedSlot.time} />
              {selectedSlot.resourceId && (
                <input type="hidden" name="resourceId" value={selectedSlot.resourceId} />
              )}

              <Button type="submit" loading={isPending} disabled={isPending}>
                {labels.book}
              </Button>
            </form>
          </div>

          {/* Error message */}
          {formState?.error && (
            <div className="mt-3 text-sm text-error-600" role="alert">
              {formState.error}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
