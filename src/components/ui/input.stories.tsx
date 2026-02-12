import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './input';

const meta: Meta<typeof Input> = {
    title: 'UI/Input',
    component: Input,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        label: {
            control: 'text',
        },
        error: {
            control: 'text',
        },
        disabled: {
            control: 'boolean',
        },
        placeholder: {
            control: 'text',
        },
    },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
    args: {
        placeholder: 'Enter text...',
    },
};

export const WithLabel: Story = {
    args: {
        label: 'Username',
        placeholder: 'Enter username',
    },
};

export const WithError: Story = {
    args: {
        label: 'Email',
        placeholder: 'Enter email',
        error: 'Please enter a valid email address',
        defaultValue: 'invalid-email',
    },
};

export const Disabled: Story = {
    args: {
        label: 'Disabled Input',
        placeholder: 'Cannot type here',
        disabled: true,
    },
};

export const Password: Story = {
    args: {
        label: 'Password',
        type: 'password',
        placeholder: 'Enter password',
    },
};
