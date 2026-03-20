import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check for items containing "naranja" (case insensitive using lowercase)
  console.log(`=== ITEMS CONTAINING "naranja" ===`);
  const allItems = await prisma.mexicanFood.findMany({
    select: {
      id: true,
      nombreEspanol: true,
      tipoAlimento: true,
      hierarchyStatus: true,
      isParent: true,
      parentIngredientId: true
    }
  });
  
  const naranjaItems = allItems.filter(item => 
    item.nombreEspanol.toLowerCase().includes('naranja')
  );
  
  console.log(`Found ${naranjaItems.length} items with "naranja":\n`);
  naranjaItems.forEach(item => {
    console.log(`  "${item.nombreEspanol}"`);
    console.log(`    tipo: ${item.tipoAlimento}`);
    console.log(`    status: ${item.hierarchyStatus}`);
    console.log(`    isParent: ${item.isParent}`);
    console.log(`    parentId: ${item.parentIngredientId || 'none'}`);
    console.log('');
  });
  
  // Check prepared items to see what's there
  console.log(`\n=== PREPARED (VARIOS) ITEMS ===`);
  const preparedItems = await prisma.mexicanFood.findMany({
    where: { hierarchyStatus: 'prepared' },
    select: { nombreEspanol: true, tipoAlimento: true },
    take: 30
  });
  console.log(`Total prepared: ${await prisma.mexicanFood.count({ where: { hierarchyStatus: 'prepared' } })}`);
  preparedItems.forEach(p => console.log(`  ${p.nombreEspanol} | ${p.tipoAlimento}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
