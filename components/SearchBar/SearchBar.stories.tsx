import type { Meta, StoryObj } from '@storybook/react';
import { SearchBar } from './SearchBar';

const meta: Meta<typeof SearchBar> = {
  title: 'Components/SearchBar',
  component: SearchBar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onSearch: { action: 'searched' },
    variant: {
      control: 'select',
      options: ['default', 'minimal'],
    },
    placeholder: { control: 'text' },
    className: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof SearchBar>;

export const Default: Story = {
  args: {
    placeholder: 'Search foods, meals, or recipes...',
  },
};

export const Minimal: Story = {
  args: {
    variant: 'minimal',
    placeholder: 'Quick search...',
  },
};

export const CustomPlaceholder: Story = {
  args: {
    placeholder: 'Type to search...',
  },
};

export const WithCustomClass: Story = {
  args: {
    className: 'max-w-md',
    placeholder: 'Search with custom width...',
  },
}; 