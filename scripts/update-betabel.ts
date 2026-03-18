import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const betabelParentId = 'cmllv2i2s02hpqk6smvtab6kc'
  
  // 1. Update parent taxon
  const parent = await prisma.mexicanFood.update({
    where: { id: betabelParentId },
    data: { taxon: 'Beta vulgaris var. vulgaris' }
  })
  console.log('✓ Updated Betabel parent:')
  console.log(`  ${parent.nombreEspanol}: ${parent.taxon}`)
  
  // 2. Update all children to have the same specific taxon
  const children = await prisma.mexicanFood.updateMany({
    where: { parentIngredientId: betabelParentId },
    data: { taxon: 'Beta vulgaris var. vulgaris' }
  })
  console.log(`\n✓ Updated ${children.count} children to same taxon`)
  
  // 3. Verify
  const updatedChildren = await prisma.mexicanFood.findMany({
    where: { parentIngredientId: betabelParentId },
    select: { nombreEspanol: true, taxon: true }
  })
  console.log('\nVerified children:')
  for (const c of updatedChildren) {
    console.log(`  - ${c.nombreEspanol}: ${c.taxon}`)
  }
  
  // 4. Show both Betabel and Acelga for comparison
  console.log('\n=== Comparison ===')
  console.log('Betabel: Beta vulgaris var. vulgaris (beetroot)')
  console.log('Acelga:  Beta vulgaris var. cicla (chard)')
  
  await prisma.$disconnect()
}

main().catch(console.error)
