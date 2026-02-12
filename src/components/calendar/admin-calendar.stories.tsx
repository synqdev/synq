import type { Meta, StoryObj } from '@storybook/react';
import { AdminCalendar } from './admin-calendar';
import type { TimelineWorker } from './employee-timeline';

const meta: Meta<typeof AdminCalendar> = {
    title: 'Calendar/AdminCalendar',
    component: AdminCalendar,
    parameters: {
        layout: 'fullscreen',
        nextjs: {
            appDirectory: true,
        },
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AdminCalendar>;

// Mock timeline data
const workers: TimelineWorker[] = [
    {
        id: '1',
        name: 'John Doe',
        nameEn: 'John',
        slots: [
            { startTime: '09:00', duration: 60, type: 'available' },
            { startTime: '10:00', duration: 60, type: 'booked', data: { customer: 'Mika' } },
            { startTime: '11:00', duration: 120, type: 'available' },
            { startTime: '13:00', duration: 60, type: 'blocked' },
            { startTime: '14:00', duration: 120, type: 'available' },
        ],
    },
    {
        id: '2',
        name: 'Jane Smith',
        nameEn: 'Jane',
        slots: [
            { startTime: '09:00', duration: 120, type: 'available' },
            { startTime: '11:00', duration: 60, type: 'booked', data: { customer: 'Alex' } },
            { startTime: '12:00', duration: 120, type: 'available' },
            { startTime: '14:00', duration: 60, type: 'blocked' },
            { startTime: '15:00', duration: 180, type: 'available' },
        ],
    },
];

const mockDate = new Date('2024-02-14');

export const Default: Story = {
    args: {
        date: mockDate,
        workers,
        timeRange: { start: '09:00', end: '19:00' },
    },
};

export const Empty: Story = {
    args: {
        date: mockDate,
        workers: [],
        timeRange: { start: '09:00', end: '19:00' },
    },
};
