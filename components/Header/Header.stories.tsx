import { Header } from './Header';

const meta = {
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

export const Default = {
  args: {
    variant: 'default',
  },
};

export const Transparent = {
  args: {
    variant: 'transparent',
  },
  parameters: {
    backgrounds: {
      default: 'gradient',
    },
  },
};

export const Compact = {
  args: {
    variant: 'compact',
  },
};

export const Elevated = {
  args: {
    variant: 'elevated',
  },
};

export const Mobile = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

export const Tablet = {
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};

export const Desktop = {
  parameters: {
    viewport: {
      defaultViewport: 'desktop',
    },
  },
}; 