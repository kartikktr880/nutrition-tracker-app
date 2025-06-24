import type { Meta, StoryObj } from '@storybook/react';
import { Header } from './Header';

const meta: Meta<typeof Header> = {
  title: 'Components/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'transparent', 'compact', 'elevated'],
      description: 'The visual style variant of the header',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply to the header',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Header>;

export const Default: Story = {
  args: {
    variant: 'default',
  },
};

export const Transparent: Story = {
  args: {
    variant: 'transparent',
  },
  parameters: {
    backgrounds: {
      default: 'gradient',
    },
  },
};

export const Compact: Story = {
  args: {
    variant: 'compact',
  },
};

export const Elevated: Story = {
  args: {
    variant: 'elevated',
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

export const Tablet: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};

export const Desktop: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'desktop',
    },
  },
}; 