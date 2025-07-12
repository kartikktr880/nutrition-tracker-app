import React from 'react';

import { ExerciseFormHistory } from '../components/ExerciseFormHistory';
import { ExerciseFormTemplates } from '../components/ExerciseFormTemplates';

export default function ExerciseFormPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Exercise Form Management</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Form History</h2>
          <ExerciseFormHistory exerciseId="dummy-id" />
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Form Templates</h2>
          <ExerciseFormTemplates />
        </div>
      </div>
    </div>
  );
} 