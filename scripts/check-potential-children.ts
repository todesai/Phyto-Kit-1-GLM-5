import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const parentNames = ['Nance', 'Xocoyol', 'Bagre', 'Mero', 'Yuca', 'Berenjena', 'Malva', 'Verdolaga', 'Oliva']
  
  console.log('=== Checking for potential (unlinked) children ===\n')
  
  for (const name of parentNames) {
    // Find items that contain this word but are not linked
    const potentialChildren = await prisma.mexicanFood.findMany({
      where: { 
        nombreEspanol: { contains: name },
        isParent: false,
        parentIngredientId: null,
        hierarchyStatus: { notIn: ['rejected', 'prepared', 'confirmed'] }
      },
      select: { nombreEspanol: true, hierarchyStatus: true }
    })
    
    console.log(`${name}: ${potentialChildren.length} potential children`)
    if (potentialChildren.length > 0) {
      for (const c of potentialChildren.slice(0, 3)) {
        console.log(`  - ${c.nombreEspanol} (${c.hierarchyStatus})`)
      }
      if (potentialChildren.length > 3) {
        console.log(`  ... and ${potentialChildren.length - 3} more`)
      }
    }
    console.log('')
  }
  
  await prisma.$disconnect()
}

main().catch(console.error)
