/**
 * Comprehensive Ingredient Matching System
 * 
 * This file contains curated mappings, category priorities, and rules
 * for intelligent ingredient matching across databases.
 * 
 * Layers:
 * 1. Curated Common Mappings - Direct mappings for common ingredients
 * 2. Category Priority Rules - Hierarchical food category preferences
 * 3. Processing State Detection - Raw vs cooked, whole vs parts
 * 4. PhytoHub Compound Linking - Connect foods to bioactives
 */

// =============================================================================
// LAYER 1: CURATED COMMON INGREDIENT MAPPINGS
// =============================================================================

/**
 * Maps common English/Spanish ingredient terms to their preferred matches
 * These are high-confidence mappings that bypass fuzzy matching
 */
export const COMMON_INGREDIENT_MAPPINGS: Record<string, {
  // Preferred Mexican DB matches (in order of preference)
  mexicanMatches: Array<{
    pattern: string // Regex pattern to match in nombreEspanol/nombreIngles
    category?: string // Preferred category filter
    excludeCategories?: string[] // Categories to exclude
    processingState?: 'raw' | 'cooked' | 'any' // Preferred state
  }>
  // Preferred PhytoHub food sources
  phytoHubFoods: string[]
  // Notes for debugging
  notes?: string
}> = {
  // ==========================================================================
  // ANIMAL PRODUCTS - EGGS
  // ==========================================================================
  'egg': {
    mexicanMatches: [
      // Raw chicken eggs (most common for baking/cooking)
      { pattern: 'Huevo Gallina (Rojo|Blanco), Entero Crudo', category: 'HUEVO AVES', processingState: 'raw' },
      { pattern: 'Huevo Gallina, Entero Crudo', category: 'HUEVO AVES', processingState: 'raw' },
      { pattern: 'Huevo Gallina', category: 'HUEVO AVES', processingState: 'raw' },
      // Fallback to any chicken egg
      { pattern: 'Huevo.*Gallina', category: 'HUEVO AVES' },
    ],
    excludeCategories: ['INSECTOS', 'HUEVO PESCADO', 'HUEVO REPTIL'],
    phytoHubFoods: ['Egg', 'Egg yolk', 'Egg white', 'Chicken egg'],
    notes: 'For recipes, prefer raw eggs. Exclude insect eggs (escamoles) unless specifically mentioned.'
  },
  
  'eggs': {
    mexicanMatches: [
      { pattern: 'Huevo Gallina (Rojo|Blanco), Entero Crudo', category: 'HUEVO AVES', processingState: 'raw' },
      { pattern: 'Huevo Gallina, Entero Crudo', category: 'HUEVO AVES', processingState: 'raw' },
      { pattern: 'Huevo Gallina', category: 'HUEVO AVES', processingState: 'raw' },
      { pattern: 'Huevo.*Gallina', category: 'HUEVO AVES' },
    ],
    excludeCategories: ['INSECTOS', 'HUEVO PESCADO', 'HUEVO REPTIL'],
    phytoHubFoods: ['Egg', 'Egg yolk', 'Egg white', 'Chicken egg'],
  },
  
  'egg yolk': {
    mexicanMatches: [
      { pattern: 'Yema.*Huevo', category: 'HUEVO AVES' },
      { pattern: 'Huevo.*Yema', category: 'HUEVO AVES' },
    ],
    phytoHubFoods: ['Egg yolk'],
    notes: 'Egg yolks contain lutein, zeaxanthin, and canthaxanthin'
  },
  
  'egg white': {
    mexicanMatches: [
      { pattern: 'Clara.*Huevo', category: 'HUEVO AVES' },
      { pattern: 'Huevo.*Clara', category: 'HUEVO AVES' },
      { pattern: 'Albúmina', category: 'HUEVO AVES' },
    ],
    phytoHubFoods: ['Egg white', 'Egg albumen'],
  },

  // ==========================================================================
  // DAIRY PRODUCTS
  // ==========================================================================
  'butter': {
    mexicanMatches: [
      { pattern: 'Mantequilla(?!.*Palomitas)', category: 'LÁCTEOS' }, // Exclude popcorn
      { pattern: 'Mantequilla Sin Sal', category: 'LÁCTEOS' },
      { pattern: 'Mantequilla Con Sal', category: 'LÁCTEOS' },
    ],
    excludeCategories: ['BOTANAS', 'DULCES'],
    phytoHubFoods: ['Butter', 'Cow milk butter'],
    notes: 'Exclude prepared foods containing butter (like popcorn)'
  },
  
  'melted butter': {
    mexicanMatches: [
      { pattern: 'Mantequilla(?!.*Palomitas)', category: 'LÁCTEOS' },
    ],
    excludeCategories: ['BOTANAS', 'DULCES'],
    phytoHubFoods: ['Butter'],
    notes: 'Melted is a preparation state - match to regular butter'
  },
  
  'milk': {
    mexicanMatches: [
      { pattern: 'Leche.*Vaca.*Entera', category: 'LÁCTEOS' },
      { pattern: 'Leche Entera', category: 'LÁCTEOS' },
      { pattern: 'Leche de Vaca', category: 'LÁCTEOS' },
    ],
    excludeCategories: ['LECHE VEGETAL'],
    phytoHubFoods: ['Milk', 'Cow milk', 'Dairy milk'],
  },
  
  'cream': {
    mexicanMatches: [
      { pattern: 'Crema.*Láctea', category: 'LÁCTEOS' },
      { pattern: 'Crema de Leche', category: 'LÁCTEOS' },
      { pattern: 'Media Crema', category: 'LÁCTEOS' },
    ],
    phytoHubFoods: ['Cream', 'Dairy cream'],
  },

  // ==========================================================================
  // SWEETENERS
  // ==========================================================================
  'sugar': {
    mexicanMatches: [
      { pattern: '^Azúcar(?!.*Apple|.*Manzana)', category: 'AZÚCARES Y EDULCORANTES' },
      { pattern: 'Azúcar Estándar', category: 'AZÚCARES Y EDULCORANTES' },
      { pattern: 'Azúcar de Caña', category: 'AZÚCARES Y EDULCORANTES' },
      { pattern: 'Sacarosa', category: 'AZÚCARES Y EDULCORANTES' },
    ],
    excludeCategories: ['FRUTAS'], // Exclude sugar apple (saramulo)
    phytoHubFoods: ['Sugar', 'Sucrose', 'Cane sugar'],
    notes: 'Must exclude fruit names containing "sugar" like sugar apple (saramulo)'
  },
  
  'brown sugar': {
    mexicanMatches: [
      { pattern: 'Azúcar.*Moreno|Piloncillo', category: 'AZÚCARES Y EDULCORANTES' },
      { pattern: 'Piloncillo', category: 'AZÚCARES Y EDULCORANTES' },
    ],
    phytoHubFoods: ['Brown sugar', 'Muscovado sugar'],
  },
  
  'honey': {
    mexicanMatches: [
      { pattern: 'Miel.*Abeja', category: 'AZÚCARES Y EDULCORANTES' },
      { pattern: 'Miel', category: 'AZÚCARES Y EDULCORANTES' },
    ],
    phytoHubFoods: ['Honey'],
  },

  // ==========================================================================
  // FLOURS AND GRAINS
  // ==========================================================================
  'flour': {
    mexicanMatches: [
      { pattern: 'Harina.*Trigo', category: 'CEREALES Y DERIVADOS' },
      { pattern: 'Harina de Trigo', category: 'CEREALES Y DERIVADOS' },
      { pattern: 'Harina Integral', category: 'CEREALES Y DERIVADOS' },
    ],
    phytoHubFoods: ['Wheat', 'Common wheat', 'Wheat flour', 'Bread wheat'],
    notes: 'Wheat flour contains phytosterols like sitostanol-beta'
  },
  
  'self-raising flour': {
    mexicanMatches: [
      { pattern: 'Harina para Hotcakes|Harina para Panques', category: 'CEREALES Y DERIVADOS' },
      { pattern: 'Harina.*Leudante', category: 'CEREALES Y DERIVADOS' },
      { pattern: 'Harina de Trigo', category: 'CEREALES Y DERIVADOS' }, // Fallback
    ],
    phytoHubFoods: ['Wheat', 'Common wheat', 'Wheat flour'],
    notes: 'Self-raising = flour + leavening agents. Hotcake flour is closest Mexican equivalent'
  },
  
  'plain flour': {
    mexicanMatches: [
      { pattern: 'Harina de Trigo(?!.*Hotcake|.*Panque)', category: 'CEREALES Y DERIVADOS' },
      { pattern: 'Harina de Trigo', category: 'CEREALES Y DERIVADOS' },
    ],
    phytoHubFoods: ['Wheat', 'Wheat flour'],
  },
  
  'whole wheat flour': {
    mexicanMatches: [
      { pattern: 'Harina.*Trigo.*Integral', category: 'CEREALES Y DERIVADOS' },
      { pattern: 'Harina Integral de Trigo', category: 'CEREALES Y DERIVADOS' },
    ],
    phytoHubFoods: ['Whole wheat', 'Wheat bran', 'Wheat germ'],
  },

  // ==========================================================================
  // FLAVORINGS AND SPICES
  // ==========================================================================
  'vanilla': {
    mexicanMatches: [
      { pattern: 'Vainilla(?!.*Chicloso|.*Dulce|.*Goma)', category: 'ESPECIAS Y CONDIMENTOS' },
      { pattern: 'Esencia de Vainilla', category: 'ESPECIAS Y CONDIMENTOS' },
      { pattern: 'Extracto de Vainilla', category: 'ESPECIAS Y CONDIMENTOS' },
      { pattern: 'Vainilla Natural', category: 'ESPECIAS Y CONDIMENTOS' },
    ],
    excludeCategories: ['DULCES', 'BOTANAS', 'GOMAS DE MASCAR'],
    phytoHubFoods: ['Vanilla', 'Vanilla bean'],
    notes: 'Must exclude candies and chewing gum (chicloso)'
  },
  
  'vanilla extract': {
    mexicanMatches: [
      { pattern: 'Extracto de Vainilla|Esencia de Vainilla', category: 'ESPECIAS Y CONDIMENTOS' },
      { pattern: 'Vainilla(?!.*Chicloso|.*Dulce)', category: 'ESPECIAS Y CONDIMENTOS' },
    ],
    phytoHubFoods: ['Vanilla', 'Vanilla extract'],
  },
  
  'salt': {
    mexicanMatches: [
      { pattern: 'Sal de Mesa|Sal Yodada', category: 'ESPECIAS Y CONDIMENTOS' },
      { pattern: 'Sal(?!.*Mariscos|.*Salsa)', category: 'ESPECIAS Y CONDIMENTOS' },
    ],
    excludeCategories: ['SALSAS', 'MARISCOS'],
    phytoHubFoods: [], // Salt is a mineral, no bioactives
    notes: 'Salt should not match bioactive compounds'
  },
  
  'cinnamon': {
    mexicanMatches: [
      { pattern: 'Canela(?!.*Dulce|.*Galleta|.*Pan)', category: 'ESPECIAS Y CONDIMENTOS' },
      { pattern: 'Canela en Polvo', category: 'ESPECIAS Y CONDIMENTOS' },
    ],
    excludeCategories: ['DULCES', 'PANADERÍA'],
    phytoHubFoods: ['Cinnamon', 'Ceylon cinnamon', 'Cassia cinnamon'],
  },

  // ==========================================================================
  // FRUITS
  // ==========================================================================
  'apple': {
    mexicanMatches: [
      { pattern: 'Manzana(?!.*Azúcar|.*Sugar)', category: 'FRUTAS' },
      { pattern: 'Manzana Roja|Manzana Blanca', category: 'FRUTAS' },
      { pattern: 'Manzana Golden|Manzana Red', category: 'FRUTAS' },
    ],
    excludeCategories: ['AZÚCARES Y EDULCORANTES'], // Exclude sugar apple
    phytoHubFoods: ['Apple', 'Apple fruit', 'Malus domestica'],
    notes: 'Must exclude pineapple (piña) and sugar apple'
  },
  
  'lemon': {
    mexicanMatches: [
      { pattern: 'Limón(?!.*Salsa|.*Jugo.*Comercial)', category: 'FRUTAS' },
      { pattern: 'Limón Real|Limón Agrio', category: 'FRUTAS' },
    ],
    phytoHubFoods: ['Lemon', 'Lime', 'Citrus limon'],
  },
  
  'orange': {
    mexicanMatches: [
      { pattern: 'Naranja(?!.*Jugo.*Comercial)', category: 'FRUTAS' },
      { pattern: 'Naranja Dulce', category: 'FRUTAS' },
    ],
    phytoHubFoods: ['Orange', 'Sweet orange', 'Citrus sinensis'],
  },

  // ==========================================================================
  // VEGETABLES
  // ==========================================================================
  'onion': {
    mexicanMatches: [
      { pattern: 'Cebolla(?!.*Salsa|.*Polvo)', category: 'VERDURAS' },
      { pattern: 'Cebolla Blanca', category: 'VERDURAS' },
    ],
    phytoHubFoods: ['Onion', 'Common onion', 'Allium cepa'],
  },
  
  'garlic': {
    mexicanMatches: [
      { pattern: 'Ajo(?!.*Salsa|.*Polvo)', category: 'VERDURAS' },
      { pattern: 'Ajo Crudo', category: 'VERDURAS' },
    ],
    phytoHubFoods: ['Garlic', 'Allium sativum'],
  },
  
  'tomato': {
    mexicanMatches: [
      { pattern: 'Tomate(?!.*Salsa|.*Jugo)', category: 'VERDURAS' },
      { pattern: 'Tomate Rojo|Jitomate', category: 'VERDURAS' },
    ],
    phytoHubFoods: ['Tomato', 'Lycopersicon esculentum'],
  },

  // ==========================================================================
  // MEATS
  // ==========================================================================
  'chicken': {
    mexicanMatches: [
      { pattern: 'Pollo(?!.*Salsa|.*Empanizado)', category: 'CARNES' },
      { pattern: 'Pechuga de Pollo', category: 'CARNES' },
      { pattern: 'Muslo de Pollo', category: 'CARNES' },
    ],
    excludeCategories: ['ALIMENTOS PREPARADOS', 'SALSAS'],
    phytoHubFoods: ['Chicken', 'Chicken meat', 'Poultry'],
  },
  
  'beef': {
    mexicanMatches: [
      { pattern: 'Res(?!.*Salsa|.*Empanizado)', category: 'CARNES' },
      { pattern: 'Carne de Res', category: 'CARNES' },
    ],
    excludeCategories: ['ALIMENTOS PREPARADOS', 'SALSAS'],
    phytoHubFoods: ['Beef', 'Cow meat', 'Bovine meat'],
  },

  // ==========================================================================
  // FATS AND OILS
  // ==========================================================================
  'oil': {
    mexicanMatches: [
      { pattern: 'Aceite(?!.*Oliva)', category: 'ACEITES Y GRASAS' },
      { pattern: 'Aceite Vegetal', category: 'ACEITES Y GRASAS' },
    ],
    phytoHubFoods: [],
    notes: 'Vegetable oils are processed - minimal bioactives'
  },
  
  'olive oil': {
    mexicanMatches: [
      { pattern: 'Aceite de Oliva|Aceite Oliva', category: 'ACEITES Y GRASAS' },
      { pattern: 'Aceite de Oliva Virgen', category: 'ACEITES Y GRASAS' },
    ],
    phytoHubFoods: ['Olive oil', 'Olive', 'Extra virgin olive oil'],
  },

  // ==========================================================================
  // NUTS AND SEEDS
  // ==========================================================================
  'almond': {
    mexicanMatches: [
      { pattern: 'Almendra(?!.*Salsa|.*Dulce)', category: 'FRUTAS SECAS Y OLEAGINOSAS' },
      { pattern: 'Almendra Entera', category: 'FRUTAS SECAS Y OLEAGINOSAS' },
    ],
    excludeCategories: ['DULCES', 'ALIMENTOS PREPARADOS'],
    phytoHubFoods: ['Almond', 'Sweet almond'],
  },
  
  'walnut': {
    mexicanMatches: [
      { pattern: 'Nuez(?!.*Moscada)', category: 'FRUTAS SECAS Y OLEAGINOSAS' },
      { pattern: 'Nuez de Nogal', category: 'FRUTAS SECAS Y OLEAGINOSAS' },
    ],
    phytoHubFoods: ['Walnut', 'English walnut'],
  },
}

// =============================================================================
// LAYER 2: CATEGORY PRIORITY SYSTEM
// =============================================================================

/**
 * Food category priority levels
 * Lower number = higher priority (more likely to be a basic ingredient)
 */
export const CATEGORY_PRIORITY: Record<string, number> = {
  // Highest priority - basic ingredients
  'HUEVO AVES': 10,
  'LÁCTEOS': 11,
  'CARNES': 12,
  'VERDURAS': 13,
  'FRUTAS': 14,
  'CEREALES Y DERIVADOS': 15,
  'LEGUMINOSAS': 16,
  'ESPECIAS Y CONDIMENTOS': 17,
  'ACEITES Y GRASAS': 18,
  'AZÚCARES Y EDULCORANTES': 19,
  'FRUTAS SECAS Y OLEAGINOSAS': 20,
  
  // Lower priority - specific varieties
  'HUEVO PATA': 30,
  'HUEVO CODORNIZ': 31,
  
  // Even lower - processed foods
  'ALIMENTOS PREPARADOS': 50,
  'SALSAS': 51,
  'BOTANAS': 52,
  'DULCES': 53,
  'GOMAS DE MASCAR': 54,
  'BEBIDAS': 55,
  
  // Lowest priority - specialty items
  'INSECTOS': 90,
  'HUEVO PESCADO': 91,
  'HUEVO REPTIL': 92,
}

/**
 * Get priority score for a category (lower is better)
 */
export function getCategoryPriority(category: string): number {
  return CATEGORY_PRIORITY[category] ?? 50
}

/**
 * Check if a category should be excluded for a given ingredient
 */
export function shouldExcludeCategory(
  ingredientName: string,
  category: string
): boolean {
  const ingredient = ingredientName.toLowerCase()
  
  // Sugar should not match fruits (sugar apple)
  if (ingredient === 'sugar' || ingredient === 'azúcar') {
    if (category === 'FRUTAS' || category === 'FRUTAS TROPICALES') {
      return true
    }
  }
  
  // Eggs should not match insects
  if (ingredient === 'egg' || ingredient === 'eggs' || ingredient === 'huevo') {
    if (category === 'INSECTOS' || category === 'HUEVO PESCADO') {
      return true
    }
  }
  
  // Vanilla should not match candies
  if (ingredient === 'vanilla' || ingredient === 'vainilla') {
    if (category === 'DULCES' || category === 'GOMAS DE MASCAR' || category === 'BOTANAS') {
      return true
    }
  }
  
  // Butter should not match prepared foods
  if (ingredient === 'butter' || ingredient === 'mantequilla') {
    if (category === 'BOTANAS' || category === 'ALIMENTOS PREPARADOS') {
      return true
    }
  }
  
  return false
}

// =============================================================================
// LAYER 3: PROCESSING STATE DETECTION
// =============================================================================

export type ProcessingState = 'raw' | 'cooked' | 'dried' | 'processed' | 'unknown'

/**
 * Detect the processing state from ingredient name
 */
export function detectProcessingState(name: string): ProcessingState {
  const lower = name.toLowerCase()
  
  // Raw indicators - most natural state
  if (/\bcrudo?\b|\braw\b|\bfresco\b|\bentero\b|\bfresh\b|\bnatural\b/.test(lower)) {
    return 'raw'
  }
  
  // Cooked indicators - heat processed
  if (/\bcocido?\b|\bcooked\b|\bhervido?\b|\basado?\b|\bfrito?\b|\bhornear?\b|\bboiled\b|\bbaked\b|\bfried\b|\broasted\b/.test(lower)) {
    return 'cooked'
  }
  
  // Dried indicators - dehydration processed
  if (/\bseco\b|\bdried\b|\bdesecado?\b|\bdehydrated\b/.test(lower)) {
    return 'dried'
  }
  
  // Processed indicators - industrial/mechanical processing
  if (/\bpolvo\b|\bpowder\b|\bextracto?\b|\besencia\b|\bjugo\b|\bjuice\b|\bconcentrate\b|\bsauce\b|\bsalsa\b|\bpaste\b|\bpasta\b/.test(lower)) {
    return 'processed'
  }
  
  return 'unknown'
}

/**
 * Get processing state preference score
 * RAW is preferred by default unless the search term specifies processed
 * 
 * Philosophy:
 * - Raw ingredients are the natural baseline - highest priority
 * - If a recipe needs processed, the ingredient name will say so (e.g., "cooked chicken")
 * - Processed items have lower nutritional density and altered bioactives
 */
export function getProcessingStateScore(
  candidateState: ProcessingState,
  searchTermState: ProcessingState // The state implied by the search term
): { score: number; reason: string } {
  
  // If search term explicitly asks for a specific state, match it
  if (searchTermState !== 'unknown') {
    if (candidateState === searchTermState) {
      return { score: 200, reason: `Matches requested state: ${candidateState}` }
    }
    // Penalize mismatch when search is specific
    if (candidateState !== 'unknown') {
      return { score: -100, reason: `State mismatch: wanted ${searchTermState}, got ${candidateState}` }
    }
  }
  
  // DEFAULT BEHAVIOR: Prefer raw over all others
  // Raw ingredients have complete nutritional profiles and natural bioactives
  switch (candidateState) {
    case 'raw':
      return { score: 150, reason: 'Raw/natural state - preferred (+150)' }
    case 'unknown':
      // Unknown might be raw, give slight bonus
      return { score: 50, reason: 'Unknown processing state (+50)' }
    case 'dried':
      // Dried is acceptable, concentration of nutrients
      return { score: 0, reason: 'Dried state - acceptable (0)' }
    case 'cooked':
      // Cooked has nutrient loss, penalize
      return { score: -100, reason: 'Cooked state - nutrient loss (-100)' }
    case 'processed':
      // Processed has significant alteration, heavy penalty
      return { score: -200, reason: 'Processed state - altered profile (-200)' }
    default:
      return { score: 0, reason: '' }
  }
}

// =============================================================================
// LAYER 4: PHYTOHUB COMPOUND LINKING
// =============================================================================

/**
 * Known bioactive compounds in common foods
 * Maps food sources to their key bioactive compounds
 */
export const FOOD_BIOACTIVE_MAPPING: Record<string, {
  compounds: string[]
  notes?: string
}> = {
  'egg': {
    compounds: ['Lutein', 'Zeaxanthin', 'Canthaxanthin'],
    notes: 'Carotenoids found in egg yolk, important for eye health'
  },
  'egg yolk': {
    compounds: ['Lutein', 'Zeaxanthin', 'Canthaxanthin', 'Choline'],
  },
  'wheat': {
    compounds: ['Sitostanol', 'Beta-sitosterol', 'Ferulic acid'],
    notes: 'Phytosterols and phenolic acids in wheat bran'
  },
  'wheat flour': {
    compounds: ['Sitostanol', 'Beta-sitosterol', 'Ferulic acid'],
  },
  'apple': {
    compounds: ['Quercetin', 'Catechin', 'Phloridzin', 'Chlorogenic acid'],
  },
  'tomato': {
    compounds: ['Lycopene', 'Beta-carotene', 'Lutein'],
  },
  'garlic': {
    compounds: ['Allicin', 'Diallyl sulfide', 'S-allylcysteine'],
  },
  'onion': {
    compounds: ['Quercetin', 'Kaempferol', 'Myricetin'],
  },
  'olive oil': {
    compounds: ['Oleuropein', 'Hydroxytyrosol', 'Oleocanthal'],
  },
  'honey': {
    compounds: ['Caffeic acid', 'Chrysin', 'Galangin'],
  },
  'cinnamon': {
    compounds: ['Cinnamaldehyde', 'Eugenol', 'Cinnamic acid'],
  },
  'vanilla': {
    compounds: ['Vanillin', 'Vanillic acid', 'p-Hydroxybenzaldehyde'],
  },
  'almond': {
    compounds: ['Catechin', 'Epicatechin', 'Quercetin', 'Kaempferol'],
  },
  'walnut': {
    compounds: ['Ellagic acid', 'Quercetin', 'Melatonin'],
  },
  'lemon': {
    compounds: ['Hesperidin', 'Naringin', 'Eriocytin', 'Vitamin C'],
  },
  'orange': {
    compounds: ['Hesperidin', 'Naringin', 'Narirutin', 'Vitamin C'],
  },
}

/**
 * Get expected bioactive compounds for an ingredient
 */
export function getExpectedBioactives(ingredientName: string): string[] {
  const lower = ingredientName.toLowerCase()
  
  // Direct match
  if (FOOD_BIOACTIVE_MAPPING[lower]) {
    return FOOD_BIOACTIVE_MAPPING[lower].compounds
  }
  
  // Partial match
  for (const [key, value] of Object.entries(FOOD_BIOACTIVE_MAPPING)) {
    if (lower.includes(key) || key.includes(lower)) {
      return value.compounds
    }
  }
  
  return []
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if a curated mapping exists for an ingredient
 */
export function hasCuratedMapping(ingredientName: string): boolean {
  const lower = ingredientName.toLowerCase().trim()
  return lower in COMMON_INGREDIENT_MAPPINGS
}

/**
 * Get curated mapping for an ingredient
 */
export function getCuratedMapping(ingredientName: string) {
  const lower = ingredientName.toLowerCase().trim()
  return COMMON_INGREDIENT_MAPPINGS[lower] || null
}

/**
 * Match an ingredient against curated patterns
 */
export function matchAgainstCuratedPatterns(
  ingredientName: string,
  candidateName: string,
  candidateCategory?: string
): { matches: boolean; score: number; reasons: string[] } {
  const mapping = getCuratedMapping(ingredientName)
  
  if (!mapping) {
    return { matches: false, score: 0, reasons: ['No curated mapping found'] }
  }
  
  const reasons: string[] = []
  let score = 0
  
  // Check exclusions first
  if (candidateCategory && mapping.excludeCategories) {
    for (const excluded of mapping.excludeCategories) {
      if (candidateCategory.toUpperCase().includes(excluded.toUpperCase())) {
        return { 
          matches: false, 
          score: -1000, 
          reasons: [`Category ${candidateCategory} is excluded for ${ingredientName}`] 
        }
      }
    }
  }
  
  // Check preferred patterns
  for (const preferred of mapping.mexicanMatches) {
    const regex = new RegExp(preferred.pattern, 'i')
    if (regex.test(candidateName)) {
      score += 500
      reasons.push(`Matches preferred pattern: ${preferred.pattern}`)
      
      // Bonus for correct category
      if (candidateCategory && preferred.category) {
        if (candidateCategory.toUpperCase().includes(preferred.category.toUpperCase())) {
          score += 200
          reasons.push(`Category match: ${candidateCategory}`)
        }
      }
      
      break
    }
  }
  
  // Check category priority
  if (candidateCategory) {
    const priority = getCategoryPriority(candidateCategory)
    if (priority < 30) {
      score += Math.max(0, 50 - priority)
      reasons.push(`Good category priority: ${priority}`)
    }
  }
  
  return { 
    matches: score > 0, 
    score, 
    reasons 
  }
}
