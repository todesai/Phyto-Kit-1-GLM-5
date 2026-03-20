import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Fix 1: Update "ibes" word classification from "unknown" to "core"
  const updatedWord = await prisma.wordClassification.update({
    where: { id: 'cmloh1duf0dxqnu87rap2crta' },
    data: { 
      category: 'core',
      needsReview: false
    }
  })
  console.log('Updated word classification:')
  console.log(updatedWord)
  
  // Fix 2: Correct the childCount on the parent
  const actualCount = await prisma.mexicanFood.count({
    where: { parentIngredientId: 'cmllv2j1r02xqqk6s835iid3o' }
  })
  
  const updatedParent = await prisma.mexicanFood.update({
    where: { id: 'cmllv2j1r02xqqk6s835iid3o' },
    data: { childCount: actualCount }
  })
  console.log('\nUpdated parent childCount:')
  console.log(`  Before: 2, After: ${actualCount}`)
  
  console.log('\n✓ Ibes should now be marked as complete after refreshing the page.')
  
  await prisma.$disconnect()
}

main().catch(console.error)
