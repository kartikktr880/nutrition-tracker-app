import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import prisma from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.id;

  switch (req.method) {
    case 'GET':
      try {
        const goals = await prisma.nutritionalGoals.findUnique({
          where: { userId },
        });

        if (!goals) {
          return res.status(404).json({ error: 'Nutritional goals not found' });
        }

        return res.status(200).json(goals);
      } catch (error) {
        console.error('Error fetching nutritional goals:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

    case 'PUT':
      try {
        const {
          calories,
          protein,
          carbohydrates,
          fats,
          fiber,
          sugar,
          sodium,
          vitaminA,
          vitaminC,
          calcium,
          iron,
        } = req.body;

        const updatedGoals = await prisma.nutritionalGoals.upsert({
          where: { userId },
          update: {
            calories,
            protein,
            carbohydrates,
            fats,
            fiber,
            sugar,
            sodium,
            vitaminA,
            vitaminC,
            calcium,
            iron,
          },
          create: {
            userId,
            calories,
            protein,
            carbohydrates,
            fats,
            fiber,
            sugar,
            sodium,
            vitaminA,
            vitaminC,
            calcium,
            iron,
          },
        });

        return res.status(200).json(updatedGoals);
      } catch (error) {
        console.error('Error updating nutritional goals:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

    default:
      res.setHeader('Allow', ['GET', 'PUT']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
} 