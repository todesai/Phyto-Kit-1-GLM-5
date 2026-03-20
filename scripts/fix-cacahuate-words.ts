import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Fix "echilado" - it's a typo of "enchilado" (spicy/with chili)
  // Let me check if "enchilado" exists
  const enchilado = await prisma.wordClassification.findFirst({
    where: { wordLower: 'enchilado' }
  })
  console.log('"enchilado" classification:', enchilado?.category)
  
  // Fix "cutícula" - it's a plant part (skin/hull)
  const cuticula = await prisma.wordClassification.findFirst({
    where: { wordLower: 'cutícula' }
  })
  console.log('"cutícula" exists:', cuticula)
  
  // Create/update "echilado" as same category as "enchilado" 
  // It's a typo, so we should either fix the food name or create the word
  // Let's create it as "processing" (same as enchilado)
  
  const echilado = await prisma.wordClassification.findFirst({
    where: { wordLower: 'echilado' }
  })
  
  if (!echilado) {
    const newEchilado = await prisma.wordClassification.create({
      data: {
        word: 'Echilado',
        wordLower: 'echilado',
        category: 'processing', // same as enchilado
        priority: 3,
        needsReview: true // mark for review since it's a typo
      }
    })
    console.log('Created "echilado":', newEchilado.category)
  }
  
  // Create "cutícula" as a "part" (plant part)
  if (!cuticula) {
    const newCuticula = await prisma.wordClassification.create({
      data: {
        word: 'Cutícula',
        wordLower: 'cutícula',
        category: 'part',
        priority: 2,
        needsReview: false
      }
    })
    console.log('Created "cutícula":', newCuticula.category)
  }
  
  console.log('\n✓ Word classifications fixed!')
  
  await prisma.$disconnect()
}

main().catch(console.error)
