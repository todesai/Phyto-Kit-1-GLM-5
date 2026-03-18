import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get all core words
  const coreWords = await prisma.wordClassification.findMany({
    where: { category: 'core' },
    select: { wordLower: true }
  });
  const coreSet = new Set(coreWords.map(w => w.wordLower));
  
  // Get all food items
  const foodItems = await prisma.mexicanFood.findMany({
    select: { nombreEspanol: true }
  });
  
  // Find words that appear alongside core words
  const descriptorCandidates = new Set<string>();
  
  foodItems.forEach(item => {
    const words = item.nombreEspanol
      .replace(/[,.\-()]/g, ' ')
      .split(/\s+/)
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length > 1);
    
    // Check if any word is a core word
    const hasCoreWord = words.some(w => coreSet.has(w));
    
    // If item has a core word, collect the surrounding words
    if (hasCoreWord) {
      words.forEach(word => {
        if (!coreSet.has(word)) {
          descriptorCandidates.add(word);
        }
      });
    }
  });
  
  console.log(`Descriptor candidates: ${descriptorCandidates.size}`);
  
  // Update unknown words to descriptor
  const result = await prisma.wordClassification.updateMany({
    where: {
      category: 'unknown',
      wordLower: { in: Array.from(descriptorCandidates) }
    },
    data: {
      category: 'descriptor'
    }
  });
  
  console.log(`\nUpdated ${result.count} words from "unknown" to "descriptor"`);
  
  // Show updated category distribution
  console.log(`\n=== UPDATED CATEGORY DISTRIBUTION ===`);
  const categoryDist = await prisma.wordClassification.groupBy({
    by: ['category'],
    _count: true,
    orderBy: { _count: { category: 'desc' } }
  });
  categoryDist.forEach(s => {
    console.log(`  ${s.category}: ${s._count}`);
  });
  
  // Show some of the newly classified descriptors
  console.log(`\n=== SAMPLE NEW DESCRIPTORS ===`);
  const newDescriptors = await prisma.wordClassification.findMany({
    where: { category: 'descriptor' },
    select: { word: true, frequency: true },
    orderBy: { frequency: 'desc' },
    take: 30
  });
  newDescriptors.forEach(d => {
    console.log(`  "${d.word}": ${d.frequency} times`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
