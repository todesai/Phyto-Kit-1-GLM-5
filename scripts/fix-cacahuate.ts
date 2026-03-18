import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const cacahuateParentId = 'cmllv2him029nqk6s1pue2dff'
  const naranjaParentId = 'cmllv2fga01bhqk6soensvphy'
  
  // 1. Find Cacahuate items wrongly linked to Naranja
  const wrongChildren = await prisma.mexicanFood.findMany({
    where: { 
      parentIngredientId: naranjaParentId,
      nombreEspanol: { contains: 'Cacahuate' }
    },
    select: { id: true, nombreEspanol: true }
  })
  
  console.log('=== Cacahuate items wrongly linked to Naranja ===')
  for (const c of wrongChildren) {
    console.log(`  - ${c.nombreEspanol}`)
  }
  console.log(`Total: ${wrongChildren.length}\n`)
  
  // 2. Move them to Cacahuate parent
  console.log('=== Moving to Cacahuate parent ===')
  const updateResult = await prisma.mexicanFood.updateMany({
    where: { 
      parentIngredientId: naranjaParentId,
      nombreEspanol: { contains: 'Cacahuate' }
    },
    data: { parentIngredientId: cacahuateParentId }
  })
  console.log(`Updated: ${updateResult.count} items\n`)
  
  // 3. Update childCount on Naranja parent (decrement)
  const naranjaActualChildren = await prisma.mexicanFood.count({
    where: { parentIngredientId: naranjaParentId }
  })
  await prisma.mexicanFood.update({
    where: { id: naranjaParentId },
    data: { childCount: naranjaActualChildren }
  })
  console.log(`Naranja childCount updated to: ${naranjaActualChildren}`)
  
  // 4. Update childCount on Cacahuate parent
  const cacahuateActualChildren = await prisma.mexicanFood.count({
    where: { parentIngredientId: cacahuateParentId }
  })
  await prisma.mexicanFood.update({
    where: { id: cacahuateParentId },
    data: { childCount: cacahuateActualChildren }
  })
  console.log(`Cacahuate childCount updated to: ${cacahuateActualChildren}\n`)
  
  // 5. Verify the fix
  console.log('=== Verification ===')
  
  const cacahuateChildren = await prisma.mexicanFood.findMany({
    where: { parentIngredientId: cacahuateParentId },
    select: { nombreEspanol: true, taxon: true }
  })
  
  console.log(`Cacahuate parent now has ${cacahuateChildren.length} children:`)
  for (const c of cacahuateChildren) {
    console.log(`  - ${c.nombreEspanol} (${c.taxon || 'no taxon'})`)
  }
  
  await prisma.$disconnect()
}

main().catch(console.error)
