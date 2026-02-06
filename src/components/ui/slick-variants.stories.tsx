import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';
import { DatePicker } from './date-picker';
import { SettingsDropdown } from './settings-dropdown';

const meta: Meta = {
    title: 'UI/SlickVariants',
    parameters: {
        layout: 'centered',
    },
};

export default meta;

export const AllVariants: StoryObj = {
    render: () => (
        <div className="flex flex-col gap-8 items-start p-8 bg-gray-50 min-h-[400px]">
            <div className="flex gap-4 items-end">

                {/* Date Picker */}
                <DatePicker label="Date" defaultValue="2026-01-20" />

                {/* Action Button */}
                <Button variant="iso">
                    FUNCTION
                </Button>

                {/* Another Action Button */}
                <Button variant="iso">
                    FUNCTION
                </Button>

                {/* Settings Dropdown */}
                <SettingsDropdown
                    onProfile={() => alert('Profile clicked')}
                    onLogout={() => alert('Logout clicked')}
                />
            </div>

            <div className="text-sm text-gray-500 max-w-md">
                These components use a high-contrast, black-bordered "isometric" style with hard shadows.
                Hover states shift the element and shadow for a tactile feel.
            </div>
        </div>
    ),
};

export const IsoButton: StoryObj<typeof Button> = {
    render: () => <Button variant="iso">CLICK ME</Button>
};

export const StyledDatePicker: StoryObj<typeof DatePicker> = {
    render: () => <DatePicker label="Start Date" />
};

export const StyledDropdown: StoryObj<typeof SettingsDropdown> = {
    render: () => <div className="h-40"><SettingsDropdown /></div>
};
