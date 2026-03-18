import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Get all confirmed parents (isParent = true)
  const parents = await prisma.mexicanFood.findMany({
    where: { isParent: true },
    select: { id: true, nombreEspanol: true, childCount: true }
  })
  
  console.log(`Total confirmed parents: ${parents.length}\n`)
  
  // Check which parent words are classified as "unknown"
  const unknownParentWords: { parent: string, word: any }[] = []
  
  for (const parent of parents) {
    const wordLower = parent.nombreEspanol.toLowerCase()
    const word = await prisma.wordClassification.findFirst({
      where: { wordLower }
    })
    
    if (word && word.category === 'unknown') {
      unknownParentWords.push({ parent: parent.nombreEspanol, word })
    }
  }
  
  console.log(`=== Parent words classified as "unknown" (${unknownParentWords.length}) ===\n`)
  
  for (const item of unknownParentWords) {
    console.log(`"${item.parent}" -> word "${item.word.word}" is classified as "unknown"`)
    console.log(`  Word ID: ${item.word.id}`)
    console.log('')
  }
  
  await prisma.$disconnect()
}

main().catch(console.error)
