import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find words ending with punctuation
  const allWords = await prisma.wordClassification.findMany({
    select: { word: true, wordLower: true, category: true, frequency: true }
  });
  
  const withPunctuation = allWords.filter(w => 
    /[,\.\-\(\)]$/.test(w.word) || /[,\.\-\(\)]$/.test(w.wordLower)
  );
  
  console.log(`=== Words ending with punctuation: ${withPunctuation.length} ===\n`);
  
  // Group by what punctuation
  const byPunctuation = new Map<string, typeof withPunctuation>();
  withPunctuation.forEach(w => {
    const lastChar = w.word.slice(-1);
    if (!byPunctuation.has(lastChar)) {
      byPunctuation.set(lastChar, []);
    }
    byPunctuation.get(lastChar)!.push(w);
  });
  
  byPunctuation.forEach((words, punct) => {
    console.log(`\nEnding with "${punct}" (${words.length}):`);
    words.sort((a, b) => b.frequency - a.frequency);
    words.slice(0, 20).forEach(w => {
      console.log(`  "${w.word}" (${w.category}): ${w.frequency} times`);
    });
    if (words.length > 20) {
      console.log(`  ... and ${words.length - 20} more`);
    }
  });
  
  // Check for duplicates - same word with and without punctuation
  console.log(`\n\n=== POTENTIAL DUPLICATES (same word with/without punctuation) ===`);
  const cleanedToOriginal = new Map<string, typeof allWords>();
  
  allWords.forEach(w => {
    const cleaned = w.wordLower.replace(/[,\.\-\(\)]+$/g, '');
    if (!cleanedToOriginal.has(cleaned)) {
      cleanedToOriginal.set(cleaned, []);
    }
    cleanedToOriginal.get(cleaned)!.push(w);
  });
  
  let duplicateCount = 0;
  cleanedToOriginal.forEach((words, cleaned) => {
    if (words.length > 1) {
      duplicateCount++;
      console.log(`\n  "${cleaned}":`);
      words.forEach(w => {
        console.log(`    - "${w.word}" (${w.category}): ${w.frequency} times`);
      });
    }
  });
  
  console.log(`\n\nTotal duplicate groups: ${duplicateCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
