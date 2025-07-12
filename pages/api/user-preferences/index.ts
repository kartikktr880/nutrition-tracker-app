import { NextApiRequest, NextApiResponse } from 'next';

import { getUserPreferences, updateUserPreferences } from '../../../services/user-preferences';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const { userId } = req.query;
        const preferences = await getUserPreferences(userId as string);
        res.status(200).json(preferences);
      } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
      }
      break;

    case 'POST':
      try {
        const { userId, preferences } = req.body;
        const updatedPreferences = await updateUserPreferences(userId, preferences);
        res.status(200).json(updatedPreferences);
      } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
} 