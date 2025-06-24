import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FocusTrap } from './FocusTrap';

describe('FocusTrap', () => {
  it('renders children', () => {
    render(
      <FocusTrap>
        <button>Test Button</button>
      </FocusTrap>
    );
    expect(screen.getByText('Test Button')).toBeInTheDocument();
  });

  it('calls onEscape when Escape key is pressed', () => {
    const onEscape = jest.fn();
    render(
      <FocusTrap onEscape={onEscape}>
        <button>Test Button</button>
      </FocusTrap>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onEscape).toHaveBeenCalled();
  });

  it('does not call onEscape when component is not active', () => {
    const onEscape = jest.fn();
    render(
      <FocusTrap active={false} onEscape={onEscape}>
        <button>Test Button</button>
      </FocusTrap>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onEscape).not.toHaveBeenCalled();
  });

  it('traps focus within the container', () => {
    render(
      <FocusTrap>
        <button>First Button</button>
        <button>Last Button</button>
      </FocusTrap>
    );

    const firstButton = screen.getByText('First Button');
    const lastButton = screen.getByText('Last Button');

    // Focus should start on first element
    expect(document.activeElement).toBe(firstButton);

    // Tab should move to last element
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(lastButton);

    // Tab should wrap back to first element
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(firstButton);

    // Shift+Tab should move to last element
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(lastButton);
  });
}); 