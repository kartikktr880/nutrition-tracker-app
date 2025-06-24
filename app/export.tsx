import React from 'react';
import ExportManager from './components/ExportManager';

const ExportPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Export Management</h1>
      <ExportManager />
    </div>
  );
};

export default ExportPage; 