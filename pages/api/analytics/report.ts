import { NextApiRequest, NextApiResponse } from 'next';

import { generateAnalyticsReport } from '../../../services/analytics';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { period = 'weekly' } = req.query;
    const report = await generateAnalyticsReport(period as string);
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
} 