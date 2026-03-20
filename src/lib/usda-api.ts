/**
 * USDA FoodData Central API Service
 * https://fdc.nal.usda.gov/api-guide.html
 * 
 * Used as fallback when ingredient not found in Mexican database
 */

import { processSearchWords, scoreUSDAMatch, INGREDIENT_TRANSLATIONS } from './search-utils'

// USDA Nutrient IDs mapped to our schema
export const USDA_NUTRIENT_IDS: Record<string, number[]> = {
  // Macronutrients
  energia: [1008],           // Energy (kcal)
  proteinaBruta: [1003],     // Protein
  hidratosCarbono: [1005],   // Carbohydrate, by difference
  extractoEtereo: [1004],    // Total lipid (fat)
  fibraDietariaTotal: [1079], // Fiber, total dietary
  azucares: [2000],          // Sugars, total including NLEA
  almidon: [1013],           // Starch
  colesterol: [1253],        // Cholesterol
  
  // Minerals
  calcio: [1087],            // Calcium, Ca
  hierro: [1089],            // Iron, Fe
  magnesio: [1090],          // Magnesium, Mg
  fosforo: [1091],           // Phosphorus, P
  potasio: [1092],           // Potassium, K
  sodio: [1093],             // Sodium, Na
  zinc: [1095],              // Zinc, Zn
  cobre: [1096],             // Copper, Cu
  manganeso: [1100],         // Manganese, Mn
  selenio: [1103],           // Selenium, Se
  
  // Vitamins
  vitaminaA: [1104, 1106],   // Vitamin A, IU / Vitamin A, RAE
  tiamina: [1165],           // Thiamin (B1)
  riboflavina: [1166],       // Riboflavin (B2)
  niacina: [1167],           // Niacin (B3)
  acidoAscorbico: [1098],    // Vitamin C, total ascorbic acid
  vitaminaB6: [1175],        // Vitamin B-6
  folato: [1177],            // Folate, total
  vitaminaB12: [1178],       // Vitamin B-12
  vitaminaD: [1114],         // Vitamin D (D2 + D3)
  vitaminaE: [1109],         // Vitamin E (alpha-tocopherol)
  vitaminaK: [1185],         // Vitamin K (phylloquinone)
  
  // Amino Acids
  alanina: [12298],          // Alanine
  arginina: [12299],         // Arginine
  acidoAspartico: [12300],   // Aspartic acid
  cisteina: [12301],         // Cystine
  acidoGlutamico: [12302],   // Glutamic acid
  glicina: [12303],          // Glycine
  histidina: [12304],        // Histidine
  isoleucina: [12305],       // Isoleucine
  leucina: [12306],          // Leucine
  lisina: [12307],           // Lysine
  metionina: [12308],        // Methionine
  fenilalanina: [12309],     // Phenylalanine
  prolina: [12310],          // Proline
  serina: [12311],           // Serine
  treonina: [12312],         // Threonine
  triptofano: [12313],       // Tryptophan
  tirosina: [12314],         // Tyrosine
  valina: [12315],           // Valine
  
  // Fatty Acids
  acidosGrasosSaturados: [1258], // Saturated fatty acids
  acidoMiristico: [12125],   // 14:0 (Myristic acid)
  acidoPalmitico: [12127],   // 16:0 (Palmitic acid)
  acidoEsteaico: [12129],    // 18:0 (Stearic acid)
  acidoOleico: [12130],      // 18:1 (Oleic acid)
  acidoLinoleico: [12133],   // 18:2 (Linoleic acid)
  acidoLinolenico: [12134],  // 18:3 (Linolenic acid)
}

// Reverse mapping: USDA nutrient ID to our field name
const USDA_ID_TO_FIELD: Record<number, string> = {}
for (const [field, ids] of Object.entries(USDA_NUTRIENT_IDS)) {
  for (const id of ids) {
    USDA_ID_TO_FIELD[id] = field
  }
}

interface USDANutrient {
  nutrientId: number
  nutrientName: string
  nutrientNumber: string
  unitName: string
  derivationCode?: string
  derivationDescription?: string
  value: number
}

interface USDAFood {
  fdcId: number
  description: string
  dataType: string
  foodNutrients: USDANutrient[]
  brandOwner?: string
  brandName?: string
  ingredients?: string
  servingSize?: number
  servingSizeUnit?: string
  foodMeasures?: Array<{
    measureUnit: string
    measureValue: number
    gramWeight: number
  }>
}

interface USDASearchResponse {
  totalHits: number
  currentPage: number
  totalPages: number
  foods: USDAFood[]
}

interface USDANutritionResult {
  fdcId: number
  description: string
  dataType: string
  nutrients: Record<string, number | null>
  servingSize: number | null
  servingUnit: string | null
}

const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1'

/**
 * Search for foods in USDA database
 */
export async function searchUSDAFood(
  query: string, 
  pageSize: number = 5
): Promise<USDAFood[]> {
  const apiKey = process.env.USDA_API_KEY
  
  if (!apiKey) {
    console.warn('USDA API key not configured')
    return []
  }
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    
    // Build URL - don't specify dataType to avoid 500 errors
    const params = new URLSearchParams({
      api_key: apiKey,
      query: query,
      pageSize: pageSize.toString(),
      pageNumber: '1'
    })
    
    const response = await fetch(`${USDA_BASE_URL}/foods/search?${params.toString()}`, {
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error(`USDA API error: ${response.status}`, errorText.substring(0, 200))
      return []
    }
    
    const data: USDASearchResponse = await response.json()
    return data.foods || []
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('USDA API timeout')
    } else {
      console.error('USDA search error:', error)
    }
    return []
  }
}

/**
 * Get detailed food information by FDC ID
 */
export async function getUSDAFoodById(fdcId: number): Promise<USDAFood | null> {
  const apiKey = process.env.USDA_API_KEY
  
  if (!apiKey) {
    return null
  }
  
  try {
    const url = new URL(`${USDA_BASE_URL}/food/${fdcId}`)
    url.searchParams.append('api_key', apiKey)
    
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    })
    
    if (!response.ok) {
      return null
    }
    
    return await response.json()
    
  } catch (error) {
    console.error('USDA food fetch error:', error)
    return null
  }
}

/**
 * Extract nutrients from USDA food and map to our schema
 */
export function extractUSDANutrients(food: USDAFood): Record<string, number | null> {
  const nutrients: Record<string, number | null> = {}
  
  // Initialize all fields as null
  for (const field of Object.keys(USDA_NUTRIENT_IDS)) {
    nutrients[field] = null
  }
  
  // Map USDA nutrients to our fields
  for (const foodNutrient of food.foodNutrients || []) {
    const field = USDA_ID_TO_FIELD[foodNutrient.nutrientId]
    
    if (field && foodNutrient.value !== undefined && foodNutrient.value !== null) {
      // Take first non-null value for this field
      if (nutrients[field] === null) {
        nutrients[field] = foodNutrient.value
      }
    }
  }
  
  return nutrients
}

// Simple in-memory cache for USDA results (5 minute TTL)
const usdaCache = new Map<string, { data: USDANutritionResult[]; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Search and return formatted nutrition data for an ingredient
 * With multi-word support, translations, and scoring
 */
export async function getUSDANutritionForIngredient(
  ingredientName: string
): Promise<USDANutritionResult[]> {
  // Check cache first
  const cacheKey = ingredientName.toLowerCase()
  const cached = usdaCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  
  // Process search words with translation support
  const { searchWords, translatedWords } = processSearchWords(ingredientName)
  
  if (searchWords.length === 0) {
    return []
  }
  
  // Build search query for USDA API - use English translations if available
  const englishTerms = searchWords.map(word => {
    const translations = INGREDIENT_TRANSLATIONS[word] || []
    // Prefer English translation for USDA
    const englishVersion = translations.find(t => /^[a-z]+$/.test(t) && t !== word)
    return englishVersion || word
  })
  
  const searchQuery = englishTerms.join(' ')
  const foods = await searchUSDAFood(searchQuery, 15)
  
  // Score and sort results using shared scoring
  const scoredFoods = foods
    .map(food => {
      const { score, reasons } = scoreUSDAMatch(
        { description: food.description, dataType: food.dataType },
        searchWords,
        translatedWords
      )
      return { food, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5) // Top 5
  
  const results = scoredFoods.map(({ food }) => ({
    fdcId: food.fdcId,
    description: food.description,
    dataType: food.dataType,
    nutrients: extractUSDANutrients(food),
    servingSize: food.servingSize || null,
    servingUnit: food.servingSizeUnit || null,
  }))
  
  // Cache the result (even if empty, to avoid repeated failed lookups)
  usdaCache.set(cacheKey, { data: results, timestamp: Date.now() })
  
  return results
}

/**
 * Calculate nutrition with MIN/MAX logic for multiple USDA matches
 * Same logic as Mexican DB: MAX for macros, MIN for micros
 */
const MACRO_FIELDS = ['energia', 'proteinaBruta', 'hidratosCarbono', 'extractoEtereo', 'azucares', 'colesterol']

export function calculateUSDANutritionWithMinMax(
  results: USDANutritionResult[]
): Record<string, number | null> {
  if (results.length === 0) return {}
  if (results.length === 1) return results[0].nutrients
  
  const combined: Record<string, number | null> = {}
  
  for (const field of Object.keys(USDA_NUTRIENT_IDS)) {
    const values = results
      .map(r => r.nutrients[field])
      .filter((v): v is number => v !== null && v !== undefined)
    
    if (values.length === 0) {
      combined[field] = null
    } else if (MACRO_FIELDS.includes(field)) {
      // MAX for macros
      combined[field] = Math.max(...values)
    } else {
      // MIN for micros
      combined[field] = Math.min(...values)
    }
  }
  
  return combined
}
