import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Find Elote items with commas
  const eloteItems = await prisma.mexicanFood.findMany({
    where: {
      nombreEspanol: { contains: 'Elote' }
    },
    select: { id: true, nombreEspanol: true, parentIngredientId: true, hierarchyStatus: true },
    orderBy: { nombreEspanol: 'asc' }
  })
  
  console.log(`Elote items: ${eloteItems.length}\n`)
  
  for (const item of eloteItems) {
    const hasComma = item.nombreEspanol.includes(',')
    console.log(`${hasComma ? '⚠️ COMMA:' : '✓'} "${item.nombreEspanol}" (status: ${item.hierarchyStatus || 'pending'})`)
  }
  
  await prisma.$disconnect()
}

main().catch(console.error)
