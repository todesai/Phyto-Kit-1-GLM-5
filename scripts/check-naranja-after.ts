import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const allItems = await prisma.mexicanFood.findMany({
    select: {
      id: true,
      nombreEspanol: true,
      tipoAlimento: true,
      hierarchyStatus: true
    }
  });
  
  const naranjaItems = allItems.filter(item => 
    item.nombreEspanol.toLowerCase().includes('naranja')
  );
  
  console.log(`=== NARANJA ITEMS (${naranjaItems.length}) ===\n`);
  
  const pending = naranjaItems.filter(i => i.hierarchyStatus === 'pending');
  const prepared = naranjaItems.filter(i => i.hierarchyStatus === 'prepared');
  
  console.log(`PENDING (actual naranja varieties/children): ${pending.length}`);
  pending.forEach(item => {
    console.log(`  ✓ ${item.nombreEspanol} (${item.tipoAlimento})`);
  });
  
  console.log(`\nPREPARED (flavored/processed products): ${prepared.length}`);
  prepared.forEach(item => {
    console.log(`  🍳 ${item.nombreEspanol} (${item.tipoAlimento})`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
