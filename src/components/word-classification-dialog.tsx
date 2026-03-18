'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Check,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Filter,
} from 'lucide-react'

interface WordClassification {
  id: string
  word: string
  wordLower: string
  category: string
  subcategory: string | null
  priority: number
  examples: string | null
  frequency: number
  needsReview: boolean
  notes: string | null
}

interface Stats {
  total: number
  needsReview: number
  classified: number
  byCategory: Record<string, number>
}

interface FoodCategory {
  name: string
  count: number
}

interface WordClassificationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CATEGORIES = [
  { value: 'core', label: 'Core Ingredient', priority: 1, color: 'bg-green-500' },
  { value: 'species', label: 'Species', priority: 2, color: 'bg-blue-500' },
  { value: 'part', label: 'Part', priority: 2, color: 'bg-purple-500' },
  { value: 'prepared', label: 'Prepared Item', priority: 2, color: 'bg-amber-500' },
  { value: 'color', label: 'Color', priority: 3, color: 'bg-yellow-500' },
  { value: 'processing', label: 'Processing', priority: 3, color: 'bg-orange-500' },
  { value: 'form', label: 'Form', priority: 3, color: 'bg-pink-500' },
  { value: 'descriptor', label: 'Descriptor', priority: 4, color: 'bg-cyan-500' },
  { value: 'connector', label: 'Connector', priority: 5, color: 'bg-gray-500' },
  { value: 'excluded', label: 'Not Needed', priority: 6, color: 'bg-slate-500' },
  { value: 'unknown', label: 'Unknown', priority: 4, color: 'bg-red-500' },
]

export function WordClassificationDialog({
  open,
  onOpenChange,
}: WordClassificationDialogProps) {
  const [words, setWords] = useState<WordClassification[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [needsReviewFilter, setNeedsReviewFilter] = useState(false)
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const [updating, setUpdating] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extractStats, setExtractStats] = useState<any>(null)
  
  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkCategory, setBulkCategory] = useState<string>('')
  
  // Food type filter state
  const [foodCategories, setFoodCategories] = useState<FoodCategory[]>([])
  const [excludedFoodTypes, setExcludedFoodTypes] = useState<string[]>(['VARIOS'])
  const [showFilters, setShowFilters] = useState(false)
  
  const limit = 20

  useEffect(() => {
    if (open) {
      fetchWords()
      fetchFoodCategories()
    }
  }, [open, categoryFilter, needsReviewFilter, offset])

  // Clear selection when page changes
  useEffect(() => {
    setSelectedIds(new Set())
  }, [offset, categoryFilter, needsReviewFilter])

  const fetchFoodCategories = async () => {
    try {
      const response = await fetch('/api/mexican-food/categories')
      const data = await response.json()
      setFoodCategories(data.categories || [])
    } catch (error) {
      console.error('Error fetching food categories:', error)
    }
  }

  const fetchWords = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      if (needsReviewFilter) params.append('needsReview', 'true')
      if (search) params.append('search', search)
      params.append('limit', limit.toString())
      params.append('offset', offset.toString())

      const response = await fetch(`/api/words/classifications?${params}`)
      const data = await response.json()

      setWords(data.words || [])
      setTotal(data.total || 0)
      setStats(data.stats || null)
    } catch (error) {
      console.error('Error fetching words:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setOffset(0)
    fetchWords()
  }

  const updateCategory = async (wordId: string, newCategory: string) => {
    setUpdating(true)
    try {
      const category = CATEGORIES.find((c) => c.value === newCategory)
      const response = await fetch('/api/words/classifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: wordId,
          category: newCategory,
          priority: category?.priority || 3,
          needsReview: false,
        }),
      })

      if (response.ok) {
        setWords((prev) =>
          prev.map((w) =>
            w.id === wordId
              ? { ...w, category: newCategory, needsReview: false }
              : w
          )
        )
        fetchWords()
      }
    } catch (error) {
      console.error('Error updating word:', error)
    } finally {
      setUpdating(false)
    }
  }

  const bulkUpdateCategory = async () => {
    if (selectedIds.size === 0 || !bulkCategory) return
    
    setUpdating(true)
    try {
      const category = CATEGORIES.find((c) => c.value === bulkCategory)
      const updates = Array.from(selectedIds).map(id => ({
        id,
        category: bulkCategory,
        priority: category?.priority || 3,
        needsReview: false,
      }))

      const response = await fetch('/api/words/classifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })

      if (response.ok) {
        // Update local state
        setWords((prev) =>
          prev.map((w) =>
            selectedIds.has(w.id)
              ? { ...w, category: bulkCategory, needsReview: false }
              : w
          )
        )
        setSelectedIds(new Set())
        setBulkCategory('')
        fetchWords()
      }
    } catch (error) {
      console.error('Error bulk updating words:', error)
    } finally {
      setUpdating(false)
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === words.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(words.map(w => w.id)))
    }
  }

  const toggleFoodType = (typeName: string) => {
    setExcludedFoodTypes(prev => {
      if (prev.includes(typeName)) {
        return prev.filter(t => t !== typeName)
      } else {
        return [...prev, typeName]
      }
    })
  }

  const getCategoryColor = (category: string) => {
    const cat = CATEGORIES.find((c) => c.value === category)
    return cat?.color || 'bg-gray-400'
  }

  const getCategoryLabel = (category: string) => {
    const cat = CATEGORIES.find((c) => c.value === category)
    return cat?.label || category
  }

  const runExtraction = async () => {
    setExtracting(true)
    setExtractStats(null)
    try {
      const response = await fetch('/api/words/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reset: false, // Preserve existing classifications
          excludeFoodTypes: excludedFoodTypes 
        }),
      })
      const data = await response.json()
      if (data.success) {
        setExtractStats(data.stats)
        fetchWords()
      }
    } catch (error) {
      console.error('Extraction error:', error)
    } finally {
      setExtracting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Word Classification Review
          </DialogTitle>
          <DialogDescription>
            Review and classify words extracted from the Mexican nutrition database
            for ingredient matching.
          </DialogDescription>
        </DialogHeader>

        {/* Stats Section */}
        <div className="flex gap-4 items-start">
          {stats && (
            <div className="flex-1 grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total Words</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">
                  {stats.needsReview}
                </div>
                <div className="text-sm text-muted-foreground">Need Review</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {stats.classified}
                </div>
                <div className="text-sm text-muted-foreground">Classified</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {stats.total > 0
                    ? Math.round((stats.classified / stats.total) * 100)
                    : 0}
                  %
                </div>
                <div className="text-sm text-muted-foreground">Completion</div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Row */}
        <div className="flex gap-2 items-center justify-between">
          <div className="flex gap-2">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <Filter className="h-4 w-4 mr-1" />
              {showFilters ? 'Hide Filters' : 'Food Type Filters'}
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-xs text-muted-foreground text-right max-w-[200px]">
              <span className="text-green-600 font-medium">Safe:</span> Adds new words, preserves your work
            </div>
            <Button
              onClick={runExtraction}
              disabled={extracting}
              variant="default"
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              {extracting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync Words
            </Button>
          </div>
        </div>

        {/* Food Type Filter Panel */}
        {showFilters && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm text-amber-800">Exclude Food Categories from Word Extraction</h4>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setExcludedFoodTypes(['VARIOS'])}
                className="text-xs"
              >
                Reset to Default
              </Button>
            </div>
            <p className="text-xs text-amber-700 mb-3">
              Checked categories will be excluded when syncing words. This affects only <strong>new</strong> word extraction - your existing classifications are always preserved.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {foodCategories.map((cat) => (
                <label
                  key={cat.name}
                  className={`flex items-center gap-2 p-2 rounded border cursor-pointer text-sm transition-colors ${
                    excludedFoodTypes.includes(cat.name)
                      ? 'bg-red-500/10 border-red-500/30 text-red-600'
                      : 'bg-background hover:bg-muted/50'
                  }`}
                >
                  <Checkbox
                    checked={excludedFoodTypes.includes(cat.name)}
                    onCheckedChange={() => toggleFoodType(cat.name)}
                  />
                  <span className="flex-1 truncate">{cat.name}</span>
                  <Badge variant="outline" className="text-xs">{cat.count}</Badge>
                </label>
              ))}
            </div>
            <div className="mt-3 pt-2 border-t border-amber-200">
              <p className="text-xs text-amber-700">
                {excludedFoodTypes.length > 0 
                  ? `⚠️ ${excludedFoodTypes.length} categor${excludedFoodTypes.length === 1 ? 'y' : 'ies'} excluded: ${excludedFoodTypes.join(', ')}`
                  : '✓ All categories included in word extraction'
                }
              </p>
            </div>
          </div>
        )}

        {/* Extraction Results */}
        {extractStats && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-green-800">Word Sync Complete</span>
            </div>
            <div className="grid grid-cols-5 gap-3 mb-3">
              <div className="bg-white p-2 rounded border text-center">
                <div className="text-lg font-bold text-green-600">{extractStats.preserved || 0}</div>
                <div className="text-xs text-muted-foreground">Preserved</div>
              </div>
              <div className="bg-white p-2 rounded border text-center">
                <div className="text-lg font-bold text-blue-600">{extractStats.created || 0}</div>
                <div className="text-xs text-muted-foreground">New Words</div>
              </div>
              <div className="bg-white p-2 rounded border text-center">
                <div className="text-lg font-bold text-purple-600">{extractStats.reclassified || 0}</div>
                <div className="text-xs text-muted-foreground">Auto-Classified</div>
              </div>
              <div className="bg-white p-2 rounded border text-center">
                <div className="text-lg font-bold text-amber-600">{extractStats.updated || 0}</div>
                <div className="text-xs text-muted-foreground">Updated</div>
              </div>
              <div className="bg-white p-2 rounded border text-center">
                <div className="text-lg font-bold text-gray-600">{extractStats.foodsProcessed}</div>
                <div className="text-xs text-muted-foreground">Foods Scanned</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100 p-2 rounded">
              <Check className="h-4 w-4" />
              <span>
                {extractStats.reclassified > 0 
                  ? `${extractStats.reclassified} unknown words were auto-classified using improved patterns.`
                  : 'Your existing classifications were preserved. Only new words were added.'
                }
              </span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Search words..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} size="icon" variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={needsReviewFilter ? 'default' : 'outline'}
            onClick={() => {
              setNeedsReviewFilter(!needsReviewFilter)
              setOffset(0)
            }}
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Needs Review
          </Button>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <span className="font-medium">{selectedIds.size} selected</span>
            <Select value={bulkCategory} onValueChange={setBulkCategory}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Choose category..." />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.filter(c => c.value !== 'unknown').map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={bulkUpdateCategory} 
              disabled={!bulkCategory || updating}
              size="sm"
            >
              {updating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Apply to All
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        )}

        <Separator />

        {/* Word List */}
        <div className="flex-1 min-h-0 overflow-y-auto border rounded-lg" style={{ maxHeight: '400px' }}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : words.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Check className="h-12 w-12 mb-4" />
              <p>No words found matching your filters</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {/* Select All Row */}
              <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 mb-2">
                <Checkbox
                  checked={selectedIds.size === words.length && words.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  Select all ({words.length} words on this page)
                </span>
              </div>
              
              {/* Word Rows */}
              {words.map((word) => (
                <div
                  key={word.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedIds.has(word.id)
                      ? 'border-primary bg-primary/10'
                      : 'hover:bg-muted/50 border-transparent hover:border-muted'
                  }`}
                  onClick={(e) => {
                    // Don't toggle if clicking on select dropdown
                    if (!(e.target instanceof Element && e.target.closest('[data-radix-select-trigger]'))) {
                      toggleSelect(word.id)
                    }
                  }}
                >
                  <Checkbox
                    checked={selectedIds.has(word.id)}
                    onCheckedChange={() => toggleSelect(word.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="font-medium min-w-[100px]">{word.word}</span>
                  <Badge
                    className={`${getCategoryColor(word.category)} text-white`}
                  >
                    {getCategoryLabel(word.category)}
                  </Badge>
                  {word.needsReview && (
                    <Badge variant="destructive">Review</Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    ({word.frequency}x)
                  </span>
                  <div className="flex-1" />
                  <Select
                    value={word.category}
                    onValueChange={(value) => updateCategory(word.id, value)}
                  >
                    <SelectTrigger className="w-36" onClick={(e) => e.stopPropagation()}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-muted-foreground">
            Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
