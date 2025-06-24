import type { Meta, StoryObj } from '@storybook/react';
import { SkipLink } from './SkipLink';

const meta: Meta<typeof SkipLink> = {
  title: 'Components/SkipLink',
  component: SkipLink,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SkipLink>;

export const Default: Story = {
  args: {
    children: 'Skip to main content',
  },
};

export const CustomTarget: Story = {
  args: {
    targetId: 'custom-content',
    children: 'Skip to custom content',
  },
};

export const CustomStyling: Story = {
  args: {
    className: 'bg-secondary text-secondary-foreground',
    children: 'Skip with custom style',
  },
}; 