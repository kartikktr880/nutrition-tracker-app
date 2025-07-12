import { SkipLink } from './SkipLink';

const meta = {
  title: 'Components/SkipLink',
  component: SkipLink,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

export const Default = {
  args: {
    children: 'Skip to main content',
  },
};

export const CustomTarget = {
  args: {
    targetId: 'custom-content',
    children: 'Skip to custom content',
  },
};

export const CustomStyling = {
  args: {
    className: 'bg-secondary text-secondary-foreground',
    children: 'Skip with custom style',
  },
}; 