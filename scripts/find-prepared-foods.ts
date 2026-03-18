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
  
  console.log(`Total pending items: ${pendingItems.length}\n`);
  
  // Patterns that indicate prepared/processed foods (not raw ingredients or simple varieties)
  const preparedPatterns = [
    /sabor\s+\w+/i,                    // "sabor naranja", "sabor fresa" (flavored with...)
    /para\s+preparar/i,                // "para preparar" (to prepare)
    /mezcla\s+deshidratada/i,          // dehydrated mix
    /bebida\s+de\s+fruta/i,            // fruit drink
    /bebida\s+isotónica/i,             // isotonic drink
    /pastilla/i,                       // pill/candy
    /galleta.*sabor/i,                 // cookie with flavor
    /polvorón/i,                       // polvorón (cookie)
    /cobertura/i,                      // coating/covering
    /antioxidantes/i,                  // antioxidants (processed)
    /suplemento/i,                     // supplement
    /fórmula/i,                        // formula
    /concentrado\s+/i,                 // concentrate (not as variety name)
    /jarabe\s+/i,                      // syrup (not as variety name)
  ];
  
  const itemsToMove: typeof pendingItems = [];
  
  pendingItems.forEach(item => {
    const name = item.nombreEspanol;
    for (const pattern of preparedPatterns) {
      if (pattern.test(name)) {
        itemsToMove.push(item);
        break;
      }
    }
  });
  
  console.log(`=== ITEMS TO MOVE TO PREPARED (${itemsToMove.length}) ===\n`);
  
  // Group by tipoAlimento
  const byTipo = new Map<string, typeof itemsToMove>();
  itemsToMove.forEach(item => {
    const tipo = item.tipoAlimento || 'null';
    if (!byTipo.has(tipo)) byTipo.set(tipo, []);
    byTipo.get(tipo)!.push(item);
  });
  
  byTipo.forEach((items, tipo) => {
    console.log(`\n${tipo} (${items.length} items):`);
    items.slice(0, 10).forEach(item => {
      console.log(`  - ${item.nombreEspanol}`);
    });
    if (items.length > 10) {
      console.log(`  ... and ${items.length - 10} more`);
    }
  });
  
  // Return IDs for update
  console.log(`\n\nTotal items to move: ${itemsToMove.length}`);
  return itemsToMove.map(i => i.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
