import type { Meta, StoryObj } from '@storybook/react';
import { TimelineCalendar } from './timeline-calendar';
import type { CalendarWorker, CalendarSlot, CalendarBooking } from '@/types/calendar';

const meta: Meta<typeof TimelineCalendar> = {
    title: 'Calendar/TimelineCalendar',
    component: TimelineCalendar,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TimelineCalendar>;

// Mock data
const workers: CalendarWorker[] = [
    { id: '1', name: 'Alice Smith' },
    { id: '2', name: 'Bob Jones' },
    { id: '3', name: 'Charlie Day' },
];

const mockDate = new Date('2024-01-01');

const createMockSlots = (workerId: string): CalendarSlot[] => {
    const times = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
    return times.map(time => ({
        time,
        workerId,
        isAvailable: true,
    }));
};

const slots: CalendarSlot[] = [
    ...createMockSlots('1'),
    ...createMockSlots('2'),
    ...createMockSlots('3'),
];

// Add some bookings
const bookedSlot: CalendarSlot = {
    time: '10:00',
    workerId: '1',
    isAvailable: false,
    booking: {
        id: 'b1',
        startsAt: new Date('2024-01-01T10:00:00'),
        endsAt: new Date('2024-01-01T11:00:00'),
        workerId: '1',
        resourceId: 'r1',
        customerName: 'John Doe',
        serviceName: 'Haircut',
        status: 'CONFIRMED',
    },
};

const occupiedSlots = slots.map(s => {
    if (s.time === '10:00' && s.workerId === '1') return bookedSlot;
    if (s.time === '14:00' && s.workerId === '2') return { ...s, isAvailable: false }; // Unavailable but no booking details (e.g. break)
    return s;
});

export const UserView: Story = {
    args: {
        date: mockDate,
        workers,
        slots: occupiedSlots,
        mode: 'readonly',
        timeRange: { start: '09:00', end: '17:00' },
    },
};

export const AdminView: Story = {
    args: {
        date: mockDate,
        workers,
        slots: occupiedSlots,
        mode: 'interactive',
        timeRange: { start: '09:00', end: '17:00' },
    },
};

export const AdminWithSelection: Story = {
    args: {
        date: mockDate,
        workers,
        slots: occupiedSlots,
        mode: 'interactive',
        timeRange: { start: '09:00', end: '17:00' },
        selectedSlot: { time: '12:00', workerId: '2', isAvailable: true },
    },
};

export const Empty: Story = {
    args: {
        date: mockDate,
        workers: [],
        slots: [],
        mode: 'readonly',
    },
};
