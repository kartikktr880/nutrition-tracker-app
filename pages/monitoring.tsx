import { NextPage } from 'next';
import Head from 'next/head';
import MonitoringDashboard from '@/components/MonitoringDashboard';

const MonitoringPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>System Monitoring - Nutrition Tracker</title>
        <meta name="description" content="System monitoring dashboard for Nutrition Tracker" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <MonitoringDashboard />
      </main>
    </>
  );
};

export default MonitoringPage; 