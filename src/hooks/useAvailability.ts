'use client';

/**
 * Availability Hook
 *
 * SWR hook for fetching and polling availability data.
 * Polls every 10 seconds to keep slot availability up-to-date.
 */

import useSWR from 'swr';

/**
 * Available slot returned from the API.
 */
export interface AvailableSlot {
  startTime: string;
  endTime: string;
  availableResourceIds: string[];
}

/**
 * Worker with their available slots.
 */
export interface WorkerWithSlots {
  id: string;
  name: string;
  nameEn: string | null;
  slots: AvailableSlot[];
}

/**
 * Availability API response shape.
 */
export interface AvailabilityResponse {
  date: string;
  serviceDuration: number;
  workers: WorkerWithSlots[];
}

/**
 * Fetcher function for SWR.
 */
const fetcher = async (url: string): Promise<AvailabilityResponse> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch availability');
  }
  return response.json();
};

/**
 * Fetches availability data for a given date with automatic polling.
 *
 * Features:
 * - Polls every 10 seconds for real-time updates
 * - Revalidates on window focus
 * - Returns loading and error states
 *
 * @param date - Date string in YYYY-MM-DD format
 * @returns SWR response with workers, slots, loading, and error states
 *
 * @example
 * const { data, isLoading, error } = useAvailability('2024-06-15');
 * if (isLoading) return <Spinner />;
 * if (error) return <Error />;
 * return <Calendar workers={data.workers} />;
 */
export function useAvailability(date: string) {
  const { data, error, isLoading, mutate } = useSWR<AvailabilityResponse>(
    `/api/availability?date=${date}`,
    fetcher,
    {
      refreshInterval: 10000, // Poll every 10 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    data,
    workers: data?.workers || [],
    serviceDuration: data?.serviceDuration || 60,
    isLoading,
    error,
    mutate, // Expose mutate for manual revalidation after booking
  };
}
