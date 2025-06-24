import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import prisma from '../../../lib/prisma';
import { AIRecommendationService } from '../../../services/ai-recommendation';

const aiService = new AIRecommendationService();

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
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
          return res.status(400).json({ error: 'Start date and end date are required' });
        }

        const mealPlan = await prisma.mealPlan.findFirst({
          where: {
            userId,
            startDate: new Date(startDate as string),
            endDate: new Date(endDate as string),
          },
          include: {
            meals: true,
            groceryList: {
              include: {
                items: true,
              },
            },
            mealPrepPlan: {
              include: {
                meals: true,
              },
            },
          },
        });

        if (!mealPlan) {
          return res.status(404).json({ error: 'Meal plan not found' });
        }

        return res.status(200).json(mealPlan);
      } catch (error) {
        console.error('Error fetching meal plan:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

    case 'POST':
      try {
        const { startDate, endDate } = req.body;

        if (!startDate || !endDate) {
          return res.status(400).json({ error: 'Start date and end date are required' });
        }

        // Fetch user preferences and goals
        const [preferences, goals] = await Promise.all([
          prisma.userPreferences.findUnique({
            where: { userId },
          }),
          prisma.nutritionalGoals.findUnique({
            where: { userId },
          }),
        ]);

        if (!preferences || !goals) {
          return res.status(400).json({ error: 'User preferences and goals must be set first' });
        }

        // Generate meal plan using AI service
        const aiMealPlan = await aiService.generateMealPlan({
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          preferences,
          goals,
        });

        // Create meal plan in database
        const mealPlan = await prisma.mealPlan.create({
          data: {
            userId,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            preferences: preferences,
            goals: goals,
            meals: {
              create: aiMealPlan.meals.map((meal: any) => ({
                name: meal.name,
                calories: meal.calories,
                protein: meal.protein,
                carbs: meal.carbs,
                fat: meal.fat,
                ingredients: meal.ingredients,
                instructions: meal.instructions,
                prepTime: meal.prepTime,
                cookTime: meal.cookTime,
                servings: meal.servings,
                tags: meal.tags,
                imageUrl: meal.imageUrl,
                nutritionalScore: meal.nutritionalScore,
              })),
            },
          },
          include: {
            meals: true,
          },
        });

        // Generate grocery list
        const groceryList = await aiService.generateGroceryList(mealPlan.meals);
        await prisma.groceryList.create({
          data: {
            userId,
            totalEstimatedCost: groceryList.totalEstimatedCost,
            storeCategories: groceryList.storeCategories,
            items: {
              create: groceryList.items.map((item: any) => ({
                name: item.name,
                amount: item.amount,
                unit: item.unit,
                category: item.category,
                estimatedCost: item.estimatedCost,
                storeSection: item.storeSection,
                priority: item.priority,
                notes: item.notes,
              })),
            },
            mealPlanId: mealPlan.id,
          },
        });

        // Generate meal prep plan
        const mealPrepPlan = await aiService.generateMealPrepPlan(mealPlan.meals);
        await prisma.mealPrepPlan.create({
          data: {
            userId,
            prepSchedule: mealPrepPlan.prepSchedule,
            totalPrepTime: mealPrepPlan.totalPrepTime,
            storageInstructions: mealPrepPlan.storageInstructions,
            mealPlanId: mealPlan.id,
          },
        });

        return res.status(201).json(mealPlan);
      } catch (error) {
        console.error('Error creating meal plan:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

    case 'PUT':
      try {
        const { mealPlanId, updates } = req.body;

        if (!mealPlanId || !updates) {
          return res.status(400).json({ error: 'Meal plan ID and updates are required' });
        }

        const updatedMealPlan = await prisma.mealPlan.update({
          where: { id: mealPlanId },
          data: updates,
          include: {
            meals: true,
            groceryList: {
              include: {
                items: true,
              },
            },
            mealPrepPlan: {
              include: {
                meals: true,
              },
            },
          },
        });

        return res.status(200).json(updatedMealPlan);
      } catch (error) {
        console.error('Error updating meal plan:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
} 