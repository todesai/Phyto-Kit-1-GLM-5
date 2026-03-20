import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { 
  getUSDANutritionForIngredient, 
  calculateUSDANutritionWithMinMax,
  USDA_NUTRIENT_IDS 
} from '@/lib/usda-api'
import {
  processSearchWords,
  scoreMexicanMatch,
  scoreUSDAMatch,
  buildMultiWordWhere,
  getCategoryPriority,
  INGREDIENT_TRANSLATIONS,
  getSpiceBlendComponents,
} from '@/lib/search-utils'

// Macronutrient fields - use MAX value (conservative for diet tracking)
const MACRO_FIELDS = [
  'energia',        // Calories
  'proteinaBruta',  // Protein
  'hidratosCarbono', // Carbs
  'extractoEtereo', // Fat
  'azucares',       // Sugars
  'colesterol',     // Cholesterol
  'fibraDietariaTotal', // Fiber
] as const

// Micronutrient fields - use MIN value (conservative health claims)
const MICRO_FIELDS = [
  // Minerals
  'acidoAscorbico', // Vitamin C
  'calcio',         // Calcium
  'hierro',         // Iron
  'potasio',        // Potassium
  'magnesio',       // Magnesium
  'zinc',           // Zinc
  'fosforo',        // Phosphorus
  'sodio',          // Sodium
  'selenio',        // Selenium
  'cobre',          // Copper
  'manganeso',      // Manganese
  // Vitamins
  'vitaminaA',      // Vitamin A
  'tiamina',        // Vitamin B1
  'riboflavina',    // Vitamin B2
  'niacina',        // Vitamin B3
  'betaCarotenos',  // Beta carotenes
  'carotenos',      // Carotenes
] as const

// Amino Acid fields - use MIN value
const AMINO_ACID_FIELDS = [
  'alanina',
  'arginina',
  'acidoAspartico',
  'cisteina',
  'acidoGlutamico',
  'glicina',
  'histidina',
  'isoleucina',
  'leucina',
  'lisina',
  'metionina',
  'fenilalanina',
  'prolina',
  'serina',
  'treonina',
  'triptofano',
  'tirosina',
  'valina',
] as const

// Fatty Acid fields - use MIN value
const FATTY_ACID_FIELDS = [
  'acidosGrasosSaturados',
  'acidoMiristico',
  'acidoPalmitico',
  'acidoEsteaico',
  'acidoOleico',
  'acidoLinoleico',
  'acidoLinolenico',
  'acidoLaurico',
  'acidoAraquidico',
  'acidoBehenico',
  'acidoButirico',
  'acidoCaprico',
  'acidoCaprilico',
  'acidoCaproico',
  'acidoElaidico',
  'acidoPalmitoleico',
  'acidoHeneicosanoico',
  'acidoHeptadecanoico',
  'acidoLignocerico',
  'acidoPentadecanoico',
  'acidoTricosanoico',
  'acidoUndecanoico',
  'acidoYLinolenico',
  'acidoCis10Heptadecanoico',
  'acidoCis11Eicosenoico',
] as const

// Other fields - use MIN value
const OTHER_FIELDS = [
  'humedad',        // Moisture
  'cenizas',        // Ash
  'almidon',        // Starch
  'lactosa',        // Lactose
  'porcionComestible', // Edible portion
] as const

// All nutrient fields we track
const ALL_NUTRIENT_FIELDS = [
  ...MACRO_FIELDS, 
  ...MICRO_FIELDS, 
  ...AMINO_ACID_FIELDS,
  ...FATTY_ACID_FIELDS,
  ...OTHER_FIELDS
]

// Data source types
type DataSource = 'mexican-db' | 'usda' | 'estimated' | 'not-found'

type MatchType = 'exact' | 'word-boundary' | 'starts-with' | 'partial' | 'contains'

interface IngredientNutritionResult {
  ingredient: string
  measure?: string
  source: DataSource
  confidence: number
  bestMatch?: string | null
  nutrition: Record<string, number | null> | null
  expandedFrom?: string // If this ingredient was expanded from a spice blend

  // Transparency information
  matchDetails?: {
    matchedRow: {
      conabioId: number
      nameEs: string
      nameEn?: string | null
      nutrientScore: number
    }
    matchType: MatchType
    matchScore: number
    matchReasons: string[]
    isPoorMatch: boolean // True if confidence < 50% or matchType is 'partial'/'contains'
    dataCompleteness: {
      macroPercent: number // Percentage of macro fields filled
      microPercent: number // Percentage of micro fields filled
      overallPercent: number
    }
    // Full nutrient table for transparency
    nutrientTable?: {
      macronutrients: Record<string, { value: number | null; unit: string; label: string; filled: boolean }>
      micronutrients: Record<string, { value: number | null; unit: string; label: string; filled: boolean }>
    }
    alternatives: Array<{
      conabioId: number
      nameEs: string
      nutrientScore: number
      matchScore: number
    }>
  }
}

// Search in Mexican database with comprehensive matching
async function findMexicanMatches(ingredientName: string) {
  // Process search words with translation support
  const { searchWords, translatedWords, baseIngredients } = processSearchWords(ingredientName)
  
  if (searchWords.length === 0 && baseIngredients.length === 0) return []
  
  // Use base ingredients if available (from cut/variety mapping)
  const wordsToSearch = baseIngredients.length > 0 ? baseIngredients : translatedWords
  
  // Build simple OR query - search for any match first, then score
  const whereClause = {
    OR: wordsToSearch.flatMap(word => [
      { nombreEspanol: { contains: word } },
      { nombreIngles: { contains: word } },
      { descripcionAlimento: { contains: word } },
    ])
  }
  
  // Get all potential matches
  const matches = await db.mexicanFood.findMany({
    where: whereClause,
    take: 100,
  })
  
  if (matches.length === 0) return []
  
  // Score and sort matches using scoring function
  const scoredMatches = matches
    .map(food => {
      const { score, reasons, matchType } = scoreMexicanMatch(food, searchWords, wordsToSearch)
      return { ...food, _matchScore: score, _matchReasons: reasons, _matchType: matchType }
    })
    .sort((a, b) => b._matchScore - a._matchScore)
    .slice(0, 5)
  
  // Only return matches with a minimum score
  return scoredMatches.filter(m => m._matchScore >= 200)
}

// Calculate nutrition from Mexican DB matches with MIN/MAX logic
function calculateMexicanNutrition(matches: any[]): Record<string, number | null> | null {
  if (matches.length === 0) return null
  
  const result: Record<string, number | null> = {}
  
  if (matches.length === 1) {
    const food = matches[0]
    for (const field of ALL_NUTRIENT_FIELDS) {
      result[field] = food[field]
    }
    return result
  }
  
  // Multiple matches - apply MIN/MAX logic
  for (const field of ALL_NUTRIENT_FIELDS) {
    const values = matches
      .map(m => m[field])
      .filter(v => v !== null && v !== undefined && !isNaN(v))
    
    if (values.length === 0) {
      result[field] = null
    } else if (MACRO_FIELDS.includes(field as any)) {
      result[field] = Math.max(...values)
    } else {
      result[field] = Math.min(...values)
    }
  }
  
  return result
}

// Get nutrition for a single ingredient with cascade fallback
async function getIngredientNutrition(
  ingredientName: string,
  measure?: string
): Promise<IngredientNutritionResult[]> {
  const results: IngredientNutritionResult[] = []
  
  // Check if this is a spice blend that should be expanded
  const spiceComponents = getSpiceBlendComponents(ingredientName)
  if (spiceComponents && spiceComponents.length > 0) {
    // Expand spice blend into individual components
    for (const component of spiceComponents) {
      const componentResult = await getSingleIngredientNutrition(component, undefined, ingredientName)
      results.push(componentResult)
    }
    return results
  }
  
  // Normal single ingredient processing
  const result = await getSingleIngredientNutrition(ingredientName, measure)
  results.push(result)
  return results
}

// Get nutrition for a single ingredient (not expanded)
async function getSingleIngredientNutrition(
  ingredientName: string,
  measure?: string,
  expandedFrom?: string
): Promise<IngredientNutritionResult> {
  
  // STEP 1: Try Mexican Database (primary)
  const mexicanMatches = await findMexicanMatches(ingredientName)
  
  if (mexicanMatches.length > 0) {
    const bestMatch = mexicanMatches[0]
    const nutrition = calculateMexicanNutrition(mexicanMatches)
    
    // Calculate data completeness
    const macroCount = MACRO_FIELDS.filter(f => bestMatch[f] !== null && bestMatch[f] !== undefined).length
    const microCount = MICRO_FIELDS.filter(f => bestMatch[f] !== null && bestMatch[f] !== undefined).length
    const overallCount = ALL_NUTRIENT_FIELDS.filter(f => bestMatch[f] !== null && bestMatch[f] !== undefined).length
    
    const macroPercent = Math.round((macroCount / MACRO_FIELDS.length) * 100)
    const microPercent = Math.round((microCount / MICRO_FIELDS.length) * 100)
    const overallPercent = Math.round((overallCount / ALL_NUTRIENT_FIELDS.length) * 100)
    
    const matchType = bestMatch._matchType || 'contains'
    const isPoorMatch = matchType === 'partial' || matchType === 'contains' || macroPercent < 50
    
    const confidence = Math.min(100, Math.round((bestMatch.nutrientScore / 81) * 100))
    
    return {
      ingredient: ingredientName,
      measure,
      source: 'mexican-db',
      confidence,
      bestMatch: bestMatch.nombreEspanol || bestMatch.nombreIngles,
      nutrition,
      expandedFrom,
      matchDetails: {
        matchedRow: {
          conabioId: bestMatch.conabioId,
          nameEs: bestMatch.nombreEspanol,
          nameEn: bestMatch.nombreIngles,
          nutrientScore: bestMatch.nutrientScore || 0,
        },
        matchType,
        matchScore: bestMatch._matchScore,
        matchReasons: bestMatch._matchReasons,
        isPoorMatch,
        dataCompleteness: {
          macroPercent,
          microPercent,
          overallPercent,
        },
        // Full nutrient table for transparency
        nutrientTable: {
          // Macronutrients (per 100g)
          macronutrients: {
            energia: { value: bestMatch.energia, unit: 'kcal', label: 'Energy', filled: bestMatch.energia !== null },
            proteinaBruta: { value: bestMatch.proteinaBruta, unit: 'g', label: 'Protein', filled: bestMatch.proteinaBruta !== null },
            hidratosCarbono: { value: bestMatch.hidratosCarbono, unit: 'g', label: 'Carbohydrates', filled: bestMatch.hidratosCarbono !== null },
            extractoEtereo: { value: bestMatch.extractoEtereo, unit: 'g', label: 'Fat', filled: bestMatch.extractoEtereo !== null },
            fibraDietariaTotal: { value: bestMatch.fibraDietariaTotal, unit: 'g', label: 'Fiber', filled: bestMatch.fibraDietariaTotal !== null },
            azucares: { value: bestMatch.azucares, unit: 'g', label: 'Sugars', filled: bestMatch.azucares !== null },
            colesterol: { value: bestMatch.colesterol, unit: 'mg', label: 'Cholesterol', filled: bestMatch.colesterol !== null },
          },
          // Key micronutrients (per 100g)
          micronutrients: {
            calcio: { value: bestMatch.calcio, unit: 'mg', label: 'Calcium', filled: bestMatch.calcio !== null },
            hierro: { value: bestMatch.hierro, unit: 'mg', label: 'Iron', filled: bestMatch.hierro !== null },
            potasio: { value: bestMatch.potasio, unit: 'mg', label: 'Potassium', filled: bestMatch.potasio !== null },
            magnesio: { value: bestMatch.magnesio, unit: 'mg', label: 'Magnesium', filled: bestMatch.magnesio !== null },
            zinc: { value: bestMatch.zinc, unit: 'mg', label: 'Zinc', filled: bestMatch.zinc !== null },
            vitaminaA: { value: bestMatch.vitaminaA, unit: 'IU', label: 'Vitamin A', filled: bestMatch.vitaminaA !== null },
            acidoAscorbico: { value: bestMatch.acidoAscorbico, unit: 'mg', label: 'Vitamin C', filled: bestMatch.acidoAscorbico !== null },
            tiamina: { value: bestMatch.tiamina, unit: 'mg', label: 'Vitamin B1', filled: bestMatch.tiamina !== null },
            riboflavina: { value: bestMatch.riboflavina, unit: 'mg', label: 'Vitamin B2', filled: bestMatch.riboflavina !== null },
            niacina: { value: bestMatch.niacina, unit: 'mg', label: 'Vitamin B3', filled: bestMatch.niacina !== null },
          },
        },
        alternatives: mexicanMatches.slice(1, 4).map(m => ({
          conabioId: m.conabioId,
          nameEs: m.nombreEspanol,
          nutrientScore: m.nutrientScore || 0,
          matchScore: m._matchScore,
        })),
      },
    }
  }
  
  // STEP 2: Try USDA FoodData Central (fallback)
  const usdaResults = await getUSDANutritionForIngredient(ingredientName)
  
  if (usdaResults.length > 0) {
    const nutrition = calculateUSDANutritionWithMinMax(usdaResults)
    const confidence = Math.round(
      (Object.values(nutrition).filter(v => v !== null).length / ALL_NUTRIENT_FIELDS.length) * 100
    )
    
    return {
      ingredient: ingredientName,
      measure,
      source: 'usda',
      confidence,
      bestMatch: usdaResults[0].description,
      nutrition,
      expandedFrom,
    }
  }
  
  // STEP 3: Return not found
  return {
    ingredient: ingredientName,
    measure,
    source: 'not-found',
    confidence: 0,
    bestMatch: null,
    nutrition: null,
    expandedFrom,
  }
}

// Sum nutrition values for recipe total
function sumNutrition(
  results: IngredientNutritionResult[]
): Record<string, number> {
  const total: Record<string, number> = {}
  
  for (const field of ALL_NUTRIENT_FIELDS) {
    total[field] = 0
  }
  
  for (const result of results) {
    if (result.nutrition) {
      for (const field of ALL_NUTRIENT_FIELDS) {
        const value = result.nutrition[field]
        if (value !== null && !isNaN(value)) {
          total[field] = (total[field] || 0) + value
        }
      }
    }
  }
  
  return total
}

// Format nutrition response
function formatNutritionResponse(totals: Record<string, number>) {
  return {
    // Macros
    calories: Math.round(totals.energia || 0),
    protein: Math.round((totals.proteinaBruta || 0) * 10) / 10,
    carbs: Math.round((totals.hidratosCarbono || 0) * 10) / 10,
    fat: Math.round((totals.extractoEtereo || 0) * 10) / 10,
    fiber: Math.round((totals.fibraDietariaTotal || 0) * 10) / 10,
    sugar: Math.round((totals.azucares || 0) * 10) / 10,
    cholesterol: Math.round(totals.colesterol || 0),
    
    // Minerals
    calcium: Math.round(totals.calcio || 0),
    iron: Math.round((totals.hierro || 0) * 10) / 10,
    sodium: Math.round(totals.sodio || 0),
    potassium: Math.round(totals.potasio || 0),
    magnesium: Math.round(totals.magnesio || 0),
    zinc: Math.round((totals.zinc || 0) * 100) / 100,
    phosphorus: Math.round(totals.fosforo || 0),
    copper: Math.round((totals.cobre || 0) * 100) / 100,
    manganese: Math.round((totals.manganeso || 0) * 100) / 100,
    selenium: Math.round((totals.selenio || 0) * 100) / 100,
    
    // Vitamins
    vitaminA: Math.round(totals.vitaminaA || 0),
    vitaminC: Math.round(totals.acidoAscorbico || 0),
    vitaminB1: Math.round((totals.tiamina || 0) * 100) / 100,
    vitaminB2: Math.round((totals.riboflavina || 0) * 100) / 100,
    vitaminB3: Math.round((totals.niacina || 0) * 10) / 10,
    betaCarotenos: Math.round((totals.betaCarotenos || 0) * 100) / 100,
    carotenos: Math.round((totals.carotenos || 0) * 100) / 100,
    
    // Amino Acids
    alanina: Math.round((totals.alanina || 0) * 100) / 100,
    arginina: Math.round((totals.arginina || 0) * 100) / 100,
    acidoAspartico: Math.round((totals.acidoAspartico || 0) * 100) / 100,
    cisteina: Math.round((totals.cisteina || 0) * 100) / 100,
    acidoGlutamico: Math.round((totals.acidoGlutamico || 0) * 100) / 100,
    glicina: Math.round((totals.glicina || 0) * 100) / 100,
    histidina: Math.round((totals.histidina || 0) * 100) / 100,
    isoleucina: Math.round((totals.isoleucina || 0) * 100) / 100,
    leucina: Math.round((totals.leucina || 0) * 100) / 100,
    lisina: Math.round((totals.lisina || 0) * 100) / 100,
    metionina: Math.round((totals.metionina || 0) * 100) / 100,
    fenilalanina: Math.round((totals.fenilalanina || 0) * 100) / 100,
    prolina: Math.round((totals.prolina || 0) * 100) / 100,
    serina: Math.round((totals.serina || 0) * 100) / 100,
    treonina: Math.round((totals.treonina || 0) * 100) / 100,
    triptofano: Math.round((totals.triptofano || 0) * 100) / 100,
    tirosina: Math.round((totals.tirosina || 0) * 100) / 100,
    valina: Math.round((totals.valina || 0) * 100) / 100,
    
    // Fatty Acids
    acidosGrasosSaturados: Math.round((totals.acidosGrasosSaturados || 0) * 100) / 100,
    acidoMiristico: Math.round((totals.acidoMiristico || 0) * 100) / 100,
    acidoPalmitico: Math.round((totals.acidoPalmitico || 0) * 100) / 100,
    acidoEsteaico: Math.round((totals.acidoEsteaico || 0) * 100) / 100,
    acidoOleico: Math.round((totals.acidoOleico || 0) * 100) / 100,
    acidoLinoleico: Math.round((totals.acidoLinoleico || 0) * 100) / 100,
    acidoLinolenico: Math.round((totals.acidoLinolenico || 0) * 100) / 100,
    acidoLaurico: Math.round((totals.acidoLaurico || 0) * 100) / 100,
    acidoAraquidico: Math.round((totals.acidoAraquidico || 0) * 100) / 100,
    acidoBehenico: Math.round((totals.acidoBehenico || 0) * 100) / 100,
    acidoCaprico: Math.round((totals.acidoCaprico || 0) * 100) / 100,
    acidoCaprilico: Math.round((totals.acidoCaprilico || 0) * 100) / 100,
    acidoCaproico: Math.round((totals.acidoCaproico || 0) * 100) / 100,
    acidoElaidico: Math.round((totals.acidoElaidico || 0) * 100) / 100,
    acidoPalmitoleico: Math.round((totals.acidoPalmitoleico || 0) * 100) / 100,
    
    // Other
    humedad: Math.round((totals.humedad || 0) * 10) / 10,
    cenizas: Math.round((totals.cenizas || 0) * 100) / 100,
    almidon: Math.round((totals.almidon || 0) * 100) / 100,
    lactosa: Math.round((totals.lactosa || 0) * 100) / 100,
    porcionComestible: Math.round((totals.porcionComestible || 0) * 10) / 10,
  }
}

// POST: Calculate nutrition for a list of ingredients
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ingredients } = body as { 
      ingredients: Array<{ name: string; measure?: string }> 
    }
    
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: 'Ingredients array is required' }, { status: 400 })
    }
    
    // Process each ingredient through the cascade
    // Note: Each ingredient may expand into multiple (e.g., spice blends)
    const allResults: IngredientNutritionResult[] = []
    
    for (const ingredient of ingredients) {
      const results = await getIngredientNutrition(ingredient.name, ingredient.measure)
      allResults.push(...results)
    }
    
    // Calculate totals
    const totals = sumNutrition(allResults)
    
    // Count by source (excluding expanded ingredients for stats)
    const originalResults = allResults.filter(r => !r.expandedFrom)
    const expandedResults = allResults.filter(r => r.expandedFrom)
    
    const sourceStats = {
      mexicanDb: originalResults.filter(r => r.source === 'mexican-db').length,
      usda: originalResults.filter(r => r.source === 'usda').length,
      notFound: originalResults.filter(r => r.source === 'not-found').length,
      expanded: expandedResults.length,
    }
    
    // Format response
    return NextResponse.json({
      success: true,
      
      // Detailed ingredient results (including expanded ingredients)
      ingredients: allResults.map(r => ({
        name: r.ingredient,
        measure: r.measure,
        source: r.source,
        confidence: r.confidence,
        match: r.bestMatch,
        expandedFrom: r.expandedFrom,
        // Include match details for transparency
        matchDetails: r.matchDetails,
      })),
      
      // Recipe totals
      totalNutrition: formatNutritionResponse(totals),
      
      // Full nutrient summary table with gaps highlighted
      nutrientSummary: {
        macronutrients: {
          energy: { 
            value: Math.round(totals.energia || 0), 
            unit: 'kcal', 
            filled: totals.energia !== null && totals.energia > 0,
            gap: totals.energia === null || totals.energia === 0
          },
          protein: { 
            value: Math.round((totals.proteinaBruta || 0) * 10) / 10, 
            unit: 'g', 
            filled: totals.proteinaBruta !== null && totals.proteinaBruta > 0,
            gap: totals.proteinaBruta === null || totals.proteinaBruta === 0
          },
          carbs: { 
            value: Math.round((totals.hidratosCarbono || 0) * 10) / 10, 
            unit: 'g', 
            filled: totals.hidratosCarbono !== null && totals.hidratosCarbono > 0,
            gap: totals.hidratosCarbono === null || totals.hidratosCarbono === 0
          },
          fat: { 
            value: Math.round((totals.extractoEtereo || 0) * 10) / 10, 
            unit: 'g', 
            filled: totals.extractoEtereo !== null && totals.extractoEtereo > 0,
            gap: totals.extractoEtereo === null || totals.extractoEtereo === 0
          },
          fiber: { 
            value: Math.round((totals.fibraDietariaTotal || 0) * 10) / 10, 
            unit: 'g', 
            filled: totals.fibraDietariaTotal !== null,
            gap: totals.fibraDietariaTotal === null
          },
          sugar: { 
            value: Math.round((totals.azucares || 0) * 10) / 10, 
            unit: 'g', 
            filled: totals.azucares !== null,
            gap: totals.azucares === null
          },
        },
        micronutrients: {
          calcium: { value: Math.round(totals.calcio || 0), unit: 'mg', filled: totals.calcio !== null, gap: totals.calcio === null },
          iron: { value: Math.round((totals.hierro || 0) * 10) / 10, unit: 'mg', filled: totals.hierro !== null, gap: totals.hierro === null },
          potassium: { value: Math.round(totals.potasio || 0), unit: 'mg', filled: totals.potasio !== null, gap: totals.potasio === null },
          magnesium: { value: Math.round(totals.magnesio || 0), unit: 'mg', filled: totals.magnesio !== null, gap: totals.magnesio === null },
          zinc: { value: Math.round((totals.zinc || 0) * 100) / 100, unit: 'mg', filled: totals.zinc !== null, gap: totals.zinc === null },
          vitaminA: { value: Math.round(totals.vitaminaA || 0), unit: 'IU', filled: totals.vitaminaA !== null, gap: totals.vitaminaA === null },
          vitaminC: { value: Math.round(totals.acidoAscorbico || 0), unit: 'mg', filled: totals.acidoAscorbico !== null, gap: totals.acidoAscorbico === null },
          vitaminB1: { value: Math.round((totals.tiamina || 0) * 100) / 100, unit: 'mg', filled: totals.tiamina !== null, gap: totals.tiamina === null },
          vitaminB2: { value: Math.round((totals.riboflavina || 0) * 100) / 100, unit: 'mg', filled: totals.riboflavina !== null, gap: totals.riboflavina === null },
          vitaminB3: { value: Math.round((totals.niacina || 0) * 10) / 10, unit: 'mg', filled: totals.niacina !== null, gap: totals.niacina === null },
        },
        // Count gaps for summary
        gapsSummary: {
          macroGaps: [totals.energia, totals.proteinaBruta, totals.hidratosCarbono, totals.extractoEtereo, totals.fibraDietariaTotal, totals.azucares].filter(v => v === null).length,
          microGaps: [totals.calcio, totals.hierro, totals.potasio, totals.magnesio, totals.zinc, totals.vitaminaA, totals.acidoAscorbico, totals.tiamina, totals.riboflavina, totals.niacina].filter(v => v === null).length,
        },
      },
      
      // Statistics
      stats: {
        totalIngredients: ingredients.length,
        matchedIngredients: sourceStats.mexicanDb + sourceStats.usda,
        mexicanDbMatches: sourceStats.mexicanDb,
        usdaMatches: sourceStats.usda,
        notFound: sourceStats.notFound,
        expandedIngredients: sourceStats.expanded,
        coveragePercent: Math.round(((sourceStats.mexicanDb + sourceStats.usda) / ingredients.length) * 100),
        // New: Count poor matches for user awareness
        poorMatches: originalResults.filter(r => r.matchDetails?.isPoorMatch).length,
        averageDataCompleteness: Math.round(
          originalResults
            .filter(r => r.matchDetails)
            .reduce((sum, r) => sum + (r.matchDetails?.dataCompleteness?.overallPercent || 0), 0) /
          Math.max(1, originalResults.filter(r => r.matchDetails).length)
        ),
      },
    })

  } catch (error) {
    console.error('Nutrition calculation error:', error)
    return NextResponse.json({ 
      error: 'Failed to calculate nutrition', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

// GET: Search for a single ingredient
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const source = searchParams.get('source') || 'all'
    const limit = parseInt(searchParams.get('limit') || '10')
    
    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [] })
    }
    
    const searchTerm = query.trim().toLowerCase()
    const results: any[] = []
    
    // Process the search term with our improved logic
    const { searchWords, translatedWords } = processSearchWords(searchTerm)
    
    // Search Mexican DB
    if (source === 'all' || source === 'mexican') {
      const mexicanMatches = await db.mexicanFood.findMany({
        where: {
          OR: translatedWords.flatMap(word => [
            { nombreEspanol: { contains: word } },
            { nombreIngles: { contains: word } },
            { descripcionAlimento: { contains: word } },
          ])
        },
        take: limit * 2, // Get more to allow for scoring
        orderBy: { nutrientScore: 'desc' }
      })
      
      // Score and sort
      const scoredMatches = mexicanMatches
        .map(match => {
          const { score } = scoreMexicanMatch(match, searchWords, translatedWords)
          return { ...match, _score: score }
        })
        .sort((a, b) => b._score - a._score)
        .slice(0, limit)
      
      for (const match of scoredMatches) {
        results.push({
          source: 'mexican-db',
          id: match.conabioId,
          nameEs: match.nombreEspanol,
          nameEn: match.nombreIngles,
          nutrients: formatNutritionResponse({
            energia: match.energia,
            proteinaBruta: match.proteinaBruta,
            hidratosCarbono: match.hidratosCarbono,
            extractoEtereo: match.extractoEtereo,
            fibraDietariaTotal: match.fibraDietariaTotal,
            calcio: match.calcio,
            hierro: match.hierro,
            acidoAscorbico: match.acidoAscorbico,
            vitaminaA: match.vitaminaA,
          }),
          nutrientScore: match.nutrientScore,
          matchScore: match._score,
        })
      }
    }
    
    // Search USDA
    if (source === 'all' || source === 'usda') {
      const usdaResults = await getUSDANutritionForIngredient(searchTerm)
      
      for (const result of usdaResults.slice(0, limit)) {
        const { score } = scoreUSDAMatch(result, searchWords, translatedWords)
        results.push({
          source: 'usda',
          id: result.fdcId,
          name: result.description,
          dataType: result.dataType,
          nutrients: formatNutritionResponse(result.nutrients as any),
          matchScore: score,
        })
      }
    }
    
    return NextResponse.json({ 
      query: searchTerm,
      source,
      count: results.length,
      results 
    })
    
  } catch (error) {
    console.error('Nutrition search error:', error)
    return NextResponse.json({ results: [], error: 'Search failed' })
  }
}
