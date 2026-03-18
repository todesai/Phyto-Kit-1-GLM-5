import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== CHECKING FOR CASE DUPLICATES ===\n');
  
  const allWords = await prisma.wordClassification.findMany();
  
  // Group by wordLower
  const byLower = new Map<string, typeof allWords>();
  allWords.forEach(w => {
    if (!byLower.has(w.wordLower)) {
      byLower.set(w.wordLower, []);
    }
    byLower.get(w.wordLower)!.push(w);
  });
  
  // Find duplicates
  const duplicates = Array.from(byLower.entries()).filter(([_, words]) => words.length > 1);
  
  console.log(`Found ${duplicates.length} duplicate groups:\n`);
  
  let merged = 0;
  
  for (const [lower, words] of duplicates) {
    // Sort by priority: core > descriptor > processing > color > connector > form > unknown
    const priority: Record<string, number> = {
      core: 1, descriptor: 2, processing: 3, color: 4, connector: 5, form: 6, unknown: 7
    };
    
    const sorted = words.sort((a, b) => {
      const pA = priority[a.category] || 99;
      const pB = priority[b.category] || 99;
      if (pA !== pB) return pA - pB;
      return b.frequency - a.frequency; // Higher frequency first if same category
    });
    
    const keep = sorted[0];
    const remove = sorted.slice(1);
    
    const totalFreq = words.reduce((sum, w) => sum + w.frequency, 0);
    
    console.log(`  "${keep.word}" (${keep.category}): keeping, total freq = ${totalFreq}`);
    remove.forEach(w => {
      console.log(`    - "${w.word}" (${w.category}): freq ${w.frequency} -> will merge`);
    });
    
    // Update frequency
    await prisma.wordClassification.update({
      where: { id: keep.id },
      data: { frequency: totalFreq }
    });
    
    // Delete duplicates
    for (const w of remove) {
      await prisma.wordClassification.delete({
        where: { id: w.id }
      });
      merged++;
    }
  }
  
  console.log(`\nMerged: ${merged} records`);
  
  // Final stats
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
