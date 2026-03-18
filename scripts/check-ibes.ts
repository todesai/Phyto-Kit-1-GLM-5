import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Get Ibes parent
  const ibesParent = await prisma.mexicanFood.findFirst({
    where: { 
      nombreEspanol: 'Ibes',
      isParent: true
    },
    select: { id: true, nombreEspanol: true, isParent: true, childCount: true, taxon: true, hierarchyStatus: true }
  })
  
  console.log('=== Ibes Parent ===')
  console.log(ibesParent)
  
  // Get all Ibes items
  const allIbes = await prisma.mexicanFood.findMany({
    where: { nombreEspanol: { contains: 'Ibes' } },
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
  
  console.log('\n=== All Ibes Items ===')
  for (const item of allIbes) {
    console.log({
      name: item.nombreEspanol,
      isParent: item.isParent,
      parentId: item.parentIngredientId,
      taxon: item.taxon,
      noSciNameNeeded: item.scientificNameNotNeeded,
      status: item.hierarchyStatus
    })
  }
  
  // Get children linked to Ibes parent
  if (ibesParent) {
    const linkedChildren = await prisma.mexicanFood.findMany({
      where: { parentIngredientId: ibesParent.id },
      select: { 
        id: true, 
        nombreEspanol: true, 
        taxon: true,
        scientificNameNotNeeded: true
      }
    })
    
    console.log('\n=== Children Linked to Ibes Parent ===')
    for (const child of linkedChildren) {
      console.log({
        name: child.nombreEspanol,
        taxon: child.taxon,
        noSciNameNeeded: child.scientificNameNotNeeded
      })
    }
    
    // Check word classifications for children
    console.log('\n=== Word Analysis for Children ===')
    for (const child of linkedChildren) {
      const words = child.nombreEspanol.toLowerCase().replace(/\([^)]*\)/g, '').trim().split(/\s+/)
      console.log(`\n"${child.nombreEspanol}" words:`, words)
      
      for (const word of words) {
        const wc = await prisma.wordClassification.findFirst({
          where: { wordLower: word }
        })
        console.log(`  "${word}": ${wc ? wc.category : 'NOT FOUND'}`)
      }
    }
  }
  
  // Check for potential children (not yet linked)
  const potentialChildren = await prisma.mexicanFood.findMany({
    where: { 
      nombreEspanol: { contains: 'Ibes' },
      parentIngredientId: null,
      isParent: false
    }
  })
  
  console.log('\n=== Potential Unlinked Children ===')
  console.log(`Count: ${potentialChildren.length}`)
  for (const item of potentialChildren) {
    console.log(`  ${item.nombreEspanol} (status: ${item.hierarchyStatus})`)
  }
  
  // Also check childCount vs actual linked children
  if (ibesParent) {
    const actualLinkedCount = await prisma.mexicanFood.count({
      where: { parentIngredientId: ibesParent.id }
    })
    console.log('\n=== Child Count Check ===')
    console.log(`Stored childCount: ${ibesParent.childCount}`)
    console.log(`Actual linked children: ${actualLinkedCount}`)
    console.log(`Mismatch: ${ibesParent.childCount !== actualLinkedCount}`)
  }
  
  await prisma.$disconnect()
}

main().catch(console.error)
