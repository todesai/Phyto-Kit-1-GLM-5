import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Fix "cutícula" from "unknown" to "part"
  const updated = await prisma.wordClassification.update({
    where: { id: 'cmloh1ds90dw0nu87wb0qpxy1' },
    data: { category: 'part', needsReview: false }
  })
  console.log('Updated "cutícula":', updated.category)
  
  // Verify completion status now
  const children = await prisma.mexicanFood.findMany({
    where: { parentIngredientId: 'cmllv2him029nqk6s1pue2dff' },
    select: { nombreEspanol: true, taxon: true, scientificNameNotNeeded: true }
  })
  
  let unknownWords: string[] = []
  for (const child of children) {
    const words = child.nombreEspanol.toLowerCase().replace(/\([^)]*\)/g, '').trim().split(/\s+/)
    for (const word of words) {
      const wc = await prisma.wordClassification.findFirst({
        where: { wordLower: word }
      })
      if (wc && wc.category === 'unknown') {
        unknownWords.push(`${word} (in ${child.nombreEspanol})`)
      }
    }
  }
  
  console.log('\nUnknown words remaining:', unknownWords.length > 0 ? [...new Set(unknownWords)] : 'none')
  
  await prisma.$disconnect()
}

main().catch(console.error)
