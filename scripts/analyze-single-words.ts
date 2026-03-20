/**
 * Analyze Mexican database for single-word items (potential parents)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Normalize text - remove accents for word counting
function normalizeForCount(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Count words in a name
function countWords(name: string): number {
  const normalized = normalizeForCount(name);
  // Split by spaces and filter empty strings
  const words = normalized.split(/\s+/).filter(w => w.length > 0);
  return words.length;
}

async function analyzeDatabase() {
  console.log('=== Mexican Database Single-Word Analysis ===\n');
  
  // Get all foods
  const foods = await prisma.mexicanFood.findMany({
    select: { 
      id: true, 
      nombreEspanol: true, 
      taxon: true,
      isParent: true,
      parentIngredientId: true,
      hierarchyStatus: true,
    },
    orderBy: { nombreEspanol: 'asc' }
  });
  
  console.log(`Total items in database: ${foods.length}\n`);
  
  // Categorize by word count
  const byWordCount: Map<number, typeof foods> = new Map();
  
  for (const food of foods) {
    const wordCount = countWords(food.nombreEspanol);
    if (!byWordCount.has(wordCount)) {
      byWordCount.set(wordCount, []);
    }
    byWordCount.get(wordCount)!.push(food);
  }
  
  // Report by word count
  console.log('=== Items by Word Count ===\n');
  const sortedCounts = [...byWordCount.keys()].sort((a, b) => a - b);
  
  for (const count of sortedCounts) {
    const items = byWordCount.get(count)!;
    console.log(`${count} word(s): ${items.length} items`);
  }
  
  // Focus on single-word items
  const singleWordItems = byWordCount.get(1) || [];
  
  console.log('\n=== Single-Word Items (Potential Parents) ===\n');
  console.log(`Total single-word items: ${singleWordItems.length}`);
  
  // Group single-word items alphabetically
  console.log('\n--- All Single-Word Items ---');
  for (const item of singleWordItems) {
    const status = item.isParent ? '[PARENT]' : item.parentIngredientId ? '[CHILD]' : '[STANDALONE]';
    const hasTaxon = item.taxon ? '✓ taxon' : '✗ no taxon';
    console.log(`  ${status} ${item.nombreEspanol} (${hasTaxon})`);
  }
  
  // Analyze multi-word items that start with single-word names
  console.log('\n\n=== Multi-Word Items Analysis ===\n');
  
  const singleWordNames = new Set(
    singleWordItems.map(i => normalizeForCount(i.nombreEspanol))
  );
  
  const potentialChildren: Map<string, typeof foods> = new Map();
  let matchedChildren = 0;
  let unmatchedChildren = 0;
  
  for (const [count, items] of byWordCount) {
    if (count === 1) continue; // Skip single words
    
    for (const item of items) {
      const normalized = normalizeForCount(item.nombreEspanol);
      const words = normalized.split(/\s+/);
      
      // Check if first word matches a single-word parent
      const firstWord = words[0];
      
      if (singleWordNames.has(firstWord)) {
        matchedChildren++;
        if (!potentialChildren.has(firstWord)) {
          potentialChildren.set(firstWord, []);
        }
        potentialChildren.get(firstWord)!.push(item);
      } else {
        unmatchedChildren++;
      }
    }
  }
  
  console.log(`Multi-word items matching single-word parent: ${matchedChildren}`);
  console.log(`Multi-word items NOT matching: ${unmatchedChildren}`);
  
  // Report potential parent-child relationships
  console.log('\n--- Potential Parent-Child Relationships ---\n');
  
  const sortedParents = [...potentialChildren.keys()].sort();
  
  for (const parentName of sortedParents) {
    const children = potentialChildren.get(parentName)!;
    const parentItem = singleWordItems.find(
      i => normalizeForCount(i.nombreEspanol) === parentName
    );
    
    console.log(`\n${parentName.toUpperCase()} (${children.length} potential children)`);
    if (parentItem) {
      console.log(`  Parent ID: ${parentItem.id}`);
      console.log(`  Parent status: ${parentItem.isParent ? 'IS PARENT' : 'NOT PARENT'}`);
    }
    console.log(`  Children:`);
    
    for (const child of children.slice(0, 10)) { // Show first 10
      const suffix = normalizeForCount(child.nombreEspanol).replace(parentName, '').trim();
      console.log(`    - ${child.nombreEspanol} [suffix: "${suffix}"]`);
    }
    if (children.length > 10) {
      console.log(`    ... and ${children.length - 10} more`);
    }
  }
  
  // Summary statistics
  console.log('\n\n=== SUMMARY ===\n');
  console.log(`Total database items: ${foods.length}`);
  console.log(`Single-word items (potential parents): ${singleWordItems.length}`);
  console.log(`Multi-word items matching single-word parent: ${matchedChildren}`);
  console.log(`Multi-word items NOT matching any single-word parent: ${unmatchedChildren}`);
  console.log(`Potential coverage: ${((matchedChildren / (foods.length - singleWordItems.length)) * 100).toFixed(1)}% of multi-word items`);
  
  // Items that are already marked as parents
  const existingParents = foods.filter(f => f.isParent);
  console.log(`\nCurrently marked as parents: ${existingParents.length}`);
  
  // Single-word items that are NOT marked as parents
  const singleWordNotParents = singleWordItems.filter(i => !i.isParent);
  console.log(`Single-word items NOT marked as parent: ${singleWordNotParents.length}`);
  
  // Return data for further processing
  return {
    total: foods.length,
    singleWordCount: singleWordItems.length,
    matchedChildren,
    unmatchedChildren,
    potentialChildren: Object.fromEntries(
      [...potentialChildren.entries()].map(([k, v]) => [k, v.length])
    ),
    singleWordItems: singleWordItems.map(i => ({
      id: i.id,
      name: i.nombreEspanol,
      isParent: i.isParent,
      hasTaxon: !!i.taxon
    }))
  };
}

// Run
analyzeDatabase()
  .then(result => {
    console.log('\n\nAnalysis complete.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
