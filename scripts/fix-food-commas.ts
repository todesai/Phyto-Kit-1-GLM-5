import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Find all food items with commas in their names
  const itemsWithCommas = await prisma.mexicanFood.findMany({
    where: {
      nombreEspanol: { contains: ',' }
    },
    select: { id: true, nombreEspanol: true }
  })
  
  console.log(`Found ${itemsWithCommas.length} items with commas in nombreEspanol\n`)
  
  let updated = 0
  let unchanged = 0
  
  for (const item of itemsWithCommas) {
    // Remove commas and normalize spaces
    const newName = item.nombreEspanol
      .replace(/,/g, '')  // Remove all commas
      .replace(/\s+/g, ' ')  // Normalize multiple spaces to single space
      .trim()
    
    if (newName !== item.nombreEspanol) {
      console.log(`"${item.nombreEspanol}"`)
      console.log(`  -> "${newName}"\n`)
      
      await prisma.mexicanFood.update({
        where: { id: item.id },
        data: { nombreEspanol: newName }
      })
      updated++
    } else {
      unchanged++
    }
  }
  
  console.log(`\n=== Summary ===`)
  console.log(`Updated: ${updated}`)
  console.log(`Unchanged: ${unchanged}`)
  
  await prisma.$disconnect()
}

main().catch(console.error)
