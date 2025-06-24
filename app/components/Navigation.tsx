import { HomeIcon, ChartBarIcon, DocumentDuplicateIcon, ChartPieIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import DataManagement from './DataManagement';
import DataAnalytics from './DataAnalytics';

// Add to navigation items
const navigation = [
  {
    name: 'Data Management',
    href: '/data-management',
    icon: DocumentDuplicateIcon,
    component: DataManagement
  },
  {
    name: 'Data Analytics',
    href: '/data-analytics',
    icon: ChartPieIcon,
    component: DataAnalytics
  },
  {
    name: 'Checklists',
    href: '/checklists',
    icon: CheckCircleIcon
  }
];

// ... rest of the existing code ... 