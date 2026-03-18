import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Get all completed parents (isParent = true, has children)
  const parents = await prisma.mexicanFood.findMany({
    where: { isParent: true, childCount: { gt: 0 } },
    select: { id: true, nombreEspanol: true, taxon: true, childCount: true }
  })
  
  console.log('=== Parents WITH children ===\n')
  
  const withTaxon = parents.filter(p => p.taxon)
  const withoutTaxon = parents.filter(p => !p.taxon)
  
  console.log(`With scientific name: ${withTaxon.length}`)
  console.log(`Without scientific name: ${withoutTaxon.length}`)
  console.log('')
  
  console.log('Parents WITHOUT scientific name (children have it):')
  for (const p of withoutTaxon.slice(0, 10)) {
    // Check if children have taxon
    const childrenWithTaxon = await prisma.mexicanFood.count({
      where: { parentIngredientId: p.id, taxon: { not: null } }
    })
    console.log(`  ${p.nombreEspanol} (${p.childCount} children, ${childrenWithTaxon} with taxon)`)
  }
  
  console.log('\n=== Parents WITHOUT children ===\n')
  const noChildren = await prisma.mexicanFood.findMany({
    where: { isParent: true, childCount: 0 },
    select: { id: true, nombreEspanol: true, taxon: true }
  })
  
  const noChildrenWithTaxon = noChildren.filter(p => p.taxon)
  const noChildrenWithoutTaxon = noChildren.filter(p => !p.taxon)
  
  console.log(`With scientific name: ${noChildrenWithTaxon.length}`)
  console.log(`Without scientific name: ${noChildrenWithoutTaxon.length}`)
  
  if (noChildrenWithoutTaxon.length > 0) {
    console.log('\nParents without children that need scientific name:')
    for (const p of noChildrenWithoutTaxon.slice(0, 10)) {
      console.log(`  ${p.nombreEspanol}: needs scientific name`)
    }
  }
  
  await prisma.$disconnect()
}

main().catch(console.error)
