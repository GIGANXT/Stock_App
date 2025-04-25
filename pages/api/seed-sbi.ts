import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

// Create a new instance of the PrismaClient
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Insert a test record with proper decimal handling
    const result = await prisma.sBITTRate.create({
      data: {
        sbiTTSell: 83.2500,
        sbiTTBuy: 81.7500,
      }
    });

    console.log('Test data created:', result);

    // Return success
    res.status(200).json({ 
      success: true, 
      message: 'Test data created successfully',
      data: result 
    });
  } catch (error) {
    console.error('Error creating test data:', error);
    
    // Return error
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  } finally {
    await prisma.$disconnect();
  }
} 