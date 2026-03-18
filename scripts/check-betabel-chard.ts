import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Check Betabel
  console.log('=== BETABEL ===')
  const betabel = await prisma.mexicanFood.findFirst({
    where: { nombreEspanol: 'Betabel', isParent: true },
    select: { id: true, nombreEspanol: true, taxon: true, isParent: true, childCount: true }
  })
  console.log(betabel)
  
  // Check Betabel children
  if (betabel) {
    const children = await prisma.mexicanFood.findMany({
      where: { parentIngredientId: betabel.id },
      select: { nombreEspanol: true, taxon: true }
    })
    console.log(`\nBetabel children (${children.length}):`)
    for (const c of children) {
      console.log(`  - ${c.nombreEspanol} (${c.taxon || 'no taxon'})`)
    }
  }
  
  // Check Chard (Acelga)
  console.log('\n=== ACELGA (Chard) ===')
  const acelga = await prisma.mexicanFood.findFirst({
    where: { nombreEspanol: 'Acelga', isParent: true },
    select: { id: true, nombreEspanol: true, taxon: true, isParent: true, childCount: true }
  })
  console.log(acelga)
  
  // Check Acelga children
  if (acelga) {
    const children = await prisma.mexicanFood.findMany({
      where: { parentIngredientId: acelga.id },
      select: { nombreEspanol: true, taxon: true }
    })
    console.log(`\nAcelga children (${children.length}):`)
    for (const c of children) {
      console.log(`  - ${c.nombreEspanol} (${c.taxon || 'no taxon'})`)
    }
  }
  
  // Check if Betabel is complete
  console.log('\n=== COMPLETION STATUS ===')
  if (betabel) {
    const children = await prisma.mexicanFood.findMany({
      where: { parentIngredientId: betabel.id }
    })
    const potentialChildren = await prisma.mexicanFood.count({
      where: { 
        nombreEspanol: { contains: 'Betabel' },
        isParent: false,
        parentIngredientId: null,
        hierarchyStatus: 'pending'
      }
    })
    console.log(`Betabel: ${children.length} children, ${potentialChildren} potential`)
    console.log(`Is complete: ${betabel.childCount > 0 && potentialChildren === 0}`)
  }
  
  await prisma.$disconnect()
}

main().catch(console.error)
