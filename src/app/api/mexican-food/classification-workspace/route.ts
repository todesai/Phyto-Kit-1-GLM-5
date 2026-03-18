import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { autoBackupIfNeeded } from '@/lib/backup-service'
import { normalizeForMatching } from '@/lib/utils'

// ============================================
// GET - Fetch parent candidates (single-word items)
// ============================================
export async function GET(request: NextRequest) {
  try {
    // Prisma auto-connects on first query, no need for explicit $connect()
    
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const filter = searchParams.get('filter') || 'all'
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Excluded types
    const excludedTypes = ['VARIOS', 'ADEREZO']

    // Find all single-word items that are NOT in excluded types
    // Also include manually created parents (tipoAlimento = 'MANUAL')
    const allCandidates = await db.mexicanFood.findMany({
      where: {
        OR: [
          { NOT: { tipoAlimento: { in: excludedTypes } } },
          { tipoAlimento: 'MANUAL' }
        ]
      },
      select: {
        id: true,
        nombreEspanol: true,
        isParent: true,
        childCount: true,
        tipoAlimento: true,
        taxon: true,
        parentIngredientId: true,
        hierarchyStatus: true,
        scientificNameNotNeeded: true,
        conservationStatus: true,
        notes: true
      }
    })

    // Get all word classifications to check for "unknown" words
    const wordClassifications = await db.wordClassification.findMany({
      select: { wordLower: true, category: true }
    })
    const unknownWords = new Set(
      wordClassifications.filter(w => w.category === 'unknown').map(w => w.wordLower)
    )

    // Get all children (items with parentIngredientId) to check completion
    const allChildren = await db.mexicanFood.findMany({
      where: { parentIngredientId: { not: null } },
      select: { 
        id: true, 
        nombreEspanol: true, 
        parentIngredientId: true, 
        taxon: true,
        scientificNameNotNeeded: true
      }
    })

    // Filter to single words only, BUT always include manually created parents
    const singleWordCandidates = allCandidates.filter(item => {
      // Always include manually created parents (they can be multi-word)
      if (item.tipoAlimento === 'MANUAL') return true
      // For other items, filter to single words only
      const name = item.nombreEspanol.replace(/\([^)]*\)/g, '').trim()
      return !name.includes(' ')
    })

    // Group by normalized name (lowercase)
    const candidateMap = new Map<string, {
      word: string
      wordLower: string
      itemIds: string[]
      isParent: boolean
      childCount: number
      tipoAlimento: string | null
      taxon: string | null
    }>()

    for (const item of singleWordCandidates) {
      const wordLower = item.nombreEspanol.toLowerCase()
      const existing = candidateMap.get(wordLower)
      
      if (existing) {
        existing.itemIds.push(item.id)
        if (item.isParent) existing.isParent = true
        existing.childCount += item.childCount
        // Keep taxon if available
        if (item.taxon && !existing.taxon) existing.taxon = item.taxon
      } else {
        candidateMap.set(wordLower, {
          word: item.nombreEspanol,
          wordLower,
          itemIds: [item.id],
          isParent: item.isParent,
          childCount: item.childCount,
          tipoAlimento: item.tipoAlimento,
          taxon: item.taxon
        })
      }
    }

    // Now find potential children for each candidate
    // A potential child contains the parent word as a whole word in its name
    const candidates = Array.from(candidateMap.values())

    // Helper function to check if a word has unknown classification
    const hasUnknownWords = (name: string): boolean => {
      const words = name.toLowerCase().replace(/\([^)]*\)/g, '').trim().split(/\s+/)
      return words.some(w => unknownWords.has(w))
    }

    // Helper function to check if a parent is complete
    // Complete = confirmed + all potential children processed (linked/rejected/prepared) + all linked children have scientific names (or marked as not needed) + all words classified
    const isParentComplete = (
      isParent: boolean, 
      itemWordLower: string, 
      childCount: number, 
      potentialChildren: number
    ): boolean => {
      // Must be confirmed as parent
      if (!isParent) return false
      
      // Must have no potential children remaining (all processed: linked, rejected, or prepared)
      if (potentialChildren > 0) return false
      
      // If no children linked, check if there were any to begin with
      // If childCount === 0 and potentialChildren === 0, it means either:
      // - No matching items existed (nothing to do) - not complete
      // - All matching items were rejected/prepared - complete
      if (childCount === 0) {
        // Check if this parent had any matching items that are now rejected or prepared
        const rejectedOrPrepared = allCandidates.filter(item => {
          const nameLower = item.nombreEspanol.toLowerCase()
          const isMultiWord = itemWordLower.includes(' ')
          const matchesName = isMultiWord 
            ? nameLower.includes(itemWordLower) && nameLower !== itemWordLower
            : new RegExp(`\\b${itemWordLower}\\b`, 'i').test(item.nombreEspanol) && nameLower !== itemWordLower
          return matchesName && (item.hierarchyStatus === 'rejected' || item.hierarchyStatus === 'prepared')
        })
        // If no rejected/prepared and no linked children, nothing was done - not complete
        if (rejectedOrPrepared.length === 0) return false
        return true // All items were rejected/prepared
      }
      
      // Get all children for this parent (by word match since parentIngredientId links to specific item ID)
      const children = allChildren.filter(c => {
        const parentName = allCandidates.find(p => p.id === c.parentIngredientId)?.nombreEspanol.toLowerCase()
        return parentName === itemWordLower || (parentName && itemWordLower.includes(parentName))
      })
      if (children.length === 0) {
        // Fallback: check if any items are linked with this parent word
        const linkedItems = allCandidates.filter(item => {
          const nameLower = item.nombreEspanol.toLowerCase()
          const isMultiWord = itemWordLower.includes(' ')
          const matchesName = isMultiWord 
            ? nameLower.includes(itemWordLower) && nameLower !== itemWordLower
            : new RegExp(`\\b${itemWordLower}\\b`, 'i').test(item.nombreEspanol) && nameLower !== itemWordLower
          return matchesName && item.parentIngredientId !== null
        })
        if (linkedItems.length === 0) return false
        
        // Check all linked items have scientific names (or marked as not needed) and no unknown words
        const allHaveScientificName = linkedItems.every(c => c.taxon !== null || c.scientificNameNotNeeded)
        if (!allHaveScientificName) return false
        const allWordsClassified = linkedItems.every(c => !hasUnknownWords(c.nombreEspanol))
        return allWordsClassified
      }
      
      // Check all children have scientific names (or marked as not needed)
      const allHaveScientificName = children.every(c => c.taxon !== null || c.scientificNameNotNeeded)
      if (!allHaveScientificName) return false
      
      // Check all children have no unknown words
      const allWordsClassified = children.every(c => !hasUnknownWords(c.nombreEspanol))
      return allWordsClassified
    }

    // Reuse allCandidates data instead of making a second query
    // Filter multi-word items in memory for each candidate
    const candidatesWithMatches = candidates.map((candidate) => {
      // For multi-word parents, use substring matching
      // For single-word parents, use word boundary regex
      const isMultiWord = candidate.wordLower.includes(' ')
      
      let potentialChildren: number
      if (isMultiWord) {
        // For multi-word parents, check if the item name contains the full parent name
        potentialChildren = allCandidates.filter(item => {
          const nameLower = item.nombreEspanol.toLowerCase()
          // Match if contains the parent name but is not exactly the same
          const matchesName = nameLower.includes(candidate.wordLower) && 
                 nameLower !== candidate.wordLower
          // Exclude items that are already processed (parent, linked, rejected, prepared)
          const isProcessed = item.isParent || 
                              item.parentIngredientId !== null || 
                              item.hierarchyStatus === 'rejected' ||
                              item.hierarchyStatus === 'prepared' ||
                              item.hierarchyStatus === 'confirmed'
          return matchesName && !isProcessed
        }).length
      } else {
        // For single-word parents, use word boundary regex
        const wordBoundaryRegex = new RegExp(`\\b${candidate.wordLower}\\b`, 'i')
        potentialChildren = allCandidates.filter(item => {
          const nameLower = item.nombreEspanol.toLowerCase()
          // Match if contains the candidate word as a whole word but is not exactly the same
          const matchesName = wordBoundaryRegex.test(item.nombreEspanol) && 
                 nameLower !== candidate.wordLower
          // Exclude items that are already processed (parent, linked, rejected, prepared)
          const isProcessed = item.isParent || 
                              item.parentIngredientId !== null || 
                              item.hierarchyStatus === 'rejected' ||
                              item.hierarchyStatus === 'prepared' ||
                              item.hierarchyStatus === 'confirmed'
          return matchesName && !isProcessed
        }).length
      }

      // Check if this parent is complete
      const isComplete = isParentComplete(candidate.isParent, candidate.wordLower, candidate.childCount, potentialChildren)

      // Calculate children without scientific name and with unknown words
      // Get linked children for this parent
      const linkedChildren = allCandidates.filter(item => {
        const nameLower = item.nombreEspanol.toLowerCase()
        const isMultiWord = candidate.wordLower.includes(' ')
        const matchesName = isMultiWord 
          ? nameLower.includes(candidate.wordLower) && nameLower !== candidate.wordLower
          : new RegExp(`\\b${candidate.wordLower}\\b`, 'i').test(item.nombreEspanol) && nameLower !== candidate.wordLower
        return matchesName && item.parentIngredientId !== null
      })

      // Children without scientific name (excluding those marked as not needed)
      const childrenWithoutScientificName = linkedChildren.filter(c => c.taxon === null && !c.scientificNameNotNeeded).length
      const childrenWithUnknownWords = linkedChildren.filter(c => hasUnknownWords(c.nombreEspanol)).length

      return {
        word: candidate.word,
        wordLower: candidate.wordLower,
        itemId: candidate.itemIds[0], // First item ID for linking
        potentialChildren,
        isParent: candidate.isParent,
        currentChildren: candidate.childCount,
        tipoAlimento: candidate.tipoAlimento,
        taxon: candidate.taxon,
        isComplete,
        childrenWithoutScientificName,
        childrenWithUnknownWords
      }
    })

    // Count completed parents before filtering
    const completedCount = candidatesWithMatches.filter(c => c.isComplete).length

    // Filter out complete parents (they don't need work)
    const activeCandidates = candidatesWithMatches.filter(c => !c.isComplete)

    // Apply search filter
    let filtered = activeCandidates
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(c => c.wordLower.includes(searchLower))
    }

    // Apply type filter (existing matches filter)
    if (filter === 'hasChildren') {
      filtered = filtered.filter(c => c.potentialChildren > 0)
    } else if (filter === 'unmatched') {
      filtered = filtered.filter(c => c.potentialChildren === 0)
    }

    // Apply work filter (new filter for work needed)
    const workFilter = searchParams.get('workFilter') || 'all'
    if (workFilter === 'notConfirmed') {
      // Parents not yet confirmed but have potential children
      filtered = filtered.filter(c => !c.isParent && c.potentialChildren > 0)
    } else if (workFilter === 'hasPendingChildren') {
      // Has potential children waiting to be processed
      filtered = filtered.filter(c => c.potentialChildren > 0)
    } else if (workFilter === 'needsScientificName') {
      // Has children without scientific names
      filtered = filtered.filter(c => (c.childrenWithoutScientificName || 0) > 0)
    } else if (workFilter === 'needsWordClassification') {
      // Has children with unknown words
      filtered = filtered.filter(c => (c.childrenWithUnknownWords || 0) > 0)
    }

    // Sort: has matches first, then alphabetically
    filtered.sort((a, b) => {
      if (b.potentialChildren !== a.potentialChildren) {
        return b.potentialChildren - a.potentialChildren
      }
      return a.wordLower.localeCompare(b.wordLower)
    })

    const total = filtered.length
    const paginated = filtered.slice(offset, offset + limit)

    // Total items including completed ones (before filtering)
    const totalAllItems = candidatesWithMatches.length

    // Count confirmed parents in the filtered list (what's shown in left panel)
    const confirmedParents = filtered.filter(c => c.isParent).length

    // Count unconfirmed candidates that have potential children (need attention)
    const unconfirmedWithChildren = filtered.filter(c => !c.isParent && c.potentialChildren > 0).length

    // Count children without scientific names (items with parentIngredientId but no taxon)
    const childrenWithoutScientificName = await db.mexicanFood.count({
      where: {
        parentIngredientId: { not: null },
        taxon: null
      }
    })

    // Total pending links (items not yet linked to a parent)
    const pendingLinks = await db.mexicanFood.count({
      where: {
        parentIngredientId: null,
        isParent: false,
        tipoAlimento: { notIn: excludedTypes }
      }
    })

    return NextResponse.json({
      success: true,
      candidates: paginated,
      total,
      totalAllItems,
      completedCount,
      confirmedParents,
      unconfirmedWithChildren,
      childrenWithoutScientificName,
      pendingLinks,
      pagination: {
        limit,
        offset,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Classification workspace GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// POST - Various classification actions
// ============================================
export async function POST(request: NextRequest) {
  try {
    // Prisma auto-connects on first query, no need for explicit $connect()
    
    const body = await request.json()
    const { action } = body

    // Set an item as parent
    if (action === 'set-as-parent') {
      const { itemId, scientificName } = body
      if (!itemId) {
        return NextResponse.json({ error: 'itemId required' }, { status: 400 })
      }

      // Determine if we're setting, changing, or clearing the scientific name
      const isClearing = scientificName === ''
      const taxonValue = isClearing ? null : (scientificName || undefined)

      const food = await db.mexicanFood.update({
        where: { id: itemId },
        data: {
          isParent: true,
          hierarchyStatus: 'confirmed',
          hierarchyReviewedBy: 'user',
          hierarchyReviewedAt: new Date(),
          // Handle taxon: clear it (null), set it (value), or leave unchanged (undefined)
          ...(taxonValue !== undefined ? { taxon: taxonValue } : {})
        }
      })

      // Create audit log
      await db.hierarchyAuditLog.create({
        data: {
          itemId,
          itemName: food.nombreEspanol,
          action: 'set_as_parent',
          oldStatus: 'pending',
          newStatus: 'confirmed',
          reviewedBy: 'user',
          reason: isClearing 
            ? 'Removed scientific name from parent ingredient'
            : (scientificName 
              ? `Manually set as parent ingredient with scientific name: ${scientificName}`
              : 'Manually set as parent ingredient')
        }
      })

      return NextResponse.json({ success: true, food, scientificName })
    }

    // Link children to a parent
    if (action === 'link-children') {
      const { childIds, parentId } = body
      if (!childIds?.length || !parentId) {
        return NextResponse.json({ error: 'childIds and parentId required' }, { status: 400 })
      }

      // Auto-backup before hierarchy change
      await autoBackupIfNeeded('hierarchy', `Link ${childIds.length} children to parent`)

      const parent = await db.mexicanFood.findUnique({
        where: { id: parentId },
        select: { nombreEspanol: true, childCount: true }
      })

      // Update all children
      await db.mexicanFood.updateMany({
        where: { id: { in: childIds } },
        data: {
          parentIngredientId: parentId,
          hierarchyStatus: 'confirmed',
          hierarchyReviewedBy: 'user',
          hierarchyReviewedAt: new Date()
        }
      })

      // Update parent child count and get the new count
      const updatedParent = await db.mexicanFood.update({
        where: { id: parentId },
        data: {
          childCount: { increment: childIds.length },
          isParent: true
        },
        select: { childCount: true }
      })

      // Create audit logs
      const children = await db.mexicanFood.findMany({
        where: { id: { in: childIds } },
        select: { id: true, nombreEspanol: true }
      })

      await db.hierarchyAuditLog.createMany({
        data: children.map(c => ({
          itemId: c.id,
          itemName: c.nombreEspanol,
          action: 'link_child',
          newParentId: parentId,
          newParentName: parent?.nombreEspanol,
          newStatus: 'confirmed',
          reviewedBy: 'user'
        }))
      })

      return NextResponse.json({
        success: true,
        linked: childIds.length,
        parentChildCount: updatedParent.childCount
      })
    }

    // Reject children (make them standalone)
    if (action === 'reject-children') {
      const { childIds } = body
      if (!childIds?.length) {
        return NextResponse.json({ error: 'childIds required' }, { status: 400 })
      }

      // Auto-backup before hierarchy change
      await autoBackupIfNeeded('hierarchy', `Reject ${childIds.length} children`)

      // Get children to find their parent
      const children = await db.mexicanFood.findMany({
        where: { id: { in: childIds } },
        select: { id: true, nombreEspanol: true, parentIngredientId: true }
      })

      // Count linked children per parent
      const parentCountMap = new Map<string, number>()
      for (const child of children) {
        if (child.parentIngredientId) {
          const count = parentCountMap.get(child.parentIngredientId) || 0
          parentCountMap.set(child.parentIngredientId, count + 1)
        }
      }

      // Decrement parent child counts
      for (const [parentId, count] of parentCountMap.entries()) {
        await db.mexicanFood.update({
          where: { id: parentId },
          data: { childCount: { decrement: count } }
        })
      }

      // Update children to be standalone
      await db.mexicanFood.updateMany({
        where: { id: { in: childIds } },
        data: {
          parentIngredientId: null,
          hierarchyStatus: 'rejected',
          hierarchyReviewedBy: 'user',
          hierarchyReviewedAt: new Date()
        }
      })

      // Create audit logs
      await db.hierarchyAuditLog.createMany({
        data: children.map(c => ({
          itemId: c.id,
          itemName: c.nombreEspanol,
          action: 'reject_child',
          newStatus: 'rejected',
          reviewedBy: 'user',
          reason: 'Manually rejected as child'
        }))
      })

      return NextResponse.json({
        success: true,
        rejected: childIds.length
      })
    }

    // Mark children as prepared items (processed/prepared foods)
    if (action === 'mark-prepared') {
      const { childIds } = body
      if (!childIds?.length) {
        return NextResponse.json({ error: 'childIds required' }, { status: 400 })
      }

      // Auto-backup before hierarchy change
      await autoBackupIfNeeded('hierarchy', `Mark ${childIds.length} as prepared`)

      // Get children to find their parent
      const children = await db.mexicanFood.findMany({
        where: { id: { in: childIds } },
        select: { id: true, nombreEspanol: true, parentIngredientId: true }
      })

      // Count linked children per parent
      const parentCountMap = new Map<string, number>()
      for (const child of children) {
        if (child.parentIngredientId) {
          const count = parentCountMap.get(child.parentIngredientId) || 0
          parentCountMap.set(child.parentIngredientId, count + 1)
        }
      }

      // Decrement parent child counts
      for (const [parentId, count] of parentCountMap.entries()) {
        await db.mexicanFood.update({
          where: { id: parentId },
          data: { childCount: { decrement: count } }
        })
      }

      // Update children to be prepared items
      await db.mexicanFood.updateMany({
        where: { id: { in: childIds } },
        data: {
          parentIngredientId: null,
          hierarchyStatus: 'prepared',
          hierarchyReviewedBy: 'user',
          hierarchyReviewedAt: new Date()
        }
      })

      // Create audit logs
      await db.hierarchyAuditLog.createMany({
        data: children.map(c => ({
          itemId: c.id,
          itemName: c.nombreEspanol,
          action: 'mark_prepared',
          newStatus: 'prepared',
          reviewedBy: 'user',
          reason: 'Marked as prepared/processed food item'
        }))
      })

      return NextResponse.json({
        success: true,
        markedPrepared: childIds.length
      })
    }

    // Make a child a parent
    if (action === 'upgrade-to-parent') {
      const { itemId, scientificName } = body
      if (!itemId) {
        return NextResponse.json({ error: 'itemId required' }, { status: 400 })
      }

      const food = await db.mexicanFood.findUnique({
        where: { id: itemId },
        select: { nombreEspanol: true, parentIngredientId: true }
      })

      if (!food) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }

      // Remove from old parent if linked
      if (food.parentIngredientId) {
        await db.mexicanFood.update({
          where: { id: food.parentIngredientId },
          data: { childCount: { decrement: 1 } }
        })
      }

      // Set as parent
      const updated = await db.mexicanFood.update({
        where: { id: itemId },
        data: {
          isParent: true,
          parentIngredientId: null,
          childCount: 0,
          hierarchyStatus: 'confirmed',
          hierarchyReviewedBy: 'user',
          hierarchyReviewedAt: new Date(),
          // Save scientific name to taxon field if provided
          ...(scientificName ? { taxon: scientificName } : {})
        }
      })

      // Create audit log
      await db.hierarchyAuditLog.create({
        data: {
          itemId,
          itemName: food.nombreEspanol,
          action: 'upgrade_to_parent',
          oldParentId: food.parentIngredientId,
          oldStatus: 'child',
          newStatus: 'parent',
          reviewedBy: 'user',
          reason: scientificName 
            ? `Upgraded from child to parent with scientific name: ${scientificName}`
            : 'Upgraded from child to parent'
        }
      })

      return NextResponse.json({ success: true, food: updated })
    }

    // Create a new parent ingredient (for ingredients not in the database)
    if (action === 'create-parent') {
      const { name, scientificName } = body
      if (!name) {
        return NextResponse.json({ error: 'name required' }, { status: 400 })
      }

      // Check if parent already exists
      const existingParent = await db.mexicanFood.findFirst({
        where: {
          nombreEspanol: name,
          isParent: true
        }
      })

      if (existingParent) {
        return NextResponse.json({ 
          error: `Parent "${name}" already exists`,
          existingParent 
        }, { status: 400 })
      }

      // Get the max conabioId to create a new one (use negative for manual entries)
      const maxConabioId = await db.mexicanFood.findFirst({
        orderBy: { conabioId: 'desc' },
        select: { conabioId: true }
      })

      const newConabioId = (maxConabioId?.conabioId || 0) + 1

      // Create the new parent entry
      const newParent = await db.mexicanFood.create({
        data: {
          conabioId: newConabioId,
          nombreEspanol: name,
          isParent: true,
          childCount: 0,
          hierarchyStatus: 'confirmed',
          hierarchyReviewedBy: 'user',
          hierarchyReviewedAt: new Date(),
          taxon: scientificName || null,
          claveOriginal: `MANUAL-${name.toUpperCase()}`,
          tipoAlimento: 'MANUAL',
          descripcionAlimento: `Manually created parent ingredient`
        }
      })

      // Create audit log
      await db.hierarchyAuditLog.create({
        data: {
          itemId: newParent.id,
          itemName: name,
          action: 'create_parent',
          oldStatus: 'new',
          newStatus: 'confirmed',
          reviewedBy: 'user',
          reason: scientificName 
            ? `Manually created parent with scientific name: ${scientificName}`
            : 'Manually created parent ingredient'
        }
      })

      return NextResponse.json({ success: true, parent: newParent })
    }

    // Demote a parent to be a child of another parent
    if (action === 'demote-to-child') {
      const { itemId, newParentId } = body
      if (!itemId || !newParentId) {
        return NextResponse.json({ error: 'itemId and newParentId required' }, { status: 400 })
      }

      // Get the item to demote
      const itemToDemote = await db.mexicanFood.findUnique({
        where: { id: itemId },
        select: { id: true, nombreEspanol: true, childCount: true, isParent: true }
      })

      if (!itemToDemote) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }

      // Get the new parent
      const newParent = await db.mexicanFood.findUnique({
        where: { id: newParentId },
        select: { id: true, nombreEspanol: true, childCount: true }
      })

      if (!newParent) {
        return NextResponse.json({ error: 'New parent not found' }, { status: 404 })
      }

      // Find all children of the item being demoted
      const childrenOfDemoted = await db.mexicanFood.findMany({
        where: { parentIngredientId: itemId },
        select: { id: true }
      })

      // Move children to the new parent
      if (childrenOfDemoted.length > 0) {
        await db.mexicanFood.updateMany({
          where: { parentIngredientId: itemId },
          data: { parentIngredientId: newParentId }
        })
      }

      // Demote the item
      const updated = await db.mexicanFood.update({
        where: { id: itemId },
        data: {
          isParent: false,
          parentIngredientId: newParentId,
          childCount: 0,
          hierarchyStatus: 'confirmed',
          hierarchyReviewedBy: 'user',
          hierarchyReviewedAt: new Date()
        }
      })

      // Update the new parent's child count (+1 for demoted item + children moved)
      const totalNewChildren = 1 + childrenOfDemoted.length
      await db.mexicanFood.update({
        where: { id: newParentId },
        data: { childCount: { increment: totalNewChildren } }
      })

      // Create audit log
      await db.hierarchyAuditLog.create({
        data: {
          itemId,
          itemName: itemToDemote.nombreEspanol,
          action: 'demote_to_child',
          oldStatus: 'parent',
          newStatus: 'child',
          newParentId,
          newParentName: newParent.nombreEspanol,
          reviewedBy: 'user',
          reason: `Demoted from parent to child of "${newParent.nombreEspanol}"${childrenOfDemoted.length > 0 ? `. ${childrenOfDemoted.length} children moved to new parent.` : ''}`
        }
      })

      return NextResponse.json({ 
        success: true, 
        demoted: updated,
        childrenMoved: childrenOfDemoted.length
      })
    }

    // Set scientific name on children
    if (action === 'set-scientific-name') {
      const { childIds, scientificName } = body
      if (!childIds?.length || !scientificName) {
        return NextResponse.json({ error: 'childIds and scientificName required' }, { status: 400 })
      }

      // Auto-backup before taxonomy change
      await autoBackupIfNeeded('taxonomy', `Set scientific name "${scientificName}" for ${childIds.length} items`)

      // Update children with the scientific name
      await db.mexicanFood.updateMany({
        where: { id: { in: childIds } },
        data: {
          taxon: scientificName,
          hierarchyReviewedBy: 'user',
          hierarchyReviewedAt: new Date()
        }
      })

      // Create audit logs
      const children = await db.mexicanFood.findMany({
        where: { id: { in: childIds } },
        select: { id: true, nombreEspanol: true }
      })

      await db.hierarchyAuditLog.createMany({
        data: children.map(c => ({
          itemId: c.id,
          itemName: c.nombreEspanol,
          action: 'set_scientific_name',
          reviewedBy: 'user',
          reason: `Set scientific name: ${scientificName}`
        }))
      })

      return NextResponse.json({
        success: true,
        updated: childIds.length
      })
    }

    // Mark items as not needing scientific name
    if (action === 'mark-no-scientific-name') {
      const { childIds } = body
      if (!childIds?.length) {
        return NextResponse.json({ error: 'childIds required' }, { status: 400 })
      }

      // Update children to mark as not needing scientific name
      await db.mexicanFood.updateMany({
        where: { id: { in: childIds } },
        data: {
          scientificNameNotNeeded: true,
          hierarchyReviewedBy: 'user',
          hierarchyReviewedAt: new Date()
        }
      })

      // Create audit logs
      const children = await db.mexicanFood.findMany({
        where: { id: { in: childIds } },
        select: { id: true, nombreEspanol: true }
      })

      await db.hierarchyAuditLog.createMany({
        data: children.map(c => ({
          itemId: c.id,
          itemName: c.nombreEspanol,
          action: 'mark_no_scientific_name',
          reviewedBy: 'user',
          reason: 'Marked as not needing scientific name (processed/derived ingredient)'
        }))
      })

      return NextResponse.json({
        success: true,
        updated: childIds.length
      })
    }

    // Update conservation status for an item
    if (action === 'update-conservation-status') {
      const { itemId, conservationStatus } = body
      if (!itemId) {
        return NextResponse.json({ error: 'itemId required' }, { status: 400 })
      }

      // Auto-backup before conservation status change
      await autoBackupIfNeeded('conservation', `Update conservation status for item ${itemId}`)

      const food = await db.mexicanFood.update({
        where: { id: itemId },
        data: {
          conservationStatus: conservationStatus || null,
          hierarchyReviewedBy: 'user',
          hierarchyReviewedAt: new Date()
        }
      })

      // Create audit log
      await db.hierarchyAuditLog.create({
        data: {
          itemId,
          itemName: food.nombreEspanol,
          action: 'update_conservation_status',
          reviewedBy: 'user',
          reason: conservationStatus 
            ? `Updated conservation status: ${conservationStatus.substring(0, 100)}...`
            : 'Cleared conservation status'
        }
      })

      return NextResponse.json({ success: true, food })
    }

    // Update notes for an item
    if (action === 'update-notes') {
      const { itemId, notes } = body
      if (!itemId) {
        return NextResponse.json({ error: 'itemId required' }, { status: 400 })
      }

      // Auto-backup before notes change
      await autoBackupIfNeeded('notes', `Update notes for item ${itemId}`)

      const food = await db.mexicanFood.update({
        where: { id: itemId },
        data: {
          notes: notes || null,
          hierarchyReviewedBy: 'user',
          hierarchyReviewedAt: new Date()
        }
      })

      // Create audit log
      await db.hierarchyAuditLog.create({
        data: {
          itemId,
          itemName: food.nombreEspanol,
          action: 'update_notes',
          reviewedBy: 'user',
          reason: notes 
            ? `Updated notes: ${notes.substring(0, 100)}...`
            : 'Cleared notes'
        }
      })

      return NextResponse.json({ success: true, food })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Classification workspace POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
