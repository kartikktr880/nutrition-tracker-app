import { SearchBar } from './SearchBar';

const meta = {
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

export const Default = {
  args: {
    placeholder: 'Search foods, meals, or recipes...',
  },
};

export const Minimal = {
  args: {
    variant: 'minimal',
    placeholder: 'Quick search...',
  },
};

export const CustomPlaceholder = {
  args: {
    placeholder: 'Type to search...',
  },
};

export const WithCustomClass = {
  args: {
    className: 'max-w-md',
    placeholder: 'Search with custom width...',
  },
}; 