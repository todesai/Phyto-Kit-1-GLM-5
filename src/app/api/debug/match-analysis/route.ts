import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  processSearchWords,
  scoreMexicanMatch,
  INGREDIENT_TRANSLATIONS,
  getSpiceBlendComponents,
  shouldExcludeFromMexicanDB,
  shouldExcludeFromBioactive,
} from '@/lib/search-utils'
import { getUSDANutritionForIngredient } from '@/lib/usda-api'

// Search in Mexican database with detailed results
async function findMexicanMatchesWithDetails(ingredientName: string) {
  // Check exclusion
  const excluded = shouldExcludeFromMexicanDB(ingredientName)
  if (excluded) {
    return { matches: [], excluded: true, reason: 'In Mexican DB exclude list' }
  }
  
  // Process search words
  const { searchWords, translatedWords, baseIngredients } = processSearchWords(ingredientName)
  
  if (searchWords.length === 0 && baseIngredients.length === 0) {
    return { matches: [], excluded: false, reason: 'No valid search words' }
  }
  
  const wordsToSearch = baseIngredients.length > 0 ? baseIngredients : translatedWords
  
  // Build query
  const whereClause = {
    OR: wordsToSearch.flatMap(word => [
      { nombreEspanol: { contains: word.toLowerCase() } },
      { nombreIngles: { contains: word.toLowerCase() } },
      { descripcionAlimento: { contains: word.toLowerCase() } },
    ])
  }
  
  // Get all potential matches
  const allMatches = await db.mexicanFood.findMany({
    where: whereClause,
    take: 100,
  })
  
  if (allMatches.length === 0) {
    return { matches: [], excluded: false, reason: 'No database matches found' }
  }
  
  // Score all matches
  const scoredMatches = allMatches
    .map(food => {
      const { score, reasons } = scoreMexicanMatch(food, searchWords, wordsToSearch)
      return { 
        ...food, 
        _matchScore: score, 
        _matchReasons: reasons,
        _searchWords: searchWords,
        _translatedWords: wordsToSearch,
      }
    })
    .sort((a, b) => b._matchScore - a._matchScore)
  
  // Split into selected and discarded
  const selectedMatches = scoredMatches.filter(m => m._matchScore >= 350).slice(0, 5)
  const discardedMatches = scoredMatches.filter(m => m._matchScore < 350 || !selectedMatches.includes(m))
  
  return { 
    matches: scoredMatches,
    selected: selectedMatches,
    discarded: discardedMatches.slice(0, 10), // Limit discarded for display
    excluded: false,
    searchWords,
    translatedWords: wordsToSearch,
  }
}

// Find PhytoHub matches with details
async function findPhytoHubMatchesWithDetails(ingredientName: string) {
  // Check exclusion
  const excluded = shouldExcludeFromBioactive(ingredientName)
  if (excluded) {
    return { foods: [], compounds: [], excluded: true, reason: 'In bioactive exclude list' }
  }
  
  const { searchWords, translatedWords } = processSearchWords(ingredientName)
  if (searchWords.length === 0) {
    return { foods: [], compounds: [], excluded: false, reason: 'No valid search words' }
  }
  
  // Build food query
  const foodWhere = {
    OR: translatedWords.flatMap(word => [
      { name: { contains: word.toLowerCase() } },
    ])
  }
  
  const foodMatches = await db.phytoHubFood.findMany({
    where: foodWhere,
    take: 20,
  })
  
  // Filter with word-boundary check
  const filteredFoods = foodMatches.filter(food => {
    const foodNameLower = food.name.toLowerCase()
    for (const word of searchWords) {
      const wordRegex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      if (wordRegex.test(foodNameLower)) return true
      
      const translations = INGREDIENT_TRANSLATIONS[word] || []
      for (const t of translations) {
        const tRegex = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
        if (tRegex.test(foodNameLower)) return true
      }
    }
    return false
  })
  
  // Get compounds for matched foods
  const compounds: any[] = []
  const seenCompoundIds = new Set<string>()
  
  for (const food of filteredFoods) {
    if (!food.compoundIds) continue
    
    const compoundIds = JSON.parse(food.compoundIds) as string[]
    const foodCompounds = await db.phytoHubCompound.findMany({
      where: { id: { in: compoundIds } }
    })
    
    for (const compound of foodCompounds) {
      if (!seenCompoundIds.has(compound.id)) {
        seenCompoundIds.add(compound.id)
        compounds.push({
          id: compound.id,
          name: compound.name,
          chemicalClass: compound.chemicalClass,
          foodSource: food.name,
        })
      }
    }
  }
  
  // Also search compounds directly
  const compoundWhere = {
    OR: translatedWords.flatMap(word => [
      { name: { contains: word.toLowerCase() } },
      { synonyms: { contains: word.toLowerCase() } },
    ]),
    isMetabolite: false,
  }
  
  const directCompounds = await db.phytoHubCompound.findMany({
    where: compoundWhere,
    take: 10,
  })
  
  for (const compound of directCompounds) {
    if (!seenCompoundIds.has(compound.id)) {
      seenCompoundIds.add(compound.id)
      compounds.push({
        id: compound.id,
        name: compound.name,
        chemicalClass: compound.chemicalClass,
        foodSource: 'Direct compound match',
      })
    }
  }
  
  return {
    foods: filteredFoods.map(f => ({
      id: f.id,
      name: f.name,
      compoundCount: f.compoundIds ? JSON.parse(f.compoundIds).length : 0,
    })),
    compounds: compounds.slice(0, 20),
    excluded: false,
    searchWords,
  }
}

// Get USDA matches with details
async function findUSDAWithDetails(ingredientName: string) {
  try {
    const results = await getUSDANutritionForIngredient(ingredientName)
    return {
      matches: results.slice(0, 5).map(r => ({
        fdcId: r.fdcId,
        description: r.description,
        dataType: r.dataType,
        nutrients: r.nutrients,
      })),
      count: results.length,
    }
  } catch (error) {
    return { matches: [], count: 0, error: String(error) }
  }
}

// Format nutrients for display
function formatNutrients(source: any, isMexican: boolean) {
  if (!source) return null
  
  const nutrients: Record<string, { value: number | null; unit: string }> = {}
  
  if (isMexican) {
    // Mexican DB fields
    nutrients['Energy'] = { value: source.energia, unit: 'kcal' }
    nutrients['Protein'] = { value: source.proteinaBruta, unit: 'g' }
    nutrients['Carbs'] = { value: source.hidratosCarbono, unit: 'g' }
    nutrients['Fat'] = { value: source.extractoEtereo, unit: 'g' }
    nutrients['Fiber'] = { value: source.fibraDietariaTotal, unit: 'g' }
    nutrients['Sugars'] = { value: source.azucares, unit: 'g' }
    nutrients['Calcium'] = { value: source.calcio, unit: 'mg' }
    nutrients['Iron'] = { value: source.hierro, unit: 'mg' }
    nutrients['Potassium'] = { value: source.potasio, unit: 'mg' }
    nutrients['Magnesium'] = { value: source.magnesio, unit: 'mg' }
    nutrients['Zinc'] = { value: source.zinc, unit: 'mg' }
    nutrients['Sodium'] = { value: source.sodio, unit: 'mg' }
    nutrients['Vit C'] = { value: source.acidoAscorbico, unit: 'mg' }
    nutrients['Vit A'] = { value: source.vitaminaA, unit: 'IU' }
    nutrients['Vit B1'] = { value: source.tiamina, unit: 'mg' }
    nutrients['Vit B2'] = { value: source.riboflavina, unit: 'mg' }
    nutrients['Vit B3'] = { value: source.niacina, unit: 'mg' }
  } else {
    // USDA format
    const n = source.nutrients || {}
    nutrients['Energy'] = { value: n.energia || n.energy, unit: 'kcal' }
    nutrients['Protein'] = { value: n.proteinaBruta || n.protein, unit: 'g' }
    nutrients['Carbs'] = { value: n.hidratosCarbono || n.carbs, unit: 'g' }
    nutrients['Fat'] = { value: n.extractoEtereo || n.fat, unit: 'g' }
    nutrients['Fiber'] = { value: n.fibraDietariaTotal || n.fiber, unit: 'g' }
    nutrients['Sugars'] = { value: n.azucares || n.sugar, unit: 'g' }
    nutrients['Calcium'] = { value: n.calcio || n.calcium, unit: 'mg' }
    nutrients['Iron'] = { value: n.hierro || n.iron, unit: 'mg' }
    nutrients['Potassium'] = { value: n.potasio || n.potassium, unit: 'mg' }
    nutrients['Sodium'] = { value: n.sodio || n.sodium, unit: 'mg' }
    nutrients['Vit C'] = { value: n.acidoAscorbico || n.vitaminC, unit: 'mg' }
    nutrients['Vit A'] = { value: n.vitaminaA || n.vitaminA, unit: 'IU' }
  }
  
  return nutrients
}

// POST: Analyze ingredients with full details
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ingredients } = body as { 
      ingredients: Array<{ name: string; measure?: string }> 
    }
    
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: 'Ingredients array is required' }, { status: 400 })
    }
    
    const results = []
    
    for (const ingredient of ingredients) {
      // Check for spice blend expansion
      const spiceComponents = getSpiceBlendComponents(ingredient.name)
      
      const ingredientResult: any = {
        originalIngredient: ingredient.name,
        measure: ingredient.measure,
        isSpiceBlend: !!spiceComponents,
        spiceComponents: spiceComponents || null,
        
        // Mexican DB results
        mexicanDB: {
          excluded: false,
          reason: null,
          searchWords: [],
          translatedWords: [],
          selected: null,
          discarded: [],
          allMatchesCount: 0,
        },
        
        // USDA results
        usda: {
          matches: [],
          count: 0,
        },
        
        // PhytoHub results
        phytoHub: {
          excluded: false,
          reason: null,
          foods: [],
          compounds: [],
        },
        
        // Final selection
        finalSelection: {
          source: null as string | null,
          match: null as any,
          nutrients: null as any,
        },
      }
      
      // Process Mexican DB
      const mexicanResult = await findMexicanMatchesWithDetails(ingredient.name)
      ingredientResult.mexicanDB = {
        excluded: mexicanResult.excluded,
        reason: mexicanResult.reason || null,
        searchWords: mexicanResult.searchWords || [],
        translatedWords: mexicanResult.translatedWords || [],
        selected: mexicanResult.selected?.[0] ? {
          id: mexicanResult.selected[0].id,
          nombreEspanol: mexicanResult.selected[0].nombreEspanol,
          nombreIngles: mexicanResult.selected[0].nombreIngles,
          score: mexicanResult.selected[0]._matchScore,
          reasons: mexicanResult.selected[0]._matchReasons,
          nutrients: formatNutrients(mexicanResult.selected[0], true),
        } : null,
        discarded: mexicanResult.discarded?.slice(0, 5).map((m: any) => ({
          nombreEspanol: m.nombreEspanol,
          nombreIngles: m.nombreIngles,
          score: m._matchScore,
          reasons: m._matchReasons,
        })),
        allMatchesCount: mexicanResult.matches?.length || 0,
      }
      
      // Process PhytoHub
      const phytoHubResult = await findPhytoHubMatchesWithDetails(ingredient.name)
      ingredientResult.phytoHub = {
        excluded: phytoHubResult.excluded,
        reason: phytoHubResult.reason || null,
        foods: phytoHubResult.foods,
        compounds: phytoHubResult.compounds,
      }
      
      // Process USDA if no Mexican match
      if (!mexicanResult.selected?.length) {
        const usdaResult = await findUSDAWithDetails(ingredient.name)
        ingredientResult.usda = {
          matches: usdaResult.matches?.map(m => ({
            fdcId: m.fdcId,
            description: m.description,
            dataType: m.dataType,
            nutrients: formatNutrients(m, false),
          })) || [],
          count: usdaResult.count,
          error: usdaResult.error,
        }
      }
      
      // Determine final selection
      if (mexicanResult.selected?.length) {
        ingredientResult.finalSelection = {
          source: 'mexican-db',
          match: ingredientResult.mexicanDB.selected,
          nutrients: ingredientResult.mexicanDB.selected?.nutrients,
        }
      } else if (ingredientResult.usda.matches?.length) {
        ingredientResult.finalSelection = {
          source: 'usda',
          match: ingredientResult.usda.matches[0],
          nutrients: ingredientResult.usda.matches[0]?.nutrients,
        }
      } else {
        ingredientResult.finalSelection = {
          source: 'not-found',
          match: null,
          nutrients: null,
        }
      }
      
      results.push(ingredientResult)
    }
    
    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('Debug match analysis error:', error)
    return NextResponse.json({ 
      error: 'Failed to analyze matches', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
