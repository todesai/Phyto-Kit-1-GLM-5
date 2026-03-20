import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Find all food items with commas in their names
  const itemsWithCommas = await prisma.mexicanFood.findMany({
    where: {
      nombreEspanol: { contains: ',' }
    },
    select: { id: true, nombreEspanol: true, parentIngredientId: true }
  })
  
  console.log(`Total items with commas in nombreEspanol: ${itemsWithCommas.length}\n`)
  
  // Show first 50
  for (const item of itemsWithCommas.slice(0, 50)) {
    console.log(`  "${item.nombreEspanol}"`)
  }
  if (itemsWithCommas.length > 50) {
    console.log(`  ... and ${itemsWithCommas.length - 50} more`)
  }
  
  await prisma.$disconnect()
}

main().catch(console.error)
