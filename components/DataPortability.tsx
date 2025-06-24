import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export const DataPortability: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleExport = async (format: 'json' | 'csv') => {
    if (!user) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/data-portability?format=${format}`);
      
      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nutrition-data.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess('Data exported successfully');
    } catch (err) {
      setError('Failed to export data. Please try again.');
      console.error('Export error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files?.length) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const file = event.target.files[0];
      const format = file.name.endsWith('.csv') ? 'csv' : 'json';
      const content = await file.text();

      const response = await fetch('/api/data-portability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: content, format }),
      });

      if (!response.ok) {
        throw new Error('Failed to import data');
      }

      setSuccess('Data imported successfully');
    } catch (err) {
      setError('Failed to import data. Please check the file format and try again.');
      console.error('Import error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => handleExport('json')}
          disabled={loading}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
        >
          Export JSON
        </button>
        <button
          onClick={() => handleExport('csv')}
          disabled={loading}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
        >
          Export CSV
        </button>
        <label className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50 cursor-pointer text-center">
          Import Data
          <input
            type="file"
            accept=".json,.csv"
            onChange={handleImport}
            disabled={loading}
            className="hidden"
          />
        </label>
      </div>

      {loading && (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <p className="text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}
    </div>
  );
}; 