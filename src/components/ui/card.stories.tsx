import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardBody, CardFooter } from './card';
import { Button } from './button';

const meta: Meta<typeof Card> = {
    title: 'UI/Card',
    component: Card,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        title: {
            control: 'text',
        },
    },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
    args: {
        title: 'Card Title',
        children: <p className="text-secondary-600">This is the card content. It can contain any elements.</p>,
        className: 'w-80',
    },
};

export const Simple: Story = {
    args: {
        children: 'Simple card without title',
        className: 'w-64',
    },
};

export const WithActions: Story = {
    render: (args) => (
        <Card {...args} className="w-96">
            <p className="text-secondary-600 mb-4">
                Card content with some descriptive text about the subject.
            </p>
            <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm">Cancel</Button>
                <Button size="sm">Confirm</Button>
            </div>
        </Card>
    ),
    args: {
        title: 'Confirmation',
    },
};

export const CompoundComponents: Story = {
    render: () => (
        <Card className="w-96 p-0">
            <CardHeader>
                <h3 className="font-semibold text-lg">Custom Header</h3>
            </CardHeader>
            <CardBody>
                <p className="text-secondary-600">
                    This uses the compound components approach for more control over the layout.
                </p>
            </CardBody>
            <CardFooter className="flex justify-between items-center">
                <span className="text-sm text-secondary-500">Last updated now</span>
                <Button size="sm">Action</Button>
            </CardFooter>
        </Card>
    ),
};
