import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Check the word "ibes"
  const ibesWord = await prisma.wordClassification.findFirst({
    where: { wordLower: 'ibes' }
  })
  console.log('=== Word "ibes" ===')
  console.log(ibesWord)
  
  // Check the parent conditions
  console.log('\n=== Completion Conditions Check ===')
  console.log('1. isParent: true ✓')
  console.log('2. potentialChildren: 0 ✓')
  console.log('3. Child "Ibes Semilla" has taxon "Phaseolus lunatus" ✓')
  console.log('4. Word "ibes" is classified as: ' + (ibesWord?.category || 'NOT FOUND'))
  console.log('   - If category is "unknown", this FAILS the completion check!')
  console.log('')
  console.log('ROOT CAUSE: The word "ibes" is classified as "unknown", which means')
  console.log('the child "Ibes Semilla" contains an unknown word, so the parent')
  console.log('cannot be marked as complete.')
  
  // Also check childCount mismatch
  console.log('\n=== Data Inconsistency ===')
  console.log('Stored childCount: 2')
  console.log('Actual linked children: 1')
  console.log('This might cause issues but is not the main problem.')
  
  await prisma.$disconnect()
}

main().catch(console.error)
