import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const response = await fetch(
      `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`,
      { next: { revalidate: 3600 } }
    )
    const data = await response.json()

    if (!data.meals || data.meals.length === 0) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      )
    }

    const meal = data.meals[0]

    // Parse ingredients and measures
    const ingredients: { name: string; measure: string }[] = []
    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[`strIngredient${i}`]
      const measure = meal[`strMeasure${i}`]
      if (ingredient && ingredient.trim()) {
        ingredients.push({
          name: ingredient.trim(),
          measure: measure?.trim() || ''
        })
      }
    }

    // Parse instructions by line breaks
    const instructionsList = meal.strInstructions
      ? meal.strInstructions.split('\r\n').filter((step: string) => step.trim())
      : []

    const mealDetail = {
      ...meal,
      strIngredients: ingredients,
      strInstructionsList: instructionsList
    }

    return NextResponse.json({ meal: mealDetail })
  } catch (error) {
    console.error('Error fetching meal details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch meal details' },
      { status: 500 }
    )
  }
}
