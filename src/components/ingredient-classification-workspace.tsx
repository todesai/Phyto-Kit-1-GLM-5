'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Search, Loader2, Check, RefreshCw,
  CheckCircle2, XCircle, Link2, Tag, ArrowRight,
  ChevronDown, ChevronUp, X, Globe, Microscope, ArrowUpFromLine, Plus, ChefHat, MinusCircle,
  AlertTriangle, ShieldAlert, Info, FileWarning, Shield, HelpCircle
} from 'lucide-react'

// ============================================
// TYPES
// ============================================

interface WordClassification {
  id: string
  word: string
  wordLower: string
  category: string
  needsReview: boolean
}

interface MexicanFood {
  id: string
  nombreEspanol: string
  taxon: string | null
  isParent: boolean
  parentIngredientId: string | null
  childCount: number
  tipoAlimento: string | null
  hierarchyStatus: string | null
  conservationStatus?: string | null
  notes?: string | null
}

// Conservation status interface for structured data
interface ConservationStatusData {
  citesStatus?: 'I' | 'II' | 'III' | 'not_listed' | 'unknown'
  iucnCategory?: 'EX' | 'EW' | 'CR' | 'EN' | 'VU' | 'NT' | 'LC' | 'DD' | 'NE'
  regionalStatus?: string  // e.g., 'NOM-059: Amenazada'
  riskLevel?: 'critical' | 'high' | 'moderate' | 'low' | 'stable' | 'unknown'
  tradeRestricted?: boolean
  seasonalRestrictions?: string[]
  lastAssessed?: string
  sources?: string[]
  // Match information
  matchType?: 'exact' | 'genus_inference' | 'web_search' | 'not_found' | 'error'
  matchedSpecies?: string  // When genus inference, which species was matched
  needsVerification?: boolean  // True if the result should be manually verified
}

interface ParentCandidate {
  word: string
  wordLower: string
  itemId: string
  potentialChildren: number
  isParent: boolean
  currentChildren: number
  tipoAlimento: string | null
  taxon?: string | null
  scientificName?: string | null
  childrenWithoutScientificName?: number
  childrenWithUnknownWords?: number
  conservationStatus?: string | null
  notes?: string | null
}

interface ChildWithWords {
  id: string
  nombreEspanol: string
  words: WordBreakdown[]
  tipoAlimento: string | null
  isLinked: boolean
  parentName: string | null
  taxon?: string | null
  scientificNameNotNeeded?: boolean
  conservationStatus?: string | null
  notes?: string | null
}

interface WordBreakdown {
  word: string
  wordLower: string
  isParent: boolean
  classification: WordClassification | null
  classificationId: string | null
}

interface Stats {
  totalParents: number
  totalAllItems: number
  completedCount: number
  confirmedParents: number
  unconfirmedWithChildren: number
  childrenWithoutScientificName: number
  totalChildren: number
  pendingLinks: number
  wordsClassified: number
  wordsPending: number
}

interface GlobalEdibleItem {
  id: string
  name: string
  scientificName: string | null
  category: string | null
}

// ============================================
// CONSTANTS
// ============================================

const WORD_CATEGORIES = [
  { value: 'core', label: 'Core Ingredient', color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-100' },
  { value: 'descriptor', label: 'Descriptor', color: 'bg-amber-500', textColor: 'text-amber-700', bgColor: 'bg-amber-100' },
  { value: 'processing', label: 'Processing/Processed', color: 'bg-orange-500', textColor: 'text-orange-700', bgColor: 'bg-orange-100' },
  { value: 'form', label: 'Form/Cut', color: 'bg-pink-500', textColor: 'text-pink-700', bgColor: 'bg-pink-100' },
  { value: 'color', label: 'Color', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  { value: 'state', label: 'State/Ripeness', color: 'bg-purple-500', textColor: 'text-purple-700', bgColor: 'bg-purple-100' },
  { value: 'part', label: 'Plant Part', color: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-100' },
  { value: 'size', label: 'Size', color: 'bg-cyan-500', textColor: 'text-cyan-700', bgColor: 'bg-cyan-100' },
  { value: 'presentation', label: 'Presentation', color: 'bg-indigo-500', textColor: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  { value: 'variety', label: 'Variety', color: 'bg-teal-500', textColor: 'text-teal-700', bgColor: 'bg-teal-100' },
  { value: 'connector', label: 'Connector', color: 'bg-gray-500', textColor: 'text-gray-700', bgColor: 'bg-gray-100' },
  { value: 'excluded', label: 'Excluded', color: 'bg-slate-400', textColor: 'text-slate-600', bgColor: 'bg-slate-100' },
  { value: 'unknown', label: 'Unknown', color: 'bg-red-400', textColor: 'text-red-700', bgColor: 'bg-red-100' },
]

const PAGE_SIZES = [50, 100, 200, 500]

// View mode type for cleaner state management
type ViewMode = 'active' | 'rejected' | 'prepared' | 'completed'

// ============================================
// CONSERVATION STATUS CONSTANTS
// ============================================

// CITES Status Options
const CITES_STATUS_OPTIONS = [
  { value: 'not_listed', label: 'Not Listed', description: 'Not protected under CITES', color: 'text-gray-600' },
  { value: 'III', label: 'Appendix III', description: 'Protected in at least one country', color: 'text-blue-600' },
  { value: 'II', label: 'Appendix II', description: 'Trade regulated (permit required)', color: 'text-orange-600' },
  { value: 'I', label: 'Appendix I', description: 'Trade prohibited (critically endangered)', color: 'text-red-600' },
  { value: 'unknown', label: 'Unknown', description: 'Status not yet assessed', color: 'text-gray-400' },
]

// IUCN Red List Categories
const IUCN_CATEGORIES = [
  { value: 'LC', label: 'Least Concern', description: 'Low risk of extinction', color: 'text-green-600', bgColor: 'bg-green-100' },
  { value: 'NT', label: 'Near Threatened', description: 'Likely to become endangered', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  { value: 'VU', label: 'Vulnerable', description: 'High risk of extinction in wild', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  { value: 'EN', label: 'Endangered', description: 'Very high risk of extinction', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  { value: 'CR', label: 'Critically Endangered', description: 'Extremely high risk of extinction', color: 'text-red-600', bgColor: 'bg-red-100' },
  { value: 'EW', label: 'Extinct in the Wild', description: 'Survives only in captivity', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  { value: 'EX', label: 'Extinct', description: 'No longer exists', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  { value: 'DD', label: 'Data Deficient', description: 'Insufficient data to assess', color: 'text-gray-500', bgColor: 'bg-gray-50' },
  { value: 'NE', label: 'Not Evaluated', description: 'Not yet assessed by IUCN', color: 'text-gray-400', bgColor: 'bg-gray-50' },
]

// Risk Level Options
const RISK_LEVELS = [
  { value: 'stable', label: 'Stable', description: 'Population stable, no immediate concern', icon: '✓', color: 'text-green-600', bgColor: 'bg-green-100' },
  { value: 'low', label: 'Low Risk', description: 'Minor concerns, monitor situation', icon: '○', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  { value: 'moderate', label: 'Moderate Risk', description: 'Some restrictions may apply', icon: '◐', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  { value: 'high', label: 'High Risk', description: 'Significant restrictions, use alternatives', icon: '◑', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  { value: 'critical', label: 'Critical', description: 'Avoid use, seek alternatives', icon: '!', color: 'text-red-600', bgColor: 'bg-red-100' },
  { value: 'unknown', label: 'Unknown', description: 'Status not yet determined', icon: '?', color: 'text-gray-500', bgColor: 'bg-gray-100' },
]

// Helper function to parse conservation status JSON
function parseConservationStatus(jsonString: string | null | undefined): ConservationStatusData | null {
  if (!jsonString) return null
  try {
    return JSON.parse(jsonString)
  } catch {
    return null
  }
}

// Helper function to get risk level info
function getRiskLevelInfo(riskLevel: string | undefined) {
  return RISK_LEVELS.find(r => r.value === riskLevel) || RISK_LEVELS.find(r => r.value === 'unknown')!
}

// Helper function to get IUCN category info
function getIucnCategoryInfo(category: string | undefined) {
  return IUCN_CATEGORIES.find(c => c.value === category) || IUCN_CATEGORIES.find(c => c.value === 'NE')!
}

// Helper function to get CITES status info
function getCitesStatusInfo(status: string | undefined) {
  return CITES_STATUS_OPTIONS.find(s => s.value === status) || CITES_STATUS_OPTIONS.find(s => s.value === 'unknown')!
}

// Check if item has any conservation concerns
function hasConservationConcerns(status: ConservationStatusData | null): boolean {
  if (!status) return false
  return (
    status.riskLevel === 'critical' ||
    status.riskLevel === 'high' ||
    status.riskLevel === 'moderate' ||
    status.citesStatus === 'I' ||
    status.citesStatus === 'II' ||
    status.iucnCategory === 'CR' ||
    status.iucnCategory === 'EN' ||
    status.iucnCategory === 'VU' ||
    status.iucnCategory === 'EW' ||
    status.tradeRestricted === true
  )
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getCategoryInfo(category: string) {
  return WORD_CATEGORIES.find(c => c.value === category) || WORD_CATEGORIES[WORD_CATEGORIES.length - 1]
}

function removeParentheses(text: string): string {
  return text.replace(/\([^)]*\)/g, '').trim()
}

function tokenizeName(name: string): string[] {
  const cleaned = removeParentheses(name)
  return cleaned.toLowerCase().split(/\s+/).filter(w => w.length > 0)
}

// ============================================
// COMPONENT
// ============================================

interface IngredientClassificationWorkspaceProps {
  onClose?: () => void
}

export function IngredientClassificationWorkspace({ onClose }: IngredientClassificationWorkspaceProps) {
  // State
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Parent candidates state
  const [parentCandidates, setParentCandidates] = useState<ParentCandidate[]>([])
  const [selectedParent, setSelectedParent] = useState<ParentCandidate | null>(null)
  const [parentSearch, setParentSearch] = useState('')
  const [parentFilter, setParentFilter] = useState<'all' | 'unmatched' | 'hasChildren'>('all')
  const [workFilter, setWorkFilter] = useState<'all' | 'notConfirmed' | 'hasPendingChildren' | 'needsScientificName' | 'needsWordClassification'>('all')
  const [parentPageSize, setParentPageSize] = useState(100)
  const [parentPage, setParentPage] = useState(0)
  const [totalParents, setTotalParents] = useState(0)

  // Children state
  const [children, setChildren] = useState<ChildWithWords[]>([])
  const [selectedChildren, setSelectedChildren] = useState<Set<string>>(new Set())
  const [expandedChild, setExpandedChild] = useState<string | null>(null)

  // Word classifications cache
  const [wordClassifications, setWordClassifications] = useState<Map<string, WordClassification>>(new Map())

  // Global Edible Items for scientific name matching
  const [globalItems, setGlobalItems] = useState<GlobalEdibleItem[]>([])
  const [selectedGlobalItem, setSelectedGlobalItem] = useState<GlobalEdibleItem | null>(null)
  const [globalSearch, setGlobalSearch] = useState('')
  const [showGlobalSelector, setShowGlobalSelector] = useState(false)

  // Custom scientific name input
  const [customScientificName, setCustomScientificName] = useState('')

  // View mode - single state for cleaner switching
  const [viewMode, setViewMode] = useState<ViewMode>('active')

  // Rejected items view
  const [rejectedItems, setRejectedItems] = useState<ChildWithWords[]>([])
  const [rejectedSearch, setRejectedSearch] = useState('')
  const [selectedParentForItem, setSelectedParentForItem] = useState<Record<string, ParentCandidate | null>>({})
  const [parentSearchForLinking, setParentSearchForLinking] = useState('')

  // Prepared items view
  const [preparedItems, setPreparedItems] = useState<ChildWithWords[]>([])
  const [preparedSearch, setPreparedSearch] = useState('')
  const [selectedPreparedItems, setSelectedPreparedItems] = useState<Set<string>>(new Set())
  const [selectedParentForBulkLinking, setSelectedParentForBulkLinking] = useState<ParentCandidate | null>(null)

  // Create parent dialog
  const [showCreateParentDialog, setShowCreateParentDialog] = useState(false)
  const [newParentName, setNewParentName] = useState('')
  const [newParentScientificName, setNewParentScientificName] = useState('')

  // Success feedback
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Per-item scientific names for rejected items (key = item id)
  const [itemScientificNames, setItemScientificNames] = useState<Record<string, string>>({})
  
  // Confirmation state
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null)
  
  // Child scientific name editing state
  const [editingChildScientificName, setEditingChildScientificName] = useState<string | null>(null)
  const [childScientificNameInput, setChildScientificNameInput] = useState('')

  // Demote parent state
  const [showDemoteDialog, setShowDemoteDialog] = useState(false)
  const [demoteSearch, setDemoteSearch] = useState('')
  const [selectedNewParent, setSelectedNewParent] = useState<ParentCandidate | null>(null)

  // Conservation status editing state
  const [editingConservationStatus, setEditingConservationStatus] = useState<string | null>(null) // item id being edited
  const [conservationForm, setConservationForm] = useState<ConservationStatusData>({})
  
  // Notes editing state
  const [editingNotes, setEditingNotes] = useState<string | null>(null) // item id being edited
  const [notesInput, setNotesInput] = useState('')

  // Completed parents data (view controlled by viewMode)
  const [completedParents, setCompletedParents] = useState<any[]>([])
  const [completedSearch, setCompletedSearch] = useState('')
  const [selectedCompletedParent, setSelectedCompletedParent] = useState<any | null>(null)

  // Stats
  const [stats, setStats] = useState<Stats>({
    totalParents: 0,
    totalAllItems: 0,
    completedCount: 0,
    confirmedParents: 0,
    unconfirmedWithChildren: 0,
    childrenWithoutScientificName: 0,
    totalChildren: 0,
    pendingLinks: 0,
    wordsClassified: 0,
    wordsPending: 0
  })

  // Fetch parent candidates
  const fetchParentCandidates = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (parentSearch) params.append('search', parentSearch)
      if (parentFilter !== 'all') params.append('filter', parentFilter)
      if (workFilter !== 'all') params.append('workFilter', workFilter)
      params.append('limit', parentPageSize.toString())
      params.append('offset', parentPage.toString())

      const response = await fetch(`/api/mexican-food/classification-workspace?${params}`)
      const data = await response.json()

      setParentCandidates(data.candidates || [])
      setTotalParents(data.total || 0)
      setStats(prev => ({
        ...prev,
        totalParents: data.total || 0,
        totalAllItems: data.totalAllItems || 0,
        completedCount: data.completedCount || 0,
        confirmedParents: data.confirmedParents || 0,
        unconfirmedWithChildren: data.unconfirmedWithChildren || 0,
        childrenWithoutScientificName: data.childrenWithoutScientificName || 0,
        pendingLinks: data.pendingLinks || 0
      }))
    } catch (error) {
      console.error('Error fetching parent candidates:', error)
    } finally {
      setLoading(false)
    }
  }, [parentSearch, parentFilter, workFilter, parentPage, parentPageSize])

  // Fetch word classifications
  const fetchWordClassifications = useCallback(async () => {
    try {
      const response = await fetch('/api/words/classifications?limit=2000')
      const data = await response.json()

      const map = new Map<string, WordClassification>()
      ;(data.words || []).forEach((w: WordClassification) => {
        map.set(w.wordLower, w)
      })
      setWordClassifications(map)
      setStats(prev => ({
        ...prev,
        wordsClassified: data.words?.filter((w: WordClassification) => !w.needsReview).length || 0,
        wordsPending: data.words?.filter((w: WordClassification) => w.needsReview).length || 0
      }))
    } catch (error) {
      console.error('Error fetching word classifications:', error)
    }
  }, [])

  // Fetch global edible items
  const fetchGlobalItems = useCallback(async () => {
    try {
      const response = await fetch('/api/global-edible-items?limit=500')
      const data = await response.json()
      setGlobalItems(data.items || [])
    } catch (error) {
      console.error('Error fetching global edible items:', error)
    }
  }, [])

  // Fetch children for a parent
  const fetchChildrenForParent = useCallback(async (parentWord: string, parentWordLower: string, parentId?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('parentWord', parentWord)
      params.append('parentWordLower', parentWordLower)
      if (parentId) params.append('parentId', parentId)

      const response = await fetch(`/api/mexican-food/classification-workspace/children?${params}`)
      const data = await response.json()

      const processedChildren: ChildWithWords[] = (data.children || []).map((child: MexicanFood) => {
        const words = tokenizeName(child.nombreEspanol)
        const wordBreakdown: WordBreakdown[] = words.map(w => ({
          word: w,
          wordLower: w.toLowerCase(),
          isParent: w.toLowerCase() === parentWordLower,
          classification: wordClassifications.get(w.toLowerCase()) || null,
          classificationId: null
        }))

        return {
          id: child.id,
          nombreEspanol: child.nombreEspanol,
          words: wordBreakdown,
          tipoAlimento: child.tipoAlimento,
          isLinked: !!child.parentIngredientId,
          parentName: null,
          taxon: child.taxon,
          scientificNameNotNeeded: child.scientificNameNotNeeded,
          conservationStatus: child.conservationStatus || null,
          notes: child.notes || null
        }
      })

      setChildren(processedChildren)

      // Auto-check conservation status for items with taxon but no conservation status
      // Do this in the background without blocking the UI
      processedChildren.forEach(async (child) => {
        if (child.taxon && !child.conservationStatus && !child.scientificNameNotNeeded) {
          try {
            const checkResponse = await fetch(`/api/conservation-status?itemId=${child.id}`)
            const checkData = await checkResponse.json()
            
            if (checkData.success && checkData.result && checkData.result.riskLevel !== 'unknown') {
              // Update the child with the new status
              setChildren(prev => prev.map(c =>
                c.id === child.id ? { ...c, conservationStatus: JSON.stringify(checkData.result) } : c
              ))
            }
          } catch (err) {
            console.error(`Auto-check conservation status failed for ${child.nombreEspanol}:`, err)
          }
        }
      })
    } catch (error) {
      console.error('Error fetching children:', error)
    } finally {
      setLoading(false)
    }
  }, [wordClassifications])

  // Initial load
  useEffect(() => {
    fetchParentCandidates()
    fetchWordClassifications()
    fetchGlobalItems()
    // Fetch rejected items count on mount (call directly to avoid dependency issue)
    fetch('/api/mexican-food/classification-workspace/rejected')
      .then(res => res.json())
      .then(data => setRejectedItems((data.items || []).map((item: MexicanFood) => ({
        id: item.id,
        nombreEspanol: item.nombreEspanol,
        words: tokenizeName(item.nombreEspanol).map(w => ({
          word: w,
          wordLower: w.toLowerCase(),
          isParent: false,
          classification: null,
          classificationId: null
        })),
        tipoAlimento: item.tipoAlimento,
        isLinked: false,
        parentName: null
      }))))
      .catch(err => console.error('Error fetching rejected items:', err))
    // Fetch prepared items count on mount
    fetch('/api/mexican-food/classification-workspace/prepared')
      .then(res => res.json())
      .then(data => setPreparedItems((data.items || []).map((item: MexicanFood) => ({
        id: item.id,
        nombreEspanol: item.nombreEspanol,
        words: tokenizeName(item.nombreEspanol).map(w => ({
          word: w,
          wordLower: w.toLowerCase(),
          isParent: false,
          classification: null,
          classificationId: null
        })),
        tipoAlimento: item.tipoAlimento,
        isLinked: false,
        parentName: null
      }))))
      .catch(err => console.error('Error fetching prepared items:', err))
  }, [fetchParentCandidates, fetchWordClassifications, fetchGlobalItems])

  // Load children when parent is selected
  useEffect(() => {
    if (selectedParent) {
      fetchChildrenForParent(selectedParent.word, selectedParent.wordLower, selectedParent.itemId)
      setShowGlobalSelector(false)
      setSelectedGlobalItem(null)
      
      // Clear editing states when switching parents
      setEditingConservationStatus(null)
      setConservationForm({})
      setEditingNotes(null)
      setNotesInput('')
      
      // Auto-check conservation status for parent if it has taxon but no status
      if (selectedParent.taxon && !selectedParent.conservationStatus) {
        fetch(`/api/conservation-status?itemId=${selectedParent.itemId}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.result && data.result.riskLevel !== 'unknown') {
              // Update the parent with the new status
              setParentCandidates(prev => prev.map(p =>
                p.itemId === selectedParent.itemId 
                  ? { ...p, conservationStatus: JSON.stringify(data.result) } 
                  : p
              ))
              setSelectedParent(prev => prev ? { 
                ...prev, 
                conservationStatus: JSON.stringify(data.result) 
              } : null)
            }
          })
          .catch(err => console.error('Auto-check conservation status for parent failed:', err))
      }
    }
  }, [selectedParent, fetchChildrenForParent])

  // Actions
  const setAsParent = async (candidate: ParentCandidate, scientificName?: string) => {
    setActionLoading(candidate.word)
    try {
      const response = await fetch('/api/mexican-food/classification-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set-as-parent',
          itemId: candidate.itemId,
          scientificName
        })
      })
      const data = await response.json()
      
      if (data.success) {
        // Determine the new taxon value (clear if empty string, otherwise use provided value or keep existing)
        const isClearing = scientificName === ''
        const newTaxon = isClearing ? null : (scientificName || candidate.taxon)
        
        // Update parent candidates with scientific name
        setParentCandidates(prev => prev.map(p =>
          p.wordLower === candidate.wordLower ? { ...p, isParent: true, taxon: newTaxon } : p
        ))
        setSelectedParent(prev => prev?.wordLower === candidate.wordLower ? { ...prev, isParent: true, taxon: newTaxon } : prev)
        setShowGlobalSelector(false)
        
        // Show success message
        if (isClearing) {
          setSuccessMessage(`Scientific name removed from "${candidate.word}"`)
        } else {
          setSuccessMessage(`"${candidate.word}" confirmed as parent${scientificName ? ` with scientific name: ${scientificName}` : ''}`)
        }
        setTimeout(() => setSuccessMessage(null), 3000)
        
        // Clear inputs
        setCustomScientificName('')
        setSelectedGlobalItem(null)
      }
    } catch (error) {
      console.error('Error setting as parent:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const linkChildren = async (childIds: string[], parentId: string) => {
    setActionLoading('link')
    try {
      const response = await fetch('/api/mexican-food/classification-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'link-children',
          childIds,
          parentId
        })
      })
      const data = await response.json()
      
      // Mark linked children as linked (keep them in list but show as linked)
      setChildren(prev => prev.map(c =>
        childIds.includes(c.id) ? { ...c, isLinked: true } : c
      ))
      setSelectedChildren(new Set())
      
      // Update selected parent with correct count from database response
      if (data.parentChildCount !== undefined) {
        setSelectedParent(prev => prev ? { 
          ...prev, 
          currentChildren: data.parentChildCount 
        } : null)
      } else {
        // Fallback: increment manually if database doesn't return count
        setSelectedParent(prev => prev ? { 
          ...prev, 
          currentChildren: prev.currentChildren + childIds.length 
        } : null)
      }
      
      // Show success message
      setSuccessMessage(`${childIds.length} children linked to "${selectedParent?.word}"`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Error linking children:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const rejectChildren = async (childIds: string[]) => {
    setActionLoading('reject')
    try {
      // Count how many linked children are being rejected (to decrement parent count)
      const linkedCount = children.filter(c => childIds.includes(c.id) && c.isLinked).length

      await fetch('/api/mexican-food/classification-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject-children',
          childIds
        })
      })
      // Remove rejected children from the list
      setChildren(prev => prev.filter(c => !childIds.includes(c.id)))
      setSelectedChildren(new Set())

      // Decrement parent's child count if any linked children were rejected
      if (linkedCount > 0) {
        setSelectedParent(prev => prev ? {
          ...prev,
          currentChildren: Math.max(0, prev.currentChildren - linkedCount)
        } : null)
      }
      // Refresh rejected items count
      fetch('/api/mexican-food/classification-workspace/rejected')
        .then(res => res.json())
        .then(data => setRejectedItems((data.items || []).map((item: MexicanFood) => ({
          id: item.id,
          nombreEspanol: item.nombreEspanol,
          words: tokenizeName(item.nombreEspanol).map(w => ({
            word: w,
            wordLower: w.toLowerCase(),
            isParent: false,
            classification: null,
            classificationId: null
          })),
          tipoAlimento: item.tipoAlimento,
          isLinked: false,
          parentName: null
        }))))
        .catch(err => console.error('Error fetching rejected items:', err))
    } catch (error) {
      console.error('Error rejecting children:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const markAsPrepared = async (childIds: string[]) => {
    setActionLoading('prepared')
    try {
      // Count how many linked children are being marked as prepared (to decrement parent count)
      const linkedCount = children.filter(c => childIds.includes(c.id) && c.isLinked).length

      await fetch('/api/mexican-food/classification-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark-prepared',
          childIds
        })
      })
      // Remove prepared children from the list
      setChildren(prev => prev.filter(c => !childIds.includes(c.id)))
      setSelectedChildren(new Set())

      // Decrement parent's child count if any linked children were moved to prepared
      if (linkedCount > 0) {
        setSelectedParent(prev => prev ? {
          ...prev,
          currentChildren: Math.max(0, prev.currentChildren - linkedCount)
        } : null)
      }
      // Refresh prepared items count
      fetch('/api/mexican-food/classification-workspace/prepared')
        .then(res => res.json())
        .then(data => setPreparedItems((data.items || []).map((item: MexicanFood) => ({
          id: item.id,
          nombreEspanol: item.nombreEspanol,
          words: tokenizeName(item.nombreEspanol).map(w => ({
            word: w,
            wordLower: w.toLowerCase(),
            isParent: false,
            classification: null,
            classificationId: null
          })),
          tipoAlimento: item.tipoAlimento,
          isLinked: false,
          parentName: null
        }))))
        .catch(err => console.error('Error fetching prepared items:', err))
      // Show success message
      setSuccessMessage(`${childIds.length} items marked as prepared`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Error marking as prepared:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const setScientificNameOnChildren = async (childIds: string[], scientificName: string) => {
    setActionLoading('set-scientific-name')
    try {
      const response = await fetch('/api/mexican-food/classification-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set-scientific-name',
          childIds,
          scientificName
        })
      })
      const data = await response.json()
      
      if (data.success) {
        // Update children with new scientific name
        setChildren(prev => prev.map(c =>
          childIds.includes(c.id) ? { ...c, taxon: scientificName } : c
        ))
        setSuccessMessage(`Scientific name "${scientificName}" set for ${childIds.length} item(s)`)
        setTimeout(() => setSuccessMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error setting scientific name:', error)
    } finally {
      setActionLoading(null)
      setEditingChildScientificName(null)
      setChildScientificNameInput('')
    }
  }

  // Mark items as not needing scientific name
  const markNoScientificNameNeeded = async (childIds: string[]) => {
    setActionLoading('no-scientific-name')
    try {
      const response = await fetch('/api/mexican-food/classification-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark-no-scientific-name',
          childIds
        })
      })
      const data = await response.json()
      
      if (data.success) {
        // Refresh parent candidates to update counts
        fetchParentCandidates()
        setSuccessMessage(`Marked ${childIds.length} item(s) as not needing scientific name`)
        setTimeout(() => setSuccessMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error marking no scientific name:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const classifyWord = async (word: string, category: string, childId: string) => {
    setActionLoading(`word-${word}`)
    try {
      const response = await fetch('/api/words/classifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word,
          category,
          needsReview: false
        })
      })
      const data = await response.json()

      if (data.classification) {
        setWordClassifications(prev => {
          const next = new Map(prev)
          next.set(word.toLowerCase(), data.classification)
          return next
        })

        setChildren(prev => prev.map(c => {
          if (c.id === childId) {
            return {
              ...c,
              words: c.words.map(w =>
                w.wordLower === word.toLowerCase()
                  ? { ...w, classification: data.classification }
                  : w
              )
            }
          }
          return c
        }))
      }
    } catch (error) {
      console.error('Error classifying word:', error)
    } finally {
      setActionLoading(null)
    }
  }

  // Save conservation status for an item
  const saveConservationStatus = async (itemId: string, status: ConservationStatusData) => {
    setActionLoading('conservation-status')
    try {
      const response = await fetch('/api/mexican-food/classification-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-conservation-status',
          itemId,
          conservationStatus: JSON.stringify(status)
        })
      })
      const data = await response.json()
      
      if (data.success) {
        // Update children with new conservation status
        setChildren(prev => prev.map(c =>
          c.id === itemId ? { ...c, conservationStatus: JSON.stringify(status) } : c
        ))
        // Update parent candidates if applicable
        setParentCandidates(prev => prev.map(p =>
          p.itemId === itemId ? { ...p, conservationStatus: JSON.stringify(status) } : p
        ))
        // Update selected parent if applicable
        setSelectedParent(prev => 
          prev?.itemId === itemId ? { ...prev, conservationStatus: JSON.stringify(status) } : prev
        )
        setSuccessMessage('Conservation status updated')
        setTimeout(() => setSuccessMessage(null), 3000)
        setEditingConservationStatus(null)
      }
    } catch (error) {
      console.error('Error saving conservation status:', error)
    } finally {
      setActionLoading(null)
    }
  }

  // Save notes for an item
  const saveNotes = async (itemId: string, notes: string) => {
    setActionLoading('notes')
    try {
      const response = await fetch('/api/mexican-food/classification-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-notes',
          itemId,
          notes
        })
      })
      const data = await response.json()
      
      if (data.success) {
        // Update children with new notes
        setChildren(prev => prev.map(c =>
          c.id === itemId ? { ...c, notes } : c
        ))
        // Update parent candidates if applicable
        setParentCandidates(prev => prev.map(p =>
          p.itemId === itemId ? { ...p, notes } : p
        ))
        // Update selected parent if applicable
        setSelectedParent(prev => 
          prev?.itemId === itemId ? { ...prev, notes } : prev
        )
        setSuccessMessage('Notes updated')
        setTimeout(() => setSuccessMessage(null), 3000)
        setEditingNotes(null)
      }
    } catch (error) {
      console.error('Error saving notes:', error)
    } finally {
      setActionLoading(null)
    }
  }

  // Auto-check conservation status from API
  const checkConservationStatus = async (itemId: string, scientificName: string) => {
    setActionLoading('check-conservation')
    try {
      const response = await fetch(`/api/conservation-status?itemId=${itemId}`)
      const data = await response.json()
      
      if (data.success && data.result) {
        const result = data.result
        // Update the conservation form with the result
        setConservationForm(result)
        
        // Check if we found meaningful data
        const hasData = result.iucnCategory || result.citesStatus || result.riskLevel !== 'unknown'
        
        if (hasData) {
          // Build a descriptive message
          let message = `Conservation status found for "${scientificName}": `
          const parts: string[] = []
          
          if (result.iucnCategory) {
            const iucnInfo = getIucnCategoryInfo(result.iucnCategory)
            parts.push(`IUCN: ${iucnInfo.label}`)
          }
          if (result.citesStatus && result.citesStatus !== 'not_listed') {
            const citesInfo = getCitesStatusInfo(result.citesStatus)
            parts.push(`CITES: ${citesInfo.label}`)
          }
          if (result.riskLevel) {
            const riskInfo = getRiskLevelInfo(result.riskLevel)
            parts.push(`Risk: ${riskInfo.label}`)
          }
          
          message += parts.join(', ')
          
          await saveConservationStatus(itemId, result)
          setSuccessMessage(message)
          setTimeout(() => setSuccessMessage(null), 5000)
        } else {
          // No conservation data found - species is likely safe
          setSuccessMessage(`No conservation concerns found for "${scientificName}" - species appears to be safe`)
          setTimeout(() => setSuccessMessage(null), 4000)
        }
      } else if (data.error) {
        // Handle error cases
        if (data.error.includes('No scientific name')) {
          setSuccessMessage('Please set a scientific name (taxon) before checking conservation status')
        } else {
          setSuccessMessage(`Error: ${data.error}`)
        }
        setTimeout(() => setSuccessMessage(null), 4000)
      }
    } catch (error) {
      console.error('Error checking conservation status:', error)
      setSuccessMessage('Failed to check conservation status. Please try again.')
      setTimeout(() => setSuccessMessage(null), 3000)
    } finally {
      setActionLoading(null)
    }
  }

  // Batch check conservation status for all items with taxon
  const batchCheckConservationStatus = async () => {
    setActionLoading('batch-conservation')
    try {
      const response = await fetch('/api/conservation-status?batch=true')
      const data = await response.json()
      
      if (data.success) {
        setSuccessMessage(`Processed ${data.processed} items with conservation status`)
        setTimeout(() => setSuccessMessage(null), 3000)
        // Refresh the parent candidates to show updated status
        fetchParentCandidates()
      }
    } catch (error) {
      console.error('Error in batch conservation check:', error)
    } finally {
      setActionLoading(null)
    }
  }

  // Toggle child selection
  const toggleChildSelection = (childId: string) => {
    setSelectedChildren(prev => {
      const next = new Set(prev)
      if (next.has(childId)) next.delete(childId)
      else next.add(childId)
      return next
    })
  }

  const toggleAllChildren = () => {
    if (selectedChildren.size === children.length) {
      setSelectedChildren(new Set())
    } else {
      setSelectedChildren(new Set(children.map(c => c.id)))
    }
  }

  // Filter global items by search
  const filteredGlobalItems = useMemo(() => {
    if (!globalSearch) return globalItems.slice(0, 50)
    const searchLower = globalSearch.toLowerCase()
    return globalItems.filter(item => 
      item.name.toLowerCase().includes(searchLower) ||
      (item.scientificName && item.scientificName.toLowerCase().includes(searchLower))
    ).slice(0, 50)
  }, [globalItems, globalSearch])

  // Fetch rejected items
  const fetchRejectedItems = useCallback(async () => {
    try {
      const response = await fetch('/api/mexican-food/classification-workspace/rejected')
      const data = await response.json()
      setRejectedItems((data.items || []).map((item: MexicanFood) => {
        const words = tokenizeName(item.nombreEspanol)
        return {
          id: item.id,
          nombreEspanol: item.nombreEspanol,
          words: words.map(w => ({
            word: w,
            wordLower: w.toLowerCase(),
            isParent: false,
            classification: wordClassifications.get(w.toLowerCase()) || null,
            classificationId: null
          })),
          tipoAlimento: item.tipoAlimento,
          isLinked: false,
          parentName: null
        }
      }))
    } catch (error) {
      console.error('Error fetching rejected items:', error)
    }
  }, [wordClassifications])

  // Upgrade child to parent
  const upgradeToParent = async (childId: string, scientificName?: string) => {
    setActionLoading(`upgrade-${childId}`)
    try {
      await fetch('/api/mexican-food/classification-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upgrade-to-parent',
          itemId: childId,
          scientificName
        })
      })
      // Remove from both rejected and prepared lists
      setRejectedItems(prev => prev.filter(i => i.id !== childId))
      setPreparedItems(prev => prev.filter(i => i.id !== childId))
      // Refresh parent candidates
      fetchParentCandidates()
    } catch (error) {
      console.error('Error upgrading to parent:', error)
    } finally {
      setActionLoading(null)
    }
  }

  // Link rejected/prepared item to a parent
  const linkRejectedToParent = async (childId: string, parentId: string, parentName: string) => {
    setActionLoading(`link-rejected-${childId}`)
    try {
      const response = await fetch('/api/mexican-food/classification-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'link-children',
          childIds: [childId],
          parentId
        })
      })
      const data = await response.json()
      
      if (data.success) {
        // Remove from both rejected and prepared lists
        setRejectedItems(prev => prev.filter(i => i.id !== childId))
        setPreparedItems(prev => prev.filter(i => i.id !== childId))
        // Show success message
        setSuccessMessage(`Item linked to "${parentName}"`)
        setTimeout(() => setSuccessMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error linking item:', error)
    } finally {
      setActionLoading(null)
    }
  }

  // Bulk link prepared items to a parent
  const bulkLinkPreparedItems = async (childIds: string[], parentId: string, parentName: string) => {
    setActionLoading('bulk-link-prepared')
    try {
      const response = await fetch('/api/mexican-food/classification-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'link-children',
          childIds,
          parentId
        })
      })
      const data = await response.json()
      
      if (data.success) {
        // Remove from prepared items list
        setPreparedItems(prev => prev.filter(i => !childIds.includes(i.id)))
        // Clear selection
        setSelectedPreparedItems(new Set())
        // Show success message
        setSuccessMessage(`${childIds.length} items linked to "${parentName}"`)
        setTimeout(() => setSuccessMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error bulk linking items:', error)
    } finally {
      setActionLoading(null)
    }
  }

  // Create a new parent ingredient (for ingredients not in the database as single words)
  const createParent = async (name: string, scientificName?: string) => {
    setActionLoading('create-parent')
    try {
      const response = await fetch('/api/mexican-food/classification-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-parent',
          name,
          scientificName
        })
      })
      const data = await response.json()
      
      if (data.success) {
        // Refresh parent candidates
        fetchParentCandidates()
        // Close dialog and reset
        setShowCreateParentDialog(false)
        setNewParentName('')
        setNewParentScientificName('')
        // Show success message
        setSuccessMessage(`"${name}" created as parent${scientificName ? ` with scientific name: ${scientificName}` : ''}`)
        setTimeout(() => setSuccessMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error creating parent:', error)
    } finally {
      setActionLoading(null)
    }
  }

  // Demote a parent to be a child of another parent
  const demoteParent = async (itemId: string, newParentId: string, newParentName: string) => {
    setActionLoading('demote')
    try {
      const response = await fetch('/api/mexican-food/classification-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'demote-to-child',
          itemId,
          newParentId
        })
      })
      const data = await response.json()
      
      if (data.success) {
        // Refresh parent candidates
        fetchParentCandidates()
        // Close dialog and reset
        setShowDemoteDialog(false)
        setDemoteSearch('')
        setSelectedNewParent(null)
        setSelectedParent(null)
        // Show success message
        const childrenMsg = data.childrenMoved > 0 ? ` (${data.childrenMoved} children moved)` : ''
        setSuccessMessage(`Demoted to child of "${newParentName}"${childrenMsg}`)
        setTimeout(() => setSuccessMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error demoting parent:', error)
    } finally {
      setActionLoading(null)
    }
  }

  // Computed
  const filteredCandidates = useMemo(() => {
    return parentCandidates.filter(c => {
      if (parentFilter === 'unmatched' && c.potentialChildren === 0) return false
      if (parentFilter === 'hasChildren' && c.potentialChildren === 0) return false
      return true
    })
  }, [parentCandidates, parentFilter])

  // Filtered rejected items by search
  const filteredRejectedItems = useMemo(() => {
    if (!rejectedSearch) return rejectedItems
    const searchLower = rejectedSearch.toLowerCase()
    return rejectedItems.filter(item => 
      item.nombreEspanol.toLowerCase().includes(searchLower)
    )
  }, [rejectedItems, rejectedSearch])

  // Filtered prepared items by search
  const filteredPreparedItems = useMemo(() => {
    if (!preparedSearch) return preparedItems
    const searchLower = preparedSearch.toLowerCase()
    return preparedItems.filter(item => 
      item.nombreEspanol.toLowerCase().includes(searchLower)
    )
  }, [preparedItems, preparedSearch])

  // Filtered parent candidates for linking (must be confirmed parents)
  const filteredParentsForLinking = useMemo(() => {
    let filtered = parentCandidates.filter(c => c.isParent)
    if (parentSearchForLinking) {
      const searchLower = parentSearchForLinking.toLowerCase()
      filtered = filtered.filter(c => 
        c.wordLower.includes(searchLower) ||
        (c.taxon && c.taxon.toLowerCase().includes(searchLower))
      )
    }
    return filtered.slice(0, 20) // Limit to 20 for dropdown
  }, [parentCandidates, parentSearchForLinking])

  // Filtered parent candidates for demoting (must be confirmed parents, excluding current parent)
  const filteredParentsForDemoting = useMemo(() => {
    let filtered = parentCandidates.filter(c => 
      c.isParent && c.itemId !== selectedParent?.itemId
    )
    if (demoteSearch) {
      const searchLower = demoteSearch.toLowerCase()
      filtered = filtered.filter(c => 
        c.wordLower.includes(searchLower) ||
        (c.taxon && c.taxon.toLowerCase().includes(searchLower))
      )
    }
    return filtered.slice(0, 20) // Limit to 20 for dropdown
  }, [parentCandidates, demoteSearch, selectedParent])

  const parentTotalPages = Math.ceil(totalParents / parentPageSize)

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-muted/30 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Ingredient Classification Workspace
            </h1>
            <p className="text-sm text-muted-foreground">
              Select a parent → Confirm/reject children → Classify words
            </p>
          </div>
          <div className="flex items-center gap-1">
            {/* View Mode Tabs */}
            <Button 
              variant={viewMode === 'active' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => {
                setViewMode('active')
                setSelectedCompletedParent(null)
                setChildren([])
              }}
              className={viewMode === 'active' ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              <Link2 className="h-4 w-4 mr-2" />
              In Progress ({stats.totalParents})
            </Button>
            <Button 
              variant={viewMode === 'rejected' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => {
                if (viewMode !== 'rejected') {
                  setViewMode('rejected')
                  setSelectedParent(null)
                  setSelectedCompletedParent(null)
                  fetchRejectedItems()
                }
              }}
              className={viewMode === 'rejected' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rejected ({rejectedItems.length})
            </Button>
            <Button 
              variant={viewMode === 'prepared' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => {
                if (viewMode !== 'prepared') {
                  setViewMode('prepared')
                  setSelectedParent(null)
                  setSelectedCompletedParent(null)
                  fetch('/api/mexican-food/classification-workspace/prepared')
                    .then(res => res.json())
                    .then(data => setPreparedItems((data.items || []).map((item: MexicanFood) => ({
                      id: item.id,
                      nombreEspanol: item.nombreEspanol,
                      words: tokenizeName(item.nombreEspanol).map(w => ({
                        word: w,
                        wordLower: w.toLowerCase(),
                        isParent: false,
                        classification: null,
                        classificationId: null
                      })),
                      tipoAlimento: item.tipoAlimento,
                      isLinked: false,
                      parentName: null
                    }))))
                    .catch(err => console.error('Error fetching prepared items:', err))
                }
              }}
              className={viewMode === 'prepared' ? 'bg-purple-600 hover:bg-purple-700' : ''}
            >
              <ChefHat className="h-4 w-4 mr-2" />
              Prepared ({preparedItems.length})
            </Button>
            <Button 
              variant={viewMode === 'completed' ? 'default' : 'outline'} 
              size="sm" 
              onClick={async () => {
                if (viewMode !== 'completed') {
                  const response = await fetch('/api/mexican-food/classification-workspace/completed')
                  const data = await response.json()
                  setCompletedParents(data.parents || [])
                  setViewMode('completed')
                  setSelectedParent(null)
                  setSelectedCompletedParent(null)
                  setChildren([])
                }
              }}
              className={viewMode === 'completed' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Completed ({stats.completedCount})
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button variant="outline" size="sm" onClick={() => { fetchParentCandidates(); fetchWordClassifications(); }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              size="sm" 
              onClick={() => setShowCreateParentDialog(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Parent
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            )}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex gap-4 text-sm flex-wrap">
          {/* Success Message Toast */}
          {successMessage && (
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top">
              <CheckCircle2 className="h-4 w-4" />
              {successMessage}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Badge className="bg-gray-500 text-white text-xs">
              {stats.totalAllItems} total items
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge className="bg-green-600 text-white text-xs">
              {stats.completedCount} completed
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge className="bg-blue-600 text-white text-xs">
              {stats.totalParents} in progress
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge className="bg-green-500 text-white text-xs">
              {stats.confirmedParents} confirmed
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge className="bg-orange-500 text-white text-xs">
              {stats.unconfirmedWithChildren} pending confirmation
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge className="bg-purple-500 text-white text-xs">
              {stats.childrenWithoutScientificName} need scientific name
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge className="bg-gray-400 text-white text-xs">
              {stats.totalParents - stats.confirmedParents - stats.unconfirmedWithChildren} no children
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge className="bg-emerald-500 text-white text-xs">
              Words: {stats.wordsClassified} classified
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge className="bg-amber-500 text-white text-xs">
              {stats.wordsPending} words pending
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content - Two Panels */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Panel - Parent Candidates or Completed Parents */}
        <div className="w-[35%] min-w-[300px] border-r flex flex-col min-h-0">
          {viewMode === 'completed' ? (
            <>
              {/* Completed Parents Header */}
              <div className="border-b px-3 py-2 flex-shrink-0 bg-green-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="font-semibold text-green-700">Completed Parents</span>
                  <Badge variant="outline" className="text-green-600 border-green-500/50 text-xs">
                    {completedParents.length}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setViewMode('active')
                      setSelectedCompletedParent(null)
                      setChildren([])
                    }}
                    className="ml-auto h-6 px-2"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Back to Active
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Search completed parents..."
                    value={completedSearch}
                    onChange={(e) => setCompletedSearch(e.target.value)}
                    className="pl-7 h-7 text-sm"
                  />
                </div>
              </div>

              {/* Completed Parents List */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-1">
                  {completedParents
                    .filter(p => !completedSearch || 
                      p.nombreEspanol.toLowerCase().includes(completedSearch.toLowerCase()) ||
                      (p.taxon && p.taxon.toLowerCase().includes(completedSearch.toLowerCase()))
                    )
                    .map((parent) => (
                      <div
                        key={parent.id}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm ${
                          selectedCompletedParent?.id === parent.id
                            ? 'bg-green-500/20 border border-green-500/50'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={async () => {
                          setSelectedCompletedParent(parent)
                          // Convert to ParentCandidate format for compatibility
                          const parentCandidate: ParentCandidate = {
                            word: parent.nombreEspanol,
                            wordLower: parent.nombreEspanol.toLowerCase(),
                            itemId: parent.id,
                            potentialChildren: 0,
                            isParent: true,
                            currentChildren: parent.childrenCount || 0,
                            tipoAlimento: parent.tipoAlimento,
                            taxon: parent.taxon
                          }
                          setSelectedParent(parentCandidate)
                          // Fetch children for this parent
                          fetchChildrenForParent(parent.nombreEspanol, parent.nombreEspanol.toLowerCase(), parent.id)
                        }}
                      >
                        {/* Status */}
                        <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />

                        {/* Word */}
                        <span className="font-medium truncate max-w-[120px]">{parent.nombreEspanol}</span>

                        {/* Scientific Name */}
                        {parent.taxon && (
                          <span className="text-[10px] text-blue-500 italic truncate flex-1">
                            ({parent.taxon})
                          </span>
                        )}

                        {/* Children count */}
                        <Badge variant="outline" className="text-[10px] h-4 px-1 flex-shrink-0 border-green-500/30 text-green-700">
                          {parent.childrenCount || 0}
                        </Badge>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </>
          ) : (
            <>
              {/* Filters */}
              <div className="border-b px-3 py-2 flex-shrink-0 bg-muted/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder="Search parents..."
                      value={parentSearch}
                      onChange={(e) => setParentSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && setParentPage(0)}
                      className="pl-7 h-7 text-sm"
                    />
                  </div>
                  <Select value={parentPageSize.toString()} onValueChange={(v) => setParentPageSize(parseInt(v))}>
                    <SelectTrigger className="w-16 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZES.map(size => (
                        <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={workFilter} onValueChange={(v) => setWorkFilter(v as typeof workFilter)}>
                    <SelectTrigger className="flex-1 h-7 text-xs">
                      <SelectValue placeholder="Filter by work needed..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All items</SelectItem>
                      <SelectItem value="notConfirmed">⚠️ Not confirmed as parent</SelectItem>
                      <SelectItem value="hasPendingChildren">🔗 Has pending children</SelectItem>
                      <SelectItem value="needsScientificName">🔬 Needs scientific name</SelectItem>
                      <SelectItem value="needsWordClassification">📝 Needs word classification</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={parentFilter} onValueChange={(v) => setParentFilter(v as typeof parentFilter)}>
                    <SelectTrigger className="w-32 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All matches</SelectItem>
                      <SelectItem value="hasChildren">Has matches</SelectItem>
                      <SelectItem value="unmatched">No matches</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Parent List with Scroll */}
              <ScrollArea className="flex-1 min-h-0">
                {loading && parentCandidates.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="p-1">
                    {filteredCandidates.map((candidate) => (
                      <div
                        key={candidate.wordLower}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm ${
                          selectedParent?.wordLower === candidate.wordLower
                            ? 'bg-primary/20 border border-primary/50'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedParent(candidate)}
                      >
                        {/* Status */}
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          candidate.isParent ? 'bg-green-500' : 'bg-gray-300'
                        }`} />

                        {/* Word */}
                        <span className="font-medium truncate max-w-[120px]">{candidate.word}</span>

                        {/* Scientific Name - inline */}
                        {(candidate.taxon || candidate.scientificName) && (
                          <span className="text-[10px] text-blue-500 italic truncate flex-1">
                            ({candidate.taxon || candidate.scientificName})
                          </span>
                        )}

                        {/* Count */}
                        {candidate.potentialChildren > 0 && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1 flex-shrink-0">
                            {candidate.potentialChildren}
                          </Badge>
                        )}

                        {/* Confirm as parent button */}
                        {!candidate.isParent && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 hover:bg-green-100 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              setAsParent(candidate)
                            }}
                            disabled={actionLoading === candidate.word}
                            title={candidate.potentialChildren > 0 ? "Confirm as Parent" : "Confirm as Standalone Parent"}
                          >
                            {actionLoading === candidate.word ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            )}
                          </Button>
                        )}
                      </div>
                    ))}

                    {filteredCandidates.length === 0 && (
                      <div className="text-center text-muted-foreground py-8 text-sm">
                        No parent candidates found
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Pagination */}
              <div className="border-t px-3 py-1.5 flex-shrink-0 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {parentPage * parentPageSize + 1}-{Math.min((parentPage + 1) * parentPageSize, totalParents)} of {totalParents}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => setParentPage(p => Math.max(0, p - 1))}
                    disabled={parentPage === 0}
                  >
                    Prev
                  </Button>
                  <span className="px-2 self-center">
                    {parentPage + 1}/{parentTotalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => setParentPage(p => p + 1)}
                    disabled={parentPage >= parentTotalPages - 1}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Panel - Children & Word Classification */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {selectedParent ? (
            <>
              {/* Selected Parent Header */}
              <div className="border-b px-4 py-2 flex-shrink-0 bg-muted/20">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="font-semibold text-lg">{selectedParent.word}</h2>
                  {selectedParent.isParent ? (
                    <Badge className="bg-green-500 text-white">Confirmed Parent</Badge>
                  ) : (
                    <Badge variant="outline" className="text-orange-500 border-orange-500/50">Not yet confirmed</Badge>
                  )}

                  {/* Children counts */}
                  <div className="flex items-center gap-2 text-sm">
                    {children.filter(c => c.isLinked).length > 0 && (
                      <Badge className="bg-green-100 text-green-700 border-green-300">
                        {children.filter(c => c.isLinked).length} linked
                      </Badge>
                    )}
                    {children.filter(c => !c.isLinked).length > 0 && (
                      <span className="text-muted-foreground">
                        {children.filter(c => !c.isLinked).length} potential
                      </span>
                    )}
                    {children.length === 0 && (
                      <span className="text-muted-foreground">
                        {selectedParent.isParent 
                          ? 'Standalone parent (no children)' 
                          : 'No children found - can be confirmed as standalone parent'}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fetchChildrenForParent(selectedParent.word, selectedParent.wordLower, selectedParent.itemId)}
                      className="h-6 px-2"
                      title="Refresh children list"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Show assigned scientific name for parent (rarely needed) */}
                  {(selectedParent.taxon || selectedParent.scientificName) && (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                      <Microscope className="h-3 w-3 mr-1" />
                      Parent taxon: <span className="italic ml-1">{selectedParent.taxon || selectedParent.scientificName}</span>
                      <span className="ml-1 text-[10px] opacity-70">(rare)</span>
                    </Badge>
                  )}

                  {/* Scientific Name Selector - de-emphasized for parents */}
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowGlobalSelector(!showGlobalSelector)}
                      className="h-7 text-muted-foreground hover:text-foreground"
                      title="Scientific names are usually assigned to children (varieties), not parents"
                    >
                      <Microscope className="h-3 w-3 mr-1" />
                      {(selectedParent.taxon || selectedParent.scientificName) ? 'Change' : '+ Taxon'}
                    </Button>
                    {!selectedParent.isParent && (
                      <Button
                        size="sm"
                        onClick={() => setAsParent(selectedParent, selectedGlobalItem?.scientificName || customScientificName || undefined)}
                        disabled={actionLoading === selectedParent.word}
                        className="h-7 bg-green-600 hover:bg-green-700"
                      >
                        {actionLoading === selectedParent.word ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        )}
                        {selectedParent.potentialChildren > 0 ? 'Confirm as Parent' : 'Confirm as Standalone Parent'}
                      </Button>
                    )}
                    {/* Demote button for confirmed parents */}
                    {selectedParent.isParent && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDemoteDialog(true)}
                        disabled={actionLoading === 'demote'}
                        className="h-7 text-orange-500 border-orange-500/50 hover:bg-orange-500/10"
                        title="Demote this parent to be a child of another parent"
                      >
                        <ArrowUpFromLine className="h-3 w-3 mr-1 rotate-180" />
                        Demote
                      </Button>
                    )}
                  </div>
                </div>

                {/* Demote Parent Dialog */}
                {showDemoteDialog && (
                  <div className="mt-2 p-3 border rounded bg-orange-500/10 border-orange-500/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <ArrowUpFromLine className="h-4 w-4 text-orange-500 rotate-180" />
                        <span className="text-sm font-medium">Demote &quot;{selectedParent.word}&quot; to Child</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowDemoteDialog(false)
                          setDemoteSearch('')
                          setSelectedNewParent(null)
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Select a new parent for this item. Any existing children will be moved to the new parent.
                    </p>
                    <div className="relative mb-2">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input
                        placeholder="Search for new parent..."
                        value={demoteSearch}
                        onChange={(e) => {
                          setDemoteSearch(e.target.value)
                          setSelectedNewParent(null)
                        }}
                        className="pl-7 h-8 text-sm"
                      />
                    </div>
                    {filteredParentsForDemoting.length > 0 && (
                      <div className="max-h-40 overflow-y-auto border rounded mb-2 bg-muted/30">
                        {filteredParentsForDemoting.map((parent) => (
                          <div
                            key={parent.itemId}
                            className={`px-2 py-1.5 text-sm cursor-pointer hover:bg-muted/50 ${
                              selectedNewParent?.itemId === parent.itemId ? 'bg-primary/10' : ''
                            }`}
                            onClick={() => {
                              setSelectedNewParent(parent)
                              setDemoteSearch(parent.word)
                            }}
                          >
                            <span className="font-medium">{parent.word}</span>
                            {parent.taxon && (
                              <span className="text-xs text-blue-500 italic ml-2">({parent.taxon})</span>
                            )}
                            {parent.currentChildren > 0 && (
                              <Badge variant="outline" className="ml-2 text-[10px] h-4">
                                {parent.currentChildren} children
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowDemoteDialog(false)
                          setDemoteSearch('')
                          setSelectedNewParent(null)
                        }}
                        className="h-7"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (selectedNewParent) {
                            demoteParent(selectedParent.itemId, selectedNewParent.itemId, selectedNewParent.word)
                          }
                        }}
                        disabled={!selectedNewParent || actionLoading === 'demote'}
                        className="h-7 bg-orange-600 hover:bg-orange-700"
                      >
                        {actionLoading === 'demote' ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <ArrowUpFromLine className="h-3 w-3 mr-1 rotate-180" />
                        )}
                        Demote to Child
                      </Button>
                    </div>
                  </div>
                )}

                {/* Parent Conservation Status Section */}
                <div className="mt-2 pt-2 border-t">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3" />
                      Conservation Status:
                    </span>
                    {(() => {
                      const status = parseConservationStatus(selectedParent.conservationStatus)
                      if (status && hasConservationConcerns(status)) {
                        const riskInfo = getRiskLevelInfo(status.riskLevel)
                        return (
                          <Badge className={`${riskInfo.bgColor} ${riskInfo.color} text-[10px] h-4 border`}>
                            {riskInfo.icon} {riskInfo.label}
                          </Badge>
                        )
                      }
                      return null
                    })()}
                  </div>
                  
                  {/* Display current status with match type info */}
                  {selectedParent.conservationStatus && (
                    <div className="mb-2">
                      {(() => {
                        const status = parseConservationStatus(selectedParent.conservationStatus)
                        if (status && status.riskLevel !== 'unknown') {
                          const iucnInfo = getIucnCategoryInfo(status.iucnCategory)
                          const citesInfo = getCitesStatusInfo(status.citesStatus)
                          return (
                            <div className="space-y-1.5">
                              {/* Match type indicator */}
                              {status.matchType && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  {status.matchType === 'exact' && (
                                    <Badge className="bg-green-100 text-green-700 text-[9px] h-4 border border-green-200">
                                      ✓ Exact match
                                    </Badge>
                                  )}
                                  {status.matchType === 'genus_inference' && (
                                    <Badge className="bg-amber-100 text-amber-700 text-[9px] h-4 border border-amber-200">
                                      ⚠️ Genus match
                                    </Badge>
                                  )}
                                  {status.matchType === 'web_search' && (
                                    <Badge className="bg-blue-100 text-blue-700 text-[9px] h-4 border border-blue-200">
                                      🔍 Web search
                                    </Badge>
                                  )}
                                  {status.needsVerification && (
                                    <Badge className="bg-red-100 text-red-700 text-[9px] h-4 border border-red-200">
                                      Needs verification
                                    </Badge>
                                  )}
                                </div>
                              )}
                              {/* Matched species info */}
                              {status.matchType === 'genus_inference' && status.matchedSpecies && (
                                <p className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                                  Matched against related species: <em>{status.matchedSpecies}</em>
                                </p>
                              )}
                              {/* Status badges */}
                              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded flex-wrap">
                                {status.iucnCategory && (
                                  <span className={iucnInfo.color}>IUCN: {status.iucnCategory}</span>
                                )}
                                {status.citesStatus && status.citesStatus !== 'not_listed' && (
                                  <span className={citesInfo.color}>CITES: {citesInfo.label}</span>
                                )}
                                {status.regionalStatus && (
                                  <span className="text-purple-600">{status.regionalStatus}</span>
                                )}
                              </div>
                            </div>
                          )
                        }
                        return null
                      })()}
                    </div>
                  )}
                  
                  {editingConservationStatus === selectedParent.itemId ? (
                    <div className="p-2 border rounded bg-muted/30 space-y-2">
                      {/* Match Type Warning - show if genus inference */}
                      {(() => {
                        const status = parseConservationStatus(selectedParent.conservationStatus)
                        if (status?.matchType === 'genus_inference') {
                          return (
                            <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-amber-700 dark:text-amber-300 text-[10px]">
                              <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                              <div>
                                <strong>⚠️ Genus-level match - needs verification!</strong>
                                {status.matchedSpecies && (
                                  <p className="mt-0.5">Matched against related species: <em>{status.matchedSpecies}</em></p>
                                )}
                                <p className="mt-0.5 text-amber-600">Different species in the same genus can have very different statuses. Please verify manually.</p>
                              </div>
                            </div>
                          )
                        }
                        return null
                      })()}
                      
                      {/* Risk Level */}
                      <div>
                        <label className="text-[10px] text-muted-foreground">Risk Level:</label>
                        <Select
                          value={conservationForm.riskLevel || 'unknown'}
                          onValueChange={(v) => setConservationForm(prev => ({ ...prev, riskLevel: v as any }))}
                        >
                          <SelectTrigger className="h-6 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RISK_LEVELS.map(level => (
                              <SelectItem key={level.value} value={level.value}>
                                <span className={level.color}>{level.icon}</span> {level.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* CITES Status */}
                      <div>
                        <label className="text-[10px] text-muted-foreground">CITES Status:</label>
                        <Select
                          value={conservationForm.citesStatus || 'unknown'}
                          onValueChange={(v) => setConservationForm(prev => ({ ...prev, citesStatus: v as any }))}
                        >
                          <SelectTrigger className="h-6 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CITES_STATUS_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <span className={opt.color}>{opt.value}</span> - {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* IUCN Category */}
                      <div>
                        <label className="text-[10px] text-muted-foreground">IUCN Category:</label>
                        <Select
                          value={conservationForm.iucnCategory || 'NE'}
                          onValueChange={(v) => setConservationForm(prev => ({ ...prev, iucnCategory: v as any }))}
                        >
                          <SelectTrigger className="h-6 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {IUCN_CATEGORIES.map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>
                                <span className={cat.color}>{cat.value}</span> - {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Regional Status */}
                      <div>
                        <label className="text-[10px] text-muted-foreground">Regional Status (e.g., NOM-059):</label>
                        <Input
                          placeholder="NOM-059: Amenazada"
                          value={conservationForm.regionalStatus || ''}
                          onChange={(e) => setConservationForm(prev => ({ ...prev, regionalStatus: e.target.value }))}
                          className="h-6 text-xs"
                        />
                      </div>
                      
                      {/* Trade Restricted */}
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={conservationForm.tradeRestricted || false}
                          onCheckedChange={(checked) => setConservationForm(prev => ({ ...prev, tradeRestricted: !!checked }))}
                        />
                        <label className="text-[10px]">Trade Restricted/Controlled</label>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex justify-end gap-1 pt-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingConservationStatus(null)
                            setConservationForm({})
                          }}
                          className="h-6 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveConservationStatus(selectedParent.itemId, conservationForm)}
                          disabled={actionLoading === 'conservation-status'}
                          className="h-6 text-xs bg-green-600 hover:bg-green-700"
                        >
                          {actionLoading === 'conservation-status' ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <Check className="h-3 w-3 mr-1" />
                          )}
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Auto-check button - always show if parent has taxon */}
                      {selectedParent.taxon && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => checkConservationStatus(selectedParent.itemId, selectedParent.taxon!)}
                          disabled={actionLoading === 'check-conservation'}
                          className="h-7 text-xs bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                        >
                          {actionLoading === 'check-conservation' ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Globe className="h-3 w-3 mr-1" />
                          )}
                          Check Status
                        </Button>
                      )}
                      
                      {/* Manual edit button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingConservationStatus(selectedParent.itemId)
                          setConservationForm(parseConservationStatus(selectedParent.conservationStatus) || {})
                        }}
                        className="h-6 text-xs"
                      >
                        {selectedParent.conservationStatus ? 'Edit' : 'Add Manually'}
                      </Button>
                    </div>
                  )}
                  
                  {/* No taxon message */}
                  {!selectedParent.taxon && !selectedParent.conservationStatus && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Add a scientific name (taxon) above to enable auto-check from IUCN/CITES databases.
                    </p>
                  )}
                </div>

                {/* Parent Notes Section */}
                <div className="mt-2 pt-2 border-t">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Notes:
                    </span>
                  </div>
                  
                  {editingNotes === selectedParent.itemId ? (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Add notes about this ingredient..."
                        value={notesInput}
                        onChange={(e) => setNotesInput(e.target.value)}
                        className="min-h-[60px] text-xs"
                      />
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingNotes(null)
                            setNotesInput('')
                          }}
                          className="h-6 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveNotes(selectedParent.itemId, notesInput)}
                          disabled={actionLoading === 'notes'}
                          className="h-6 text-xs bg-green-600 hover:bg-green-700"
                        >
                          {actionLoading === 'notes' ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <Check className="h-3 w-3 mr-1" />
                          )}
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      {selectedParent.notes ? (
                        <div className="flex-1 text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                          {selectedParent.notes}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground flex-1">No notes</span>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingNotes(selectedParent.itemId)
                          setNotesInput(selectedParent.notes || '')
                        }}
                        className="h-6 text-xs flex-shrink-0"
                      >
                        {selectedParent.notes ? 'Edit' : 'Add'}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Global Edible Items Selector */}
                {showGlobalSelector && (
                  <div className="mt-2 p-3 border rounded bg-muted/50 border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Parent Taxon (Rarely Needed)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Remove button if parent has scientific name */}
                        {(selectedParent.taxon || selectedParent.scientificName) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setAsParent(selectedParent, '')}
                            disabled={actionLoading === selectedParent.word}
                            className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Remove scientific name from parent"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                        )}
                        {/* Save button for already-confirmed parents */}
                        {(selectedGlobalItem || customScientificName) && (
                          <Button
                            size="sm"
                            onClick={() => {
                              const name = selectedGlobalItem?.scientificName || customScientificName
                              if (name) {
                                setAsParent(selectedParent, name)
                              }
                            }}
                            disabled={actionLoading === selectedParent.word}
                            className="h-7 bg-blue-600 hover:bg-blue-700"
                          >
                            {actionLoading === selectedParent.word ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <Check className="h-3 w-3 mr-1" />
                            )}
                            {selectedParent.isParent ? 'Update' : 'Confirm'}
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      ⚠️ Most parents (e.g., &quot;Tuna&quot;, &quot;Maíz&quot;) represent general categories with multiple varieties. 
                      Scientific names should usually be assigned to children instead.
                    </p>
                    
                    {/* Custom scientific name input */}
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Or enter custom scientific name (e.g., Solanum phureja)"
                        value={customScientificName}
                        onChange={(e) => {
                          setCustomScientificName(e.target.value)
                          setSelectedGlobalItem(null) // Clear selection when typing custom
                        }}
                        className="h-7 text-sm flex-1"
                      />
                      {customScientificName && (
                        <Badge className="bg-blue-100 text-blue-700 h-7 flex items-center">
                          Custom: <span className="italic ml-1">{customScientificName}</span>
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground mb-2">
                      — Or search existing database —
                    </div>

                    <Input
                      placeholder="Search by name or scientific name..."
                      value={globalSearch}
                      onChange={(e) => {
                        setGlobalSearch(e.target.value)
                        setCustomScientificName('') // Clear custom when searching
                      }}
                      className="h-7 text-sm mb-2"
                    />
                    <ScrollArea className="h-32">
                      {filteredGlobalItems.map((item) => (
                        <div
                          key={item.id}
                          className={`px-2 py-1 text-sm cursor-pointer rounded hover:bg-muted ${
                            selectedGlobalItem?.id === item.id ? 'bg-primary/20' : ''
                          }`}
                          onClick={() => {
                            setSelectedGlobalItem(item)
                            setCustomScientificName('')
                          }}
                        >
                          <span className="font-medium">{item.name}</span>
                          {item.scientificName && (
                            <span className="text-muted-foreground ml-2 italic">({item.scientificName})</span>
                          )}
                        </div>
                      ))}
                      {filteredGlobalItems.length === 0 && (
                        <div className="text-center text-muted-foreground py-4 text-sm">
                          No matching items found - use custom input above
                        </div>
                      )}
                    </ScrollArea>
                    
                    {/* Show selected or custom - preview only */}
                    <div className="mt-2 text-xs text-muted-foreground">
                      {selectedGlobalItem && (
                        <span>
                          Selected: <strong>{selectedGlobalItem.name}</strong> 
                          {selectedGlobalItem.scientificName && <span className="italic"> ({selectedGlobalItem.scientificName})</span>}
                        </span>
                      )}
                      {customScientificName && !selectedGlobalItem && (
                        <span>
                          Custom name: <strong className="italic">{customScientificName}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Bulk Actions */}
              {selectedChildren.size > 0 && (
                <div className="border-b px-4 py-2 flex-shrink-0 bg-primary/10">
                  <div className="flex items-center gap-3 flex-wrap">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">{selectedChildren.size} selected</span>
                    {selectedParent.isParent && (
                      <Button
                        size="sm"
                        onClick={() => linkChildren(Array.from(selectedChildren), selectedParent.itemId)}
                        disabled={actionLoading === 'link'}
                        className="h-7"
                      >
                        {actionLoading === 'link' ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Link2 className="h-3 w-3 mr-1" />
                        )}
                        Link Selected
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markAsPrepared(Array.from(selectedChildren))}
                      disabled={actionLoading === 'prepared'}
                      className="h-7 bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100"
                    >
                      {actionLoading === 'prepared' ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <ChefHat className="h-3 w-3 mr-1" />
                      )}
                      Mark as Prepared
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Open bulk scientific name dialog
                        setEditingChildScientificName('bulk')
                        setChildScientificNameInput('')
                      }}
                      disabled={actionLoading === 'set-scientific-name'}
                      className="h-7 bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
                    >
                      {actionLoading === 'set-scientific-name' ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Microscope className="h-3 w-3 mr-1" />
                      )}
                      Set Scientific Name
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markNoScientificNameNeeded(Array.from(selectedChildren))}
                      disabled={actionLoading === 'no-scientific-name'}
                      className="h-7 bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100"
                      title="Mark as processed/derived ingredient that doesn't need scientific name (e.g., whey, cream)"
                    >
                      {actionLoading === 'no-scientific-name' ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <MinusCircle className="h-3 w-3 mr-1" />
                      )}
                      No Sci. Name Needed
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => rejectChildren(Array.from(selectedChildren))}
                      disabled={actionLoading === 'reject'}
                      className="h-7"
                    >
                      {actionLoading === 'reject' ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedChildren(new Set())}
                      className="h-7"
                    >
                      Clear
                    </Button>
                  </div>
                  
                  {/* Bulk Scientific Name Input - On its own row */}
                  {editingChildScientificName === 'bulk' && (
                    <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 px-3 py-2 rounded border border-blue-300 dark:border-blue-700 mt-2">
                      <Microscope className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Set taxon for {selectedChildren.size} items:</span>
                      <Input
                        placeholder="e.g., Solanum tuberosum"
                        value={childScientificNameInput}
                        onChange={(e) => setChildScientificNameInput(e.target.value)}
                        className="h-7 text-sm w-56 bg-white dark:bg-background"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && childScientificNameInput.trim()) {
                            setScientificNameOnChildren(Array.from(selectedChildren), childScientificNameInput.trim())
                          }
                          if (e.key === 'Escape') {
                            setEditingChildScientificName(null)
                            setChildScientificNameInput('')
                          }
                        }}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          if (childScientificNameInput.trim()) {
                            setScientificNameOnChildren(Array.from(selectedChildren), childScientificNameInput.trim())
                          }
                        }}
                        disabled={actionLoading === 'set-scientific-name' || !childScientificNameInput.trim()}
                        className="h-7 bg-blue-600 hover:bg-blue-700"
                      >
                        {actionLoading === 'set-scientific-name' ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : null}
                        Apply
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingChildScientificName(null)
                          setChildScientificNameInput('')
                        }}
                        className="h-7"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Children List with Word Breakdown */}
              <ScrollArea className="flex-1 min-h-0">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="p-2">
                    {/* Linked children header */}
                    {children.filter(c => c.isLinked).length > 0 && (
                      <div className="flex items-center gap-2 px-2 py-1.5 bg-green-100/50 rounded mb-2">
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                        <span className="text-xs font-medium text-green-700">
                          Linked children ({children.filter(c => c.isLinked).length})
                        </span>
                      </div>
                    )}
                    
                    {/* Select All (only potential children) */}
                    {children.filter(c => !c.isLinked).length > 0 && (
                      <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/30 rounded mb-2 sticky top-0 z-10">
                        <Checkbox
                          checked={selectedChildren.size === children.filter(c => !c.isLinked).length && children.filter(c => !c.isLinked).length > 0}
                          onCheckedChange={() => {
                            const potentialChildren = children.filter(c => !c.isLinked)
                            if (selectedChildren.size === potentialChildren.length) {
                              setSelectedChildren(new Set())
                            } else {
                              setSelectedChildren(new Set(potentialChildren.map(c => c.id)))
                            }
                          }}
                        />
                        <span className="text-xs text-muted-foreground">
                          Select all potential ({children.filter(c => !c.isLinked).length})
                        </span>
                      </div>
                    )}

                    {/* Children */}
                    {children.map((child, index) => {
                      const isExpanded = expandedChild === child.id
                      const isFirstPotential = !child.isLinked && index > 0 && children[index - 1].isLinked
                      
                      return (
                        <div key={child.id}>
                          {/* Separator between linked and potential */}
                          {isFirstPotential && (
                            <div className="flex items-center gap-2 py-2 my-2">
                              <div className="flex-1 border-t border-dashed" />
                              <span className="text-xs text-muted-foreground">Potential children</span>
                              <div className="flex-1 border-t border-dashed" />
                            </div>
                          )}
                          
                          <div
                            className={`border rounded-lg mb-2 overflow-hidden ${
                              child.isLinked ? 'border-green-500/50 bg-green-500/5' :
                              selectedChildren.has(child.id) ? 'border-primary bg-primary/5' :
                              'border-border'
                            }`}
                          >
                            {/* Child Header */}
                            <div
                              className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                              onClick={() => setExpandedChild(isExpanded ? null : child.id)}
                            >
                              <Checkbox
                                checked={selectedChildren.has(child.id)}
                                onCheckedChange={() => toggleChildSelection(child.id)}
                                onClick={(e) => e.stopPropagation()}
                              />

                            {/* Word breakdown inline */}
                            <div className="flex-1 flex flex-wrap items-center gap-1">
                              {child.words.map((w, idx) => {
                                const cat = w.classification ? getCategoryInfo(w.classification.category) : null
                                return (
                                  <span
                                    key={idx}
                                    className={`inline-flex items-center gap-0.5 text-sm ${
                                      w.isParent ? 'font-bold text-green-700' :
                                      w.classification && !w.classification.needsReview ? '' :
                                      'text-muted-foreground'
                                    }`}
                                  >
                                    {w.word}
                                    {w.classification && !w.isParent && (
                                      <span className={`text-[9px] px-1 rounded ${cat?.bgColor} ${cat?.textColor}`}>
                                        {cat?.label.split(' ')[0]}
                                      </span>
                                    )}
                                  </span>
                                )
                              })}
                            </div>

                            {/* Status & Actions */}
                            {child.isLinked && (
                              <Badge className="bg-green-500 text-white text-[10px] h-4">Linked</Badge>
                            )}
                            {child.taxon && (
                              <Badge className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px] h-4 border border-blue-200 dark:border-blue-700" title={`Scientific name: ${child.taxon}`}>
                                <Microscope className="h-2.5 w-2.5 mr-0.5" />
                                {child.taxon}
                              </Badge>
                            )}
                            {/* Conservation Status Indicator */}
                            {(() => {
                              const status = parseConservationStatus(child.conservationStatus)
                              if (status && (status.riskLevel !== 'stable' && status.riskLevel !== 'unknown')) {
                                const riskInfo = getRiskLevelInfo(status.riskLevel)
                                return (
                                  <Badge 
                                    className={`${riskInfo.bgColor} ${riskInfo.color} text-[10px] h-4 border gap-0.5`}
                                    title={`Conservation: ${riskInfo.label}${status.iucnCategory ? ` (IUCN: ${status.iucnCategory})` : ''}${status.citesStatus && status.citesStatus !== 'not_listed' ? ` CITES: ${status.citesStatus}` : ''}`}
                                  >
                                    <AlertTriangle className="h-2.5 w-2.5" />
                                    {riskInfo.label}
                                  </Badge>
                                )
                              }
                              return null
                            })()}
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </Button>
                          </div>

                          {/* Expanded Content - Word Classification */}
                          {isExpanded && (
                            <div className="border-t bg-muted/20 px-3 py-2">
                              <div className="text-xs font-medium text-muted-foreground mb-2">
                                Classify words:
                              </div>
                              <div className="space-y-1.5">
                                {child.words.filter(w => !w.isParent).map((w, idx) => {
                                  const cat = w.classification ? getCategoryInfo(w.classification.category) : null
                                  const isClassified = w.classification && !w.classification.needsReview

                                  return (
                                    <div key={idx} className="flex items-center gap-2">
                                      <span className={`font-medium text-sm w-24 truncate ${
                                        isClassified ? cat?.textColor : 'text-muted-foreground'
                                      }`}>
                                        {w.word}
                                      </span>

                                      <Select
                                        value={w.classification?.category || 'unknown'}
                                        onValueChange={(v) => classifyWord(w.word, v, child.id)}
                                        disabled={actionLoading?.startsWith('word-')}
                                      >
                                        <SelectTrigger className={`h-6 text-xs flex-1 ${
                                          isClassified ? `${cat?.bgColor} border-0` : ''
                                        }`}>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {WORD_CATEGORIES.map(c => (
                                            <SelectItem key={c.value} value={c.value}>
                                              <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${c.color}`} />
                                                {c.label}
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>

                                      {isClassified && (
                                        <Badge variant="outline" className="text-[10px] h-4 text-green-600 border-green-300">
                                          <Check className="h-2 w-2 mr-0.5" />
                                          Done
                                        </Badge>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                              
                              {/* Scientific Name Section */}
                              <div className="mt-3 pt-2 border-t">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-xs font-medium text-muted-foreground">
                                    Scientific Name (Taxon):
                                  </span>
                                  {child.taxon && (
                                    <Badge className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px] h-4 border border-blue-200 dark:border-blue-700">
                                      <Microscope className="h-2.5 w-2.5 mr-0.5" />
                                      {child.taxon}
                                    </Badge>
                                  )}
                                </div>
                                {editingChildScientificName === child.id ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      placeholder="Enter scientific name..."
                                      value={childScientificNameInput}
                                      onChange={(e) => setChildScientificNameInput(e.target.value)}
                                      className="h-7 text-xs flex-1"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && childScientificNameInput.trim()) {
                                          setScientificNameOnChildren([child.id], childScientificNameInput.trim())
                                        }
                                        if (e.key === 'Escape') {
                                          setEditingChildScientificName(null)
                                          setChildScientificNameInput('')
                                        }
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        if (childScientificNameInput.trim()) {
                                          setScientificNameOnChildren([child.id], childScientificNameInput.trim())
                                        }
                                      }}
                                      disabled={actionLoading === 'set-scientific-name' || !childScientificNameInput.trim()}
                                      className="h-7 bg-blue-600 hover:bg-blue-700"
                                    >
                                      {actionLoading === 'set-scientific-name' ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Check className="h-3 w-3" />
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingChildScientificName(null)
                                        setChildScientificNameInput('')
                                      }}
                                      className="h-7"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingChildScientificName(child.id)
                                      setChildScientificNameInput(child.taxon || '')
                                    }}
                                    className="h-7 text-xs"
                                  >
                                    <Microscope className="h-3 w-3 mr-1" />
                                    {child.taxon ? 'Change Scientific Name' : 'Set Scientific Name'}
                                  </Button>
                                )}
                              </div>
                              
                              {/* Conservation Status Section */}
                              <div className="mt-3 pt-2 border-t">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <ShieldAlert className="h-3 w-3" />
                                    Conservation Status:
                                  </span>
                                  {(() => {
                                    const status = parseConservationStatus(child.conservationStatus)
                                    if (status && hasConservationConcerns(status)) {
                                      const riskInfo = getRiskLevelInfo(status.riskLevel)
                                      return (
                                        <Badge className={`${riskInfo.bgColor} ${riskInfo.color} text-[10px] h-4 border`}>
                                          {riskInfo.icon} {riskInfo.label}
                                        </Badge>
                                      )
                                    }
                                    return null
                                  })()}
                                </div>
                                
                                {/* Info box explaining IUCN and CITES */}
                                <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-[10px] text-blue-700 dark:text-blue-300 space-y-1">
                                  <div className="flex items-start gap-1.5">
                                    <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                      <p><strong>IUCN Red List:</strong> Global extinction risk. LC = Safe, VU = Vulnerable, EN = Endangered, CR = Critical.</p>
                                      <p><strong>CITES:</strong> International trade rules. App I = Trade banned, App II = Permit required, App III = Country-specific.</p>
                                    </div>
                                  </div>
                                </div>
                                
                                {editingConservationStatus === child.id ? (
                                  <div className="space-y-2 bg-muted/30 p-2 rounded border">
                                    {/* Match Type Warning - show if genus inference */}
                                    {(() => {
                                      const status = parseConservationStatus(child.conservationStatus)
                                      if (status?.matchType === 'genus_inference') {
                                        return (
                                          <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-amber-700 dark:text-amber-300 text-[10px]">
                                            <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                            <div>
                                              <strong>⚠️ Genus-level match - needs verification!</strong>
                                              {status.matchedSpecies && (
                                                <p className="mt-0.5">Matched against related species: <em>{status.matchedSpecies}</em></p>
                                              )}
                                              <p className="mt-0.5 text-amber-600">Different species in the same genus can have very different statuses. Please verify manually.</p>
                                            </div>
                                          </div>
                                        )
                                      }
                                      return null
                                    })()}
                                    
                                    {/* Risk Level */}
                                    <div>
                                      <label className="text-[10px] text-muted-foreground">Risk Level:</label>
                                      <Select
                                        value={conservationForm.riskLevel || 'unknown'}
                                        onValueChange={(v) => setConservationForm(prev => ({ ...prev, riskLevel: v as any }))}
                                      >
                                        <SelectTrigger className="h-6 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {RISK_LEVELS.map(level => (
                                            <SelectItem key={level.value} value={level.value}>
                                              <span className={level.color}>{level.icon}</span> {level.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    
                                    {/* CITES Status */}
                                    <div>
                                      <label className="text-[10px] text-muted-foreground">CITES Status:</label>
                                      <Select
                                        value={conservationForm.citesStatus || 'unknown'}
                                        onValueChange={(v) => setConservationForm(prev => ({ ...prev, citesStatus: v as any }))}
                                      >
                                        <SelectTrigger className="h-6 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {CITES_STATUS_OPTIONS.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                              <span className={opt.color}>{opt.label}</span>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    
                                    {/* IUCN Category */}
                                    <div>
                                      <label className="text-[10px] text-muted-foreground">IUCN Category:</label>
                                      <Select
                                        value={conservationForm.iucnCategory || 'NE'}
                                        onValueChange={(v) => setConservationForm(prev => ({ ...prev, iucnCategory: v as any }))}
                                      >
                                        <SelectTrigger className="h-6 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {IUCN_CATEGORIES.map(cat => (
                                            <SelectItem key={cat.value} value={cat.value}>
                                              <span className={cat.color}>{cat.value}</span> - {cat.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    
                                    {/* Regional Status */}
                                    <div>
                                      <label className="text-[10px] text-muted-foreground">Regional Status (e.g., NOM-059):</label>
                                      <Input
                                        placeholder="NOM-059: Amenazada"
                                        value={conservationForm.regionalStatus || ''}
                                        onChange={(e) => setConservationForm(prev => ({ ...prev, regionalStatus: e.target.value }))}
                                        className="h-6 text-xs"
                                      />
                                    </div>
                                    
                                    {/* Trade Restricted */}
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        checked={conservationForm.tradeRestricted || false}
                                        onCheckedChange={(checked) => setConservationForm(prev => ({ ...prev, tradeRestricted: !!checked }))}
                                      />
                                      <label className="text-[10px]">Trade Restricted/Controlled</label>
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    <div className="flex justify-end gap-1 pt-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingConservationStatus(null)
                                          setConservationForm({})
                                        }}
                                        className="h-6 text-xs"
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() => saveConservationStatus(child.id, conservationForm)}
                                        disabled={actionLoading === 'conservation-status'}
                                        className="h-6 text-xs bg-orange-600 hover:bg-orange-700"
                                      >
                                        {actionLoading === 'conservation-status' ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <Check className="h-3 w-3" />
                                        )}
                                        Save
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {/* Show current status if exists */}
                                    {(() => {
                                      const status = parseConservationStatus(child.conservationStatus)
                                      if (status && status.riskLevel !== 'unknown') {
                                        const riskInfo = getRiskLevelInfo(status.riskLevel)
                                        const iucnInfo = getIucnCategoryInfo(status.iucnCategory)
                                        const citesInfo = getCitesStatusInfo(status.citesStatus)
                                        return (
                                          <div className="space-y-1.5">
                                            {/* Match type indicator */}
                                            {status.matchType && (
                                              <div className="flex items-center gap-1 flex-wrap">
                                                {status.matchType === 'exact' && (
                                                  <Badge className="bg-green-100 text-green-700 text-[9px] h-4 border border-green-200">
                                                    ✓ Exact match
                                                  </Badge>
                                                )}
                                                {status.matchType === 'genus_inference' && (
                                                  <Badge className="bg-amber-100 text-amber-700 text-[9px] h-4 border border-amber-200">
                                                    ⚠️ Genus match
                                                  </Badge>
                                                )}
                                                {status.matchType === 'web_search' && (
                                                  <Badge className="bg-blue-100 text-blue-700 text-[9px] h-4 border border-blue-200">
                                                    🔍 Web search
                                                  </Badge>
                                                )}
                                                {status.needsVerification && (
                                                  <Badge className="bg-red-100 text-red-700 text-[9px] h-4 border border-red-200">
                                                    Needs verification
                                                  </Badge>
                                                )}
                                              </div>
                                            )}
                                            {/* Matched species info */}
                                            {status.matchType === 'genus_inference' && status.matchedSpecies && (
                                              <p className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                                                Matched against related species: <em>{status.matchedSpecies}</em>
                                              </p>
                                            )}
                                            {/* Status badges */}
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded flex-wrap">
                                              {status.iucnCategory && (
                                                <span className={iucnInfo.color}>IUCN: {status.iucnCategory}</span>
                                              )}
                                              {status.citesStatus && status.citesStatus !== 'not_listed' && (
                                                <span className={citesInfo.color}>CITES: {citesInfo.label}</span>
                                              )}
                                              {status.regionalStatus && (
                                                <span className="text-purple-600">{status.regionalStatus}</span>
                                              )}
                                            </div>
                                          </div>
                                        )
                                      }
                                      return null
                                    })()}
                                    
                                    {/* Action buttons */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {/* Auto-check button - only if has scientific name */}
                                      {child.taxon && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => checkConservationStatus(child.id, child.taxon!)}
                                          disabled={actionLoading === 'check-conservation'}
                                          className="h-7 text-xs bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                        >
                                          {actionLoading === 'check-conservation' ? (
                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                          ) : (
                                            <Globe className="h-3 w-3 mr-1" />
                                          )}
                                          Check Status
                                        </Button>
                                      )}
                                      
                                      {/* Manual edit button */}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const currentStatus = parseConservationStatus(child.conservationStatus) || {}
                                        setConservationForm(currentStatus)
                                        setEditingConservationStatus(child.id)
                                      }}
                                      className="h-7 text-xs"
                                    >
                                      <ShieldAlert className="h-3 w-3 mr-1" />
                                      {child.conservationStatus ? 'Edit' : 'Add'}
                                    </Button>
                                  </div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Notes Section */}
                              <div className="mt-3 pt-2 border-t">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <FileWarning className="h-3 w-3" />
                                    Notes:
                                  </span>
                                </div>
                                
                                {editingNotes === child.id ? (
                                  <div className="space-y-2">
                                    <textarea
                                      placeholder="Add notes about this ingredient..."
                                      value={notesInput}
                                      onChange={(e) => setNotesInput(e.target.value)}
                                      className="w-full h-20 text-xs p-2 border rounded bg-background"
                                    />
                                    <div className="flex justify-end gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingNotes(null)
                                          setNotesInput('')
                                        }}
                                        className="h-6 text-xs"
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() => saveNotes(child.id, notesInput)}
                                        disabled={actionLoading === 'notes'}
                                        className="h-6 text-xs bg-blue-600 hover:bg-blue-700"
                                      >
                                        {actionLoading === 'notes' ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <Check className="h-3 w-3" />
                                        )}
                                        Save
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    {child.notes ? (
                                      <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded mb-2">
                                        {child.notes}
                                      </div>
                                    ) : null}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setNotesInput(child.notes || '')
                                        setEditingNotes(child.id)
                                      }}
                                      className="h-7 text-xs"
                                    >
                                    <FileWarning className="h-3 w-3 mr-1" />
                                      {child.notes ? 'Edit Notes' : 'Add Notes'}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          </div>
                        </div>
                      )
                    })}

                    {children.length === 0 && (
                      <div className="text-center text-muted-foreground py-8 text-sm">
                        No potential children found for &quot;{selectedParent.word}&quot;
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </>
          ) : viewMode === 'rejected' ? (
            <>
              {/* Rejected Items View */}
              <div className="border-b px-4 py-2 flex-shrink-0 bg-muted/50">
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-destructive" />
                  <h2 className="font-semibold text-lg">Rejected Items</h2>
                  <Badge variant="outline" className="text-destructive border-destructive/50">
                    {filteredRejectedItems.length} of {rejectedItems.length}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode('active')}
                    className="ml-auto h-7"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Close
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  These items were rejected as children. You can upgrade them to parents or link them to an existing parent.
                </p>
                {/* Search bar */}
                <div className="relative mt-2">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search rejected items..."
                    value={rejectedSearch}
                    onChange={(e) => setRejectedSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1 min-h-0">
                {filteredRejectedItems.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    {rejectedSearch ? 'No items match your search' : 'No rejected items found'}
                  </div>
                ) : (
                  <div className="p-2">
                    {filteredRejectedItems.map((item) => (
                      <div
                        key={item.id}
                        className="border rounded-lg mb-2 p-3 bg-card border-border hover:border-destructive/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="font-medium">{item.nombreEspanol}</div>
                            {item.tipoAlimento && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Type: {item.tipoAlimento}
                              </div>
                            )}
                            {/* Word breakdown */}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {item.words.map((w, idx) => {
                                const cat = w.classification ? getCategoryInfo(w.classification.category) : null
                                return (
                                  <span
                                    key={idx}
                                    className="text-xs px-1.5 py-0.5 rounded bg-muted"
                                  >
                                    {w.word}
                                    {w.classification && (
                                      <span className={`ml-1 ${cat?.textColor}`}>
                                        [{cat?.label.split(' ')[0]}]
                                      </span>
                                    )}
                                  </span>
                                )
                              })}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2 min-w-[200px]">
                            {/* Link to Parent */}
                            <div className="flex gap-1">
                              <Select
                                value={selectedParentForItem[item.id]?.itemId || ''}
                                onValueChange={(val) => {
                                  const parent = parentCandidates.find(p => p.itemId === val)
                                  setSelectedParentForItem(prev => ({ ...prev, [item.id]: parent || null }))
                                }}
                              >
                                <SelectTrigger className="h-7 text-xs flex-1">
                                  <SelectValue placeholder="Select parent..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <div className="p-1">
                                    <Input
                                      placeholder="Search parents..."
                                      value={parentSearchForLinking}
                                      onChange={(e) => setParentSearchForLinking(e.target.value)}
                                      className="h-6 text-xs"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                  <ScrollArea className="max-h-40">
                                    {filteredParentsForLinking.map((parent) => (
                                      <SelectItem key={parent.itemId} value={parent.itemId} className="text-xs">
                                        <span className="font-medium">{parent.word}</span>
                                        {parent.taxon && (
                                          <span className="text-blue-600 italic ml-1">({parent.taxon})</span>
                                        )}
                                      </SelectItem>
                                    ))}
                                    {filteredParentsForLinking.length === 0 && (
                                      <div className="text-xs text-muted-foreground p-2">No parents found</div>
                                    )}
                                  </ScrollArea>
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const parent = selectedParentForItem[item.id]
                                  if (parent) {
                                    linkRejectedToParent(item.id, parent.itemId, parent.word)
                                  }
                                }}
                                disabled={!selectedParentForItem[item.id] || actionLoading === `link-rejected-${item.id}`}
                                className="h-7 px-2"
                                title="Link to selected parent"
                              >
                                {actionLoading === `link-rejected-${item.id}` ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Link2 className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                            
                            {/* Upgrade to Parent */}
                            <div className="flex gap-1">
                              <Input
                                placeholder="Scientific name (optional)"
                                className="h-7 text-xs flex-1"
                                onChange={(e) => setItemScientificNames(prev => ({ ...prev, [item.id]: e.target.value }))}
                              />
                              <Button
                                size="sm"
                                onClick={() => upgradeToParent(item.id, itemScientificNames[item.id] || undefined)}
                                disabled={actionLoading === `upgrade-${item.id}`}
                                className="h-7 bg-green-600 hover:bg-green-700 px-2"
                                title="Upgrade to Parent"
                              >
                                {actionLoading === `upgrade-${item.id}` ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <ArrowUpFromLine className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </>
          ) : viewMode === 'prepared' ? (
            <>
              {/* Prepared Items View */}
              <div className="border-b px-4 py-2 flex-shrink-0 bg-muted/50">
                <div className="flex items-center gap-3">
                  <ChefHat className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-lg">Prepared Items</h2>
                  <Badge variant="outline" className="text-primary border-primary/50">
                    {filteredPreparedItems.length} of {preparedItems.length}
                  </Badge>
                  {selectedPreparedItems.size > 0 && (
                    <Badge className="bg-primary text-primary-foreground">
                      {selectedPreparedItems.size} selected
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode('active')}
                    className="ml-auto h-7"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Close
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  These items are prepared or processed foods (e.g., from VARIOS category) that are not linked to parent ingredients.
                  Select multiple items to link them all at once.
                </p>
                {/* Search bar */}
                <div className="relative mt-2">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search prepared items..."
                    value={preparedSearch}
                    onChange={(e) => setPreparedSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
              </div>

              {/* Bulk Actions Bar */}
              {selectedPreparedItems.size > 0 && (
                <div className="border-b px-4 py-2 flex-shrink-0 bg-primary/10">
                  <div className="flex items-center gap-3 flex-wrap">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">{selectedPreparedItems.size} selected</span>
                    
                    {/* Bulk Parent Selector */}
                    <Select
                      value={selectedParentForBulkLinking?.itemId || ''}
                      onValueChange={(val) => {
                        const parent = parentCandidates.find(p => p.itemId === val)
                        setSelectedParentForBulkLinking(parent || null)
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs w-48">
                        <SelectValue placeholder="Select parent for all..." />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="p-1">
                          <Input
                            placeholder="Search parents..."
                            value={parentSearchForLinking}
                            onChange={(e) => setParentSearchForLinking(e.target.value)}
                            className="h-6 text-xs"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <ScrollArea className="max-h-40">
                          {filteredParentsForLinking.map((parent) => (
                            <SelectItem key={parent.itemId} value={parent.itemId} className="text-xs">
                              <span className="font-medium">{parent.word}</span>
                              {parent.taxon && (
                                <span className="text-blue-600 italic ml-1">({parent.taxon})</span>
                              )}
                            </SelectItem>
                          ))}
                          {filteredParentsForLinking.length === 0 && (
                            <div className="text-xs text-muted-foreground p-2">No parents found</div>
                          )}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                    
                    <Button
                      size="sm"
                      onClick={() => {
                        if (selectedParentForBulkLinking) {
                          bulkLinkPreparedItems(
                            Array.from(selectedPreparedItems),
                            selectedParentForBulkLinking.itemId,
                            selectedParentForBulkLinking.word
                          )
                        }
                      }}
                      disabled={!selectedParentForBulkLinking || actionLoading === 'bulk-link-prepared'}
                      className="h-7"
                    >
                      {actionLoading === 'bulk-link-prepared' ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Link2 className="h-3 w-3 mr-1" />
                      )}
                      Link All Selected
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedPreparedItems(new Set())}
                      className="h-7"
                    >
                      Clear Selection
                    </Button>
                  </div>
                </div>
              )}

              <ScrollArea className="flex-1 min-h-0">
                {filteredPreparedItems.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    {preparedSearch ? 'No items match your search' : 'No prepared items found'}
                  </div>
                ) : (
                  <div className="p-2">
                    {/* Select All */}
                    {filteredPreparedItems.length > 0 && (
                      <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/30 rounded mb-2 sticky top-0 z-10">
                        <Checkbox
                          checked={selectedPreparedItems.size === filteredPreparedItems.length && filteredPreparedItems.length > 0}
                          onCheckedChange={() => {
                            if (selectedPreparedItems.size === filteredPreparedItems.length) {
                              setSelectedPreparedItems(new Set())
                            } else {
                              setSelectedPreparedItems(new Set(filteredPreparedItems.map(i => i.id)))
                            }
                          }}
                        />
                        <span className="text-xs text-muted-foreground">
                          Select all ({filteredPreparedItems.length})
                        </span>
                      </div>
                    )}

                    {filteredPreparedItems.map((item) => (
                      <div
                        key={item.id}
                        className={`border rounded-lg mb-2 p-3 bg-card transition-colors ${
                          selectedPreparedItems.has(item.id) 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1">
                            <Checkbox
                              checked={selectedPreparedItems.has(item.id)}
                              onCheckedChange={() => {
                                setSelectedPreparedItems(prev => {
                                  const next = new Set(prev)
                                  if (next.has(item.id)) next.delete(item.id)
                                  else next.add(item.id)
                                  return next
                                })
                              }}
                              className="mt-0.5"
                            />
                            <div className="flex-1">
                              <div className="font-medium">{item.nombreEspanol}</div>
                              {item.tipoAlimento && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Type: {item.tipoAlimento}
                                </div>
                              )}
                              {/* Word breakdown */}
                              <div className="flex flex-wrap gap-1 mt-2">
                                {item.words.map((w, idx) => {
                                  const cat = w.classification ? getCategoryInfo(w.classification.category) : null
                                  return (
                                    <span
                                      key={idx}
                                      className="text-xs px-1.5 py-0.5 rounded bg-muted"
                                    >
                                      {w.word}
                                      {w.classification && (
                                        <span className={`ml-1 ${cat?.textColor}`}>
                                          [{cat?.label.split(' ')[0]}]
                                        </span>
                                      )}
                                    </span>
                                  )
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Individual Actions (shown when not in bulk mode) */}
                          {selectedPreparedItems.size === 0 && (
                            <div className="flex flex-col gap-2 min-w-[200px]">
                              {/* Link to Parent */}
                              <div className="flex gap-1">
                                <Select
                                  value={selectedParentForItem[item.id]?.itemId || ''}
                                  onValueChange={(val) => {
                                    const parent = parentCandidates.find(p => p.itemId === val)
                                    setSelectedParentForItem(prev => ({ ...prev, [item.id]: parent || null }))
                                  }}
                                >
                                  <SelectTrigger className="h-7 text-xs flex-1">
                                    <SelectValue placeholder="Select parent..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <div className="p-1">
                                      <Input
                                        placeholder="Search parents..."
                                        value={parentSearchForLinking}
                                        onChange={(e) => setParentSearchForLinking(e.target.value)}
                                        className="h-6 text-xs"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                    <ScrollArea className="max-h-40">
                                      {filteredParentsForLinking.map((parent) => (
                                        <SelectItem key={parent.itemId} value={parent.itemId} className="text-xs">
                                          <span className="font-medium">{parent.word}</span>
                                          {parent.taxon && (
                                            <span className="text-blue-600 italic ml-1">({parent.taxon})</span>
                                          )}
                                        </SelectItem>
                                      ))}
                                      {filteredParentsForLinking.length === 0 && (
                                        <div className="text-xs text-muted-foreground p-2">No parents found</div>
                                      )}
                                    </ScrollArea>
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const parent = selectedParentForItem[item.id]
                                    if (parent) {
                                      linkRejectedToParent(item.id, parent.itemId, parent.word)
                                    }
                                  }}
                                  disabled={!selectedParentForItem[item.id] || actionLoading === `link-rejected-${item.id}`}
                                  className="h-7 px-2"
                                  title="Link to selected parent"
                                >
                                  {actionLoading === `link-rejected-${item.id}` ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Link2 className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                              
                              {/* Upgrade to Parent */}
                              <div className="flex gap-1">
                                <Input
                                  placeholder="Scientific name (optional)"
                                  className="h-7 text-xs flex-1"
                                  onChange={(e) => setItemScientificNames(prev => ({ ...prev, [item.id]: e.target.value }))}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => upgradeToParent(item.id, itemScientificNames[item.id] || undefined)}
                                  disabled={actionLoading === `upgrade-${item.id}`}
                                  className="h-7 bg-green-600 hover:bg-green-700 px-2"
                                  title="Upgrade to Parent"
                                >
                                  {actionLoading === `upgrade-${item.id}` ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <ArrowUpFromLine className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <ArrowRight className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Select a parent from the left panel</p>
                <p className="text-sm">to view and classify children</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend Footer */}
      <div className="border-t bg-muted/30 px-4 py-2 flex-shrink-0 flex items-center gap-4 text-xs flex-wrap">
        <span className="text-muted-foreground">Word Categories:</span>
        {WORD_CATEGORIES.slice(0, 8).map(cat => (
          <div key={cat.value} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${cat.color}`} />
            <span>{cat.label}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-2 text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500" /> = Already classified
        </div>
      </div>

      {/* Create Parent Dialog */}
      <Dialog open={showCreateParentDialog} onOpenChange={setShowCreateParentDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Parent Ingredient</DialogTitle>
            <DialogDescription>
              Create a parent ingredient that doesn&apos;t exist in the Mexican database. 
              This is useful for cross-cuisine recipes (e.g., Thai, Mediterranean).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="parent-name" className="text-sm font-medium">
                Parent Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="parent-name"
                placeholder="e.g., Coco, Oliva, Basil..."
                value={newParentName}
                onChange={(e) => setNewParentName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="scientific-name" className="text-sm font-medium">
                Scientific Name <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="scientific-name"
                placeholder="e.g., Cocos nucifera, Olea europaea..."
                value={newParentScientificName}
                onChange={(e) => setNewParentScientificName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateParentDialog(false)
                setNewParentName('')
                setNewParentScientificName('')
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => createParent(newParentName, newParentScientificName || undefined)}
              disabled={!newParentName.trim() || actionLoading === 'create-parent'}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading === 'create-parent' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Parent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
