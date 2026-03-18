import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const parentNames = ['Nance', 'Xocoyol', 'Bagre', 'Mero', 'Yuca', 'Berenjena', 'Malva', 'Verdolaga', 'Oliva']
  
  console.log('=== Checking completion status for fixed parents ===\n')
  
  for (const name of parentNames) {
    const parent = await prisma.mexicanFood.findFirst({
      where: { nombreEspanol: name, isParent: true },
      select: { id: true, nombreEspanol: true, childCount: true, taxon: true }
    })
    
    if (!parent) {
      console.log(`${name}: NOT FOUND as parent`)
      continue
    }
    
    // Get children
    const children = await prisma.mexicanFood.findMany({
      where: { parentIngredientId: parent.id },
      select: { id: true, nombreEspanol: true, taxon: true, scientificNameNotNeeded: true }
    })
    
    // Check for children without scientific name
    const noScientificName = children.filter(c => !c.taxon && !c.scientificNameNotNeeded)
    
    // Check for unknown words in children
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
    
    const isComplete = parent.childCount > 0 && noScientificName.length === 0 && unknownWords.length === 0
    
    console.log(`${name}:`)
    console.log(`  Children: ${children.length}`)
    console.log(`  Children without scientific name: ${noScientificName.length}`)
    console.log(`  Unknown words: ${unknownWords.length > 0 ? unknownWords.slice(0, 3).join(', ') + (unknownWords.length > 3 ? '...' : '') : 'none'}`)
    console.log(`  Status: ${isComplete ? '✓ COMPLETE' : '⚠️ IN PROGRESS'}`)
    console.log('')
  }
  
  await prisma.$disconnect()
}

main().catch(console.error)
