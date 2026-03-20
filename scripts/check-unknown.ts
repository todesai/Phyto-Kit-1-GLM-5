import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check WordClassification category distribution
  console.log('=== WordClassification category distribution ===');
  const categoryCounts = await prisma.wordClassification.groupBy({
    by: ['category'],
    _count: true
  });
  categoryCounts.forEach(s => {
    console.log(`  ${s.category}: ${s._count}`);
  });
  
  // Get words with category 'unknown'
  console.log('\n=== WordClassification unknown category words ===');
  const unknownWords = await prisma.wordClassification.findMany({
    where: { category: 'unknown' },
    select: { word: true, frequency: true }
  });
  
  console.log(`Total unknown word records: ${unknownWords.length}`);
  console.log(`Unique words: ${unknownWords.length}`); // each word is unique in the model
  
  // Sort by frequency to show most common unknown words
  const sorted = [...unknownWords].sort((a, b) => b.frequency - a.frequency);
  console.log(`\nTop 30 unknown words (by frequency):`);
  sorted.slice(0, 30).forEach(w => {
    console.log(`  "${w.word}": appears ${w.frequency} times`);
  });
  
  // Also check needsReview status
  const needsReview = await prisma.wordClassification.count({
    where: { needsReview: true }
  });
  console.log(`\nTotal words needing review: ${needsReview}`);
  
  // All words count
  const total = await prisma.wordClassification.count();
  console.log(`Total words in classification: ${total}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
