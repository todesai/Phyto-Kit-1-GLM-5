export interface Meal {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
  strCategory?: string;
  strArea?: string;
  strInstructions?: string;
  strTags?: string;
  strYoutube?: string;
  ingredientCount?: number;
  [key: string]: string | number | undefined;
}

export interface MealDetail extends Meal {
  strIngredients: { name: string; measure: string }[];
  strInstructionsList: string[];
}

export interface NutritionData {
  // Macronutrients
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  cholesterol?: number;
  
  // Minerals
  calcium?: number;
  iron?: number;
  sodium?: number;
  potassium?: number;
  magnesium?: number;
  zinc?: number;
  phosphorus?: number;
  copper?: number;
  manganese?: number;
  selenium?: number;
  
  // Vitamins
  vitaminA?: number;
  vitaminC?: number;
  vitaminB1?: number;
  vitaminB2?: number;
  vitaminB3?: number;
  vitaminD?: number;
  vitaminE?: number;
  vitaminK?: number;
  vitaminB6?: number;
  vitaminB12?: number;
  folate?: number;
  
  // Amino Acids
  alanina?: number;
  arginina?: number;
  acidoAspartico?: number;
  cisteina?: number;
  acidoGlutamico?: number;
  glicina?: number;
  histidina?: number;
  isoleucina?: number;
  leucina?: number;
  lisina?: number;
  metionina?: number;
  fenilalanina?: number;
  prolina?: number;
  serina?: number;
  treonina?: number;
  triptofano?: number;
  tirosina?: number;
  valina?: number;
  
  // Fatty Acids
  acidosGrasosSaturados?: number;
  acidoMiristico?: number;
  acidoPalmitico?: number;
  acidoEsteaico?: number;
  acidoOleico?: number;
  acidoLinoleico?: number;
  acidoLinolenico?: number;
  acidoLaurico?: number;
  acidoAraquidico?: number;
  acidoBehenico?: number;
  acidoCaprico?: number;
  acidoCaprilico?: number;
  acidoCaproico?: number;
  acidoElaidico?: number;
  acidoPalmitoleico?: number;
  
  // Other
  humedad?: number;
  cenizas?: number;
  betaCarotenos?: number;
  carotenos?: number;
  almidon?: number;
  lactosa?: number;
  porcionComestible?: number;
}

// Nutrition source types
export type NutritionSource = 'mexican-db' | 'usda' | 'estimated' | 'not-found'

// Match type for transparency
export type MatchType = 'exact' | 'word-boundary' | 'starts-with' | 'partial' | 'contains'

// Nutrient value for transparency display
export interface NutrientValueDisplay {
  value: number | null
  unit: string
  label: string
  filled: boolean
}

// Match details for transparency
export interface MatchDetails {
  matchedRow: {
    conabioId: number
    nameEs: string
    nameEn?: string | null
    nutrientScore: number
  }
  matchType: MatchType
  matchScore: number
  matchReasons: string[]
  isPoorMatch: boolean
  dataCompleteness: {
    macroPercent: number
    microPercent: number
    overallPercent: number
  }
  nutrientTable?: {
    macronutrients: Record<string, NutrientValueDisplay>
    micronutrients: Record<string, NutrientValueDisplay>
  }
  alternatives?: Array<{
    conabioId: number
    nameEs: string
    nutrientScore: number
    matchScore: number
  }>
}

// Extended nutrition response from API
export interface NutritionApiResponse {
  success: boolean
  ingredients: Array<{
    name: string
    measure?: string
    source: NutritionSource
    confidence: number
    match?: string | null
    expandedFrom?: string
    matchDetails?: MatchDetails
  }>
  totalNutrition: NutritionData
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

export interface Ingredient {
  idIngredient: string;
  strIngredient: string;
  strDescription?: string;
  strType?: string;
}

export interface BioactiveCompound {
  name: string;
  source: string; // Chemical class
  benefits: string[];
  dailyValue?: number;
  amount?: number;
  unit?: string;
  warnings?: string[];
  // Extended fields from PhytoHub
  foodSources?: string[]; // Actual food sources from database
  estimatedAmount?: number; // Estimated amount in mg per serving
  beneficialDose?: number; // Beneficial daily dose in mg
  upperLimit?: number; // Upper safe limit in mg
  targetSystems?: string[]; // Target health systems
  // EPA CompTox toxicity data
  comptoxToxicity?: {
    hasData: boolean;
    ld50?: number;
    noael?: number;
    warnings: string[];
    hazardCategories: string[];
  };
  // EFSA OpenFoodTox toxicity data
  efsaToxicity?: {
    found: boolean;
    adi?: number; // Acceptable Daily Intake (mg/kg bw/day)
    tdi?: number; // Tolerable Daily Intake (mg/kg bw/day)
    noael?: number; // No Observed Adverse Effect Level
    ul?: number; // Tolerable Upper Intake Level (mg/day)
    hbgvType?: string; // Type of health-based guidance value
    source: string;
  };
}

// Grouped bioactive data by ingredient
export interface IngredientBioactiveGroup {
  ingredient: string;
  measure?: string;
  compounds: BioactiveCompound[];
  matchCount: number;
  isMatched: boolean;
}

export interface FoodSafetyInfo {
  ingredient: string;
  hazards: string[];
  safeHandling: string[];
  storageTips: string[];
  allergenInfo?: string[];
  cookingTemp?: string;
}

export interface ChefModeState {
  isPlaying: boolean;
  currentStep: number;
  totalSteps: number;
}
