import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== FINAL DATABASE STATISTICS ===\n');
  
  // MexicanFood stats
  const totalFoods = await prisma.mexicanFood.count();
  console.log(`📊 MEXICAN FOOD ITEMS:`);
  console.log(`   Total: ${totalFoods}`);
  
  const hierarchyStatus = await prisma.mexicanFood.groupBy({
    by: ['hierarchyStatus'],
    _count: true,
    orderBy: { _count: { hierarchyStatus: 'desc' } }
  });
  console.log(`   By status:`);
  hierarchyStatus.forEach(s => {
    console.log(`     - ${s.hierarchyStatus}: ${s._count}`);
  });
  
  // Word classification stats
  console.log(`\n📝 WORD CLASSIFICATIONS:`);
  const totalWords = await prisma.wordClassification.count();
  console.log(`   Total: ${totalWords}`);
  
  const categoryDist = await prisma.wordClassification.groupBy({
    by: ['category'],
    _count: true,
    orderBy: { _count: { category: 'desc' } }
  });
  console.log(`   By category:`);
  categoryDist.forEach(s => {
    console.log(`     - ${s.category}: ${s._count}`);
  });
  
  // Calculate unknown words in pending items
  const pendingItems = await prisma.mexicanFood.findMany({
    where: { hierarchyStatus: 'pending' },
    select: { nombreEspanol: true }
  });
  
  const wordsInPending = new Set<string>();
  pendingItems.forEach(item => {
    item.nombreEspanol
      .replace(/[,.\-()]/g, ' ')
      .split(/\s+/)
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length > 0)
      .forEach(w => wordsInPending.add(w));
  });
  
  const unknownWords = await prisma.wordClassification.findMany({
    where: { category: 'unknown' },
    select: { wordLower: true }
  });
  
  const unknownInPending = unknownWords.filter(w => wordsInPending.has(w.wordLower)).length;
  
  console.log(`\n📊 UNKNOWN WORDS IN PENDING ITEMS: ${unknownInPending}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
