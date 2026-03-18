import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Search for Mexican food by ingredient name
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [] })
    }
    
    const searchTerm = query.trim().toLowerCase()
    
    // Search in both Spanish and English names
    const results = await db.mexicanFood.findMany({
      where: {
        OR: [
          {
            descripcionAlimento: {
              contains: searchTerm,
            }
          },
          {
            foodDescription: {
              contains: searchTerm,
            }
          },
        ]
      },
      take: limit,
      orderBy: {
        nutrientScore: 'desc', // Prefer foods with more complete data
      }
    })
    
    // Format results for frontend
    const formatted = results.map(food => ({
      id: food.id,
      conabioId: food.conabioId,
      nameEs: food.descripcionAlimento,
      nameEn: food.foodDescription,
      foodType: food.foodType,
      tipoAlimento: food.tipoAlimento,
      nutrients: {
        energy: food.energia,
        protein: food.proteinaBruta,
        carbs: food.hidratosCarbono,
        fat: food.extractoEtereo,
        fiber: food.fibraDietariaTotal,
        calcium: food.calcio,
        iron: food.hierro,
        sodium: food.sodio,
        potassium: food.potasio,
        magnesium: food.magnesio,
        zinc: food.zinc,
        vitaminA: food.vitaminaA,
        vitaminC: food.acidoAscorbico,
        vitaminB1: food.tiamina,
        vitaminB2: food.riboflavina,
        vitaminB3: food.niacina,
        cholesterol: food.colesterol,
      },
      nutrientScore: food.nutrientScore,
    }))
    
    return NextResponse.json({ results: formatted })
    
  } catch (error) {
    console.error('Nutrition search error:', error)
    return NextResponse.json({ results: [], error: 'Search failed' })
  }
}

// Get detailed nutrition for a specific food
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ingredientNames } = body as { ingredientNames: string[] }
    
    if (!ingredientNames || !Array.isArray(ingredientNames)) {
      return NextResponse.json({ results: [] })
    }
    
    const results = []
    
    for (const name of ingredientNames) {
      const searchTerm = name.toLowerCase().trim()
      
      // Try to find a match
      const matches = await db.mexicanFood.findMany({
        where: {
          OR: [
            {
              descripcionAlimento: {
                contains: searchTerm,
              }
            },
            {
              foodDescription: {
                contains: searchTerm,
              }
            },
          ]
        },
        take: 3,
        orderBy: {
          nutrientScore: 'desc',
        }
      })
      
      if (matches.length > 0) {
        results.push({
          ingredient: name,
          bestMatch: matches[0],
          alternatives: matches.slice(1),
        })
      } else {
        results.push({
          ingredient: name,
          bestMatch: null,
          alternatives: [],
        })
      }
    }
    
    return NextResponse.json({ results })
    
  } catch (error) {
    console.error('Nutrition lookup error:', error)
    return NextResponse.json({ results: [], error: 'Lookup failed' })
  }
}
