import { db } from './db'
import * as fs from 'fs'
import * as path from 'path'
import { createHash } from 'crypto'

// Force reload - regenerated Prisma client
// ============================================
// BACKUP SERVICE (File-Based)
// Backups are stored as JSON files in /backups folder
// Database stores only metadata for quick listing/searching
// ============================================

// 50MB size limit for backups folder
const MAX_BACKUP_SIZE_BYTES = 50 * 1024 * 1024

// Backups folder path
const BACKUPS_DIR = path.join(process.cwd(), 'backups')

export type BackupTrigger = 'manual' | 'hierarchy' | 'taxonomy' | 'conservation' | 'notes' | 'word_classification' | 'nutrition' | 'recipe' | 'auto'

interface BackupStats {
  totalParents: number
  totalChildren: number
  totalItems: number
  pendingItems: number
  totalWordClassifications: number
}

interface BackupFileData {
  version: string
  createdAt: string
  trigger: BackupTrigger
  triggerDescription?: string
  isIncremental: boolean
  previousBackupId?: string
  changesCount: number
  statistics: BackupStats
  data: {
    hierarchy?: any[]
    taxonomy?: any[]
    conservation?: any[]
    notes?: any[]
    wordClassifications?: any[]
    auditLogs?: any[]
    nutrition?: any[]
    recipes?: any[]
    fullSnapshot?: any[]
  }
  changes?: {
    hierarchy?: { added: any[]; modified: any[]; deleted: any[] }
    taxonomy?: { added: any[]; modified: any[]; deleted: any[] }
    conservation?: { added: any[]; modified: any[]; deleted: any[] }
    notes?: { added: any[]; modified: any[]; deleted: any[] }
    wordClassifications?: { added: any[]; modified: any[]; deleted: any[] }
    auditLogs?: { added: any[]; modified: any[]; deleted: any[] }
    nutrition?: { added: any[]; modified: any[]; deleted: any[] }
    recipes?: { added: any[]; modified: any[]; deleted: any[] }
  }
}

interface BackupOptions {
  trigger: BackupTrigger
  description?: string
  includeFullSnapshot?: boolean
  isAutomatic?: boolean
  isIncremental?: boolean
  // Selective snapshots
  includeHierarchy?: boolean
  includeTaxonomy?: boolean
  includeConservation?: boolean
  includeNotes?: boolean
  includeWordClassifications?: boolean
  includeAuditLogs?: boolean
  includeNutrition?: boolean
  includeRecipes?: boolean
}

interface RestoreOptions {
  restoreHierarchy?: boolean
  restoreTaxonomy?: boolean
  restoreConservation?: boolean
  restoreNotes?: boolean
  restoreWordClassifications?: boolean
  restoreAuditLogs?: boolean
  restoreNutrition?: boolean
  restoreRecipes?: boolean
}

interface SizeCheckResult {
  canCreate: boolean
  currentTotalSize: number
  wouldExceedLimit: boolean
  backupsToDelete?: Array<{ id: string; name: string; filePath: string; fileSizeBytes: number; createdAt: Date }>
}

/**
 * Ensure backups directory exists
 */
function ensureBackupsDir(): void {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true })
  }
}

/**
 * Calculate SHA-256 checksum of file content
 */
function calculateChecksum(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

/**
 * Get total size of backups folder
 */
function getBackupsFolderSize(): number {
  ensureBackupsDir()
  const files = fs.readdirSync(BACKUPS_DIR)
  let totalSize = 0
  for (const file of files) {
    const filePath = path.join(BACKUPS_DIR, file)
    const stats = fs.statSync(filePath)
    if (stats.isFile()) {
      totalSize += stats.size
    }
  }
  return totalSize
}

/**
 * Check if creating a new backup would exceed the size limit
 */
export async function checkBackupSizeLimit(): Promise<SizeCheckResult> {
  const allBackups = await db.backupRecord.findMany({
    where: { isDeleted: false },
    select: { id: true, name: true, filePath: true, fileSizeBytes: true, createdAt: true },
    orderBy: { createdAt: 'asc' }
  })
  
  const currentTotalSize = getBackupsFolderSize()
  const wouldExceedLimit = currentTotalSize >= MAX_BACKUP_SIZE_BYTES
  
  let backupsToDelete: Array<{ id: string; name: string; filePath: string; fileSizeBytes: number; createdAt: Date }> | undefined
  if (wouldExceedLimit) {
    // Calculate how many oldest backups need to be deleted to make room for ~5MB
    const targetSize = MAX_BACKUP_SIZE_BYTES - (5 * 1024 * 1024)
    let accumulatedSize = 0
    backupsToDelete = []
    
    for (const backup of allBackups) {
      if (currentTotalSize - accumulatedSize <= targetSize) break
      accumulatedSize += backup.fileSizeBytes || 0
      backupsToDelete.push({
        id: backup.id,
        name: backup.name,
        filePath: backup.filePath,
        fileSizeBytes: backup.fileSizeBytes || 0,
        createdAt: backup.createdAt
      })
    }
  }
  
  return {
    canCreate: !wouldExceedLimit,
    currentTotalSize,
    wouldExceedLimit,
    backupsToDelete
  }
}

/**
 * Get formatted size string
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Get the last backup for comparison (for incremental backups)
 */
async function getLastBackup(): Promise<{ id: string; filePath: string; createdAt: Date } | null> {
  const lastBackup = await db.backupRecord.findFirst({
    where: { isDeleted: false },
    orderBy: { createdAt: 'desc' },
    select: { id: true, filePath: true, createdAt: true }
  })
  return lastBackup
}

/**
 * Read backup file data
 */
function readBackupFile(filePath: string): BackupFileData | null {
  try {
    const fullPath = path.join(BACKUPS_DIR, path.basename(filePath))
    if (!fs.existsSync(fullPath)) return null
    const content = fs.readFileSync(fullPath, 'utf-8')
    return JSON.parse(content) as BackupFileData
  } catch (error) {
    console.error('Error reading backup file:', error)
    return null
  }
}

/**
 * Write backup file
 */
function writeBackupFile(fileName: string, data: BackupFileData): { filePath: string; sizeBytes: number; checksum: string } {
  ensureBackupsDir()
  const content = JSON.stringify(data, null, 2)
  const checksum = calculateChecksum(content)
  const sizeBytes = Buffer.byteLength(content, 'utf-8')
  
  // Use timestamp-based filename to avoid conflicts
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const safeFileName = `backup-${timestamp}-${fileName.replace(/[^a-zA-Z0-9-]/g, '_')}.json`
  const filePath = path.join(BACKUPS_DIR, safeFileName)
  
  fs.writeFileSync(filePath, content, 'utf-8')
  
  return {
    filePath: safeFileName, // Store relative path
    sizeBytes,
    checksum
  }
}

/**
 * Delete backup file
 */
function deleteBackupFile(filePath: string): boolean {
  try {
    const fullPath = path.join(BACKUPS_DIR, path.basename(filePath))
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
    }
    return true
  } catch (error) {
    console.error('Error deleting backup file:', error)
    return false
  }
}

/**
 * Get statistics for backup display
 */
async function getBackupStats(): Promise<BackupStats> {
  const [totalParents, totalChildren, totalItems, pendingItems, totalWordClassifications] = await Promise.all([
    db.mexicanFood.count({ where: { isParent: true } }),
    db.mexicanFood.count({ where: { parentIngredientId: { not: null } } }),
    db.mexicanFood.count(),
    db.mexicanFood.count({ where: { hierarchyStatus: 'pending' } }),
    db.wordClassification.count()
  ])
  
  return {
    totalParents,
    totalChildren,
    totalItems,
    pendingItems,
    totalWordClassifications
  }
}

/**
 * Create a backup of current data state
 * Stores backup as a JSON file, with metadata in database
 */
export async function createBackup(options: BackupOptions): Promise<{ success: boolean; backupId?: string; error?: string; sizeBytes?: number; isIncremental?: boolean; changesCount?: number }> {
  try {
    // Get current statistics
    const stats = await getBackupStats()
    
    // Default to include all if not specified
    const includeHierarchy = options.includeHierarchy !== false
    const includeTaxonomy = options.includeTaxonomy !== false
    const includeConservation = options.includeConservation !== false
    const includeNotes = options.includeNotes !== false
    const includeWordClassifications = options.includeWordClassifications !== false
    const includeAuditLogs = options.includeAuditLogs !== false
    const includeNutrition = options.includeNutrition !== false
    const includeRecipes = options.includeRecipes !== false
    
    // Check if we should create an incremental backup
    const lastBackup = await getLastBackup()
    const shouldUseIncremental = options.isIncremental !== false && lastBackup !== null
    
    let changesCount = 0
    let isIncremental = false
    
    // Prepare backup data
    const backupData: BackupFileData = {
      version: '2.0',
      createdAt: new Date().toISOString(),
      trigger: options.trigger,
      triggerDescription: options.description,
      isIncremental: false,
      changesCount: 0,
      statistics: stats,
      data: {},
      changes: {}
    }
    
    if (shouldUseIncremental && lastBackup) {
      // Read last backup for comparison
      const lastBackupData = readBackupFile(lastBackup.filePath)
      
      if (lastBackupData) {
        isIncremental = true
        backupData.isIncremental = true
        backupData.previousBackupId = lastBackup.id
        
        // Calculate changes for each data type
        if (includeHierarchy) {
          const currentHierarchy = await db.mexicanFood.findMany({
            where: {
              OR: [
                { isParent: true },
                { parentIngredientId: { not: null } }
              ]
            },
            select: {
              id: true,
              nombreEspanol: true,
              isParent: true,
              parentIngredientId: true,
              childCount: true,
              hierarchyStatus: true,
              updatedAt: true
            }
          })
          
          const oldHierarchy = lastBackupData.data.hierarchy || []
          const changes = calculateChanges(currentHierarchy, oldHierarchy, 'id')
          backupData.data.hierarchy = [...changes.added, ...changes.modified.map(c => c.new)]
          backupData.changes!.hierarchy = changes
          changesCount += changes.added.length + changes.modified.length + changes.deleted.length
        }
        
        if (includeTaxonomy) {
          const currentTaxonomy = await db.mexicanFood.findMany({
            where: {
              OR: [
                { taxon: { not: null } },
                { scientificNameNotNeeded: true }
              ]
            },
            select: {
              id: true,
              nombreEspanol: true,
              taxon: true,
              scientificNameNotNeeded: true,
              updatedAt: true
            }
          })
          
          const oldTaxonomy = lastBackupData.data.taxonomy || []
          const changes = calculateChanges(currentTaxonomy, oldTaxonomy, 'id')
          backupData.data.taxonomy = [...changes.added, ...changes.modified.map(c => c.new)]
          backupData.changes!.taxonomy = changes
          changesCount += changes.added.length + changes.modified.length + changes.deleted.length
        }
        
        if (includeConservation) {
          const currentConservation = await db.mexicanFood.findMany({
            where: { conservationStatus: { not: null } },
            select: {
              id: true,
              nombreEspanol: true,
              conservationStatus: true,
              updatedAt: true
            }
          })
          
          const oldConservation = lastBackupData.data.conservation || []
          const changes = calculateChanges(currentConservation, oldConservation, 'id')
          backupData.data.conservation = [...changes.added, ...changes.modified.map(c => c.new)]
          backupData.changes!.conservation = changes
          changesCount += changes.added.length + changes.modified.length + changes.deleted.length
        }
        
        if (includeNotes) {
          const currentNotes = await db.mexicanFood.findMany({
            where: { notes: { not: null } },
            select: {
              id: true,
              nombreEspanol: true,
              notes: true,
              updatedAt: true
            }
          })
          
          const oldNotes = lastBackupData.data.notes || []
          const changes = calculateChanges(currentNotes, oldNotes, 'id')
          backupData.data.notes = [...changes.added, ...changes.modified.map(c => c.new)]
          backupData.changes!.notes = changes
          changesCount += changes.added.length + changes.modified.length + changes.deleted.length
        }
        
        if (includeWordClassifications) {
          const currentWordClassifications = await db.wordClassification.findMany()
          const oldWordClassifications = lastBackupData.data.wordClassifications || []
          const changes = calculateChanges(currentWordClassifications, oldWordClassifications, 'id')
          backupData.data.wordClassifications = [...changes.added, ...changes.modified.map(c => c.new)]
          backupData.changes!.wordClassifications = changes
          changesCount += changes.added.length + changes.modified.length + changes.deleted.length
        }
        
        if (includeAuditLogs) {
          const currentAuditLogs = await db.hierarchyAuditLog.findMany({
            take: 1000,
            orderBy: { createdAt: 'desc' }
          })
          
          const oldAuditLogs = lastBackupData.data.auditLogs || []
          const changes = calculateChanges(currentAuditLogs, oldAuditLogs, 'id')
          backupData.data.auditLogs = changes.added // Only new audit logs
          backupData.changes!.auditLogs = changes
          changesCount += changes.added.length
        }
        
        if (includeNutrition) {
          const currentNutrition = await db.mexicanFood.findMany({
            where: { 
              OR: [
                { energia: { not: null } },
                { proteinaBruta: { not: null } },
                { hidratosCarbono: { not: null } }
              ]
            },
            select: {
              id: true,
              nombreEspanol: true,
              energia: true,
              proteinaBruta: true,
              hidratosCarbono: true,
              extractoEtereo: true,
              fibraDietariaTotal: true,
              calcio: true,
              hierro: true,
              vitaminaA: true,
              tiamina: true,
              riboflavina: true,
              niacina: true,
              acidoAscorbico: true,
              updatedAt: true
            }
          })
          
          const oldNutrition = lastBackupData.data.nutrition || []
          const changes = calculateChanges(currentNutrition, oldNutrition, 'id')
          backupData.data.nutrition = [...changes.added, ...changes.modified.map(c => c.new)]
          backupData.changes!.nutrition = changes
          changesCount += changes.added.length + changes.modified.length + changes.deleted.length
        }
        
        if (includeRecipes) {
          const currentRecipes = await db.recipe.findMany({
            include: { ingredients: true }
          })
          
          const oldRecipes = lastBackupData.data.recipes || []
          const changes = calculateChanges(currentRecipes, oldRecipes, 'id')
          backupData.data.recipes = [...changes.added, ...changes.modified.map(c => c.new)]
          backupData.changes!.recipes = changes
          changesCount += changes.added.length + changes.modified.length + changes.deleted.length
        }
        
        backupData.changesCount = changesCount
      }
    }
    
    // Full backup (or if incremental not possible)
    if (!isIncremental) {
      if (includeHierarchy) {
        backupData.data.hierarchy = await db.mexicanFood.findMany({
          where: {
            OR: [
              { isParent: true },
              { parentIngredientId: { not: null } }
            ]
          },
          select: {
            id: true,
            nombreEspanol: true,
            isParent: true,
            parentIngredientId: true,
            childCount: true,
            hierarchyStatus: true
          }
        })
      }
      
      if (includeTaxonomy) {
        backupData.data.taxonomy = await db.mexicanFood.findMany({
          where: {
            OR: [
              { taxon: { not: null } },
              { scientificNameNotNeeded: true }
            ]
          },
          select: {
            id: true,
            nombreEspanol: true,
            taxon: true,
            scientificNameNotNeeded: true
          }
        })
      }
      
      if (includeConservation) {
        backupData.data.conservation = await db.mexicanFood.findMany({
          where: { conservationStatus: { not: null } },
          select: {
            id: true,
            nombreEspanol: true,
            conservationStatus: true
          }
        })
      }
      
      if (includeNotes) {
        backupData.data.notes = await db.mexicanFood.findMany({
          where: { notes: { not: null } },
          select: {
            id: true,
            nombreEspanol: true,
            notes: true
          }
        })
      }
      
      if (includeWordClassifications) {
        backupData.data.wordClassifications = await db.wordClassification.findMany()
      }
      
      if (includeAuditLogs) {
        backupData.data.auditLogs = await db.hierarchyAuditLog.findMany({
          take: 1000,
          orderBy: { createdAt: 'desc' }
        })
      }
      
      if (includeNutrition) {
        backupData.data.nutrition = await db.mexicanFood.findMany({
          where: { 
            OR: [
              { energia: { not: null } },
              { proteinaBruta: { not: null } },
              { hidratosCarbono: { not: null } }
            ]
          },
          select: {
            id: true,
            nombreEspanol: true,
            energia: true,
            proteinaBruta: true,
            hidratosCarbono: true,
            extractoEtereo: true,
            fibraDietariaTotal: true,
            calcio: true,
            hierro: true,
            vitaminaA: true,
            tiamina: true,
            riboflavina: true,
            niacina: true,
            acidoAscorbico: true
          }
        })
      }
      
      if (includeRecipes) {
        backupData.data.recipes = await db.recipe.findMany({
          include: { ingredients: true }
        })
      }
      
      if (options.includeFullSnapshot) {
        backupData.data.fullSnapshot = await db.mexicanFood.findMany()
        backupData.includesFullSnapshot = true
      }
    }
    
    // Write backup file
    const backupName = `Backup - ${new Date().toLocaleString()}`
    const { filePath, sizeBytes, checksum } = writeBackupFile(backupName, backupData)
    
    // Create database record with metadata
    const backup = await db.backupRecord.create({
      data: {
        name: backupName,
        trigger: options.trigger,
        triggerDescription: options.description || null,
        filePath,
        fileName: path.basename(filePath),
        fileSizeBytes: sizeBytes,
        checksum,
        isIncremental,
        previousBackupId: isIncremental ? lastBackup?.id : null,
        changesCount,
        includesHierarchy: includeHierarchy && (backupData.data.hierarchy?.length || 0) > 0,
        includesTaxonomy: includeTaxonomy && (backupData.data.taxonomy?.length || 0) > 0,
        includesConservation: includeConservation && (backupData.data.conservation?.length || 0) > 0,
        includesNotes: includeNotes && (backupData.data.notes?.length || 0) > 0,
        includesWordClassifications: includeWordClassifications && (backupData.data.wordClassifications?.length || 0) > 0,
        includesAuditLogs: includeAuditLogs && (backupData.data.auditLogs?.length || 0) > 0,
        includesNutrition: includeNutrition && (backupData.data.nutrition?.length || 0) > 0,
        includesRecipes: includeRecipes && (backupData.data.recipes?.length || 0) > 0,
        includesFullSnapshot: options.includeFullSnapshot || false,
        totalParents: stats.totalParents,
        totalChildren: stats.totalChildren,
        totalItems: stats.totalItems,
        pendingItems: stats.pendingItems,
        totalWordClassifications: stats.totalWordClassifications,
        isAutomatic: options.isAutomatic || false
      }
    })
    
    return { 
      success: true, 
      backupId: backup.id, 
      sizeBytes, 
      isIncremental,
      changesCount
    }
  } catch (error) {
    console.error('Backup creation failed:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Calculate changes between current and old data
 */
function calculateChanges(
  currentData: any[], 
  oldData: any[], 
  idField: string
): { added: any[]; modified: any[]; deleted: any[] } {
  const oldIds = new Set(oldData.map(item => item[idField]))
  const oldMap = new Map(oldData.map(item => [item[idField], item]))
  
  const added: any[] = []
  const modified: any[] = []
  const deleted: any[] = []
  
  const currentIds = new Set(currentData.map(item => item[idField]))
  
  // Find added and modified
  for (const item of currentData) {
    if (!oldIds.has(item[idField])) {
      added.push(item)
    } else {
      const oldItem = oldMap.get(item[idField])
      if (oldItem && JSON.stringify(oldItem) !== JSON.stringify(item)) {
        modified.push({ old: oldItem, new: item })
      }
    }
  }
  
  // Find deleted
  for (const item of oldData) {
    if (!currentIds.has(item[idField])) {
      deleted.push(item)
    }
  }
  
  return { added, modified, deleted }
}

/**
 * Check if a backup is needed and create one automatically
 */
export async function autoBackupIfNeeded(trigger: BackupTrigger, description: string): Promise<boolean> {
  try {
    // Check if there have been changes since last backup
    const lastBackup = await db.backupRecord.findFirst({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' }
    })
    
    // Get last audit log entry
    const lastAudit = await db.hierarchyAuditLog.findFirst({
      orderBy: { createdAt: 'desc' }
    })
    
    // If there's an audit log newer than the last backup, we need a backup
    const needsBackup = !lastBackup || 
      (lastAudit && new Date(lastAudit.createdAt) > new Date(lastBackup.createdAt))
    
    if (needsBackup) {
      console.log(`[Backup] Creating automatic backup: ${description}`)
      const result = await createBackup({
        trigger,
        description,
        isAutomatic: true,
        isIncremental: true
      })
      return result.success
    }
    
    return true // No backup needed
  } catch (error) {
    console.error('Auto backup check failed:', error)
    return false
  }
}

/**
 * List all backups
 */
export async function listBackups(limit: number = 20): Promise<Array<{
  id: string
  name: string
  trigger: string
  triggerDescription: string | null
  totalParents: number
  totalChildren: number
  totalItems: number
  pendingItems: number
  totalWordClassifications: number
  fileSizeBytes: number
  isAutomatic: boolean
  isIncremental: boolean
  changesCount: number
  includesHierarchy: boolean
  includesTaxonomy: boolean
  includesConservation: boolean
  includesNotes: boolean
  includesWordClassifications: boolean
  includesAuditLogs: boolean
  includesNutrition: boolean
  includesRecipes: boolean
  createdAt: Date
}>> {
  return db.backupRecord.findMany({
    where: { isDeleted: false },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      name: true,
      trigger: true,
      triggerDescription: true,
      totalParents: true,
      totalChildren: true,
      totalItems: true,
      pendingItems: true,
      totalWordClassifications: true,
      fileSizeBytes: true,
      isAutomatic: true,
      isIncremental: true,
      changesCount: true,
      includesHierarchy: true,
      includesTaxonomy: true,
      includesConservation: true,
      includesNotes: true,
      includesWordClassifications: true,
      includesAuditLogs: true,
      includesNutrition: true,
      includesRecipes: true,
      createdAt: true
    }
  })
}

/**
 * Get backup details by ID (including file data)
 */
export async function getBackupDetails(backupId: string) {
  const record = await db.backupRecord.findUnique({
    where: { id: backupId }
  })
  
  if (!record) return null
  
  const fileData = readBackupFile(record.filePath)
  
  return {
    ...record,
    fileData
  }
}

/**
 * Delete a backup (soft delete + file removal)
 */
export async function deleteBackup(backupId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const backup = await db.backupRecord.findUnique({
      where: { id: backupId }
    })
    
    if (!backup) {
      return { success: false, error: 'Backup not found' }
    }
    
    // Delete the file
    deleteBackupFile(backup.filePath)
    
    // Soft delete in database
    await db.backupRecord.update({
      where: { id: backupId },
      data: { isDeleted: true }
    })
    
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Delete multiple backups
 */
export async function deleteBackups(backupIds: string[]): Promise<{ success: boolean; deleted: number; error?: string }> {
  try {
    const backups = await db.backupRecord.findMany({
      where: { id: { in: backupIds } }
    })
    
    // Delete files
    for (const backup of backups) {
      deleteBackupFile(backup.filePath)
    }
    
    // Soft delete in database
    const result = await db.backupRecord.updateMany({
      where: { id: { in: backupIds } },
      data: { isDeleted: true }
    })
    
    return { success: true, deleted: result.count }
  } catch (error) {
    return { success: false, error: String(error), deleted: 0 }
  }
}

/**
 * Restore from a backup with selective parts
 */
export async function restoreBackup(
  backupId: string, 
  options: RestoreOptions = {},
  dryRun: boolean = true
): Promise<{ 
  success: boolean
  changes?: {
    hierarchy: number
    taxonomy: number
    conservation: number
    notes: number
    wordClassifications: number
    auditLogs: number
    nutrition: number
    recipes: number
  }
  isIncremental?: boolean
  error?: string 
}> {
  try {
    const backup = await db.backupRecord.findUnique({ where: { id: backupId } })
    
    if (!backup) {
      return { success: false, error: 'Backup not found' }
    }
    
    const fileData = readBackupFile(backup.filePath)
    
    if (!fileData) {
      return { success: false, error: 'Backup file not found or corrupted' }
    }
    
    // Determine what to restore
    const restoreHierarchy = options.restoreHierarchy !== false && backup.includesHierarchy
    const restoreTaxonomy = options.restoreTaxonomy !== false && backup.includesTaxonomy
    const restoreConservation = options.restoreConservation !== false && backup.includesConservation
    const restoreNotes = options.restoreNotes !== false && backup.includesNotes
    const restoreWordClassifications = options.restoreWordClassifications !== false && backup.includesWordClassifications
    const restoreAuditLogs = options.restoreAuditLogs !== false && backup.includesAuditLogs
    const restoreNutrition = options.restoreNutrition !== false && backup.includesNutrition
    const restoreRecipes = options.restoreRecipes !== false && backup.includesRecipes
    
    const data = fileData.data
    
    if (dryRun) {
      return {
        success: true,
        isIncremental: backup.isIncremental,
        changes: {
          hierarchy: restoreHierarchy ? (data.hierarchy?.length || 0) : 0,
          taxonomy: restoreTaxonomy ? (data.taxonomy?.length || 0) : 0,
          conservation: restoreConservation ? (data.conservation?.length || 0) : 0,
          notes: restoreNotes ? (data.notes?.length || 0) : 0,
          wordClassifications: restoreWordClassifications ? (data.wordClassifications?.length || 0) : 0,
          auditLogs: restoreAuditLogs ? (data.auditLogs?.length || 0) : 0,
          nutrition: restoreNutrition ? (data.nutrition?.length || 0) : 0,
          recipes: restoreRecipes ? (data.recipes?.length || 0) : 0
        }
      }
    }
    
    // Create a backup before restoring
    await createBackup({
      trigger: 'manual',
      description: `Pre-restore backup (restoring from ${backup.name})`,
      isIncremental: true
    })
    
    // Restore data
    if (restoreHierarchy && data.hierarchy) {
      for (const item of data.hierarchy) {
        await db.mexicanFood.update({
          where: { id: item.id },
          data: {
            isParent: item.isParent,
            parentIngredientId: item.parentIngredientId,
            childCount: item.childCount,
            hierarchyStatus: item.hierarchyStatus
          }
        })
      }
    }
    
    if (restoreTaxonomy && data.taxonomy) {
      for (const item of data.taxonomy) {
        await db.mexicanFood.update({
          where: { id: item.id },
          data: {
            taxon: item.taxon,
            scientificNameNotNeeded: item.scientificNameNotNeeded
          }
        })
      }
    }
    
    if (restoreConservation && data.conservation) {
      for (const item of data.conservation) {
        await db.mexicanFood.update({
          where: { id: item.id },
          data: { conservationStatus: item.conservationStatus }
        })
      }
    }
    
    if (restoreNotes && data.notes) {
      for (const item of data.notes) {
        await db.mexicanFood.update({
          where: { id: item.id },
          data: { notes: item.notes }
        })
      }
    }
    
    if (restoreWordClassifications && data.wordClassifications) {
      const wordIds = data.wordClassifications.map((w: any) => w.id)
      await db.wordClassification.deleteMany({
        where: { id: { in: wordIds } }
      })
      
      for (const item of data.wordClassifications) {
        await db.wordClassification.create({
          data: {
            id: item.id,
            word: item.word,
            wordLower: item.wordLower,
            category: item.category,
            subcategory: item.subcategory,
            priority: item.priority,
            examples: item.examples,
            frequency: item.frequency,
            needsReview: item.needsReview,
            reviewedBy: item.reviewedBy,
            reviewedAt: item.reviewedAt,
            notes: item.notes,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt)
          }
        })
      }
    }
    
    if (restoreAuditLogs && data.auditLogs) {
      const existingIds = new Set(
        (await db.hierarchyAuditLog.findMany({
          select: { id: true }
        })).map(l => l.id)
      )
      
      for (const item of data.auditLogs) {
        if (!existingIds.has(item.id)) {
          await db.hierarchyAuditLog.create({
            data: {
              id: item.id,
              itemId: item.itemId,
              itemName: item.itemName,
              action: item.action,
              oldParentId: item.oldParentId,
              oldParentName: item.oldParentName,
              oldStatus: item.oldStatus,
              oldNotes: item.oldNotes,
              newParentId: item.newParentId,
              newParentName: item.newParentName,
              newStatus: item.newStatus,
              newNotes: item.newNotes,
              reviewedBy: item.reviewedBy,
              reason: item.reason,
              createdAt: new Date(item.createdAt)
            }
          })
        }
      }
    }
    
    if (restoreNutrition && data.nutrition) {
      for (const item of data.nutrition) {
        await db.mexicanFood.update({
          where: { id: item.id },
          data: {
            energia: item.energia,
            proteinaBruta: item.proteinaBruta,
            hidratosCarbono: item.hidratosCarbono,
            extractoEtereo: item.extractoEtereo,
            fibraDietariaTotal: item.fibraDietariaTotal,
            calcio: item.calcio,
            hierro: item.hierro,
            vitaminaA: item.vitaminaA,
            tiamina: item.tiamina,
            riboflavina: item.riboflavina,
            niacina: item.niacina,
            acidoAscorbico: item.acidoAscorbico
          }
        })
      }
    }
    
    return {
      success: true,
      isIncremental: backup.isIncremental,
      changes: {
        hierarchy: restoreHierarchy ? (data.hierarchy?.length || 0) : 0,
        taxonomy: restoreTaxonomy ? (data.taxonomy?.length || 0) : 0,
        conservation: restoreConservation ? (data.conservation?.length || 0) : 0,
        notes: restoreNotes ? (data.notes?.length || 0) : 0,
        wordClassifications: restoreWordClassifications ? (data.wordClassifications?.length || 0) : 0,
        auditLogs: restoreAuditLogs ? (data.auditLogs?.length || 0) : 0,
        nutrition: restoreNutrition ? (data.nutrition?.length || 0) : 0,
        recipes: restoreRecipes ? (data.recipes?.length || 0) : 0
      }
    }
  } catch (error) {
    console.error('Restore failed:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Get backup statistics for display
 */
export async function getBackupStatistics() {
  const stats = await getBackupStats()
  const lastBackup = await db.backupRecord.findFirst({
    where: { isDeleted: false },
    orderBy: { createdAt: 'desc' }
  })
  
  const totalBackups = await db.backupRecord.count({ where: { isDeleted: false } })
  const automaticBackups = await db.backupRecord.count({ where: { isDeleted: false, isAutomatic: true } })
  const manualBackups = await db.backupRecord.count({ where: { isDeleted: false, isAutomatic: false } })
  const incrementalBackups = await db.backupRecord.count({ where: { isDeleted: false, isIncremental: true } })
  const fullBackups = await db.backupRecord.count({ where: { isDeleted: false, isIncremental: false } })
  
  const totalSizeBytes = getBackupsFolderSize()
  
  return {
    ...stats,
    lastBackup: lastBackup?.createdAt || null,
    lastBackupIncremental: lastBackup?.isIncremental || false,
    totalBackups,
    automaticBackups,
    manualBackups,
    incrementalBackups,
    fullBackups,
    totalSizeBytes,
    maxBackupSizeBytes: MAX_BACKUP_SIZE_BYTES,
    usagePercent: Math.round((totalSizeBytes / MAX_BACKUP_SIZE_BYTES) * 100)
  }
}
