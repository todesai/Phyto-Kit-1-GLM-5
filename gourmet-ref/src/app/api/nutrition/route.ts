import { NextRequest, NextResponse } from 'next/server'

interface NutritionData {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  sugar?: number
  sodium?: number
  potassium?: number
  calcium?: number
  iron?: number
  vitaminC?: number
  vitaminA?: number
}

function aggregateNutrition(nutrientsLists: any[]): NutritionData {
  const totals: NutritionData = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    potassium: 0,
    calcium: 0,
    iron: 0,
    vitaminC: 0,
    vitaminA: 0,
  }

  nutrientsLists.forEach(nutrients => {
    if (!nutrients) return
    nutrients.forEach((n: any) => {
      const name = n.name?.toLowerCase() || ''
      const amount = n.amount || 0
      const unit = n.unitName?.toLowerCase() || ''

      // Convert to standard units
      let convertedAmount = amount
      if (unit.includes('kcal')) {
        convertedAmount = amount
      } else if (unit.includes('kj')) {
        convertedAmount = amount * 0.239 // Convert kJ to kcal
      }

      if (name.includes('energy')) {
        totals.calories += convertedAmount
      }
      if (name.includes('protein')) totals.protein += amount
      if (name.includes('carbohydrate, by difference') || name.includes('total carbohydrate')) {
        totals.carbs += amount
      }
      if (name.includes('total lipid') || name.includes('total fat')) totals.fat += amount
      if (name.includes('fiber')) totals.fiber += amount
      if (name.includes('sugars')) totals.sugar += amount
      if (name.includes('sodium')) totals.sodium += amount
      if (name.includes('potassium')) totals.potassium += amount
      if (name.includes('calcium')) totals.calcium += amount
      if (name.includes('iron')) totals.iron += amount
      if (name.includes('vitamin c')) totals.vitaminC = (totals.vitaminC || 0) + amount
      if (name.includes('vitamin a')) totals.vitaminA = (totals.vitaminA || 0) + amount
    })
  })

  return totals
}

function estimateNutrition(ingredients: { name: string; measure: string }[]): NutritionData {
  // Simple estimation based on ingredient count and common values
  const ingredientCount = ingredients.length
  return {
    calories: ingredientCount * 150,
    protein: ingredientCount * 8,
    carbs: ingredientCount * 20,
    fat: ingredientCount * 6,
    fiber: ingredientCount * 3,
    sugar: ingredientCount * 5,
    sodium: ingredientCount * 200,
    potassium: ingredientCount * 300,
    calcium: ingredientCount * 50,
    iron: ingredientCount * 2,
    vitaminC: ingredientCount * 10,
    vitaminA: ingredientCount * 500,
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ingredients } = await request.json()

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { error: 'Ingredients array is required' },
        { status: 400 }
      )
    }

    const usdaApiKey = process.env.USDA_API_KEY

    if (!usdaApiKey) {
      // Fallback to estimated nutrition if no API key
      console.warn('USDA API key not found, using estimated nutrition')
      const estimatedNutrition = estimateNutrition(ingredients)
      return NextResponse.json({ nutrition: estimatedNutrition, estimated: true })
    }

    // Fetch nutrition data for each ingredient from USDA
    const nutritionPromises = ingredients.slice(0, 5).map(async (ing: { name: string }) => {
      try {
        const searchResponse = await fetch(
          `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(ing.name)}&pageSize=1&api_key=${usdaApiKey}`,
          {
            next: { revalidate: 86400 } // Cache for 24 hours
          }
        )
        const searchData = await searchResponse.json()

        if (searchData.foods && searchData.foods.length > 0) {
          return searchData.foods[0].foodNutrients
        }
        return null
      } catch (error) {
        console.error(`Error fetching nutrition for ${ing.name}:`, error)
        return null
      }
    })

    const results = await Promise.all(nutritionPromises)
    const aggregatedNutrition = aggregateNutrition(results)

    return NextResponse.json({ nutrition: aggregatedNutrition, estimated: false })
  } catch (error) {
    console.error('Error fetching nutrition data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch nutrition data' },
      { status: 500 }
    )
  }
}
