import type { Meta, StoryObj } from '@storybook/react';
import { EmployeeTimeline, type TimelineEvent } from './employee-timeline';
import type { CalendarWorker } from '@/types/calendar';
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

const workers: CalendarWorker[] = [
  { id: '1', name: 'Staff 1' },
];

const mockDate = new Date('2024-02-14');

const initialEvents: TimelineEvent[] = [
  { workerId: '1', time: '10:00', duration: 180, type: 'blocked' }, // 10-13 Blocked (3h)
  { workerId: '1', time: '13:00', duration: 60, type: 'booked', data: { customer: 'John', service: 'Haircut', notes: 'Prefers scissors' } }, // 13-14 Booked (1h)
  { workerId: '1', time: '14:00', duration: 120, type: 'booked', data: { customer: 'Jane', service: 'Coloring' } }, // 14-16 Booked (2h)
  // 16-18 Gap (Available)
  { workerId: '1', time: '18:00', duration: 60, type: 'booked' }, // 18-19 Booked
];

// Stateful wrapper to demonstrate removal and updates
const StatefulTimeline = (args: any) => {
  const [events, setEvents] = useState(args.events);

  const handleRemove = (eventToRemove: TimelineEvent) => {
    console.log('Removing event:', eventToRemove);
    setEvents(events.filter((e: TimelineEvent) => e !== eventToRemove));
  };

  const handleUpdate = (eventToUpdate: TimelineEvent, newData: any) => {
    console.log('Updating event:', eventToUpdate, 'New Data:', newData);
    setEvents(events.map((e: TimelineEvent) =>
      e === eventToUpdate ? { ...e, data: newData } : e
    ));
  };

  return <EmployeeTimeline {...args} events={events} onEventRemove={handleRemove} onEventUpdate={handleUpdate} />;
};

export const MockupExample: Story = {
  render: (args) => <StatefulTimeline {...args} />,
  args: {
    date: mockDate,
    workers,
    events: initialEvents,
    timeRange: { start: '10:00', end: '19:00' },
  },
};

export const MultipleStaff: Story = {
  render: (args) => <StatefulTimeline {...args} />,
  args: {
    date: mockDate,
    workers: [
      { id: '1', name: 'Staff 1' },
      { id: '2', name: 'Staff 2' },
    ],
    events: [
      ...initialEvents,
      { workerId: '2', time: '12:00', duration: 60, type: 'booked', data: { customer: 'Alice', service: 'Consultation' } }, // Staff 2 booked 12-13
      { workerId: '2', time: '14:00', duration: 60, type: 'blocked' }, // Staff 2 blocked 14-15
    ],
    timeRange: { start: '10:00', end: '19:00' },
  },
};
