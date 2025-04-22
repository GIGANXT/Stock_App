const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed process...');

  // Add sample metal price data
  const aluminum = await prisma.metalPrice.create({
    data: {
      metal: 'aluminum',
      spotPrice: 2650.75,
      change: 15.25,
      changePercent: 0.58,
      lastUpdated: new Date()
    }
  });

  console.log('Created sample aluminum price:', aluminum);

  console.log('Seeding completed successfully.');
}

main()
  .catch(e => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 