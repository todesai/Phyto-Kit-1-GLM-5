'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Database, Download, Clock, Trash2, RefreshCw, AlertTriangle,
  Check, X, FileText, Layers, Tag, Shield, FileQuestion,
  Archive, RotateCcw, Info, AlertCircle, Utensils, Leaf,
  FileJson, HardDrive, FolderOpen
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

interface BackupStats {
  totalParents: number
  totalChildren: number
  totalItems: number
  pendingItems: number
  totalWordClassifications: number
  lastBackup: string | null
  lastBackupIncremental: boolean
  totalBackups: number
  automaticBackups: number
  manualBackups: number
  incrementalBackups: number
  fullBackups: number
  totalSizeBytes: number
  maxBackupSizeBytes: number
  usagePercent: number
}

interface BackupRecord {
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
  createdAt: string
}

interface RestoreOptions {
  restoreHierarchy: boolean
  restoreTaxonomy: boolean
  restoreConservation: boolean
  restoreNotes: boolean
  restoreWordClassifications: boolean
  restoreAuditLogs: boolean
  restoreNutrition: boolean
  restoreRecipes: boolean
}

interface BackupManagementProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  language?: 'en' | 'es'
}

const translations = {
  en: {
    title: 'Backup Management',
    description: 'File-based backups stored in /backups folder',
    currentStatus: 'Current Status',
    totalParents: 'Total Parents',
    totalChildren: 'Total Children',
    totalItems: 'Total Items',
    pendingItems: 'Pending Items',
    wordClassifications: 'Word Classifications',
    lastBackup: 'Last Backup',
    never: 'Never',
    totalBackups: 'Total Backups',
    automatic: 'Automatic',
    manual: 'Manual',
    incremental: 'Incremental',
    full: 'Full',
    storageUsage: 'Storage Usage',
    sizeLimit: 'Size Limit',
    actions: 'Actions',
    createBackup: 'Create Backup',
    createFullBackup: 'Create Full Backup',
    creating: 'Creating...',
    backupHistory: 'Backup History',
    noBackups: 'No backups yet. Create your first backup to protect your data.',
    backupTrigger: 'Trigger',
    size: 'Size',
    date: 'Date',
    details: 'Details',
    restore: 'Restore',
    restoring: 'Restoring...',
    dryRun: 'Preview',
    delete: 'Delete',
    deleteSelected: 'Delete Selected',
    deleteConfirm: 'Are you sure you want to delete this backup?',
    deleteMultipleConfirm: 'Delete {count} selected backup(s)?',
    restoreConfirm: 'This will restore data from this backup. Continue?',
    confirmRestore: 'Confirm Restore',
    cancel: 'Cancel',
    restoreSuccess: 'Restore completed successfully',
    backupCreated: 'Backup created successfully',
    backupDeleted: 'Backup deleted',
    error: 'Error',
    selectiveRestore: 'Selective Restore',
    selectPartsToRestore: 'Select which parts to restore',
    hierarchyData: 'Hierarchy Relationships',
    taxonomyData: 'Scientific Names',
    conservationData: 'Conservation Status',
    notesData: 'Notes',
    wordClassificationsData: 'Word Classifications',
    auditLogsData: 'Audit Logs',
    nutritionData: 'Nutrition Data',
    recipesData: 'Recipes',
    preview: 'Preview',
    previewChanges: 'Preview Changes',
    recordsAffected: 'records affected',
    records: 'records',
    included: 'Included',
    notIncluded: 'Not included',
    sizeLimitWarning: 'Storage limit reached ({usage}%). Would you like to delete old backups to make room?',
    confirmDeleteOld: 'Delete Old Backups',
    selectingParts: 'Select parts to restore',
    dryRunResults: 'Dry Run Results',
    wouldRestore: 'Would restore:',
    itemsSelected: 'items selected',
    incrementalMode: 'Incremental Mode',
    incrementalModeDesc: 'Only backup changes since last backup (saves space)',
    changesCount: 'Changes',
    backupType: 'Type',
    incrementalTooltip: 'Stores only changed records',
    fullTooltip: 'Stores complete data snapshot',
    savingsHint: 'Incremental backups save space by storing only changes',
    fileBasedStorage: 'File-Based Storage',
    fileBasedDesc: 'Backups stored as JSON files in /backups folder',
    backupLocation: 'Backup Location',
    viewFiles: 'View Files',
    includes: 'Includes'
  },
  es: {
    title: 'Gestión de Respaldos',
    description: 'Respaldos basados en archivos almacenados en /backups',
    currentStatus: 'Estado Actual',
    totalParents: 'Padres Totales',
    totalChildren: 'Hijos Totales',
    totalItems: 'Items Totales',
    pendingItems: 'Items Pendientes',
    wordClassifications: 'Clasificaciones de Palabras',
    lastBackup: 'Último Respaldo',
    never: 'Nunca',
    totalBackups: 'Respaldos Totales',
    automatic: 'Automático',
    manual: 'Manual',
    incremental: 'Incremental',
    full: 'Completo',
    storageUsage: 'Uso de Almacenamiento',
    sizeLimit: 'Límite de Tamaño',
    actions: 'Acciones',
    createBackup: 'Crear Respaldo',
    createFullBackup: 'Crear Respaldo Completo',
    creating: 'Creando...',
    backupHistory: 'Historial de Respaldos',
    noBackups: 'No hay respaldos aún. Crea tu primer respaldo para proteger tus datos.',
    backupTrigger: 'Disparador',
    size: 'Tamaño',
    date: 'Fecha',
    details: 'Detalles',
    restore: 'Restaurar',
    restoring: 'Restaurando...',
    dryRun: 'Vista Previa',
    delete: 'Eliminar',
    deleteSelected: 'Eliminar Seleccionados',
    deleteConfirm: '¿Estás seguro de que quieres eliminar este respaldo?',
    deleteMultipleConfirm: '¿Eliminar {count} respaldo(s) seleccionado(s)?',
    restoreConfirm: 'Esto restaurará los datos desde este respaldo. ¿Continuar?',
    confirmRestore: 'Confirmar Restauración',
    cancel: 'Cancelar',
    restoreSuccess: 'Restauración completada exitosamente',
    backupCreated: 'Respaldo creado exitosamente',
    backupDeleted: 'Respaldo eliminado',
    error: 'Error',
    selectiveRestore: 'Restauración Selectiva',
    selectPartsToRestore: 'Selecciona qué partes restaurar',
    hierarchyData: 'Relaciones de Jerarquía',
    taxonomyData: 'Nombres Científicos',
    conservationData: 'Estado de Conservación',
    notesData: 'Notas',
    wordClassificationsData: 'Clasificaciones de Palabras',
    auditLogsData: 'Registro de Auditoría',
    nutritionData: 'Datos de Nutrición',
    recipesData: 'Recetas',
    preview: 'Vista Previa',
    previewChanges: 'Vista Previa de Cambios',
    recordsAffected: 'registros afectados',
    records: 'registros',
    included: 'Incluido',
    notIncluded: 'No incluido',
    sizeLimitWarning: 'Límite de almacenamiento alcanzado ({usage}%). ¿Deseas eliminar respaldos antiguos para hacer espacio?',
    confirmDeleteOld: 'Eliminar Respaldos Antiguos',
    selectingParts: 'Selecciona partes a restaurar',
    dryRunResults: 'Resultados de Vista Previa',
    wouldRestore: 'Se restaurarían:',
    itemsSelected: 'items seleccionados',
    incrementalMode: 'Modo Incremental',
    incrementalModeDesc: 'Solo respalda cambios desde el último respaldo (ahorra espacio)',
    changesCount: 'Cambios',
    backupType: 'Tipo',
    incrementalTooltip: 'Almacena solo registros modificados',
    fullTooltip: 'Almacena snapshot completo de datos',
    savingsHint: 'Los respaldos incrementales ahorran espacio almacenando solo cambios',
    fileBasedStorage: 'Almacenamiento en Archivos',
    fileBasedDesc: 'Respaldos guardados como archivos JSON en /backups',
    backupLocation: 'Ubicación de Respaldos',
    viewFiles: 'Ver Archivos',
    includes: 'Incluye'
  }
}

const triggerLabels: Record<string, { en: string; es: string; icon: typeof Database }> = {
  manual: { en: 'Manual', es: 'Manual', icon: FileText },
  hierarchy: { en: 'Hierarchy Change', es: 'Cambio de Jerarquía', icon: Layers },
  taxonomy: { en: 'Taxonomy Change', es: 'Cambio de Taxonomía', icon: Tag },
  conservation: { en: 'Conservation Update', es: 'Actualización de Conservación', icon: Shield },
  notes: { en: 'Notes Update', es: 'Actualización de Notas', icon: FileQuestion },
  word_classification: { en: 'Word Classification', es: 'Clasificación de Palabras', icon: Tag },
  nutrition: { en: 'Nutrition Update', es: 'Actualización de Nutrición', icon: Leaf },
  recipe: { en: 'Recipe Update', es: 'Actualización de Recetas', icon: Utensils },
  auto: { en: 'Automatic', es: 'Automático', icon: RefreshCw }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(dateStr: string, language: 'en' | 'es'): string {
  return new Date(dateStr).toLocaleString(language === 'es' ? 'es-MX' : 'en-US')
}

export function BackupManagement({ open, onOpenChange, language = 'en' }: BackupManagementProps) {
  const t = translations[language]
  
  const [stats, setStats] = useState<BackupStats | null>(null)
  const [backups, setBackups] = useState<BackupRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [selectedBackup, setSelectedBackup] = useState<BackupRecord | null>(null)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [selectedBackups, setSelectedBackups] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null)
  
  // Incremental mode toggle
  const [incrementalMode, setIncrementalMode] = useState(true)
  
  // Selective restore options
  const [restoreOptions, setRestoreOptions] = useState<RestoreOptions>({
    restoreHierarchy: true,
    restoreTaxonomy: true,
    restoreConservation: true,
    restoreNotes: true,
    restoreWordClassifications: true,
    restoreAuditLogs: true,
    restoreNutrition: true,
    restoreRecipes: true
  })
  const [dryRunResult, setDryRunResult] = useState<{
    hierarchy: number
    taxonomy: number
    conservation: number
    notes: number
    wordClassifications: number
    auditLogs: number
    nutrition: number
    recipes: number
    isIncremental?: boolean
  } | null>(null)
  
  // Size limit warning
  const [sizeWarning, setSizeWarning] = useState<{
    needsConfirmation: boolean
    backupsToDelete: Array<{ id: string; name: string; fileSizeBytes: number; createdAt: Date }>
  } | null>(null)

  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [statsRes, backupsRes] = await Promise.all([
        fetch('/api/backup?action=stats'),
        fetch('/api/backup?action=list&limit=50')
      ])
      
      const statsData = await statsRes.json()
      const backupsData = await backupsRes.json()
      
      if (statsData.success) setStats(statsData.stats)
      if (backupsData.success) setBackups(backupsData.backups)
    } catch (error) {
      console.error('Error fetching backup data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBackup = async (confirmDelete: boolean = false, forceFull: boolean = false) => {
    setCreating(true)
    setMessage(null)
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          trigger: 'manual',
          description: forceFull ? 'Full manual backup from UI' : 'Manual backup from UI',
          includeFullSnapshot: forceFull,
          isAutomatic: false,
          isIncremental: forceFull ? false : incrementalMode,
          confirmDeleteBackups: confirmDelete
        })
      })
      
      const data = await response.json()
      
      if (data.needsConfirmation) {
        // Size limit reached, need user confirmation
        setSizeWarning({
          needsConfirmation: true,
          backupsToDelete: data.backupsToDelete || []
        })
        setCreating(false)
        return
      }
      
      if (data.success) {
        const typeLabel = data.isIncremental ? `(${t.incremental})` : `(${t.full})`
        const changesInfo = data.isIncremental && data.changesCount ? ` - ${data.changesCount} ${t.changesCount}` : ''
        const sizeInfo = data.formattedSize ? ` (${data.formattedSize}${changesInfo})` : ''
        setMessage({ 
          type: 'success', 
          text: `${t.backupCreated} ${typeLabel}${sizeInfo}` 
        })
        setSizeWarning(null)
        fetchData()
      } else {
        setMessage({ type: 'error', text: data.error || t.error })
      }
    } catch (error) {
      setMessage({ type: 'error', text: String(error) })
    } finally {
      setCreating(false)
    }
  }

  const handleDryRun = async () => {
    if (!selectedBackup) return
    
    setRestoring(selectedBackup.id)
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'restore',
          backupId: selectedBackup.id,
          dryRun: true,
          restoreOptions
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setDryRunResult({
          ...data.changes,
          isIncremental: data.isIncremental
        })
      } else {
        setMessage({ type: 'error', text: data.error || t.error })
      }
    } catch (error) {
      setMessage({ type: 'error', text: String(error) })
    } finally {
      setRestoring(null)
    }
  }

  const handleRestore = async () => {
    if (!selectedBackup) return
    
    setRestoring(selectedBackup.id)
    setMessage(null)
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'restore',
          backupId: selectedBackup.id,
          dryRun: false,
          restoreOptions
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: t.restoreSuccess })
        fetchData()
      } else {
        setMessage({ type: 'error', text: data.error || t.error })
      }
    } catch (error) {
      setMessage({ type: 'error', text: String(error) })
    } finally {
      setRestoring(null)
      setShowRestoreDialog(false)
      setDryRunResult(null)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedBackups.size === 0) return
    if (!confirm(t.deleteMultipleConfirm.replace('{count}', String(selectedBackups.size)))) return
    
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-multiple',
          backupIds: Array.from(selectedBackups)
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: `${data.deleted} ${t.backupDeleted}` })
        setSelectedBackups(new Set())
        fetchData()
      } else {
        setMessage({ type: 'error', text: data.error || t.error })
      }
    } catch (error) {
      setMessage({ type: 'error', text: String(error) })
    }
  }

  const toggleBackupSelection = (id: string) => {
    const newSet = new Set(selectedBackups)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedBackups(newSet)
  }

  const toggleRestoreOption = (key: keyof RestoreOptions) => {
    setRestoreOptions(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
    setDryRunResult(null)
  }

  // Helper to show what data types are included in a backup
  const getIncludedTypes = (backup: BackupRecord): string[] => {
    const types: string[] = []
    if (backup.includesHierarchy) types.push(t.hierarchyData)
    if (backup.includesTaxonomy) types.push(t.taxonomyData)
    if (backup.includesConservation) types.push(t.conservationData)
    if (backup.includesNotes) types.push(t.notesData)
    if (backup.includesWordClassifications) types.push(t.wordClassificationsData)
    if (backup.includesAuditLogs) types.push(t.auditLogsData)
    if (backup.includesNutrition) types.push(t.nutritionData)
    if (backup.includesRecipes) types.push(t.recipesData)
    return types
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Archive className="w-5 h-5" />
            {t.title}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            {t.description}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 h-0 pr-4">
          <div className="space-y-6">
            {/* Message Alert */}
            {message && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                {message.type === 'success' ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}
            
            {/* Size Limit Warning */}
            {sizeWarning && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{language === 'es' ? 'Límite de Almacenamiento' : 'Storage Limit Reached'}</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>{t.sizeLimitWarning.replace('{usage}', String(stats?.usagePercent || 0))}</p>
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCreateBackup(true)}
                    >
                      {t.confirmDeleteOld}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSizeWarning(null)}
                    >
                      {t.cancel}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            {/* Current Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{t.currentStatus}</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : stats ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="text-sm text-muted-foreground">{t.totalParents}</div>
                        <div className="text-2xl font-bold">{stats.totalParents}</div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="text-sm text-muted-foreground">{t.totalChildren}</div>
                        <div className="text-2xl font-bold">{stats.totalChildren}</div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="text-sm text-muted-foreground">{t.totalItems}</div>
                        <div className="text-2xl font-bold">{stats.totalItems}</div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="text-sm text-muted-foreground">{t.pendingItems}</div>
                        <div className="text-2xl font-bold">{stats.pendingItems}</div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="text-sm text-muted-foreground">{t.wordClassifications}</div>
                        <div className="text-2xl font-bold">{stats.totalWordClassifications}</div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="text-sm text-muted-foreground">{t.lastBackup}</div>
                        <div className="text-lg font-bold truncate">
                          {stats.lastBackup ? formatDate(stats.lastBackup, language) : t.never}
                        </div>
                        {stats.lastBackupIncremental && (
                          <Badge variant="secondary" className="text-xs mt-1">{t.incremental}</Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Storage Usage */}
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <HardDrive className="w-4 h-4" />
                          {t.storageUsage}
                        </span>
                        <span>{formatSize(stats.totalSizeBytes)} / {formatSize(stats.maxBackupSizeBytes)}</span>
                      </div>
                      <Progress 
                        value={stats.usagePercent} 
                        className={cn(
                          "h-2",
                          stats.usagePercent > 80 && "[&>div]:bg-destructive",
                          stats.usagePercent > 50 && stats.usagePercent <= 80 && "[&>div]:bg-yellow-500"
                        )}
                      />
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <Badge variant="outline">{t.totalBackups}: {stats.totalBackups}</Badge>
                        <Badge variant="secondary">{t.automatic}: {stats.automaticBackups}</Badge>
                        <Badge variant="default">{t.manual}: {stats.manualBackups}</Badge>
                        <Badge variant="outline" className="border-emerald-500 text-emerald-600">{t.incremental}: {stats.incrementalBackups}</Badge>
                        <Badge variant="outline">{t.full}: {stats.fullBackups}</Badge>
                      </div>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
            
            {/* Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{t.actions}</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Incremental Mode Toggle */}
                <div className="flex items-center justify-between mb-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileJson className="w-5 h-5 text-emerald-500" />
                    <div>
                      <Label className="font-medium">{t.incrementalMode}</Label>
                      <p className="text-sm text-muted-foreground">{t.incrementalModeDesc}</p>
                    </div>
                  </div>
                  <Switch
                    checked={incrementalMode}
                    onCheckedChange={setIncrementalMode}
                  />
                </div>
                
                <div className="flex gap-4 flex-wrap">
                  <Button onClick={() => handleCreateBackup(false)} disabled={creating}>
                    {creating ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        {t.creating}
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        {incrementalMode ? t.createBackup : t.createFullBackup}
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => handleCreateBackup(false, true)} 
                    disabled={creating}
                  >
                    <Database className="w-4 h-4 mr-2" />
                    {t.createFullBackup}
                  </Button>
                  
                  {selectedBackups.size > 0 && (
                    <Button variant="destructive" onClick={handleDeleteSelected}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t.deleteSelected} ({selectedBackups.size})
                    </Button>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground mt-2">
                  {t.savingsHint}
                </p>
              </CardContent>
            </Card>
            
            {/* Backup History */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{t.backupHistory}</CardTitle>
              </CardHeader>
              <CardContent>
                {backups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Archive className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>{t.noBackups}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {backups.map((backup) => {
                      const TriggerIcon = triggerLabels[backup.trigger]?.icon || FileText
                      const includedTypes = getIncludedTypes(backup)
                      return (
                        <motion.div
                          key={backup.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "border rounded-lg p-4 transition-colors",
                            selectedBackups.has(backup.id) && "bg-muted/50 border-primary/50"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedBackups.has(backup.id)}
                              onCheckedChange={() => toggleBackupSelection(backup.id)}
                              className="mt-1"
                            />
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="font-medium truncate">{backup.name}</span>
                                <Badge variant={backup.isAutomatic ? 'secondary' : 'outline'}>
                                  {triggerLabels[backup.trigger]?.[language] || backup.trigger}
                                </Badge>
                                {backup.isAutomatic && (
                                  <Badge variant="outline" className="text-xs">
                                    {t.automatic}
                                  </Badge>
                                )}
                                <Badge 
                                  variant={backup.isIncremental ? 'default' : 'outline'}
                                  className={cn(
                                    backup.isIncremental && "bg-emerald-600 hover:bg-emerald-700"
                                  )}
                                >
                                  {backup.isIncremental ? t.incremental : t.full}
                                </Badge>
                                {backup.isIncremental && backup.changesCount > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {backup.changesCount} {t.changesCount}
                                  </Badge>
                                )}
                              </div>
                              
                              {backup.triggerDescription && (
                                <p className="text-sm text-muted-foreground mb-2 truncate">
                                  {backup.triggerDescription}
                                </p>
                              )}
                              
                              {/* Included data types */}
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="text-xs text-muted-foreground">{t.includes}:</span>
                                {includedTypes.slice(0, 4).map((type, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {type}
                                  </Badge>
                                ))}
                                {includedTypes.length > 4 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{includedTypes.length - 4}
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDate(backup.createdAt, language)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <FileJson className="w-3 h-3" />
                                  {formatSize(backup.fileSizeBytes)}
                                </span>
                                <span>{backup.totalParents} parents, {backup.totalChildren} children</span>
                                {backup.totalWordClassifications > 0 && (
                                  <span>{backup.totalWordClassifications} words</span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedBackup(backup)
                                  setShowRestoreDialog(true)
                                  setDryRunResult(null)
                                  // Set restore options based on what's included in this backup
                                  setRestoreOptions({
                                    restoreHierarchy: backup.includesHierarchy,
                                    restoreTaxonomy: backup.includesTaxonomy,
                                    restoreConservation: backup.includesConservation,
                                    restoreNotes: backup.includesNotes,
                                    restoreWordClassifications: backup.includesWordClassifications,
                                    restoreAuditLogs: backup.includesAuditLogs,
                                    restoreNutrition: backup.includesNutrition,
                                    restoreRecipes: backup.includesRecipes
                                  })
                                }}
                                disabled={restoring === backup.id}
                              >
                                {restoring === backup.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="w-4 h-4" />
                                )}
                                <span className="ml-1 hidden sm:inline">{t.restore}</span>
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
        
        {/* Restore Dialog with Selective Options */}
        <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t.selectiveRestore}</DialogTitle>
              <DialogDescription>{t.selectPartsToRestore}</DialogDescription>
            </DialogHeader>
            
            {selectedBackup && (
              <div className="space-y-4">
                {/* Backup Info */}
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="font-medium">{selectedBackup.name}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    {formatDate(selectedBackup.createdAt, language)} • {formatSize(selectedBackup.fileSizeBytes)}
                    <Badge 
                      variant={selectedBackup.isIncremental ? 'default' : 'outline'}
                      className={selectedBackup.isIncremental ? "bg-emerald-600" : ""}
                    >
                      {selectedBackup.isIncremental ? t.incremental : t.full}
                    </Badge>
                  </div>
                </div>
                
                {/* Selective Restore Options */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">{t.selectPartsToRestore}</Label>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className={cn(
                      "flex items-center space-x-2 p-2 rounded",
                      !selectedBackup.includesHierarchy && "opacity-50"
                    )}>
                      <Checkbox
                        id="restoreHierarchy"
                        checked={restoreOptions.restoreHierarchy}
                        disabled={!selectedBackup.includesHierarchy}
                        onCheckedChange={() => toggleRestoreOption('restoreHierarchy')}
                      />
                      <Label htmlFor="restoreHierarchy" className="flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        {t.hierarchyData}
                      </Label>
                    </div>
                    
                    <div className={cn(
                      "flex items-center space-x-2 p-2 rounded",
                      !selectedBackup.includesTaxonomy && "opacity-50"
                    )}>
                      <Checkbox
                        id="restoreTaxonomy"
                        checked={restoreOptions.restoreTaxonomy}
                        disabled={!selectedBackup.includesTaxonomy}
                        onCheckedChange={() => toggleRestoreOption('restoreTaxonomy')}
                      />
                      <Label htmlFor="restoreTaxonomy" className="flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        {t.taxonomyData}
                      </Label>
                    </div>
                    
                    <div className={cn(
                      "flex items-center space-x-2 p-2 rounded",
                      !selectedBackup.includesConservation && "opacity-50"
                    )}>
                      <Checkbox
                        id="restoreConservation"
                        checked={restoreOptions.restoreConservation}
                        disabled={!selectedBackup.includesConservation}
                        onCheckedChange={() => toggleRestoreOption('restoreConservation')}
                      />
                      <Label htmlFor="restoreConservation" className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        {t.conservationData}
                      </Label>
                    </div>
                    
                    <div className={cn(
                      "flex items-center space-x-2 p-2 rounded",
                      !selectedBackup.includesNotes && "opacity-50"
                    )}>
                      <Checkbox
                        id="restoreNotes"
                        checked={restoreOptions.restoreNotes}
                        disabled={!selectedBackup.includesNotes}
                        onCheckedChange={() => toggleRestoreOption('restoreNotes')}
                      />
                      <Label htmlFor="restoreNotes" className="flex items-center gap-2">
                        <FileQuestion className="w-4 h-4" />
                        {t.notesData}
                      </Label>
                    </div>
                    
                    <div className={cn(
                      "flex items-center space-x-2 p-2 rounded",
                      !selectedBackup.includesWordClassifications && "opacity-50"
                    )}>
                      <Checkbox
                        id="restoreWordClassifications"
                        checked={restoreOptions.restoreWordClassifications}
                        disabled={!selectedBackup.includesWordClassifications}
                        onCheckedChange={() => toggleRestoreOption('restoreWordClassifications')}
                      />
                      <Label htmlFor="restoreWordClassifications" className="flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        {t.wordClassificationsData}
                      </Label>
                    </div>
                    
                    <div className={cn(
                      "flex items-center space-x-2 p-2 rounded",
                      !selectedBackup.includesAuditLogs && "opacity-50"
                    )}>
                      <Checkbox
                        id="restoreAuditLogs"
                        checked={restoreOptions.restoreAuditLogs}
                        disabled={!selectedBackup.includesAuditLogs}
                        onCheckedChange={() => toggleRestoreOption('restoreAuditLogs')}
                      />
                      <Label htmlFor="restoreAuditLogs" className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {t.auditLogsData}
                      </Label>
                    </div>
                    
                    <div className={cn(
                      "flex items-center space-x-2 p-2 rounded",
                      !selectedBackup.includesNutrition && "opacity-50"
                    )}>
                      <Checkbox
                        id="restoreNutrition"
                        checked={restoreOptions.restoreNutrition}
                        disabled={!selectedBackup.includesNutrition}
                        onCheckedChange={() => toggleRestoreOption('restoreNutrition')}
                      />
                      <Label htmlFor="restoreNutrition" className="flex items-center gap-2">
                        <Leaf className="w-4 h-4" />
                        {t.nutritionData}
                      </Label>
                    </div>
                    
                    <div className={cn(
                      "flex items-center space-x-2 p-2 rounded",
                      !selectedBackup.includesRecipes && "opacity-50"
                    )}>
                      <Checkbox
                        id="restoreRecipes"
                        checked={restoreOptions.restoreRecipes}
                        disabled={!selectedBackup.includesRecipes}
                        onCheckedChange={() => toggleRestoreOption('restoreRecipes')}
                      />
                      <Label htmlFor="restoreRecipes" className="flex items-center gap-2">
                        <Utensils className="w-4 h-4" />
                        {t.recipesData}
                      </Label>
                    </div>
                  </div>
                </div>
                
                {/* Dry Run Results */}
                {dryRunResult && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <div className="font-medium text-sm mb-2">
                      {t.dryRunResults}
                      {dryRunResult.isIncremental && (
                        <Badge variant="secondary" className="ml-2">{t.incremental}</Badge>
                      )}
                    </div>
                    <div className="text-sm space-y-1">
                      {restoreOptions.restoreHierarchy && dryRunResult.hierarchy > 0 && (
                        <div>{t.hierarchyData}: {dryRunResult.hierarchy} {t.records}</div>
                      )}
                      {restoreOptions.restoreTaxonomy && dryRunResult.taxonomy > 0 && (
                        <div>{t.taxonomyData}: {dryRunResult.taxonomy} {t.records}</div>
                      )}
                      {restoreOptions.restoreConservation && dryRunResult.conservation > 0 && (
                        <div>{t.conservationData}: {dryRunResult.conservation} {t.records}</div>
                      )}
                      {restoreOptions.restoreNotes && dryRunResult.notes > 0 && (
                        <div>{t.notesData}: {dryRunResult.notes} {t.records}</div>
                      )}
                      {restoreOptions.restoreWordClassifications && dryRunResult.wordClassifications > 0 && (
                        <div>{t.wordClassificationsData}: {dryRunResult.wordClassifications} {t.records}</div>
                      )}
                      {restoreOptions.restoreAuditLogs && dryRunResult.auditLogs > 0 && (
                        <div>{t.auditLogsData}: {dryRunResult.auditLogs} {t.records}</div>
                      )}
                      {restoreOptions.restoreNutrition && dryRunResult.nutrition > 0 && (
                        <div>{t.nutritionData}: {dryRunResult.nutrition} {t.records}</div>
                      )}
                      {restoreOptions.restoreRecipes && dryRunResult.recipes > 0 && (
                        <div>{t.recipesData}: {dryRunResult.recipes} {t.records}</div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleDryRun}
                    disabled={!!restoring}
                  >
                    <Info className="w-4 h-4 mr-2" />
                    {t.preview}
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleRestore}
                    disabled={!!restoring}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    {t.confirmRestore}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
