import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get all core ingredients AND descriptors that are ingredient names
  const allWords = await prisma.wordClassification.findMany({
    select: { word: true, wordLower: true, category: true, frequency: true }
  });
  
  // Words that are NOT standalone ingredients (processing, colors, forms, connectors)
  const notIngredients = new Set([
    // Processing
    'crudo', 'cocido', 'fresco', 'seco', 'deshidratado', 'asado', 'frito', 'hervido', 
    'horneado', 'pelado', 'molida', 'molido', 'entera', 'entero', 'natural', 'artificial',
    'fermentado', 'fermentada', 'salado', 'dulce', 'amargo', 'picante', 'integral',
    'refrito', 'germinado', 'tostado', 'congelado', 'desgrasada', 'descremada', 
    'instantánea', 'pulido', 'rebanado', 'proteinada', 'ultrapasteurizada', 'ahumada',
    // Colors
    'blanco', 'negro', 'rojo', 'verde', 'amarillo', 'naranja', 'morado', 'azul', 
    'rosa', 'amarilla', 'blanca', 'colorada', 'morada', 'obscura', 'clara',
    // Forms (but some of these ARE ingredients when standalone)
    'polvo', 'pure', 'puré', 'extracto', 'esencia', 'jarabe', 'jugo', 'concentrado',
    // Descriptors
    'tipo', 'forma', 'estilo', 'casera', 'industrial', 'comercial', 'ligera', 'light',
    // Parts
    'cáscara', 'semilla', 'pulp', 'pulpa', 'hoja', 'tallo', 'raiz', 'flor',
    // Connectors
    'con', 'sin', 'y', 'de', 'en', 'para', 'por'
  ]);
  
  // Build ingredient set from core + high frequency descriptors that are ingredient-like
  const ingredientSet = new Set<string>();
  
  allWords.forEach(w => {
    if (w.category === 'core') {
      ingredientSet.add(w.wordLower);
    } else if (w.category === 'descriptor' && !notIngredients.has(w.wordLower)) {
      // Add descriptors that are likely ingredient names (high frequency, noun-like)
      if (w.frequency >= 5) {
        ingredientSet.add(w.wordLower);
      }
    }
  });
  
  // Add known ingredient words that might be missing
  const additionalIngredients = [
    'uva', 'zarzamora', 'arándano', 'grosella', 'capulín', 'tejocote', 'guanábana',
    'mamey', 'zapote', 'ciruela', 'tuna', 'nopal', 'quelite', 'huauzontle',
    'amaranto', 'chia', 'chía', 'quinua', 'arroz', 'avena', 'cebada', 'centeno',
    'papa', 'camote', 'yuca', 'jícama', 'camote',
    'epazote', 'cilantro', 'perejil', 'hierbabuena', 'menta', 'orégano',
    'torta', 'gordita', 'quesadilla', 'tamal', 'tamalito', 'atole', 'champurrado'
  ];
  
  additionalIngredients.forEach(w => ingredientSet.add(w.toLowerCase()));
  
  console.log(`Ingredient words in set: ${ingredientSet.size}`);
  
  // Get pending items
  const pendingItems = await prisma.mexicanFood.findMany({
    where: { hierarchyStatus: 'pending' },
    select: { id: true, nombreEspanol: true, tipoAlimento: true }
  });
  
  console.log(`Pending items: ${pendingItems.length}\n`);
  
  // Find multi-ingredient items
  const multiIngredientItems: { id: string; nombreEspanol: string; ingredients: string[] }[] = [];
  
  pendingItems.forEach(item => {
    const name = item.nombreEspanol;
    const nameLower = name.toLowerCase();
    
    const foundIngredients: string[] = [];
    
    // Extract all words from the name
    const words = nameLower
      .replace(/[,.\-()]/g, ' ')
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length > 1);
    
    // Check each word and word combinations
    words.forEach(w => {
      if (ingredientSet.has(w) && !foundIngredients.includes(w)) {
        foundIngredients.push(w);
      }
    });
    
    // Also check hyphenated parts
    const hyphenParts = nameLower.match(/(\w+)-(\w+)/g);
    if (hyphenParts) {
      hyphenParts.forEach(h => {
        const parts = h.split('-');
        parts.forEach(p => {
          if (ingredientSet.has(p) && !foundIngredients.includes(p)) {
            foundIngredients.push(p);
          }
        });
      });
    }
    
    // Check for comma-separated ingredient lists (like "Zanahoria, Naranja, Papaya")
    if (nameLower.includes(',')) {
      const commaParts = nameLower.split(',');
      commaParts.forEach(part => {
        const cleanPart = part.trim().split(/\s+/)[0]; // First word after comma
        if (ingredientSet.has(cleanPart) && !foundIngredients.includes(cleanPart)) {
          foundIngredients.push(cleanPart);
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
  
  // Show all items
  multiIngredientItems.forEach(item => {
    console.log(`  - ${item.nombreEspanol}`);
    console.log(`    Ingredients: ${item.ingredients.join(', ')}`);
  });
  
  return multiIngredientItems.map(i => i.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
