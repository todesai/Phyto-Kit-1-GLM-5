import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Items that are clearly CHILDREN (single ingredient processed)
  const toRevert = [
    "Aceite de naranja",           // Orange oil - processed from single ingredient
    "Jugo Papaya-Naranja",         // Juice of fruits - can have scientific names
    "Aceite Oliva, Extra Virgen",  // Olive oil - processed from single ingredient
    "Aloe Vera Jugo",              // Aloe vera juice - processed from single ingredient
    "Coco De Aceite",              // Coconut oil - processed from single ingredient
  ];
  
  console.log(`=== REVERTING TO PENDING (these are CHILDREN) ===\n`);
  
  for (const name of toRevert) {
    const item = await prisma.mexicanFood.findFirst({
      where: { nombreEspanol: name, hierarchyStatus: 'prepared' }
    });
    
    if (item) {
      console.log(`  ✓ "${item.nombreEspanol}" (${item.tipoAlimento})`);
      await prisma.mexicanFood.update({
        where: { id: item.id },
        data: { hierarchyStatus: 'pending' }
      });
    } else {
      console.log(`  ✗ Not found: "${name}"`);
    }
  }
  
  // Show final stats
  console.log(`\n=== FINAL STATUS ===`);
  const statusCounts = await prisma.mexicanFood.groupBy({
    by: ['hierarchyStatus'],
    _count: true
  });
  statusCounts.forEach(s => {
    console.log(`  ${s.hierarchyStatus}: ${s._count}`);
  });
  
  // Show borderline items that stay in prepared but might need review
  console.log(`\n=== BORDERLINE ITEMS IN PREPARED (for reference) ===`);
  const borderline = [
    "Girasol Concentrado Proteico",     // Protein concentrate - highly processed
    "Pescado Concentrado De Proteína",  // Protein concentrate - highly processed
    "Toronja Jarabe Con Jugo",          // Has added sugar (jarabe)
    "Tamarindo Jarabe Con Pulpa",       // Has added sugar (jarabe)
    "Tamarindo Concentrado, Para Preparar Bebidas", // Mix to prepare
  ];
  
  borderline.forEach(name => {
    console.log(`  - ${name}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
