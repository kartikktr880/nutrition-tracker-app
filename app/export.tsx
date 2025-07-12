import React from 'react';

import { useAuth } from '../hooks/useAuth';

const ExportPage: React.FC = () => {
  const { user: _user } = useAuth();

  return (
    <div className="export-page">
      <h1>Export Data</h1>
      <div className="export-content">
        <p>Export your nutrition data in various formats.</p>
        <div className="export-options">
          <button className="export-btn">Export as JSON</button>
          <button className="export-btn">Export as CSV</button>
          <button className="export-btn">Export as PDF</button>
        </div>
      </div>
    </div>
  );
};

export default ExportPage; 