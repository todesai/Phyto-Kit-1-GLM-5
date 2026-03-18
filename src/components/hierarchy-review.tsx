'use client'

import { useState, useEffect } from 'react'
import {
  AlertTriangle, Check, X, ChevronDown, ChevronRight, Loader2,
  RefreshCw, Search, Database, ArrowRight, AlertCircle, Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

interface ChildItem {
  id: string
  nombreEspanol: string
  descriptor: string | null
  taxon: string | null
  hierarchyStatus: string | null
  hierarchyNotes: string | null
}

interface ParentReview {
  id: string
  nombreEspanol: string
  nombreBase: string | null
  taxon: string | null
  childCount: number
  hierarchyStatus: string | null
  hierarchyNotes: string | null
  children: ChildItem[]
  hasTaxonConflict: boolean
  taxonConflicts: Array<{ id: string; nombreEspanol: string; taxon: string | null }>
  hasDerivedProducts: boolean
  derivedProducts: Array<{ id: string; nombreEspanol: string }>
  hasDifferentEntities: boolean
  differentEntities: Array<{ id: string; nombreEspanol: string }>
}

interface HierarchyReviewProps {
  language?: 'en' | 'es'
}

const translations = {
  en: {
    title: 'Ingredient Hierarchy Review',
    description: 'Review and confirm parent-child relationships. Same species = valid; Different species = reject.',
    loading: 'Loading...',
    noItems: 'No items to review',
    parent: 'Parent',
    children: 'children',
    scientificName: 'Scientific Name',
    confirmParent: 'Confirm Parent',
    confirmAll: 'Confirm All',
    rejectAllInvalid: 'Reject Invalid',
    pending: 'Pending',
    confirmed: 'Confirmed',
    rejected: 'Rejected',
    needsReview: 'Needs Review',
    notes: 'Notes',
    addNote: 'Add a note...',
    searchPlaceholder: 'Search...',
    filter: 'Filter',
    all: 'All',
    conflictsOnly: 'Conflicts Only',
    unconfirmed: 'Unconfirmed',
    page: 'Page',
    of: 'of',
    prev: 'Previous',
    next: 'Next',
    refresh: 'Refresh',
    totalParents: 'Parents',
    totalChildren: 'Children',
    confirmedCount: 'Confirmed',
    rejectedCount: 'Rejected',
    taxonConflicts: 'Taxon Conflicts',
    conflictWarning: 'Different scientific name detected',
    derivedProduct: 'Derived Product',
    derivedWarning: 'Derived product from another ingredient',
    differentEntity: 'Different Entity',
    entityWarning: 'Different biological species - not a derived form',
    sameSpecies: 'Same species - valid relationship',
    selectChildren: 'Select children to action',
    selected: 'selected',
    confirmSelected: 'Confirm Selected',
    rejectSelected: 'Reject Selected',
    reassignTo: 'Reassign to...',
    searchParents: 'Search for parent...',
    noParentFound: 'No matching parent found',
    reassign: 'Reassign',
    cancel: 'Cancel',
    processing: 'Processing...',
    success: 'Success!',
    stats: 'Statistics',
  },
  es: {
    title: 'Revisión de Jerarquía',
    description: 'Revisar relaciones padre-hijo. Misma especie = válido; Especie diferente = rechazar.',
    loading: 'Cargando...',
    noItems: 'No hay elementos',
    parent: 'Padre',
    children: 'hijos',
    scientificName: 'Nombre Científico',
    confirmParent: 'Confirmar Padre',
    confirmAll: 'Confirmar Todo',
    rejectAllInvalid: 'Rechazar Inválidos',
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    rejected: 'Rechazado',
    needsReview: 'Requiere Revisión',
    notes: 'Notas',
    addNote: 'Agregar nota...',
    searchPlaceholder: 'Buscar...',
    filter: 'Filtrar',
    all: 'Todos',
    conflictsOnly: 'Solo Conflictos',
    unconfirmed: 'Sin Confirmar',
    page: 'Página',
    of: 'de',
    prev: 'Anterior',
    next: 'Siguiente',
    refresh: 'Actualizar',
    totalParents: 'Padres',
    totalChildren: 'Hijos',
    confirmedCount: 'Confirmados',
    rejectedCount: 'Rechazados',
    taxonConflicts: 'Conflictos de Taxón',
    conflictWarning: 'Nombre científico diferente detectado',
    derivedProduct: 'Producto Derivado',
    derivedWarning: 'Producto derivado de otro ingrediente',
    differentEntity: 'Entidad Diferente',
    entityWarning: 'Especie biológica diferente - no es forma derivada',
    sameSpecies: 'Misma especie - relación válida',
    selectChildren: 'Seleccionar hijos para acción',
    selected: 'seleccionados',
    confirmSelected: 'Confirmar Seleccionados',
    rejectSelected: 'Rechazar Seleccionados',
    reassignTo: 'Reasignar a...',
    searchParents: 'Buscar padre...',
    noParentFound: 'No se encontró padre',
    reassign: 'Reasignar',
    cancel: 'Cancelar',
    processing: 'Procesando...',
    success: '¡Éxito!',
    stats: 'Estadísticas',
  }
}

export function HierarchyReview({ language = 'en' }: HierarchyReviewProps) {
  const t = translations[language]
  
  const [reviews, setReviews] = useState<ParentReview[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'conflicts' | 'unconfirmed'>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [stats, setStats] = useState({
    total: 0, parents: 0, children: 0, confirmed: 0, pending: 0, rejected: 0, taxonConflicts: 0
  })
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedChildren, setSelectedChildren] = useState<Set<string>>(new Set())
  const [reassignDialog, setReassignDialog] = useState<{ childId: string; childName: string } | null>(null)
  const [parentSearch, setParentSearch] = useState('')
  const [parentResults, setParentResults] = useState<Array<{ id: string; nombreEspanol: string; taxon: string | null }>>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showAuditHistory, setShowAuditHistory] = useState(false)
  const [auditLogs, setAuditLogs] = useState<Array<{
    id: string
    itemName: string
    action: string
    oldParentName: string | null
    newParentName: string | null
    oldStatus: string | null
    newStatus: string | null
    reviewedBy: string | null
    createdAt: string
  }>>([])

  useEffect(() => {
    fetchReviews()
    fetchStats()
  }, [page, filter])

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('action', 'pending-reviews')
      params.append('page', page.toString())
      params.append('limit', '10')
      params.append('filter', filter)
      
      const response = await fetch(`/api/mexican-food/hierarchy?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setReviews(data.reviews)
        setTotalPages(data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/mexican-food/hierarchy?action=stats')
      const data = await response.json()
      if (data.success) {
        setStats({
          total: data.stats.total,
          parents: data.stats.parents,
          children: data.stats.children,
          confirmed: data.stats.confirmed,
          pending: data.stats.pending,
          rejected: data.stats.rejected,
          taxonConflicts: data.stats.taxonConflicts,
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchAuditHistory = async () => {
    try {
      const response = await fetch('/api/mexican-food/hierarchy?action=audit-history&limit=10')
      const data = await response.json()
      if (data.success) {
        setAuditLogs(data.logs)
      }
    } catch (error) {
      console.error('Error fetching audit history:', error)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleChildSelection = (childId: string) => {
    setSelectedChildren(prev => {
      const next = new Set(prev)
      if (next.has(childId)) next.delete(childId)
      else next.add(childId)
      return next
    })
  }

  const confirmParent = async (parentId: string) => {
    setActionLoading(parentId)
    try {
      const response = await fetch('/api/mexican-food/hierarchy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm-parent',
          parentId,
          notes: notes[parentId],
          reviewedBy: 'user'
        })
      })
      if (response.ok) {
        showMessage('success', t.success)
        fetchReviews()
        fetchStats()
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const confirmAllChildren = async (parentId: string) => {
    setActionLoading(parentId)
    try {
      const response = await fetch('/api/mexican-food/hierarchy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm-all-children',
          parentId,
          notes: notes[parentId],
          reviewedBy: 'user'
        })
      })
      if (response.ok) {
        showMessage('success', t.success)
        fetchReviews()
        fetchStats()
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const rejectInvalidChildren = async (parentId: string, invalidChildIds: string[]) => {
    if (invalidChildIds.length === 0) return
    setActionLoading(parentId)
    try {
      const response = await fetch('/api/mexican-food/hierarchy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject-multiple-children',
          childIds: invalidChildIds,
          notes: 'Different biological entity - not a derived form',
          reviewedBy: 'user'
        })
      })
      if (response.ok) {
        showMessage('success', `${invalidChildIds.length} ${language === 'es' ? 'hijos rechazados' : 'children rejected'}`)
        fetchReviews()
        fetchStats()
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const confirmSelected = async (parentId: string) => {
    if (selectedChildren.size === 0) return
    setActionLoading(parentId)
    try {
      const promises = Array.from(selectedChildren).map(childId =>
        fetch('/api/mexican-food/hierarchy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'confirm-child', childId, reviewedBy: 'user' })
        })
      )
      await Promise.all(promises)
      showMessage('success', t.success)
      setSelectedChildren(new Set())
      fetchReviews()
      fetchStats()
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const rejectSelected = async (parentId: string) => {
    if (selectedChildren.size === 0) return
    setActionLoading(parentId)
    try {
      await fetch('/api/mexican-food/hierarchy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject-multiple-children',
          childIds: Array.from(selectedChildren),
          notes: 'Different biological entity',
          reviewedBy: 'user'
        })
      })
      showMessage('success', t.success)
      setSelectedChildren(new Set())
      fetchReviews()
      fetchStats()
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const searchParents = async (query: string) => {
    if (!query) {
      setParentResults([])
      return
    }
    try {
      const response = await fetch(`/api/mexican-food/hierarchy?action=search-parents&q=${encodeURIComponent(query)}&limit=10`)
      const data = await response.json()
      if (data.success) {
        setParentResults(data.parents)
      }
    } catch (error) {
      console.error('Error searching parents:', error)
    }
  }

  const reassignChild = async (childId: string, newParentId: string) => {
    setActionLoading(childId)
    try {
      await fetch('/api/mexican-food/hierarchy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reassign-child',
          childId,
          newParentId,
          reviewedBy: 'user'
        })
      })
      showMessage('success', t.success)
      setReassignDialog(null)
      fetchReviews()
      fetchStats()
    } catch (error) {
      console.error('Error reassigning:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="default" className="bg-green-600 text-xs">{t.confirmed}</Badge>
      case 'rejected':
        return <Badge variant="destructive" className="text-xs">{t.rejected}</Badge>
      case 'needs_review':
        return <Badge variant="secondary" className="bg-yellow-600 text-xs">{t.needsReview}</Badge>
      default:
        return <Badge variant="outline" className="text-xs">{t.pending}</Badge>
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{t.title}</h2>
          <p className="text-sm text-muted-foreground">{t.description}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchReviews(); fetchStats(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t.refresh}
        </Button>
      </div>

      {/* Message */}
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-5 gap-2">
        <Card className="p-3">
          <div className="text-xl font-bold">{stats.parents}</div>
          <div className="text-xs text-muted-foreground">{t.totalParents}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xl font-bold">{stats.children}</div>
          <div className="text-xs text-muted-foreground">{t.totalChildren}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xl font-bold text-green-600">{stats.confirmed}</div>
          <div className="text-xs text-muted-foreground">{t.confirmedCount}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xl font-bold text-orange-600">{stats.pending}</div>
          <div className="text-xs text-muted-foreground">{t.pending}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xl font-bold text-red-600">{stats.rejected}</div>
          <div className="text-xs text-muted-foreground">{t.rejected}</div>
        </Card>
      </div>

      {/* Audit History Toggle */}
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            setShowAuditHistory(!showAuditHistory)
            if (!showAuditHistory) fetchAuditHistory()
          }}
        >
          <Info className="h-4 w-4 mr-2" />
          {language === 'es' ? 'Historial de Cambios' : 'Recent Changes'}
        </Button>
      </div>

      {/* Audit History Panel */}
      {showAuditHistory && (
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="text-sm">{language === 'es' ? 'Últimos Cambios' : 'Recent Changes'}</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            {auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">{language === 'es' ? 'Sin cambios recientes' : 'No recent changes'}</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {auditLogs.map(log => (
                  <div key={log.id} className="text-xs border-b pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{log.action}</Badge>
                      <span className="font-medium">{log.itemName}</span>
                    </div>
                    <div className="text-muted-foreground mt-1">
                      {log.oldParentName && (
                        <span>{language === 'es' ? 'De' : 'From'}: {log.oldParentName} → </span>
                      )}
                      {log.newParentName && (
                        <span>{language === 'es' ? 'A' : 'To'}: {log.newParentName}</span>
                      )}
                      {log.oldStatus && log.newStatus && (
                        <span className="ml-2">({log.oldStatus} → {log.newStatus})</span>
                      )}
                    </div>
                    <div className="text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()} • {log.reviewedBy}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          className="border rounded-md px-3 py-2 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
        >
          <option value="all">{t.all}</option>
          <option value="conflicts">{t.conflictsOnly}</option>
          <option value="unconfirmed">{t.unconfirmed}</option>
        </select>
      </div>

      {/* Reviews */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">{t.loading}</span>
        </div>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Database className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">{t.noItems}</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[500px] pr-2">
          <div className="space-y-3">
            {reviews.map((review) => {
              // Identify invalid children
              const invalidChildren = [
                ...review.taxonConflicts,
                ...review.derivedProducts,
                ...review.differentEntities,
              ]
              const validChildren = review.children.filter(
                c => !invalidChildren.find(ic => ic.id === c.id)
              )

              return (
                <Card key={review.id} className={review.hasTaxonConflict || review.hasDifferentEntities ? 'border-yellow-500' : ''}>
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <Button variant="ghost" size="sm" className="p-1" onClick={() => toggleExpanded(review.id)}>
                          {expandedItems.has(review.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {review.nombreEspanol}
                            {getStatusBadge(review.hierarchyStatus)}
                            {(review.hasTaxonConflict || review.hasDifferentEntities) && (
                              <Badge variant="outline" className="border-yellow-500 text-yellow-600 text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {review.taxonConflicts.length + review.differentEntities.length}
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {t.parent} • {review.childCount} {t.children}
                            {review.taxon && <span className="ml-2"><em>{review.taxon}</em></span>}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="default" onClick={() => confirmParent(review.id)} disabled={actionLoading === review.id}>
                          {actionLoading === review.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {expandedItems.has(review.id) && (
                    <CardContent className="py-2 px-4 space-y-3">
                      {/* Warnings */}
                      {(review.hasTaxonConflict || review.hasDifferentEntities || review.hasDerivedProducts) && (
                        <Alert className="py-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle className="text-sm">{t.taxonConflicts}</AlertTitle>
                          <AlertDescription className="text-xs">
                            <ul className="mt-1 space-y-1">
                              {review.taxonConflicts.map(c => (
                                <li key={c.id} className="flex items-center gap-2">
                                  <AlertCircle className="h-3 w-3 text-red-500" />
                                  <span>{c.nombreEspanol}</span>
                                  <span className="text-muted-foreground">({c.taxon})</span>
                                </li>
                              ))}
                              {review.differentEntities.map(c => (
                                <li key={c.id} className="flex items-center gap-2">
                                  <AlertCircle className="h-3 w-3 text-red-500" />
                                  <span>{c.nombreEspanol}</span>
                                  <span className="text-red-600 text-xs">({t.differentEntity})</span>
                                </li>
                              ))}
                              {review.derivedProducts.map(c => (
                                <li key={c.id} className="flex items-center gap-2">
                                  <Info className="h-3 w-3 text-yellow-500" />
                                  <span>{c.nombreEspanol}</span>
                                  <span className="text-yellow-600 text-xs">({t.derivedProduct})</span>
                                </li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Notes */}
                      <Textarea
                        placeholder={t.addNote}
                        value={notes[review.id] || ''}
                        onChange={(e) => setNotes(prev => ({ ...prev, [review.id]: e.target.value }))}
                        className="h-16 text-sm"
                      />

                      {/* Quick Actions */}
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => confirmAllChildren(review.id)} disabled={actionLoading === review.id}>
                          <Check className="h-3 w-3 mr-1" />
                          {t.confirmAll}
                        </Button>
                        {invalidChildren.length > 0 && (
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => rejectInvalidChildren(review.id, invalidChildren.map(c => c.id))}
                            disabled={actionLoading === review.id}
                          >
                            <X className="h-3 w-3 mr-1" />
                            {t.rejectAllInvalid} ({invalidChildren.length})
                          </Button>
                        )}
                      </div>

                      {/* Children List */}
                      <div className="space-y-1">
                        {review.children.map(child => {
                          const isInvalid = invalidChildren.find(c => c.id === child.id)
                          const isDerived = review.derivedProducts.find(c => c.id === child.id)
                          const isDifferent = review.differentEntities.find(c => c.id === child.id)

                          return (
                            <div
                              key={child.id}
                              className={`flex items-center justify-between p-2 rounded text-sm ${
                                isDifferent ? 'bg-red-50 dark:bg-red-950 border border-red-200' :
                                isDerived ? 'bg-yellow-50 dark:bg-yellow-950 border border-yellow-200' :
                                'bg-muted/50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedChildren.has(child.id)}
                                  onChange={() => toggleChildSelection(child.id)}
                                  className="rounded"
                                />
                                <div>
                                  <span className="font-medium">{child.nombreEspanol}</span>
                                  {child.descriptor && (
                                    <Badge variant="outline" className="ml-2 text-xs">{child.descriptor}</Badge>
                                  )}
                                  {getStatusBadge(child.hierarchyStatus)}
                                  {isDifferent && (
                                    <Badge variant="destructive" className="ml-2 text-xs">{t.differentEntity}</Badge>
                                  )}
                                  {isDerived && (
                                    <Badge variant="outline" className="ml-2 text-xs border-yellow-500">{t.derivedProduct}</Badge>
                                  )}
                                  {child.taxon && child.taxon !== review.taxon && (
                                    <span className="ml-2 text-xs text-red-600"><em>{child.taxon}</em></span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7"
                                  onClick={() => setReassignDialog({ childId: child.id, childName: child.nombreEspanol })}
                                >
                                  <ArrowRight className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Bulk Actions */}
                      {selectedChildren.size > 0 && (
                        <div className="flex gap-2 pt-2 border-t">
                          <span className="text-sm text-muted-foreground self-center">
                            {selectedChildren.size} {t.selected}
                          </span>
                          <Button size="sm" variant="outline" onClick={() => confirmSelected(review.id)}>
                            {t.confirmSelected}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => rejectSelected(review.id)}>
                            {t.rejectSelected}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        </ScrollArea>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t.page} {page} {t.of} {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              {t.prev}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              {t.next}
            </Button>
          </div>
        </div>
      )}

      {/* Reassign Dialog */}
      <Dialog open={!!reassignDialog} onOpenChange={() => setReassignDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.reassignTo}</DialogTitle>
            <DialogDescription>
              {reassignDialog?.childName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.searchParents}
                value={parentSearch}
                onChange={(e) => { setParentSearch(e.target.value); searchParents(e.target.value); }}
                className="pl-10"
              />
            </div>
            <ScrollArea className="h-60">
              {parentResults.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">{t.noParentFound}</p>
              ) : (
                <div className="space-y-1">
                  {parentResults.map(parent => (
                    <Button
                      key={parent.id}
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => reassignChild(reassignDialog!.childId, parent.id)}
                    >
                      <div className="text-left">
                        <div>{parent.nombreEspanol}</div>
                        {parent.taxon && <div className="text-xs text-muted-foreground"><em>{parent.taxon}</em></div>}
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
