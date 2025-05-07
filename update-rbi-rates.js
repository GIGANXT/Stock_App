const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateRbiRates() {
  try {
    // Add/update May 6 rate
    await prisma.rBI_Rate.upsert({
      where: { date: '2025-05-06' },
      update: { rate: 84.5436 },
      create: { date: '2025-05-06', rate: 84.5436 }
    });
    
    // Add/update May 5 rate
    await prisma.rBI_Rate.upsert({
      where: { date: '2025-05-05' },
      update: { rate: 84.5436 },
      create: { date: '2025-05-05', rate: 84.5436 }
    });
    
    // Add/update May 4 rate
    await prisma.rBI_Rate.upsert({
      where: { date: '2025-05-04' },
      update: { rate: 84.2369 },
      create: { date: '2025-05-04', rate: 84.2369 }
    });
    
    // Add/update May 3 rate
    await prisma.rBI_Rate.upsert({
      where: { date: '2025-05-03' },
      update: { rate: 84.2369 },
      create: { date: '2025-05-03', rate: 84.2369 }
    });
    
    // Add/update May 2 rate
    await prisma.rBI_Rate.upsert({
      where: { date: '2025-05-02' },
      update: { rate: 84.2369 },
      create: { date: '2025-05-02', rate: 84.2369 }
    });
    
    console.log('RBI rates updated successfully');
    
  } catch (error) {
    console.error('Error updating RBI rates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateRbiRates(); 