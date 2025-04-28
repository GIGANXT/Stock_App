const { PrismaClient } = require('@prisma/client');

async function checkDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Checking database connection...');
    
    // Count the number of records
    const count = await prisma.futuresPrice.count();
    console.log(`Total records in FuturesPrice table: ${count}`);
    
    // Get the most recent records
    const recentRecords = await prisma.futuresPrice.findMany({
      take: 5,
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    console.log('Most recent records:');
    console.log(JSON.stringify(recentRecords, null, 2));
    
    // Check if the model exists in the database
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    console.log('Tables in the database:');
    console.log(JSON.stringify(tables, null, 2));
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase(); 