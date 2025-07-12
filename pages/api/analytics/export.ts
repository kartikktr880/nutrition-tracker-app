import { NextApiRequest, NextApiResponse } from 'next';

import { exportAnalyticsData } from '../../../services/analytics';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { format = 'json' } = req.body;
    const data = await exportAnalyticsData(format);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
} 