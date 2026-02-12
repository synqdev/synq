import type { Meta, StoryObj } from '@storybook/react'
import { SettingsBar, type SettingsItem } from './settings-bar'

const icon = (path: string) => (
  <svg className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d={path} />
  </svg>
)

const items: SettingsItem[] = [
  { id: 'refresh', label: 'Refresh', href: '/refresh', icon: icon('M2 12a10 10 0 0 1 16.6-7.5l1.9-1.9V9h-6.4l2.3-2.3A7 7 0 1 0 19 12a1 1 0 1 1 2 0 9 9 0 1 1-18 0Z') },
  { id: 'home', label: 'Home', href: '/home', icon: icon('M12 3 2.5 10.8h2.2V21h6.1v-6.3h2.4V21h6.1V10.8h2.2Z') },
  { id: 'calendar', label: 'Calendar', href: '/calendar', icon: icon('M7 2.5a1 1 0 0 1 1 1V5h8V3.5a1 1 0 1 1 2 0V5h1.2A2.8 2.8 0 0 1 22 7.8v11.4A2.8 2.8 0 0 1 19.2 22H4.8A2.8 2.8 0 0 1 2 19.2V7.8A2.8 2.8 0 0 1 4.8 5H6V3.5a1 1 0 0 1 1-1Z') },
  { id: 'settings', label: 'Settings', href: '/settings', icon: icon('M10.6 2h2.8l.5 2a8 8 0 0 1 1.8.8l1.8-1.1 2 2-1.1 1.8c.3.6.6 1.2.8 1.8l2 .5v2.8l-2 .5a8 8 0 0 1-.8 1.8l1.1 1.8-2 2-1.8-1.1a8 8 0 0 1-1.8.8l-.5 2h-2.8l-.5-2a8 8 0 0 1-1.8-.8L6 19.8l-2-2 1.1-1.8a8 8 0 0 1-.8-1.8l-2-.5V10.9l2-.5c.2-.6.5-1.2.8-1.8L4 6.8l2-2 1.8 1.1c.6-.3 1.2-.6 1.8-.8Z') },
]

const meta: Meta<typeof SettingsBar> = {
  title: 'UI/SettingsBar',
  component: SettingsBar,
  parameters: { layout: 'centered' },
}

export default meta
type Story = StoryObj<typeof SettingsBar>

export const Default: Story = {
  render: () => <SettingsBar items={items} activeItemId="home" />,
}
