import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from './Header';
import { usePathname } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('Header', () => {
  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue('/');
  });

  it('renders the logo', () => {
    render(<Header />);
    expect(screen.getByText('NutriTrack')).toBeInTheDocument();
  });

  it('renders navigation items', () => {
    render(<Header />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Food Logger')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('toggles mobile menu when clicking the menu button', () => {
    render(<Header />);
    const menuButton = screen.getByLabelText('Toggle menu');
    
    // Menu should be closed initially
    expect(screen.queryByRole('navigation', { hidden: true })).not.toBeVisible();
    
    // Open menu
    fireEvent.click(menuButton);
    expect(screen.getByRole('navigation')).toBeVisible();
    
    // Close menu
    fireEvent.click(menuButton);
    expect(screen.queryByRole('navigation', { hidden: true })).not.toBeVisible();
  });

  it('closes mobile menu when clicking a navigation link', () => {
    render(<Header />);
    const menuButton = screen.getByLabelText('Toggle menu');
    
    // Open menu
    fireEvent.click(menuButton);
    expect(screen.getByRole('navigation')).toBeVisible();
    
    // Click a navigation link
    fireEvent.click(screen.getByText('Dashboard'));
    expect(screen.queryByRole('navigation', { hidden: true })).not.toBeVisible();
  });

  it('renders theme toggle button', () => {
    render(<Header />);
    expect(screen.getByLabelText('Toggle theme')).toBeInTheDocument();
  });
}); 