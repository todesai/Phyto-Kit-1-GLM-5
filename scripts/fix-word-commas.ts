import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Find all words with trailing commas
  const allWords = await prisma.wordClassification.findMany({
    select: { id: true, word: true, wordLower: true, category: true, frequency: true, needsReview: true }
  })
  
  const wordsWithCommas = allWords.filter(w => w.word.endsWith(','))
  
  console.log(`Found ${wordsWithCommas.length} words with trailing commas\n`)
  
  let merged = 0
  let updated = 0
  
  for (const wordWithComma of wordsWithCommas) {
    const cleanWord = wordWithComma.word.replace(/,+$/, '')
    const cleanWordLower = wordWithComma.wordLower.replace(/,+$/, '')
    
    // Check if there's already a word without comma
    const existingWord = allWords.find(w => 
      w.wordLower === cleanWordLower && 
      w.id !== wordWithComma.id
    )
    
    if (existingWord) {
      console.log(`MERGE: "${wordWithComma.word}" -> "${existingWord.word}"`)
      console.log(`  Comma word category: ${wordWithComma.category}`)
      console.log(`  Existing word category: ${existingWord.category}`)
      
      // If the existing word has a different category and the comma one is already reviewed
      // we might want to keep the comma word's classification
      if (existingWord.category === 'unknown' && wordWithComma.category !== 'unknown') {
        // Update existing to have the comma word's category
        await prisma.wordClassification.update({
          where: { id: existingWord.id },
          data: { 
            category: wordWithComma.category,
            needsReview: false
          }
        })
        console.log(`  -> Updated existing word to category: ${wordWithComma.category}`)
      }
      
      // Delete the comma word
      await prisma.wordClassification.delete({
        where: { id: wordWithComma.id }
      })
      console.log(`  -> Deleted comma word\n`)
      merged++
    } else {
      // Update the word to remove comma
      console.log(`UPDATE: "${wordWithComma.word}" -> "${cleanWord}"`)
      await prisma.wordClassification.update({
        where: { id: wordWithComma.id },
        data: { 
          word: cleanWord,
          wordLower: cleanWordLower
        }
      })
      console.log(`  -> Updated\n`)
      updated++
    }
  }
  
  console.log(`\n=== Summary ===`)
  console.log(`Merged (deleted duplicates): ${merged}`)
  console.log(`Updated (removed comma): ${updated}`)
  
  await prisma.$disconnect()
}

main().catch(console.error)
