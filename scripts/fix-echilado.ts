import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Check echilado
  const echilado = await prisma.wordClassification.findFirst({
    where: { wordLower: 'echilado' }
  })
  console.log('echilado:', echilado)
  
  if (!echilado) {
    // Create it
    const newWord = await prisma.wordClassification.create({
      data: {
        word: 'Echilado',
        wordLower: 'echilado',
        category: 'descriptor', // same as enchilado
        priority: 3,
        needsReview: false
      }
    })
    console.log('Created:', newWord)
  } else if (echilado.category === 'unknown') {
    // Update it
    const updated = await prisma.wordClassification.update({
      where: { id: echilado.id },
      data: { category: 'descriptor', needsReview: false }
    })
    console.log('Updated:', updated)
  }
  
  // Verify
  const final = await prisma.wordClassification.findFirst({
    where: { wordLower: 'echilado' }
  })
  console.log('\nFinal:', final?.category)
  
  await prisma.$disconnect()
}

main().catch(console.error)
