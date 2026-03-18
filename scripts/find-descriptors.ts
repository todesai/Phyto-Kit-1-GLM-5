import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get all core words (parent ingredients)
  const coreWords = await prisma.wordClassification.findMany({
    where: { category: 'core' },
    select: { word: true, wordLower: true }
  });
  
  console.log(`=== Core words: ${coreWords.length} ===`);
  
  // Get all food items
  const foodItems = await prisma.mexicanFood.findMany({
    select: { nombreEspanol: true }
  });
  
  // Find words that appear alongside core words
  const descriptorCandidates = new Map<string, number>();
  
  foodItems.forEach(item => {
    const words = item.nombreEspanol
      .replace(/[,.\-()]/g, ' ')
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length > 0);
    
    const wordsLower = words.map(w => w.toLowerCase());
    
    // Check if any word is a core word
    const hasCoreWord = wordsLower.some(w => 
      coreWords.some(c => c.wordLower === w)
    );
    
    // If item has a core word, collect the surrounding words
    if (hasCoreWord) {
      words.forEach(word => {
        const lower = word.toLowerCase();
        // Skip if it's a core word itself
        const isCore = coreWords.some(c => c.wordLower === lower);
        if (!isCore && word.length > 1) {
          descriptorCandidates.set(word, (descriptorCandidates.get(word) || 0) + 1);
        }
      });
    }
  });
  
  console.log(`\n=== Words surrounding core words: ${descriptorCandidates.size} ===`);
  
  // Get current unknown words
  const unknownWords = await prisma.wordClassification.findMany({
    where: { category: 'unknown' },
    select: { word: true, wordLower: true }
  });
  
  const unknownSet = new Set(unknownWords.map(w => w.wordLower));
  
  // Find which descriptor candidates are currently unknown
  const toUpdate: string[] = [];
  
  descriptorCandidates.forEach((count, word) => {
    const lower = word.toLowerCase();
    if (unknownSet.has(lower)) {
      toUpdate.push(word);
    }
  });
  
  console.log(`\n=== Unknown words that surround core words (to become descriptors): ${toUpdate.length} ===`);
  
  // Sort by frequency
  const sorted = toUpdate.sort((a, b) => 
    (descriptorCandidates.get(b) || 0) - (descriptorCandidates.get(a) || 0)
  );
  
  console.log(`\nTop 50 by frequency:`);
  sorted.slice(0, 50).forEach(word => {
    console.log(`  "${word}": ${descriptorCandidates.get(word)} times`);
  });
  
  return sorted;
}

main().catch(console.error).finally(() => prisma.$disconnect());
