import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Core ingredients that can have their own scientific name
  const coreIngredients = new Set([
    // Fruits
    'uva', 'zarzamora', 'fresa', 'mango', 'piña', 'naranja', 'limón', 'toronja', 
    'mandarina', 'durazno', 'manzana', 'pera', 'guayaba', 'papaya', 'mamey', 
    'tamarindo', 'maracuyá', 'ciruela', 'melón', 'sandía', 'capulín',
    'tejocote', 'guanábana', 'zapote', 'chicozapote', 'plátano', 'platano',
    // Vegetables
    'zanahoria', 'papa', 'camote', 'jícama', 'nopal', 'tuna', 'chile', 'jitomate',
    'tomate', 'cebolla', 'ajo', 'calabaza', 'chayote', 'elote',
    // Proteins
    'pollo', 'res', 'cerdo', 'pescado', 'camarón', 'atún', 'sardina', 'carne',
    'queso', 'leche',
    // Grains/Legumes
    'arroz', 'frijol', 'lenteja', 'garbanzo', 'haba', 'soya', 'trigo', 'maíz', 'maiz',
    'amaranto', 'avena', 'cebada', 'centeno', 'sorgo',
    // Nuts/Seeds
    'nuez', 'almendra', 'cacahuate', 'ajonjolí', 'pepita',
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
    
    // Skip items with negations like "sin chile" (without chile)
    if (/sin\s+\w+/.test(nameLower)) {
      return;
    }
    
    // Skip items where words might be colors, not ingredients
    // "café" as color (brown), not coffee
    // "blanco", "negro", "rojo" etc. are colors
    const colorWords = ['café', 'blanco', 'negro', 'rojo', 'verde', 'amarillo', 'azul', 'morado', 'naranja'];
    
    const foundIngredients: string[] = [];
    
    // Pattern 1: Hyphenated fruits/ingredients (uva-zarzamora, fresa-chocolate)
    const hyphenMatch = nameLower.match(/(\w+)-(\w+)/g);
    if (hyphenMatch) {
      hyphenMatch.forEach(h => {
        const parts = h.split('-');
        parts.forEach(p => {
          if (coreIngredients.has(p) && !colorWords.includes(p) && !foundIngredients.includes(p)) {
            foundIngredients.push(p);
          }
        });
      });
    }
    
    // Pattern 2: "X y Y" where both are core ingredients
    const yPattern = /(\w+)\s+y\s+(\w+)/gi;
    let match;
    while ((match = yPattern.exec(nameLower)) !== null) {
      const word1 = match[1];
      const word2 = match[2];
      if (coreIngredients.has(word1) && !colorWords.includes(word1) && !foundIngredients.includes(word1)) {
        foundIngredients.push(word1);
      }
      if (coreIngredients.has(word2) && !colorWords.includes(word2) && !foundIngredients.includes(word2)) {
        foundIngredients.push(word2);
      }
    }
    
    // Pattern 3: Comma-separated ingredient lists
    if (nameLower.includes(',')) {
      const parts = nameLower.split(',');
      parts.forEach(part => {
        const words = part.trim().split(/\s+/);
        words.forEach(w => {
          if (coreIngredients.has(w) && !colorWords.includes(w) && !foundIngredients.includes(w)) {
            foundIngredients.push(w);
          }
        });
      });
    }
    
    // Only consider it multi-ingredient if 2+ DISTINCT core ingredients
    if (foundIngredients.length >= 2) {
      // Exclude items where the "ingredients" are actually varieties/parts
      const excludePatterns = [
        /gallina/i, /vaca/i, /cabra/i,  // Animal sources (egg, milk)
        /enano/i, /gigante/i, /dominico/i, /macho/i, /criollo/i,  // Varieties
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
