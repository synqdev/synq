import { API_BASE_URL } from '../config';
import type { AvailabilityResponse, BookingResponse, Customer, Service } from './types';

async function handleJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message = data?.error ?? response.statusText ?? 'Request failed';
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function fetchServices(): Promise<Service[]> {
  const response = await fetch(`${API_BASE_URL}/api/services`);
  return handleJson<Service[]>(response);
}

export async function fetchAvailability(
  serviceId: string,
  date: string
): Promise<AvailabilityResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/availability?serviceId=${serviceId}&date=${date}`
  );
  return handleJson<AvailabilityResponse>(response);
}

export async function registerCustomer(input: {
  name: string;
  email: string;
  phone?: string;
  locale: 'ja' | 'en';
}): Promise<Customer> {
  const response = await fetch(`${API_BASE_URL}/api/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await handleJson<{ customer: Customer }>(response);
  return data.customer;
}

export async function createBooking(input: {
  serviceId: string;
  workerId: string;
  customerId: string;
  resourceId: string;
  startsAt: string;
  endsAt: string;
}): Promise<BookingResponse> {
  const response = await fetch(`${API_BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleJson<BookingResponse>(response);
}
