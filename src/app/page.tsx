'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Leaf, Moon, Sun, Loader2, X, Plus, Image as ImageIcon, ImageOff,
  ChevronRight, Play, Pause, SkipBack, SkipForward, Volume2,
  AlertTriangle, AlertCircle, Heart, Shield, Info, ChefHat, RotateCcw, Undo, Globe,
  Upload, FileText, Trash2, Download, FolderOpen, Database, BookOpen, Layers, Table,
  Archive
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Meal, MealDetail, NutritionData, Ingredient, BioactiveCompound, FoodSafetyInfo, NutritionSource, NutritionApiResponse, IngredientBioactiveGroup } from '@/types/recipe'
import { WordClassificationDialog } from '@/components/word-classification-dialog'
import { HierarchyReview } from '@/components/hierarchy-review'
import { IngredientClassificationWorkspace } from '@/components/ingredient-classification-workspace'
import { NutritionTransparencyWorkspace } from '@/components/nutrition-transparency-workspace'
import { BackupManagement } from '@/components/backup-management'

// Translations
const translations = {
  en: {
    title: 'Phyto Kit',
    subtitle: 'Discover Nutritious Recipes',
    description: 'Explore recipes with detailed nutrition information, bioactive compounds analysis, and food safety insights.',
    searchPlaceholder: 'Search recipes by name...',
    search: 'Search',
    activeFilters: 'Active filters:',
    exactly: 'Exactly',
    ingredient: 'ingredient',
    ingredients: 'ingredients',
    clear: 'Clear',
    orFilterByIngredients: 'or filter by ingredients',
    addIngredients: 'Add Ingredients',
    typeIngredient: 'Type an ingredient for suggestions...',
    selected: 'selected',
    findRecipes: 'Find Recipes with These Ingredients',
    countFilters: 'Ingredient Count Filters (Optional)',
    exactCount: 'Exact ingredient count',
    maxIngredients: 'Maximum ingredients',
    noRecipes: 'No recipes found',
    tryAdjusting: 'Try adjusting your search terms or filters to find recipes.',
    clickToView: 'Click to view details',
    ingredientsTab: 'Recipe',
    nutritionTab: 'Nutrition',
    bioactiveTab: 'Bioactive',
    safetyTab: 'Safety',
    chefTab: 'Chef Mode',
    ingredientsLabel: 'Ingredients',
    instructionsLabel: 'Instructions',
    videoTutorial: 'Video Tutorial',
    watchOnYoutube: 'Watch on YouTube',
    estimatedNutrition: 'Estimated Nutrition',
    nutritionDisclaimer: 'These values are estimates based on ingredient analysis. Actual values may vary.',
    macros: 'Macronutrients',
    micros: 'Micronutrients',
    calories: 'Calories',
    protein: 'Protein',
    carbs: 'Carbs',
    fat: 'Fat',
    fiber: 'Fiber',
    sugar: 'Sugar',
    sodium: 'Sodium',
    potassium: 'Potassium',
    calcium: 'Calcium',
    iron: 'Iron',
    vitaminC: 'Vitamin C',
    vitaminA: 'Vitamin A',
    bioactiveTitle: 'Bioactive Compounds',
    bioactiveDescription: 'Analysis of beneficial phytochemicals and nutraceuticals present in the ingredients.',
    healthBenefits: 'Health Benefits:',
    noBioactive: 'No bioactive compound data available for this recipe.',
    safetyTitle: 'Food Safety Information',
    safetyDescription: 'Important guidelines based on HACCP, Codex Alimentarius, and FDA standards.',
    potentialHazards: 'Potential Hazards:',
    safeHandling: 'Safe Handling:',
    storageTips: 'Storage Tips:',
    cookingTemp: 'Recommended cooking temperature:',
    allergenWarning: 'Allergen Warning',
    noSafety: 'No specific safety information available for this recipe.',
    chefModeTitle: 'Chef Mode',
    chefModeDescription: 'Listen to the recipe instructions hands-free while cooking.',
    step: 'Step',
    of: 'of',
    speaking: 'Speaking...',
    playing: 'Playing',
    ready: 'Ready',
    previous: 'Previous',
    next: 'Next',
    playAll: 'Play All',
    allSteps: 'All Steps',
    disclaimer: 'Disclaimer: Nutritional information and bioactive compound data are estimates based on ingredient analysis. Always consult a healthcare professional for dietary advice. Food safety information is general guidance and may not apply to all situations.',
    loadingAnalysis: 'Loading AI analysis...',
    clickToLoad: 'Click to load analysis',
    searchByCount: 'Search by Count',
    portionSize: 'Portion Size',
    perPortion: 'Per Portion',
    per100g: 'Per 100g',
    portions: 'portions',
    estimatedWeight: 'Estimated Weight',
    totalWeight: 'Total Weight',
    toxicityAnalysis: 'Toxicity & Dose Analysis',
    yourDose: 'Your Dose',
    lethalDose: 'Lethal Dose (LD50)',
    toxicThreshold: 'Toxic Threshold',
    beneficialRange: 'Beneficial Range',
    timesBelow: 'times below',
    safeForDaily: 'Safe for daily use',
    caution: 'Caution',
    lowRisk: 'Low Risk',
    moderateRisk: 'Moderate Risk',
    highRisk: 'High Risk',
    optimal: 'Optimal',
    belowOptimal: 'Below Optimal',
    aboveOptimal: 'Above Optimal',
    naturalFoodSource: 'Natural Food Source',
    equivalentTo: 'Equivalent to',
    ofFood: 'of food',
    // File Upload Section
    uploadDocuments: 'Documents',
    uploadTitle: 'Upload Documents',
    uploadDescription: 'Upload CSV, PDF, and other files for nutrition data, toxins info, and recipes.',
    selectCategory: 'Category',
    nutritionCsv: 'Nutrition CSV',
    toxinsPdf: 'Toxins PDF',
    recipesPdf: 'Recipes PDF',
    referenceDocs: 'Reference Documents',
    generalFiles: 'General',
    selectFile: 'Select File',
    upload: 'Upload',
    uploading: 'Uploading...',
    uploadedFiles: 'Uploaded Files',
    noFiles: 'No files uploaded yet',
    fileSize: 'Size',
    uploaded: 'Uploaded',
    delete: 'Delete',
    dragDropHint: 'Drag and drop or click to select',
    maxFileSize: 'Max file size: 30MB',
    // CSV Import Section
    csvImport: 'CSV Import',
    importNutritionDb: 'Import Nutrition Database',
    importDescription: 'Import Mexican ingredients nutrition database from CSV. Duplicates will be automatically removed based on nutrient completeness.',
    availableFiles: 'Available CSV Files',
    importFile: 'Import',
    importing: 'Importing...',
    importSuccess: 'Import Successful',
    importStats: 'Import Statistics',
    totalRows: 'Total rows',
    uniqueFoods: 'Unique foods',
    duplicatesRemoved: 'Duplicates removed',
    inserted: 'Inserted',
    errors: 'Errors',
    databaseStats: 'Database Stats',
    foodsInDb: 'foods in database',
    noCsvFiles: 'No CSV files found. Upload a CSV file first.',
    viewDuplicates: 'View Duplicates',
    // PhytoHub Import
    phytoHubImport: 'PhytoHub Compounds',
    importPhytoHubDb: 'Import Bioactive Compounds',
    phytoHubDescription: 'Import phytochemical data from PhytoHub for bioactive compound analysis.',
    compoundsInDb: 'compounds in database',
    foodsIndexed: 'foods indexed',
    metabolites: 'metabolites',
    parentCompounds: 'parent compounds',
    noPhytoHubFiles: 'No PhytoHub CSV files found. Upload a CSV file with "PhytoHub" or "compound" in the name.',
    columnMapping: 'Column Mapping',
    // EFSA Import
    efsaImport: 'EFSA Toxicity Data',
    importEfsaDb: 'Import OpenFoodTox Database',
    efsaDescription: 'Import toxicity reference values (ADI, TDI, UL, NOAEL) from EFSA OpenFoodTox for safety analysis.',
    substancesInDb: 'substances in database',
    withHBGV: 'with HBGV',
    matchedCompounds: 'matched to PhytoHub',
    noEfsaFiles: 'No OpenFoodTox files found. Upload the OpenFoodToxTX22809_2023.xlsx file from Zenodo.',
    totalRecords: 'Total records',
    uniqueSubstances: 'Unique substances',
    withADI: 'With ADI/TDI',
    withNOAEL: 'With NOAEL',
    // Nutrition data source
    dataSource: 'Data Source',
    mexicanDb: 'Mexican DB',
    usdaDb: 'USDA',
    estimated: 'Estimated',
    notFound: 'Not Found',
    matchedFrom: 'Matched from',
    // Expanded nutrients
    vitamins: 'Vitamins',
    minerals: 'Minerals',
    aminoAcids: 'Amino Acids',
    fattyAcids: 'Fatty Acids',
    otherNutrients: 'Other Nutrients',
    showMore: 'Show More',
    showLess: 'Show Less',
    cholesterol: 'Cholesterol',
    vitaminB1: 'Vitamin B1',
    vitaminB2: 'Vitamin B2',
    vitaminB3: 'Vitamin B3',
    magnesium: 'Magnesium',
    zinc: 'Zinc',
    phosphorus: 'Phosphorus',
    copper: 'Copper',
    manganese: 'Manganese',
    selenium: 'Selenium',
    noData: 'No data',
    // Amino Acids
    alanine: 'Alanine',
    arginine: 'Arginine',
    asparticAcid: 'Aspartic Acid',
    cysteine: 'Cysteine',
    glutamicAcid: 'Glutamic Acid',
    glycine: 'Glycine',
    histidine: 'Histidine',
    isoleucine: 'Isoleucine',
    leucine: 'Leucine',
    lysine: 'Lysine',
    methionine: 'Methionine',
    phenylalanine: 'Phenylalanine',
    proline: 'Proline',
    serine: 'Serine',
    threonine: 'Threonine',
    tryptophan: 'Tryptophan',
    tyrosine: 'Tyrosine',
    valine: 'Valine',
    // Fatty Acids
    saturatedFattyAcids: 'Saturated Fatty Acids',
    myristicAcid: 'Myristic Acid',
    palmiticAcid: 'Palmitic Acid',
    stearicAcid: 'Stearic Acid',
    oleicAcid: 'Oleic Acid',
    linoleicAcid: 'Linoleic Acid (Omega-6)',
    linolenicAcid: 'Linolenic Acid (Omega-3)',
    lauricAcid: 'Lauric Acid',
    arachidicAcid: 'Arachidic Acid',
    behenicAcid: 'Behenic Acid',
    capricAcid: 'Capric Acid',
    caprylicAcid: 'Caprylic Acid',
    caproicAcid: 'Caproic Acid',
    elaidicAcid: 'Elaidic Acid',
    palmitoleicAcid: 'Palmitoleic Acid',
    // Other
    moisture: 'Moisture',
    ash: 'Ash',
    starch: 'Starch',
    lactose: 'Lactose',
    betaCarotenes: 'Beta-Carotenes',
    carotenes: 'Carotenes',
    ediblePortion: 'Edible Portion',
  },
  es: {
    title: 'Phyto Kit',
    subtitle: 'Descubre Recetas Nutritivas',
    description: 'Explora recetas con información nutricional detallada, análisis de compuestos bioactivos e información de seguridad alimentaria.',
    searchPlaceholder: 'Buscar recetas por nombre...',
    search: 'Buscar',
    activeFilters: 'Filtros activos:',
    exactly: 'Exactamente',
    ingredient: 'ingrediente',
    ingredients: 'ingredientes',
    clear: 'Limpiar',
    orFilterByIngredients: 'o filtrar por ingredientes',
    addIngredients: 'Agregar Ingredientes',
    typeIngredient: 'Escribe un ingrediente para sugerencias...',
    selected: 'seleccionados',
    findRecipes: 'Buscar Recetas con Estos Ingredientes',
    countFilters: 'Filtros de Cantidad de Ingredientes (Opcional)',
    exactCount: 'Cantidad exacta de ingredientes',
    maxIngredients: 'Máximo de ingredientes',
    noRecipes: 'No se encontraron recetas',
    tryAdjusting: 'Intenta ajustar tus términos de búsqueda o filtros para encontrar recetas.',
    clickToView: 'Clic para ver detalles',
    ingredientsTab: 'Receta',
    nutritionTab: 'Nutrición',
    bioactiveTab: 'Bioactivos',
    safetyTab: 'Seguridad',
    chefTab: 'Modo Chef',
    ingredientsLabel: 'Ingredientes',
    instructionsLabel: 'Instrucciones',
    videoTutorial: 'Tutorial en Video',
    watchOnYoutube: 'Ver en YouTube',
    estimatedNutrition: 'Nutrición Estimada',
    nutritionDisclaimer: 'Estos valores son estimaciones basadas en el análisis de ingredientes. Los valores reales pueden variar.',
    macros: 'Macronutrientes',
    micros: 'Micronutrientes',
    calories: 'Calorías',
    protein: 'Proteína',
    carbs: 'Carbohidratos',
    fat: 'Grasa',
    fiber: 'Fibra',
    sugar: 'Azúcar',
    sodium: 'Sodio',
    potassium: 'Potasio',
    calcium: 'Calcio',
    iron: 'Hierro',
    vitaminC: 'Vitamina C',
    vitaminA: 'Vitamina A',
    bioactiveTitle: 'Compuestos Bioactivos',
    bioactiveDescription: 'Análisis de fitoquímicos beneficiosos y nutracéuticos presentes en los ingredientes.',
    healthBenefits: 'Beneficios para la Salud:',
    noBioactive: 'No hay datos de compuestos bioactivos disponibles para esta receta.',
    safetyTitle: 'Información de Seguridad Alimentaria',
    safetyDescription: 'Directrices importantes basadas en HACCP, Codex Alimentarius y estándares FDA.',
    potentialHazards: 'Peligros Potenciales:',
    safeHandling: 'Manejo Seguro:',
    storageTips: 'Consejos de Almacenamiento:',
    cookingTemp: 'Temperatura de cocción recomendada:',
    allergenWarning: 'Advertencia de Alérgenos',
    noSafety: 'No hay información específica de seguridad disponible para esta receta.',
    chefModeTitle: 'Modo Chef',
    chefModeDescription: 'Escucha las instrucciones de la receta sin usar las manos mientras cocinas.',
    step: 'Paso',
    of: 'de',
    speaking: 'Hablando...',
    playing: 'Reproduciendo',
    ready: 'Listo',
    previous: 'Anterior',
    next: 'Siguiente',
    playAll: 'Reproducir Todo',
    allSteps: 'Todos los Pasos',
    disclaimer: 'Aviso: La información nutricional y los datos de compuestos bioactivos son estimaciones basadas en el análisis de ingredientes. Siempre consulta a un profesional de la salud para consejos dietéticos. La información de seguridad alimentaria es orientación general y puede no aplicar a todas las situaciones.',
    loadingAnalysis: 'Cargando análisis con IA...',
    clickToLoad: 'Clic para cargar análisis',
    searchByCount: 'Buscar por Cantidad',
    portionSize: 'Tamaño de Porción',
    perPortion: 'Por Porción',
    per100g: 'Por 100g',
    portions: 'porciones',
    estimatedWeight: 'Peso Estimado',
    totalWeight: 'Peso Total',
    toxicityAnalysis: 'Análisis de Toxicidad y Dosis',
    yourDose: 'Tu Dosis',
    lethalDose: 'Dosis Letal (LD50)',
    toxicThreshold: 'Umbral Tóxico',
    beneficialRange: 'Rango Beneficioso',
    timesBelow: 'veces por debajo',
    safeForDaily: 'Seguro para uso diario',
    caution: 'Precaución',
    lowRisk: 'Bajo Riesgo',
    moderateRisk: 'Riesgo Moderado',
    highRisk: 'Alto Riesgo',
    optimal: 'Óptimo',
    belowOptimal: 'Por Debajo del Óptimo',
    aboveOptimal: 'Por Encima del Óptimo',
    naturalFoodSource: 'Fuente Natural de Alimentos',
    equivalentTo: 'Equivalente a',
    ofFood: 'de alimento',
    // File Upload Section
    uploadDocuments: 'Documentos',
    uploadTitle: 'Subir Documentos',
    uploadDescription: 'Sube archivos CSV, PDF y otros para datos nutricionales, información de toxinas y recetas.',
    selectCategory: 'Categoría',
    nutritionCsv: 'CSV Nutrición',
    toxinsPdf: 'PDF Toxinas',
    recipesPdf: 'PDF Recetas',
    referenceDocs: 'Documentos de Referencia',
    generalFiles: 'General',
    selectFile: 'Seleccionar Archivo',
    upload: 'Subir',
    uploading: 'Subiendo...',
    uploadedFiles: 'Archivos Subidos',
    noFiles: 'No hay archivos subidos',
    fileSize: 'Tamaño',
    uploaded: 'Subido',
    delete: 'Eliminar',
    dragDropHint: 'Arrastra y suelta o haz clic para seleccionar',
    maxFileSize: 'Tamaño máx: 30MB',
    // CSV Import Section
    csvImport: 'Importar CSV',
    importNutritionDb: 'Importar Base de Nutrición',
    importDescription: 'Importar base de datos de nutrición de ingredientes mexicanos desde CSV. Los duplicados se eliminarán automáticamente según la completitud de nutrientes.',
    availableFiles: 'Archivos CSV Disponibles',
    importFile: 'Importar',
    importing: 'Importando...',
    importSuccess: 'Importación Exitosa',
    importStats: 'Estadísticas de Importación',
    totalRows: 'Filas totales',
    uniqueFoods: 'Alimentos únicos',
    duplicatesRemoved: 'Duplicados eliminados',
    inserted: 'Insertados',
    errors: 'Errores',
    databaseStats: 'Estadísticas BD',
    foodsInDb: 'alimentos en base de datos',
    noCsvFiles: 'No se encontraron archivos CSV. Sube un archivo CSV primero.',
    viewDuplicates: 'Ver Duplicados',
    // PhytoHub Import
    phytoHubImport: 'Compuestos PhytoHub',
    importPhytoHubDb: 'Importar Compuestos Bioactivos',
    phytoHubDescription: 'Importar datos de fitoquímicos desde PhytoHub para análisis de compuestos bioactivos.',
    compoundsInDb: 'compuestos en base de datos',
    foodsIndexed: 'alimentos indexados',
    metabolites: 'metabolitos',
    parentCompounds: 'compuestos padre',
    noPhytoHubFiles: 'No se encontraron archivos CSV de PhytoHub. Sube un archivo CSV con "PhytoHub" o "compound" en el nombre.',
    columnMapping: 'Mapeo de Columnas',
    // EFSA Import
    efsaImport: 'Datos de Toxicidad EFSA',
    importEfsaDb: 'Importar Base de Datos OpenFoodTox',
    efsaDescription: 'Importar valores de referencia de toxicidad (ADI, TDI, UL, NOAEL) de EFSA OpenFoodTox para análisis de seguridad.',
    substancesInDb: 'sustancias en base de datos',
    withHBGV: 'con HBGV',
    matchedCompounds: 'emparejados con PhytoHub',
    noEfsaFiles: 'No se encontraron archivos OpenFoodTox. Sube el archivo OpenFoodToxTX22809_2023.xlsx desde Zenodo.',
    totalRecords: 'Registros totales',
    uniqueSubstances: 'Sustancias únicas',
    withADI: 'Con ADI/TDI',
    withNOAEL: 'Con NOAEL',
    // Nutrition data source
    dataSource: 'Fuente de Datos',
    mexicanDb: 'BD Mexicana',
    usdaDb: 'USDA',
    estimated: 'Estimado',
    notFound: 'No Encontrado',
    matchedFrom: 'Encontrado en',
    // Expanded nutrients
    vitamins: 'Vitaminas',
    minerals: 'Minerales',
    aminoAcids: 'Aminoácidos',
    fattyAcids: 'Ácidos Grasos',
    otherNutrients: 'Otros Nutrientes',
    showMore: 'Ver Más',
    showLess: 'Ver Menos',
    cholesterol: 'Colesterol',
    vitaminB1: 'Vitamina B1',
    vitaminB2: 'Vitamina B2',
    vitaminB3: 'Vitamina B3',
    magnesium: 'Magnesio',
    zinc: 'Zinc',
    phosphorus: 'Fósforo',
    copper: 'Cobre',
    manganese: 'Manganeso',
    selenium: 'Selenio',
    noData: 'Sin datos',
    // Aminoácidos
    alanine: 'Alanina',
    arginine: 'Arginina',
    asparticAcid: 'Ácido Aspártico',
    cysteine: 'Cisteína',
    glutamicAcid: 'Ácido Glutámico',
    glycine: 'Glicina',
    histidine: 'Histidina',
    isoleucine: 'Isoleucina',
    leucine: 'Leucina',
    lysine: 'Lisina',
    methionine: 'Metionina',
    phenylalanine: 'Fenilalanina',
    proline: 'Prolina',
    serine: 'Serina',
    threonine: 'Treonina',
    tryptophan: 'Triptófano',
    tyrosine: 'Tirosina',
    valine: 'Valina',
    // Ácidos Grasos
    saturatedFattyAcids: 'Ácidos Grasos Saturados',
    myristicAcid: 'Ácido Mirístico',
    palmiticAcid: 'Ácido Palmítico',
    stearicAcid: 'Ácido Esteárico',
    oleicAcid: 'Ácido Oleico',
    linoleicAcid: 'Ácido Linoleico (Omega-6)',
    linolenicAcid: 'Ácido Linolénico (Omega-3)',
    lauricAcid: 'Ácido Laúrico',
    arachidicAcid: 'Ácido Araquídico',
    behenicAcid: 'Ácido Behénico',
    capricAcid: 'Ácido Cáprico',
    caprylicAcid: 'Ácido Caprílico',
    caproicAcid: 'Ácido Caproico',
    elaidicAcid: 'Ácido Elaidico',
    palmitoleicAcid: 'Ácido Palmitoleico',
    // Otros
    moisture: 'Humedad',
    ash: 'Cenizas',
    starch: 'Almidón',
    lactose: 'Lactosa',
    betaCarotenes: 'Beta-Carotenos',
    carotenes: 'Carotenos',
    ediblePortion: 'Porción Comestible',
  }
}

type Language = 'en' | 'es'

export default function Home() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [language, setLanguage] = useState<Language>('en')
  const [searchTerm, setSearchTerm] = useState('')
  const [ingredients, setIngredients] = useState<string[]>([])
  const [ingredientInput, setIngredientInput] = useState('')
  const [meals, setMeals] = useState<Meal[]>([])
  const [lastRemovedIngredient, setLastRemovedIngredient] = useState<{ ingredient: string; index: number } | null>(null)
  const [selectedMeal, setSelectedMeal] = useState<MealDetail | null>(null)
  const [nutritionData, setNutritionData] = useState<NutritionData | null>(null)
  const [bioactiveCompounds, setBioactiveCompounds] = useState<BioactiveCompound[]>([])
  const [foodSafetyData, setFoodSafetyData] = useState<FoodSafetyInfo[]>([])
  
  // Bioactive matching states
  const [bioactiveStats, setBioactiveStats] = useState<{
    totalIngredients: number
    matchedIngredients: number
    totalCompounds: number
    compoundsWithDosage: number
    compoundsWithWarnings: number
  } | null>(null)
  const [matchedCompounds, setMatchedCompounds] = useState<any[]>([])
  const [groupedBioactives, setGroupedBioactives] = useState<IngredientBioactiveGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [backgroundImage, setBackgroundImage] = useState('')
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([])
  const [backgroundMode, setBackgroundMode] = useState<'full' | 'balanced' | 'none'>('balanced')
  const [exactIngredientCount, setExactIngredientCount] = useState<number | null>(null)
  const [maxIngredients, setMaxIngredients] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Chef Mode states
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [aiLoaded, setAiLoaded] = useState(false)
  const [portionMode, setPortionMode] = useState<'portion' | '100g'>('portion')
  const [portionCount, setPortionCount] = useState(4)

  // Nutrition stats states
  const [nutritionStats, setNutritionStats] = useState<{
    totalIngredients: number
    matchedIngredients: number
    mexicanDbMatches: number
    usdaMatches: number
    notFound: number
    coveragePercent: number
  } | null>(null)
  const [nutritionLoading, setNutritionLoading] = useState(false)
  
  // Per-ingredient source tracking
  const [ingredientSources, setIngredientSources] = useState<Map<string, { 
    source: 'mexican-db' | 'usda' | 'not-found',
    match?: string 
  }>>(new Map())
  
  // Collapsible panel states
  const [showMinerals, setShowMinerals] = useState(false)
  const [showAminoAcids, setShowAminoAcids] = useState(false)
  const [showFattyAcids, setShowFattyAcids] = useState(false)
  const [showOther, setShowOther] = useState(false)

  // File Upload states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploadCategory, setUploadCategory] = useState<string>('general')
  const [uploading, setUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    name: string
    originalName: string
    category: string
    size: number
    uploadedAt: string
    type: string
  }>>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // CSV Import states
  const [csvFiles, setCsvFiles] = useState<Array<{
    path: string
    name: string
    category: string
    size: number
  }>>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    success: boolean
    stats?: {
      totalRows: number
      uniqueFoods: number
      duplicatesRemoved: number
      inserted: number
      errors: number
    }
    duplicateDetails?: Array<{ name: string; count: number; selected: number }>
    error?: string
  } | null>(null)
  const [dbStats, setDbStats] = useState<{ totalFoods: number }>({ totalFoods: 0 })
  
  // PhytoHub Import states
  const [phytoHubFiles, setPhytoHubFiles] = useState<Array<{
    path: string
    name: string
    category: string
    size: number
  }>>([])
  const [phytoHubImporting, setPhytoHubImporting] = useState(false)
  const [phytoHubResult, setPhytoHubResult] = useState<{
    success: boolean
    stats?: {
      totalRows: number
      imported: number
      skipped: number
      errors: number
    }
    columnMapping?: Record<string, string>
    error?: string
  } | null>(null)
  const [phytoHubStats, setPhytoHubStats] = useState<{
    totalCompounds: number
    totalFoods: number
    metaboliteCount: number
    parentCompounds: number
  }>({ totalCompounds: 0, totalFoods: 0, metaboliteCount: 0, parentCompounds: 0 })
  
  // Ingredient fetch error state
  const [ingredientError, setIngredientError] = useState<string | null>(null)

  // EFSA Import states
  const [efsaFiles, setEfsaFiles] = useState<Array<{
    path: string
    name: string
    size: number
  }>>([])
  const [efsaImporting, setEfsaImporting] = useState(false)
  const [efsaResult, setEfsaResult] = useState<{
    success: boolean
    stats?: {
      imported: number
      skipped: number
      matchedToPhytoHub: number
    }
    parseStats?: {
      totalRecords: number
      uniqueSubstances: number
      withADI: number
      withNOAEL: number
    }
    error?: string
  } | null>(null)
  const [efsaStats, setEfsaStats] = useState<{
    totalEFSA: number
    withHBGV: number
    withUL: number
    matchedToPhytoHub: number
  }>({ totalEFSA: 0, withHBGV: 0, withUL: 0, matchedToPhytoHub: 0 })

  // Word Classification Dialog state
  const [wordClassificationOpen, setWordClassificationOpen] = useState(false)

  // Hierarchy Review Dialog state
  const [hierarchyReviewOpen, setHierarchyReviewOpen] = useState(false)

  // Classification Workspace Dialog state
  const [classificationWorkspaceOpen, setClassificationWorkspaceOpen] = useState(false)

  // Nutrition Transparency Workspace Dialog state
  const [nutritionWorkspaceOpen, setNutritionWorkspaceOpen] = useState(false)

  // Backup Management Dialog state
  const [backupManagementOpen, setBackupManagementOpen] = useState(false)

  const t = translations[language]

  useEffect(() => {
    setMounted(true)
    fetchAllIngredients()
    const savedMode = localStorage.getItem('backgroundMode') as 'full' | 'balanced' | 'none'
    if (savedMode) setBackgroundMode(savedMode)
    const savedLang = localStorage.getItem('language') as Language
    if (savedLang) setLanguage(savedLang)
  }, [])

  useEffect(() => {
    localStorage.setItem('backgroundMode', backgroundMode)
  }, [backgroundMode])

  useEffect(() => {
    localStorage.setItem('language', language)
  }, [language])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowSuggestions(false)
    if (showSuggestions) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showSuggestions])

  // Get appropriate voice for language
  const getVoiceForLanguage = useCallback((lang: Language) => {
    if (!('speechSynthesis' in window)) return null
    
    const voices = window.speechSynthesis.getVoices()
    
    if (lang === 'es') {
      // Mexican Spanish first, then any Spanish
      const mexicanVoice = voices.find(v => v.lang === 'es-MX')
      if (mexicanVoice) return mexicanVoice
      
      const spanishVoice = voices.find(v => v.lang.startsWith('es'))
      return spanishVoice || voices[0]
    } else {
      // English - prefer US, then any English
      const usVoice = voices.find(v => v.lang === 'en-US')
      if (usVoice) return usVoice
      
      const englishVoice = voices.find(v => v.lang.startsWith('en'))
      return englishVoice || voices[0]
    }
  }, [])

  // Speech synthesis for Chef Mode
  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      
      // Set the voice based on language
      const voice = getVoiceForLanguage(language)
      if (voice) {
        utterance.voice = voice
        utterance.lang = language === 'es' ? 'es-MX' : 'en-US'
      }
      
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => {
        setIsSpeaking(false)
        if (isPlaying && selectedMeal && currentStep < selectedMeal.strInstructionsList.length - 1) {
          setCurrentStep(prev => prev + 1)
        } else {
          setIsPlaying(false)
        }
      }
      speechRef.current = utterance
      window.speechSynthesis.speak(utterance)
    }
  }, [isPlaying, selectedMeal, currentStep, language, getVoiceForLanguage])

  // Effect to handle step changes in Chef Mode
  useEffect(() => {
    if (isPlaying && selectedMeal && selectedMeal.strInstructionsList[currentStep]) {
      speak(selectedMeal.strInstructionsList[currentStep])
    }
  }, [currentStep, isPlaying, selectedMeal, speak])

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      setIsPlaying(false)
    }
  }, [])

  const fetchAllIngredients = async () => {
    try {
      setIngredientError(null)
      const response = await fetch('/api/ingredients')
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response type')
      }
      const data = await response.json()
      
      if (data.ingredients) {
        setAllIngredients(data.ingredients)
      }
      
      // Check for API-reported errors (even with 200 status)
      if (data.error) {
        setIngredientError(data.error)
        console.warn('Ingredient API warning:', data.error)
      }
    } catch (error) {
      console.error('Error fetching ingredients:', error)
      setIngredientError(language === 'es' 
        ? 'No se pudieron cargar los ingredientes. Por favor, inténtalo de nuevo más tarde.'
        : 'Failed to load ingredients. Please try again later.')
    }
  }

  const addIngredient = (ingredientToAdd?: string) => {
    const finalIngredient = ingredientToAdd || ingredientInput.trim()
    if (finalIngredient && !ingredients.includes(finalIngredient.toLowerCase())) {
      setIngredients([...ingredients, finalIngredient.toLowerCase()])
      setIngredientInput('')
      setShowSuggestions(false)
    }
  }

  const clearAllIngredients = () => {
    setIngredients([])
    setLastRemovedIngredient(null)
  }

  const removeIngredient = (ingredient: string) => {
    const index = ingredients.indexOf(ingredient)
    setLastRemovedIngredient({ ingredient, index })
    setIngredients(ingredients.filter(i => i !== ingredient))
  }

  const undoRemoveIngredient = () => {
    if (lastRemovedIngredient) {
      const { ingredient, index } = lastRemovedIngredient
      const newIngredients = [...ingredients.slice(0, index), ingredient, ...ingredients.slice(index)]
      setIngredients(newIngredients)
      setLastRemovedIngredient(null)
    }
  }

  const searchRecipes = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (ingredients.length > 0) params.append('ingredients', ingredients.join(','))
      if (exactIngredientCount !== null) params.append('exactCount', exactIngredientCount.toString())
      if (maxIngredients !== null) params.append('maxCount', maxIngredients.toString())

      const response = await fetch(`/api/search?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to search recipes')
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response from search API')
      }
      const data = await response.json()
      setMeals(data.meals || [])

      if (data.meals && data.meals.length > 0) {
        setBackgroundImage(data.meals[0].strMealThumb)
      }
    } catch (error) {
      console.error('Error searching recipes:', error)
      setMeals([])
    } finally {
      setLoading(false)
    }
  }

  // Fast load - only basic recipe data
  const fetchMealDetails = async (mealId: string) => {
    setDetailLoading(true)
    setDialogOpen(true)
    stopSpeaking()
    setCurrentStep(0)
    setIsPlaying(false)
    setAiLoaded(false)
    setBioactiveCompounds([])
    setFoodSafetyData([])
    setNutritionStats(null)
    setNutritionLoading(false)
    setBioactiveStats(null)
    setMatchedCompounds([])
    setGroupedBioactives([])
    setIngredientSources(new Map()) // Reset ingredient sources
    
    try {
      // First, fetch only basic recipe data (fast)
      const basicResponse = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`)
      if (!basicResponse.ok) throw new Error('Failed to fetch recipe')
      const contentType = basicResponse.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response from recipe API')
      }
      const basicData = await basicResponse.json()
      const meal = basicData.meals?.[0]
      
      if (!meal) {
        setDetailLoading(false)
        return
      }

      // Parse ingredients and measures
      const parsedIngredients: { name: string; measure: string }[] = []
      for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`]
        const measure = meal[`strMeasure${i}`]
        if (ingredient && ingredient.trim()) {
          parsedIngredients.push({ name: ingredient.trim(), measure: measure?.trim() || '' })
        }
      }

      // Parse instructions by line breaks
      const instructionsList: string[] = meal.strInstructions
        ? meal.strInstructions.split('\r\n').filter((step: string) => step.trim())
        : []

      const mealDetail: MealDetail = {
        ...meal,
        strIngredients: parsedIngredients,
        strInstructionsList: instructionsList,
      }

      setSelectedMeal(mealDetail)
      
      // Quick nutrition estimation as fallback
      const estimatedNutrition = {
        calories: parsedIngredients.length * 120,
        protein: parsedIngredients.length * 6,
        carbs: parsedIngredients.length * 15,
        fat: parsedIngredients.length * 5,
        fiber: parsedIngredients.length * 2,
        sugar: parsedIngredients.length * 3,
        sodium: parsedIngredients.length * 150,
        potassium: parsedIngredients.length * 200,
        calcium: parsedIngredients.length * 40,
        iron: parsedIngredients.length * 1.5,
        vitaminC: parsedIngredients.length * 8,
        vitaminA: parsedIngredients.length * 300,
      }
      
      // Try to get real nutrition from Mexican DB / USDA
      setNutritionLoading(true)
      try {
        const nutritionResponse = await fetch('/api/nutrition/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ingredients: parsedIngredients })
        })
        
        if (nutritionResponse.ok) {
          const nutritionResult: NutritionApiResponse = await nutritionResponse.json()
          
          // Store per-ingredient source information
          const sourceMap = new Map<string, { source: 'mexican-db' | 'usda' | 'not-found', match?: string }>()
          if (nutritionResult.ingredients) {
            for (const ing of nutritionResult.ingredients) {
              sourceMap.set(ing.name.toLowerCase(), {
                source: ing.source as 'mexican-db' | 'usda' | 'not-found',
                match: ing.match
              })
            }
          }
          setIngredientSources(sourceMap)
          
          if (nutritionResult.success && nutritionResult.stats.matchedIngredients > 0) {
            setNutritionData(nutritionResult.totalNutrition)
            setNutritionStats(nutritionResult.stats)
          } else {
            // No matches found, use estimation
            setNutritionData(estimatedNutrition)
            setNutritionStats({
              totalIngredients: parsedIngredients.length,
              matchedIngredients: 0,
              mexicanDbMatches: 0,
              usdaMatches: 0,
              notFound: parsedIngredients.length,
              coveragePercent: 0
            })
          }
        } else {
          setNutritionData(estimatedNutrition)
        }
      } catch {
        // Fallback to estimation if API fails
        setNutritionData(estimatedNutrition)
      } finally {
        setNutritionLoading(false)
      }
      
      setBackgroundImage(meal.strMealThumb)
      
      setDetailLoading(false)
    } catch (error) {
      console.error('Error fetching meal details:', error)
      setDetailLoading(false)
    }
  }

  // Lazy load AI analysis - now uses bioactive matching API
  const loadAiAnalysis = async () => {
    if (!selectedMeal || aiLoading || aiLoaded) return
    
    setAiLoading(true)
    try {
      // First try the bioactive matching API (PhytoHub data)
      const bioactiveResponse = await fetch('/api/bioactive/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ingredients: selectedMeal.strIngredients,
          portionCount 
        })
      })
      
      if (bioactiveResponse.ok) {
        const bioactiveData = await bioactiveResponse.json()
        
        if (bioactiveData.success && bioactiveData.totalCompounds?.length > 0) {
          // Use real PhytoHub data
          setMatchedCompounds(bioactiveData.totalCompounds)
          setBioactiveStats(bioactiveData.stats)
          
          // Group compounds by ingredient
          const grouped: IngredientBioactiveGroup[] = (bioactiveData.ingredients || []).map((ing: any) => ({
            ingredient: ing.ingredient,
            measure: ing.measure,
            compounds: ing.matchedCompounds.map((compound: any) => ({
              name: compound.name,
              source: compound.chemicalClass || 'Phytochemical',
              benefits: compound.healthEffects?.slice(0, 3) || ['Antioxidant properties', 'Anti-inflammatory effects'],
              amount: compound.amountPerPortion,
              unit: 'mg',
              warnings: compound.toxicityData?.length > 0 ? ['Check toxicity data'] : [],
              estimatedAmount: compound.estimatedAmount,
              beneficialDose: compound.beneficialDose,
              upperLimit: compound.upperLimit,
              targetSystems: compound.targetSystems,
              foodSources: compound.foodSources || [],
            })),
            matchCount: ing.matchedCompounds.length,
            isMatched: ing.matchedCompounds.length > 0,
          }))
          setGroupedBioactives(grouped)
          
          // Also set flat list for backwards compatibility
          const allCompounds: BioactiveCompound[] = []
          for (const ing of bioactiveData.ingredients || []) {
            for (const compound of ing.matchedCompounds || []) {
              allCompounds.push({
                name: compound.name,
                source: compound.chemicalClass || 'Phytochemical',
                benefits: compound.healthEffects?.slice(0, 3) || ['Antioxidant properties', 'Anti-inflammatory effects'],
                amount: compound.amountPerPortion,
                unit: 'mg',
                warnings: compound.toxicityData?.length > 0 ? ['Check toxicity data'] : [],
                estimatedAmount: compound.estimatedAmount,
                beneficialDose: compound.beneficialDose,
                upperLimit: compound.upperLimit,
                targetSystems: compound.targetSystems,
                foodSources: compound.foodSources || [],
              })
            }
          }
          setBioactiveCompounds(allCompounds.slice(0, 20))
          setAiLoaded(true)
          setAiLoading(false)
          return
        }
      }
      
      // Fallback to AI-generated analysis if no PhytoHub data
      const response = await fetch(`/api/recipe/${selectedMeal.idMeal}?aiOnly=true`)
      if (!response.ok) throw new Error('Failed to load AI analysis')
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response from AI analysis')
      }
      const data = await response.json()
      setBioactiveCompounds(data.bioactiveCompounds || [])
      setFoodSafetyData(data.foodSafety || [])
      setAiLoaded(true)
    } catch (error) {
      console.error('Error loading AI analysis:', error)
    } finally {
      setAiLoading(false)
    }
  }

  const filteredIngredients = allIngredients.filter(ing =>
    ing.strIngredient.toLowerCase().includes(ingredientInput.toLowerCase())
  ).slice(0, 8)

  const getBackgroundStyles = () => {
    switch (backgroundMode) {
      case 'full':
        return { opacity: 1, overlay: null }
      case 'balanced':
        const isLight = mounted && theme === 'light'
        return {
          opacity: isLight ? 0.6 : 0.35,
          overlay: isLight ? 'from-background/40 via-background/30 to-background' : 'from-background/60 via-background/40 to-background',
        }
      case 'none':
        return null
      default:
        return { opacity: 0.35, overlay: 'from-background/60 via-background/40 to-background' }
    }
  }

  const backgroundStyles = getBackgroundStyles()

  const handlePlayStep = (stepIndex: number) => {
    if (selectedMeal && selectedMeal.strInstructionsList[stepIndex]) {
      stopSpeaking()
      setCurrentStep(stepIndex)
      setIsPlaying(true)
    }
  }

  const handlePlayAll = () => {
    if (selectedMeal) {
      if (isPlaying) {
        stopSpeaking()
      } else {
        setCurrentStep(0)
        setIsPlaying(true)
      }
    }
  }

  const handleNextStep = () => {
    if (selectedMeal && currentStep < selectedMeal.strInstructionsList.length - 1) {
      stopSpeaking()
      setCurrentStep(prev => prev + 1)
      setIsPlaying(true)
    }
  }

  const handlePrevStep = () => {
    if (selectedMeal && currentStep > 0) {
      stopSpeaking()
      setCurrentStep(prev => prev - 1)
      setIsPlaying(true)
    }
  }

  // File Upload functions
  const fetchUploadedFiles = async () => {
    try {
      const response = await fetch('/api/upload')
      if (response.ok) {
        const data = await response.json()
        setUploadedFiles(data.files || [])
      }
    } catch (error) {
      console.error('Error fetching files:', error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', uploadCategory)

      console.log(`[Upload] Starting upload: ${file.name}, Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`)
      
      // Use Next.js API route for upload
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      console.log(`[Upload] Response status: ${response.status}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('[Upload] Success:', data)
        await fetchUploadedFiles()
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        const errorText = await response.text()
        console.error('Upload failed:', response.status, errorText)
        try {
          const errorJson = JSON.parse(errorText)
          alert(`Upload failed: ${errorJson.error || errorText}`)
        } catch {
          alert(`Upload failed: ${response.status} - ${errorText || 'Unknown error'}`)
        }
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert(`Upload error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteFile = async (category: string, fileName: string) => {
    try {
      const response = await fetch(`/api/upload?category=${encodeURIComponent(category)}&file=${encodeURIComponent(fileName)}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchUploadedFiles()
      }
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'nutrition-csv': t.nutritionCsv,
      'toxins-pdf': t.toxinsPdf,
      'recipes-pdf': t.recipesPdf,
      'reference-docs': t.referenceDocs,
      'general': t.generalFiles
    }
    return labels[category] || category
  }

  // CSV Import functions
  const fetchCsvFiles = async () => {
    try {
      const response = await fetch('/api/nutrition/import')
      if (response.ok) {
        const data = await response.json()
        setCsvFiles(data.files || [])
        setDbStats(data.databaseStats || { totalFoods: 0 })
      }
    } catch (error) {
      console.error('Error fetching CSV files:', error)
    }
  }

  const handleImportCsv = async (filePath: string) => {
    setImporting(true)
    setImportResult(null)
    try {
      const response = await fetch('/api/nutrition/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath }),
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setImportResult({
          success: true,
          stats: data.stats,
          duplicateDetails: data.duplicateDetails,
        })
        // Refresh database stats
        await fetchCsvFiles()
      } else {
        setImportResult({
          success: false,
          error: data.error || data.details || 'Import failed',
        })
      }
    } catch (error) {
      console.error('Import error:', error)
      setImportResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setImporting(false)
    }
  }

  // PhytoHub Import functions
  const fetchPhytoHubFiles = async () => {
    try {
      const response = await fetch('/api/bioactive/import')
      if (response.ok) {
        const data = await response.json()
        setPhytoHubFiles(data.files || [])
        setPhytoHubStats(data.databaseStats || { totalCompounds: 0, totalFoods: 0, metaboliteCount: 0, parentCompounds: 0 })
      }
    } catch (error) {
      console.error('Error fetching PhytoHub files:', error)
    }
  }

  const handleImportPhytoHub = async (filePath: string) => {
    setPhytoHubImporting(true)
    setPhytoHubResult(null)
    try {
      const response = await fetch('/api/bioactive/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          filePath,
          options: { clearExisting: false, skipDuplicates: true }
        }),
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setPhytoHubResult({
          success: true,
          stats: data.stats,
          columnMapping: data.columnMapping,
        })
        // Refresh database stats
        await fetchPhytoHubFiles()
      } else {
        setPhytoHubResult({
          success: false,
          error: data.error || data.details || 'Import failed',
        })
      }
    } catch (error) {
      console.error('PhytoHub import error:', error)
      setPhytoHubResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setPhytoHubImporting(false)
    }
  }

  // EFSA Import functions
  const fetchEfsaFiles = async () => {
    try {
      const response = await fetch('/api/toxicity/import-efsa?check=files')
      if (response.ok) {
        const data = await response.json()
        setEfsaFiles(data.availableFiles?.map((f: string) => ({
          path: `/home/z/my-project/upload/${f}`,
          name: f,
          size: 0
        })) || [])
        setEfsaStats({
          totalEFSA: data.alreadyImported || 0,
          withHBGV: 0,
          withUL: 0,
          matchedToPhytoHub: data.matchedToPhytoHub || 0
        })
      }
    } catch (error) {
      console.error('Error fetching EFSA files:', error)
    }
  }

  const handleImportEfsa = async (filename: string) => {
    setEfsaImporting(true)
    setEfsaResult(null)
    try {
      const response = await fetch('/api/toxicity/import-efsa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename }),
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setEfsaResult({
          success: true,
          stats: data.importResult,
          parseStats: data.parseStats,
        })
        // Refresh stats
        await fetchEfsaFiles()
      } else {
        setEfsaResult({
          success: false,
          error: data.error || data.details || 'Import failed',
        })
      }
    } catch (error) {
      console.error('EFSA import error:', error)
      setEfsaResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setEfsaImporting(false)
    }
  }

  // Fetch uploaded files when dialog opens
  useEffect(() => {
    if (uploadDialogOpen) {
      fetchUploadedFiles()
      fetchCsvFiles()
      fetchPhytoHubFiles()
      fetchEfsaFiles()
    }
  }, [uploadDialogOpen])

  return (
    <div className="min-h-screen flex flex-col">
      {/* Dynamic Background */}
      {backgroundImage && backgroundStyles && (
        <div
          className="fixed inset-0 -z-10 transition-opacity duration-700"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: backgroundStyles.opacity,
          }}
        >
          {backgroundStyles.overlay && (
            <div className={`absolute inset-0 bg-gradient-to-b ${backgroundStyles.overlay}`} />
          )}
        </div>
      )}

      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Leaf className="h-8 w-8 text-emerald-500" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
              {t.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <Select value={language} onValueChange={(value: Language) => setLanguage(value)}>
              <SelectTrigger className="w-[100px]">
                <Globe className="h-4 w-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">🇺🇸 EN</SelectItem>
                <SelectItem value="es">🇲🇽 ES</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Background Mode */}
            <Select value={backgroundMode} onValueChange={(value: 'full' | 'balanced' | 'none') => setBackgroundMode(value)}>
              <SelectTrigger className="w-[120px]">
                <div className="flex items-center gap-2 w-full">
                  {backgroundImage && backgroundMode !== 'none' ? (
                    <div
                      className="w-4 h-4 rounded overflow-hidden relative flex-shrink-0"
                      style={{
                        backgroundImage: `url(${backgroundImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                  ) : (
                    <div
                      className="w-4 h-4 rounded flex-shrink-0"
                      style={{
                        backgroundColor: mounted && theme === 'dark' ? 'black' : 'white',
                        border: mounted && theme === 'dark' ? '1px solid #333' : '1px solid #ccc',
                      }}
                    />
                  )}
                  <span className="text-xs">
                    {backgroundMode === 'full' ? 'Full' : backgroundMode === 'balanced' ? 'Bal' : 'None'}
                  </span>
                </div>
                <SelectValue className="hidden" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    <span>Full</span>
                  </div>
                </SelectItem>
                <SelectItem value="balanced">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    <span>Balanced</span>
                  </div>
                </SelectItem>
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <ImageOff className="h-4 w-4" />
                    <span>None</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            {/* Upload Documents Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setUploadDialogOpen(true)}
              className="rounded-full"
              title={t.uploadDocuments}
            >
              <FolderOpen className="h-5 w-5" />
              <span className="sr-only">{t.uploadDocuments}</span>
            </Button>
            
            {/* Word Classification Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setWordClassificationOpen(true)}
              className="rounded-full"
              title="Word Classification Review"
            >
              <BookOpen className="h-5 w-5" />
              <span className="sr-only">Word Classification Review</span>
            </Button>

            {/* Hierarchy Review Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setHierarchyReviewOpen(true)}
              className="rounded-full"
              title="Hierarchy Review"
            >
              <Database className="h-5 w-5" />
              <span className="sr-only">Hierarchy Review</span>
            </Button>

            {/* Backup Management Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setBackupManagementOpen(true)}
              className="rounded-full"
              title="Backup Management"
            >
              <Archive className="h-5 w-5" />
              <span className="sr-only">Backup Management</span>
            </Button>

            {/* Classification Workspace Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setClassificationWorkspaceOpen(true)}
              className="rounded-full"
              title="Classification Workspace"
            >
              <Layers className="h-5 w-5" />
              <span className="sr-only">Classification Workspace</span>
            </Button>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-full"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Hero Search Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            {t.subtitle}
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            {t.description}
          </p>

          <div className="max-w-3xl mx-auto space-y-4">
            {/* Search by Name */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10 h-12 text-base"
                  onKeyPress={(e) => e.key === 'Enter' && searchRecipes()}
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      setMeals([])
                      setBackgroundImage('')
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button onClick={searchRecipes} disabled={loading} size="lg" className="px-8">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                {t.search}
              </Button>
            </div>

            {/* Active Filters Display */}
            {(exactIngredientCount !== null || maxIngredients !== null) && (
              <div className="flex flex-wrap gap-2 items-center justify-center bg-muted/30 rounded-lg p-3">
                <span className="text-xs font-medium">{t.activeFilters}</span>
                {exactIngredientCount !== null && (
                  <Badge variant="default" className="text-xs">
                    {t.exactly} {exactIngredientCount} {exactIngredientCount === 1 ? t.ingredient : t.ingredients}
                  </Badge>
                )}
                {maxIngredients !== null && (
                  <Badge variant="default" className="text-xs">
                    ≤{maxIngredients} {t.ingredients}
                  </Badge>
                )}
                <button
                  onClick={() => {
                    setExactIngredientCount(null)
                    setMaxIngredients(null)
                  }}
                  className="text-xs hover:text-destructive underline ml-2"
                >
                  {t.clear}
                </button>
              </div>
            )}

            <div className="flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="text-sm text-muted-foreground">{t.orFilterByIngredients}</span>
              <Separator className="flex-1" />
            </div>

            {/* Multi-Ingredient Filter */}
            <div className="bg-card/50 backdrop-blur-sm rounded-lg p-6 border">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {t.addIngredients}
              </h3>
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    placeholder={t.typeIngredient}
                    value={ingredientInput}
                    onChange={(e) => {
                      setIngredientInput(e.target.value)
                      setShowSuggestions(true)
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    className="h-12"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addIngredient()
                      }
                    }}
                  />
                  {showSuggestions && ingredientInput && filteredIngredients.length > 0 && (
                    <div
                      className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-md shadow-lg max-h-60 overflow-y-auto z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {filteredIngredients.slice(0, 20).map((ing) => (
                        <button
                          key={ing.idIngredient}
                          onClick={() => addIngredient(ing.strIngredient)}
                          className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors text-sm border-b last:border-b-0"
                          title={ing.strIngredient}
                        >
                          <span className="break-words">{ing.strIngredient}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button onClick={() => addIngredient()} variant="outline" size="icon" className="h-12 w-12">
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Ingredient fetch error */}
              {ingredientError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between gap-2">
                    <span className="text-xs">{ingredientError}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchAllIngredients()}
                      className="h-6 px-2 text-xs shrink-0 bg-destructive/10 border-destructive/20 hover:bg-destructive/20"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      {language === 'es' ? 'Reintentar' : 'Retry'}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Selected Ingredients */}
              {ingredients.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs font-semibold">
                      {ingredients.length} {ingredients.length === 1 ? t.ingredient : t.ingredients} {t.selected}
                    </Badge>
                    <Button
                      onClick={undoRemoveIngredient}
                      disabled={!lastRemovedIngredient}
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs disabled:opacity-50"
                    >
                      <Undo className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ingredients.map((ingredient) => (
                      <Badge key={ingredient} variant="secondary" className="text-sm px-3 py-1">
                        {ingredient}
                        <button
                          onClick={() => removeIngredient(ingredient)}
                          className="ml-2 hover:text-destructive transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <Button
                      onClick={clearAllIngredients}
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs hover:text-destructive"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              <Button onClick={searchRecipes} disabled={loading || ingredients.length === 0} className="w-full mt-4">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t.findRecipes}
              </Button>

              <Separator className="my-4" />

              {/* Ingredient Count Filters */}
              <div className="space-y-3 bg-muted/30 rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  {t.countFilters}
                </h4>

                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium">{t.exactCount}</label>
                      {exactIngredientCount !== null && (
                        <button
                          onClick={() => setExactIngredientCount(null)}
                          className="text-xs hover:text-destructive underline"
                        >
                          {t.clear}
                        </button>
                      )}
                    </div>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={exactIngredientCount || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        setExactIngredientCount(value ? parseInt(value) : null)
                      }}
                      className="h-10"
                    />
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium">{t.maxIngredients}</label>
                      {maxIngredients !== null && (
                        <button
                          onClick={() => setMaxIngredients(null)}
                          className="text-xs hover:text-destructive underline"
                        >
                          {t.clear}
                        </button>
                      )}
                    </div>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={maxIngredients || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        setMaxIngredients(value ? parseInt(value) : null)
                      }}
                      className="h-10"
                    />
                  </div>
                </div>
                
                {/* Dedicated Search by Count Button */}
                <Button 
                  onClick={searchRecipes} 
                  disabled={loading || (exactIngredientCount === null && maxIngredients === null)} 
                  className="w-full mt-3"
                  variant="secondary"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                  {t.searchByCount}
                </Button>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Recipe Cards Grid */}
        <section>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : meals.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              <AnimatePresence mode="popLayout">
                {meals.map((meal, index) => (
                  <motion.div
                    key={meal.idMeal}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ y: -5 }}
                  >
                    <Card
                      className="overflow-hidden cursor-pointer group hover:shadow-lg transition-all duration-300"
                      onClick={() => fetchMealDetails(meal.idMeal)}
                    >
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={meal.strMealThumb}
                          alt={meal.strMeal}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-2 left-2 right-2 flex gap-2 flex-wrap">
                          {meal.strCategory && (
                            <Badge variant="secondary" className="text-xs">
                              {meal.strCategory}
                            </Badge>
                          )}
                          {meal.strArea && (
                            <Badge variant="outline" className="text-xs">
                              {meal.strArea}
                            </Badge>
                          )}
                          {meal.ingredientCount && (
                            <Badge variant="default" className="text-xs bg-emerald-600">
                              {meal.ingredientCount} {t.ingredients}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardHeader className="p-4">
                        <CardTitle className="text-lg line-clamp-2 group-hover:text-emerald-500 transition-colors">
                          {meal.strMeal}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1 text-xs">
                          <ChevronRight className="h-3 w-3" />
                          {t.clickToView}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <Leaf className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">{t.noRecipes}</h3>
              <p className="text-muted-foreground">{t.tryAdjusting}</p>
            </motion.div>
          )}
        </section>
      </main>

      {/* Recipe Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open)
        if (!open) {
          stopSpeaking()
          setCurrentStep(0)
          setIsPlaying(false)
        }
      }}>
        <DialogContent className="max-w-4xl h-[90vh] overflow-hidden p-0 flex flex-col">
          {/* VisuallyHidden title for accessibility */}
          <VisuallyHidden>
            <DialogTitle>{selectedMeal?.strMeal || 'Recipe Details'}</DialogTitle>
          </VisuallyHidden>
          
          {detailLoading ? (
            <div className="p-6 flex-1">
              <Skeleton className="h-8 w-3/4 mb-4" />
              <Skeleton className="h-4 w-1/2 mb-6" />
              <div className="flex gap-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
              <Skeleton className="h-64 w-full mt-4" />
            </div>
          ) : selectedMeal ? (
            <>
              {/* Header with image */}
              <div className="relative h-40 md:h-52 overflow-hidden shrink-0">
                <img
                  src={selectedMeal.strMealThumb}
                  alt={selectedMeal.strMeal}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                <DialogHeader className="absolute bottom-0 left-0 right-0 p-4">
                  <DialogTitle className="text-xl md:text-2xl font-bold">{selectedMeal.strMeal}</DialogTitle>
                  <DialogDescription className="flex gap-2 flex-wrap">
                    {selectedMeal.strCategory && (
                      <Badge variant="secondary">{selectedMeal.strCategory}</Badge>
                    )}
                    {selectedMeal.strArea && (
                      <Badge variant="outline">{selectedMeal.strArea}</Badge>
                    )}
                    {selectedMeal.strIngredients && (
                      <Badge variant="default" className="bg-emerald-600">
                        {selectedMeal.strIngredients.length} {t.ingredients}
                      </Badge>
                    )}
                  </DialogDescription>
                </DialogHeader>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="recipe" className="flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="px-4 pt-3 border-b shrink-0">
                  <TabsList className="w-full justify-start overflow-x-auto">
                    <TabsTrigger value="recipe" className="gap-1 text-xs sm:text-sm">
                      <ChefHat className="h-4 w-4" />
                      <span className="hidden sm:inline">{t.ingredientsTab}</span>
                    </TabsTrigger>
                    <TabsTrigger value="nutrition" className="gap-1 text-xs sm:text-sm">
                      <Heart className="h-4 w-4" />
                      <span className="hidden sm:inline">{t.nutritionTab}</span>
                    </TabsTrigger>
                    <TabsTrigger value="bioactive" className="gap-1 text-xs sm:text-sm" onClick={() => !aiLoaded && loadAiAnalysis()}>
                      <Leaf className="h-4 w-4" />
                      <span className="hidden sm:inline">{t.bioactiveTab}</span>
                    </TabsTrigger>
                    <TabsTrigger value="safety" className="gap-1 text-xs sm:text-sm" onClick={() => !aiLoaded && loadAiAnalysis()}>
                      <Shield className="h-4 w-4" />
                      <span className="hidden sm:inline">{t.safetyTab}</span>
                    </TabsTrigger>
                    <TabsTrigger value="chef" className="gap-1 text-xs sm:text-sm">
                      <Volume2 className="h-4 w-4" />
                      <span className="hidden sm:inline">{t.chefTab}</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <ScrollArea className="flex-1 px-4 pb-4 min-h-0">
                  {/* Recipe Details Tab */}
                  <TabsContent value="recipe" className="mt-3 space-y-4">
                    <div>
                      <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                        <Info className="h-4 w-4 text-emerald-500" />
                        {t.ingredientsLabel}
                        {nutritionStats && (
                          <span className="text-xs font-normal text-muted-foreground ml-2">
                            ({nutritionStats.matchedIngredients}/{nutritionStats.totalIngredients} {language === 'es' ? 'con datos' : 'with data'})
                          </span>
                        )}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                        {selectedMeal.strIngredients?.map((ing, i) => {
                          const sourceInfo = ingredientSources.get(ing.name.toLowerCase())
                          const source = sourceInfo?.source || 'not-found'
                          const sourceColors = {
                            'mexican-db': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
                            'usda': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
                            'not-found': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }
                          const sourceLabels = {
                            'mexican-db': t.mexicanDb,
                            'usda': t.usdaDb,
                            'not-found': t.notFound
                          }
                          
                          return (
                            <div
                              key={i}
                              className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                              title={`${ing.name}${ing.measure ? ` - ${ing.measure}` : ''}`}
                            >
                              <Badge variant="outline" className="shrink-0 text-xs mt-0.5">{i + 1}</Badge>
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="font-medium text-sm break-words">{ing.name}</span>
                                {ing.measure && (
                                  <span className="text-muted-foreground text-xs break-words">{ing.measure}</span>
                                )}
                              </div>
                              <Badge className={`text-[10px] px-1.5 py-0.5 shrink-0 mt-0.5 ${sourceColors[source]}`}>
                                {sourceLabels[source]}
                              </Badge>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                        <ChefHat className="h-4 w-4 text-emerald-500" />
                        {t.instructionsLabel}
                      </h3>
                      <div className="space-y-2">
                        {selectedMeal.strInstructionsList?.map((instruction, i) => (
                          <div
                            key={i}
                            className="flex gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <Badge variant="default" className="shrink-0 h-5 w-5 rounded-full flex items-center justify-center bg-emerald-600 text-xs">
                              {i + 1}
                            </Badge>
                            <p className="text-sm leading-relaxed">{instruction}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedMeal.strYoutube && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="text-base font-semibold mb-2">{t.videoTutorial}</h3>
                          <a
                            href={selectedMeal.strYoutube}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-emerald-500 hover:text-emerald-600 transition-colors text-sm"
                          >
                            <Play className="h-4 w-4" />
                            {t.watchOnYoutube}
                          </a>
                        </div>
                      </>
                    )}
                  </TabsContent>

                  {/* Nutrition Tab */}
                  <TabsContent value="nutrition" className="mt-3 space-y-4">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>{t.estimatedNutrition}</AlertTitle>
                      <AlertDescription className="text-xs">
                        {t.nutritionDisclaimer}
                      </AlertDescription>
                    </Alert>

                    {/* Portion Toggle */}
                    <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm font-medium">{t.portionSize}:</span>
                      <div className="flex gap-1">
                        <Button
                          variant={portionMode === 'portion' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPortionMode('portion')}
                          className="h-8 text-xs"
                        >
                          {t.perPortion}
                        </Button>
                        <Button
                          variant={portionMode === '100g' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPortionMode('100g')}
                          className="h-8 text-xs"
                        >
                          {t.per100g}
                        </Button>
                      </div>
                      {portionMode === 'portion' && (
                        <div className="flex items-center gap-2 ml-auto">
                          <Select value={portionCount.toString()} onValueChange={(v) => setPortionCount(parseInt(v))}>
                            <SelectTrigger className="w-[100px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2">2 {t.portions}</SelectItem>
                              <SelectItem value="4">4 {t.portions}</SelectItem>
                              <SelectItem value="6">6 {t.portions}</SelectItem>
                              <SelectItem value="8">8 {t.portions}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    {/* Loading State */}
                    {nutritionLoading && (
                      <div className="text-center py-4">
                        <Loader2 className="h-6 w-6 mx-auto animate-spin text-emerald-500 mb-2" />
                        <p className="text-sm text-muted-foreground">{t.loadingAnalysis}</p>
                      </div>
                    )}

                    {/* Data Coverage Summary */}
                    {nutritionStats && !nutritionLoading && (
                      <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-muted/30 text-xs">
                        <span className="font-medium">{t.dataSource}:</span>
                        <span className="text-muted-foreground">
                          {nutritionStats.coveragePercent}% {language === 'es' ? 'cobertura' : 'coverage'}
                        </span>
                        <Progress value={nutritionStats.coveragePercent} className="h-1.5 w-20" />
                      </div>
                    )}

                    {nutritionData && !nutritionLoading && (
                      <div className="space-y-4">
                        {/* Macronutrients - Always Visible */}
                        <div>
                          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                            <Heart className="h-4 w-4 text-rose-500" />
                            {t.macros}
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <Card className="p-3 text-center">
                              <p className="text-2xl font-bold text-rose-500">
                                {portionMode === 'portion' 
                                  ? Math.round(nutritionData.calories / portionCount)
                                  : Math.round(nutritionData.calories * 0.8)}
                              </p>
                              <p className="text-xs text-muted-foreground">{t.calories}</p>
                            </Card>
                            <Card className="p-3 text-center">
                              <p className="text-2xl font-bold text-blue-500">
                                {portionMode === 'portion' 
                                  ? (nutritionData.protein / portionCount).toFixed(1)
                                  : (nutritionData.protein * 0.8).toFixed(1)}g
                              </p>
                              <p className="text-xs text-muted-foreground">{t.protein}</p>
                            </Card>
                            <Card className="p-3 text-center">
                              <p className="text-2xl font-bold text-amber-500">
                                {portionMode === 'portion' 
                                  ? (nutritionData.carbs / portionCount).toFixed(1)
                                  : (nutritionData.carbs * 0.8).toFixed(1)}g
                              </p>
                              <p className="text-xs text-muted-foreground">{t.carbs}</p>
                            </Card>
                            <Card className="p-3 text-center">
                              <p className="text-2xl font-bold text-purple-500">
                                {portionMode === 'portion' 
                                  ? (nutritionData.fat / portionCount).toFixed(1)
                                  : (nutritionData.fat * 0.8).toFixed(1)}g
                              </p>
                              <p className="text-xs text-muted-foreground">{t.fat}</p>
                            </Card>
                            {nutritionData.fiber !== undefined && nutritionData.fiber > 0 && (
                              <Card className="p-3 text-center">
                                <p className="text-xl font-bold text-teal-500">
                                  {portionMode === 'portion' 
                                    ? (nutritionData.fiber / portionCount).toFixed(1)
                                    : (nutritionData.fiber * 0.8).toFixed(1)}g
                                </p>
                                <p className="text-xs text-muted-foreground">{t.fiber}</p>
                              </Card>
                            )}
                            {nutritionData.sugar !== undefined && nutritionData.sugar > 0 && (
                              <Card className="p-3 text-center">
                                <p className="text-xl font-bold text-pink-500">
                                  {portionMode === 'portion' 
                                    ? (nutritionData.sugar / portionCount).toFixed(1)
                                    : (nutritionData.sugar * 0.8).toFixed(1)}g
                                </p>
                                <p className="text-xs text-muted-foreground">{t.sugar}</p>
                              </Card>
                            )}
                          </div>
                        </div>

                        <Separator />

                        {/* Vitamins - Always Visible (5 items) */}
                        <div>
                          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                            <Leaf className="h-4 w-4 text-emerald-500" />
                            {t.vitamins}
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {nutritionData.vitaminA !== undefined && nutritionData.vitaminA > 0 && (
                              <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                <span>{t.vitaminA}</span>
                                <span className="font-semibold">
                                  {portionMode === 'portion' 
                                    ? Math.round(nutritionData.vitaminA / portionCount)
                                    : Math.round(nutritionData.vitaminA * 0.8)} IU
                                </span>
                              </div>
                            )}
                            {nutritionData.vitaminB1 !== undefined && nutritionData.vitaminB1 > 0 && (
                              <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                <span>{t.vitaminB1}</span>
                                <span className="font-semibold">
                                  {portionMode === 'portion' 
                                    ? (nutritionData.vitaminB1 / portionCount).toFixed(2)
                                    : (nutritionData.vitaminB1 * 0.8).toFixed(2)} mg
                                </span>
                              </div>
                            )}
                            {nutritionData.vitaminB2 !== undefined && nutritionData.vitaminB2 > 0 && (
                              <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                <span>{t.vitaminB2}</span>
                                <span className="font-semibold">
                                  {portionMode === 'portion' 
                                    ? (nutritionData.vitaminB2 / portionCount).toFixed(2)
                                    : (nutritionData.vitaminB2 * 0.8).toFixed(2)} mg
                                </span>
                              </div>
                            )}
                            {nutritionData.vitaminB3 !== undefined && nutritionData.vitaminB3 > 0 && (
                              <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                <span>{t.vitaminB3}</span>
                                <span className="font-semibold">
                                  {portionMode === 'portion' 
                                    ? (nutritionData.vitaminB3 / portionCount).toFixed(1)
                                    : (nutritionData.vitaminB3 * 0.8).toFixed(1)} mg
                                </span>
                              </div>
                            )}
                            {nutritionData.vitaminC !== undefined && nutritionData.vitaminC > 0 && (
                              <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                <span>{t.vitaminC}</span>
                                <span className="font-semibold">
                                  {portionMode === 'portion' 
                                    ? Math.round(nutritionData.vitaminC / portionCount)
                                    : Math.round(nutritionData.vitaminC * 0.8)} mg
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <Separator />

                        {/* Minerals - Collapsible */}
                        <div>
                          <button
                            onClick={() => setShowMinerals(!showMinerals)}
                            className="w-full flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <h3 className="text-base font-semibold flex items-center gap-2">
                              <Shield className="h-4 w-4 text-amber-500" />
                              {t.minerals}
                            </h3>
                            <span className="text-xs text-muted-foreground">
                              {showMinerals ? t.showLess : t.showMore}
                            </span>
                          </button>
                          
                          {showMinerals && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                              {nutritionData.calcium !== undefined && nutritionData.calcium > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.calcium}</span>
                                  <span className="font-semibold">
                                    {portionMode === 'portion' 
                                      ? Math.round(nutritionData.calcium / portionCount)
                                      : Math.round(nutritionData.calcium * 0.8)} mg
                                  </span>
                                </div>
                              )}
                              {nutritionData.iron !== undefined && nutritionData.iron > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.iron}</span>
                                  <span className="font-semibold">
                                    {portionMode === 'portion' 
                                      ? (nutritionData.iron / portionCount).toFixed(1)
                                      : (nutritionData.iron * 0.8).toFixed(1)} mg
                                  </span>
                                </div>
                              )}
                              {nutritionData.sodium !== undefined && nutritionData.sodium > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.sodium}</span>
                                  <span className="font-semibold">
                                    {portionMode === 'portion' 
                                      ? Math.round(nutritionData.sodium / portionCount)
                                      : Math.round(nutritionData.sodium * 0.8)} mg
                                  </span>
                                </div>
                              )}
                              {nutritionData.potassium !== undefined && nutritionData.potassium > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.potassium}</span>
                                  <span className="font-semibold">
                                    {portionMode === 'portion' 
                                      ? Math.round(nutritionData.potassium / portionCount)
                                      : Math.round(nutritionData.potassium * 0.8)} mg
                                  </span>
                                </div>
                              )}
                              {nutritionData.magnesium !== undefined && nutritionData.magnesium > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.magnesium}</span>
                                  <span className="font-semibold">
                                    {portionMode === 'portion' 
                                      ? Math.round(nutritionData.magnesium / portionCount)
                                      : Math.round(nutritionData.magnesium * 0.8)} mg
                                  </span>
                                </div>
                              )}
                              {nutritionData.zinc !== undefined && nutritionData.zinc > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.zinc}</span>
                                  <span className="font-semibold">
                                    {portionMode === 'portion' 
                                      ? (nutritionData.zinc / portionCount).toFixed(2)
                                      : (nutritionData.zinc * 0.8).toFixed(2)} mg
                                  </span>
                                </div>
                              )}
                              {nutritionData.phosphorus !== undefined && nutritionData.phosphorus > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.phosphorus}</span>
                                  <span className="font-semibold">
                                    {portionMode === 'portion' 
                                      ? Math.round(nutritionData.phosphorus / portionCount)
                                      : Math.round(nutritionData.phosphorus * 0.8)} mg
                                  </span>
                                </div>
                              )}
                              {nutritionData.copper !== undefined && nutritionData.copper > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.copper}</span>
                                  <span className="font-semibold">
                                    {portionMode === 'portion' 
                                      ? (nutritionData.copper / portionCount).toFixed(2)
                                      : (nutritionData.copper * 0.8).toFixed(2)} mg
                                  </span>
                                </div>
                              )}
                              {nutritionData.manganese !== undefined && nutritionData.manganese > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.manganese}</span>
                                  <span className="font-semibold">
                                    {portionMode === 'portion' 
                                      ? (nutritionData.manganese / portionCount).toFixed(2)
                                      : (nutritionData.manganese * 0.8).toFixed(2)} mg
                                  </span>
                                </div>
                              )}
                              {nutritionData.selenium !== undefined && nutritionData.selenium > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.selenium}</span>
                                  <span className="font-semibold">
                                    {portionMode === 'portion' 
                                      ? (nutritionData.selenium / portionCount).toFixed(2)
                                      : (nutritionData.selenium * 0.8).toFixed(2)} µg
                                  </span>
                                </div>
                              )}
                              {nutritionData.cholesterol !== undefined && nutritionData.cholesterol > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.cholesterol}</span>
                                  <span className="font-semibold">
                                    {portionMode === 'portion' 
                                      ? Math.round(nutritionData.cholesterol / portionCount)
                                      : Math.round(nutritionData.cholesterol * 0.8)} mg
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Amino Acids - Collapsible */}
                        <div>
                          <button
                            onClick={() => setShowAminoAcids(!showAminoAcids)}
                            className="w-full flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <h3 className="text-base font-semibold flex items-center gap-2">
                              <Leaf className="h-4 w-4 text-green-600" />
                              {t.aminoAcids}
                            </h3>
                            <span className="text-xs text-muted-foreground">
                              {showAminoAcids ? t.showLess : t.showMore}
                            </span>
                          </button>
                          
                          {showAminoAcids && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                              {nutritionData.alanina !== undefined && nutritionData.alanina > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.alanine}</span>
                                  <span className="font-semibold">{(nutritionData.alanina / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                              {nutritionData.arginina !== undefined && nutritionData.arginina > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.arginine}</span>
                                  <span className="font-semibold">{(nutritionData.arginina / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                              {nutritionData.acidoAspartico !== undefined && nutritionData.acidoAspartico > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.asparticAcid}</span>
                                  <span className="font-semibold">{(nutritionData.acidoAspartico / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                              {nutritionData.cisteina !== undefined && nutritionData.cisteina > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.cysteine}</span>
                                  <span className="font-semibold">{(nutritionData.cisteina / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                              {nutritionData.acidoGlutamico !== undefined && nutritionData.acidoGlutamico > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.glutamicAcid}</span>
                                  <span className="font-semibold">{(nutritionData.acidoGlutamico / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                              {nutritionData.glicina !== undefined && nutritionData.glicina > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.glycine}</span>
                                  <span className="font-semibold">{(nutritionData.glicina / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                              {nutritionData.histidina !== undefined && nutritionData.histidina > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.histidine}</span>
                                  <span className="font-semibold">{(nutritionData.histidina / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                              {nutritionData.isoleucina !== undefined && nutritionData.isoleucina > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.isoleucine}</span>
                                  <span className="font-semibold">{(nutritionData.isoleucina / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                              {nutritionData.leucina !== undefined && nutritionData.leucina > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.leucine}</span>
                                  <span className="font-semibold">{(nutritionData.leucina / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                              {nutritionData.lisina !== undefined && nutritionData.lisina > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.lysine}</span>
                                  <span className="font-semibold">{(nutritionData.lisina / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                              {nutritionData.metionina !== undefined && nutritionData.metionina > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.methionine}</span>
                                  <span className="font-semibold">{(nutritionData.metionina / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                              {nutritionData.fenilalanina !== undefined && nutritionData.fenilalanina > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.phenylalanine}</span>
                                  <span className="font-semibold">{(nutritionData.fenilalanina / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                              {nutritionData.prolina !== undefined && nutritionData.prolina > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.proline}</span>
                                  <span className="font-semibold">{(nutritionData.prolina / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                              {nutritionData.serina !== undefined && nutritionData.serina > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.serine}</span>
                                  <span className="font-semibold">{(nutritionData.serina / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                              {nutritionData.treonina !== undefined && nutritionData.treonina > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.threonine}</span>
                                  <span className="font-semibold">{(nutritionData.treonina / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                              {nutritionData.triptofano !== undefined && nutritionData.triptofano > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.tryptophan}</span>
                                  <span className="font-semibold">{(nutritionData.triptofano / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                              {nutritionData.tirosina !== undefined && nutritionData.tirosina > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.tyrosine}</span>
                                  <span className="font-semibold">{(nutritionData.tirosina / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                              {nutritionData.valina !== undefined && nutritionData.valina > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.valine}</span>
                                  <span className="font-semibold">{(nutritionData.valina / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Fatty Acids - Collapsible */}
                        <div>
                          <button
                            onClick={() => setShowFattyAcids(!showFattyAcids)}
                            className="w-full flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <h3 className="text-base font-semibold flex items-center gap-2">
                              <Heart className="h-4 w-4 text-orange-500" />
                              {t.fattyAcids}
                            </h3>
                            <span className="text-xs text-muted-foreground">
                              {showFattyAcids ? t.showLess : t.showMore}
                            </span>
                          </button>
                          
                          {showFattyAcids && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                              {nutritionData.acidosGrasosSaturados !== undefined && nutritionData.acidosGrasosSaturados > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.saturatedFattyAcids}</span>
                                  <span className="font-semibold">{(nutritionData.acidosGrasosSaturados / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                              {nutritionData.acidoMiristico !== undefined && nutritionData.acidoMiristico > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.myristicAcid}</span>
                                  <span className="font-semibold">{(nutritionData.acidoMiristico / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                              {nutritionData.acidoPalmitico !== undefined && nutritionData.acidoPalmitico > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.palmiticAcid}</span>
                                  <span className="font-semibold">{(nutritionData.acidoPalmitico / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                              {nutritionData.acidoEsteaico !== undefined && nutritionData.acidoEsteaico > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.stearicAcid}</span>
                                  <span className="font-semibold">{(nutritionData.acidoEsteaico / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                              {nutritionData.acidoOleico !== undefined && nutritionData.acidoOleico > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.oleicAcid}</span>
                                  <span className="font-semibold">{(nutritionData.acidoOleico / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                              {nutritionData.acidoLinoleico !== undefined && nutritionData.acidoLinoleico > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.linoleicAcid}</span>
                                  <span className="font-semibold">{(nutritionData.acidoLinoleico / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                              {nutritionData.acidoLinolenico !== undefined && nutritionData.acidoLinolenico > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.linolenicAcid}</span>
                                  <span className="font-semibold">{(nutritionData.acidoLinolenico / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                              {nutritionData.acidoLaurico !== undefined && nutritionData.acidoLaurico > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.lauricAcid}</span>
                                  <span className="font-semibold">{(nutritionData.acidoLaurico / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                              {nutritionData.acidoPalmitoleico !== undefined && nutritionData.acidoPalmitoleico > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.palmitoleicAcid}</span>
                                  <span className="font-semibold">{(nutritionData.acidoPalmitoleico / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Other Nutrients - Collapsible */}
                        <div>
                          <button
                            onClick={() => setShowOther(!showOther)}
                            className="w-full flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <h3 className="text-base font-semibold flex items-center gap-2">
                              <Info className="h-4 w-4 text-gray-500" />
                              {t.otherNutrients}
                            </h3>
                            <span className="text-xs text-muted-foreground">
                              {showOther ? t.showLess : t.showMore}
                            </span>
                          </button>
                          
                          {showOther && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                              {nutritionData.humedad !== undefined && nutritionData.humedad > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.moisture}</span>
                                  <span className="font-semibold">{(nutritionData.humedad / (portionMode === 'portion' ? portionCount : 1)).toFixed(1)} g</span>
                                </div>
                              )}
                              {nutritionData.cenizas !== undefined && nutritionData.cenizas > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.ash}</span>
                                  <span className="font-semibold">{(nutritionData.cenizas / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                              {nutritionData.almidon !== undefined && nutritionData.almidon > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.starch}</span>
                                  <span className="font-semibold">{(nutritionData.almidon / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                              {nutritionData.lactosa !== undefined && nutritionData.lactosa > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.lactose}</span>
                                  <span className="font-semibold">{(nutritionData.lactosa / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} g</span>
                                </div>
                              )}
                              {nutritionData.betaCarotenos !== undefined && nutritionData.betaCarotenos > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.betaCarotenes}</span>
                                  <span className="font-semibold">{(nutritionData.betaCarotenos / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} mg</span>
                                </div>
                              )}
                              {nutritionData.carotenos !== undefined && nutritionData.carotenos > 0 && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                                  <span>{t.carotenes}</span>
                                  <span className="font-semibold">{(nutritionData.carotenos / (portionMode === 'portion' ? portionCount : 1)).toFixed(2)} mg</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Transparency Button */}
                        <Separator className="my-4" />
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setNutritionWorkspaceOpen(true)}
                        >
                          <Table className="h-4 w-4 mr-2" />
                          {language === 'es' ? 'Ver Datos Detallados de Nutrición' : 'View Detailed Nutrition Data'}
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  {/* Bioactive Compounds Tab */}
                  <TabsContent value="bioactive" className="mt-3 space-y-4">
                    <Alert>
                      <Leaf className="h-4 w-4" />
                      <AlertTitle>{t.bioactiveTitle}</AlertTitle>
                      <AlertDescription className="text-xs">
                        {t.bioactiveDescription}
                      </AlertDescription>
                    </Alert>
                    
                    {/* Bioactive Stats */}
                    {bioactiveStats && (
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <Card className="p-2">
                          <p className="text-lg font-bold text-emerald-600">{bioactiveStats.totalCompounds}</p>
                          <p className="text-xs text-muted-foreground">{language === 'es' ? 'Compuestos' : 'Compounds'}</p>
                        </Card>
                        <Card className="p-2">
                          <p className="text-lg font-bold text-blue-600">{bioactiveStats.matchedIngredients}/{bioactiveStats.totalIngredients}</p>
                          <p className="text-xs text-muted-foreground">{language === 'es' ? 'Ingredientes' : 'Ingredients'}</p>
                        </Card>
                        <Card className="p-2">
                          <p className="text-lg font-bold text-purple-600">{bioactiveStats.compoundsWithADI || 0}</p>
                          <p className="text-xs text-muted-foreground">{language === 'es' ? 'Con ADI' : 'With ADI'}</p>
                        </Card>
                        <Card className="p-2">
                          <p className="text-lg font-bold text-amber-600">{bioactiveStats.compoundsWithWarnings}</p>
                          <p className="text-xs text-muted-foreground">{language === 'es' ? 'Advertencias' : 'Warnings'}</p>
                        </Card>
                      </div>
                    )}

                    {aiLoading ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-8 w-8 mx-auto animate-spin text-emerald-500 mb-3" />
                        <p className="text-muted-foreground">{t.loadingAnalysis}</p>
                      </div>
                    ) : groupedBioactives.length > 0 ? (
                      <div className="space-y-4">
                        {/* Group by ingredient */}
                        {groupedBioactives.map((group, groupIdx) => (
                          <Card key={groupIdx} className={`overflow-hidden ${group.isMatched ? '' : 'opacity-60'}`}>
                            <CardHeader className="pb-2 bg-muted/30">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                  {group.isMatched ? (
                                    <Leaf className="h-4 w-4 text-emerald-500" />
                                  ) : (
                                    <X className="h-4 w-4 text-gray-400" />
                                  )}
                                  {group.ingredient}
                                  {group.measure && (
                                    <span className="text-xs font-normal text-muted-foreground">
                                      ({group.measure})
                                    </span>
                                  )}
                                </CardTitle>
                                <Badge variant={group.isMatched ? "default" : "outline"} className="text-xs">
                                  {group.isMatched 
                                    ? `${group.matchCount} ${language === 'es' ? 'compuestos' : 'compounds'}`
                                    : (language === 'es' ? 'No encontrado' : 'Not found')
                                  }
                                </Badge>
                              </div>
                            </CardHeader>
                            
                            {group.isMatched && group.compounds.length > 0 && (
                              <CardContent className="pt-4">
                                <div className="space-y-3">
                                  {group.compounds.slice(0, 5).map((compound, i) => {
                                    // Calculate dose values
                                    const estimatedDose = typeof compound.estimatedAmount === 'number' && compound.estimatedAmount > 0 
                                      ? compound.estimatedAmount 
                                      : 50 + (i * 20)
                                    const beneficialDose = typeof compound.beneficialDose === 'number' && compound.beneficialDose > 0 
                                      ? compound.beneficialDose 
                                      : Math.round(estimatedDose * 1.5)
                                    const upperLimit = typeof compound.upperLimit === 'number' && compound.upperLimit > 0 
                                      ? compound.upperLimit 
                                      : beneficialDose * 10
                                    const toxicThreshold = upperLimit * 0.5
                                    const timesBelowToxic = Math.round(toxicThreshold / estimatedDose)
                                    
                                    // Determine risk level
                                    const riskLevel = timesBelowToxic > 10 ? 'low' : timesBelowToxic > 5 ? 'moderate' : 'high'
                                    const riskColors = {
                                      low: { badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200', text: t.lowRisk },
                                      moderate: { badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200', text: t.moderateRisk },
                                      high: { badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', text: t.highRisk }
                                    }
                                    
                                    // Get actual food sources
                                    const foodSources = compound.foodSources || []
                                    const primaryFoodSource = foodSources[0] || group.ingredient.toLowerCase()
                                    
                                    return (
                                      <div key={i} className="p-3 rounded-lg bg-muted/20 border space-y-3">
                                        {/* Compound header */}
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm font-medium">{compound.name}</span>
                                          <div className="flex items-center gap-1.5">
                                            <Badge variant="outline" className="text-[10px]">{compound.source}</Badge>
                                            <Badge className={`text-[10px] ${riskColors[riskLevel].badge}`}>
                                              {riskColors[riskLevel].text}
                                            </Badge>
                                          </div>
                                        </div>
                                        
                                        {/* Dose info - simplified */}
                                        <div className="flex items-center justify-between text-xs">
                                          <span className="text-muted-foreground">{t.yourDose}</span>
                                          <span className="font-semibold">{estimatedDose} mg</span>
                                        </div>
                                        
                                        {/* EFSA Safety Data - ADI/TDI values */}
                                        {compound.efsaToxicity?.found && (
                                          <div className="p-2 rounded bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                                            <div className="flex items-center gap-2 mb-1">
                                              <Shield className="h-3 w-3 text-purple-600" />
                                              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                                                EFSA {compound.efsaToxicity.hbgvType || 'Safety Data'}
                                              </span>
                                            </div>
                                            <div className="space-y-1 text-xs">
                                              {compound.efsaToxicity.adi && (
                                                <div className="flex justify-between">
                                                  <span className="text-muted-foreground">ADI:</span>
                                                  <span className="font-semibold">{compound.efsaToxicity.adi} mg/kg/day</span>
                                                </div>
                                              )}
                                              {compound.efsaToxicity.tdi && (
                                                <div className="flex justify-between">
                                                  <span className="text-muted-foreground">TDI:</span>
                                                  <span className="font-semibold">{compound.efsaToxicity.tdi} mg/kg/day</span>
                                                </div>
                                              )}
                                              {compound.efsaToxicity.noael && (
                                                <div className="flex justify-between">
                                                  <span className="text-muted-foreground">NOAEL:</span>
                                                  <span className="font-semibold">{compound.efsaToxicity.noael} mg/kg/day</span>
                                                </div>
                                              )}
                                              {compound.efsaToxicity.ul && (
                                                <div className="flex justify-between">
                                                  <span className="text-muted-foreground">UL:</span>
                                                  <span className="font-semibold">{compound.efsaToxicity.ul} mg/day</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Compound Warnings from CompTox */}
                                        {compound.comptoxToxicity?.warnings && compound.comptoxToxicity.warnings.length > 0 && (
                                          <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                                            <div className="flex items-center gap-2 mb-1">
                                              <AlertTriangle className="h-3 w-3 text-amber-600" />
                                              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                                                {language === 'es' ? 'Advertencias' : 'Warnings'}
                                              </span>
                                            </div>
                                            <ul className="text-xs space-y-0.5">
                                              {compound.comptoxToxicity.warnings.slice(0, 2).map((w, idx) => (
                                                <li key={idx} className="text-muted-foreground">• {w}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                        
                                        {/* Natural Food Sources - show only if no EFSA data */}
                                        {!compound.efsaToxicity?.found && foodSources.length > 0 && (
                                          <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                                            <div className="flex items-center gap-2 mb-1">
                                              <Leaf className="h-3 w-3 text-emerald-600" />
                                              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                                {t.naturalFoodSource}
                                              </span>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                              {foodSources.slice(0, 4).map((fs, idx) => (
                                                <Badge key={idx} variant="secondary" className="text-[10px]">
                                                  {fs}
                                                </Badge>
                                              ))}
                                              {foodSources.length > 4 && (
                                                <Badge variant="secondary" className="text-[10px]">
                                                  +{foodSources.length - 4} {language === 'es' ? 'más' : 'more'}
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Health Benefits - collapsible */}
                                        {compound.benefits.length > 0 && (
                                          <details className="text-xs">
                                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                              {t.healthBenefits}
                                            </summary>
                                            <ul className="mt-1 space-y-0.5 pl-4">
                                              {compound.benefits.slice(0, 3).map((benefit, j) => (
                                                <li key={j} className="flex items-start gap-1.5 text-muted-foreground">
                                                  <Heart className="h-2.5 w-2.5 text-rose-500 mt-0.5 shrink-0" />
                                                  {benefit}
                                                </li>
                                              ))}
                                            </ul>
                                          </details>
                                        )}
                                      </div>
                                    )
                                  })}
                                  
                                  {group.compounds.length > 5 && (
                                    <p className="text-xs text-center text-muted-foreground">
                                      +{group.compounds.length - 5} {language === 'es' ? 'compuestos más' : 'more compounds'}
                                    </p>
                                  )}
                                </div>
                              </CardContent>
                            )}
                            
                            {!group.isMatched && (
                              <CardContent className="pt-4">
                                <p className="text-xs text-muted-foreground text-center">
                                  {language === 'es' 
                                    ? 'No se encontraron compuestos bioactivos para este ingrediente'
                                    : 'No bioactive compounds found for this ingredient'
                                  }
                                </p>
                              </CardContent>
                            )}
                          </Card>
                        ))}
                      </div>
                    ) : bioactiveCompounds.length > 0 ? (
                      /* Fallback to flat list if grouped not available */
                      <div className="space-y-4">
                        {bioactiveCompounds.slice(0, 10).map((compound, i) => {
                          const estimatedDose = typeof compound.estimatedAmount === 'number' && compound.estimatedAmount > 0 
                            ? compound.estimatedAmount 
                            : 50 + (i * 20)
                          const foodSources = compound.foodSources || []
                          
                          return (
                            <Card key={i} className="overflow-hidden">
                              <CardHeader className="pb-2 bg-muted/30">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-base flex items-center gap-2">
                                    <Leaf className="h-4 w-4 text-emerald-500" />
                                    {compound.name}
                                  </CardTitle>
                                  <Badge variant="outline" className="text-xs">{compound.source}</Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="pt-4">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">{t.yourDose}</span>
                                    <span className="font-semibold">{estimatedDose} mg</span>
                                  </div>
                                  
                                  {/* Food Sources */}
                                  {foodSources.length > 0 && (
                                    <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Leaf className="h-3 w-3 text-emerald-600" />
                                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                          {t.naturalFoodSource}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {foodSources.slice(0, 4).map((fs, idx) => (
                                          <Badge key={idx} variant="secondary" className="text-[10px]">
                                            {fs}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Health Benefits */}
                                  {compound.benefits.length > 0 && (
                                    <div>
                                      <p className="text-xs font-medium mb-1">{t.healthBenefits}</p>
                                      <ul className="space-y-0.5">
                                        {compound.benefits.slice(0, 2).map((benefit, j) => (
                                          <li key={j} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                            <Heart className="h-2.5 w-2.5 text-rose-500 mt-0.5 shrink-0" />
                                            {benefit}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        {!aiLoaded ? (
                          <>
                            <Button onClick={loadAiAnalysis} variant="outline" className="mb-3">
                              <Leaf className="h-4 w-4 mr-2" />
                              {t.clickToLoad}
                            </Button>
                          </>
                        ) : (
                          <>
                            <Leaf className="h-10 w-10 mx-auto mb-3 opacity-50" />
                            <p className="text-muted-foreground text-sm">{t.noBioactive}</p>
                          </>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  {/* Food Safety Tab */}
                  <TabsContent value="safety" className="mt-3 space-y-4">
                    <Alert>
                      <Shield className="h-4 w-4" />
                      <AlertTitle>{t.safetyTitle}</AlertTitle>
                      <AlertDescription className="text-xs">
                        {t.safetyDescription}
                      </AlertDescription>
                    </Alert>

                    {aiLoading ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-8 w-8 mx-auto animate-spin text-emerald-500 mb-3" />
                        <p className="text-muted-foreground">{t.loadingAnalysis}</p>
                      </div>
                    ) : foodSafetyData.length > 0 ? (
                      <div className="space-y-3">
                        {foodSafetyData.map((safety, i) => (
                          <Card key={i}>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                {safety.ingredient}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {safety.hazards.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-destructive mb-1">{t.potentialHazards}</p>
                                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                                      {safety.hazards.map((hazard, j) => (
                                        <li key={j}>{hazard}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {safety.safeHandling.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium mb-1">{t.safeHandling}</p>
                                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                                      {safety.safeHandling.map((tip, j) => (
                                        <li key={j}>{tip}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {safety.storageTips.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium mb-1">{t.storageTips}</p>
                                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                                      {safety.storageTips.map((tip, j) => (
                                        <li key={j}>{tip}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {safety.cookingTemp && (
                                  <Alert className="py-2">
                                    <Info className="h-3 w-3" />
                                    <AlertDescription className="text-xs">
                                      {t.cookingTemp} {safety.cookingTemp}
                                    </AlertDescription>
                                  </Alert>
                                )}
                                {safety.allergenInfo && safety.allergenInfo.length > 0 && (
                                  <Alert variant="destructive" className="py-2">
                                    <AlertTriangle className="h-3 w-3" />
                                    <AlertTitle className="text-xs">{t.allergenWarning}</AlertTitle>
                                    <AlertDescription className="text-xs">
                                      {safety.allergenInfo.join(', ')}
                                    </AlertDescription>
                                  </Alert>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        {!aiLoaded ? (
                          <>
                            <Button onClick={loadAiAnalysis} variant="outline" className="mb-3">
                              <Shield className="h-4 w-4 mr-2" />
                              {t.clickToLoad}
                            </Button>
                          </>
                        ) : (
                          <>
                            <Shield className="h-10 w-10 mx-auto mb-3 opacity-50" />
                            <p className="text-muted-foreground text-sm">{t.noSafety}</p>
                          </>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  {/* Chef Mode Tab */}
                  <TabsContent value="chef" className="mt-3 space-y-4">
                    <Alert>
                      <Volume2 className="h-4 w-4" />
                      <AlertTitle>{t.chefModeTitle}</AlertTitle>
                      <AlertDescription className="text-xs">
                        {t.chefModeDescription}
                      </AlertDescription>
                    </Alert>

                    {selectedMeal.strInstructionsList && selectedMeal.strInstructionsList.length > 0 && (
                      <div className="space-y-3">
                        {/* Progress */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>{t.step} {currentStep + 1} {t.of} {selectedMeal.strInstructionsList.length}</span>
                            <span>{isSpeaking ? t.speaking : isPlaying ? t.playing : t.ready}</span>
                          </div>
                          <Progress value={((currentStep + 1) / selectedMeal.strInstructionsList.length) * 100} />
                        </div>

                        {/* Current Step Display */}
                        <Card className="p-4">
                          <div className="flex items-start gap-3">
                            <Badge variant="default" className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center bg-emerald-600 text-sm">
                              {currentStep + 1}
                            </Badge>
                            <p className="text-sm leading-relaxed">{selectedMeal.strInstructionsList[currentStep]}</p>
                          </div>
                        </Card>

                        {/* Controls */}
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePrevStep}
                            disabled={currentStep === 0}
                          >
                            <SkipBack className="h-4 w-4 mr-1" />
                            {t.previous}
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handlePlayAll}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            {isPlaying ? (
                              <>
                                <Pause className="h-4 w-4 mr-1" />
                                {t.playing}
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-1" />
                                {t.playAll}
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleNextStep}
                            disabled={currentStep === selectedMeal.strInstructionsList.length - 1}
                          >
                            {t.next}
                            <SkipForward className="h-4 w-4 ml-1" />
                          </Button>
                        </div>

                        {/* Step List */}
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">{t.allSteps}</h4>
                          <div className="max-h-32 overflow-y-auto space-y-1 pr-2">
                            {selectedMeal.strInstructionsList.map((step, i) => (
                              <button
                                key={i}
                                onClick={() => handlePlayStep(i)}
                                className={`w-full text-left p-2 rounded-lg transition-colors text-xs ${
                                  i === currentStep
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-muted/50 hover:bg-muted'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{t.step} {i + 1}</span>
                                  {i === currentStep && isSpeaking && (
                                    <Volume2 className="h-3 w-3 animate-pulse" />
                                  )}
                                </div>
                                <p className={`mt-0.5 line-clamp-1 ${i === currentStep ? 'text-white/80' : 'text-muted-foreground'}`}>
                                  {step.substring(0, 60)}...
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* File Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-emerald-500" />
              {t.uploadTitle}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {t.uploadDescription}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="upload" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="upload" className="text-xs sm:text-sm">
                <Upload className="h-4 w-4 mr-1" />
                {language === 'es' ? 'Subir' : 'Upload'}
              </TabsTrigger>
              <TabsTrigger value="nutrition" className="text-xs sm:text-sm">
                <Database className="h-4 w-4 mr-1" />
                {language === 'es' ? 'Nutrición' : 'Nutrition'}
              </TabsTrigger>
              <TabsTrigger value="phytohub" className="text-xs sm:text-sm">
                <Leaf className="h-4 w-4 mr-1" />
                PhytoHub
              </TabsTrigger>
              <TabsTrigger value="efsa" className="text-xs sm:text-sm">
                <AlertTriangle className="h-4 w-4 mr-1" />
                EFSA
              </TabsTrigger>
            </TabsList>
            
            {/* Upload Tab */}
            <TabsContent value="upload" className="flex-1 overflow-y-auto space-y-4 py-4 m-0">
              {/* Upload Section */}
              <div className="space-y-3">
                {/* Category Selection */}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm font-medium">{t.selectCategory}:</span>
                  <Select value={uploadCategory} onValueChange={setUploadCategory}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nutrition-csv">{t.nutritionCsv}</SelectItem>
                      <SelectItem value="toxins-pdf">{t.toxinsPdf}</SelectItem>
                      <SelectItem value="recipes-pdf">{t.recipesPdf}</SelectItem>
                      <SelectItem value="reference-docs">{t.referenceDocs}</SelectItem>
                      <SelectItem value="general">{t.generalFiles}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* File Input */}
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".csv,.pdf,.xlsx,.xls,.json,.txt"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="mb-2"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t.uploading}
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {t.selectFile}
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">{t.dragDropHint}</p>
                  <p className="text-xs text-muted-foreground">{t.maxFileSize}</p>
                </div>
              </div>
              
              <Separator />
              
              {/* Uploaded Files List */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t.uploadedFiles}
                </h3>
                
                {uploadedFiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">{t.noFiles}</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {uploadedFiles.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span className="font-medium text-sm truncate">{file.originalName}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {getCategoryLabel(file.category)}
                            </Badge>
                            <span>{formatFileSize(file.size)}</span>
                            <span>•</span>
                            <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteFile(file.category, file.name)}
                          className="text-destructive hover:text-destructive shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Nutrition Import Tab */}
            <TabsContent value="nutrition" className="flex-1 overflow-y-auto space-y-4 py-4 m-0">
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Database className="h-4 w-4 text-emerald-500" />
                  {t.importNutritionDb}
                </h3>
                <p className="text-xs text-muted-foreground">{t.importDescription}</p>
                
                {/* Database Stats */}
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <Info className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium">
                    {t.databaseStats}: <span className="text-emerald-600 dark:text-emerald-400">{dbStats.totalFoods.toLocaleString()}</span> {t.foodsInDb}
                  </span>
                </div>
                
                {/* Available CSV Files */}
                {csvFiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">{t.noCsvFiles}</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-medium">{t.availableFiles}:</p>
                    {csvFiles.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                            <span className="font-medium text-sm truncate">{file.name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {getCategoryLabel(file.category)}
                            </Badge>
                            <span>{formatFileSize(file.size)}</span>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleImportCsv(file.path)}
                          disabled={importing}
                          size="sm"
                          className="shrink-0"
                        >
                          {importing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              {t.importing}
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-1" />
                              {t.importFile}
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Import Result */}
                {importResult && (
                  <div className={`p-4 rounded-lg border ${importResult.success ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'}`}>
                    <h4 className={`font-semibold text-sm mb-2 ${importResult.success ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                      {importResult.success ? t.importSuccess : 'Import Failed'}
                    </h4>
                    {importResult.success && importResult.stats ? (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t.totalRows}:</span>
                          <span className="font-medium">{importResult.stats.totalRows.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t.uniqueFoods}:</span>
                          <span className="font-medium">{importResult.stats.uniqueFoods.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t.duplicatesRemoved}:</span>
                          <span className="font-medium text-amber-600">{importResult.stats.duplicatesRemoved.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t.inserted}:</span>
                          <span className="font-medium text-emerald-600">{importResult.stats.inserted.toLocaleString()}</span>
                        </div>
                        {importResult.stats.errors > 0 && (
                          <div className="flex justify-between col-span-2">
                            <span className="text-muted-foreground">{t.errors}:</span>
                            <span className="font-medium text-red-600">{importResult.stats.errors}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-red-600">{importResult.error}</p>
                    )}
                    
                    {/* Duplicate Details Toggle */}
                    {importResult.success && importResult.duplicateDetails && importResult.duplicateDetails.length > 0 && (
                      <details className="mt-3">
                        <summary className="text-xs cursor-pointer text-emerald-600 hover:text-emerald-700">
                          {t.viewDuplicates} ({importResult.duplicateDetails.length} items)
                        </summary>
                        <div className="mt-2 max-h-32 overflow-y-auto text-xs space-y-1">
                          {importResult.duplicateDetails.map((dup, i) => (
                            <div key={i} className="flex justify-between p-1 rounded bg-muted/50">
                              <span className="truncate flex-1">{dup.name}</span>
                              <span className="text-muted-foreground ml-2">{dup.count} → 1</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* PhytoHub Import Tab */}
            <TabsContent value="phytohub" className="flex-1 overflow-y-auto space-y-4 py-4 m-0">
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Leaf className="h-4 w-4 text-teal-500" />
                  {t.phytoHubImport}
                </h3>
                <p className="text-xs text-muted-foreground">{t.phytoHubDescription}</p>
                
                {/* PhytoHub Database Stats */}
                <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800">
                  <div className="text-center">
                    <span className="text-lg font-bold text-teal-600 dark:text-teal-400">{phytoHubStats.totalCompounds.toLocaleString()}</span>
                    <p className="text-xs text-muted-foreground">{t.compoundsInDb}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-lg font-bold text-teal-600 dark:text-teal-400">{phytoHubStats.totalFoods.toLocaleString()}</span>
                    <p className="text-xs text-muted-foreground">{t.foodsIndexed}</p>
                  </div>
                </div>
                
                {/* Available PhytoHub Files - Scanned from user-uploads directory */}
                {phytoHubFiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">{t.noPhytoHubFiles}</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-medium">{t.availableFiles}:</p>
                    {phytoHubFiles.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-teal-500 shrink-0" />
                            <span className="font-medium text-sm truncate">{file.name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {file.category || 'general'}
                            </Badge>
                            <span>{formatFileSize(file.size)}</span>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleImportPhytoHub(file.path)}
                          disabled={phytoHubImporting}
                          size="sm"
                          className="shrink-0"
                        >
                          {phytoHubImporting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              {t.importing}
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-1" />
                              {t.importFile}
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* PhytoHub Import Result */}
                {phytoHubResult && (
                  <div className={`p-4 rounded-lg border ${phytoHubResult.success ? 'bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'}`}>
                    <h4 className={`font-semibold text-sm mb-2 ${phytoHubResult.success ? 'text-teal-700 dark:text-teal-300' : 'text-red-700 dark:text-red-300'}`}>
                      {phytoHubResult.success ? t.importSuccess : 'Import Failed'}
                    </h4>
                    {phytoHubResult.success && phytoHubResult.stats ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t.totalRows}:</span>
                            <span className="font-medium">{phytoHubResult.stats.totalRows.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t.inserted}:</span>
                            <span className="font-medium text-teal-600">{phytoHubResult.stats.imported.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t.duplicatesRemoved}:</span>
                            <span className="font-medium text-amber-600">{phytoHubResult.stats.skipped.toLocaleString()}</span>
                          </div>
                          {phytoHubResult.stats.errors > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t.errors}:</span>
                              <span className="font-medium text-red-600">{phytoHubResult.stats.errors}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Column Mapping Details */}
                        {phytoHubResult.columnMapping && (
                          <details className="mt-2">
                            <summary className="text-xs cursor-pointer text-teal-600 hover:text-teal-700">
                              {t.columnMapping}
                            </summary>
                            <div className="mt-2 max-h-32 overflow-y-auto text-xs space-y-1">
                              {Object.entries(phytoHubResult.columnMapping).map(([field, colName]) => (
                                <div key={field} className="flex justify-between p-1 rounded bg-muted/50">
                                  <span className="text-muted-foreground">{field}</span>
                                  <span className="font-medium">{colName as string}</span>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-red-600">{phytoHubResult.error}</p>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* EFSA Import Tab */}
            <TabsContent value="efsa" className="flex-1 overflow-y-auto space-y-4 py-4 m-0">
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  {t.efsaImport}
                </h3>
                <p className="text-xs text-muted-foreground">{t.efsaDescription}</p>

                {/* EFSA Database Stats */}
                <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                  <div className="text-center">
                    <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{efsaStats.totalEFSA.toLocaleString()}</span>
                    <p className="text-xs text-muted-foreground">{t.substancesInDb}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{efsaStats.matchedToPhytoHub.toLocaleString()}</span>
                    <p className="text-xs text-muted-foreground">{t.matchedCompounds}</p>
                  </div>
                </div>

                {/* Available EFSA Files */}
                {efsaFiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">{t.noEfsaFiles}</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-medium">{t.availableFiles}:</p>
                    {efsaFiles.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-orange-500 shrink-0" />
                            <span className="font-medium text-sm truncate">{file.name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">OpenFoodTox</Badge>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleImportEfsa(file.name)}
                          disabled={efsaImporting}
                          size="sm"
                          className="shrink-0"
                        >
                          {efsaImporting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              {t.importing}
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-1" />
                              {t.importFile}
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* EFSA Import Result */}
                {efsaResult && (
                  <div className={`p-4 rounded-lg border ${efsaResult.success ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'}`}>
                    <h4 className={`font-semibold text-sm mb-2 ${efsaResult.success ? 'text-orange-700 dark:text-orange-300' : 'text-red-700 dark:text-red-300'}`}>
                      {efsaResult.success ? t.importSuccess : 'Import Failed'}
                    </h4>
                    {efsaResult.success ? (
                      <div className="space-y-2">
                        {/* Parse Stats */}
                        {efsaResult.parseStats && (
                          <div className="grid grid-cols-2 gap-2 text-xs mb-3 p-2 rounded bg-muted/50">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t.totalRecords}:</span>
                              <span className="font-medium">{efsaResult.parseStats.totalRecords.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t.uniqueSubstances}:</span>
                              <span className="font-medium">{efsaResult.parseStats.uniqueSubstances.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t.withADI}:</span>
                              <span className="font-medium text-orange-600">{efsaResult.parseStats.withADI.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t.withNOAEL}:</span>
                              <span className="font-medium text-amber-600">{efsaResult.parseStats.withNOAEL.toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                        {/* Import Stats */}
                        {efsaResult.stats && (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t.inserted}:</span>
                              <span className="font-medium text-orange-600">{efsaResult.stats.imported.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t.duplicatesRemoved}:</span>
                              <span className="font-medium text-amber-600">{efsaResult.stats.skipped.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between col-span-2">
                              <span className="text-muted-foreground">{t.matchedCompounds}:</span>
                              <span className="font-medium text-teal-600">{efsaResult.stats.matchedToPhytoHub.toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-red-600">{efsaResult.error}</p>
                    )}
                  </div>
                )}

                {/* Info about EFSA */}
                <div className="text-xs text-muted-foreground p-2 rounded-lg bg-muted/30">
                  <p>
                    <strong>Source:</strong>{' '}
                    <a 
                      href="https://zenodo.org/records/8120114" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-orange-600 hover:underline"
                    >
                      EFSA OpenFoodTox (Zenodo)
                    </a>
                  </p>
                  <p className="mt-1">
                    Contains: ADI, TDI, UL, ARfD, NOAEL, LOAEL values for 5,700+ substances
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Word Classification Dialog */}
      <WordClassificationDialog
        open={wordClassificationOpen}
        onOpenChange={setWordClassificationOpen}
      />

      {/* Hierarchy Review Dialog */}
      <Dialog open={hierarchyReviewOpen} onOpenChange={setHierarchyReviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {language === 'es' ? 'Revisión de Jerarquía' : 'Hierarchy Review'}
            </DialogTitle>
            <DialogDescription>
              {language === 'es' 
                ? 'Revisa y confirma las relaciones padre-hijo entre ingredientes'
                : 'Review and confirm parent-child relationships between ingredients'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto py-4">
            <HierarchyReview language={language} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Classification Workspace - Full Screen */}
      {classificationWorkspaceOpen && (
        <div className="fixed inset-0 z-50 bg-background">
          <IngredientClassificationWorkspace onClose={() => setClassificationWorkspaceOpen(false)} />
        </div>
      )}

      {/* Nutrition Transparency Workspace - Full Screen */}
      {nutritionWorkspaceOpen && selectedMeal && (
        <NutritionTransparencyWorkspace
          onClose={() => setNutritionWorkspaceOpen(false)}
          recipeName={selectedMeal.strMeal}
          ingredients={selectedMeal.strIngredients}
          portionCount={portionCount}
        />
      )}

      {/* Backup Management Dialog */}
      <BackupManagement
        open={backupManagementOpen}
        onOpenChange={setBackupManagementOpen}
        language={language}
      />

      {/* Footer */}
      <footer className="sticky bottom-0 bg-background/80 backdrop-blur-sm border-t py-2 px-4 mt-auto">
        <div className="container mx-auto text-center">
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            <strong>{language === 'es' ? 'Aviso:' : 'Disclaimer:'}</strong> {t.disclaimer}
          </p>
        </div>
      </footer>
    </div>
  )
}
