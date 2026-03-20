import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get all pending items
  const pendingItems = await prisma.mexicanFood.findMany({
    where: { hierarchyStatus: 'pending' },
    select: { nombreEspanol: true }
  });
  
  console.log(`=== PENDING ITEMS: ${pendingItems.length} ===\n`);
  
  // Extract all unique words from pending items
  const wordsInPending = new Map<string, number>();
  
  pendingItems.forEach(item => {
    // Split by space and common delimiters
    const words = item.nombreEspanol
      .replace(/[,.\-()]/g, ' ')
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length > 0);
    
    words.forEach(word => {
      wordsInPending.set(word, (wordsInPending.get(word) || 0) + 1);
    });
  });
  
  console.log(`Total unique words in pending items: ${wordsInPending.size}`);
  
  // Get word classifications for these words
  const wordLowerList = Array.from(wordsInPending.keys()).map(w => w.toLowerCase());
  
  const classifications = await prisma.wordClassification.findMany({
    where: {
      wordLower: { in: wordLowerList }
    },
    select: {
      word: true,
      wordLower: true,
      category: true,
      frequency: true
    }
  });
  
  // Create a map of wordLower -> classification
  const classMap = new Map<string, { word: string; category: string; frequency: number }>();
  classifications.forEach(c => {
    classMap.set(c.wordLower, { word: c.word, category: c.category, frequency: c.frequency });
  });
  
  // Count by category for words in pending items
  const categoryCount = new Map<string, { unique: number; total: number }>();
  const unknownWords = new Map<string, number>();
  
  wordsInPending.forEach((count, word) => {
    const lower = word.toLowerCase();
    const classification = classMap.get(lower);
    const category = classification?.category || 'not_classified';
    
    if (!categoryCount.has(category)) {
      categoryCount.set(category, { unique: 0, total: 0 });
    }
    categoryCount.get(category)!.unique++;
    categoryCount.get(category)!.total += count;
    
    if (category === 'unknown') {
      unknownWords.set(word, count);
    }
  });
  
  console.log(`\n=== WORDS IN PENDING ITEMS BY CATEGORY ===`);
  const sorted = Array.from(categoryCount.entries()).sort((a, b) => b[1].unique - a[1].unique);
  sorted.forEach(([cat, counts]) => {
    console.log(`  ${cat}: ${counts.unique} unique words (${counts.total} total occurrences)`);
  });
  
  // Show unknown words details
  console.log(`\n=== UNKNOWN WORDS IN PENDING ITEMS ===`);
  console.log(`Unique unknown words: ${unknownWords.size}`);
  
  const totalUnknownOccurrences = Array.from(unknownWords.values()).reduce((a, b) => a + b, 0);
  console.log(`Total unknown word occurrences: ${totalUnknownOccurrences}`);
  
  // Top 30 unknown words by frequency
  const topUnknown = Array.from(unknownWords.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);
  
  console.log(`\nTop 30 unknown words (by frequency in pending items):`);
  topUnknown.forEach(([word, count]) => {
    console.log(`  "${word}": ${count} times`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
