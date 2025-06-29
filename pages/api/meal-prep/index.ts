import { NextApiRequest, NextApiResponse } from 'next';
import { AIRecommendationService } from '../../../services/ai-recommendation';
import { prisma } from '../../../lib/prisma';
import { getSession } from 'next-auth/react';

const aiService = new AIRecommendationService({
  modelEndpoint: process.env.AI_MODEL_ENDPOINT || '',
  apiKey: process.env.AI_API_KEY || ''
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user?.id || 'unknown-user';

  switch (req.method) {
    case 'GET':
      try {
        const { mealPlanId } = req.query;

        const mealPrepPlan = await prisma.mealPrepPlan.findFirst({
          where: {
            userId,
            mealPlanId: mealPlanId as string
          },
          include: {
            meals: true,
            prepSchedule: true
          }
        });

        if (!mealPrepPlan) {
          return res.status(404).json({ error: 'Meal prep plan not found' });
        }

        return res.status(200).json(mealPrepPlan);
      } catch (error) {
        console.error('Error fetching meal prep plan:', error);
        return res.status(500).json({ error: 'Failed to fetch meal prep plan' });
      }

    case 'POST':
      try {
        const { mealPlanId } = req.body;

        // Get meal plan
        const mealPlan = await prisma.mealPlan.findUnique({
          where: { id: mealPlanId },
          include: {
            meals: true
          }
        });

        if (!mealPlan) {
          return res.status(404).json({ error: 'Meal plan not found' });
        }

        // Generate meal prep plan using AI
        const mealPrepPlan = await aiService.getMealPrepInstructions(mealPlan.meals[0]);

        // Save to database
        const savedMealPrepPlan = await prisma.mealPrepPlan.create({
          data: {
            userId,
            mealPlanId,
            meals: {
              connect: mealPlan.meals.map((meal: any) => ({ id: meal.id }))
            },
            prepSchedule: {
              create: mealPrepPlan.prepSchedule
            },
            totalPrepTime: mealPrepPlan.totalPrepTime,
            storageInstructions: mealPrepPlan.storageInstructions
          },
          include: {
            meals: true,
            prepSchedule: true
          }
        });

        return res.status(201).json(savedMealPrepPlan);
      } catch (error) {
        console.error('Error creating meal prep plan:', error);
        return res.status(500).json({ error: 'Failed to create meal prep plan' });
      }

    case 'PUT':
      try {
        const { mealPrepPlan } = req.body;

        // Update in database
        const updatedMealPrepPlan = await prisma.mealPrepPlan.update({
          where: {
            id: mealPrepPlan.id
          },
          data: {
            prepSchedule: {
              deleteMany: {},
              create: mealPrepPlan.prepSchedule
            },
            totalPrepTime: mealPrepPlan.totalPrepTime,
            storageInstructions: mealPrepPlan.storageInstructions
          },
          include: {
            meals: true,
            prepSchedule: true
          }
        });

        return res.status(200).json(updatedMealPrepPlan);
      } catch (error) {
        console.error('Error updating meal prep plan:', error);
        return res.status(500).json({ error: 'Failed to update meal prep plan' });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
} 