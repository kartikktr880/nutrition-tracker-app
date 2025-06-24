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

  const userId = session.user.id;

  switch (req.method) {
    case 'GET':
      try {
        const groceryList = await prisma.groceryList.findFirst({
          where: {
            userId,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          },
          include: {
            items: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        if (!groceryList) {
          return res.status(404).json({ error: 'Grocery list not found' });
        }

        return res.status(200).json(groceryList);
      } catch (error) {
        console.error('Error fetching grocery list:', error);
        return res.status(500).json({ error: 'Failed to fetch grocery list' });
      }

    case 'POST':
      try {
        const { mealPlanId } = req.body;

        // Get meal plan
        const mealPlan = await prisma.mealPlan.findUnique({
          where: { id: mealPlanId },
          include: {
            meals: true,
            preferences: true
          }
        });

        if (!mealPlan) {
          return res.status(404).json({ error: 'Meal plan not found' });
        }

        // Generate grocery list using AI
        const groceryList = await aiService.generateSmartGroceryList(
          mealPlan.meals,
          mealPlan.preferences
        );

        // Save to database
        const savedGroceryList = await prisma.groceryList.create({
          data: {
            userId,
            totalEstimatedCost: groceryList.totalEstimatedCost,
            items: {
              create: groceryList.items
            },
            storeCategories: groceryList.storeCategories
          },
          include: {
            items: true
          }
        });

        return res.status(201).json(savedGroceryList);
      } catch (error) {
        console.error('Error creating grocery list:', error);
        return res.status(500).json({ error: 'Failed to create grocery list' });
      }

    case 'PUT':
      try {
        const { groceryList } = req.body;

        // Update in database
        const updatedGroceryList = await prisma.groceryList.update({
          where: {
            id: groceryList.id
          },
          data: {
            items: {
              deleteMany: {},
              create: groceryList.items
            },
            totalEstimatedCost: groceryList.totalEstimatedCost,
            storeCategories: groceryList.storeCategories
          },
          include: {
            items: true
          }
        });

        return res.status(200).json(updatedGroceryList);
      } catch (error) {
        console.error('Error updating grocery list:', error);
        return res.status(500).json({ error: 'Failed to update grocery list' });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
} 