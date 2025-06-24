import React, { useState, useEffect } from 'react';
import { dataManagementService } from '../../lib/data-management-service';

const DataManagement: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<{ errors: string[], warnings: string[] } | null>(null);
  const [versionInfo, setVersionInfo] = useState<{ currentVersion: string; supportedVersions: string[] } | null>(null);
  const [privacySettings, setPrivacySettings] = useState<any>(null);

  useEffect(() => {
    setVersionInfo(dataManagementService.getVersionInfo());
    setPrivacySettings(dataManagementService.getPrivacySettings());
  }, []);

  const handlePrivacySettingsChange = (settings: any) => {
    dataManagementService.updatePrivacySettings(settings);
    setPrivacySettings(settings);
    setSuccess('Privacy settings updated successfully');
  };

  const handleCleanup = async () => {
    try {
      await dataManagementService.cleanupOldData();
      setSuccess('Old data cleaned up successfully');
    } catch (err) {
      setError('Failed to cleanup old data');
      console.error('Cleanup error:', err);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError(null);
      setSuccess(null);
      setValidationResults(null);

      const data = dataManagementService.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nutrition-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess('Data exported successfully');
    } catch (err) {
      setError('Failed to export data');
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setError(null);
      setSuccess(null);
      setValidationResults(null);

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);

          // Validate data before import
          const validationResult = dataManagementService.validateData(data);
          setValidationResults({
            errors: validationResult.errors,
            warnings: validationResult.warnings
          });

          if (!validationResult.isValid) {
            setError('Data validation failed. Please check the validation results.');
            return;
          }

          // If there are warnings but no errors, show confirmation
          if (validationResult.warnings.length > 0) {
            if (!window.confirm('Data validation shows some warnings. Do you want to proceed with the import?')) {
              return;
            }
          }

          // Attempt to recover data
          await dataManagementService.recoverData(data);
          setSuccess('Data imported successfully');
          // Refresh the page to show new data
          window.location.reload();
        } catch (err) {
          setError('Failed to import data');
          console.error('Import error:', err);
        } finally {
          setIsImporting(false);
        }
      };
      reader.readAsText(file);
    } catch (err) {
      setError('Failed to read file');
      console.error('File read error:', err);
      setIsImporting(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold mb-4">Data Management</h2>

      {versionInfo && (
        <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-3 rounded mb-4">
          <h3 className="font-medium mb-2">Version Information</h3>
          <p className="text-sm">
            Current Version: <span className="font-medium">{versionInfo.currentVersion}</span>
          </p>
          <p className="text-sm">
            Supported Versions: <span className="font-medium">{versionInfo.supportedVersions.join(', ')}</span>
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {validationResults && (
        <div className="space-y-2">
          {validationResults.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <h4 className="font-medium mb-2">Validation Errors:</h4>
              <ul className="list-disc list-inside">
                {validationResults.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          {validationResults.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
              <h4 className="font-medium mb-2">Validation Warnings:</h4>
              <ul className="list-disc list-inside">
                {validationResults.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="font-medium mb-2">Privacy Settings</h3>
          {privacySettings && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Retention (days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={privacySettings.dataRetentionDays}
                  onChange={(e) => handlePrivacySettingsChange({
                    ...privacySettings,
                    dataRetentionDays: parseInt(e.target.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Auto Backup
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={privacySettings.autoBackupEnabled}
                    onChange={(e) => handlePrivacySettingsChange({
                      ...privacySettings,
                      autoBackupEnabled: e.target.checked
                    })}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-600">Enable automatic backups</span>
                </div>
              </div>

              {privacySettings.autoBackupEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Backup Frequency
                  </label>
                  <select
                    value={privacySettings.backupFrequency}
                    onChange={(e) => handlePrivacySettingsChange({
                      ...privacySettings,
                      backupFrequency: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Encryption
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={privacySettings.encryptionEnabled}
                    onChange={(e) => handlePrivacySettingsChange({
                      ...privacySettings,
                      encryptionEnabled: e.target.checked
                    })}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-600">Enable data encryption</span>
                </div>
              </div>

              <button
                onClick={handleCleanup}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Cleanup Old Data
              </button>
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="font-medium mb-2">Export Data</h3>
          <p className="text-sm text-gray-600 mb-4">
            Download all your data as a JSON file. This includes your barcode history,
            favorites, meal plans, nutritional goals, and preferences.
          </p>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isExporting ? 'Exporting...' : 'Export Data'}
          </button>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="font-medium mb-2">Import Data</h3>
          <p className="text-sm text-gray-600 mb-4">
            Restore your data from a previously exported JSON file. This will replace
            all current data. A backup will be created automatically before import.
            Data will be automatically migrated if needed.
          </p>
          <div className="flex items-center space-x-4">
            <label className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer disabled:opacity-50">
              {isImporting ? 'Importing...' : 'Choose File'}
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={isImporting}
                className="hidden"
              />
            </label>
            <span className="text-sm text-gray-600">
              {isImporting ? 'Importing data...' : 'Select a backup file'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataManagement; 