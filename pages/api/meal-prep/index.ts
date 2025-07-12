import { NextApiRequest, NextApiResponse } from 'next';

import { generateMealPrepPlan } from '../../../services/meal-prep';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { mealPlan, prepTime, servings } = req.body;
    const prepPlan = await generateMealPrepPlan({
      mealPlan,
      prepTime,
      servings
    });
    res.status(200).json(prepPlan);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
} 