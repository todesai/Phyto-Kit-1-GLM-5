import { NextRequest, NextResponse } from 'next/server'

interface Meal {
  idMeal: string
  strMeal: string
  strMealThumb: string
  strCategory?: string
  strArea?: string
  ingredientCount?: number
  [key: string]: string | number | undefined
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const searchTerm = searchParams.get('search') || ''
  const ingredientsParam = searchParams.get('ingredients') || ''
  const exactCount = searchParams.get('exactCount')
  const maxCount = searchParams.get('maxCount')
  
  const ingredients = ingredientsParam ? ingredientsParam.split(',').map(i => i.trim().toLowerCase()) : []
  const exactCountNum = exactCount ? parseInt(exactCount) : null
  const maxCountNum = maxCount ? parseInt(maxCount) : null
  
  try {
    let searchResults: Meal[] = []
    
    // Search strategy based on parameters
    if (ingredients.length > 0 && searchTerm.trim()) {
      // Both ingredients and search term: search by name first, then filter by ingredients
      const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(searchTerm)}`)
      const data = await response.json()
      let nameResults = data.meals || []
      
      if (nameResults.length > 0) {
        const mealDetailsPromises = nameResults.map(async (meal: Meal) => {
          try {
            const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`)
            const data = await response.json()
            return data.meals?.[0] || null
          } catch {
            return null
          }
        })
        
        const mealDetails = await Promise.all(mealDetailsPromises)
        
        searchResults = mealDetails
          .filter(meal => meal !== null)
          .filter((meal: Record<string, unknown>) => {
            const mealIngredients: string[] = []
            for (let i = 1; i <= 20; i++) {
              const ing = meal[`strIngredient${i}`] as string
              if (ing && ing.trim()) {
                mealIngredients.push(ing.trim().toLowerCase())
              }
            }
            
            return ingredients.every(searchIng => {
              const searchIngLower = searchIng.toLowerCase().trim()
              return mealIngredients.some(mealIng =>
                mealIng.includes(searchIngLower) || searchIngLower.includes(mealIng)
              )
            })
          })
          .map((meal: Record<string, unknown>) => {
            let actualIngredientCount = 0
            for (let i = 1; i <= 20; i++) {
              if (meal[`strIngredient${i}`] && (meal[`strIngredient${i}`] as string).trim()) {
                actualIngredientCount++
              }
            }
            
            return {
              idMeal: meal.idMeal as string,
              strMeal: meal.strMeal as string,
              strMealThumb: meal.strMealThumb as string,
              strCategory: meal.strCategory as string,
              strArea: meal.strArea as string,
              ingredientCount: actualIngredientCount,
            }
          })
      }
    } else if (ingredients.length > 0) {
      // Only ingredients: search all recipes and filter
      const allMealsResponse = await fetch('https://www.themealdb.com/api/json/v1/1/search.php?s=')
      const allMealsData = await allMealsResponse.json()
      const allMeals = allMealsData.meals || []
      
      const candidateMeals = allMeals.slice(0, 200)
      
      const mealDetailsPromises = candidateMeals.map(async (meal: Meal) => {
        try {
          const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`)
          const data = await response.json()
          return data.meals?.[0] || null
        } catch {
          return null
        }
      })
      
      const mealDetails = await Promise.all(mealDetailsPromises)
      
      searchResults = mealDetails
        .filter(meal => meal !== null)
        .filter((meal: Record<string, unknown>) => {
          const mealIngredients: string[] = []
          for (let i = 1; i <= 20; i++) {
            const ing = meal[`strIngredient${i}`] as string
            if (ing && ing.trim()) {
              mealIngredients.push(ing.trim().toLowerCase())
            }
          }
          
          return ingredients.every(searchIng => {
            const searchIngLower = searchIng.toLowerCase().trim()
            return mealIngredients.some(mealIng =>
              mealIng.includes(searchIngLower) || searchIngLower.includes(mealIng)
            )
          })
        })
        .map((meal: Record<string, unknown>) => {
          let actualIngredientCount = 0
          for (let i = 1; i <= 20; i++) {
            if (meal[`strIngredient${i}`] && (meal[`strIngredient${i}`] as string).trim()) {
              actualIngredientCount++
            }
          }
          
          return {
            idMeal: meal.idMeal as string,
            strMeal: meal.strMeal as string,
            strMealThumb: meal.strMealThumb as string,
            strCategory: meal.strCategory as string,
            strArea: meal.strArea as string,
            ingredientCount: actualIngredientCount,
          }
        })
    } else if (searchTerm.trim()) {
      // Only search term
      const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(searchTerm)}`)
      const data = await response.json()
      searchResults = data.meals || []
      
      if (searchResults.length > 0) {
        const mealDetailsPromises = searchResults.map(async (meal: Meal) => {
          try {
            const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`)
            const data = await response.json()
            return data.meals?.[0] || null
          } catch {
            return null
          }
        })
        
        const mealDetails = await Promise.all(mealDetailsPromises)
        const validMeals = mealDetails.filter(m => m !== null)
        
        searchResults = validMeals.map((meal: Record<string, unknown>) => {
          let actualIngredientCount = 0
          for (let i = 1; i <= 20; i++) {
            if (meal[`strIngredient${i}`] && (meal[`strIngredient${i}`] as string).trim()) {
              actualIngredientCount++
            }
          }
          
          return {
            idMeal: meal.idMeal as string,
            strMeal: meal.strMeal as string,
            strMealThumb: meal.strMealThumb as string,
            strCategory: meal.strCategory as string,
            strArea: meal.strArea as string,
            ingredientCount: actualIngredientCount,
          }
        })
      }
    } else if (exactCountNum !== null || maxCountNum !== null) {
      // Only count filters
      const allMealsResponse = await fetch('https://www.themealdb.com/api/json/v1/1/search.php?s=')
      const allMealsData = await allMealsResponse.json()
      const allMeals = allMealsData.meals || []
      
      const candidateMeals = allMeals.slice(0, 200)
      
      const mealDetailsPromises = candidateMeals.map(async (meal: Meal) => {
        try {
          const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`)
          const data = await response.json()
          return data.meals?.[0] || null
        } catch {
          return null
        }
      })
      
      const mealDetails = await Promise.all(mealDetailsPromises)
      
      searchResults = mealDetails
        .filter(meal => meal !== null)
        .map((meal: Record<string, unknown>) => {
          let actualIngredientCount = 0
          for (let i = 1; i <= 20; i++) {
            if (meal[`strIngredient${i}`] && (meal[`strIngredient${i}`] as string).trim()) {
              actualIngredientCount++
            }
          }
          
          return {
            idMeal: meal.idMeal as string,
            strMeal: meal.strMeal as string,
            strMealThumb: meal.strMealThumb as string,
            strCategory: meal.strCategory as string,
            strArea: meal.strArea as string,
            ingredientCount: actualIngredientCount,
          }
        })
    }
    
    // Apply ingredient count filters
    if (exactCountNum !== null && maxCountNum !== null && exactCountNum > maxCountNum) {
      searchResults = []
    } else if (exactCountNum !== null || maxCountNum !== null) {
      searchResults = searchResults.filter((meal: Meal) => {
        const count = meal.ingredientCount || 0
        
        if (exactCountNum !== null && count !== exactCountNum) return false
        if (maxCountNum !== null && count > maxCountNum) return false
        
        return true
      })
    }
    
    return NextResponse.json({ meals: searchResults })
  } catch (error) {
    console.error('Error searching recipes:', error)
    return NextResponse.json({ meals: [] }, { status: 500 })
  }
}
