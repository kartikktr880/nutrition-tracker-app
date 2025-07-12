import { NextApiRequest, NextApiResponse } from 'next';

import { getMonitoringData } from '../../services/monitoring';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;
    const data = await getMonitoringData(userId as string);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
} 