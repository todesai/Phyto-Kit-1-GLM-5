import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Get all words with their categories
    const allWords = await db.wordClassification.findMany({
      select: {
        id: true,
        word: true,
        wordLower: true,
        category: true,
        frequency: true,
        needsReview: true,
      },
      orderBy: { wordLower: 'asc' }
    })

    // Find duplicates (same wordLower appearing in multiple categories)
    const wordMap = new Map<string, typeof allWords>()
    
    for (const word of allWords) {
      const existing = wordMap.get(word.wordLower) || []
      existing.push(word)
      wordMap.set(word.wordLower, existing)
    }

    // Filter to only duplicates
    const duplicates: Array<{
      wordLower: string
      entries: typeof allWords
      suggestedCategory: string
      suggestedAction: 'merge' | 'review'
    }> = []

    for (const [wordLower, entries] of wordMap) {
      if (entries.length > 1) {
        // Determine best category based on priority
        const uniqueCategories = [...new Set(entries.map(e => e.category))]
        
        // Priority order for merging
        const categoryPriority: Record<string, number> = {
          'core': 1,
          'species': 2,
          'part': 2,
          'prepared': 2,
          'color': 3,
          'processing': 3,
          'form': 3,
          'descriptor': 4,
          'excluded': 5,
          'connector': 6,
          'unknown': 7,
        }

        // Find the best (lowest priority number) category
        let bestCategory = entries[0].category
        let bestPriority = categoryPriority[entries[0].category] || 7
        
        for (const entry of entries) {
          const priority = categoryPriority[entry.category] || 7
          if (priority < bestPriority) {
            bestPriority = priority
            bestCategory = entry.category
          }
        }

        // If one is 'unknown' and others are classified, suggest merge
        // If multiple are classified categories, suggest review
        const classifiedCategories = uniqueCategories.filter(c => c !== 'unknown')
        const action = classifiedCategories.length > 1 ? 'review' : 'merge'

        duplicates.push({
          wordLower,
          entries,
          suggestedCategory: action === 'merge' ? bestCategory : 'review',
          suggestedAction: action,
        })
      }
    }

    // Sort by frequency (most common first)
    duplicates.sort((a, b) => {
      const maxFreqA = Math.max(...a.entries.map(e => e.frequency))
      const maxFreqB = Math.max(...b.entries.map(e => e.frequency))
      return maxFreqB - maxFreqA
    })

    return NextResponse.json({
      total: allWords.length,
      duplicateWordCount: duplicates.length,
      duplicateEntryCount: duplicates.reduce((sum, d) => sum + d.entries.length, 0),
      duplicates: duplicates.slice(0, 100), // Return first 100
    })
  } catch (error) {
    console.error('Error finding duplicates:', error)
    return NextResponse.json({ error: 'Failed to find duplicates' }, { status: 500 })
  }
}
