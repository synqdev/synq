import type { Meta, StoryObj } from '@storybook/react';
import { EmployeeTimeline, type TimelineSlot, type TimelineWorker } from './employee-timeline';
import { useState } from 'react';

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

// Mock Data
const initialWorkers: TimelineWorker[] = [
  {
    id: '1',
    name: 'Staff 1',
    slots: [
      { startTime: '10:00', duration: 180, type: 'blocked' }, // 10-13 Blocked
      { startTime: '13:00', duration: 60, type: 'booked', data: { customer: 'John', service: 'Haircut' } }, // 13-14 Booked
      { startTime: '14:00', duration: 120, type: 'booked', data: { customer: 'Jane', service: 'Coloring' } }, // 14-16 Booked
      // 16-18 Gap
      { startTime: '18:00', duration: 60, type: 'booked' }, // 18-19 Booked
      { startTime: '16:00', duration: 120, type: 'available' }, // Explicit available slot for testing
    ]
  }
];

// Stateful wrapper
const StatefulTimeline = (args: any) => {
  const [workers, setWorkers] = useState<TimelineWorker[]>(args.workers);

  const handleSlotRemove = (slotToRemove: TimelineSlot, workerId: string) => {
    console.log('Removing slot:', slotToRemove, 'from worker:', workerId);
    setWorkers(currentWorkers =>
      currentWorkers.map(worker => {
        if (worker.id !== workerId) return worker;
        return {
          ...worker,
          slots: worker.slots.filter(s => s !== slotToRemove)
        };
      })
    );
  };

  const handleSlotClick = (slot: TimelineSlot, workerId: string) => {
    console.log('Clicked slot:', slot, 'Worker:', workerId);
  };

  return (
    <EmployeeTimeline
      {...args}
      workers={workers}
      onSlotRemove={handleSlotRemove}
      onSlotClick={handleSlotClick}
    />
  );
};

export const AdminMode: Story = {
  render: (args) => <StatefulTimeline {...args} />,
  args: {
    mode: 'admin',
    workers: initialWorkers,
    timeRange: { start: '10:00', end: '19:00' },
  },
};

export const UserMode: Story = {
  render: (args) => <StatefulTimeline {...args} />,
  args: {
    mode: 'user',
    workers: initialWorkers,
    timeRange: { start: '10:00', end: '19:00' },
  },
};

export const MultipleStaff: Story = {
  render: (args) => <StatefulTimeline {...args} />,
  args: {
    mode: 'admin',
    workers: [
      ...initialWorkers,
      {
        id: '2',
        name: 'Staff 2',
        slots: [
          { startTime: '12:00', duration: 60, type: 'booked', data: { customer: 'Alice' } },
          { startTime: '14:00', duration: 60, type: 'blocked' },
        ]
      }
    ],
    timeRange: { start: '10:00', end: '19:00' },
  },
};
