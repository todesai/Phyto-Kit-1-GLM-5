import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // First, count current stats
  console.log('=== BEFORE MOVING VARIOS ===');
  const beforeTotal = await prisma.mexicanFood.count();
  const beforeStatus = await prisma.mexicanFood.groupBy({
    by: ['hierarchyStatus'],
    _count: true
  });
  console.log(`Total items: ${beforeTotal}`);
  beforeStatus.forEach(s => {
    console.log(`  ${s.hierarchyStatus || 'null'}: ${s._count}`);
  });
  
  // Move VARIOS items to prepared
  console.log('\n=== MOVING VARIOS ITEMS TO PREPARED ===');
  const result = await prisma.mexicanFood.updateMany({
    where: { tipoAlimento: 'VARIOS' },
    data: { 
      hierarchyStatus: 'prepared',
      isParent: false
    }
  });
  console.log(`Updated ${result.count} items`);
  
  // Show new stats
  console.log('\n=== AFTER MOVING VARIOS ===');
  const afterTotal = await prisma.mexicanFood.count();
  const afterStatus = await prisma.mexicanFood.groupBy({
    by: ['hierarchyStatus'],
    _count: true
  });
  console.log(`Total items: ${afterTotal}`);
  afterStatus.forEach(s => {
    console.log(`  ${s.hierarchyStatus || 'null'}: ${s._count}`);
  });
  
  // Show sample of prepared items
  console.log('\n=== Sample Prepared items ===');
  const prepared = await prisma.mexicanFood.findMany({
    where: { hierarchyStatus: 'prepared' },
    select: { nombreEspanol: true },
    take: 15
  });
  prepared.forEach(p => console.log(`  - ${p.nombreEspanol}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
