import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';

const AnalyticsPage: NextPage = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  if (authLoading || !isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Analytics | Nutrition Tracker</title>
        <meta
          name="description"
          content="Track your nutrition progress with detailed analytics and insights"
        />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Analytics Dashboard</h1>
        <AnalyticsDashboard userId={user.id} />
      </main>
    </>
  );
};

export default AnalyticsPage; 