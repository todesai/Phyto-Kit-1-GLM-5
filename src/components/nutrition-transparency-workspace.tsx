'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  X, Search, Database, AlertTriangle, Check, ChevronDown, ChevronUp,
  RefreshCw, Edit2, ExternalLink, Info, Table, BarChart3, AlertCircle,
  CheckCircle2, XCircle, HelpCircle, ArrowUpDown, ArrowLeft, ChevronLeft, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================
// TYPES
// ============================================

interface NutrientValue {
  value: number | null
  unit: string
  label: string
  filled: boolean
}

interface MatchDetails {
  matchedRow: {
    conabioId: number
    nameEs: string
    nameEn?: string | null
    nutrientScore: number
  }
  matchType: 'exact' | 'word-boundary' | 'starts-with' | 'partial' | 'contains'
  matchScore: number
  matchReasons: string[]
  isPoorMatch: boolean
  dataCompleteness: {
    macroPercent: number
    microPercent: number
    overallPercent: number
  }
  nutrientTable?: {
    macronutrients: Record<string, NutrientValue>
    micronutrients: Record<string, NutrientValue>
  }
  alternatives?: Array<{
    conabioId: number
    nameEs: string
    nutrientScore: number
    matchScore: number
  }>
}

interface IngredientNutrition {
  name: string
  measure?: string
  source: 'mexican-db' | 'usda' | 'not-found'
  confidence: number
  match?: string | null
  expandedFrom?: string
  matchDetails?: MatchDetails
}

interface RecipeNutrition {
  success: boolean
  ingredients: IngredientNutrition[]
  totalNutrition: Record<string, number>
  nutrientSummary?: {
    macronutrients: Record<string, { value: number; unit: string; filled: boolean; gap: boolean }>
    micronutrients: Record<string, { value: number; unit: string; filled: boolean; gap: boolean }>
    gapsSummary: { macroGaps: number; microGaps: number }
  }
  stats: {
    totalIngredients: number
    matchedIngredients: number
    mexicanDbMatches: number
    usdaMatches: number
    notFound: number
    expandedIngredients?: number
    coveragePercent: number
    poorMatches?: number
    averageDataCompleteness?: number
  }
}

interface AlternativeMatch {
  conabioId: number
  nameEs: string
  nameEn?: string | null
  nutrientScore: number
  matchScore: number
  nutrients?: Record<string, number | null>
}

// ============================================
// NUTRIENT DEFINITIONS
// ============================================

const MACRO_NUTRIENTS = [
  { key: 'energia', label: 'Energy', unit: 'kcal', short: 'Energ.' },
  { key: 'proteinaBruta', label: 'Protein', unit: 'g', short: 'Protein' },
  { key: 'hidratosCarbono', label: 'Carbs', unit: 'g', short: 'Carbs' },
  { key: 'extractoEtereo', label: 'Fat', unit: 'g', short: 'Fat' },
  { key: 'fibraDietariaTotal', label: 'Fiber', unit: 'g', short: 'Fiber' },
  { key: 'azucares', label: 'Sugars', unit: 'g', short: 'Sugar' },
  { key: 'colesterol', label: 'Cholesterol', unit: 'mg', short: 'Chol.' },
]

const VITAMINS = [
  { key: 'vitaminaA', label: 'Vitamin A', unit: 'IU', short: 'Vit A' },
  { key: 'acidoAscorbico', label: 'Vitamin C', unit: 'mg', short: 'Vit C' },
  { key: 'tiamina', label: 'Vitamin B1', unit: 'mg', short: 'B1' },
  { key: 'riboflavina', label: 'Vitamin B2', unit: 'mg', short: 'B2' },
  { key: 'niacina', label: 'Vitamin B3', unit: 'mg', short: 'B3' },
  { key: 'betaCarotenos', label: 'β-Carotenes', unit: 'mg', short: 'β-Car' },
  { key: 'carotenos', label: 'Carotenes', unit: 'mg', short: 'Carot.' },
]

const MINERALS = [
  { key: 'calcio', label: 'Calcium', unit: 'mg', short: 'Ca' },
  { key: 'hierro', label: 'Iron', unit: 'mg', short: 'Fe' },
  { key: 'potasio', label: 'Potassium', unit: 'mg', short: 'K' },
  { key: 'magnesio', label: 'Magnesium', unit: 'mg', short: 'Mg' },
  { key: 'zinc', label: 'Zinc', unit: 'mg', short: 'Zn' },
  { key: 'fosforo', label: 'Phosphorus', unit: 'mg', short: 'P' },
  { key: 'sodio', label: 'Sodium', unit: 'mg', short: 'Na' },
  { key: 'selenio', label: 'Selenium', unit: 'µg', short: 'Se' },
  { key: 'cobre', label: 'Copper', unit: 'mg', short: 'Cu' },
  { key: 'manganeso', label: 'Manganese', unit: 'mg', short: 'Mn' },
]

const AMINO_ACIDS = [
  { key: 'alanina', label: 'Alanine', unit: 'g', short: 'Ala' },
  { key: 'arginina', label: 'Arginine', unit: 'g', short: 'Arg' },
  { key: 'acidoAspartico', label: 'Aspartic Acid', unit: 'g', short: 'Asp' },
  { key: 'cisteina', label: 'Cysteine', unit: 'g', short: 'Cys' },
  { key: 'acidoGlutamico', label: 'Glutamic Acid', unit: 'g', short: 'Glu' },
  { key: 'glicina', label: 'Glycine', unit: 'g', short: 'Gly' },
  { key: 'histidina', label: 'Histidine', unit: 'g', short: 'His' },
  { key: 'isoleucina', label: 'Isoleucine', unit: 'g', short: 'Ile' },
  { key: 'leucina', label: 'Leucine', unit: 'g', short: 'Leu' },
  { key: 'lisina', label: 'Lysine', unit: 'g', short: 'Lys' },
  { key: 'metionina', label: 'Methionine', unit: 'g', short: 'Met' },
  { key: 'fenilalanina', label: 'Phenylalanine', unit: 'g', short: 'Phe' },
  { key: 'prolina', label: 'Proline', unit: 'g', short: 'Pro' },
  { key: 'serina', label: 'Serine', unit: 'g', short: 'Ser' },
  { key: 'treonina', label: 'Threonine', unit: 'g', short: 'Thr' },
  { key: 'triptofano', label: 'Tryptophan', unit: 'g', short: 'Trp' },
  { key: 'tirosina', label: 'Tyrosine', unit: 'g', short: 'Tyr' },
  { key: 'valina', label: 'Valine', unit: 'g', short: 'Val' },
]

const FATTY_ACIDS = [
  { key: 'acidosGrasosSaturados', label: 'Saturated FA', unit: 'g', short: 'SFA' },
  { key: 'acidoMiristico', label: 'Myristic Acid', unit: 'g', short: 'C14:0' },
  { key: 'acidoPalmitico', label: 'Palmitic Acid', unit: 'g', short: 'C16:0' },
  { key: 'acidoEsteaico', label: 'Stearic Acid', unit: 'g', short: 'C18:0' },
  { key: 'acidoOleico', label: 'Oleic Acid', unit: 'g', short: 'C18:1' },
  { key: 'acidoLinoleico', label: 'Linoleic (ω-6)', unit: 'g', short: 'C18:2' },
  { key: 'acidoLinolenico', label: 'Linolenic (ω-3)', unit: 'g', short: 'C18:3' },
  { key: 'acidoLaurico', label: 'Lauric Acid', unit: 'g', short: 'C12:0' },
  { key: 'acidoAraquidico', label: 'Arachidic Acid', unit: 'g', short: 'C20:0' },
  { key: 'acidoBehenico', label: 'Behenic Acid', unit: 'g', short: 'C22:0' },
  { key: 'acidoCaprico', label: 'Capric Acid', unit: 'g', short: 'C10:0' },
  { key: 'acidoCaprilico', label: 'Caprylic Acid', unit: 'g', short: 'C8:0' },
  { key: 'acidoCaproico', label: 'Caproic Acid', unit: 'g', short: 'C6:0' },
  { key: 'acidoElaidico', label: 'Elaidic Acid', unit: 'g', short: 'C18:1t' },
  { key: 'acidoPalmitoleico', label: 'Palmitoleic', unit: 'g', short: 'C16:1' },
]

const OTHER_NUTRIENTS = [
  { key: 'humedad', label: 'Moisture', unit: 'g', short: 'Moist.' },
  { key: 'cenizas', label: 'Ash', unit: 'g', short: 'Ash' },
  { key: 'almidon', label: 'Starch', unit: 'g', short: 'Starch' },
  { key: 'lactosa', label: 'Lactose', unit: 'g', short: 'Lact.' },
  { key: 'porcionComestible', label: 'Edible Portion', unit: '%', short: 'Ed.%' },
]

// Subcategory groups for filtering
const NUTRIENT_SUBCATEGORIES = {
  'all': { label: 'All Nutrients', nutrients: [...MACRO_NUTRIENTS, ...VITAMINS, ...MINERALS, ...AMINO_ACIDS, ...FATTY_ACIDS, ...OTHER_NUTRIENTS] },
  'macro': { label: 'Macronutrients', nutrients: MACRO_NUTRIENTS },
  'vitamins': { label: 'Vitamins', nutrients: VITAMINS },
  'minerals': { label: 'Minerals', nutrients: MINERALS },
  'amino': { label: 'Amino Acids', nutrients: AMINO_ACIDS },
  'fatty': { label: 'Fatty Acids', nutrients: FATTY_ACIDS },
  'other': { label: 'Other', nutrients: OTHER_NUTRIENTS },
}

const ALL_NUTRIENTS = NUTRIENT_SUBCATEGORIES['all'].nutrients

// Source colors
const SOURCE_COLORS = {
  'mexican-db': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  'usda': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  'not-found': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
}

const MATCH_TYPE_COLORS = {
  'exact': { bg: 'bg-green-100', text: 'text-green-700', label: 'Exact Match' },
  'word-boundary': { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Word Match' },
  'starts-with': { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Starts With' },
  'partial': { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Partial' },
  'contains': { bg: 'bg-red-100', text: 'text-red-700', label: 'Contains' },
}

// ============================================
// COMPONENT
// ============================================

interface NutritionTransparencyWorkspaceProps {
  onClose: () => void
  recipeName: string
  ingredients: Array<{ name: string; measure?: string }>
  portionCount?: number
}

export function NutritionTransparencyWorkspace({
  onClose,
  recipeName,
  ingredients,
  portionCount = 4,
}: NutritionTransparencyWorkspaceProps) {
  // State
  const [loading, setLoading] = useState(false)
  const [nutritionData, setNutritionData] = useState<RecipeNutrition | null>(null)
  const [expandedIngredients, setExpandedIngredients] = useState<Set<number>>(new Set())
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false)
  const [selectedIngredientIndex, setSelectedIngredientIndex] = useState<number | null>(null)
  const [alternativeSearch, setAlternativeSearch] = useState('')
  const [alternativeMatches, setAlternativeMatches] = useState<AlternativeMatch[]>([])
  const [searchingAlternatives, setSearchingAlternatives] = useState(false)
  const [selectedAlternative, setSelectedAlternative] = useState<AlternativeMatch | null>(null)
  const [overrides, setOverrides] = useState<Map<number, AlternativeMatch>>(new Map())
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table')
  const [nutrientSubcategory, setNutrientSubcategory] = useState<keyof typeof NUTRIENT_SUBCATEGORIES>('macro')
  const tableRef = useState<HTMLDivElement | null>(null)[0]
  const [scrollPosition, setScrollPosition] = useState(0)

  // Fetch nutrition data
  const fetchNutritionData = useCallback(async () => {
    if (!ingredients || ingredients.length === 0) return

    setLoading(true)
    try {
      const response = await fetch('/api/nutrition/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients }),
      })

      if (response.ok) {
        const data = await response.json()
        setNutritionData(data)
      }
    } catch (error) {
      console.error('Error fetching nutrition data:', error)
    } finally {
      setLoading(false)
    }
  }, [ingredients])

  // Load data on mount
  useEffect(() => {
    if (ingredients.length > 0) {
      fetchNutritionData()
    }
  }, [ingredients, fetchNutritionData])

  // Search for alternative matches
  const searchAlternatives = useCallback(async (ingredientName: string) => {
    setSearchingAlternatives(true)
    try {
      const response = await fetch(`/api/nutrition/calculate?q=${encodeURIComponent(ingredientName)}&limit=20`)
      const data = await response.json()
      setAlternativeMatches(data.results || [])
    } catch (error) {
      console.error('Error searching alternatives:', error)
      setAlternativeMatches([])
    } finally {
      setSearchingAlternatives(false)
    }
  }, [])

  // Handle override selection
  const handleOverride = async () => {
    if (selectedIngredientIndex === null || !selectedAlternative) return

    // Update the override map
    setOverrides(prev => {
      const next = new Map(prev)
      next.set(selectedIngredientIndex, selectedAlternative)
      return next
    })

    // Close dialog and reset
    setOverrideDialogOpen(false)
    setSelectedIngredientIndex(null)
    setSelectedAlternative(null)
    setAlternativeSearch('')
    setAlternativeMatches([])

    // Recalculate nutrition with overrides
    await recalculateWithOverrides()
  }

  // Recalculate with overrides
  const recalculateWithOverrides = useCallback(async () => {
    if (!nutritionData) return

    setLoading(true)
    try {
      // Build ingredients list with overrides
      const ingredientsWithOverrides = ingredients.map((ing, idx) => ({
        ...ing,
        overrideId: overrides.get(idx)?.conabioId,
      }))

      const response = await fetch('/api/nutrition/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ingredients: ingredientsWithOverrides,
          overrides: Array.from(overrides.entries()).map(([idx, match]) => ({
            ingredientIndex: idx,
            conabioId: match.conabioId,
          })),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setNutritionData(data)
      }
    } catch (error) {
      console.error('Error recalculating nutrition:', error)
    } finally {
      setLoading(false)
    }
  }, [ingredients, nutritionData, overrides])

  // Open override dialog
  const openOverrideDialog = (index: number) => {
    setSelectedIngredientIndex(index)
    const ingredient = nutritionData?.ingredients[index]
    if (ingredient) {
      setAlternativeSearch(ingredient.name)
      searchAlternatives(ingredient.name)
    }
    setOverrideDialogOpen(true)
  }

  // Toggle ingredient expansion
  const toggleIngredient = (index: number) => {
    setExpandedIngredients(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  // Get nutrient value for an ingredient
  const getNutrientValue = (ingredient: IngredientNutrition, nutrientKey: string): number | null => {
    if (!ingredient.matchDetails?.nutrientTable) return null

    const macroNutrient = ingredient.matchDetails.nutrientTable.macronutrients[nutrientKey]
    const microNutrient = ingredient.matchDetails.nutrientTable.micronutrients[nutrientKey]

    if (macroNutrient) return macroNutrient.value
    if (microNutrient) return microNutrient.value
    return null
  }

  // Get display nutrients based on subcategory
  const displayNutrients = useMemo(() => {
    return NUTRIENT_SUBCATEGORIES[nutrientSubcategory].nutrients
  }, [nutrientSubcategory])

  // Calculate totals per nutrient
  const nutrientTotals = useMemo(() => {
    if (!nutritionData?.ingredients) return {}

    const totals: Record<string, number> = {}
    for (const nutrient of ALL_NUTRIENTS) {
      totals[nutrient.key] = 0
    }

    for (const ingredient of nutritionData.ingredients) {
      for (const nutrient of ALL_NUTRIENTS) {
        const value = getNutrientValue(ingredient, nutrient.key)
        if (value !== null) {
          totals[nutrient.key] += value
        }
      }
    }

    return totals
  }, [nutritionData])

  // Count gaps per nutrient
  const nutrientGaps = useMemo(() => {
    if (!nutritionData?.ingredients) return {}

    const gaps: Record<string, number> = {}
    for (const nutrient of ALL_NUTRIENTS) {
      gaps[nutrient.key] = 0
    }

    for (const ingredient of nutritionData.ingredients) {
      for (const nutrient of ALL_NUTRIENTS) {
        const value = getNutrientValue(ingredient, nutrient.key)
        if (value === null) {
          gaps[nutrient.key]++
        }
      }
    }

    return gaps
  }, [nutritionData])

  // Count filled values per subcategory
  const subcategoryStats = useMemo(() => {
    if (!nutritionData?.ingredients) return {}

    const stats: Record<string, { filled: number; total: number }> = {}
    
    for (const [key, category] of Object.entries(NUTRIENT_SUBCATEGORIES)) {
      if (key === 'all') continue
      
      let filled = 0
      const total = category.nutrients.length * nutritionData.ingredients.length
      
      for (const ingredient of nutritionData.ingredients) {
        for (const nutrient of category.nutrients) {
          const value = getNutrientValue(ingredient, nutrient.key)
          if (value !== null) filled++
        }
      }
      
      stats[key] = { filled, total }
    }
    
    return stats
  }, [nutritionData])

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b shrink-0 bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Table className="h-5 w-5" />
                Nutritional Data Transparency
              </h1>
              <p className="text-sm text-muted-foreground">
                {recipeName} — {ingredients.length} ingredients — {portionCount} portions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchNutritionData()}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {loading && !nutritionData ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Calculating nutritional data...</p>
            </div>
          </div>
        ) : nutritionData ? (
          <>
            {/* Stats Bar */}
            <div className="px-6 py-3 bg-muted/30 border-b shrink-0">
              <div className="flex items-center gap-6 text-sm flex-wrap">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{nutritionData.stats.matchedIngredients}/{nutritionData.stats.totalIngredients}</span>
                  <span className="text-muted-foreground">matched</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full bg-green-500")} />
                  <span className="font-medium">{nutritionData.stats.mexicanDbMatches}</span>
                  <span className="text-muted-foreground">Mexican DB</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full bg-blue-500")} />
                  <span className="font-medium">{nutritionData.stats.usdaMatches}</span>
                  <span className="text-muted-foreground">USDA</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full bg-red-500")} />
                  <span className="font-medium">{nutritionData.stats.notFound}</span>
                  <span className="text-muted-foreground">not found</span>
                </div>
                {nutritionData.stats.expandedIngredients ? (
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{nutritionData.stats.expandedIngredients}</span>
                    <span className="text-muted-foreground">expanded</span>
                  </div>
                ) : null}
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{nutritionData.stats.coveragePercent}%</span>
                  <span className="text-muted-foreground">coverage</span>
                </div>
              </div>
            </div>

            {/* View Controls */}
            <div className="px-6 py-2 border-b flex items-center gap-4 shrink-0 flex-wrap">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'cards' | 'table')}>
                <TabsList className="h-8">
                  <TabsTrigger value="table" className="text-xs px-3">
                    <Table className="h-3 w-3 mr-1" />
                    Table View
                  </TabsTrigger>
                  <TabsTrigger value="cards" className="text-xs px-3">
                    <BarChart3 className="h-3 w-3 mr-1" />
                    Card View
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Separator orientation="vertical" className="h-6" />
              
              {/* Subcategory Filters */}
              <div className="flex items-center gap-1 flex-wrap">
                {(Object.keys(NUTRIENT_SUBCATEGORIES) as Array<keyof typeof NUTRIENT_SUBCATEGORIES>).map((key) => {
                  const isActive = nutrientSubcategory === key
                  const stats = subcategoryStats[key]
                  const showStats = stats && key !== 'all' && key !== 'macro'
                  
                  return (
                    <Button
                      key={key}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setNutrientSubcategory(key)}
                    >
                      {NUTRIENT_SUBCATEGORIES[key].label}
                      {showStats && (
                        <span className="ml-1 text-[10px] opacity-70">
                          ({stats.filled}/{stats.total})
                        </span>
                      )}
                    </Button>
                  )
                })}
              </div>
              
              {overrides.size > 0 && (
                <>
                  <Separator orientation="vertical" className="h-6" />
                  <Badge variant="secondary" className="gap-1">
                    <Edit2 className="h-3 w-3" />
                    {overrides.size} override{overrides.size > 1 ? 's' : ''}
                  </Badge>
                </>
              )}
            </div>

            {/* Main Content */}
            <ScrollArea className="flex-1">
              {viewMode === 'table' ? (
                <div className="p-6">
                  {/* Nutrient Table with horizontal scroll */}
                  <div className="border rounded-lg overflow-hidden">
                    <div 
                      className="overflow-x-auto"
                      style={{ 
                        scrollBehavior: 'smooth',
                        WebkitOverflowScrolling: 'touch'
                      }}
                    >
                      <table className="w-full text-sm" style={{ minWidth: 'max-content' }}>
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-muted/50">
                            <th className="sticky left-0 z-20 bg-muted/50 px-4 py-2 text-left font-medium border-r min-w-[220px]">
                              Ingredient
                            </th>
                            <th className="sticky left-[220px] z-10 bg-muted/50 px-3 py-2 text-center font-medium min-w-[70px] border-r">
                              Source
                            </th>
                            {displayNutrients.map(nutrient => (
                              <th key={nutrient.key} className="px-3 py-2 text-center font-medium min-w-[65px] bg-muted/50">
                                <div className="font-semibold">{nutrient.short}</div>
                                <div className="text-[10px] font-normal text-muted-foreground">({nutrient.unit})</div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {nutritionData.ingredients.map((ingredient, idx) => {
                            const isExpanded = expandedIngredients.has(idx)
                            const hasOverride = overrides.has(idx)
                            const sourceColor = SOURCE_COLORS[ingredient.source]
                            const matchColor = ingredient.matchDetails?.matchType 
                              ? MATCH_TYPE_COLORS[ingredient.matchDetails.matchType]
                              : null

                            return (
                              <tr 
                                key={idx} 
                                className={cn(
                                  "border-t hover:bg-muted/30 transition-colors",
                                  ingredient.expandedFrom && "bg-amber-50/50",
                                  hasOverride && "bg-blue-50/50"
                                )}
                              >
                                <td className="sticky left-0 z-10 bg-inherit px-4 py-2 border-r">
                                  <div className="flex items-start gap-2">
                                    <button
                                      onClick={() => toggleIngredient(idx)}
                                      className="mt-0.5 text-muted-foreground hover:text-foreground shrink-0"
                                    >
                                      {isExpanded ? (
                                        <ChevronUp className="h-4 w-4" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4" />
                                      )}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium flex items-center gap-2 flex-wrap">
                                        <span className="truncate">{ingredient.name}</span>
                                        {ingredient.expandedFrom && (
                                          <Badge variant="outline" className="text-xs shrink-0">
                                            from: {ingredient.expandedFrom}
                                          </Badge>
                                        )}
                                        {hasOverride && (
                                          <Badge variant="secondary" className="text-xs shrink-0">
                                            Overridden
                                          </Badge>
                                        )}
                                      </div>
                                      {ingredient.measure && (
                                        <div className="text-xs text-muted-foreground">
                                          {ingredient.measure}
                                        </div>
                                      )}
                                      {isExpanded && ingredient.matchDetails && (
                                        <div className="mt-2 space-y-2 text-xs bg-background p-2 rounded border">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-muted-foreground">Matched:</span>
                                            <span className="font-medium">{ingredient.matchDetails.matchedRow.nameEs}</span>
                                            <span className="text-muted-foreground">(ID: {ingredient.matchDetails.matchedRow.conabioId})</span>
                                            {matchColor && (
                                              <Badge className={cn("text-xs", matchColor.bg, matchColor.text)}>
                                                {matchColor.label}
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-4 flex-wrap">
                                            <span className="text-muted-foreground">
                                              Data: {ingredient.matchDetails.dataCompleteness.overallPercent}% complete
                                            </span>
                                            <span className="text-muted-foreground">
                                              Score: {ingredient.matchDetails.matchScore}
                                            </span>
                                          </div>
                                          {ingredient.matchDetails.matchReasons.length > 0 && (
                                            <div className="text-muted-foreground">
                                              Reasons: {ingredient.matchDetails.matchReasons.join(', ')}
                                            </div>
                                          )}
                                          {ingredient.matchDetails.alternatives && ingredient.matchDetails.alternatives.length > 0 && (
                                            <div className="text-muted-foreground">
                                              Alternatives: {ingredient.matchDetails.alternatives.slice(0, 3).map(a => a.nameEs).join(', ')}
                                            </div>
                                          )}
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-6 text-xs mt-1"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              openOverrideDialog(idx)
                                            }}
                                          >
                                            <Edit2 className="h-3 w-3 mr-1" />
                                            Change Match
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="sticky left-[220px] z-10 bg-inherit px-3 py-2 text-center border-r">
                                  {ingredient.source !== 'not-found' ? (
                                    <Badge className={cn("text-xs", sourceColor.bg, sourceColor.text)}>
                                      {ingredient.source === 'mexican-db' ? 'MX' : 'USDA'}
                                    </Badge>
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                                  )}
                                </td>
                                {displayNutrients.map(nutrient => {
                                  const value = getNutrientValue(ingredient, nutrient.key)
                                  return (
                                    <td key={nutrient.key} className="px-3 py-2 text-center">
                                      {value !== null ? (
                                        <span className="font-mono text-xs">{value.toFixed(1)}</span>
                                      ) : (
                                        <span className="text-muted-foreground text-xs">—</span>
                                      )}
                                    </td>
                                  )
                                })}
                              </tr>
                            )
                          })}
                          {/* Totals Row */}
                          <tr className="bg-muted/50 font-medium sticky bottom-0">
                            <td className="sticky left-0 z-10 bg-muted/50 px-4 py-3 border-r">
                              TOTAL (per 100g)
                            </td>
                            <td className="sticky left-[220px] z-10 bg-muted/50 px-3 py-3 text-center border-r">—</td>
                            {displayNutrients.map(nutrient => (
                              <td key={nutrient.key} className="px-3 py-3 text-center bg-muted/50">
                                <span className="font-mono">{(nutrientTotals[nutrient.key] || 0).toFixed(1)}</span>
                              </td>
                            ))}
                          </tr>
                          {/* Gaps Row */}
                          <tr className="bg-red-50/50 text-xs">
                            <td className="sticky left-0 z-10 bg-red-50/50 px-4 py-2 border-r text-muted-foreground">
                              Missing Data
                            </td>
                            <td className="sticky left-[220px] z-10 bg-red-50/50 px-3 py-2 text-center border-r">—</td>
                            {displayNutrients.map(nutrient => {
                              const gaps = nutrientGaps[nutrient.key] || 0
                              return (
                                <td key={nutrient.key} className="px-3 py-2 text-center bg-red-50/50">
                                  {gaps > 0 ? (
                                    <span className="text-red-600">{gaps}</span>
                                  ) : (
                                    <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Horizontal scroll hint */}
                  {displayNutrients.length > 10 && (
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <ChevronLeft className="h-4 w-4" />
                        <span>Scroll horizontally to see more columns</span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                      <span>{displayNutrients.length} columns visible</span>
                    </div>
                  )}

                  {/* Legend */}
                  <div className="mt-4 flex items-center gap-6 text-xs text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Sources:</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-green-500" />
                      MX = Mexican Database
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-blue-500" />
                      USDA = FoodData Central
                    </div>
                    <Separator orientation="vertical" className="h-4" />
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">—</span>
                      = No data available
                    </div>
                    <Separator orientation="vertical" className="h-4" />
                    <span>
                      Showing {displayNutrients.length} of {ALL_NUTRIENTS.length} nutrients
                    </span>
                  </div>
                </div>
              ) : (
                /* Card View */
                <div className="p-6 space-y-4">
                  {nutritionData.ingredients.map((ingredient, idx) => {
                    const hasOverride = overrides.has(idx)
                    const sourceColor = SOURCE_COLORS[ingredient.source]
                    const matchColor = ingredient.matchDetails?.matchType 
                      ? MATCH_TYPE_COLORS[ingredient.matchDetails.matchType]
                      : null

                    return (
                      <div 
                        key={idx}
                        className={cn(
                          "border rounded-lg p-4",
                          ingredient.expandedFrom && "border-amber-300 bg-amber-50/30",
                          hasOverride && "border-blue-300 bg-blue-50/30"
                        )}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {ingredient.name}
                              {ingredient.expandedFrom && (
                                <Badge variant="outline" className="text-xs">
                                  Expanded from: {ingredient.expandedFrom}
                                </Badge>
                              )}
                            </div>
                            {ingredient.measure && (
                              <div className="text-sm text-muted-foreground">{ingredient.measure}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={cn(sourceColor.bg, sourceColor.text)}>
                              {ingredient.source === 'mexican-db' ? 'Mexican DB' : 
                               ingredient.source === 'usda' ? 'USDA' : 'Not Found'}
                            </Badge>
                            {ingredient.confidence > 0 && (
                              <Badge variant="outline">{ingredient.confidence}% conf.</Badge>
                            )}
                          </div>
                        </div>

                        {ingredient.matchDetails && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm text-muted-foreground">Matched to:</span>
                              <span className="font-medium">{ingredient.matchDetails.matchedRow.nameEs}</span>
                              {matchColor && (
                                <Badge className={cn("text-xs", matchColor.bg, matchColor.text)}>
                                  {matchColor.label}
                                </Badge>
                              )}
                              {ingredient.matchDetails.isPoorMatch && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Low Confidence
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Data completeness: {ingredient.matchDetails.dataCompleteness.overallPercent}%</span>
                              <span>Macro: {ingredient.matchDetails.dataCompleteness.macroPercent}%</span>
                              <span>Micro: {ingredient.matchDetails.dataCompleteness.microPercent}%</span>
                            </div>

                            {ingredient.matchDetails.alternatives && ingredient.matchDetails.alternatives.length > 0 && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Other matches: </span>
                                {ingredient.matchDetails.alternatives.slice(0, 3).map((alt, i) => (
                                  <span key={alt.conabioId}>
                                    {alt.nameEs} ({alt.matchScore} pts)
                                    {i < Math.min(2, ingredient.matchDetails!.alternatives!.length - 1) && ', '}
                                  </span>
                                ))}
                              </div>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openOverrideDialog(idx)}
                            >
                              <Edit2 className="h-4 w-4 mr-1" />
                              Change Match
                            </Button>
                          </div>
                        )}

                        {ingredient.source === 'not-found' && (
                          <div className="flex items-center gap-2 text-sm text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            No match found in databases
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openOverrideDialog(idx)}
                            >
                              Search Manually
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </>
        ) : null}
      </div>

      {/* Override Dialog */}
      <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Change Ingredient Match</DialogTitle>
            <DialogDescription>
              Search for an alternative match for "{nutritionData?.ingredients[selectedIngredientIndex!]?.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Search for alternative..."
              value={alternativeSearch}
              onChange={(e) => setAlternativeSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  searchAlternatives(alternativeSearch)
                }
              }}
            />
            <Button onClick={() => searchAlternatives(alternativeSearch)} disabled={searchingAlternatives}>
              {searchingAlternatives ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          <ScrollArea className="flex-1">
            {alternativeMatches.length > 0 ? (
              <div className="space-y-2">
                {alternativeMatches.map((match) => (
                  <div
                    key={match.conabioId}
                    className={cn(
                      "border rounded-lg p-3 cursor-pointer transition-colors",
                      selectedAlternative?.conabioId === match.conabioId
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => setSelectedAlternative(match)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{match.nameEs}</div>
                        {match.nameEn && (
                          <div className="text-sm text-muted-foreground">{match.nameEn}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">Score: {match.matchScore}</Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          Nutrient Score: {match.nutrientScore}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchingAlternatives ? (
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                ) : (
                  <HelpCircle className="h-6 w-6 mx-auto mb-2" />
                )}
                <p>{searchingAlternatives ? 'Searching...' : 'Search for alternatives'}</p>
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setOverrideDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleOverride} disabled={!selectedAlternative}>
              Apply Override
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
