import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Parent words that should be "core" instead of "unknown"
  const wordIds = [
    'cmloh1d140d8lnu87poxuq1cg', // Nance
    'cmloh1d5a0dbsnu87j6qmqtbs', // Xocoyol
    'cmloh1dj20dnfnu87mu9nhlep', // Bagre
    'cmloh1dkj0downu87vv6wb0g3', // Mero
    'cmloh1dxt0e0dnu87bcybgae0', // Yuca
    'cmloh1e2x0e57nu87hdobetju', // Berenjena
    'cmloh1e5f0e7wnu876w8j4uqv', // Malva
    'cmloh1e6j0e99nu87ol3ivtuu', // Verdolaga
    'cmloh1dxu0e0enu87p1hltxw1', // Oliva
  ]
  
  console.log('Fixing parent words from "unknown" to "core":\n')
  
  for (const id of wordIds) {
    const word = await prisma.wordClassification.findUnique({
      where: { id }
    })
    
    if (word) {
      const updated = await prisma.wordClassification.update({
        where: { id },
        data: { 
          category: 'core',
          needsReview: false
        }
      })
      console.log(`✓ "${updated.word}" (${word.category} -> ${updated.category})`)
    }
  }
  
  console.log('\nAll parent words updated to "core" classification!')
  
  await prisma.$disconnect()
}

main().catch(console.error)
