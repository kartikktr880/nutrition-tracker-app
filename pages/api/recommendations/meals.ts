import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import RecommendationService from '@/services/recommendations';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = session.user?.id || 'unknown-user';
    const { mealType = 'lunch', count = '5' } = req.query;

    if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType as string)) {
      return res.status(400).json({ error: 'Invalid meal type' });
    }

    const recommendationService = RecommendationService.getInstance();
    const recommendations = await recommendationService.getMealRecommendations(
      userId,
      mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
      parseInt(count as string)
    );

    // Cache the response
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(recommendations);

  } catch (error) {
    console.error('Meal recommendations error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 