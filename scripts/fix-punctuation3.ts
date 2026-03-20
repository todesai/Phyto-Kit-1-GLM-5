import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== FIXING PUNCTUATION IN WORD CLASSIFICATIONS ===\n');
  
  // Get all words
  const allWords = await prisma.wordClassification.findMany();
  console.log(`Total words: ${allWords.length}`);
  
  // Find words with trailing punctuation
  const withPunctuation = allWords.filter(w => 
    w.wordLower.endsWith(',') || w.wordLower.endsWith('.')
  );
  console.log(`Words with trailing punctuation: ${withPunctuation.length}`);
  
  // Build a map of clean word -> existing record
  const cleanWordMap = new Map<string, typeof allWords[0]>();
  allWords.forEach(w => {
    const clean = w.wordLower.replace(/[,\.\-\(\)]+$/g, '');
    if (!cleanWordMap.has(clean)) {
      cleanWordMap.set(clean, w);
    }
  });
  
  let merged = 0;
  let cleaned = 0;
  
  for (const w of withPunctuation) {
    const cleanLower = w.wordLower.replace(/[,\.\-\(\)]+$/g, '');
    const cleanWord = w.word.replace(/[,\.\-\(\)]+$/g, '');
    
    // Find existing clean record
    const existingClean = cleanWordMap.get(cleanLower);
    
    if (existingClean && existingClean.id !== w.id) {
      // Merge frequencies
      await prisma.wordClassification.update({
        where: { id: existingClean.id },
        data: { frequency: { increment: w.frequency } }
      });
      
      // Delete the punctuation version
      await prisma.wordClassification.delete({
        where: { id: w.id }
      });
      merged++;
    } else {
      // Just clean this record
      await prisma.wordClassification.update({
        where: { id: w.id },
        data: { 
          word: cleanWord,
          wordLower: cleanLower
        }
      });
      cleaned++;
    }
  }
  
  console.log(`\nMerged into existing: ${merged}`);
  console.log(`Cleaned without merge: ${cleaned}`);
  
  // Show final stats
  console.log(`\n=== FINAL CATEGORY DISTRIBUTION ===`);
  const categoryDist = await prisma.wordClassification.groupBy({
    by: ['category'],
    _count: true,
    orderBy: { _count: { category: 'desc' } }
  });
  categoryDist.forEach(s => {
    console.log(`  ${s.category}: ${s._count}`);
  });
  
  const total = await prisma.wordClassification.count();
  console.log(`\nTotal words: ${total}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
