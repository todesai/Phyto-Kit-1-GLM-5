/**
 * Change Tracking System
 * 
 * Tracks what data has changed since the last backup
 * Enables incremental backups and change summaries
 */

import { db } from '@/lib/db'

// ============================================
// TYPES
// ============================================

export interface ChangeSummary {
  notes: {
    added: number
    updated: number
    deleted: number
    items: ChangeItem[]
  }
  hierarchy: {
    linksCreated: number
    linksRemoved: number
    parentsCreated: number
    statusChanges: number
    items: ChangeItem[]
  }
  taxonomy: {
    scientificNamesSet: number
    items: ChangeItem[]
  }
  conservation: {
    added: number
    updated: number
    items: ChangeItem[]
  }
  wordClassification: {
    added: number
    updated: number
    deleted: number
    items: ChangeItem[]
  }
  nutrition: {
    updated: number
    items: ChangeItem[]
  }
  recipes: {
    added: number
    updated: number
    deleted: number
    items: ChangeItem[]
  }
  auditLogs: {
    added: number
  }
  totalChanges: number
}

export interface ChangeItem {
  id: string
  name: string
  changeType: 'create' | 'update' | 'delete'
  field?: string
  oldValue?: string | null
  newValue?: string | null
  timestamp: Date
}

export interface BackupSnapshot {
  timestamp: Date
  counts: {
    mexicanFoodTotal: number
    mexicanFoodWithNotes: number
    mexicanFoodWithConservation: number
    mexicanFoodParents: number
    mexicanFoodChildren: number
    mexicanFoodWithTaxon: number
    wordClassifications: number
    recipes: number
    auditLogs: number
  }
  // Hashes of key fields for change detection
  hashes: {
    notesHash: string
    hierarchyHash: string
    taxonomyHash: string
    conservationHash: string
    wordClassHash: string
  }
}

// ============================================
// SNAPSHOT CREATION
// ============================================

/**
 * Create a snapshot of current database state
 * Used for change detection between backups
 */
export async function createSnapshot(): Promise<BackupSnapshot> {
  // Get counts
  const [
    mexicanFoodTotal,
    mexicanFoodWithNotes,
    mexicanFoodWithConservation,
    mexicanFoodParents,
    mexicanFoodChildren,
    mexicanFoodWithTaxon,
    wordClassifications,
    recipes,
    auditLogs
  ] = await Promise.all([
    db.mexicanFood.count(),
    db.mexicanFood.count({ where: { notes: { not: null } } }),
    db.mexicanFood.count({ where: { conservationStatus: { not: null } } }),
    db.mexicanFood.count({ where: { isParent: true } }),
    db.mexicanFood.count({ where: { parentIngredientId: { not: null } } }),
    db.mexicanFood.count({ where: { taxon: { not: null } } }),
    db.wordClassification.count(),
    db.recipe.count(),
    db.hierarchyAuditLog.count()
  ])

  // Get hashes for change detection
  const notesItems = await db.mexicanFood.findMany({
    where: { notes: { not: null } },
    select: { id: true, notes: true, updatedAt: true },
    orderBy: { id: 'asc' }
  })

  const hierarchyItems = await db.mexicanFood.findMany({
    where: { 
      OR: [
        { isParent: true },
        { parentIngredientId: { not: null } }
      ]
    },
    select: { id: true, parentIngredientId: true, isParent: true, hierarchyStatus: true, updatedAt: true },
    orderBy: { id: 'asc' }
  })

  const taxonomyItems = await db.mexicanFood.findMany({
    where: { taxon: { not: null } },
    select: { id: true, taxon: true, updatedAt: true },
    orderBy: { id: 'asc' }
  })

  const conservationItems = await db.mexicanFood.findMany({
    where: { conservationStatus: { not: null } },
    select: { id: true, conservationStatus: true, updatedAt: true },
    orderBy: { id: 'asc' }
  })

  const wordClassItems = await db.wordClassification.findMany({
    select: { id: true, word: true, category: true, updatedAt: true },
    orderBy: { id: 'asc' }
  })

  return {
    timestamp: new Date(),
    counts: {
      mexicanFoodTotal,
      mexicanFoodWithNotes,
      mexicanFoodWithConservation,
      mexicanFoodParents,
      mexicanFoodChildren,
      mexicanFoodWithTaxon,
      wordClassifications,
      recipes,
      auditLogs
    },
    hashes: {
      notesHash: hashData(notesItems),
      hierarchyHash: hashData(hierarchyItems),
      taxonomyHash: hashData(taxonomyItems),
      conservationHash: hashData(conservationItems),
      wordClassHash: hashData(wordClassItems)
    }
  }
}

// ============================================
// CHANGE DETECTION
// ============================================

/**
 * Compare two snapshots and generate a change summary
 */
export async function generateChangeSummary(
  previousSnapshot: BackupSnapshot | null,
  currentSnapshot: BackupSnapshot
): Promise<ChangeSummary> {
  const summary: ChangeSummary = {
    notes: { added: 0, updated: 0, deleted: 0, items: [] },
    hierarchy: { linksCreated: 0, linksRemoved: 0, parentsCreated: 0, statusChanges: 0, items: [] },
    taxonomy: { scientificNamesSet: 0, items: [] },
    conservation: { added: 0, updated: 0, items: [] },
    wordClassification: { added: 0, updated: 0, deleted: 0, items: [] },
    nutrition: { updated: 0, items: [] },
    recipes: { added: 0, updated: 0, deleted: 0, items: [] },
    auditLogs: { added: 0 },
    totalChanges: 0
  }

  if (!previousSnapshot) {
    // First backup - all data is "new"
    summary.notes.added = currentSnapshot.counts.mexicanFoodWithNotes
    summary.hierarchy.linksCreated = currentSnapshot.counts.mexicanFoodChildren
    summary.hierarchy.parentsCreated = currentSnapshot.counts.mexicanFoodParents
    summary.conservation.added = currentSnapshot.counts.mexicanFoodWithConservation
    summary.wordClassification.added = currentSnapshot.counts.wordClassifications
    summary.recipes.added = currentSnapshot.counts.recipes
    summary.auditLogs.added = currentSnapshot.counts.auditLogs
    summary.totalChanges = 
      summary.notes.added + 
      summary.hierarchy.linksCreated + 
      summary.hierarchy.parentsCreated +
      summary.conservation.added + 
      summary.wordClassification.added + 
      summary.recipes.added
    return summary
  }

  // Detect changes by comparing counts and hashes
  if (previousSnapshot.hashes.notesHash !== currentSnapshot.hashes.notesHash) {
    const changes = await detectNotesChanges(previousSnapshot.timestamp)
    summary.notes = changes
  }

  if (previousSnapshot.hashes.hierarchyHash !== currentSnapshot.hashes.hierarchyHash) {
    const changes = await detectHierarchyChanges(previousSnapshot.timestamp)
    summary.hierarchy = changes
  }

  if (previousSnapshot.hashes.taxonomyHash !== currentSnapshot.hashes.taxonomyHash) {
    const changes = await detectTaxonomyChanges(previousSnapshot.timestamp)
    summary.taxonomy = changes
  }

  if (previousSnapshot.hashes.conservationHash !== currentSnapshot.hashes.conservationHash) {
    const changes = await detectConservationChanges(previousSnapshot.timestamp)
    summary.conservation = changes
  }

  if (previousSnapshot.hashes.wordClassHash !== currentSnapshot.hashes.wordClassHash) {
    const changes = await detectWordClassChanges(previousSnapshot.timestamp)
    summary.wordClassification = changes
  }

  // Count new audit logs
  summary.auditLogs.added = Math.max(0, 
    currentSnapshot.counts.auditLogs - previousSnapshot.counts.auditLogs
  )

  // Calculate total
  summary.totalChanges = 
    summary.notes.added + summary.notes.updated + summary.notes.deleted +
    summary.hierarchy.linksCreated + summary.hierarchy.linksRemoved + 
    summary.hierarchy.parentsCreated + summary.hierarchy.statusChanges +
    summary.taxonomy.scientificNamesSet +
    summary.conservation.added + summary.conservation.updated +
    summary.wordClassification.added + summary.wordClassification.updated + summary.wordClassification.deleted +
    summary.nutrition.updated +
    summary.recipes.added + summary.recipes.updated + summary.recipes.deleted

  return summary
}

// ============================================
// SPECIFIC CHANGE DETECTORS
// ============================================

async function detectNotesChanges(since: Date): Promise<ChangeSummary['notes']> {
  const result: ChangeSummary['notes'] = { added: 0, updated: 0, deleted: 0, items: [] }

  // Check audit logs for notes changes
  const auditChanges = await db.hierarchyAuditLog.findMany({
    where: {
      action: 'update_notes',
      createdAt: { gte: since }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  })

  for (const log of auditChanges) {
    const isAdding = !log.oldNotes && log.newNotes
    const isDeleting = log.oldNotes && !log.newNotes
    const isUpdating = log.oldNotes && log.newNotes

    if (isAdding) result.added++
    else if (isDeleting) result.deleted++
    else if (isUpdating) result.updated++

    result.items.push({
      id: log.itemId,
      name: log.itemName,
      changeType: isAdding ? 'create' : isDeleting ? 'delete' : 'update',
      field: 'notes',
      oldValue: log.oldNotes ? truncateText(log.oldNotes, 100) : null,
      newValue: log.newNotes ? truncateText(log.newNotes, 100) : null,
      timestamp: log.createdAt
    })
  }

  return result
}

async function detectHierarchyChanges(since: Date): Promise<ChangeSummary['hierarchy']> {
  const result: ChangeSummary['hierarchy'] = { 
    linksCreated: 0, linksRemoved: 0, parentsCreated: 0, statusChanges: 0, items: [] 
  }

  // Check audit logs for hierarchy changes
  const auditChanges = await db.hierarchyAuditLog.findMany({
    where: {
      createdAt: { gte: since },
      action: { 
        in: ['link_child', 'reject_child', 'set_as_parent', 'create_parent', 'confirm_parent', 'upgrade_to_parent']
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  })

  for (const log of auditChanges) {
    if (log.action === 'link_child') {
      result.linksCreated++
      result.items.push({
        id: log.itemId,
        name: log.itemName,
        changeType: 'create',
        field: 'parentLink',
        oldValue: log.oldParentName || 'None',
        newValue: log.newParentName || 'None',
        timestamp: log.createdAt
      })
    } else if (log.action === 'reject_child') {
      result.linksRemoved++
      result.items.push({
        id: log.itemId,
        name: log.itemName,
        changeType: 'delete',
        field: 'parentLink',
        oldValue: log.oldParentName || 'None',
        newValue: 'None',
        timestamp: log.createdAt
      })
    } else if (['set_as_parent', 'create_parent', 'upgrade_to_parent'].includes(log.action)) {
      result.parentsCreated++
      result.items.push({
        id: log.itemId,
        name: log.itemName,
        changeType: 'create',
        field: 'isParent',
        oldValue: 'false',
        newValue: 'true',
        timestamp: log.createdAt
      })
    }

    if (log.oldStatus !== log.newStatus) {
      result.statusChanges++
    }
  }

  return result
}

async function detectTaxonomyChanges(since: Date): Promise<ChangeSummary['taxonomy']> {
  const result: ChangeSummary['taxonomy'] = { scientificNamesSet: 0, items: [] }

  // Check audit logs for scientific name changes
  const auditChanges = await db.hierarchyAuditLog.findMany({
    where: {
      action: 'set_scientific_name',
      createdAt: { gte: since }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  })

  for (const log of auditChanges) {
    result.scientificNamesSet++
    result.items.push({
      id: log.itemId,
      name: log.itemName,
      changeType: 'update',
      field: 'taxon',
      oldValue: null,
      newValue: log.reason?.replace('Set scientific name: ', '') || null,
      timestamp: log.createdAt
    })
  }

  return result
}

async function detectConservationChanges(since: Date): Promise<ChangeSummary['conservation']> {
  const result: ChangeSummary['conservation'] = { added: 0, updated: 0, items: [] }

  // Check audit logs for conservation changes
  const auditChanges = await db.hierarchyAuditLog.findMany({
    where: {
      action: 'update_conservation_status',
      createdAt: { gte: since }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  })

  for (const log of auditChanges) {
    // Can't easily determine if new or updated from audit log, count as updated
    result.updated++
    result.items.push({
      id: log.itemId,
      name: log.itemName,
      changeType: 'update',
      field: 'conservationStatus',
      oldValue: null, // Not stored in audit log
      newValue: null,
      timestamp: log.createdAt
    })
  }

  return result
}

async function detectWordClassChanges(since: Date): Promise<ChangeSummary['wordClassification']> {
  const result: ChangeSummary['wordClassification'] = { added: 0, updated: 0, deleted: 0, items: [] }

  // Check for recently created/updated word classifications
  const recent = await db.wordClassification.findMany({
    where: {
      updatedAt: { gte: since }
    },
    orderBy: { updatedAt: 'desc' },
    take: 100
  })

  for (const item of recent) {
    // Check if it was created (createdAt close to updatedAt)
    const isRecentCreation = 
      Math.abs(item.createdAt.getTime() - item.updatedAt.getTime()) < 1000

    if (isRecentCreation) {
      result.added++
      result.items.push({
        id: item.id,
        name: item.word,
        changeType: 'create',
        field: 'category',
        newValue: item.category,
        timestamp: item.updatedAt
      })
    } else {
      result.updated++
      result.items.push({
        id: item.id,
        name: item.word,
        changeType: 'update',
        field: 'category',
        newValue: item.category,
        timestamp: item.updatedAt
      })
    }
  }

  return result
}

// ============================================
// HELPERS
// ============================================

function hashData(data: unknown): string {
  const str = JSON.stringify(data)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(16)
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

// ============================================
// INCREMENTAL BACKUP DATA
// ============================================

export interface IncrementalBackupData {
  notes: Array<{
    id: string
    nombreEspanol: string
    notes: string | null
    action: 'create' | 'update' | 'delete'
  }>
  hierarchy: Array<{
    id: string
    nombreEspanol: string
    parentIngredientId: string | null
    parentName: string | null
    isParent: boolean
    hierarchyStatus: string | null
    action: 'create' | 'update' | 'delete'
  }>
  taxonomy: Array<{
    id: string
    nombreEspanol: string
    taxon: string | null
    action: 'create' | 'update' | 'delete'
  }>
  conservation: Array<{
    id: string
    nombreEspanol: string
    conservationStatus: string | null
    taxon: string | null
    action: 'create' | 'update' | 'delete'
  }>
  wordClassifications: Array<{
    id: string
    word: string
    category: string
    subcategory: string | null
    action: 'create' | 'update' | 'delete'
  }>
}

/**
 * Extract changed data since last backup for incremental backup
 */
export async function extractIncrementalData(since: Date): Promise<IncrementalBackupData> {
  // Get items with notes that changed
  const notesChanges = await db.hierarchyAuditLog.findMany({
    where: {
      action: 'update_notes',
      createdAt: { gte: since }
    },
    include: {
      item: {
        select: { id: true, nombreEspanol: true, notes: true }
      }
    }
  })

  // Get hierarchy changes
  const hierarchyChanges = await db.hierarchyAuditLog.findMany({
    where: {
      action: { in: ['link_child', 'reject_child', 'set_as_parent', 'create_parent', 'confirm_parent'] },
      createdAt: { gte: since }
    },
    include: {
      item: {
        select: { 
          id: true, 
          nombreEspanol: true, 
          parentIngredientId: true, 
          isParent: true, 
          hierarchyStatus: true,
          parent: { select: { nombreEspanol: true } }
        }
      }
    }
  })

  // Get conservation changes
  const conservationChanges = await db.hierarchyAuditLog.findMany({
    where: {
      action: 'update_conservation_status',
      createdAt: { gte: since }
    },
    include: {
      item: {
        select: { id: true, nombreEspanol: true, conservationStatus: true, taxon: true }
      }
    }
  })

  // Get taxonomy changes (scientific names)
  const taxonomyChanges = await db.hierarchyAuditLog.findMany({
    where: {
      action: 'set_scientific_name',
      createdAt: { gte: since }
    },
    include: {
      item: {
        select: { id: true, nombreEspanol: true, taxon: true }
      }
    }
  })

  // Get word classification changes
  const wordClassChanges = await db.wordClassification.findMany({
    where: {
      updatedAt: { gte: since }
    },
    select: { id: true, word: true, category: true, subcategory: true, createdAt: true, updatedAt: true }
  })

  return {
    notes: notesChanges.map(log => ({
      id: log.itemId,
      nombreEspanol: log.item?.nombreEspanol || log.itemName,
      notes: log.newNotes,
      action: (!log.oldNotes && log.newNotes) ? 'create' : 
              (log.oldNotes && !log.newNotes) ? 'delete' : 'update'
    })),
    hierarchy: hierarchyChanges.map(log => ({
      id: log.itemId,
      nombreEspanol: log.item?.nombreEspanol || log.itemName,
      parentIngredientId: log.item?.parentIngredientId || null,
      parentName: log.item?.parent?.nombreEspanol || log.newParentName || null,
      isParent: log.item?.isParent || false,
      hierarchyStatus: log.item?.hierarchyStatus || null,
      action: log.action === 'reject_child' ? 'delete' : 
              ['set_as_parent', 'create_parent'].includes(log.action) ? 'create' : 'update'
    })),
    taxonomy: taxonomyChanges.map(log => ({
      id: log.itemId,
      nombreEspanol: log.item?.nombreEspanol || log.itemName,
      taxon: log.item?.taxon || null,
      action: 'update'
    })),
    conservation: conservationChanges.map(log => ({
      id: log.itemId,
      nombreEspanol: log.item?.nombreEspanol || log.itemName,
      conservationStatus: log.item?.conservationStatus || null,
      taxon: log.item?.taxon || null,
      action: 'update'
    })),
    wordClassifications: wordClassChanges.map(item => {
      const isRecentCreation = 
        Math.abs(item.createdAt.getTime() - item.updatedAt.getTime()) < 1000
      return {
        id: item.id,
        word: item.word,
        category: item.category,
        subcategory: item.subcategory,
        action: isRecentCreation ? 'create' : 'update'
      }
    })
  }
}
