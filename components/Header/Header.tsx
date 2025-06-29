import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import { ThemeToggle } from '@/components/ThemeToggle/ThemeToggle';
import { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary';
import { FocusTrap } from '@/components/FocusTrap/FocusTrap';
import { SkipLink } from '@/components/SkipLink/SkipLink';
import { HeaderVariant, getHeaderVariantClasses, getNavVariantClasses, getMobileMenuVariantClasses } from './HeaderVariants';
import { SearchBar } from '@/components/SearchBar/SearchBar';

/**
 * Navigation items for the header
 */
const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Meals', href: '/meals' },
  { name: 'Progress', href: '/progress' },
];

/**
 * Error fallback component for the header
 * Displays when the header encounters an error
 */
const HeaderErrorFallback = () => (
  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
    <p className="text-sm text-destructive">
      There was an error loading the header. Please refresh the page.
    </p>
  </div>
);

/**
 * Props for the MobileMenu component
 */
interface MobileMenuProps {
  /** Whether the mobile menu is open */
  isOpen: boolean;
  /** Current pathname for active link highlighting */
  pathname: string | null;
  /** Visual variant of the header */
  variant?: HeaderVariant;
  /** Accessibility label for the mobile menu */
  'aria-label'?: string;
}

/**
 * MobileMenu Component
 * 
 * A collapsible mobile navigation menu that displays navigation links
 * in a vertical layout for smaller screens.
 * 
 * @example
 * ```tsx
 * <MobileMenu 
 *   isOpen={isMobileMenuOpen} 
 *   pathname={pathname} 
 *   variant="default" 
 * />
 * ```
 */
const MobileMenu = React.forwardRef<HTMLDivElement, MobileMenuProps>(
  ({ isOpen, pathname, variant = 'default' }, ref) => (
    <div
      ref={ref}
      className={getMobileMenuVariantClasses({ variant })}
      id="mobile-menu"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="container space-y-1 pb-3 pt-2">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={twMerge(
                'block rounded-md px-3 py-2 text-base font-medium hover:bg-accent hover:text-accent-foreground',
                pathname === item.href
                  ? 'bg-accent text-accent-foreground'
                  : 'text-foreground/60'
              )}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  )
);

MobileMenu.displayName = 'MobileMenu';

/**
 * Props for the Header component
 */
interface HeaderProps {
  /** Visual variant of the header (default: 'default') */
  variant?: HeaderVariant;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Mock user authentication hook
 * 
 * Provides mock user data for development and testing purposes.
 * In production, this should be replaced with actual authentication logic.
 * 
 * @returns Mock user object with name and optional avatar URL
 */
const useMockUser = () => {
  const [user, setUser] = useState<{ name: string; avatarUrl?: string } | null>({
    name: 'Jane Doe',
    avatarUrl: undefined,
  });

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      setUser(null);
    };
  }, []);

  return user;
};

/**
 * Header Component
 * 
 * A responsive header component that provides navigation, search functionality,
 * theme toggle, and user profile management. The header is sticky and includes
 * accessibility features like skip links and proper ARIA labels.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <Header />
 * 
 * // With custom variant
 * <Header variant="premium" />
 * 
 * // With custom styling
 * <Header className="custom-header" />
 * ```
 * 
 * @example
 * ```tsx
 * // In a layout component
 * function Layout({ children }) {
 *   return (
 *     <>
 *       <Header variant="default" />
 *       <main>
 *         {children}
 *       </main>
 *     </>
 *   );
 * }
 * ```
 * 
 * @remarks
 * - Includes a skip link for accessibility
 * - Responsive design with mobile menu
 * - Error boundary for graceful error handling
 * - Focus trap for mobile menu accessibility
 * - Theme toggle functionality
 * - Search bar integration
 * - User profile menu with avatar
 * - Proper ARIA labels and roles
 * - Sticky positioning with backdrop blur
 * 
 * @see {@link https://www.w3.org/WAI/WCAG21/Techniques/general/G1 | WCAG G1: Adding a link at the top of each page}
 * @see {@link https://www.w3.org/WAI/WCAG21/Techniques/general/G59 | WCAG G59: Placing the interactive elements in an order that follows sequences and relationships within the content}
 */
export const Header: React.FC<HeaderProps> = ({ variant = 'default', className }) => {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const user = useMockUser();

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
  }, [pathname]);

  /**
   * Handles errors that occur within the header component
   * @param error - The error that occurred
   */
  const handleError = (error: Error) => {
    console.error('Header error:', error);
  };

  return (
    <ErrorBoundary fallback={<HeaderErrorFallback />} onError={handleError}>
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur border-b border-border shadow-sm">
        <SkipLink target="main-content" />
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 md:py-3" aria-label="Main navigation">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="mr-6 flex items-center space-x-2"
              aria-label="Nutrition Tracker Home"
            >
              <span className="hidden font-bold sm:inline-block">
                Nutrition Tracker
              </span>
            </Link>
            <div className="flex items-center space-x-6 text-sm font-medium">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={twMerge(
                    'transition-colors hover:text-foreground/80',
                    pathname === item.href
                      ? 'text-foreground'
                      : 'text-foreground/60'
                  )}
                  aria-current={pathname === item.href ? 'page' : undefined}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="hidden md:block flex-1 mx-8">
            <SearchBar onSearch={(query) => {
              console.log('Search:', query);
            }} />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-full flex-1 md:w-auto md:flex-none">
              <ThemeToggle />
            </div>
            {/* User Profile Menu */}
            <div className="relative" ref={profileMenuRef}>
              {user ? (
                <>
                  <button
                    className="flex items-center gap-2 rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none p-1.5 hover:bg-accent transition-colors"
                    aria-haspopup="menu"
                    aria-expanded={isProfileMenuOpen}
                    aria-label="Open user menu"
                    onClick={() => setIsProfileMenuOpen((open) => !open)}
                  >
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground font-bold">
                        {user.name.charAt(0)}
                      </span>
                    )}
                  </button>
                  <AnimatePresence>
                    {isProfileMenuOpen && (
                      <FocusTrap active={isProfileMenuOpen} onEscape={() => setIsProfileMenuOpen(false)}>
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.18 }}
                          className="absolute right-0 mt-2 w-48 rounded-md border bg-popover shadow-lg z-50 focus:outline-none"
                          role="menu"
                          aria-label="User menu"
                        >
                          <button className="block w-full text-left px-4 py-2 text-sm hover:bg-accent focus:bg-accent focus:outline-none" role="menuitem" tabIndex={0} onClick={() => { setIsProfileMenuOpen(false); }}>
                            Profile
                          </button>
                          <button className="block w-full text-left px-4 py-2 text-sm hover:bg-accent focus:bg-accent focus:outline-none" role="menuitem" tabIndex={0} onClick={() => { setIsProfileMenuOpen(false); }}>
                            Dashboard
                          </button>
                          <button className="block w-full text-left px-4 py-2 text-sm hover:bg-accent focus:bg-accent focus:outline-none" role="menuitem" tabIndex={0} onClick={() => { setIsProfileMenuOpen(false); }}>
                            Settings
                          </button>
                          <div className="border-t my-1" />
                          <button className="block w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:outline-none" role="menuitem" tabIndex={0} onClick={() => { setIsProfileMenuOpen(false); }}>
                            Logout
                          </button>
                        </motion.div>
                      </FocusTrap>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <button
                  className="rounded-md px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none transition-colors"
                  aria-label="Sign in"
                  onClick={() => { /* TODO: Implement sign-in logic */ }}
                >
                  Sign In
                </button>
              )}
            </div>
            {/* End User Profile Menu */}
            <button
              className="inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input hover:bg-accent hover:text-accent-foreground h-9 px-4 md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label="Toggle menu"
            >
              <span className="sr-only">Toggle menu</span>
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  d="M1.5 3C1.22386 3 1 3.22386 1 3.5C1 3.77614 1.22386 4 1.5 4H13.5C13.7761 4 14 3.77614 14 3.5C14 3.22386 13.7761 3 13.5 3H1.5ZM1 7.5C1 7.22386 1.22386 7 1.5 7H13.5C13.7761 7 14 7.22386 14 7.5C14 7.77614 13.7761 8 13.5 8H1.5C1.22386 8 1 7.77614 1 7.5ZM1 11.5C1 11.2239 1.22386 11 1.5 11H13.5C13.7761 11 14 11.2239 14 11.5C14 11.7761 13.7761 12 13.5 12H1.5C1.22386 12 1 11.7761 1 11.5Z"
                  fill="currentColor"
                  fillRule="evenodd"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </nav>
        <div className="block md:hidden px-4 py-2 border-t border-border">
          <SearchBar 
            onSearch={(query) => {
              console.log('Search:', query);
            }} 
            variant="minimal"
            className="w-full" 
          />
        </div>
        <AnimatePresence>
          {isMobileMenuOpen && (
            <FocusTrap
              active={isMobileMenuOpen}
              onEscape={() => setIsMobileMenuOpen(false)}
            >
              <MobileMenu 
                ref={mobileMenuRef} 
                isOpen={isMobileMenuOpen} 
                pathname={pathname} 
                variant={variant}
                aria-label="Mobile navigation menu"
              />
            </FocusTrap>
          )}
        </AnimatePresence>
      </header>
    </ErrorBoundary>
  );
}; 