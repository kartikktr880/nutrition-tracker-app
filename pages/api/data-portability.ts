import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import DataPortabilityService from '@/services/data-portability';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const dataPortabilityService = DataPortabilityService.getInstance();

  try {
    if (req.method === 'GET') {
      const format = (req.query.format as 'json' | 'csv') || 'json';
      const data = await dataPortabilityService.exportData(session.user.id, format);
      
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=nutrition-data.${format}`);
      return res.status(200).send(data);
    }

    if (req.method === 'POST') {
      const { data, format } = req.body;
      await dataPortabilityService.importData(session.user.id, data, format);
      return res.status(200).json({ message: 'Data imported successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Data portability error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 