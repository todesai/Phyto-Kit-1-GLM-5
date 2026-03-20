import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Get all confirmed parents
  const allParents = await prisma.mexicanFood.findMany({
    where: {
      isParent: true,
      hierarchyStatus: 'confirmed'
    },
    select: {
      id: true,
      nombreEspanol: true,
      taxon: true,
      childCount: true
    },
    orderBy: { nombreEspanol: 'asc' }
  })
  
  console.log('=== Checking Completed Parents for Criteria Compliance ===\n')
  
  const notCompliant: { name: string; reason: string }[] = []
  const compliant: { name: string; children: number }[] = []
  
  for (const parent of allParents) {
    const issues: string[] = []
    
    // Get children
    const children = await prisma.mexicanFood.findMany({
      where: { parentIngredientId: parent.id },
      select: { id: true, nombreEspanol: true, taxon: true, scientificNameNotNeeded: true }
    })
    
    // Check for potential children (unprocessed items matching this parent)
    const potentialChildren = await prisma.mexicanFood.findMany({
      where: { 
        nombreEspanol: { contains: parent.nombreEspanol },
        isParent: false,
        parentIngredientId: null,
        hierarchyStatus: 'pending'
      },
      select: { nombreEspanol: true }
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
    
    // Determine compliance
    // Case 1: Has children - check all criteria
    // Case 2: No children - check if items were rejected/prepared OR if parent has taxon
    
    if (children.length > 0) {
      // Has children - must have all criteria met
      if (potentialChildren.length > 0) {
        issues.push(`${potentialChildren.length} potential children remaining`)
      }
      if (noScientificName.length > 0) {
        issues.push(`${noScientificName.length} children without scientific name`)
      }
      if (unknownWords.length > 0) {
        issues.push(`Unknown words: ${[...new Set(unknownWords)].slice(0, 2).join(', ')}`)
      }
    } else {
      // No children - check if there were items to process
      if (potentialChildren.length > 0) {
        issues.push(`${potentialChildren.length} potential children remaining`)
      } else {
        // Check if any items were rejected/prepared for this parent
        const rejectedOrPrepared = await prisma.mexicanFood.count({
          where: {
            nombreEspanol: { contains: parent.nombreEspanol },
            hierarchyStatus: { in: ['rejected', 'prepared'] }
          }
        })
        
        if (rejectedOrPrepared === 0 && parent.childCount === 0) {
          // No children, no rejected/prepared - this parent has nothing to do
          // It should only be "complete" if it has a taxon (standalone ingredient)
          if (!parent.taxon) {
            issues.push('No children, no rejected/prepared items, no scientific name')
          }
        }
      }
    }
    
    if (issues.length > 0) {
      notCompliant.push({ name: parent.nombreEspanol, reason: issues.join('; ') })
    } else {
      compliant.push({ name: parent.nombreEspanol, children: children.length })
    }
  }
  
  console.log('=== NOT COMPLIANT (should be in active list) ===\n')
  for (const item of notCompliant) {
    console.log(`  ${item.name}: ${item.reason}`)
  }
  console.log(`\nTotal: ${notCompliant.length}\n`)
  
  console.log('=== COMPLIANT (correctly in completed list) ===\n')
  for (const item of compliant) {
    console.log(`  ${item.name} (${item.children} children)`)
  }
  console.log(`\nTotal: ${compliant.length}\n`)
  
  await prisma.$disconnect()
}

main().catch(console.error)
