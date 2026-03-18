import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Core ingredients that can have their own scientific name
  const coreIngredients = new Set([
    // Fruits
    'uva', 'zarzamora', 'fresa', 'mango', 'piña', 'naranja', 'limón', 'toronja', 
    'mandarina', 'durazno', 'manzana', 'pera', 'guayaba', 'papaya', 'mamey', 
    'tamarindo', 'maracuyá', 'ciruela', 'melón', 'sandía', 'ciruela', 'capulín',
    'tejocote', 'guanábana', 'zapote', 'chicozapote', 'plátano', 'platano',
    // Vegetables
    'zanahoria', 'papa', 'camote', 'jícama', 'nopal', 'tuna', 'chile', 'jitomate',
    'tomate', 'cebolla', 'ajo', 'calabaza', 'chayote', 'epazote', 'cilantro',
    // Proteins
    'pollo', 'res', 'cerdo', 'pescado', 'camarón', 'atún', 'sardina', 'carne',
    'huevo', 'queso', 'leche',
    // Grains/Legumes
    'arroz', 'frijol', 'lenteja', 'garbanzo', 'haba', 'soya', 'trigo', 'maíz', 'maiz',
    'amaranto', 'avena', 'cebada', 'centeno', 'sorgo',
    // Nuts/Seeds
    'nuez', 'almendra', 'cacahuate', 'ajonjolí', 'pepita', 'almendra',
    // Other core
    'chocolate', 'cacao', 'café', 'miel', 'canela', 'vainilla', 'coco',
    'yogurt', 'crema'
  ]);
  
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
    
    const foundIngredients: string[] = [];
    
    // Pattern 1: Hyphenated fruits/ingredients (uva-zarzamora, fresa-chocolate)
    const hyphenMatch = nameLower.match(/(\w+)-(\w+)/g);
    if (hyphenMatch) {
      hyphenMatch.forEach(h => {
        const parts = h.split('-');
        parts.forEach(p => {
          if (coreIngredients.has(p) && !foundIngredients.includes(p)) {
            foundIngredients.push(p);
          }
        });
      });
    }
    
    // Pattern 2: "X y Y" where both are core ingredients (not just descriptors)
    // Match patterns like "piña y coco", "fresa y chocolate"
    const yPattern = /(\w+)\s+y\s+(\w+)/gi;
    let match;
    while ((match = yPattern.exec(nameLower)) !== null) {
      const word1 = match[1];
      const word2 = match[2];
      if (coreIngredients.has(word1) && !foundIngredients.includes(word1)) {
        foundIngredients.push(word1);
      }
      if (coreIngredients.has(word2) && !foundIngredients.includes(word2)) {
        foundIngredients.push(word2);
      }
    }
    
    // Pattern 3: Comma-separated ingredient lists like "Zanahoria, Naranja, Papaya"
    // Check if there are multiple core ingredients separated by commas
    if (nameLower.includes(',')) {
      const parts = nameLower.split(',');
      parts.forEach(part => {
        const words = part.trim().split(/\s+/);
        words.forEach(w => {
          if (coreIngredients.has(w) && !foundIngredients.includes(w)) {
            foundIngredients.push(w);
          }
        });
      });
    }
    
    // Only consider it multi-ingredient if 2+ DISTINCT core ingredients
    if (foundIngredients.length >= 2) {
      // Exclude items where the "ingredients" are actually varieties/parts
      // e.g., "Plátano Enano" is a variety, not banana + dwarf
      const excludePatterns = [
        /gallina/i,  // "Huevo Gallina" = chicken egg, not egg + chicken
        /vaca/i,     // "Leche De Vaca" = cow milk, not milk + cow
        /cabra/i,    // "Leche De Cabra" = goat milk
        /enano/i,    // Variety descriptor
        /gigante/i,  // Variety descriptor
        /dominico/i, // Variety descriptor
        /macho/i,    // Variety descriptor (plátano macho)
        /criollo/i,  // Variety descriptor
        /blanco/i,   // Often color variety
        /negro/i,    // Often color variety
        /rojo/i,     // Often color variety
        /verde/i,    // Often color variety
        /amarillo/i, // Often color variety
        /bayo/i,     // Bean variety
        /pinto/i,    // Bean variety
      ];
      
      let shouldExclude = false;
      for (const pattern of excludePatterns) {
        if (pattern.test(name)) {
          shouldExclude = true;
          break;
        }
      }
      
      if (!shouldExclude) {
        multiIngredientItems.push({
          id: item.id,
          nombreEspanol: name,
          ingredients: foundIngredients
        });
      }
    }
  });
  
  console.log(`=== MULTI-INGREDIENT ITEMS TO MOVE: ${multiIngredientItems.length} ===\n`);
  
  // Show all items
  multiIngredientItems.forEach(item => {
    console.log(`  - ${item.nombreEspanol}`);
    console.log(`    Ingredients: ${item.ingredients.join(', ')}`);
  });
  
  return multiIngredientItems.map(i => i.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
