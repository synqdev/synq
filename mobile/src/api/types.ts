export type Service = {
  id: string;
  name: string;
  nameEn?: string | null;
  description?: string | null;
  duration: number;
  price: number;
};

export type AvailabilitySlot = {
  startTime: string;
  endTime: string;
  duration: number;
  availableResourceIds: string[];
};

export type AvailabilityWorker = {
  id: string;
  name: string;
  nameEn?: string | null;
  slots: AvailabilitySlot[];
};

export type AvailabilityResponse = {
  date: string;
  serviceId: string;
  serviceName: string;
  serviceDuration: number;
  workers: AvailabilityWorker[];
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  locale: 'ja' | 'en';
};

export type BookingResponse = {
  booking: {
    id: string;
    startsAt: string;
    endsAt: string;
    workerId: string;
    serviceId: string;
    resourceId: string | null;
    customerId: string;
  };
};

export type Booking = {
  id: string;
  startsAt: string;
  endsAt: string;
  workerId: string;
  serviceId: string;
  resourceId: string | null;
  customerId: string;
};
