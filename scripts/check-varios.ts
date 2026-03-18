import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check items with tipoAlimento = "VARIOS"
  console.log('=== Items with tipoAlimento = "VARIOS" ===');
  
  const variosItems = await prisma.mexicanFood.findMany({
    where: { tipoAlimento: 'VARIOS' },
    select: {
      id: true,
      nombreEspanol: true,
      tipoAlimento: true,
      hierarchyStatus: true,
      isParent: true,
      parentIngredientId: true
    }
  });
  
  console.log(`Total VARIOS items: ${variosItems.length}`);
  
  // Check hierarchyStatus distribution
  const statusCounts = new Map<string, number>();
  variosItems.forEach(item => {
    const status = item.hierarchyStatus || 'null';
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
  });
  
  console.log('\nHierarchy Status distribution:');
  statusCounts.forEach((count, status) => {
    console.log(`  ${status}: ${count}`);
  });
  
  // Show sample items
  console.log('\nSample VARIOS items (first 20):');
  variosItems.slice(0, 20).forEach(item => {
    console.log(`  - ${item.nombreEspanol} | status: ${item.hierarchyStatus} | isParent: ${item.isParent}`);
  });
  
  // Check what "prepared" status options exist
  console.log('\n=== All hierarchyStatus values in database ===');
  const allStatus = await prisma.mexicanFood.groupBy({
    by: ['hierarchyStatus'],
    _count: true
  });
  allStatus.forEach(s => {
    console.log(`  ${s.hierarchyStatus || 'null'}: ${s._count}`);
  });
  
  // Check tipoAlimento distribution
  console.log('\n=== tipoAlimento distribution ===');
  const tipoCounts = await prisma.mexicanFood.groupBy({
    by: ['tipoAlimento'],
    _count: true,
    orderBy: { _count: { tipoAlimento: 'desc' } }
  });
  tipoCounts.forEach(s => {
    console.log(`  ${s.tipoAlimento || 'null'}: ${s._count}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
