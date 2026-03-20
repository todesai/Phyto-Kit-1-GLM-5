'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Database,
  HardDrive,
  Clock,
  Plus,
  Trash2,
  RotateCcw,
  RefreshCw,
  FileText,
  GitBranch,
  Shield,
  Tag,
  ChevronDown,
  AlertTriangle,
  Check,
  X,
  Info,
  Loader2,
  FileArchive,
  FileJson,
  Eye,
} from 'lucide-react'

// ============================================
// TYPES
// ============================================

interface ChangeSummary {
  totalChanges: number
  notes: { added: number; updated: number; deleted: number; items: ChangeItem[] }
  hierarchy: { linksCreated: number; linksRemoved: number; parentsCreated: number; statusChanges: number; items: ChangeItem[] }
  conservation: { added: number; updated: number; items: ChangeItem[] }
  wordClassification: { added: number; updated: number; deleted: number; items: ChangeItem[] }
  nutrition: { updated: number; items: ChangeItem[] }
  recipes: { added: number; updated: number; deleted: number; items: ChangeItem[] }
  auditLogs: { added: number }
}

interface ChangeItem {
  id: string
  name: string
  changeType: 'create' | 'update' | 'delete'
  field?: string
  oldValue?: string | null
  newValue?: string | null
  timestamp: string
}

interface BackupInfo {
  id: string
  filename: string
  timestamp: string
  fileSizeMB: string
  fileSizeKB: string
  trigger: string
  triggerSource: string | null
  mode: 'full' | 'incremental'
  baseBackupId?: string
  notes: string | null
  changeSummary: {
    totalChanges: number
    notes: number
    hierarchy: number
    conservation: number
    wordClass: number
  } | null
}

interface StorageInfo {
  totalSizeBytes: number
  totalSizeMB: string
  limitMB: number
  usedPercent: string
  backupCount: number
  fullBackupCount: number
  incrementalBackupCount: number
  remainingSpaceMB: string
}

interface DataCounts {
  notes: number
  hierarchyLinked: number
  conservation: number
  wordClassifications: number
  recipes: number
  auditLogs: number
}

type BackupDataType = 'notes' | 'hierarchy' | 'conservation' | 'word_classification' | 'nutrition' | 'recipe' | 'audit_logs' | 'all'

// ============================================
// TRANSLATIONS
// ============================================

const translations = {
  en: {
    title: 'Backup Management',
    description: 'Manage database backups and restore points',
    storage: 'Storage',
    used: 'used',
    remaining: 'remaining',
    backups: 'Backups',
    fullBackups: 'Full backups',
    incrementalBackups: 'Incremental backups',
    createBackup: 'Create Backup',
    createFullBackup: 'Full Backup',
    createIncrementalBackup: 'Incremental Backup',
    restoring: 'Restoring...',
    restore: 'Restore',
    delete: 'Delete',
    deleteSelected: 'Delete Selected',
    confirmDelete: 'Confirm Deletion',
    confirmDeleteDesc: 'Are you sure you want to delete this backup? This action cannot be undone.',
    confirmRestore: 'Confirm Restore',
    selectRestoreTypes: 'Select data types to restore',
    restoreWarning: 'This will overwrite current data. A backup of current state will be created automatically.',
    noBackups: 'No backups available',
    lastBackup: 'Last backup',
    never: 'Never',
    changes: 'Changes',
    noChanges: 'No changes detected',
    totalChanges: 'Total changes',
    notes: 'Notes',
    hierarchy: 'Hierarchy',
    conservation: 'Conservation',
    wordClass: 'Word Classifications',
    nutrition: 'Nutrition',
    recipes: 'Recipes',
    auditLogs: 'Audit Logs',
    all: 'All Data',
    manual: 'Manual',
    auto: 'Automatic',
    beforeRestore: 'Before Restore',
    scheduled: 'Scheduled',
    fullMode: 'Full',
    incrementalMode: 'Incremental',
    dataCounts: 'Current Data',
    created: 'Created',
    trigger: 'Trigger',
    mode: 'Mode',
    size: 'Size',
    actions: 'Actions',
    viewChanges: 'View Changes',
    changeDetails: 'Change Details',
    close: 'Close',
    creating: 'Creating backup...',
    createdSuccess: 'Backup created successfully',
    restoreSuccess: 'Restore completed successfully',
    deleteSuccess: 'Backup deleted successfully',
    error: 'Error',
    storageWarning: 'Storage almost full',
    storageWarningDesc: 'Consider deleting old backups to free space.',
    requiresDeletion: 'Storage limit reached',
    requiresDeletionDesc: 'Delete some backups to create a new one.',
    selectBackupsToDelete: 'Select backups to delete',
    cancel: 'Cancel',
    continue: 'Continue',
    items: 'items',
    added: 'added',
    updated: 'updated',
    deleted: 'deleted',
    linksCreated: 'links created',
    linksRemoved: 'links removed',
    parentsCreated: 'parents created',
  },
  es: {
    title: 'Gestión de Respaldos',
    description: 'Administrar respaldos de base de datos y puntos de restauración',
    storage: 'Almacenamiento',
    used: 'usado',
    remaining: 'disponible',
    backups: 'Respaldos',
    fullBackups: 'Respaldos completos',
    incrementalBackups: 'Respaldos incrementales',
    createBackup: 'Crear Respaldo',
    createFullBackup: 'Respaldo Completo',
    createIncrementalBackup: 'Respaldo Incremental',
    restoring: 'Restaurando...',
    restore: 'Restaurar',
    delete: 'Eliminar',
    deleteSelected: 'Eliminar Seleccionados',
    confirmDelete: 'Confirmar Eliminación',
    confirmDeleteDesc: '¿Está seguro de que desea eliminar este respaldo? Esta acción no se puede deshacer.',
    confirmRestore: 'Confirmar Restauración',
    selectRestoreTypes: 'Seleccionar tipos de datos a restaurar',
    restoreWarning: 'Esto sobrescribirá los datos actuales. Se creará automáticamente un respaldo del estado actual.',
    noBackups: 'No hay respaldos disponibles',
    lastBackup: 'Último respaldo',
    never: 'Nunca',
    changes: 'Cambios',
    noChanges: 'No se detectaron cambios',
    totalChanges: 'Cambios totales',
    notes: 'Notas',
    hierarchy: 'Jerarquía',
    conservation: 'Conservación',
    wordClass: 'Clasif. Palabras',
    nutrition: 'Nutrición',
    recipes: 'Recetas',
    auditLogs: 'Registro Auditoría',
    all: 'Todos los Datos',
    manual: 'Manual',
    auto: 'Automático',
    beforeRestore: 'Pre-Restauración',
    scheduled: 'Programado',
    fullMode: 'Completo',
    incrementalMode: 'Incremental',
    dataCounts: 'Datos Actuales',
    created: 'Creado',
    trigger: 'Origen',
    mode: 'Modo',
    size: 'Tamaño',
    actions: 'Acciones',
    viewChanges: 'Ver Cambios',
    changeDetails: 'Detalle de Cambios',
    close: 'Cerrar',
    creating: 'Creando respaldo...',
    createdSuccess: 'Respaldo creado exitosamente',
    restoreSuccess: 'Restauración completada exitosamente',
    deleteSuccess: 'Respaldo eliminado exitosamente',
    error: 'Error',
    storageWarning: 'Almacenamiento casi lleno',
    storageWarningDesc: 'Considere eliminar respaldos antiguos para liberar espacio.',
    requiresDeletion: 'Límite de almacenamiento alcanzado',
    requiresDeletionDesc: 'Elimine algunos respaldos para crear uno nuevo.',
    selectBackupsToDelete: 'Seleccionar respaldos a eliminar',
    cancel: 'Cancelar',
    continue: 'Continuar',
    items: 'elementos',
    added: 'agregados',
    updated: 'actualizados',
    deleted: 'eliminados',
    linksCreated: 'enlaces creados',
    linksRemoved: 'enlaces eliminados',
    parentsCreated: 'padres creados',
  }
}

type Language = 'en' | 'es'

// ============================================
// COMPONENT
// ============================================

interface BackupManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  language?: Language
}

export function BackupManager({ open, onOpenChange, language = 'en' }: BackupManagerProps) {
  const t = translations[language]
  
  // State
  const [storage, setStorage] = useState<StorageInfo | null>(null)
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [dataCounts, setDataCounts] = useState<DataCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState(false)
  
  // Selection state
  const [selectedBackups, setSelectedBackups] = useState<Set<string>>(new Set())
  const [selectedDataTypes, setSelectedDataTypes] = useState<BackupDataType[]>([])
  
  // Dialogs
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [showChangesDialog, setShowChangesDialog] = useState(false)
  const [showStorageWarning, setShowStorageWarning] = useState(false)
  const [targetBackup, setTargetBackup] = useState<BackupInfo | null>(null)
  const [detailedChanges, setDetailedChanges] = useState<ChangeSummary | null>(null)
  
  // Messages
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Fetch data on mount
  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open])

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/backup')
      const data = await response.json()
      
      if (data.success) {
        setStorage(data.storage)
        setBackups(data.backups)
        setDataCounts(data.dataCounts)
      }
    } catch (error) {
      console.error('Error fetching backup data:', error)
    } finally {
      setLoading(false)
    }
  }

  const createBackup = async (mode: 'full' | 'incremental') => {
    setCreating(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          trigger: 'manual',
          mode
        })
      })
      
      const data = await response.json()
      
      if (data.requiresDeletion) {
        setShowStorageWarning(true)
      } else if (data.success) {
        setMessage({ type: 'success', text: t.createdSuccess })
        fetchData()
      } else {
        setMessage({ type: 'error', text: data.error || t.error })
      }
    } catch (error) {
      setMessage({ type: 'error', text: t.error })
    } finally {
      setCreating(false)
    }
  }

  const deleteBackup = async (backupId: string) => {
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          backupId
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setMessage({ type: 'success', text: t.deleteSuccess })
        fetchData()
        setSelectedBackups(new Set())
      } else {
        setMessage({ type: 'error', text: data.error || t.error })
      }
    } catch (error) {
      setMessage({ type: 'error', text: t.error })
    }
  }

  const deleteSelectedBackups = async () => {
    for (const backupId of selectedBackups) {
      await deleteBackup(backupId)
    }
    setShowDeleteDialog(false)
  }

  const restoreFromBackup = async () => {
    if (!targetBackup || selectedDataTypes.length === 0) return
    
    setRestoring(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'restore',
          backupId: targetBackup.id,
          dataTypes: selectedDataTypes,
          createPreRestoreBackup: true
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setMessage({ type: 'success', text: `${t.restoreSuccess}: ${data.restoredTypes.join(', ')}` })
        fetchData()
      } else {
        setMessage({ type: 'error', text: data.error || t.error })
      }
    } catch (error) {
      setMessage({ type: 'error', text: t.error })
    } finally {
      setRestoring(false)
      setShowRestoreDialog(false)
      setTargetBackup(null)
      setSelectedDataTypes([])
    }
  }

  const fetchDetailedChanges = async (backupId: string) => {
    try {
      const response = await fetch(`/api/backup?action=changes&backupId=${backupId}`)
      const data = await response.json()
      
      if (data.success) {
        setDetailedChanges(data.data)
        setShowChangesDialog(true)
      }
    } catch (error) {
      console.error('Error fetching changes:', error)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getTriggerBadge = (trigger: string) => {
    const colors: Record<string, string> = {
      manual: 'bg-blue-500/20 text-blue-400',
      auto: 'bg-green-500/20 text-green-400',
      before_restore: 'bg-yellow-500/20 text-yellow-400',
      scheduled: 'bg-purple-500/20 text-purple-400'
    }
    return (
      <Badge className={colors[trigger] || 'bg-gray-500/20 text-gray-400'}>
        {t[trigger as keyof typeof t] || trigger}
      </Badge>
    )
  }

  const getModeBadge = (mode: string) => {
    const colors: Record<string, string> = {
      full: 'bg-orange-500/20 text-orange-400',
      incremental: 'bg-cyan-500/20 text-cyan-400'
    }
    return (
      <Badge className={colors[mode] || 'bg-gray-500/20 text-gray-400'}>
        {mode === 'full' ? t.fullMode : t.incrementalMode}
      </Badge>
    )
  }

  const dataTypeOptions: { value: BackupDataType; label: string; icon: React.ReactNode }[] = [
    { value: 'notes', label: t.notes, icon: <FileText className="w-4 h-4" /> },
    { value: 'hierarchy', label: t.hierarchy, icon: <GitBranch className="w-4 h-4" /> },
    { value: 'conservation', label: t.conservation, icon: <Shield className="w-4 h-4" /> },
    { value: 'word_classification', label: t.wordClass, icon: <Tag className="w-4 h-4" /> },
    { value: 'nutrition', label: t.nutrition, icon: <Database className="w-4 h-4" /> },
    { value: 'recipe', label: t.recipes, icon: <FileText className="w-4 h-4" /> },
    { value: 'audit_logs', label: t.auditLogs, icon: <Clock className="w-4 h-4" /> },
    { value: 'all', label: t.all, icon: <Database className="w-4 h-4" /> },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            {t.title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{t.description}</p>
        </DialogHeader>
        
        <div className="p-6 space-y-6">
          {/* Storage Indicator */}
          {storage && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4" />
                    {t.storage}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {storage.totalSizeMB} MB / {storage.limitMB} MB
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress 
                  value={parseFloat(storage.usedPercent)} 
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{storage.usedPercent}% {t.used}</span>
                  <span>{storage.remainingSpaceMB} MB {t.remaining}</span>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <Badge variant="outline" className="text-orange-400 border-orange-400">
                      {t.fullMode}
                    </Badge>
                    {storage.fullBackupCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Badge variant="outline" className="text-cyan-400 border-cyan-400">
                      {t.incrementalMode}
                    </Badge>
                    {storage.incrementalBackupCount}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Data Counts */}
          {dataCounts && (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold">{dataCounts.notes}</div>
                <div className="text-xs text-muted-foreground">{t.notes}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold">{dataCounts.hierarchyLinked}</div>
                <div className="text-xs text-muted-foreground">{t.hierarchy}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold">{dataCounts.conservation}</div>
                <div className="text-xs text-muted-foreground">{t.conservation}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold">{dataCounts.wordClassifications}</div>
                <div className="text-xs text-muted-foreground">{t.wordClass}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold">{dataCounts.recipes}</div>
                <div className="text-xs text-muted-foreground">{t.recipes}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold">{dataCounts.auditLogs}</div>
                <div className="text-xs text-muted-foreground">{t.auditLogs}</div>
              </div>
            </div>
          )}

          {/* Message */}
          {message && (
            <div className={`p-3 rounded-lg flex items-center gap-2 ${
              message.type === 'success' 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {message.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              {message.text}
            </div>
          )}

          {/* Actions Bar */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button disabled={creating}>
                    {creating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {t.createBackup}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => createBackup('full')}>
                    <FileArchive className="w-4 h-4 mr-2" />
                    {t.createFullBackup}
                    <span className="text-xs text-muted-foreground ml-2">(~7 MB)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => createBackup('incremental')}>
                    <FileJson className="w-4 h-4 mr-2" />
                    {t.createIncrementalBackup}
                    <span className="text-xs text-muted-foreground ml-2">(~KB)</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {selectedBackups.size > 0 && (
                <Button 
                  variant="destructive" 
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t.deleteSelected} ({selectedBackups.size})
                </Button>
              )}
            </div>
            
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t.refresh || 'Refresh'}
            </Button>
          </div>

          {/* Backup List */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t.backups} ({backups.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : backups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t.noBackups}
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {backups.map((backup) => (
                      <div 
                        key={backup.id}
                        className="border rounded-lg p-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <Checkbox
                            checked={selectedBackups.has(backup.id)}
                            onCheckedChange={(checked) => {
                              const newSet = new Set(selectedBackups)
                              if (checked) {
                                newSet.add(backup.id)
                              } else {
                                newSet.delete(backup.id)
                              }
                              setSelectedBackups(newSet)
                            }}
                          />
                          
                          {/* Icon */}
                          <div className="mt-0.5">
                            {backup.mode === 'full' ? (
                              <FileArchive className="w-5 h-5 text-orange-400" />
                            ) : (
                              <FileJson className="w-5 h-5 text-cyan-400" />
                            )}
                          </div>
                          
                          {/* Main content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs truncate">
                                {backup.filename}
                              </span>
                              {getTriggerBadge(backup.trigger)}
                              {getModeBadge(backup.mode)}
                            </div>
                            
                            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTimestamp(backup.timestamp)}
                              </span>
                              <span>{backup.fileSizeMB} MB</span>
                              {backup.triggerSource && (
                                <span className="text-primary">
                                  {backup.triggerSource}
                                </span>
                              )}
                            </div>
                            
                            {/* Change Summary */}
                            {backup.changeSummary && backup.changeSummary.totalChanges > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {backup.changeSummary.notes > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    <FileText className="w-3 h-3 mr-1" />
                                    {t.notes}: {backup.changeSummary.notes}
                                  </Badge>
                                )}
                                {backup.changeSummary.hierarchy > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    <GitBranch className="w-3 h-3 mr-1" />
                                    {t.hierarchy}: {backup.changeSummary.hierarchy}
                                  </Badge>
                                )}
                                {backup.changeSummary.conservation > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    <Shield className="w-3 h-3 mr-1" />
                                    {t.conservation}: {backup.changeSummary.conservation}
                                  </Badge>
                                )}
                                {backup.changeSummary.wordClass > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    <Tag className="w-3 h-3 mr-1" />
                                    {t.wordClass}: {backup.changeSummary.wordClass}
                                  </Badge>
                                )}
                                <Badge className="text-xs bg-primary/20">
                                  {t.totalChanges}: {backup.changeSummary.totalChanges}
                                </Badge>
                              </div>
                            )}
                            
                            {backup.changeSummary && backup.changeSummary.totalChanges === 0 && (
                              <div className="mt-2 text-xs text-muted-foreground italic">
                                {t.noChanges}
                              </div>
                            )}
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            {backup.mode === 'incremental' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => fetchDetailedChanges(backup.id)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <ChevronDown className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setTargetBackup(backup)
                                    setSelectedDataTypes(['all'])
                                    setShowRestoreDialog(true)
                                  }}
                                >
                                  <RotateCcw className="w-4 h-4 mr-2" />
                                  {t.restore}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => deleteBackup(backup.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  {t.delete}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.confirmDelete}</AlertDialogTitle>
              <AlertDialogDescription>
                {t.confirmDeleteDesc}
                <div className="mt-2 text-sm">
                  {t.selectBackupsToDelete}: {selectedBackups.size} {t.items}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground"
                onClick={deleteSelectedBackups}
              >
                {t.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Restore Dialog */}
        <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.confirmRestore}</AlertDialogTitle>
              <AlertDialogDescription>
                {t.restoreWarning}
                <div className="mt-4 space-y-2">
                  <div className="text-sm font-medium">{t.selectRestoreTypes}:</div>
                  <div className="grid grid-cols-2 gap-2">
                    {dataTypeOptions.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={selectedDataTypes.includes(option.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              if (option.value === 'all') {
                                setSelectedDataTypes(['all'])
                              } else {
                                setSelectedDataTypes([
                                  ...selectedDataTypes.filter(t => t !== 'all'),
                                  option.value
                                ])
                              }
                            } else {
                              setSelectedDataTypes(
                                selectedDataTypes.filter(t => t !== option.value)
                              )
                            }
                          }}
                        />
                        {option.icon}
                        <span className="text-sm">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
              <AlertDialogAction
                onClick={restoreFromBackup}
                disabled={restoring || selectedDataTypes.length === 0}
              >
                {restoring ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {t.restore}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Detailed Changes Dialog */}
        <Dialog open={showChangesDialog} onOpenChange={setShowChangesDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>{t.changeDetails}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[60vh]">
              {detailedChanges && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-primary">
                        {detailedChanges.totalChanges}
                      </div>
                      <div className="text-xs text-muted-foreground">{t.totalChanges}</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-2xl font-bold">
                        {detailedChanges.notes.added + detailedChanges.notes.updated + detailedChanges.notes.deleted}
                      </div>
                      <div className="text-xs text-muted-foreground">{t.notes}</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-2xl font-bold">
                        {detailedChanges.hierarchy.linksCreated + detailedChanges.hierarchy.linksRemoved}
                      </div>
                      <div className="text-xs text-muted-foreground">{t.hierarchy}</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-2xl font-bold">
                        {detailedChanges.conservation.added + detailedChanges.conservation.updated}
                      </div>
                      <div className="text-xs text-muted-foreground">{t.conservation}</div>
                    </div>
                  </div>

                  {/* Detailed lists */}
                  <Accordion type="multiple" className="w-full">
                    {/* Notes Changes */}
                    {detailedChanges.notes.items.length > 0 && (
                      <AccordionItem value="notes">
                        <AccordionTrigger className="text-sm">
                          <span className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            {t.notes} ({detailedChanges.notes.items.length})
                            <span className="text-xs text-muted-foreground">
                              (+{detailedChanges.notes.added} / ~{detailedChanges.notes.updated} / -{detailedChanges.notes.deleted})
                            </span>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {detailedChanges.notes.items.map((item, idx) => (
                              <div key={idx} className="text-xs p-2 bg-muted/30 rounded">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {item.changeType}
                                  </Badge>
                                  <span className="font-medium">{item.name}</span>
                                </div>
                                {item.oldValue && (
                                  <div className="mt-1 text-muted-foreground">
                                    <span className="line-through">{item.oldValue}</span>
                                  </div>
                                )}
                                {item.newValue && (
                                  <div className="mt-1 text-green-400">
                                    {item.newValue}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Hierarchy Changes */}
                    {detailedChanges.hierarchy.items.length > 0 && (
                      <AccordionItem value="hierarchy">
                        <AccordionTrigger className="text-sm">
                          <span className="flex items-center gap-2">
                            <GitBranch className="w-4 h-4" />
                            {t.hierarchy} ({detailedChanges.hierarchy.items.length})
                            <span className="text-xs text-muted-foreground">
                              (+{detailedChanges.hierarchy.linksCreated} links / {detailedChanges.hierarchy.parentsCreated} parents)
                            </span>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {detailedChanges.hierarchy.items.map((item, idx) => (
                              <div key={idx} className="text-xs p-2 bg-muted/30 rounded">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {item.changeType}
                                  </Badge>
                                  <span className="font-medium">{item.name}</span>
                                </div>
                                {item.oldValue && item.newValue && (
                                  <div className="mt-1">
                                    <span className="text-muted-foreground">{item.oldValue}</span>
                                    {' → '}
                                    <span className="text-green-400">{item.newValue}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Conservation Changes */}
                    {detailedChanges.conservation.items.length > 0 && (
                      <AccordionItem value="conservation">
                        <AccordionTrigger className="text-sm">
                          <span className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            {t.conservation} ({detailedChanges.conservation.items.length})
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {detailedChanges.conservation.items.map((item, idx) => (
                              <div key={idx} className="text-xs p-2 bg-muted/30 rounded">
                                <Badge variant="outline" className="text-xs mr-2">
                                  {item.changeType}
                                </Badge>
                                <span className="font-medium">{item.name}</span>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Word Classification Changes */}
                    {detailedChanges.wordClassification.items.length > 0 && (
                      <AccordionItem value="wordClass">
                        <AccordionTrigger className="text-sm">
                          <span className="flex items-center gap-2">
                            <Tag className="w-4 h-4" />
                            {t.wordClass} ({detailedChanges.wordClassification.items.length})
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {detailedChanges.wordClassification.items.map((item, idx) => (
                              <div key={idx} className="text-xs p-2 bg-muted/30 rounded">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {item.changeType}
                                  </Badge>
                                  <span className="font-medium">{item.name}</span>
                                  {item.newValue && (
                                    <Badge className="text-xs">{item.newValue}</Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                </div>
              )}
            </ScrollArea>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowChangesDialog(false)}>
                {t.close}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Storage Warning Dialog */}
        <AlertDialog open={showStorageWarning} onOpenChange={setShowStorageWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                {t.requiresDeletion}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t.requiresDeletionDesc}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
              <AlertDialogAction onClick={() => setShowStorageWarning(false)}>
                {t.continue}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}
