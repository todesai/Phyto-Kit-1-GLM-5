import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ============================================
// GET - Fetch potential children for a parent word
// ============================================
export async function GET(request: NextRequest) {
  try {
    // Prisma auto-connects on first query, no need for explicit $connect()
    
    const searchParams = request.nextUrl.searchParams
    const parentWord = searchParams.get('parentWord')
    const parentWordLower = searchParams.get('parentWordLower') || parentWord?.toLowerCase()
    const parentId = searchParams.get('parentId') // The actual parent ID for filtering linked children

    if (!parentWord || !parentWordLower) {
      return NextResponse.json({ error: 'parentWord required' }, { status: 400 })
    }

    // Excluded types
    const excludedTypes = ['VARIOS', 'ADEREZO']

    // Fetch all items and filter in memory (SQLite doesn't support mode: 'insensitive' well)
    // Exclude MANUALLY created parents - they should never be children of other parents
    const allItems = await db.mexicanFood.findMany({
      where: {
        tipoAlimento: { notIn: [...excludedTypes, 'MANUAL'] }
      },
      select: {
        id: true,
        nombreEspanol: true,
        taxon: true,
        tipoAlimento: true,
        isParent: true,
        parentIngredientId: true,
        hierarchyStatus: true,
        scientificNameNotNeeded: true,
        conservationStatus: true,
        notes: true
      }
    })

    // Filter children: contains parent word as a whole word, but is not exactly the parent word
    // For multi-word parents, use substring matching
    // For single-word parents, use word boundary matching to avoid false matches like "papa" matching "papaya"
    const isMultiWord = parentWordLower.includes(' ')
    
    const allMatchingItems = allItems.filter(item => {
      const nameLower = item.nombreEspanol.toLowerCase()
      
      let matchesParent: boolean
      if (isMultiWord) {
        // For multi-word parents, check if the item name contains the full parent name
        matchesParent = nameLower.includes(parentWordLower) && nameLower !== parentWordLower
      } else {
        // For single-word parents, use word boundary regex
        const wordBoundaryRegex = new RegExp(`\\b${parentWordLower}\\b`, 'i')
        matchesParent = wordBoundaryRegex.test(item.nombreEspanol) && nameLower !== parentWordLower
      }
      
      return matchesParent
    }).sort((a, b) => a.nombreEspanol.localeCompare(b.nombreEspanol))

    // Separate into linked and potential
    // IMPORTANT: Linked children must be linked to THIS parent (parentId), not to other parents
    // Also include items linked to this parent even if they don't match by name (for manually linked items)
    const linkedChildren = allItems.filter(item => {
      // Only show as linked if linked to THIS specific parent
      const isLinkedToThisParent = parentId && item.parentIngredientId === parentId
      return isLinkedToThisParent
    }).sort((a, b) => a.nombreEspanol.localeCompare(b.nombreEspanol))

    const potentialChildren = allMatchingItems.filter(item => {
      // Don't show items already linked to this parent (they're in linkedChildren)
      if (parentId && item.parentIngredientId === parentId) return false
      
      const isRejected = item.hierarchyStatus === 'rejected'
      const isPrepared = item.hierarchyStatus === 'prepared'
      const isConfirmed = item.hierarchyStatus === 'confirmed'
      const hasParent = item.parentIngredientId !== null
      const isParentItem = item.isParent === true
      return !isRejected && !isPrepared && !isConfirmed && !hasParent && !isParentItem
    })

    // Combine: linked first, then potential
    const children = [...linkedChildren, ...potentialChildren]

    // Also fetch word classifications for all words in these children
    const allWords = new Set<string>()
    children.forEach(child => {
      const words = child.nombreEspanol
        .replace(/\([^)]*\)/g, '')
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 0)
      words.forEach(w => allWords.add(w))
    })

    const wordClassifications = await db.wordClassification.findMany({
      where: {
        wordLower: { in: Array.from(allWords) }
      }
    })

    const wordMap = new Map(wordClassifications.map(w => [w.wordLower, w]))

    return NextResponse.json({
      success: true,
      children,
      wordClassifications: Object.fromEntries(wordMap),
      total: children.length,
      linkedCount: linkedChildren.length,
      potentialCount: potentialChildren.length
    })
  } catch (error) {
    console.error('Fetch children error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
