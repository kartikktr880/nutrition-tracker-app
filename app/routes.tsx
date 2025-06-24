import DataManagement from './components/DataManagement';
import DataAnalytics from './components/DataAnalytics';

// Add to routes
const routes = [
  {
    path: '/data-management',
    element: <DataManagement />
  },
  {
    path: '/data-analytics',
    element: <DataAnalytics />
  }
]; 