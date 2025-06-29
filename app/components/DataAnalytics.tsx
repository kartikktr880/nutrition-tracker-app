import React, { useState, useEffect } from 'react';
import { dataManagementService } from '../../lib/data-management-service';
// // import { Line, Bar, div } from 'react-chartjs-2';
// // import { Chart, registerables } from 'chart.js';
// // Chart.register(...registerables);

const DataAnalytics: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customReport, setCustomReport] = useState<any>(null);
  const [reportConfig, setReportConfig] = useState({
    name: '',
    description: '',
    filters: {
      dateRange: {
        start: Date.now() - 30 * 24 * 60 * 60 * 1000,
        end: Date.now()
      },
      categories: [],
      nutritionalValues: {
        min: 0,
        max: 1000,
        type: 'calories'
      },
      mealTypes: [],
      customTags: []
    },
    metrics: ['totalScans', 'uniqueItems', 'averageCalories'],
    groupBy: '',
    sortBy: 'timestamp',
    sortOrder: 'desc' as const,
    chartType: 'line' as const,
    timeInterval: 'daily' as const
  });
  const [exportOptions, setExportOptions] = useState({
    format: 'json' as const,
    includeMetadata: true,
    sections: {
      barcodeHistory: true,
      barcodeFavorites: true,
      mealPlans: true,
      nutritionalGoals: true,
      goalProgress: true,
      dietaryPreferences: true,
      groceryList: true,
      mealPrepTemplates: true
    }
  });

  useEffect(() => {
    try {
      const data = dataManagementService.getAnalyticsData();
      setAnalyticsData(data);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleExport = () => {
    try {
      const data = dataManagementService.exportDataWithOptions(exportOptions);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nutrition-data-${new Date().toISOString()}.${exportOptions.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export data');
    }
  };

  const handleExportOptionChange = (option: string, value: any) => {
    setExportOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };

  const handleSectionToggle = (section: string) => {
    setExportOptions(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [section as any]: !prev.sections[section as any]
      }
    }));
  };

  const handleGenerateReport = () => {
    try {
      const report = dataManagementService.generateCustomReport(reportConfig);
      setCustomReport(report);
    } catch (err) {
      console.error('Report generation error:', err);
      setError('Failed to generate report');
    }
  };

  const handleReportConfigChange = (field: string, value: any) => {
    setReportConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFilterChange = (field: string, value: any) => {
    setReportConfig(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [field]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return null;
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const barcodeChartData = dataManagementService.getChartData('barcode');
  const mealPlanChartData = dataManagementService.getChartData('mealPlan');
  const goalProgressChartData = dataManagementService.getChartData('goalProgress');

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Data Analytics</h2>
        <div className="space-x-2">
          <select
            className="border rounded px-2 py-1"
            value={exportOptions.format}
            onChange={(e) => handleExportOptionChange('format', e.target.value)}
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
            <option value="pdf">PDF</option>
          </select>
          <button
            className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600"
            onClick={handleExport}
          >
            Export Data
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h3 className="font-medium mb-3">Export Options</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(exportOptions.sections).map(([section, enabled]) => (
            <label key={section} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={enabled}
                onChange={() => handleSectionToggle(section)}
                className="rounded"
              />
              <span className="text-sm">{section}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Custom Report Section */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h3 className="font-medium mb-3">Custom Report Generator</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Report Name</label>
            <input
              type="text"
              value={reportConfig.name}
              onChange={(e) => handleReportConfigChange('name', e.target.value)}
              className="w-full border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <input
              type="text"
              value={reportConfig.description}
              onChange={(e) => handleReportConfigChange('description', e.target.value)}
              className="w-full border rounded px-2 py-1"
            />
          </div>
        </div>

        <div className="mt-4">
          <h4 className="font-medium mb-2">Filters</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date Range</label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={new Date(reportConfig.filters.dateRange.start).toISOString().split('T')[0]}
                  onChange={(e) => handleFilterChange('dateRange', {
                    ...reportConfig.filters.dateRange,
                    start: new Date(e.target.value).getTime()
                  })}
                  className="border rounded px-2 py-1"
                />
                <input
                  type="date"
                  value={new Date(reportConfig.filters.dateRange.end).toISOString().split('T')[0]}
                  onChange={(e) => handleFilterChange('dateRange', {
                    ...reportConfig.filters.dateRange,
                    end: new Date(e.target.value).getTime()
                  })}
                  className="border rounded px-2 py-1"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Chart Type</label>
              <select
                value={reportConfig.chartType}
                onChange={(e) => handleReportConfigChange('chartType', e.target.value)}
                className="w-full border rounded px-2 py-1"
              >
                <option value="line">div Chart</option>
                <option value="bar">div Chart</option>
                <option value="pie">div Chart</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="font-medium mb-2">Metrics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {['totalScans', 'uniqueItems', 'averageCalories'].map(metric => (
              <label key={metric} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={reportConfig.metrics.includes(metric)}
                  onChange={(e) => {
                    const newMetrics = e.target.checked
                      ? [...reportConfig.metrics, metric]
                      : reportConfig.metrics.filter(m => m !== metric);
                    handleReportConfigChange('metrics', newMetrics);
                  }}
                  className="rounded"
                />
                <span className="text-sm">{metric}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            onClick={handleGenerateReport}
          >
            Generate Report
          </button>
        </div>
      </div>

      {/* Custom Report Results */}
      {customReport && (
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="font-medium mb-3">Report Results</h3>
          
          {/* Summary */}
          <div className="mb-4">
            <h4 className="font-medium mb-2">Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm">Total Items</p>
                <p className="font-medium">{customReport.summary.totalItems}</p>
              </div>
              {Object.entries(customReport.summary.metrics).map(([key, value]) => (
                <div key={key}>
                  <p className="text-sm">{key}</p>
                  <p className="font-medium">{typeof value === 'number' ? value.toFixed(2) : value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Chart */}
          {customReport.chartData && (
            <div className="mb-4">
              <h4 className="font-medium mb-2">Chart</h4>
              <div className="h-64">
                {customReport.chartData.type === 'line' && (
                  <div>Chart Placeholder</div>
                )}
                {customReport.chartData.type === 'bar' && (
                  <div>Chart Placeholder</div>
                )}
                {customReport.chartData.type === 'pie' && (
                  <div>Chart Placeholder</div>
                )}
              </div>
            </div>
          )}

          {/* Data Table */}
          <div>
            <h4 className="font-medium mb-2">Data</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    {Object.keys(customReport.data[0] || {}).map(key => (
                      <th key={key} className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {customReport.data.map((item: any, index: number) => (
                    <tr key={index}>
                      {Object.values(item).map((value: any, i: number) => (
                        <td key={i} className="px-4 py-2 text-sm">
                          {typeof value === 'object' ? JSON.stringify(value) : value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Barcode Scan Chart */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="font-medium mb-3">{barcodeChartData.title}</h3>
          <div>Chart Placeholder</div>
        </div>

        {/* Meal Plan Distribution Chart */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="font-medium mb-3">{mealPlanChartData.title}</h3>
          <div>Chart Placeholder</div>
        </div>

        {/* Goal Progress Chart */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="font-medium mb-3">{goalProgressChartData.title}</h3>
          <div>Chart Placeholder</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Barcode Statistics */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="font-medium mb-3">Barcode Statistics</h3>
          <div className="space-y-2">
            <p className="text-sm">
              Total Scans: <span className="font-medium">{analyticsData.totalScans}</span>
            </p>
            <p className="text-sm">
              Unique Items: <span className="font-medium">{analyticsData.uniqueItems}</span>
            </p>
          </div>
        </div>

        {/* Meal Plan Statistics */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="font-medium mb-3">Meal Plan Statistics</h3>
          <div className="space-y-2">
            <p className="text-sm">
              Total Plans: <span className="font-medium">{analyticsData.mealPlanStats.totalPlans}</span>
            </p>
            <p className="text-sm">
              Completed Plans: <span className="font-medium">{analyticsData.mealPlanStats.completedPlans}</span>
            </p>
            <p className="text-sm">
              Upcoming Plans: <span className="font-medium">{analyticsData.mealPlanStats.upcomingPlans}</span>
            </p>
          </div>
        </div>

        {/* Goal Progress */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="font-medium mb-3">Goal Progress</h3>
          <div className="space-y-2">
            <p className="text-sm">
              Current Progress: <span className="font-medium">{analyticsData.goalProgress.currentProgress.toFixed(1)}%</span>
            </p>
            <p className="text-sm">
              Average Progress: <span className="font-medium">{analyticsData.goalProgress.averageProgress.toFixed(1)}%</span>
            </p>
            <p className="text-sm">
              Streak Days: <span className="font-medium">{analyticsData.goalProgress.streakDays}</span>
            </p>
          </div>
        </div>

        {/* Most Scanned Items */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="font-medium mb-3">Most Scanned Items</h3>
          <div className="space-y-2">
            {analyticsData.mostScannedItems.map((item: any, index: number) => (
              <p key={index} className="text-sm">
                {item.name}: <span className="font-medium">{item.count} scans</span>
              </p>
            ))}
          </div>
        </div>

        {/* Dietary Preferences */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="font-medium mb-3">Dietary Preferences</h3>
          <div className="space-y-2">
            <p className="text-sm font-medium">Preferences:</p>
            <ul className="list-disc list-inside text-sm">
              {analyticsData.dietaryPreferences.preferences.map((pref: string, index: number) => (
                <li key={index}>{pref}</li>
              ))}
            </ul>
            <p className="text-sm font-medium mt-2">Restrictions:</p>
            <ul className="list-disc list-inside text-sm">
              {analyticsData.dietaryPreferences.restrictions.map((rest: string, index: number) => (
                <li key={index}>{rest}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Data Size */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="font-medium mb-3">Data Size</h3>
          <div className="space-y-2">
            <p className="text-sm">
              Total Size: <span className="font-medium">{formatBytes(analyticsData.dataSize.totalSize)}</span>
            </p>
            <div className="text-sm">
              <p className="font-medium mb-1">Breakdown:</p>
              {Object.entries(analyticsData.dataSize.breakdown).map(([key, value]: [string, any]) => (
                <p key={key} className="text-sm">
                  {key}: <span className="font-medium">{formatBytes(value)}</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataAnalytics; 
