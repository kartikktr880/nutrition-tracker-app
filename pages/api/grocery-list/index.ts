import { NextApiRequest, NextApiResponse } from 'next';

import { getGroceryList, updateGroceryList } from '../../../services/grocery-list';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const { userId } = req.query;
        const list = await getGroceryList(userId as string);
        res.status(200).json(list);
      } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
      }
      break;

    case 'POST':
      try {
        const { userId, items } = req.body;
        const updatedList = await updateGroceryList(userId, items);
        res.status(200).json(updatedList);
      } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
} 