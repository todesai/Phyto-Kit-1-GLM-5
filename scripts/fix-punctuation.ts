import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== FIXING PUNCTUATION IN WORD CLASSIFICATIONS ===\n');
  
  // Get all words
  const allWords = await prisma.wordClassification.findMany({
    select: { id: true, word: true, wordLower: true, category: true, frequency: true, examples: true }
  });
  
  // Group by cleaned wordLower
  const grouped = new Map<string, typeof allWords>();
  
  allWords.forEach(w => {
    const cleaned = w.wordLower.replace(/[,\.\-\(\)]+$/g, '');
    if (!grouped.has(cleaned)) {
      grouped.set(cleaned, []);
    }
    grouped.get(cleaned)!.push(w);
  });
  
  // Find duplicates to merge
  const toMerge: { cleaned: string; words: typeof allWords }[] = [];
  
  grouped.forEach((words, cleaned) => {
    if (words.length > 1 || words[0].wordLower !== cleaned) {
      toMerge.push({ cleaned, words });
    }
  });
  
  console.log(`Total groups to process: ${toMerge.length}\n`);
  
  // Process each group
  let updated = 0;
  let deleted = 0;
  
  for (const { cleaned, words } of toMerge) {
    // Find the best record to keep (prefer categorized over unknown)
    const sorted = words.sort((a, b) => {
      // Priority: core > descriptor > processing > color > connector > form > unknown
      const priority: Record<string, number> = {
        core: 1, descriptor: 2, processing: 3, color: 4, connector: 5, form: 6, unknown: 7
      };
      return (priority[a.category] || 99) - (priority[b.category] || 99);
    });
    
    const keep = sorted[0];
    const remove = sorted.slice(1);
    
    // Calculate total frequency
    const totalFrequency = words.reduce((sum, w) => sum + w.frequency, 0);
    
    // Clean the word (remove trailing punctuation)
    const cleanedWord = keep.word.replace(/[,\.\-\(\)]+$/g, '');
    
    // Update the record to keep
    await prisma.wordClassification.update({
      where: { id: keep.id },
      data: {
        word: cleanedWord,
        wordLower: cleaned,
        frequency: totalFrequency
      }
    });
    updated++;
    
    // Delete duplicates
    for (const w of remove) {
      await prisma.wordClassification.delete({
        where: { id: w.id }
      });
      deleted++;
    }
  }
  
  console.log(`Updated: ${updated} records`);
  console.log(`Deleted: ${deleted} duplicate records`);
  
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
        { wordLower: { endsWith: '.' } },
        { word: { endsWith: ',' } },
        { word: { endsWith: '.' } }
      ]
    }
  });
  console.log(`\nRemaining words with punctuation: ${remaining.length}`);
  if (remaining.length > 0) {
    remaining.slice(0, 10).forEach(w => console.log(`  "${w.word}"`));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
