import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check items marked as parents
  const parentsWithChildren = await prisma.mexicanFood.findMany({
    where: { isParent: true },
    select: {
      id: true,
      nombreEspanol: true,
      childCount: true,
      _count: { select: { children: true } }
    }
  });
  
  console.log(`=== ITEMS MARKED AS PARENTS: ${parentsWithChildren.length} ===\n`);
  
  const noChildren = parentsWithChildren.filter(p => p._count.children === 0);
  const withChildren = parentsWithChildren.filter(p => p._count.children > 0);
  
  console.log(`Parents WITH children: ${withChildren.length}`);
  console.log(`Parents WITHOUT children: ${noChildren.length}\n`);
  
  if (noChildren.length > 0) {
    console.log(`=== PARENTS WITHOUT CHILDREN ===`);
    noChildren.slice(0, 20).forEach(p => {
      console.log(`  - ${p.nombreEspanol} (childCount: ${p.childCount}, actual: ${p._count.children})`);
    });
    if (noChildren.length > 20) console.log(`  ... and ${noChildren.length - 20} more`);
  }
  
  // Check single-word items that could be parents
  const singleWordItems = await prisma.mexicanFood.findMany({
    where: { 
      hierarchyStatus: 'pending',
      isParent: false,
      parentIngredientId: null
    },
    select: { id: true, nombreEspanol: true }
  });
  
  const singleWords = singleWordItems.filter(item => {
    const words = item.nombreEspanol.trim().split(/\s+/);
    return words.length === 1;
  });
  
  console.log(`\n=== SINGLE-WORD ITEMS (potential parents): ${singleWords.length} ===\n`);
  singleWords.slice(0, 30).forEach(item => {
    console.log(`  - ${item.nombreEspanol}`);
  });
  if (singleWords.length > 30) console.log(`  ... and ${singleWords.length - 30} more`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
