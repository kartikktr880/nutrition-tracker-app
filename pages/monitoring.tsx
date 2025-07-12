import Head from 'next/head';
import React from 'react';

import { useAuth } from '../hooks/useAuth';

const MonitoringPage: React.FC = () => {
  const { user: _user } = useAuth();

  return (
    <>
      <Head>
        <title>Monitoring - Nutrition Tracker</title>
        <meta name="description" content="Monitor your nutrition progress" />
      </Head>
      <div className="monitoring-page">
        <h1>Progress Monitoring</h1>
        <div className="monitoring-content">
          <div className="progress-charts">
            <div className="chart-container">
              <h3>Weekly Progress</h3>
              <div className="chart-placeholder">
                <p>Chart visualization will be implemented here</p>
              </div>
            </div>
            <div className="chart-container">
              <h3>Monthly Trends</h3>
              <div className="chart-placeholder">
                <p>Trend analysis will be implemented here</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MonitoringPage; 