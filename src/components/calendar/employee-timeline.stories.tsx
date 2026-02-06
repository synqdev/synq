import type { Meta, StoryObj } from '@storybook/react';
import { EmployeeTimeline, type TimelineWorker, type TimelineSlot } from './employee-timeline';

const meta: Meta<typeof EmployeeTimeline> = {
  title: 'Calendar/EmployeeTimeline',
  component: EmployeeTimeline,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof EmployeeTimeline>;

// Updated worker format with nested slots
const workersWithSlots: TimelineWorker[] = [
  {
    id: '1',
    name: 'Staff 1',
    slots: [
      { startTime: '10:00', duration: 180, type: 'blocked' }, // 10-13 Blocked
      { startTime: '13:00', duration: 60, type: 'booked', data: { customer: 'John' } }, // 13-14 Booked
      { startTime: '14:00', duration: 120, type: 'booked', data: { customer: 'Jane' } }, // 14-16 Booked
      { startTime: '16:00', duration: 120, type: 'available' }, // 16-18 Available
      { startTime: '18:00', duration: 60, type: 'booked' }, // 18-19 Booked
    ],
  },
];

export const AdminMode: Story = {
  args: {
    workers: workersWithSlots,
    mode: 'admin',
    timeRange: { start: '10:00', end: '19:00' },
    onSlotRemove: (slot, workerId) => console.log('Remove slot:', slot, 'Worker:', workerId),
  },
};

export const UserMode: Story = {
  args: {
    workers: [
      {
        id: '1',
        name: 'Staff 1',
        slots: [
          { startTime: '10:00', duration: 60, type: 'available' }, // 10-11 Available
          { startTime: '11:00', duration: 60, type: 'booked', data: { customer: 'John' } }, // 11-12 Booked
          { startTime: '14:00', duration: 60, type: 'available' }, // 14-15 Available
          { startTime: '16:00', duration: 60, type: 'available' }, // 16-17 Available
        ],
      },
    ],
    mode: 'user',
    timeRange: { start: '10:00', end: '19:00' },
    onSlotClick: (slot, workerId) => console.log('Slot clicked:', slot, 'Worker:', workerId),
  },
};

export const MultipleStaff: Story = {
  args: {
    workers: [
      {
        id: '1',
        name: 'Staff 1',
        slots: [
          { startTime: '10:00', duration: 60, type: 'available' },
          { startTime: '13:00', duration: 60, type: 'booked', data: { customer: 'John' } },
          { startTime: '14:00', duration: 120, type: 'booked', data: { customer: 'Jane' } },
        ],
      },
      {
        id: '2',
        name: 'Staff 2',
        slots: [
          { startTime: '11:00', duration: 60, type: 'available' },
          { startTime: '12:00', duration: 60, type: 'booked', data: { customer: 'Alice' } },
          { startTime: '14:00', duration: 60, type: 'blocked' },
        ],
      },
    ],
    mode: 'user',
    timeRange: { start: '10:00', end: '19:00' },
    onSlotClick: (slot, workerId) => console.log('Slot clicked:', slot, 'Worker:', workerId),
  },
};
