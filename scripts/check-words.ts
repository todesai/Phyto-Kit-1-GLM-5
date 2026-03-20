import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const allWords = await prisma.wordClassification.findMany({
    select: { id: true, word: true, wordLower: true, category: true }
  })
  
  // Check for remaining comma issues
  const wordsWithCommas = allWords.filter(w => w.word.endsWith(',') || w.wordLower.endsWith(','))
  console.log(`Words still with trailing commas: ${wordsWithCommas.length}`)
  
  // Check for words with other trailing punctuation
  const wordsWithPunctuation = allWords.filter(w => 
    w.word.match(/[.,;:!?]$/) || w.wordLower.match(/[.,;:!?]$/)
  )
  console.log(`\nWords with other trailing punctuation:`)
  for (const w of wordsWithPunctuation.slice(0, 20)) {
    console.log(`  "${w.word}" (${w.category})`)
  }
  if (wordsWithPunctuation.length > 20) {
    console.log(`  ... and ${wordsWithPunctuation.length - 20} more`)
  }
  
  // Check for words with leading punctuation
  const wordsWithLeadingPunct = allWords.filter(w => 
    w.word.match(/^[.,;:!?]/) || w.wordLower.match(/^[.,;:!?]/)
  )
  console.log(`\nWords with leading punctuation: ${wordsWithLeadingPunct.length}`)
  for (const w of wordsWithLeadingPunct.slice(0, 10)) {
    console.log(`  "${w.word}" (${w.category})`)
  }
  
  // Check for duplicate wordLower entries
  const wordLowerCounts = new Map<string, number>()
  for (const w of allWords) {
    wordLowerCounts.set(w.wordLower, (wordLowerCounts.get(w.wordLower) || 0) + 1)
  }
  const duplicates = Array.from(wordLowerCounts.entries()).filter(([_, count]) => count > 1)
  console.log(`\nDuplicate wordLower entries: ${duplicates.length}`)
  for (const [word, count] of duplicates.slice(0, 10)) {
    console.log(`  "${word}": ${count} times`)
  }
  
  // Check for words that differ only in wordLower vs word
  const mismatchedCase = allWords.filter(w => w.word.toLowerCase() !== w.wordLower)
  console.log(`\nWords where wordLower doesn't match word.toLowerCase(): ${mismatchedCase.length}`)
  for (const w of mismatchedCase.slice(0, 10)) {
    console.log(`  word="${w.word}" vs wordLower="${w.wordLower}"`)
  }
  
  await prisma.$disconnect()
}

main().catch(console.error)
