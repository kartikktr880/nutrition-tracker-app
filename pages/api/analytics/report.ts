import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { prisma } from '@/lib/prisma';
import PDFDocument from 'pdfkit';
import { Parser } from 'json2csv';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = session.user.id;
    const { startDate, endDate, format } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    // Fetch nutrition data
    const nutritionData = await prisma.nutritionLog.findMany({
      where: {
        userId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    // Fetch goals
    const goals = await prisma.goals.findUnique({
      where: { userId }
    });

    // Process data for report
    const reportData = {
      nutrition: {
        totalCalories: nutritionData.reduce((sum, log) => sum + log.calories, 0),
        averageCalories: nutritionData.reduce((sum, log) => sum + log.calories, 0) / nutritionData.length || 0,
        totalProtein: nutritionData.reduce((sum, log) => sum + log.protein, 0),
        totalCarbs: nutritionData.reduce((sum, log) => sum + log.carbs, 0),
        totalFat: nutritionData.reduce((sum, log) => sum + log.fat, 0),
        dailyBreakdown: nutritionData.map(log => ({
          date: log.date.toISOString().split('T')[0],
          calories: log.calories,
          protein: log.protein,
          carbs: log.carbs,
          fat: log.fat
        }))
      },
      goals: {
        calorieGoal: goals?.calorieGoal || 2000,
        progress: goals ? (nutritionData.reduce((sum, log) => sum + log.calories, 0) / nutritionData.length) / goals.calorieGoal * 100 : 0
      }
    };

    // Generate report based on format
    if (format === 'pdf') {
      const pdfBuffer = await generatePDFReport(reportData);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=nutrition-report.pdf');
      return res.send(pdfBuffer);
    } else if (format === 'csv') {
      const csv = await generateCSVReport(reportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=nutrition-report.csv');
      return res.send(csv);
    } else {
      return res.status(400).json({ error: 'Invalid format specified' });
    }

  } catch (error) {
    console.error('Report generation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function generatePDFReport(data: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Add report header
      doc.fontSize(20).text('Nutrition Report', { align: 'center' });
      doc.moveDown();

      // Add summary section
      doc.fontSize(16).text('Summary');
      doc.fontSize(12)
        .text(`Total Calories: ${data.nutrition.totalCalories.toFixed(0)}`)
        .text(`Average Daily Calories: ${data.nutrition.averageCalories.toFixed(0)}`)
        .text(`Total Protein: ${data.nutrition.totalProtein.toFixed(1)}g`)
        .text(`Total Carbs: ${data.nutrition.totalCarbs.toFixed(1)}g`)
        .text(`Total Fat: ${data.nutrition.totalFat.toFixed(1)}g`);
      doc.moveDown();

      // Add goals section
      doc.fontSize(16).text('Goals');
      doc.fontSize(12)
        .text(`Daily Calorie Goal: ${data.goals.calorieGoal}`)
        .text(`Progress: ${data.goals.progress.toFixed(1)}%`);
      doc.moveDown();

      // Add daily breakdown
      doc.fontSize(16).text('Daily Breakdown');
      doc.fontSize(12);
      data.nutrition.dailyBreakdown.forEach((day: any) => {
        doc.text(`Date: ${day.date}`)
          .text(`Calories: ${day.calories}`)
          .text(`Protein: ${day.protein}g`)
          .text(`Carbs: ${day.carbs}g`)
          .text(`Fat: ${day.fat}g`)
          .moveDown();
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

async function generateCSVReport(data: any): Promise<string> {
  const fields = ['date', 'calories', 'protein', 'carbs', 'fat'];
  const parser = new Parser({ fields });
  
  const csvData = data.nutrition.dailyBreakdown.map((day: any) => ({
    date: day.date,
    calories: day.calories,
    protein: day.protein,
    carbs: day.carbs,
    fat: day.fat
  }));

  return parser.parse(csvData);
} 