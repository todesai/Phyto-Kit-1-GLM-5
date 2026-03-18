import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ============================================
// GET - Fetch completed parents
// ============================================
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    
    // Get all parents that are confirmed
    const allParents = await db.mexicanFood.findMany({
      where: {
        isParent: true,
        hierarchyStatus: 'confirmed'
      },
      select: {
        id: true,
        nombreEspanol: true,
        taxon: true,
        childCount: true,
        tipoAlimento: true
      },
      orderBy: { nombreEspanol: 'asc' }
    })
    
    // For each parent, check if it's complete
    const completedParents = []
    
    for (const parent of allParents) {
      // Get children
      const children = await db.mexicanFood.findMany({
        where: { parentIngredientId: parent.id },
        select: {
          id: true,
          nombreEspanol: true,
          taxon: true,
          scientificNameNotNeeded: true
        }
      })
      
      // Check for potential children (unprocessed items matching this parent name)
      // Items that contain the parent name but are NOT:
      // - The parent itself
      // - Already linked to a parent
      // - Marked as rejected or prepared
      const potentialChildren = await db.mexicanFood.count({
        where: {
          nombreEspanol: { contains: parent.nombreEspanol },
          isParent: false,
          parentIngredientId: null,
          hierarchyStatus: { notIn: ['rejected', 'prepared', 'confirmed'] }
        }
      })
      
      // Check for children without scientific name
      const noScientificName = children.filter(c => !c.taxon && !c.scientificNameNotNeeded)
      
      // Check for unknown words in children
      let hasUnknownWords = false
      for (const child of children) {
        const words = child.nombreEspanol.toLowerCase().replace(/\([^)]*\)/g, '').trim().split(/\s+/)
        for (const word of words) {
          const wc = await db.wordClassification.findFirst({
            where: { wordLower: word }
          })
          if (wc && wc.category === 'unknown') {
            hasUnknownWords = true
            break
          }
        }
        if (hasUnknownWords) break
      }
      
      // A parent is complete if:
      // - No potential children remaining
      // - All children have scientific names (or marked as not needed)
      // - No unknown words in children
      // - Either has children OR has taxon (standalone ingredient)
      const hasChildren = children.length > 0
      const hasTaxon = !!parent.taxon
      const noPotentialChildren = potentialChildren === 0
      const allChildrenHaveNames = noScientificName.length === 0
      const noUnknownWords = !hasUnknownWords
      
      const isComplete = noPotentialChildren && 
                        allChildrenHaveNames && 
                        noUnknownWords &&
                        (hasChildren || hasTaxon)
      
      if (isComplete) {
        completedParents.push({
          ...parent,
          childrenCount: children.length,
          children: children
        })
      }
    }
    
    // Apply search filter
    let filtered = completedParents
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = completedParents.filter(p => 
        p.nombreEspanol.toLowerCase().includes(searchLower) ||
        (p.taxon && p.taxon.toLowerCase().includes(searchLower))
      )
    }
    
    return NextResponse.json({
      success: true,
      parents: filtered,
      total: filtered.length
    })
  } catch (error) {
    console.error('Completed parents GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
