import Head from 'next/head';
import React from 'react';

import { useAuth } from '../hooks/useAuth';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <>
      <Head>
        <title>Dashboard - Nutrition Tracker</title>
        <meta name="description" content="Your nutrition tracking dashboard" />
      </Head>
      <div className="dashboard-page">
        <h1>Welcome, {user?.name || 'User'}!</h1>
        <div className="dashboard-content">
          <div className="quick-stats">
            <div className="stat-card">
              <h3>Today&apos;s Calories</h3>
              <p>1,850 / 2,000</p>
            </div>
            <div className="stat-card">
              <h3>Water Intake</h3>
              <p>6 / 8 glasses</p>
            </div>
            <div className="stat-card">
              <h3>Meals Logged</h3>
              <p>3</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardPage; 