'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, Search, RefreshCw, Check, AlertCircle, Eye } from 'lucide-react'

// Category definitions with colors
const CATEGORIES: Record<string, { label: string; color: string; description: string }> = {
  'core': { label: 'Core Ingredient', color: 'bg-green-600', description: 'Main food items (egg, chicken, rice, etc.)' },
  'species': { label: 'Species', color: 'bg-blue-600', description: 'Animal/plant species (gallina, vaca, sardina)' },
  'part': { label: 'Part', color: 'bg-purple-600', description: 'Body parts/cuts (clara, pechuga, filete)' },
  'color': { label: 'Color', color: 'bg-orange-600', description: 'Color descriptors (rojo, blanco, verde)' },
  'processing': { label: 'Processing', color: 'bg-amber-600', description: 'Processing states (crudo, cocido, seco)' },
  'form': { label: 'Form', color: 'bg-cyan-600', description: 'Physical forms (harina, polvo, jugo)' },
  'descriptor': { label: 'Descriptor', color: 'bg-gray-600', description: 'Other descriptors (sabor, integral, light)' },
  'connector': { label: 'Connector', color: 'bg-slate-400', description: 'Connector words (de, con, para)' },
  'unknown': { label: 'Unknown', color: 'bg-red-600', description: 'Needs classification' },
}

// Subcategory options per category
const SUBCATEGORIES: Record<string, string[]> = {
  'core': ['protein', 'dairy', 'grain', 'legume', 'vegetable', 'fruit', 'fat', 'sweetener', 'seasoning', 'nut', 'seed', 'prepared', 'beverage', 'fungi'],
  'processing': ['raw', 'cooked', 'preserved', 'fermented', 'processed', 'flavor'],
  'descriptor': ['product', 'prepared', 'state', 'ingredient', 'regional', 'descriptor', 'form', 'packaging'],
}

interface WordClassification {
  id: string
  word: string
  category: string
  subcategory: string | null
  priority: number
  frequency: number
  examples: string
  needsReview: boolean
  notes: string | null
}

interface Summary {
  categoryCounts: Array<{ category: string; count: number }>
  needsReview: number
  total: number
}

export default function WordClassificationPage() {
  const [words, setWords] = useState<WordClassification[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [needsReviewFilter, setNeedsReviewFilter] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Pagination
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const limit = 30
  
  // View word details
  const [selectedWord, setSelectedWord] = useState<WordClassification | null>(null)

  // Fetch words
  const fetchWords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      })
      
      if (categoryFilter !== 'all') {
        params.set('category', categoryFilter)
      }
      if (needsReviewFilter) {
        params.set('needsReview', 'true')
      }
      if (searchQuery) {
        params.set('search', searchQuery)
      }
      
      const res = await fetch(`/api/words/classifications?${params}`)
      const data = await res.json()
      
      setWords(data.words)
      setTotal(data.pagination.total)
      setHasMore(data.pagination.hasMore)
      setSummary(data.summary)
    } catch (error) {
      console.error('Error fetching words:', error)
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, needsReviewFilter, searchQuery, offset])

  useEffect(() => {
    fetchWords()
  }, [fetchWords])

  // Update word classification
  const updateWord = async (id: string, category: string, subcategory?: string, notes?: string) => {
    setSaving(id)
    try {
      const res = await fetch('/api/words/classifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          category,
          subcategory,
          notes,
        }),
      })
      
      if (res.ok) {
        // Update local state
        setWords(prev => prev.map(w => 
          w.id === id 
            ? { ...w, category, subcategory: subcategory || null, notes: notes || null, needsReview: false }
            : w
        ))
        // Refresh summary
        fetchWords()
      }
    } catch (error) {
      console.error('Error updating word:', error)
    } finally {
      setSaving(null)
    }
  }

  // Get category badge
  const getCategoryBadge = (category: string) => {
    const cat = CATEGORIES[category] || CATEGORIES['unknown']
    return (
      <Badge className={`${cat.color} text-white text-xs`}>
        {cat.label}
      </Badge>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Word Classification Review</h1>
        <p className="text-muted-foreground">
          Review and correct word classifications for better ingredient matching
        </p>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{summary.total}</div>
              <div className="text-sm text-muted-foreground">Total Words</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-500">{summary.needsReview}</div>
              <div className="text-sm text-muted-foreground">Need Review</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-500">
                {summary.total - summary.needsReview}
              </div>
              <div className="text-sm text-muted-foreground">Classified</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">
                {Math.round((1 - summary.needsReview / summary.total) * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">Complete</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category Distribution */}
      {summary && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Category Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {summary.categoryCounts
                .sort((a, b) => b.count - a.count)
                .map(({ category, count }) => {
                  const cat = CATEGORIES[category] || CATEGORIES['unknown']
                  return (
                    <Badge 
                      key={category} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => setCategoryFilter(category)}
                    >
                      {cat.label}: {count}
                    </Badge>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search words..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setOffset(0)
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setOffset(0) }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(CATEGORIES).map(([key, val]) => (
                  <SelectItem key={key} value={key}>
                    {val.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant={needsReviewFilter ? "default" : "outline"}
              onClick={() => { setNeedsReviewFilter(!needsReviewFilter); setOffset(0) }}
            >
              {needsReviewFilter ? <AlertCircle className="h-4 w-4 mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Needs Review
            </Button>
            
            <Button variant="outline" onClick={() => fetchWords()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading words...</p>
        </div>
      ) : words.length === 0 ? (
        <div className="text-center py-12">
          <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
          <p className="text-lg font-medium">All words reviewed!</p>
          <p className="text-muted-foreground">No words match the current filters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {words.map((word) => (
            <Card key={word.id} className={`transition-colors ${word.needsReview ? 'border-red-200 dark:border-red-900' : ''}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-4">
                  {/* Word */}
                  <div className="min-w-[120px]">
                    <div className="font-medium">{word.word}</div>
                    <div className="text-xs text-muted-foreground">
                      {word.frequency}x
                    </div>
                  </div>
                  
                  {/* Current category */}
                  <div className="min-w-[140px]">
                    {getCategoryBadge(word.category)}
                    {word.subcategory && (
                      <Badge variant="outline" className="ml-1 text-xs">
                        {word.subcategory}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Category selector */}
                  <Select
                    value={word.category}
                    onValueChange={(v) => {
                      const subcat = SUBCATEGORIES[v]?.[0]
                      updateWord(word.id, v, subcat, word.notes || undefined)
                    }}
                    disabled={saving === word.id}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORIES).map(([key, val]) => (
                        <SelectItem key={key} value={key}>
                          {val.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Subcategory selector (if applicable) */}
                  {SUBCATEGORIES[word.category] && (
                    <Select
                      value={word.subcategory || ''}
                      onValueChange={(v) => updateWord(word.id, word.category, v, word.notes || undefined)}
                      disabled={saving === word.id}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUBCATEGORIES[word.category].map((sub) => (
                          <SelectItem key={sub} value={sub}>
                            {sub}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {/* View details button */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setSelectedWord(word)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>{word.word}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <div className="text-sm font-medium mb-1">Category</div>
                          {getCategoryBadge(word.category)}
                          <p className="text-sm text-muted-foreground mt-1">
                            {CATEGORIES[word.category]?.description}
                          </p>
                        </div>
                        
                        {word.subcategory && (
                          <div>
                            <div className="text-sm font-medium mb-1">Subcategory</div>
                            <Badge variant="outline">{word.subcategory}</Badge>
                          </div>
                        )}
                        
                        <div>
                          <div className="text-sm font-medium mb-1">Frequency</div>
                          <p>Appears {word.frequency} times in the database</p>
                        </div>
                        
                        {word.notes && (
                          <div>
                            <div className="text-sm font-medium mb-1">Notes</div>
                            <p className="text-sm">{word.notes}</p>
                          </div>
                        )}
                        
                        <div>
                          <div className="text-sm font-medium mb-2">Example Foods</div>
                          <div className="space-y-1 max-h-[200px] overflow-auto">
                            {(() => {
                              try {
                                const examples = JSON.parse(word.examples)
                                return examples.map((ex: string, i: number) => (
                                  <div key={i} className="text-sm bg-muted px-2 py-1 rounded">
                                    {ex}
                                  </div>
                                ))
                              } catch {
                                return <span className="text-muted-foreground">No examples</span>
                              }
                            })()}
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  {/* Status */}
                  {saving === word.id && (
                    <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {!word.needsReview && saving !== word.id && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && words.length > 0 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-muted-foreground">
            Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasMore}
              onClick={() => setOffset(offset + limit)}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
