import { NextApiRequest, NextApiResponse } from 'next';

import { getMealRecommendations } from '../../../services/recommendations';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId, preferences, restrictions } = req.query;
    const recommendations = await getMealRecommendations({
      userId: userId as string,
      preferences: preferences as string,
      restrictions: restrictions as string
    });
    res.status(200).json(recommendations);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
} 