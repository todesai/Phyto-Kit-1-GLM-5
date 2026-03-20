import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const preparedItems = await prisma.mexicanFood.findMany({
    where: { hierarchyStatus: 'prepared' },
    select: { id: true, nombreEspanol: true, tipoAlimento: true }
  });
  
  // Items that should be CHILDREN - single ingredient processed forms
  // These can still have the parent's scientific name assigned
  const shouldRevert: typeof preparedItems = [];
  
  preparedItems.forEach(item => {
    const name = item.nombreEspanol;
    
    // Check for simple processed forms of single ingredients
    // Pattern: [Ingredient] [Process] or [Process] de [Ingredient]
    
    // "Aceite de X" - oil from single ingredient = child
    if (/^aceite\s+de\s+\w+$/i.test(name) && !/sabor/i.test(name)) {
      shouldRevert.push(item);
      return;
    }
    
    // "Jugo X-Y" - juice of fruits = child
    if (/^jugo\s+\w+-\w+$/i.test(name)) {
      shouldRevert.push(item);
      return;
    }
    
    // "Concentrado X" or "X Concentrado" where X is single ingredient = child
    // But "Concentrado Para Preparar" = prepared
    if ((/concentrado/i.test(name) && !/para\s+preparar/i.test(name) && !/sabor/i.test(name))) {
      // Check if it's a simple form
      const words = name.split(/\s+/);
      if (words.length <= 4 && !/mezcla/i.test(name)) {
        shouldRevert.push(item);
        return;
      }
    }
    
    // "Jarabe X" where X is single ingredient = child
    // But "Jarabe Para" or "Jarabe Con" multiple = prepared
    if (/jarabe/i.test(name) && !/para\s+/i.test(name) && !/con\s+\w+/i.test(name)) {
      // This might be borderline - let's check
      if (!/sabor/i.test(name)) {
        // Actually jarabe usually has sugar added, could be borderline
        // For now, keep in prepared or let user review
      }
    }
  });
  
  console.log(`=== ITEMS TO REVERT TO PENDING (should be children) ===`);
  console.log(`Total prepared: ${preparedItems.length}`);
  console.log(`Items to revert: ${shouldRevert.length}\n`);
  
  shouldRevert.forEach(item => {
    console.log(`  "${item.nombreEspanol}" (${item.tipoAlimento})`);
  });
  
  // Also show items that contain "Jugo" or "Aceite" for review
  console.log(`\n=== ITEMS WITH "Jugo" or "Aceite" FOR REVIEW ===`);
  preparedItems.filter(item => 
    /jugo|aceite/i.test(item.nombreEspanol)
  ).forEach(item => {
    console.log(`  "${item.nombreEspanol}" (${item.tipoAlimento})`);
  });
  
  return shouldRevert.map(i => i.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
