import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== Cacahuate Analysis ===\n')
  
  // 1. Find Cacahuate parent
  const parent = await prisma.mexicanFood.findFirst({
    where: { nombreEspanol: 'Cacahuate', isParent: true },
    select: { id: true, nombreEspanol: true, isParent: true, childCount: true, taxon: true, hierarchyStatus: true }
  })
  
  console.log('1. PARENT:')
  console.log(parent)
  console.log('')
  
  // 2. Find all items containing "Cacahuate"
  const allCacahuate = await prisma.mexicanFood.findMany({
    where: { nombreEspanol: { contains: 'Cacahuate' } },
    select: { 
      id: true, 
      nombreEspanol: true, 
      isParent: true, 
      parentIngredientId: true,
      taxon: true,
      scientificNameNotNeeded: true,
      hierarchyStatus: true
    },
    orderBy: { nombreEspanol: 'asc' }
  })
  
  console.log('2. ALL ITEMS CONTAINING "Cacahuate":')
  for (const item of allCacahuate) {
    let status = ''
    if (item.isParent) status = 'PARENT'
    else if (item.hierarchyStatus === 'rejected') status = 'REJECTED'
    else if (item.hierarchyStatus === 'prepared') status = 'PREPARED'
    else if (item.parentIngredientId) status = 'LINKED CHILD'
    else status = 'PENDING'
    
    console.log(`  [${status}] ${item.nombreEspanol}`)
    if (item.parentIngredientId) console.log(`    -> linked to: ${item.parentIngredientId}`)
    if (item.taxon) console.log(`    -> taxon: ${item.taxon}`)
  }
  console.log('')
  
  // 3. Count by status
  const statusCounts = {
    parent: allCacahuate.filter(i => i.isParent).length,
    linked: allCacahuate.filter(i => !i.isParent && i.parentIngredientId).length,
    rejected: allCacahuate.filter(i => i.hierarchyStatus === 'rejected').length,
    prepared: allCacahuate.filter(i => i.hierarchyStatus === 'prepared').length,
    pending: allCacahuate.filter(i => !i.isParent && !i.parentIngredientId && i.hierarchyStatus === 'pending').length
  }
  
  console.log('3. STATUS COUNTS:')
  console.log(`  Parent: ${statusCounts.parent}`)
  console.log(`  Linked children: ${statusCounts.linked}`)
  console.log(`  Rejected: ${statusCounts.rejected}`)
  console.log(`  Prepared: ${statusCounts.prepared}`)
  console.log(`  Pending: ${statusCounts.pending}`)
  console.log('')
  
  // 4. Check rejected items specifically
  const rejected = allCacahuate.filter(i => i.hierarchyStatus === 'rejected')
  console.log('4. REJECTED ITEMS (marked as not children):')
  if (rejected.length === 0) {
    console.log('  None')
  } else {
    for (const item of rejected) {
      console.log(`  - ${item.nombreEspanol}`)
    }
  }
  console.log('')
  
  // 5. Check prepared items specifically
  const prepared = allCacahuate.filter(i => i.hierarchyStatus === 'prepared')
  console.log('5. PREPARED ITEMS (processed foods):')
  if (prepared.length === 0) {
    console.log('  None')
  } else {
    for (const item of prepared) {
      console.log(`  - ${item.nombreEspanol}`)
    }
  }
  console.log('')
  
  // 6. Check if parent is complete
  if (parent) {
    const linkedChildren = await prisma.mexicanFood.findMany({
      where: { parentIngredientId: parent.id },
      select: { nombreEspanol: true, taxon: true, scientificNameNotNeeded: true }
    })
    
    const noScientificName = linkedChildren.filter(c => !c.taxon && !c.scientificNameNotNeeded)
    
    // Check for unknown words
    let unknownWords: string[] = []
    for (const child of linkedChildren) {
      const words = child.nombreEspanol.toLowerCase().replace(/\([^)]*\)/g, '').trim().split(/\s+/)
      for (const word of words) {
        const wc = await prisma.wordClassification.findFirst({
          where: { wordLower: word }
        })
        if (wc && wc.category === 'unknown') {
          unknownWords.push(word)
        }
      }
    }
    
    console.log('6. COMPLETION STATUS:')
    console.log(`  Has children linked: ${linkedChildren.length > 0}`)
    console.log(`  Children without scientific name: ${noScientificName.length}`)
    console.log(`  Unknown words in children: ${unknownWords.length > 0 ? [...new Set(unknownWords)].join(', ') : 'none'}`)
    
    // Check potential children (unprocessed)
    const potentialChildren = allCacahuate.filter(i => 
      !i.isParent && 
      !i.parentIngredientId && 
      i.hierarchyStatus === 'pending'
    )
    console.log(`  Potential children remaining: ${potentialChildren.length}`)
    
    if (linkedChildren.length > 0 && noScientificName.length === 0 && unknownWords.length === 0 && potentialChildren.length === 0) {
      console.log(`  Status: ✓ COMPLETE`)
    } else {
      console.log(`  Status: ⚠️ IN PROGRESS`)
    }
  }
  
  await prisma.$disconnect()
}

main().catch(console.error)
