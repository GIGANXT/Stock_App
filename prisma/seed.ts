import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const testData = {
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString(),
    timestamp: new Date().toISOString(),
    prices: {
      "JAN 2024": {
        price: "215.5",
        site_rate_change: "2.5%"
      },
      "FEB 2024": {
        price: "216.8",
        site_rate_change: "1.2%"
      },
      "MAR 2024": {
        price: "217.2",
        site_rate_change: "0.8%"
      }
    }
  };

  await prisma.mCXAluminium.create({
    data: testData
  });

  console.log('Test data seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 