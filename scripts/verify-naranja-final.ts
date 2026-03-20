import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const allItems = await prisma.mexicanFood.findMany({
    select: { nombreEspanol: true, tipoAlimento: true, hierarchyStatus: true }
  });
  
  const naranjaItems = allItems.filter(item => 
    item.nombreEspanol.toLowerCase().includes('naranja')
  );
  
  console.log(`=== NARANJA ITEMS FINAL (${naranjaItems.length}) ===\n`);
  
  const pending = naranjaItems.filter(i => i.hierarchyStatus === 'pending');
  const prepared = naranjaItems.filter(i => i.hierarchyStatus === 'prepared');
  
  console.log(`PENDING (children/candidates): ${pending.length}`);
  pending.forEach(item => {
    console.log(`  ✓ ${item.nombreEspanol} (${item.tipoAlimento})`);
  });
  
  console.log(`\nPREPARED (multi-ingredient/commercial): ${prepared.length}`);
  prepared.forEach(item => {
    console.log(`  🍳 ${item.nombreEspanol} (${item.tipoAlimento})`);
  });
  
  console.log(`\n\n=== FINAL DATABASE STATS ===`);
  const total = await prisma.mexicanFood.count();
  const statusCounts = await prisma.mexicanFood.groupBy({
    by: ['hierarchyStatus'],
    _count: true
  });
  console.log(`Total items: ${total}`);
  statusCounts.forEach(s => {
    console.log(`  ${s.hierarchyStatus}: ${s._count}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
