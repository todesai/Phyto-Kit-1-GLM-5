import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get all core ingredients (most likely to have scientific names)
  const coreWords = await prisma.wordClassification.findMany({
    where: { category: 'core' },
    select: { word: true, wordLower: true }
  });
  
  const coreSet = new Set(coreWords.map(w => w.wordLower));
  console.log(`Core ingredients: ${coreSet.size}`);
  
  // Also add descriptor words that are clearly ingredient names
  const ingredientDescriptors = [
    'chocolate', 'vainilla', 'fresa', 'mango', 'piña', 'naranja', 'limón', 'uva', 
    'zarzamora', 'guayaba', 'papaya', 'mamey', 'tamarindo', 'maracuyá', 'ciruela',
    'durazno', 'manzana', 'pera', 'melón', 'sandía', 'toronja', 'mandarina',
    'café', 'cacao', 'canela', 'almendra', 'nuez', 'cacahuate', 'ajonjolí',
    'frijol', 'lenteja', 'garbanzo', 'haba', 'soya', 'soja',
    'pollo', 'res', 'cerdo', 'pescado', 'camarón', 'atún', 'sardina',
    'queso', 'leche', 'crema', 'yogurt', 'miel', 'huevo'
  ];
  
  ingredientDescriptors.forEach(w => coreSet.add(w.toLowerCase()));
  
  // Get pending items
  const pendingItems = await prisma.mexicanFood.findMany({
    where: { hierarchyStatus: 'pending' },
    select: { id: true, nombreEspanol: true, tipoAlimento: true }
  });
  
  console.log(`Pending items: ${pendingItems.length}\n`);
  
  // Find truly multi-ingredient items
  const multiIngredientItems: { id: string; nombreEspanol: string; ingredients: string[] }[] = [];
  
  pendingItems.forEach(item => {
    const name = item.nombreEspanol;
    const nameLower = name.toLowerCase();
    
    // Skip if already in prepared patterns (sabor, para preparar, etc.)
    if (/sabor\s+\w+|para\s+preparar|mezcla\s+deshidratada|bebida\s+isotónica|pastilla/i.test(name)) {
      return;
    }
    
    const foundIngredients: string[] = [];
    
    // Pattern 1: Hyphenated ingredients (uva-zarzamora, fresa-chocolate)
    const hyphenMatch = nameLower.match(/(\w+)-(\w+)/g);
    if (hyphenMatch) {
      hyphenMatch.forEach(h => {
        const parts = h.split('-');
        parts.forEach(p => {
          if (coreSet.has(p) && !foundIngredients.includes(p)) {
            foundIngredients.push(p);
          }
        });
      });
    }
    
    // Pattern 2: "X y Y" (ingredient Y ingredient)
    const yMatches = nameLower.match(/(\w+)\s+y\s+(\w+)/g);
    if (yMatches) {
      yMatches.forEach(m => {
        const parts = m.split(/\s+y\s+/);
        parts.forEach(p => {
          if (coreSet.has(p) && !foundIngredients.includes(p)) {
            foundIngredients.push(p);
          }
        });
      });
    }
    
    // Pattern 3: "X con Y" where both are ingredients
    const conMatches = nameLower.match(/(\w+)\s+con\s+(\w+)/g);
    if (conMatches) {
      conMatches.forEach(m => {
        const parts = m.split(/\s+con\s+/);
        parts.forEach(p => {
          if (coreSet.has(p) && !foundIngredients.includes(p)) {
            foundIngredients.push(p);
          }
        });
      });
    }
    
    // Pattern 4: "X de Y" where Y is a different ingredient (not a form)
    const deMatches = nameLower.match(/jugo\s+de\s+(\w+)|néctar\s+de\s+(\w+)|bebida\s+de\s+(\w+)/g);
    if (deMatches) {
      deMatches.forEach(m => {
        const parts = m.split(/\s+de\s+/);
        if (parts.length > 1) {
          parts.slice(1).forEach(p => {
            // Check if it's a hyphenated or comma-separated list
            const subParts = p.split(/[-,]/);
            subParts.forEach(sp => {
              const clean = sp.trim().replace(/[,\.\-\(\)]/g, '');
              if (coreSet.has(clean) && !foundIngredients.includes(clean)) {
                foundIngredients.push(clean);
              }
            });
          });
        }
      });
    }
    
    // If 2+ unique ingredients found, it's multi-ingredient
    if (foundIngredients.length >= 2) {
      multiIngredientItems.push({
        id: item.id,
        nombreEspanol: name,
        ingredients: foundIngredients
      });
    }
  });
  
  console.log(`=== MULTI-INGREDIENT ITEMS TO MOVE: ${multiIngredientItems.length} ===\n`);
  
  // Group by number of ingredients
  const byCount = new Map<number, typeof multiIngredientItems>();
  multiIngredientItems.forEach(item => {
    const count = item.ingredients.length;
    if (!byCount.has(count)) byCount.set(count, []);
    byCount.get(count)!.push(item);
  });
  
  byCount.forEach((items, count) => {
    console.log(`\n${count} INGREDIENTS (${items.length} items):`);
    items.slice(0, 15).forEach(i => {
      console.log(`  - ${i.nombreEspanol}`);
      console.log(`    Ingredients: ${i.ingredients.join(', ')}`);
    });
    if (items.length > 15) console.log(`  ... and ${items.length - 15} more`);
  });
  
  return multiIngredientItems.map(i => i.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
