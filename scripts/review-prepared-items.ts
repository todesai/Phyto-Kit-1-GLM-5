import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get all prepared items
  const preparedItems = await prisma.mexicanFood.findMany({
    where: { hierarchyStatus: 'prepared' },
    select: { id: true, nombreEspanol: true, tipoAlimento: true }
  });
  
  console.log(`Total prepared items: ${preparedItems.length}\n`);
  
  // Patterns that should be CHILDREN (single ingredient processed)
  // These are items that can still have the parent's scientific name
  const childPatterns = [
    /^jugo\s+de\s+\w+$/i,           // "Jugo de naranja" = just juice of single ingredient
    /^jugo\s+\w+-\w+$/i,            // "Jugo Papaya-Naranja" = juice of 2 fruits
    /^concentrado\s+de\s+\w+$/i,    // "Concentrado de..."
    /^jarabe\s+de\s+\w+$/i,         // "Jarabe de..."
    /^aceite\s+de\s+\w+$/i,         // "Aceite de naranja" = oil from single ingredient
    /^harina\s+de\s+\w+$/i,         // "Harina de..."
    /^fécula\s+de\s+\w+$/i,         // "Fécula de..."
    /^almidón\s+de\s+\w+$/i,        // "Almidón de..."
    /^mermelada\s+\w+$/i,           // "Mermelada Naranja" = marmalade of single fruit
    /^jalea\s+\w+$/i,               // "Jalea Naranja" = jelly of single fruit
  ];
  
  // Patterns that SHOULD be PREPARED (truly multi-ingredient or commercial)
  const stayPreparedPatterns = [
    /antojitos/i,                   // Ready-to-eat dishes
    /sabor\s+\w+/i,                 // Flavored with something (commercial)
    /para\s+preparar/i,             // Mix to prepare
    /mezcla\s+deshidratada/i,       // Dehydrated mix
    /bebida\s+isotónica/i,          // Sports drink (commercial)
    /bebida\s+nutricional/i,        // Nutritional drink (commercial)
    /pastilla/i,                    // Pill/candy
    /galleta/i,                     // Cookie
    /cobertura/i,                   // Coating
    /polvorón/i,                    // Cookie type
    /helado/i,                      // Ice cream
    /flan/i,                        // Flan
    /surimi/i,                      // Surimi (processed fish product)
  ];
  
  const itemsToRevert: typeof preparedItems = [];
  const itemsToStay: typeof preparedItems = [];
  
  preparedItems.forEach(item => {
    const name = item.nombreEspanol;
    
    // Check if it matches child patterns first
    let isChild = false;
    for (const pattern of childPatterns) {
      if (pattern.test(name)) {
        isChild = true;
        break;
      }
    }
    
    // But also check if it matches stay prepared patterns
    let shouldStayPrepared = false;
    for (const pattern of stayPreparedPatterns) {
      if (pattern.test(name)) {
        shouldStayPrepared = true;
        break;
      }
    }
    
    // If it matches stay prepared, it stays (even if it also matches child)
    if (shouldStayPrepared) {
      itemsToStay.push(item);
    } else if (isChild) {
      itemsToRevert.push(item);
    } else {
      // Default: keep in prepared if moved from VARIOS or matched phase 2
      itemsToStay.push(item);
    }
  });
  
  console.log(`=== ITEMS TO REVERT TO PENDING (should be children) ===`);
  console.log(`Count: ${itemsToRevert.length}\n`);
  itemsToRevert.forEach(item => {
    console.log(`  "${item.nombreEspanol}" (${item.tipoAlimento})`);
  });
  
  console.log(`\n=== ITEMS TO STAY IN PREPARED ===`);
  console.log(`Count: ${itemsToStay.length}\n`);
  
  return itemsToRevert.map(i => i.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
