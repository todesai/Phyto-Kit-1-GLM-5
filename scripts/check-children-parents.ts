import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check if there are any children linked to parents
  const childrenWithParents = await prisma.mexicanFood.findMany({
    where: { 
      parentIngredientId: { not: null } 
    },
    select: {
      id: true,
      nombreEspanol: true,
      tipoAlimento: true,
      hierarchyStatus: true,
      parent: {
        select: { nombreEspanol: true }
      }
    },
    take: 50
  });
  
  console.log(`=== CHILDREN LINKED TO PARENTS ===`);
  console.log(`Total children found: ${childrenWithParents.length}`);
  
  if (childrenWithParents.length > 0) {
    childrenWithParents.forEach(child => {
      console.log(`  "${child.nombreEspanol}" -> parent: "${child.parent?.nombreEspanol}" | tipo: ${child.tipoAlimento} | status: ${child.hierarchyStatus}`);
    });
  } else {
    console.log(`No children linked to parents currently.`);
  }
  
  // Check for items with "naranja" to see the example mentioned
  console.log(`\n=== ITEMS CONTAINING "naranja" ===`);
  const naranjaItems = await prisma.mexicanFood.findMany({
    where: {
      nombreEspanol: { contains: 'naranja', mode: 'insensitive' }
    },
    select: {
      id: true,
      nombreEspanol: true,
      tipoAlimento: true,
      hierarchyStatus: true,
      isParent: true,
      parentIngredientId: true
    }
  });
  
  naranjaItems.forEach(item => {
    console.log(`  "${item.nombreEspanol}" | tipo: ${item.tipoAlimento} | status: ${item.hierarchyStatus} | isParent: ${item.isParent}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
