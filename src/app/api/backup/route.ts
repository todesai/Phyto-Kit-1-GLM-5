import { NextRequest, NextResponse } from 'next/server'
import { 
  createBackup, 
  listBackups, 
  getBackupDetails, 
  deleteBackup, 
  deleteBackups,
  restoreBackup,
  getBackupStatistics,
  checkBackupSizeLimit,
  formatSize
} from '@/lib/backup-service'

// ============================================
// GET - List backups, details, stats, or size check
// ============================================
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action') || 'list'
    const backupId = searchParams.get('id')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (action === 'stats') {
      const stats = await getBackupStatistics()
      return NextResponse.json({ success: true, stats })
    }

    if (action === 'size-check') {
      const sizeCheck = await checkBackupSizeLimit()
      return NextResponse.json({ 
        success: true, 
        ...sizeCheck,
        formattedSize: formatSize(sizeCheck.currentTotalSize),
        maxSize: formatSize(50 * 1024 * 1024)
      })
    }

    if (action === 'details' && backupId) {
      const backup = await getBackupDetails(backupId)
      if (!backup) {
        return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
      }
      return NextResponse.json({ success: true, backup })
    }

    // Default: list backups
    const backups = await listBackups(limit)
    return NextResponse.json({ success: true, backups })
  } catch (error) {
    console.error('Backup GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// POST - Create backup, restore, or confirm deletion
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'create') {
      const { 
        trigger, 
        description, 
        includeFullSnapshot, 
        isIncremental,
        confirmDeleteBackups,
        includeHierarchy,
        includeTaxonomy,
        includeConservation,
        includeNotes,
        includeWordClassifications,
        includeAuditLogs,
        includeNutrition,
        includeRecipes
      } = body
      
      // Check size limit first
      const sizeCheck = await checkBackupSizeLimit()
      
      if (sizeCheck.wouldExceedLimit && confirmDeleteBackups) {
        // User confirmed to delete old backups
        if (sizeCheck.backupsToDelete && sizeCheck.backupsToDelete.length > 0) {
          await deleteBackups(sizeCheck.backupsToDelete.map(b => b.id))
        }
      } else if (sizeCheck.wouldExceedLimit) {
        // Need user confirmation
        return NextResponse.json({ 
          needsConfirmation: true,
          message: `Backup limit reached (${formatSize(sizeCheck.currentTotalSize)} / 50MB). Delete old backups to continue?`,
          backupsToDelete: sizeCheck.backupsToDelete
        }, { status: 409 })
      }
      
      const result = await createBackup({
        trigger: trigger || 'manual',
        description: description || 'Manual backup from UI',
        includeFullSnapshot: includeFullSnapshot || false,
        isAutomatic: false,
        isIncremental: isIncremental !== false, // Default to incremental
        includeHierarchy: includeHierarchy !== false,
        includeTaxonomy: includeTaxonomy !== false,
        includeConservation: includeConservation !== false,
        includeNotes: includeNotes !== false,
        includeWordClassifications: includeWordClassifications !== false,
        includeAuditLogs: includeAuditLogs !== false,
        includeNutrition: includeNutrition !== false,
        includeRecipes: includeRecipes !== false
      })

      if (result.success) {
        return NextResponse.json({ 
          success: true, 
          backupId: result.backupId,
          sizeBytes: result.sizeBytes,
          formattedSize: result.sizeBytes ? formatSize(result.sizeBytes) : undefined,
          isIncremental: result.isIncremental,
          changesCount: result.changesCount,
          message: result.isIncremental 
            ? `Incremental backup created with ${result.changesCount} changes` 
            : 'Full backup created successfully'
        })
      } else {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }
    }

    if (action === 'restore') {
      const { backupId, dryRun, restoreOptions } = body
      if (!backupId) {
        return NextResponse.json({ error: 'backupId required' }, { status: 400 })
      }

      const result = await restoreBackup(backupId, restoreOptions || {}, dryRun !== false)

      if (result.success) {
        return NextResponse.json({ 
          success: true, 
          changes: result.changes,
          isIncremental: result.isIncremental,
          message: dryRun !== false ? 'Dry run completed - no changes made' : 'Restore completed successfully' 
        })
      } else {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }
    }

    if (action === 'delete-multiple') {
      const { backupIds } = body
      if (!backupIds || !Array.isArray(backupIds) || backupIds.length === 0) {
        return NextResponse.json({ error: 'backupIds array required' }, { status: 400 })
      }

      const result = await deleteBackups(backupIds)
      if (result.success) {
        return NextResponse.json({ 
          success: true, 
          deleted: result.deleted,
          message: `Deleted ${result.deleted} backup(s)` 
        })
      } else {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Backup POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// DELETE - Delete a backup
// ============================================
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const backupId = searchParams.get('id')

    if (!backupId) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const result = await deleteBackup(backupId)

    if (result.success) {
      return NextResponse.json({ success: true, message: 'Backup deleted' })
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
  } catch (error) {
    console.error('Backup DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
