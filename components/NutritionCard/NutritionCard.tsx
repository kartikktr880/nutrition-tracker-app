import React from 'react';

interface NutritionCardProps {
  title: string;
  value: string | number;
  unit?: string;
  className?: string;
}

export const NutritionCard: React.FC<NutritionCardProps> = ({ 
  title, 
  value, 
  unit, 
  className = '' 
}) => {
  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
      <div className="flex items-baseline">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {unit && <span className="ml-1 text-sm text-gray-500">{unit}</span>}
      </div>
    </div>
  );
}; 