import { DocumentDuplicateIcon, ChartPieIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

import DataAnalytics from './DataAnalytics';
import DataManagement from './DataManagement';

// Add to navigation items
const _navigation = [
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