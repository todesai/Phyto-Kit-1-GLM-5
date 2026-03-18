import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get('search')

  try {
    const response = await fetch(
      'https://www.themealdb.com/api/json/v1/1/list.php?i=list',
      { next: { revalidate: 86400 } } // Cache for 24 hours
    )
    const data = await response.json()
    let ingredients = data.meals || []

    if (search) {
      const searchLower = search.toLowerCase()
      ingredients = ingredients.filter((ing: any) =>
        ing.strIngredient.toLowerCase().includes(searchLower)
      )
    }

    return NextResponse.json({ ingredients })
  } catch (error) {
    console.error('Error fetching ingredients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ingredients' },
      { status: 500 }
    )
  }
}
