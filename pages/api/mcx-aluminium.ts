import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const latestData = await prisma.mCXAluminium.findFirst({
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!latestData) {
      return res.status(404).json({ message: 'No data available' });
    }

    return res.status(200).json(latestData);
  } catch (error) {
    console.error('Error fetching MCX Aluminium data:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 
