import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const malva = await prisma.mexicanFood.findFirst({
    where: { nombreEspanol: 'Malva', isParent: true }
  })
  console.log('Malva parent:', malva ? { id: malva.id, isParent: malva.isParent, status: malva.hierarchyStatus } : 'NOT FOUND')
  
  if (malva) {
    const children = await prisma.mexicanFood.findMany({
      where: { parentIngredientId: malva.id }
    })
    console.log(`Children linked: ${children.length}`)
    
    const potential = await prisma.mexicanFood.findMany({
      where: {
        nombreEspanol: { contains: 'Malva' },
        isParent: false,
        parentIngredientId: null,
        hierarchyStatus: { notIn: ['rejected', 'prepared', 'confirmed'] }
      },
      select: { nombreEspanol: true, hierarchyStatus: true }
    })
    console.log(`Potential children: ${potential.length}`)
    for (const p of potential) {
      console.log(`  - ${p.nombreEspanol} (${p.hierarchyStatus})`)
    }
  }
  
  await prisma.$disconnect()
}

main().catch(console.error)
