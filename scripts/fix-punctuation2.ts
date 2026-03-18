import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== FIXING PUNCTUATION IN WORD CLASSIFICATIONS ===\n');
  
  // Get all words with trailing punctuation
  const withPunctuation = await prisma.wordClassification.findMany({
    where: {
      OR: [
        { wordLower: { endsWith: ',' } },
        { wordLower: { endsWith: '.' } }
      ]
    }
  });
  
  console.log(`Words with trailing punctuation: ${withPunctuation.length}`);
  
  // For each word with punctuation, find its clean version and merge
  let merged = 0;
  let deleted = 0;
  
  for (const w of withPunctuation) {
    const cleaned = w.wordLower.replace(/[,\.\-\(\)]+$/g, '');
    const cleanedWord = w.word.replace(/[,\.\-\(\)]+$/g, '');
    
    // Find the clean version
    const cleanRecord = await prisma.wordClassification.findUnique({
      where: { wordLower: cleaned }
    });
    
    if (cleanRecord) {
      // Merge: add frequency and delete the punctuation version
      await prisma.wordClassification.update({
        where: { id: cleanRecord.id },
        data: {
          frequency: { increment: w.frequency }
        }
      });
      
      await prisma.wordClassification.delete({
        where: { id: w.id }
      });
      deleted++;
    } else {
      // No clean version exists, just clean this record
      await prisma.wordClassification.update({
        where: { id: w.id },
        data: {
          word: cleanedWord,
          wordLower: cleaned
        }
      });
      merged++;
    }
  }
  
  console.log(`\nMerged into existing: ${deleted}`);
  console.log(`Cleaned without merge: ${merged}`);
  
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
  
  // Verify no more punctuation issues
  const remaining = await prisma.wordClassification.findMany({
    where: {
      OR: [
        { wordLower: { endsWith: ',' } },
        { wordLower: { endsWith: '.' } }
      ]
    }
  });
  console.log(`\nRemaining words with punctuation: ${remaining.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
