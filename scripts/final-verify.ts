import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Check MexicanFood names
  const foodWithCommas = await prisma.mexicanFood.count({
    where: { nombreEspanol: { contains: ',' } }
  })
  
  // Check WordClassification words
  const wordsWithCommas = await prisma.wordClassification.count({
    where: { 
      OR: [
        { word: { endsWith: ',' } },
        { wordLower: { endsWith: ',' } }
      ]
    }
  })
  
  // Check for words that should exist
  const wordsToCheck = ['cortado', 'entero', 'rebanado', 'tierno']
  const foundWords = await prisma.wordClassification.findMany({
    where: { wordLower: { in: wordsToCheck } },
    select: { word: true, wordLower: true, category: true }
  })
  
  console.log('=== Final Verification ===\n')
  console.log(`Food items with commas: ${foodWithCommas}`)
  console.log(`Word classifications with commas: ${wordsWithCommas}`)
  console.log(`\nKey words found:`)
  for (const w of foundWords) {
    console.log(`  "${w.word}" (${w.wordLower}): ${w.category}`)
  }
  
  // Total counts
  const totalFood = await prisma.mexicanFood.count()
  const totalWords = await prisma.wordClassification.count()
  console.log(`\nTotal food items: ${totalFood}`)
  console.log(`Total word classifications: ${totalWords}`)
  
  await prisma.$disconnect()
}

main().catch(console.error)
