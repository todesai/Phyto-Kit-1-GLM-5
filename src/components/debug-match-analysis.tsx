'use client'

import { useState, useEffect } from 'react'
import { Database, Loader2, Search, ChevronDown, ChevronUp, X, Bug, ExternalLink, Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface Ingredient { name: string; measure?: string }

interface DebugResult {
  originalIngredient: string
  measure?: string
  isSpiceBlend: boolean
  spiceComponents: string[] | null
  mexicanDB: {
    excluded: boolean
    reason: string | null
    searchWords: string[]
    translatedWords: string[]
    selected: {
      id: string
      nombreEspanol: string
      nombreIngles: string | null
      score: number
      reasons: string[]
      nutrients: Record<string, { value: number | null; unit: string }> | null
    } | null
    discarded: Array<{
      nombreEspanol: string
      nombreIngles: string | null
      score: number
      reasons: string[]
    }>
    allMatchesCount: number
  }
  usda: {
    matches: Array<{
      fdcId: number
      description: string
      dataType: string
      nutrients: Record<string, { value: number | null; unit: string }> | null
    }>
    count: number
    error?: string
  }
  phytoHub: {
    excluded: boolean
    reason: string | null
    foods: Array<{ id: string; name: string; compoundCount: number }>
    compounds: Array<{ id: string; name: string; chemicalClass: string | null; foodSource: string }>
  }
  finalSelection: {
    source: string | null
    match: any
    nutrients: Record<string, { value: number | null; unit: string }> | null
  }
}

interface DebugMatchAnalysisProps {
  ingredients: Ingredient[]
  onClose?: () => void
}

export function DebugMatchAnalysis({ ingredients, onClose }: DebugMatchAnalysisProps) {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<DebugResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  // Run analysis on mount
  useEffect(() => {
    if (ingredients && ingredients.length > 0) {
      runAnalysis()
    }
  }, [ingredients])

  const runAnalysis = async () => {
    if (!ingredients || ingredients.length === 0) return
    
    setLoading(true)
    setError(null)
    setResults(null)
    
    try {
      const response = await fetch('/api/debug/match-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients })
      })
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setResults(data.results)
      } else {
        setError(data.error || 'Unknown error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze')
    } finally {
      setLoading(false)
    }
  }

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedRows(newExpanded)
  }

  // Color coding for sources
  const sourceColors: Record<string, string> = {
    'mexican-db': 'bg-emerald-500 text-white',
    'usda': 'bg-blue-500 text-white',
    'not-found': 'bg-gray-400 text-white'
  }

  const discardedSourceColors = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b bg-muted/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bug className="h-5 w-5 text-orange-500" />
            <div>
              <h1 className="text-lg font-semibold">Debug Match Analysis</h1>
              <p className="text-xs text-muted-foreground">
                {ingredients.length} ingredients • Detailed matching breakdown
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={runAnalysis} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-1" />
              )}
              Refresh
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4 mr-1" />
                Close
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading && !results && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-emerald-500" />
              <p className="text-muted-foreground">Analyzing {ingredients.length} ingredients...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-destructive">
              <X className="h-12 w-12 mx-auto mb-4" />
              <p className="text-lg font-medium">{error}</p>
              <Button onClick={runAnalysis} variant="outline" className="mt-4">
                Retry
              </Button>
            </div>
          </div>
        )}

        {results && (
          <ScrollArea className="h-full">
            <div className="p-4">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="bg-emerald-100 dark:bg-emerald-900/50 p-3 rounded-lg text-center border border-emerald-200 dark:border-emerald-800">
                  <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                    {results.filter(r => r.finalSelection.source === 'mexican-db').length}
                  </div>
                  <div className="text-sm text-emerald-600 dark:text-emerald-400">Mexican DB</div>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-lg text-center border border-blue-200 dark:border-blue-800">
                  <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                    {results.filter(r => r.finalSelection.source === 'usda').length}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">USDA</div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800/50 p-3 rounded-lg text-center border border-gray-200 dark:border-gray-700">
                  <div className="text-3xl font-bold text-gray-700 dark:text-gray-300">
                    {results.filter(r => r.finalSelection.source === 'not-found').length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Not Found</div>
                </div>
                <div className="bg-purple-100 dark:bg-purple-900/50 p-3 rounded-lg text-center border border-purple-200 dark:border-purple-800">
                  <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                    {results.reduce((sum, r) => sum + r.phytoHub.compounds.length, 0)}
                  </div>
                  <div className="text-sm text-purple-600 dark:text-purple-400">Bioactives</div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mb-4 text-sm bg-muted/30 p-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-emerald-500 rounded"></div>
                  <span>Mexican DB match</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span>USDA match</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-400 rounded"></div>
                  <span>Not found</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-200 border border-red-300 rounded"></div>
                  <span>Discarded (below threshold)</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>Score threshold: 350</span>
                </div>
              </div>

              {/* Results Table */}
              <div className="border rounded-lg overflow-hidden bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0 z-10">
                      <tr>
                        <th className="p-3 text-left font-semibold w-[180px] border-b">Original Ingredient</th>
                        <th className="p-3 text-left font-semibold w-[250px] border-b">Selected Match</th>
                        <th className="p-3 text-left font-semibold w-[300px] border-b">Mexican DB Discarded</th>
                        <th className="p-3 text-left font-semibold w-[200px] border-b">PhytoHub Foods</th>
                        <th className="p-3 text-left font-semibold w-[250px] border-b">Bioactives</th>
                        {/* Nutrient columns */}
                        <th className="p-2 text-center font-semibold w-[60px] border-b">Energía</th>
                        <th className="p-2 text-center font-semibold w-[60px] border-b">Proteína</th>
                        <th className="p-2 text-center font-semibold w-[60px] border-b">Carbs</th>
                        <th className="p-2 text-center font-semibold w-[60px] border-b">Grasa</th>
                        <th className="p-2 text-center font-semibold w-[60px] border-b">Fibra</th>
                        <th className="p-2 text-center font-semibold w-[60px] border-b">Calcio</th>
                        <th className="p-2 text-center font-semibold w-[60px] border-b">Hierro</th>
                        <th className="p-2 text-center font-semibold w-[60px] border-b">Vit C</th>
                        <th className="p-2 text-center font-semibold w-[60px] border-b">Vit A</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((result, index) => {
                        const isExpanded = expandedRows.has(index)
                        
                        return (
                          <>
                            <tr 
                              key={index}
                              className={cn(
                                "border-b cursor-pointer hover:bg-muted/50 transition-colors",
                                result.finalSelection.source === 'not-found' && "bg-red-50/50 dark:bg-red-950/20"
                              )}
                              onClick={() => toggleRow(index)}
                            >
                              {/* Column 1: Original Ingredient */}
                              <td className="p-3 align-top">
                                <div className="font-medium">{result.originalIngredient}</div>
                                {result.measure && (
                                  <div className="text-muted-foreground text-xs">{result.measure}</div>
                                )}
                                {result.isSpiceBlend && (
                                  <Badge variant="outline" className="text-[10px] mt-1">Spice Blend</Badge>
                                )}
                                <div className="mt-2">
                                  <Badge className={cn("text-[10px]", sourceColors[result.finalSelection.source || 'not-found'])}>
                                    {result.finalSelection.source || 'N/A'}
                                  </Badge>
                                </div>
                              </td>

                              {/* Column 2: Selected Match */}
                              <td className="p-3 align-top">
                                {result.finalSelection.match ? (
                                  <div>
                                    <div className="font-medium">
                                      {result.finalSelection.source === 'mexican-db' 
                                        ? result.finalSelection.match.nombreEspanol 
                                        : result.finalSelection.match.description}
                                    </div>
                                    {result.finalSelection.source === 'mexican-db' && result.finalSelection.match.nombreIngles && (
                                      <div className="text-xs text-muted-foreground">
                                        {result.finalSelection.match.nombreIngles}
                                      </div>
                                    )}
                                    {result.finalSelection.match.score && (
                                      <div className="text-xs text-muted-foreground mt-1 font-mono">
                                        Score: {result.finalSelection.match.score}
                                      </div>
                                    )}
                                    {result.finalSelection.match.reasons && (
                                      <div className="text-[10px] text-muted-foreground mt-1">
                                        {result.finalSelection.match.reasons.slice(0, 2).join(', ')}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground italic">No match</span>
                                )}
                              </td>

                              {/* Column 3: Mexican DB Discarded */}
                              <td className="p-3 align-top">
                                {result.mexicanDB.excluded ? (
                                  <Badge variant="outline" className={discardedSourceColors}>
                                    Excluded: {result.mexicanDB.reason}
                                  </Badge>
                                ) : result.mexicanDB.discarded.length > 0 ? (
                                  <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {result.mexicanDB.discarded.map((d, i) => (
                                      <div key={i} className="p-1.5 bg-red-50 dark:bg-red-950/50 rounded text-xs border border-red-100 dark:border-red-900">
                                        <div className="font-medium truncate">{d.nombreEspanol}</div>
                                        {d.nombreIngles && (
                                          <div className="text-[10px] text-muted-foreground truncate">{d.nombreIngles}</div>
                                        )}
                                        <div className="text-[10px] text-red-600 dark:text-red-400 font-mono mt-0.5">
                                          Score: {d.score}
                                        </div>
                                      </div>
                                    ))}
                                    {result.mexicanDB.allMatchesCount > result.mexicanDB.discarded.length + (result.mexicanDB.selected ? 1 : 0) && (
                                      <div className="text-[10px] text-muted-foreground italic">
                                        +{result.mexicanDB.allMatchesCount - result.mexicanDB.discarded.length - (result.mexicanDB.selected ? 1 : 0)} more matches
                                      </div>
                                    )}
                                  </div>
                                ) : result.mexicanDB.allMatchesCount === 0 ? (
                                  <span className="text-muted-foreground italic text-xs">No DB matches found</span>
                                ) : (
                                  <span className="text-muted-foreground italic text-xs">All matches above threshold</span>
                                )}
                              </td>

                              {/* Column 4: PhytoHub Foods */}
                              <td className="p-3 align-top">
                                {result.phytoHub.excluded ? (
                                  <Badge variant="outline" className={discardedSourceColors}>
                                    Excluded: {result.phytoHub.reason}
                                  </Badge>
                                ) : result.phytoHub.foods.length > 0 ? (
                                  <div className="space-y-1">
                                    {result.phytoHub.foods.slice(0, 4).map((f, i) => (
                                      <div key={i} className="text-xs flex items-center gap-1">
                                        <span className="font-medium">{f.name}</span>
                                        <span className="text-muted-foreground">({f.compoundCount})</span>
                                      </div>
                                    ))}
                                    {result.phytoHub.foods.length > 4 && (
                                      <div className="text-[10px] text-muted-foreground">
                                        +{result.phytoHub.foods.length - 4} more foods
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground italic text-xs">None</span>
                                )}
                              </td>

                              {/* Column 5: Bioactives */}
                              <td className="p-3 align-top">
                                {result.phytoHub.excluded ? (
                                  <span className="text-muted-foreground italic text-xs">Excluded</span>
                                ) : result.phytoHub.compounds.length > 0 ? (
                                  <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {result.phytoHub.compounds.slice(0, 6).map((c, i) => (
                                      <div key={i} className="text-xs">
                                        <span className="font-medium">{c.name}</span>
                                        {c.chemicalClass && (
                                          <Badge variant="outline" className="ml-1 text-[9px]">{c.chemicalClass}</Badge>
                                        )}
                                      </div>
                                    ))}
                                    {result.phytoHub.compounds.length > 6 && (
                                      <div className="text-[10px] text-muted-foreground">
                                        +{result.phytoHub.compounds.length - 6} more compounds
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground italic text-xs">None</span>
                                )}
                              </td>

                              {/* Nutrient columns */}
                              {result.finalSelection.nutrients ? (
                                <>
                                  <td className={cn(
                                    "p-2 text-center font-mono text-xs",
                                    result.finalSelection.source === 'mexican-db' && "bg-emerald-50 dark:bg-emerald-950/30",
                                    result.finalSelection.source === 'usda' && "bg-blue-50 dark:bg-blue-950/30"
                                  )}>
                                    {result.finalSelection.nutrients['Energy']?.value?.toFixed(0) || '-'}
                                  </td>
                                  <td className={cn(
                                    "p-2 text-center font-mono text-xs",
                                    result.finalSelection.source === 'mexican-db' && "bg-emerald-50 dark:bg-emerald-950/30",
                                    result.finalSelection.source === 'usda' && "bg-blue-50 dark:bg-blue-950/30"
                                  )}>
                                    {result.finalSelection.nutrients['Protein']?.value?.toFixed(1) || '-'}
                                  </td>
                                  <td className={cn(
                                    "p-2 text-center font-mono text-xs",
                                    result.finalSelection.source === 'mexican-db' && "bg-emerald-50 dark:bg-emerald-950/30",
                                    result.finalSelection.source === 'usda' && "bg-blue-50 dark:bg-blue-950/30"
                                  )}>
                                    {result.finalSelection.nutrients['Carbs']?.value?.toFixed(1) || '-'}
                                  </td>
                                  <td className={cn(
                                    "p-2 text-center font-mono text-xs",
                                    result.finalSelection.source === 'mexican-db' && "bg-emerald-50 dark:bg-emerald-950/30",
                                    result.finalSelection.source === 'usda' && "bg-blue-50 dark:bg-blue-950/30"
                                  )}>
                                    {result.finalSelection.nutrients['Fat']?.value?.toFixed(1) || '-'}
                                  </td>
                                  <td className={cn(
                                    "p-2 text-center font-mono text-xs",
                                    result.finalSelection.source === 'mexican-db' && "bg-emerald-50 dark:bg-emerald-950/30",
                                    result.finalSelection.source === 'usda' && "bg-blue-50 dark:bg-blue-950/30"
                                  )}>
                                    {result.finalSelection.nutrients['Fiber']?.value?.toFixed(1) || '-'}
                                  </td>
                                  <td className={cn(
                                    "p-2 text-center font-mono text-xs",
                                    result.finalSelection.source === 'mexican-db' && "bg-emerald-50 dark:bg-emerald-950/30",
                                    result.finalSelection.source === 'usda' && "bg-blue-50 dark:bg-blue-950/30"
                                  )}>
                                    {result.finalSelection.nutrients['Calcium']?.value?.toFixed(0) || '-'}
                                  </td>
                                  <td className={cn(
                                    "p-2 text-center font-mono text-xs",
                                    result.finalSelection.source === 'mexican-db' && "bg-emerald-50 dark:bg-emerald-950/30",
                                    result.finalSelection.source === 'usda' && "bg-blue-50 dark:bg-blue-950/30"
                                  )}>
                                    {result.finalSelection.nutrients['Iron']?.value?.toFixed(1) || '-'}
                                  </td>
                                  <td className={cn(
                                    "p-2 text-center font-mono text-xs",
                                    result.finalSelection.source === 'mexican-db' && "bg-emerald-50 dark:bg-emerald-950/30",
                                    result.finalSelection.source === 'usda' && "bg-blue-50 dark:bg-blue-950/30"
                                  )}>
                                    {result.finalSelection.nutrients['Vit C']?.value?.toFixed(0) || '-'}
                                  </td>
                                  <td className={cn(
                                    "p-2 text-center font-mono text-xs",
                                    result.finalSelection.source === 'mexican-db' && "bg-emerald-50 dark:bg-emerald-950/30",
                                    result.finalSelection.source === 'usda' && "bg-blue-50 dark:bg-blue-950/30"
                                  )}>
                                    {result.finalSelection.nutrients['Vit A']?.value?.toFixed(0) || '-'}
                                  </td>
                                </>
                              ) : (
                                <td colSpan={9} className="p-2 text-center text-muted-foreground italic text-xs">
                                  No data
                                </td>
                              )}
                            </tr>
                            
                            {/* Expanded details row */}
                            {isExpanded && (
                              <tr key={`${index}-details`} className="bg-muted/30">
                                <td colSpan={14} className="p-4">
                                  <div className="space-y-3">
                                    {/* Search Words */}
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <span className="font-medium text-xs">Search Words: </span>
                                        <code className="text-xs bg-muted px-1 rounded">{result.mexicanDB.searchWords.join(', ') || 'None'}</code>
                                      </div>
                                      <div>
                                        <span className="font-medium text-xs">Translations: </span>
                                        <code className="text-xs bg-muted px-1 rounded">{result.mexicanDB.translatedWords.join(', ') || 'None'}</code>
                                      </div>
                                    </div>
                                    
                                    {/* Full Scoring Details */}
                                    {result.finalSelection.match?.reasons && (
                                      <div>
                                        <span className="font-medium text-xs">Scoring Reasons: </span>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                          {result.finalSelection.match.reasons.map((reason: string, i: number) => (
                                            <Badge key={i} variant="secondary" className="text-[10px]">{reason}</Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* USDA fallback */}
                                    {result.usda.matches.length > 0 && (
                                      <div>
                                        <span className="font-medium text-xs">USDA Fallback Options: </span>
                                        <div className="mt-1 space-y-1">
                                          {result.usda.matches.map((m, i) => (
                                            <div key={i} className="text-xs flex items-center gap-2">
                                              <Badge variant="outline" className="text-[10px]">{m.dataType}</Badge>
                                              <span>{m.description}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* All PhytoHub Compounds */}
                                    {result.phytoHub.compounds.length > 6 && (
                                      <div>
                                        <span className="font-medium text-xs">All Bioactives ({result.phytoHub.compounds.length}): </span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {result.phytoHub.compounds.map((c, i) => (
                                            <Badge key={i} variant="outline" className="text-[10px]">
                                              {c.name}
                                              {c.chemicalClass && <span className="ml-1 opacity-60">({c.chemicalClass})</span>}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Discarded details */}
                                    {result.mexicanDB.discarded.length > 0 && (
                                      <div>
                                        <span className="font-medium text-xs">Discarded Match Details: </span>
                                        <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
                                          {result.mexicanDB.discarded.map((d, i) => (
                                            <div key={i} className="text-xs p-1.5 bg-red-50 dark:bg-red-950/30 rounded">
                                              <div className="font-medium">{d.nombreEspanol} {d.nombreIngles && `(${d.nombreIngles})`}</div>
                                              <div className="text-muted-foreground mt-0.5">
                                                Score: {d.score} • {d.reasons?.join('; ')}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
