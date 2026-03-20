/**
 * Migration script to convert old backup format to new incremental-aware format
 * 
 * Run with: bun run scripts/migrate-backups.ts
 */

import fs from 'fs'
import path from 'path'

const BACKUP_DIR = path.join(process.cwd(), 'db', 'backups')
const METADATA_FILE = path.join(BACKUP_DIR, 'backup-metadata.json')
const SNAPSHOT_FILE = path.join(BACKUP_DIR, 'last-snapshot.json')

interface OldBackupMetadata {
  version: number
  backups: Array<{
    id: string
    filename: string
    timestamp: string
    trigger: string
    triggerSource?: string
    triggerDetails?: string
    fileSizeBytes: number
    checksum?: string
    notes?: string
    markedForDeletion?: boolean
    deletionReason?: string
  }>
}

interface NewBackupMetadata {
  version: number
  backups: Array<{
    id: string
    filename: string
    timestamp: string
    trigger: string
    triggerSource?: string
    triggerDetails?: string
    mode: 'full' | 'incremental'
    baseBackupId?: string
    fileSizeBytes: number
    checksum?: string
    changeSummary?: any
    snapshot?: any
    includesNotes: boolean
    includesHierarchy: boolean
    includesConservation: boolean
    includesWordClass: boolean
    includesNutrition: boolean
    includesRecipes: boolean
    includesAuditLogs: boolean
    notes?: string
    markedForDeletion?: boolean
    deletionReason?: string
  }>
  lastSnapshot?: any
}

function migrateBackups() {
  console.log('=== Backup Migration Script ===\n')
  
  // Check if metadata file exists
  if (!fs.existsSync(METADATA_FILE)) {
    console.log('No metadata file found. Nothing to migrate.')
    return
  }
  
  // Read existing metadata
  const content = fs.readFileSync(METADATA_FILE, 'utf-8')
  const oldMetadata: OldBackupMetadata = JSON.parse(content)
  
  console.log(`Found ${oldMetadata.backups.length} backups to check.`)
  
  // Check if already migrated
  if (oldMetadata.version >= 2) {
    console.log('Backups already migrated to version 2+. Nothing to do.')
    return
  }
  
  // Migrate each backup
  const newBackups: NewBackupMetadata['backups'] = oldMetadata.backups.map(backup => {
    // Check if it's a .db file (full backup) or .json file (incremental)
    const isFullBackup = backup.filename.endsWith('.db')
    
    return {
      ...backup,
      mode: isFullBackup ? 'full' : 'incremental' as const,
      // Add default include flags
      includesNotes: true,
      includesHierarchy: true,
      includesConservation: true,
      includesWordClass: true,
      includesNutrition: true,
      includesRecipes: true,
      includesAuditLogs: true,
    }
  })
  
  const newMetadata: NewBackupMetadata = {
    version: 2,
    backups: newBackups,
    lastSnapshot: undefined
  }
  
  // Create backup of old metadata
  const backupPath = METADATA_FILE + '.old'
  fs.copyFileSync(METADATA_FILE, backupPath)
  console.log(`Created backup of old metadata at: ${backupPath}`)
  
  // Write new metadata
  fs.writeFileSync(METADATA_FILE, JSON.stringify(newMetadata, null, 2))
  console.log(`\nMigrated metadata to version 2.`)
  
  // Summary
  const fullCount = newBackups.filter(b => b.mode === 'full').length
  const incrementalCount = newBackups.filter(b => b.mode === 'incremental').length
  console.log(`\nSummary:`)
  console.log(`- Full backups: ${fullCount}`)
  console.log(`- Incremental backups: ${incrementalCount}`)
  console.log(`- Total: ${newBackups.length}`)
}

migrateBackups()
