import type { Meta, StoryObj } from '@storybook/react'
import { EmployeeTimelineBar } from './employee-timeline-bar'

const meta: Meta<typeof EmployeeTimelineBar> = {
  title: 'UI/EmployeeTimelineBar',
  component: EmployeeTimelineBar,
  parameters: { layout: 'centered' },
}

export default meta
type Story = StoryObj<typeof EmployeeTimelineBar>

export const Booking: Story = {
  args: {
    item: {
      id: 'book-1',
      rowId: 'amy',
      startMinute: 10 * 60,
      durationMinute: 60,
      title: '10:00-11:00',
      subtitle: 'Jon Chan\n1 Hour Massage',
      type: 'booking',
    },
  },
  render: (args) => (
    <div className="w-[300px] bg-[#7d9ea7] p-3">
      <div className="h-[72px]">
        <EmployeeTimelineBar {...args} />
      </div>
    </div>
  ),
}

export const Blocked: Story = {
  args: {
    item: {
      id: 'blocked-1',
      rowId: 'amy',
      startMinute: 12 * 60,
      durationMinute: 60,
      title: '',
      type: 'blocked',
    },
  },
  render: (args) => (
    <div className="w-[300px] bg-[#7d9ea7] p-3">
      <div className="h-[72px]">
        <EmployeeTimelineBar {...args} />
      </div>
    </div>
  ),
}

