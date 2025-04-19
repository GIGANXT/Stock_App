import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Get the latest date from the database
    const latestDate = await prisma.futuresPrice.findFirst({
      orderBy: {
        date: 'desc'
      },
      select: {
        date: true
      }
    });

    if (!latestDate) {
      return NextResponse.json({ error: 'No data found' }, { status: 404 });
    }

    // Get all prices for the latest date
    const prices = await prisma.futuresPrice.findMany({
      where: {
        date: latestDate.date
      },
      orderBy: {
        contractMonth: 'asc'
      }
    });

    // Filter to only include current month and next two months
    const currentMonth = new Date().getMonth();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const filteredPrices = prices.filter(price => {
      const contractMonth = price.contractMonth.split(' ')[0]; // Get month name without year
      const monthIndex = months.indexOf(contractMonth);
      
      // Include current month and next two months
      return monthIndex >= currentMonth && monthIndex < currentMonth + 3;
    });

    // Format the data to match the expected structure
    const formattedData = {
      date: latestDate.date.toISOString().split('T')[0],
      time: filteredPrices[0]?.timestamp.toTimeString().split(' ')[0] || '00:00:00',
      timestamp: filteredPrices[0]?.timestamp.toISOString() || new Date().toISOString(),
      prices: filteredPrices.reduce((acc, price) => {
        acc[price.contractMonth] = {
          price: price.price,
          site_rate_change: `${price.rateChange} (${price.rateChangePercent}%)`
        };
        return acc;
      }, {} as Record<string, { price: number; site_rate_change: string }>)
    };

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error fetching MCX Aluminium data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 