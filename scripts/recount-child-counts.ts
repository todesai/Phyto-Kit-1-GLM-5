/**
 * Script to recount child counts for all parent ingredients
 * 
 * This script will:
 * 1. Find all items that are parents (isParent = true)
 * 2. Count how many items have parentIngredientId pointing to each parent
 * 3. Update the childCount field to the correct value
 * 
 * Run with: bun run scripts/recount-child-counts.ts
 */

import { db } from '../src/lib/db'

async function recountChildCounts() {
  console.log('Starting child count recount...\n')
  
  try {
    // Get all items that could be parents
    const allItems = await db.mexicanFood.findMany({
      select: {
        id: true,
        nombreEspanol: true,
        isParent: true,
        childCount: true
      }
    })

    console.log(`Found ${allItems.length} total items\n`)

    // Get all items with a parent
    const childrenWithParents = await db.mexicanFood.findMany({
      where: {
        parentIngredientId: { not: null }
      },
      select: {
        parentIngredientId: true
      }
    })

    // Count children per parent
    const parentCounts = new Map<string, number>()
    childrenWithParents.forEach(child => {
      if (child.parentIngredientId) {
        const current = parentCounts.get(child.parentIngredientId) || 0
        parentCounts.set(child.parentIngredientId, current + 1)
      }
    })

    console.log(`Found ${childrenWithParents.length} linked children`)
    console.log(`Distributed across ${parentCounts.size} parents\n`)

    // Update each parent with correct count
    let updated = 0
    let corrected = 0

    for (const item of allItems) {
      const correctCount = parentCounts.get(item.id) || 0
      
      if (item.childCount !== correctCount) {
        console.log(`Updating "${item.nombreEspanol}": ${item.childCount} → ${correctCount}`)
        
        await db.mexicanFood.update({
          where: { id: item.id },
          data: { 
            childCount: correctCount,
            isParent: correctCount > 0 ? true : item.isParent
          }
        })
        corrected++
      }
      updated++
    }

    console.log(`\n========================================`)
    console.log(`Summary:`)
    console.log(`- Total items checked: ${updated}`)
    console.log(`- Counts corrected: ${corrected}`)
    console.log(`- Counts already correct: ${updated - corrected}`)
    console.log(`========================================\n`)

  } catch (error) {
    console.error('Error during recount:', error)
    throw error
  }
}

// Run the script
recountChildCounts()
  .then(() => {
    console.log('Recount completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Recount failed:', error)
    process.exit(1)
  })
