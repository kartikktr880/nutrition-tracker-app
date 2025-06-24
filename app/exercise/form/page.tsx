import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ExerciseFormTemplates } from '../components/ExerciseFormTemplates';
import { ExerciseFormCheck } from '../components/ExerciseFormCheck';
import { ExerciseFormHistory } from '../components/ExerciseFormHistory';

export default function ExerciseFormPage() {
  const searchParams = useSearchParams();
  const exerciseId = searchParams.get('exerciseId') || 'current';

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Exercise Form Tracking</h1>
        {exerciseId === 'current' && (
          <div className="bg-yellow-50 text-yellow-700 px-4 py-2 rounded-lg">
            <p className="text-sm">No exercise selected. Please select an exercise to track form.</p>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <Suspense fallback={
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Loading form templates...</span>
              </div>
            </div>
          }>
            <ExerciseFormTemplates />
          </Suspense>
        </div>

        <div>
          <Suspense fallback={
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Loading form check...</span>
              </div>
            </div>
          }>
            <ExerciseFormCheck exerciseId={exerciseId} />
          </Suspense>
        </div>
      </div>

      <div>
        <Suspense fallback={
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading form history...</span>
            </div>
          </div>
        }>
          <ExerciseFormHistory exerciseId={exerciseId} />
        </Suspense>
      </div>
    </div>
  );
} 