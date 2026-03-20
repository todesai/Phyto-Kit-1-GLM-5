import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get all pending items
  const pendingItems = await prisma.mexicanFood.findMany({
    where: { hierarchyStatus: 'pending' },
    select: {
      id: true,
      nombreEspanol: true,
      tipoAlimento: true
    }
  });
  
  // Patterns that indicate prepared/processed foods
  const preparedPatterns = [
    /sabor\s+\w+/i,
    /para\s+preparar/i,
    /mezcla\s+deshidratada/i,
    /bebida\s+de\s+fruta/i,
    /bebida\s+isotónica/i,
    /pastilla/i,
    /galleta.*sabor/i,
    /polvorón/i,
    /cobertura/i,
    /antioxidantes/i,
    /suplemento/i,
    /fórmula/i,
    /concentrado\s+/i,
    /jarabe\s+/i,
  ];
  
  const idsToMove: string[] = [];
  
  pendingItems.forEach(item => {
    const name = item.nombreEspanol;
    for (const pattern of preparedPatterns) {
      if (pattern.test(name)) {
        idsToMove.push(item.id);
        break;
      }
    }
  });
  
  console.log(`Moving ${idsToMove.length} items to prepared status...\n`);
  
  // Update items
  const result = await prisma.mexicanFood.updateMany({
    where: { id: { in: idsToMove } },
    data: { hierarchyStatus: 'prepared' }
  });
  
  console.log(`Updated ${result.count} items to prepared status.`);
  
  // Show updated stats
  console.log(`\n=== UPDATED STATUS DISTRIBUTION ===`);
  const statusCounts = await prisma.mexicanFood.groupBy({
    by: ['hierarchyStatus'],
    _count: true
  });
  statusCounts.forEach(s => {
    console.log(`  ${s.hierarchyStatus}: ${s._count}`);
  });
  
  // Show sample of what was moved
  console.log(`\n=== SAMPLE OF MOVED ITEMS ===`);
  const movedItems = await prisma.mexicanFood.findMany({
    where: { id: { in: idsToMove.slice(0, 20) } },
    select: { nombreEspanol: true, tipoAlimento: true }
  });
  movedItems.forEach(item => {
    console.log(`  - ${item.nombreEspanol} (${item.tipoAlimento})`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
