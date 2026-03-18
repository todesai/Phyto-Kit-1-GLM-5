import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  processSearchWords,
  scorePhytoHubMatch,
  INGREDIENT_TRANSLATIONS,
} from '@/lib/search-utils'
import { getToxicityForCompound } from '@/lib/comptox-api'

// Helper to search EFSA toxicity data
async function searchEFSAToxicity(compoundName: string, casNumber?: string | null): Promise<{
  found: boolean
  adi?: number
  tdi?: number
  noael?: number
  ul?: number
  hbgvType?: string
  source: string
} | null> {
  try {
    // Search by CAS number first (most reliable)
    if (casNumber) {
      const byCas = await db.eFSAToxicity.findFirst({
        where: { casNumber }
      })
      if (byCas) {
        return {
          found: true,
          adi: byCas.hbgvChronicType === 'ADI' ? byCas.hbgvChronic : undefined,
          tdi: byCas.hbgvChronicType === 'TDI' ? byCas.hbgvChronic : undefined,
          noael: byCas.referencePoint || undefined,
          ul: byCas.ul || undefined,
          hbgvType: byCas.hbgvChronicType || undefined,
          source: 'EFSA'
        }
      }
    }
    
    // Search by compound name
    const nameLower = compoundName.toLowerCase()
    const byName = await db.eFSAToxicity.findFirst({
      where: {
        OR: [
          { substanceName: { equals: compoundName } },
          { substanceName: { equals: nameLower } },
          { substanceName: { contains: compoundName } },
          { substanceName: { contains: nameLower } }
        ]
      }
    })
    
    if (byName) {
      return {
        found: true,
        adi: byName.hbgvChronicType === 'ADI' ? byName.hbgvChronic : undefined,
        tdi: byName.hbgvChronicType === 'TDI' ? byName.hbgvChronic : undefined,
        noael: byName.referencePoint || undefined,
        ul: byName.ul || undefined,
        hbgvType: byName.hbgvChronicType || undefined,
        source: 'EFSA'
      }
    }
    
    return null
  } catch {
    return null
  }
}

// Health system codes and their descriptions
const HEALTH_SYSTEMS: Record<string, { en: string; es: string; icon: string }> = {
  CV: { en: 'Cardiovascular', es: 'Cardiovascular', icon: '❤️' },
  IM: { en: 'Immune System', es: 'Sistema Inmune', icon: '🛡️' },
  MS: { en: 'Musculoskeletal', es: 'Musculoesquelético', icon: '💪' },
  DG: { en: 'Digestive', es: 'Digestivo', icon: '🫁' },
  NS: { en: 'Nervous System', es: 'Sistema Nervioso', icon: '🧠' },
  EN: { en: 'Endocrine', es: 'Endocrino', icon: '⚗️' },
  SK: { en: 'Skin', es: 'Piel', icon: '🧴' },
  BO: { en: 'Bones', es: 'Huesos', icon: '🦴' },
  GE: { en: 'Genitourinary', es: 'Genitourinario', icon: '💧' },
  EY: { en: 'Eyes', es: 'Ojos', icon: '👁️' },
  OR: { en: 'Oral', es: 'Oral', icon: '👄' },
}

// Chemical classes with descriptions
const CHEMICAL_CLASSES: Record<string, { en: string; es: string; color: string }> = {
  'Polyphenol': { en: 'Polyphenol', es: 'Polifenol', color: 'emerald' },
  'Flavonoid': { en: 'Flavonoid', es: 'Flavonoide', color: 'teal' },
  'Anthocyanin': { en: 'Anthocyanin', es: 'Antocianina', color: 'purple' },
  'Carotenoid': { en: 'Carotenoid', es: 'Carotenoide', color: 'orange' },
  'Terpenoid': { en: 'Terpenoid', es: 'Terpenoide', color: 'amber' },
  'Alkaloid': { en: 'Alkaloid', es: 'Alcaloide', color: 'rose' },
  'Glucosinolate': { en: 'Glucosinolate', es: 'Glucosinolato', color: 'lime' },
  'Sulfur compound': { en: 'Sulfur compound', es: 'Compuesto de azufre', color: 'yellow' },
  'Phenolic acid': { en: 'Phenolic acid', es: 'Ácido fenólico', color: 'blue' },
  'Stilbene': { en: 'Stilbene', es: 'Estilbeno', color: 'pink' },
  'Lignan': { en: 'Lignan', es: 'Lignano', color: 'cyan' },
  'Tannin': { en: 'Tannin', es: 'Tanino', color: 'brown' },
}

interface IngredientMatch {
  ingredient: string
  measure?: string
  matchedCompounds: CompoundMatch[]
}

interface CompoundMatch {
  id: string
  name: string
  chemicalClass: string | null
  subClass: string | null
  foodSources: string[]
  beneficialDose: number | null
  upperLimit: number | null
  estimatedAmount: number | null
  healthEffects: string[]
  targetSystems: string[]
  toxicityData: any[]
  interactions: any[]
  pregnancySafety: string | null
  confidence: number
  matchType: 'food_source' | 'compound_name' | 'synonym'
  // EPA CompTox toxicity data
  comptoxToxicity?: {
    hasData: boolean
    ld50?: number
    noael?: number
    warnings: string[]
    hazardCategories: string[]
  }
  // EFSA OpenFoodTox toxicity data
  efsaToxicity?: {
    found: boolean
    adi?: number
    tdi?: number
    noael?: number
    ul?: number
    hbgvType?: string
    source: string
  }
}

// Match ingredient to compounds from PhytoHub database with multi-word support
async function matchIngredientToCompounds(
  ingredientName: string
): Promise<CompoundMatch[]> {
  // Process search words with translation support
  const { searchWords, translatedWords } = processSearchWords(ingredientName)
  if (searchWords.length === 0) return []
  
  const matches: CompoundMatch[] = []
  const seenCompoundIds = new Set<string>()
  
  // Build AND query for food sources with translation support
  const foodWhere = {
    AND: searchWords.map(word => {
      const translations = INGREDIENT_TRANSLATIONS[word] || [word]
      const allVariants = [word, ...translations.filter((t: string) => t !== word)]
      
      return {
        OR: allVariants.map((v: string) => ({ name: { contains: v } }))
      }
    })
  }
  
  // 1. Search by food source (most relevant)
  const foodMatches = await db.phytoHubFood.findMany({
    where: foodWhere,
    take: 10
  })
  
  for (const food of foodMatches) {
    if (!food.compoundIds) continue
    
    const compoundIds = JSON.parse(food.compoundIds) as string[]
    const compounds = await db.phytoHubCompound.findMany({
      where: { id: { in: compoundIds } }
    })
    
    for (const compound of compounds) {
      if (seenCompoundIds.has(compound.id)) continue
      seenCompoundIds.add(compound.id)
      
      matches.push({
        id: compound.id,
        name: compound.name,
        chemicalClass: compound.chemicalClass,
        subClass: compound.subClass,
        foodSources: compound.foodSources ? JSON.parse(compound.foodSources) : [],
        beneficialDose: compound.beneficialDose,
        upperLimit: compound.upperLimit,
        estimatedAmount: null, // Will be calculated based on serving
        healthEffects: compound.healthEffects ? JSON.parse(compound.healthEffects) : [],
        targetSystems: compound.mechanisms ? extractTargetSystems(compound.mechanisms) : [],
        toxicityData: compound.toxicityData ? JSON.parse(compound.toxicityData) : [],
        interactions: compound.interactions ? JSON.parse(compound.interactions) : [],
        pregnancySafety: compound.pregnancySafety,
        confidence: 0.9,
        matchType: 'food_source'
      })
    }
  }
  
  // 2. Search by compound name (for direct compound ingredients) - multi-word with translations
  const compoundWhere = {
    AND: searchWords.map(word => {
      const translations = INGREDIENT_TRANSLATIONS[word] || [word]
      const allVariants = [word, ...translations.filter((t: string) => t !== word)]
      
      return {
        OR: allVariants.flatMap((v: string) => [
          { name: { contains: v } },
          { synonyms: { contains: v } }
        ])
      }
    }),
    isMetabolite: false
  }
  
  const nameMatches = await db.phytoHubCompound.findMany({
    where: compoundWhere,
    take: 10
  })
  
  for (const compound of nameMatches) {
    // Avoid duplicates
    if (seenCompoundIds.has(compound.id)) continue
    seenCompoundIds.add(compound.id)
    
    matches.push({
      id: compound.id,
      name: compound.name,
      chemicalClass: compound.chemicalClass,
      subClass: compound.subClass,
      foodSources: compound.foodSources ? JSON.parse(compound.foodSources) : [],
      beneficialDose: compound.beneficialDose,
      upperLimit: compound.upperLimit,
      estimatedAmount: null,
      healthEffects: compound.healthEffects ? JSON.parse(compound.healthEffects) : [],
      targetSystems: compound.mechanisms ? extractTargetSystems(compound.mechanisms) : [],
      toxicityData: compound.toxicityData ? JSON.parse(compound.toxicityData) : [],
      interactions: compound.interactions ? JSON.parse(compound.interactions) : [],
      pregnancySafety: compound.pregnancySafety,
      confidence: 0.95,
      matchType: 'compound_name'
    })
  }
  
  return matches
}

// Extract target health systems from mechanisms text
function extractTargetSystems(mechanismsJson: string): string[] {
  const systems: string[] = []
  
  try {
    const mechanisms = JSON.parse(mechanismsJson) as string[]
    const text = mechanisms.join(' ').toLowerCase()
    
    // Map keywords to systems
    const keywordMap: Record<string, string> = {
      'heart': 'CV', 'cardiovascular': 'CV', 'blood pressure': 'CV', 'cholesterol': 'CV',
      'immune': 'IM', 'inflammation': 'IM', 'antiviral': 'IM', 'antibacterial': 'IM',
      'bone': 'BO', 'osteoporosis': 'BO', 'calcium': 'BO',
      'brain': 'NS', 'neuro': 'NS', 'cognitive': 'NS', 'memory': 'NS',
      'digestive': 'DG', 'gut': 'DG', 'intestin': 'DG',
      'skin': 'SK', 'dermat': 'SK', 'wound': 'SK',
      'diabetes': 'EN', 'insulin': 'EN', 'glucose': 'EN',
      'muscle': 'MS', 'joint': 'MS', 'arthritis': 'MS',
      'eye': 'EY', 'vision': 'EY', 'retina': 'EY',
    }
    
    for (const [keyword, system] of Object.entries(keywordMap)) {
      if (text.includes(keyword) && !systems.includes(system)) {
        systems.push(system)
      }
    }
  } catch {
    // Invalid JSON
  }
  
  return systems
}

// Calculate estimated compound amount per serving
function estimateCompoundAmount(
  compound: CompoundMatch,
  ingredientName: string,
  measure?: string
): number {
  // Default amounts based on typical food content (mg per 100g)
  const defaultAmounts: Record<string, number> = {
    // Flavonoids
    'quercetin': 20,
    'kaempferol': 10,
    'myricetin': 5,
    'apigenin': 8,
    'luteolin': 5,
    // Carotenoids
    'beta-carotene': 3000,
    'lycopene': 3000,
    'lutein': 1000,
    'zeaxanthin': 500,
    // Phenolic acids
    'caffeic acid': 15,
    'ferulic acid': 10,
    'gallic acid': 5,
    // Others
    'curcumin': 3000,
    'resveratrol': 1,
    'sulforaphane': 50,
    'allicin': 20,
    'gingerol': 100,
    'capsaicin': 10,
  }
  
  // Check if we have a default for this compound
  const compoundLower = compound.name.toLowerCase()
  for (const [name, amount] of Object.entries(defaultAmounts)) {
    if (compoundLower.includes(name)) {
      // Adjust for serving size (default 100g)
      let servingMultiplier = 1
      if (measure) {
        // Try to extract serving size from measure
        const numMatch = measure.match(/(\d+(?:\.\d+)?)/)
        if (numMatch) {
          const num = parseFloat(numMatch[1])
          if (measure.includes('cup') || measure.includes('taza')) {
            servingMultiplier = num * 2.5 // ~250g per cup
          } else if (measure.includes('tbsp') || measure.includes('cucharada')) {
            servingMultiplier = num * 0.15 // ~15g per tbsp
          } else if (measure.includes('tsp') || measure.includes('cucharadita')) {
            servingMultiplier = num * 0.05 // ~5g per tsp
          } else if (measure.includes('g') || measure.includes('gram')) {
            servingMultiplier = num / 100
          } else if (measure.includes('oz')) {
            servingMultiplier = num * 0.28 // 28g per oz
          } else {
            servingMultiplier = num
          }
        }
      }
      return Math.round(amount * servingMultiplier)
    }
  }
  
  // Default estimate: 10mg per 100g serving
  return 10
}

// POST: Match ingredients to bioactive compounds
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ingredients, portionCount = 4, includeToxicity = true } = body as {
      ingredients: Array<{ name: string; measure?: string }>
      portionCount?: number
      includeToxicity?: boolean
    }
    
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: 'Ingredients array is required' }, { status: 400 })
    }
    
    const results: IngredientMatch[] = []
    const allCompounds: Map<string, CompoundMatch> = new Map()
    
    for (const ingredient of ingredients) {
      const matches = await matchIngredientToCompounds(ingredient.name)
      
      // Calculate estimated amounts
      for (const match of matches) {
        match.estimatedAmount = estimateCompoundAmount(match, ingredient.name, ingredient.measure)
        
        // Fetch toxicity data if enabled
        if (includeToxicity) {
          // Get compound details for CAS number
          const compoundDetails = await db.phytoHubCompound.findUnique({
            where: { id: match.id },
            select: { casNumber: true, inchiKey: true }
          })
          
          // 1. EPA CompTox toxicity data
          const comptoxToxicity = await getToxicityForCompound(match.id)
          if (comptoxToxicity.hasData) {
            match.comptoxToxicity = {
              hasData: comptoxToxicity.hasData,
              ld50: comptoxToxicity.ld50,
              noael: comptoxToxicity.noael,
              warnings: comptoxToxicity.warnings,
              hazardCategories: comptoxToxicity.hazardCategories
            }
          }
          
          // 2. EFSA OpenFoodTox toxicity data
          const efsaData = await searchEFSAToxicity(
            match.name, 
            compoundDetails?.casNumber || null
          )
          if (efsaData?.found) {
            match.efsaToxicity = efsaData
          }
        }
        
        // Merge with existing compounds (sum amounts)
        const existing = allCompounds.get(match.id)
        if (existing) {
          existing.estimatedAmount = (existing.estimatedAmount || 0) + (match.estimatedAmount || 0)
        } else {
          allCompounds.set(match.id, { ...match })
        }
      }
      
      results.push({
        ingredient: ingredient.name,
        measure: ingredient.measure,
        matchedCompounds: matches
      })
    }
    
    // Calculate totals per portion
    const totalCompounds = Array.from(allCompounds.values()).map(compound => ({
      ...compound,
      amountPerPortion: compound.estimatedAmount 
        ? Math.round(compound.estimatedAmount / portionCount)
        : null,
      percentOfBeneficial: compound.beneficialDose && compound.estimatedAmount
        ? Math.round((compound.estimatedAmount / compound.beneficialDose) * 100)
        : null,
      percentOfUpperLimit: compound.upperLimit && compound.estimatedAmount
        ? Math.round((compound.estimatedAmount / compound.upperLimit) * 100)
        : null,
    }))
    
    // Sort by amount (highest first)
    totalCompounds.sort((a, b) => (b.estimatedAmount || 0) - (a.estimatedAmount || 0))
    
    // Calculate stats - now includes real toxicity warnings from CompTox and EFSA
    const compoundsWithToxicityData = totalCompounds.filter(
      c => c.comptoxToxicity?.hasData || c.efsaToxicity?.found
    )
    const compoundsWithWarnings = totalCompounds.filter(
      c => c.comptoxToxicity?.warnings?.length > 0 || 
           c.comptoxToxicity?.hazardCategories?.length > 0 ||
           c.efsaToxicity?.found ||
           c.toxicityData?.length > 0 || 
           c.interactions?.length > 0
    )
    
    // Count compounds with EFSA data
    const compoundsWithEFSA = totalCompounds.filter(c => c.efsaToxicity?.found)
    const compoundsWithADI = totalCompounds.filter(c => c.efsaToxicity?.adi)
    
    const stats = {
      totalIngredients: ingredients.length,
      matchedIngredients: results.filter(r => r.matchedCompounds.length > 0).length,
      totalCompounds: totalCompounds.length,
      compoundsWithDosage: totalCompounds.filter(c => c.beneficialDose).length,
      compoundsWithToxicityData: compoundsWithToxicityData.length,
      compoundsWithEFSA: compoundsWithEFSA.length,
      compoundsWithADI: compoundsWithADI.length,
      compoundsWithWarnings: compoundsWithWarnings.length,
      // Legacy field for backward compatibility
      compoundsWithWarningsLegacy: totalCompounds.filter(c => c.toxicityData?.length > 0 || c.interactions?.length > 0).length,
    }
    
    return NextResponse.json({
      success: true,
      ingredients: results,
      totalCompounds,
      stats,
      healthSystems: HEALTH_SYSTEMS,
      chemicalClasses: CHEMICAL_CLASSES,
    })
    
  } catch (error) {
    console.error('Bioactive matching error:', error)
    return NextResponse.json({ 
      error: 'Failed to match bioactive compounds', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

// GET: Search compounds directly
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const chemicalClass = searchParams.get('class')
    const limit = parseInt(searchParams.get('limit') || '20')
    
    if (!query && !chemicalClass) {
      return NextResponse.json({ compounds: [] })
    }
    
    const where: any = {}
    
    if (query) {
      where.OR = [
        { name: { contains: query.toLowerCase() } },
        { synonyms: { contains: query.toLowerCase() } },
      ]
    }
    
    if (chemicalClass) {
      where.chemicalClass = chemicalClass
    }
    
    const compounds = await db.phytoHubCompound.findMany({
      where,
      take: limit,
      orderBy: { dataQuality: 'desc' }
    })
    
    return NextResponse.json({
      query,
      count: compounds.length,
      compounds: compounds.map(c => ({
        id: c.id,
        name: c.name,
        chemicalClass: c.chemicalClass,
        subClass: c.subClass,
        molecularFormula: c.molecularFormula,
        molecularWeight: c.molecularWeight,
        foodSources: c.foodSources ? JSON.parse(c.foodSources) : [],
        beneficialDose: c.beneficialDose,
        upperLimit: c.upperLimit,
        healthEffects: c.healthEffects ? JSON.parse(c.healthEffects) : [],
      }))
    })
    
  } catch (error) {
    console.error('Compound search error:', error)
    return NextResponse.json({ compounds: [], error: 'Search failed' })
  }
}
