// Centralized navigation array for Nutrition Tracker
// Update this array to add/remove main navigation items in the app

export interface NavigationItem {
  name: string;
  href: string;
  icon?: React.ComponentType<unknown>; // Optional: for sidebar/mobile navs
}

export const navigation: NavigationItem[] = [
  { name: 'Home', href: '/' },
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Food Logger', href: '/food-logger' },
  { name: 'Meal Plan', href: '/meal-plan' },
  { name: 'Analytics', href: '/analytics' },
  { name: 'Water Tracker', href: '/water-tracker' },
  { name: 'Goals', href: '/goals' },
  { name: 'Settings', href: '/settings' },
]; 