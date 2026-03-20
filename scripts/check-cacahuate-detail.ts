import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Check what parent ID cmllv2fga01bhqk6soensvphy is
  const otherParent = await prisma.mexicanFood.findUnique({
    where: { id: 'cmllv2fga01bhqk6soensvphy' },
    select: { id: true, nombreEspanol: true, isParent: true, childCount: true }
  })
  
  console.log('=== The ID that children are linked to ===')
  console.log(otherParent)
  console.log('')
  
  // Check the actual Cacahuate parent
  const cacahuateParent = await prisma.mexicanFood.findFirst({
    where: { nombreEspanol: 'Cacahuate', isParent: true }
  })
  
  console.log('=== The actual Cacahuate parent ===')
  console.log(cacahuateParent)
  console.log('')
  
  // Find all parents with "Cacahuate" in the name
  const allCacahuateParents = await prisma.mexicanFood.findMany({
    where: { nombreEspanol: { contains: 'Cacahuate' }, isParent: true },
    select: { id: true, nombreEspanol: true, childCount: true }
  })
  
  console.log('=== All Cacahuate parents ===')
  for (const p of allCacahuateParents) {
    const children = await prisma.mexicanFood.count({
      where: { parentIngredientId: p.id }
    })
    console.log(`  ${p.nombreEspanol} (id: ${p.id})`)
    console.log(`    stored childCount: ${p.childCount}, actual children: ${children}`)
  }
  console.log('')
  
  // Check children linked to the other parent
  const childrenLinkedToOther = await prisma.mexicanFood.findMany({
    where: { parentIngredientId: 'cmllv2fga01bhqk6soensvphy' },
    select: { nombreEspanol: true }
  })
  
  console.log('=== Children linked to other parent ID ===')
  for (const c of childrenLinkedToOther) {
    console.log(`  - ${c.nombreEspanol}`)
  }
  console.log('')
  
  // Check children linked to actual Cacahuate parent
  const childrenLinkedToCacahuate = await prisma.mexicanFood.findMany({
    where: { parentIngredientId: cacahuateParent?.id },
    select: { nombreEspanol: true }
  })
  
  console.log('=== Children linked to Cacahuate parent ===')
  console.log(`Count: ${childrenLinkedToCacahuate.length}`)
  for (const c of childrenLinkedToCacahuate) {
    console.log(`  - ${c.nombreEspanol}`)
  }
  
  await prisma.$disconnect()
}

main().catch(console.error)
