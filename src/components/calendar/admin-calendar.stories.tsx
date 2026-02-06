import type { Meta, StoryObj } from '@storybook/react';
import { AdminCalendar } from './admin-calendar';
import type { CalendarWorker, CalendarSlot } from '@/types/calendar';

const meta: Meta<typeof AdminCalendar> = {
    title: 'Calendar/AdminCalendar',
    component: AdminCalendar,
    parameters: {
        layout: 'fullscreen',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AdminCalendar>;

// Mock data (shared mocks could be moved to a utility file in a real app)
const workers: CalendarWorker[] = [
    { id: '1', name: 'Alice Smith' },
    { id: '2', name: 'Bob Jones' },
    { id: '3', name: 'Charlie Day' },
    { id: '4', name: 'Diana Prince' },
    { id: '5', name: 'Evan Wright' },
];

const mockDate = new Date('2024-02-14');

const createMockSlots = (workerId: string): CalendarSlot[] => {
    const times = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
    return times.map(time => {
        // Randomly assign some bookings
        const isBooked = Math.random() > 0.7;
        return {
            time,
            workerId,
            isAvailable: !isBooked,
            booking: isBooked ? {
                id: `b-${workerId}-${time}`,
                startsAt: new Date(`2024-02-14T${time}:00`),
                endsAt: new Date(`2024-02-14T${time.split(':')[0]}:59`),
                workerId,
                resourceId: 'r1',
                customerName: `Customer ${Math.floor(Math.random() * 100)}`,
                serviceName: ['Haircut', 'Coloring', 'Styling'][Math.floor(Math.random() * 3)],
                status: 'CONFIRMED',
            } : undefined,
        };
    });
};

const slots: CalendarSlot[] = workers.flatMap(w => createMockSlots(w.id));

export const Default: Story = {
    args: {
        date: mockDate,
        workers,
        slots,
        mode: 'interactive',
        timeRange: { start: '09:00', end: '18:00' },
    },
};

export const Empty: Story = {
    args: {
        date: mockDate,
        workers: [],
        slots: [],
        mode: 'interactive',
    },
};
