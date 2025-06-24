import React, { useState } from 'react';
import { barcodeService } from '../../lib/barcode-service';

interface MealPrepInstructionsProps {
  barcode: string;
  onClose?: () => void;
}

const MealPrepInstructions: React.FC<MealPrepInstructionsProps> = ({ barcode, onClose }) => {
  const [activeStep, setActiveStep] = useState(0);
  const instructions = barcodeService.getMealPrepInstructions(barcode);

  if (!instructions) {
    return (
      <div className="p-4 text-center text-gray-600">
        No meal prep instructions available for this item.
      </div>
    );
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Meal Prep Instructions</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            Close
          </button>
        )}
      </div>

      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total Time:</span>
            <span className="ml-2 font-medium">{formatTime(instructions.totalTime)}</span>
          </div>
          <div>
            <span className="text-gray-600">Prep Time:</span>
            <span className="ml-2 font-medium">{formatTime(instructions.prepTime)}</span>
          </div>
          <div>
            <span className="text-gray-600">Cook Time:</span>
            <span className="ml-2 font-medium">{formatTime(instructions.cookTime)}</span>
          </div>
          <div>
            <span className="text-gray-600">Difficulty:</span>
            <span className="ml-2 font-medium capitalize">{instructions.difficulty}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
            disabled={activeStep === 0}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Step {activeStep + 1} of {instructions.steps.length}
          </span>
          <button
            onClick={() => setActiveStep(Math.min(instructions.steps.length - 1, activeStep + 1))}
            disabled={activeStep === instructions.steps.length - 1}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="font-medium mb-2">
            Step {instructions.steps[activeStep].order}: {instructions.steps[activeStep].description}
          </h3>
          <div className="text-sm text-gray-600 mb-2">
            Duration: {formatTime(instructions.steps[activeStep].duration)}
          </div>
          {instructions.steps[activeStep].equipment && (
            <div className="mb-2">
              <span className="text-gray-600">Equipment needed:</span>
              <ul className="list-disc list-inside ml-2">
                {instructions.steps[activeStep].equipment.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {instructions.steps[activeStep].tips && (
            <div>
              <span className="text-gray-600">Tips:</span>
              <ul className="list-disc list-inside ml-2">
                {instructions.steps[activeStep].tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Equipment Needed</h3>
          <ul className="list-disc list-inside">
            {instructions.equipment.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Storage Instructions</h3>
          <div className="text-sm">
            <p>Refrigerator: {instructions.storage.refrigerator} days</p>
            <p>Freezer: {instructions.storage.freezer} days</p>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Reheating Instructions</h3>
          <ul className="list-disc list-inside">
            {instructions.reheating.map((instruction, index) => (
              <li key={index}>{instruction}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MealPrepInstructions; 