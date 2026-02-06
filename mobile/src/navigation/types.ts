import type { AvailabilitySlot, AvailabilityWorker, Service, Booking } from '../api/types';

export type RootStackParamList = {
  Signup: undefined;
  Booking: undefined;
  Preview: {
    service: Service;
    date: string;
    worker: AvailabilityWorker;
    slot: AvailabilitySlot;
  };
  Confirmation: {
    service: Service;
    date: string;
    worker: AvailabilityWorker;
    slot: AvailabilitySlot;
    booking: Booking;
  };
};
