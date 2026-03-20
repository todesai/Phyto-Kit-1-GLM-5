import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== UPDATED DATABASE STATISTICS ===\n');
  
  // MexicanFood stats
  const totalFoods = await prisma.mexicanFood.count();
  console.log(`📊 MEXICAN FOOD ITEMS:`);
  console.log(`   Total unique items: ${totalFoods}`);
  
  const hierarchyStatus = await prisma.mexicanFood.groupBy({
    by: ['hierarchyStatus'],
    _count: true,
    orderBy: { _count: { hierarchyStatus: 'desc' } }
  });
  console.log(`   By hierarchy status:`);
  hierarchyStatus.forEach(s => {
    console.log(`     - ${s.hierarchyStatus || 'null'}: ${s._count}`);
  });
  
  const parentCount = await prisma.mexicanFood.count({ where: { isParent: true } });
  console.log(`   Marked as parents: ${parentCount}`);
  
  const childCount = await prisma.mexicanFood.count({ 
    where: { 
      parentIngredientId: { not: null } 
    } 
  });
  console.log(`   Linked to parents: ${childCount}`);
  
  // WordClassification stats
  console.log(`\n📝 WORD CLASSIFICATIONS:`);
  const totalWords = await prisma.wordClassification.count();
  console.log(`   Total words: ${totalWords}`);
  
  const categoryDist = await prisma.wordClassification.groupBy({
    by: ['category'],
    _count: true,
    orderBy: { _count: { category: 'desc' } }
  });
  console.log(`   By category:`);
  categoryDist.forEach(s => {
    console.log(`     - ${s.category}: ${s._count}`);
  });
  
  const needsReview = await prisma.wordClassification.count({ 
    where: { needsReview: true } 
  });
  console.log(`   Needing review: ${needsReview}`);
  
  // tipoAlimento distribution
  console.log(`\n📦 BY FOOD TYPE (tipoAlimento):`);
  const tipoDist = await prisma.mexicanFood.groupBy({
    by: ['tipoAlimento'],
    _count: true,
    orderBy: { _count: { tipoAlimento: 'desc' } }
  });
  tipoDist.forEach(s => {
    console.log(`   ${s.tipoAlimento || 'null'}: ${s._count}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
