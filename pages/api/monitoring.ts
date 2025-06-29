import { NextApiRequest, NextApiResponse } from 'next';
import { MonitoringService } from '@/services/monitoring';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const monitoringService = MonitoringService.getInstance();
    await monitoringService.handleApiRequest(req, res);
  } catch (error) {
    console.error('Monitoring API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 