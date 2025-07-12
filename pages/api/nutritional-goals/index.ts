import { NextApiRequest, NextApiResponse } from 'next';

import { getNutritionalGoals, updateNutritionalGoals } from '../../../services/nutritional-goals';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const { userId } = req.query;
        const goals = await getNutritionalGoals(userId as string);
        res.status(200).json(goals);
      } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
      }
      break;

    case 'POST':
      try {
        const { userId, goals } = req.body;
        const updatedGoals = await updateNutritionalGoals(userId, goals);
        res.status(200).json(updatedGoals);
      } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
} 