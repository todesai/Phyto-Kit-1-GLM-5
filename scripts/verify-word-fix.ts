import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check for any mismatches between word and wordLower
  const allWords = await prisma.wordClassification.findMany();
  
  const mismatches = allWords.filter(w => 
    w.wordLower !== w.word.toLowerCase()
  );
  
  console.log(`=== WORD/wORDLOWER MISMATCHES: ${mismatches.length} ===\n`);
  
  if (mismatches.length > 0) {
    console.log('Fixing mismatches...');
    
    for (const w of mismatches) {
      await prisma.wordClassification.update({
        where: { id: w.id },
        data: { wordLower: w.word.toLowerCase() }
      });
    }
    console.log(`Fixed ${mismatches.length} mismatches`);
  }
  
  // Final verification
  console.log(`\n=== FINAL VERIFICATION ===`);
  const finalWords = await prisma.wordClassification.findMany();
  
  const withPunct = finalWords.filter(w => 
    w.word.endsWith(',') || w.word.endsWith('.')
  );
  console.log(`Words with trailing punctuation: ${withPunct.length}`);
  
  const lowerMismatches = finalWords.filter(w => 
    w.wordLower !== w.word.toLowerCase()
  );
  console.log(`Word/wordLower mismatches: ${lowerMismatches.length}`);
  
  // Show category distribution
  console.log(`\n=== CATEGORY DISTRIBUTION ===`);
  const categoryDist = await prisma.wordClassification.groupBy({
    by: ['category'],
    _count: true,
    orderBy: { _count: { category: 'desc' } }
  });
  categoryDist.forEach(s => {
    console.log(`  ${s.category}: ${s._count}`);
  });
  
  console.log(`\nTotal words: ${finalWords.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
