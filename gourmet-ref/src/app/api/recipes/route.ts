import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const ingredients = searchParams.get('ingredients')
  const name = searchParams.get('name')

  try {
    if (!ingredients && !name) {
      return NextResponse.json(
        { error: 'Either ingredients or name parameter is required' },
        { status: 400 }
      )
    }

    let meals: any[] = []

    if (ingredients) {
      // Compound search by multiple ingredients
      const ingredientList = ingredients.split(',').map(i => i.trim().toLowerCase())

      const ingredientMeals = await Promise.all(
        ingredientList.map(async (ing) => {
          try {
            const response = await fetch(
              `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ing)}`,
              { next: { revalidate: 3600 } } // Cache for 1 hour
            )
            const data = await response.json()
            return data.meals || []
          } catch {
            return []
          }
        })
      )

      // Find meals that contain ALL ingredients
      if (ingredientMeals.length > 0) {
        const mealIds = ingredientMeals.map(meals => meals.map((m: any) => m.idMeal))
        const commonMealIds = mealIds[0].filter((id: string) =>
          mealIds.every((arr: string[]) => arr.includes(id))
        )
        meals = ingredientMeals[0].filter((meal: any) => commonMealIds.includes(meal.idMeal))
      }
    } else if (name) {
      // Search by name
      const response = await fetch(
        `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(name)}`,
        { next: { revalidate: 3600 } }
      )
      const data = await response.json()
      meals = data.meals || []
    }

    return NextResponse.json({ meals })
  } catch (error) {
    console.error('Error fetching recipes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    )
  }
}
