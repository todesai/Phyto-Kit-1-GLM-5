import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== FIXING PUNCTUATION IN WORD CLASSIFICATIONS ===\n');
  
  // Get all words
  const allWords = await prisma.wordClassification.findMany();
  console.log(`Total words: ${allWords.length}`);
  
  // Find words with trailing punctuation
  const withPunctuation = allWords.filter(w => 
    w.word.endsWith(',') || w.word.endsWith('.') || w.word.endsWith('-') || w.word.endsWith('(') || w.word.endsWith(')')
  );
  console.log(`Words with trailing punctuation: ${withPunctuation.length}`);
  
  // Build a map of clean word -> existing record (by word field which is unique)
  const cleanWordMap = new Map<string, typeof allWords[0]>();
  allWords.forEach(w => {
    cleanWordMap.set(w.word, w);
  });
  
  let merged = 0;
  let cleaned = 0;
  let errors = 0;
  
  for (const w of withPunctuation) {
    const cleanWord = w.word.replace(/[,\.\-\(\)]+$/g, '');
    
    // Check if clean version already exists
    const existingClean = cleanWordMap.get(cleanWord);
    
    if (existingClean && existingClean.id !== w.id) {
      // Clean version exists - merge frequencies and delete punctuation version
      try {
        await prisma.wordClassification.update({
          where: { id: existingClean.id },
          data: { frequency: { increment: w.frequency } }
        });
        
        await prisma.wordClassification.delete({
          where: { id: w.id }
        });
        merged++;
      } catch (e) {
        console.log(`Error merging "${w.word}" -> "${cleanWord}": ${e}`);
        errors++;
      }
    } else if (!existingClean) {
      // No clean version exists - just clean this record
      try {
        await prisma.wordClassification.update({
          where: { id: w.id },
          data: { word: cleanWord }
        });
        // Update map for future iterations
        cleanWordMap.delete(w.word);
        cleanWordMap.set(cleanWord, w);
        cleaned++;
      } catch (e) {
        console.log(`Error cleaning "${w.word}" -> "${cleanWord}": ${e}`);
        errors++;
      }
    }
  }
  
  console.log(`\nMerged into existing: ${merged}`);
  console.log(`Cleaned without merge: ${cleaned}`);
  console.log(`Errors: ${errors}`);
  
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
  
  // Check remaining punctuation
  const remaining = await prisma.wordClassification.findMany();
  const stillWithPunct = remaining.filter(w => 
    w.word.endsWith(',') || w.word.endsWith('.')
  );
  console.log(`\nRemaining words with punctuation: ${stillWithPunct.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
