import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== CHANGING UNKNOWN WORDS TO DESCRIPTOR ===\n');
  
  // Count before
  const beforeUnknown = await prisma.wordClassification.count({
    where: { category: 'unknown' }
  });
  const beforeDescriptor = await prisma.wordClassification.count({
    where: { category: 'descriptor' }
  });
  
  console.log(`Before:`);
  console.log(`  Unknown: ${beforeUnknown}`);
  console.log(`  Descriptor: ${beforeDescriptor}`);
  
  // Update all unknown to descriptor
  const result = await prisma.wordClassification.updateMany({
    where: { category: 'unknown' },
    data: { category: 'descriptor' }
  });
  
  console.log(`\nUpdated ${result.count} words from "unknown" to "descriptor"`);
  
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
