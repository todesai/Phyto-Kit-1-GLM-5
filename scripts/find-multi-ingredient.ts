import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get all core and descriptor words that could be standalone ingredients
  const potentialIngredients = await prisma.wordClassification.findMany({
    where: {
      OR: [
        { category: 'core' },
        { category: 'descriptor' }
      ]
    },
    select: { word: true, wordLower: true, category: true, frequency: true }
  });
  
  console.log(`Potential ingredients: ${potentialIngredients.length}`);
  
  // Filter to words that are likely ingredient names (not just descriptors like "fresco", "crudo")
  // These are nouns that could have scientific names
  const ingredientWords = potentialIngredients.filter(w => {
    // Exclude processing descriptors that modify ingredients
    const processingWords = ['crudo', 'cocido', 'fresco', 'seco', 'deshidratado', 'asado', 'frito', 'hervido', 'horneado', 'pelado', 'molida', 'molido', 'entera', 'entero', 'natural', 'artificial', 'fermentado', 'fermentada', 'salado', 'dulce', 'amargo', 'picante', 'integral', 'refrito', 'germinado', 'tostado', 'congelado', 'desgrasada', 'descremada', 'instantánea', 'pulido', 'rebanado', 'proteinada'];
    
    // Exclude colors
    const colorWords = ['blanco', 'negro', 'rojo', 'verde', 'amarillo', 'naranja', 'morado', 'azul', 'rosa', 'amarilla', 'blanca', 'colorada', 'morada'];
    
    // Exclude forms
    const formWords = ['polvo', 'harina', 'aceite', 'jarabe', 'jugo', 'concentrado', 'pure', 'puré', 'extracto', 'esencia'];
    
    const lower = w.wordLower;
    
    // Keep if it's core OR if it's a descriptor that's a noun (ingredient-like)
    if (w.category === 'core') return true;
    
    // Exclude processing, colors, forms
    if (processingWords.includes(lower)) return false;
    if (colorWords.includes(lower)) return false;
    // Don't exclude forms - they could be combined with ingredient names
    
    return true;
  });
  
  console.log(`Ingredient-like words: ${ingredientWords.length}`);
  
  // Get pending items
  const pendingItems = await prisma.mexicanFood.findMany({
    where: { hierarchyStatus: 'pending' },
    select: { id: true, nombreEspanol: true, tipoAlimento: true }
  });
  
  console.log(`Pending items: ${pendingItems.length}`);
  
  // Create a set for quick lookup
  const ingredientSet = new Set(ingredientWords.map(w => w.wordLower));
  
  // Find items with multiple distinct ingredients
  const multiIngredientItems: typeof pendingItems = [];
  
  pendingItems.forEach(item => {
    const words = item.nombreEspanol
      .replace(/[,.\-()]/g, ' ')
      .split(/\s+/)
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length > 1);
    
    // Find ingredient words in this item
    const foundIngredients = words.filter(w => ingredientSet.has(w));
    
    // Remove duplicates
    const uniqueIngredients = [...new Set(foundIngredients)];
    
    // If 2+ unique ingredient words, it's multi-ingredient
    if (uniqueIngredients.length >= 2) {
      multiIngredientItems.push(item);
    }
  });
  
  console.log(`\n=== MULTI-INGREDIENT ITEMS: ${multiIngredientItems.length} ===\n`);
  
  // Show samples by pattern
  const hyphenated = multiIngredientItems.filter(i => 
    i.nombreEspanol.includes('-')
  );
  
  const withCommaOrY = multiIngredientItems.filter(i => 
    i.nombreEspanol.includes(',') || i.nombreEspanol.toLowerCase().includes(' y ')
  );
  
  const other = multiIngredientItems.filter(i => 
    !i.nombreEspanol.includes('-') && 
    !i.nombreEspanol.includes(',') && 
    !i.nombreEspanol.toLowerCase().includes(' y ')
  );
  
  console.log(`HYPHENATED (${hyphenated.length}):`);
  hyphenated.slice(0, 30).forEach(i => {
    console.log(`  - ${i.nombreEspanol}`);
  });
  if (hyphenated.length > 30) console.log(`  ... and ${hyphenated.length - 30} more`);
  
  console.log(`\nWITH COMMA OR "Y" (${withCommaOrY.length}):`);
  withCommaOrY.slice(0, 20).forEach(i => {
    console.log(`  - ${i.nombreEspanol}`);
  });
  if (withCommaOrY.length > 20) console.log(`  ... and ${withCommaOrY.length - 20} more`);
  
  console.log(`\nOTHER (${other.length}):`);
  other.slice(0, 20).forEach(i => {
    console.log(`  - ${i.nombreEspanol}`);
  });
  if (other.length > 20) console.log(`  ... and ${other.length - 20} more`);
  
  return multiIngredientItems.map(i => i.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
