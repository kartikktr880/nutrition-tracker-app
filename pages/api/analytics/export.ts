import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { prisma } from '@/lib/prisma';
import { Parser } from 'json2csv';

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

    const userId = session.user.id;
    const { format = 'json' } = req.query;

    // Fetch all nutrition data for the user
    const nutritionData = await prisma.nutritionLog.findMany({
      where: { userId },
      orderBy: { date: 'asc' }
    });

    // Fetch user goals
    const goals = await prisma.goals.findUnique({
      where: { userId }
    });

    // Process data for export
    const exportData = {
      nutrition: nutritionData.map(log => ({
        date: log.date.toISOString(),
        calories: log.calories,
        protein: log.protein,
        carbs: log.carbs,
        fat: log.fat,
        water: log.water,
        notes: log.notes
      })),
      goals: goals ? {
        calorieGoal: goals.calorieGoal,
        proteinGoal: goals.proteinGoal,
        carbGoal: goals.carbGoal,
        fatGoal: goals.fatGoal,
        waterGoal: goals.waterGoal
      } : null
    };

    // Export based on format
    if (format === 'csv') {
      const fields = ['date', 'calories', 'protein', 'carbs', 'fat', 'water', 'notes'];
      const parser = new Parser({ fields });
      const csv = parser.parse(exportData.nutrition);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=nutrition-data.csv');
      return res.send(csv);
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=nutrition-data.json');
      return res.json(exportData);
    } else {
      return res.status(400).json({ error: 'Invalid format specified' });
    }

  } catch (error) {
    console.error('Data export error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 