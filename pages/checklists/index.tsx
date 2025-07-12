import React, { useEffect } from 'react';

import { Checklist } from '@/components/Checklist';

export default function ChecklistsPage() {
  useEffect(() => {
    // Load checklists logic here
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checklists</h1>
      <Checklist checklistId="dummy-id" />
    </div>
  );
} 