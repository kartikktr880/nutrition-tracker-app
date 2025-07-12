import { render, screen } from '@testing-library/react';
import React from 'react';

import { FocusTrap } from '../FocusTrap/FocusTrap';

describe('FocusTrap', () => {
  it('renders children when active is true', () => {
    render(
      <FocusTrap active={true}>
        <button>Test Button</button>
      </FocusTrap>
    );
    
    expect(screen.getByText('Test Button')).toBeInTheDocument();
  });

  it('renders children when active is false', () => {
    render(
      <FocusTrap active={false}>
        <button>Test Button</button>
      </FocusTrap>
    );
    
    expect(screen.getByText('Test Button')).toBeInTheDocument();
  });

  it('applies custom CSS classes when provided', () => {
    const { container } = render(
      <FocusTrap active={true} className="custom-focus-trap">
        <div>Content</div>
      </FocusTrap>
    );
    
    const focusTrap = container.firstChild as HTMLElement;
    expect(focusTrap).toHaveClass('custom-focus-trap');
  });
}); 