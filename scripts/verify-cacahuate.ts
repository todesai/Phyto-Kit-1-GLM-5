import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const cacahuateParentId = 'cmllv2him029nqk6s1pue2dff'
  
  console.log('=== Cacahuate Final Status ===\n')
  
  // 1. Check parent
  const parent = await prisma.mexicanFood.findUnique({
    where: { id: cacahuateParentId },
    select: { nombreEspanol: true, isParent: true, childCount: true, taxon: true }
  })
  console.log('Parent:', parent)
  console.log('')
  
  // 2. Check completion conditions
  const children = await prisma.mexicanFood.findMany({
    where: { parentIngredientId: cacahuateParentId },
    select: { nombreEspanol: true, taxon: true, scientificNameNotNeeded: true }
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
  
  // Check for potential children (unprocessed)
  const potentialChildren = await prisma.mexicanFood.findMany({
    where: { 
      nombreEspanol: { contains: 'Cacahuate' },
      isParent: false,
      parentIngredientId: null,
      hierarchyStatus: 'pending'
    }
  })
  
  console.log('Completion Check:')
  console.log(`  1. isParent: ${parent?.isParent ? '✓' : '✗'}`)
  console.log(`  2. Children linked: ${children.length}`)
  console.log(`  3. Children without scientific name: ${noScientificName.length} ${noScientificName.length === 0 ? '✓' : '✗'}`)
  console.log(`  4. Unknown words in children: ${unknownWords.length > 0 ? [...new Set(unknownWords)].slice(0, 3).join(', ') : 'none ✓'}`)
  console.log(`  5. Potential children remaining: ${potentialChildren.length} ${potentialChildren.length === 0 ? '✓' : '✗'}`)
  
  const isComplete = parent?.isParent && 
                     children.length > 0 && 
                     noScientificName.length === 0 && 
                     unknownWords.length === 0 && 
                     potentialChildren.length === 0
  
  console.log(`\n  Status: ${isComplete ? '✓ COMPLETE' : '⚠️ IN PROGRESS'}`)
  
  // 3. Show prepared items (correctly classified as processed foods)
  console.log('\n=== Prepared Items (Correctly Excluded) ===')
  const preparedItems = await prisma.mexicanFood.findMany({
    where: { 
      nombreEspanol: { contains: 'Cacahuate' },
      hierarchyStatus: 'prepared'
    },
    select: { nombreEspanol: true }
  })
  
  for (const item of preparedItems) {
    console.log(`  - ${item.nombreEspanol}`)
  }
  console.log(`\nThese are correctly marked as PREPARED (processed foods like mazapán, palanqueta, etc.)`)
  
  // 4. Show rejected items
  console.log('\n=== Rejected Items (Correctly Excluded) ===')
  const rejectedItems = await prisma.mexicanFood.findMany({
    where: { 
      nombreEspanol: { contains: 'Cacahuate' },
      hierarchyStatus: 'rejected'
    },
    select: { nombreEspanol: true }
  })
  
  for (const item of rejectedItems) {
    console.log(`  - ${item.nombreEspanol}`)
  }
  console.log(`\nThese are correctly marked as REJECTED (not children of Cacahuate parent)`)
  
  await prisma.$disconnect()
}

main().catch(console.error)
