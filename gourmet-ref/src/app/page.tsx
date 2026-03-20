'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Search, ChefHat, Moon, Sun, Loader2, X, Plus, Info, Image, ImageOff, RotateCcw, Undo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Meal, MealDetail, NutritionData, Ingredient } from '@/types/recipe'

export default function Home() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [ingredients, setIngredients] = useState<string[]>([])
  const [ingredientInput, setIngredientInput] = useState('')
  const [meals, setMeals] = useState<Meal[]>([])
  const [lastRemovedIngredient, setLastRemovedIngredient] = useState<{ ingredient: string; index: number } | null>(null)
  const [selectedMeal, setSelectedMeal] = useState<MealDetail | null>(null)
  const [nutritionData, setNutritionData] = useState<NutritionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [backgroundImage, setBackgroundImage] = useState('')
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([])
  const [backgroundMode, setBackgroundMode] = useState<'full' | 'balanced' | 'none'>('balanced')
  const [recipeCount, setRecipeCount] = useState(0)
  const [isFromIngredientRemoval, setIsFromIngredientRemoval] = useState(false)
  const [shouldAutoSearch, setShouldAutoSearch] = useState(false)
  const [exactIngredientCount, setExactIngredientCount] = useState<number | null>(null)
  const [maxIngredients, setMaxIngredients] = useState<number | null>(null)

  useEffect(() => {
    setMounted(true)
    // Load all ingredients on mount
    fetchAllIngredients()
    // Load saved background mode preference
    const savedMode = localStorage.getItem('backgroundMode') as 'full' | 'balanced' | 'none'
    if (savedMode) {
      setBackgroundMode(savedMode)
    }
  }, [])

  useEffect(() => {
    // Save background mode preference when it changes
    localStorage.setItem('backgroundMode', backgroundMode)
  }, [backgroundMode])

  // Auto-search when ingredients change (for removal or filter updates)
  useEffect(() => {
    if (shouldAutoSearch) {
      searchRecipes()
      setShouldAutoSearch(false)
    }
  }, [shouldAutoSearch])

  const fetchAllIngredients = async () => {
    try {
      const response = await fetch('https://www.themealdb.com/api/json/v1/1/list.php?i=list')
      const data = await response.json()
      if (data.meals) {
        setAllIngredients(data.meals)
      }
    } catch (error) {
      console.error('Error fetching ingredients:', error)
    }
  }

  const addIngredient = (ingredientToAdd?: string) => {
    // If a specific ingredient is provided (from suggestion), use it
    // Otherwise fall back to input value
    const finalIngredient = ingredientToAdd || ingredientInput.trim()

    if (finalIngredient && !ingredients.includes(finalIngredient.toLowerCase())) {
      setIngredients([...ingredients, finalIngredient.toLowerCase()])
      setIngredientInput('')
    }
  }

  const clearAllIngredients = () => {
    setIngredients([])
    setLastRemovedIngredient(null) // Reset undo state
    // Don't clear meals - let the search function handle it based on search term
    setShouldAutoSearch(true) // Trigger auto-search to update results
  }

  const removeIngredient = (ingredient: string) => {
    const index = ingredients.indexOf(ingredient)
    const newIngredients = ingredients.filter(i => i !== ingredient)

    // Track last removed ingredient for undo
    setLastRemovedIngredient({
      ingredient,
      index,
    })

    setIngredients(newIngredients)
    setIsFromIngredientRemoval(true) // Mark that this is from ingredient removal
    setShouldAutoSearch(true) // Trigger auto-search after state updates
  }

  const undoRemoveIngredient = () => {
    if (lastRemovedIngredient) {
      const { ingredient, index } = lastRemovedIngredient
      const newIngredients = [...ingredients.slice(0, index), ingredient, ...ingredients.slice(index)]
      setIngredients(newIngredients)
      setLastRemovedIngredient(null)
      setIsFromIngredientRemoval(true) // Mark that this is from ingredient removal
      setShouldAutoSearch(true) // Trigger auto-search after state updates
    }
  }

  const searchRecipes = async () => {
    setLoading(true)
    setIsFromIngredientRemoval(false) // Reset for new search
    try {
      let searchResults: Meal[] = []
      const previousCount = meals.length // Track previous recipe count

      // SEARCH STRATEGY:
      // 1. If BOTH ingredients AND search term: Search by name first, then filter by ingredients
      // 2. If ONLY ingredients: Search all recipes and filter by ingredients
      // 3. If ONLY search term: Search by name
      // 4. If ONLY count filters: Search all recipes and apply count filters
      // 5. If ALL are empty: No search
      // 6. After any search, apply ingredient count filters (exact count and/or max ingredients)

      if (ingredients.length > 0 && searchTerm.trim()) {
        // BOTH: Search by name first, then filter by ingredients
        const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(searchTerm)}`)
        const data = await response.json()
        let nameResults = data.meals || []

        // Fetch details for all name search results to check ingredients
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

          // Filter by ingredients AND count actual ingredients
          searchResults = mealDetails
            .filter(meal => meal !== null)
            .filter((meal: any) => {
              // Get all ingredients for this meal
              const mealIngredients: string[] = []
              for (let i = 1; i <= 20; i++) {
                const ing = meal[`strIngredient${i}`]
                if (ing && ing.trim()) {
                  mealIngredients.push(ing.trim().toLowerCase())
                }
              }

              // Check if ALL search ingredients are present (with partial matching)
              return ingredients.every(searchIng => {
                const searchIngLower = searchIng.toLowerCase().trim()
                return mealIngredients.some(mealIng =>
                  mealIng.includes(searchIngLower) || searchIngLower.includes(mealIng)
                )
              })
            })
            .map((meal: any) => {
              // Count actual ingredients in this meal
              let actualIngredientCount = 0
              for (let i = 1; i <= 20; i++) {
                if (meal[`strIngredient${i}`] && meal[`strIngredient${i}`].trim()) {
                  actualIngredientCount++
                }
              }

              return {
                idMeal: meal.idMeal,
                strMeal: meal.strMeal,
                strMealThumb: meal.strMealThumb,
                strCategory: meal.strCategory,
                strArea: meal.strArea,
                ingredientCount: actualIngredientCount,
              }
            })
        }
      } else if (ingredients.length > 0) {
        // ONLY ingredients: Compound search by multiple ingredients with partial word matching
        // Strategy: Fetch ALL meals, filter locally to ensure all ingredients are present
        const allMealsResponse = await fetch('https://www.themealdb.com/api/json/v1/1/search.php?s=')
        const allMealsData = await allMealsResponse.json()
        const allMeals = allMealsData.meals || []

        // For performance, fetch details for candidate meals and filter
        // Limit to first 200 meals to avoid too many API calls
        const candidateMeals = allMeals.slice(0, 200)

        // Fetch details for all candidate meals in parallel
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

        // Filter meals that contain ALL ingredients (with partial matching)
        searchResults = mealDetails
          .filter(meal => meal !== null)
          .filter((meal: any) => {
            // Get all ingredients for this meal
            const mealIngredients: string[] = []
            for (let i = 1; i <= 20; i++) {
              const ing = meal[`strIngredient${i}`]
              if (ing && ing.trim()) {
                mealIngredients.push(ing.trim().toLowerCase())
              }
            }

            // Check if ALL search ingredients are present (with partial matching)
            return ingredients.every(searchIng => {
              const searchIngLower = searchIng.toLowerCase().trim()
              return mealIngredients.some(mealIng =>
                mealIng.includes(searchIngLower) || searchIngLower.includes(mealIng)
              )
            })
          })
          .map((meal: any) => {
            // Count actual ingredients in this meal
            let actualIngredientCount = 0
            for (let i = 1; i <= 20; i++) {
              if (meal[`strIngredient${i}`] && meal[`strIngredient${i}`].trim()) {
                actualIngredientCount++
              }
            }

            return {
              idMeal: meal.idMeal,
              strMeal: meal.strMeal,
              strMealThumb: meal.strMealThumb,
              strCategory: meal.strCategory,
              strArea: meal.strArea,
              ingredientCount: actualIngredientCount,
            }
          })
      } else if (searchTerm.trim()) {
        // ONLY name: Search by name
        const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(searchTerm)}`)
        const data = await response.json()
        searchResults = data.meals || []

        // Fetch full details for all name search results to get ingredient counts
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

          searchResults = validMeals.map((meal: any) => {
            // Count actual ingredients in this meal
            let actualIngredientCount = 0
            for (let i = 1; i <= 20; i++) {
              if (meal[`strIngredient${i}`] && meal[`strIngredient${i}`].trim()) {
                actualIngredientCount++
              }
            }

            return {
              idMeal: meal.idMeal,
              strMeal: meal.strMeal,
              strMealThumb: meal.strMealThumb,
              strCategory: meal.strCategory,
              strArea: meal.strArea,
              ingredientCount: actualIngredientCount,
            }
          })
        }
      } else if (exactIngredientCount !== null || maxIngredients !== null) {
        // ONLY count filters: Search all recipes and apply count filters
        const allMealsResponse = await fetch('https://www.themealdb.com/api/json/v1/1/search.php?s=')
        const allMealsData = await allMealsResponse.json()
        const allMeals = allMealsData.meals || []

        // Limit to first 200 meals for performance
        const candidateMeals = allMeals.slice(0, 200)

        // Fetch details for all candidate meals in parallel
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

        // Count ingredients for all meals
        searchResults = mealDetails
          .filter(meal => meal !== null)
          .map((meal: any) => {
            let actualIngredientCount = 0
            for (let i = 1; i <= 20; i++) {
              if (meal[`strIngredient${i}`] && meal[`strIngredient${i}`].trim()) {
                actualIngredientCount++
              }
            }

            return {
              idMeal: meal.idMeal,
              strMeal: meal.strMeal,
              strMealThumb: meal.strMealThumb,
              strCategory: meal.strCategory,
              strArea: meal.strArea,
              ingredientCount: actualIngredientCount,
            }
          })
      }

      // Apply ingredient count filters to ALL search results (common to all modes)
      // Validate that exact count doesn't exceed max ingredients (impossible combination)
      if (exactIngredientCount !== null && maxIngredients !== null && exactIngredientCount > maxIngredients) {
        searchResults = []
      } else if (exactIngredientCount !== null || maxIngredients !== null) {
        searchResults = searchResults.filter((meal: any) => {
          const count = meal.ingredientCount || 0

          // Exact count filter
          if (exactIngredientCount !== null && count !== exactIngredientCount) return false

          // Max ingredients filter
          if (maxIngredients !== null && count > maxIngredients) return false

          return true
        })
      }

      setMeals(searchResults)

      // Show new recipes found
      const newRecipesCount = searchResults.length - previousCount
      if (isFromIngredientRemoval && newRecipesCount !== 0) {
        // It was from ingredient removal and there are new recipes
        setRecipeCount(searchResults.length)
      } else if (!isFromIngredientRemoval) {
        // It's a new search (not from ingredient removal)
        setRecipeCount(searchResults.length)
      }

      // Set background image from first result if available
      if (searchResults.length > 0) {
        setBackgroundImage(searchResults[0].strMealThumb)
      }
    } catch (error) {
      console.error('Error searching recipes:', error)
      setMeals([])
    } finally {
      setLoading(false)
    }
  }

  const fetchMealDetails = async (mealId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`)
      const data = await response.json()
      const meal = data.meals[0]

      // Parse ingredients and measures
      const ingredients: { name: string; measure: string }[] = []
      for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`]
        const measure = meal[`strMeasure${i}`]
        if (ingredient && ingredient.trim()) {
          ingredients.push({ name: ingredient.trim(), measure: measure?.trim() || '' })
        }
      }

      // Parse instructions by line breaks
      const instructionsList = meal.strInstructions
        ? meal.strInstructions.split('\r\n').filter((step: string) => step.trim())
        : []

      const mealDetail: MealDetail = {
        ...meal,
        strIngredients: ingredients,
        strInstructionsList: instructionsList,
      }

      setSelectedMeal(mealDetail)
      setBackgroundImage(meal.strMealThumb)

      // Fetch nutrition data from USDA
      await fetchNutritionData(ingredients)
    } catch (error) {
      console.error('Error fetching meal details:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchNutritionData = async (ingredients: { name: string; measure: string }[]) => {
    try {
      // Get USDA API key from environment (user will need to provide this)
      const usdaApiKey = process.env.NEXT_PUBLIC_USDA_API_KEY

      if (!usdaApiKey) {
        // Fallback: estimated nutrition based on ingredients
        const estimatedNutrition = estimateNutrition(ingredients)
        setNutritionData(estimatedNutrition)
        return
      }

      // Fetch nutrition data for each ingredient from USDA
      const nutritionPromises = ingredients.slice(0, 5).map(async (ing) => {
        try {
          const searchResponse = await fetch(
            `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(ing.name)}&pageSize=1&api_key=${usdaApiKey}`
          )
          const searchData = await searchResponse.json()
          if (searchData.foods && searchData.foods.length > 0) {
            return searchData.foods[0].foodNutrients
          }
          return null
        } catch {
          return null
        }
      })

      const results = await Promise.all(nutritionPromises)
      const aggregatedNutrition = aggregateNutrition(results)
      setNutritionData(aggregatedNutrition)
    } catch (error) {
      console.error('Error fetching nutrition data:', error)
      // Fallback to estimated nutrition
      const estimatedNutrition = estimateNutrition(ingredients)
      setNutritionData(estimatedNutrition)
    }
  }

  const estimateNutrition = (ingredients: { name: string; measure: string }[]): NutritionData => {
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

  const aggregateNutrition = (nutrientsLists: any[]): NutritionData => {
    const totals = {
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

        if (name.includes('energy')) totals.calories += amount
        if (name.includes('protein')) totals.protein += amount
        if (name.includes('carbohydrate')) totals.carbs += amount
        if (name.includes('total lipid')) totals.fat += amount
        if (name.includes('fiber')) totals.fiber += amount
        if (name.includes('sugars')) totals.sugar += amount
        if (name.includes('sodium')) totals.sodium += amount
        if (name.includes('potassium')) totals.potassium += amount
        if (name.includes('calcium')) totals.calcium += amount
        if (name.includes('iron')) totals.iron += amount
        if (name.includes('vitamin c')) totals.vitaminC += amount
        if (name.includes('vitamin a')) totals.vitaminA += amount
      })
    })

    return totals
  }

  const filteredIngredients = allIngredients.filter(ing =>
    ing.strIngredient.toLowerCase().includes(ingredientInput.toLowerCase())
  )

  // Background mode configuration
  const getBackgroundStyles = () => {
    switch (backgroundMode) {
      case 'full':
        return {
          opacity: 1,
          overlay: null,
        }
      case 'balanced':
        // Use higher opacity in light mode for better visibility
        const isLight = mounted && theme === 'light'
        return {
          opacity: isLight ? 0.6 : 0.35,
          overlay: isLight ? 'from-background/40 via-background/30 to-background' : 'from-background/60 via-background/40 to-background',
        }
      case 'none':
        return null
      default:
        return {
          opacity: 0.35,
          overlay: 'from-background/60 via-background/40 to-background',
        }
    }
  }

  const backgroundStyles = getBackgroundStyles()

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
            <ChefHat className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Gourmet Recipes
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Select value={backgroundMode} onValueChange={(value: 'full' | 'balanced' | 'none') => setBackgroundMode(value)}>
              <SelectTrigger className="w-[140px]">
                <div className="flex items-center gap-2 w-full">
                  {backgroundImage && backgroundMode !== 'none' ? (
                    <div
                      className="w-5 h-5 rounded overflow-hidden relative flex-shrink-0"
                      style={{
                        backgroundImage: `url(${backgroundImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                  ) : (
                    <div
                      className="w-5 h-5 rounded flex-shrink-0"
                      style={{
                        backgroundColor: mounted && theme === 'dark' ? 'black' : 'white',
                        border: mounted && theme === 'dark' ? '1px solid #333' : '1px solid #ccc',
                      }}
                    />
                  )}
                  <span className="text-sm">
                    {backgroundMode === 'full' ? 'Full' : backgroundMode === 'balanced' ? 'Balanced' : 'None'}
                  </span>
                </div>
                <SelectValue className="hidden" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4" alt="" />
                    <span>Full</span>
                  </div>
                </SelectItem>
                <SelectItem value="balanced">
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4" alt="" />
                    <span>Balanced</span>
                  </div>
                </SelectItem>
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <ImageOff className="h-4 w-4" alt="" />
                    <span>None</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
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
        <section className="mb-12 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            Discover Culinary Excellence
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Explore gourmet recipes with detailed nutrition information. Search by name or filter by multiple ingredients.
          </p>

          <div className="max-w-3xl mx-auto space-y-4">
            {/* Search by Name */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search recipes by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10 h-12 text-base"
                  onKeyPress={(e) => e.key === 'Enter' && searchRecipes()}
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      if (ingredients.length > 0 || exactIngredientCount !== null || maxIngredients !== null) {
                        searchRecipes()
                      } else {
                        setMeals([])
                        setBackgroundImage('')
                        setRecipeCount(0)
                      }
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive transition-colors"
                    title="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button onClick={searchRecipes} disabled={loading} size="lg" className="px-8">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                Search
              </Button>
            </div>

            {(exactIngredientCount !== null || maxIngredients !== null) && (
              <div className="flex flex-wrap gap-2 items-center justify-center bg-muted/30 rounded-lg p-3">
                <span className="text-xs font-medium">Active filters:</span>
                {exactIngredientCount !== null && (
                  <Badge variant="default" className="text-xs">
                    Exactly {exactIngredientCount} ingredient{exactIngredientCount !== 1 ? 's' : ''}
                  </Badge>
                )}
                {maxIngredients !== null && (
                  <Badge variant="default" className="text-xs">
                    ≤{maxIngredients} ingredients
                  </Badge>
                )}
                <button
                  onClick={() => {
                    setExactIngredientCount(null)
                    setMaxIngredients(null)
                    searchRecipes()
                  }}
                  className="text-xs hover:text-destructive underline ml-2"
                >
                  Clear and search
                </button>
              </div>
            )}

            <div className="flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="text-sm text-muted-foreground">or filter by ingredients</span>
              <Separator className="flex-1" />
            </div>

            {/* Multi-Ingredient Filter */}
            <div className="bg-card/50 backdrop-blur-sm rounded-lg p-6 border">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Ingredients
              </h3>
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    placeholder="Type an ingredient (suggestions show as you type)..."
                    value={ingredientInput}
                    onChange={(e) => {
                      setIngredientInput(e.target.value)
                    }}
                    className="h-12"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addIngredient() // No argument - uses input value
                      }
                    }}
                  />
                  {filteredIngredients.length > 0 && ingredientInput && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-md shadow-lg max-h-48 overflow-y-auto z-10">
                      {filteredIngredients.slice(0, 8).map((ing) => (
                        <button
                          key={ing.idIngredient}
                          onClick={() => addIngredient(ing.strIngredient)}
                          className="w-full text-left px-3 py-2 hover:bg-accent transition-colors text-sm"
                        >
                          {ing.strIngredient}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button onClick={() => addIngredient()} variant="outline" size="icon" className="h-12 w-12">
                  <Plus className="h-5 w-5" />
                </Button>
              </div>

              {/* Selected Ingredients */}
              {ingredients.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs font-semibold">
                      {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''} selected
                    </Badge>
                    <Button
                      onClick={undoRemoveIngredient}
                      disabled={!lastRemovedIngredient}
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs disabled:opacity-50"
                      title="Undo last removal"
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
                      title="Clear all ingredients"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              <Button onClick={searchRecipes} disabled={loading || ingredients.length === 0} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Find Recipes with These Ingredients
              </Button>

              <Separator className="my-4" />

              {/* Ingredient Count Filters */}
              <div className="space-y-3 bg-muted/30 rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Ingredient Count Filters (Optional)
                </h4>

                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium">
                        Exact ingredient count
                      </label>
                      {exactIngredientCount !== null && (
                        <button
                          onClick={() => {
                            setExactIngredientCount(null)
                            if (maxIngredients !== null || ingredients.length > 0 || searchTerm) {
                              searchRecipes()
                            }
                          }}
                          className="text-xs hover:text-destructive underline"
                        >
                          Clear
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
                      onBlur={() => {
                        // Trigger search when leaving the field if other filters are active
                        if (maxIngredients !== null || ingredients.length > 0 || searchTerm) {
                          searchRecipes()
                        }
                      }}
                      placeholder="e.g., 5 for exactly 5 ingredients"
                      className="h-10"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Find recipes with exactly this many ingredients.
                    </p>
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium">
                        Maximum ingredients
                      </label>
                      {maxIngredients !== null && (
                        <button
                          onClick={() => {
                            setMaxIngredients(null)
                            if (exactIngredientCount !== null || ingredients.length > 0 || searchTerm) {
                              searchRecipes()
                            }
                          }}
                          className="text-xs hover:text-destructive underline"
                        >
                          Clear
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
                      onBlur={() => {
                        // Trigger search when leaving the field if other filters are active
                        if (exactIngredientCount !== null || ingredients.length > 0 || searchTerm) {
                          searchRecipes()
                        }
                      }}
                      placeholder="e.g., 5 for ≤5 ingredients"
                      className="h-10"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Find simple recipes with at most this many ingredients.
                    </p>
                  </div>
                </div>

                {/* Search button for count filters only */}
                {(exactIngredientCount !== null || maxIngredients !== null) && (
                  <div className="space-y-2">
                    <Button
                      onClick={searchRecipes}
                      disabled={loading}
                      className="w-full"
                      variant="outline"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                      Search by Ingredient Count
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      {(!searchTerm && ingredients.length === 0)
                        ? "You can search using only ingredient count filters"
                        : "This will apply count filters to your current search"}
                    </p>
                  </div>
                )}

                {/* Active Filters Display */}
                {(exactIngredientCount !== null || maxIngredients !== null) && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Badge variant="secondary" className="text-xs">
                      Active filters:
                    </Badge>
                    <div className="flex gap-2 flex-wrap">
                      {exactIngredientCount !== null && (
                        <Badge variant="default" className="text-xs">
                          Exactly {exactIngredientCount} ingredient
                          {exactIngredientCount !== 1 ? 's' : ''}
                        </Badge>
                      )}
                      {maxIngredients !== null && (
                        <Badge variant="default" className="text-xs">
                          ≤{maxIngredients} ingredients
                        </Badge>
                      )}
                      <button
                        onClick={() => {
                          setExactIngredientCount(null)
                          setMaxIngredients(null)
                          searchRecipes()
                        }}
                        className="text-xs hover:text-destructive underline"
                      >
                        Clear filters
                      </button>
                    </div>
                  </div>
                )}

                {/* Invalid filter warning */}
                {exactIngredientCount !== null && maxIngredients !== null && exactIngredientCount > maxIngredients && (
                  <div className="flex items-start gap-2 mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
                    <Info className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-destructive">
                      Invalid filter combination: Exact count ({exactIngredientCount}) cannot be greater than maximum ({maxIngredients}). This will return no results.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Results Section */}
        {loading && meals.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <Skeleton className="h-48 w-full rounded-t-lg" />
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {!loading && meals.length > 0 && (
          <section>
            <div className="space-y-4">
              <h3 className="text-2xl font-bold">
                Found {meals.length} Recipe{meals.length !== 1 ? 's' : ''}
              </h3>

              {/* Active Filters Summary */}
              {(searchTerm || ingredients.length > 0 || exactIngredientCount !== null || maxIngredients !== null) && (
                <div className="flex flex-wrap gap-2 items-center text-sm">
                  <span className="text-muted-foreground">Filters:</span>
                  {searchTerm && (
                    <Badge variant="secondary" className="text-xs">
                      "{searchTerm}"
                    </Badge>
                  )}
                  {ingredients.map((ing) => (
                    <Badge key={ing} variant="secondary" className="text-xs">
                      {ing}
                    </Badge>
                  ))}
                  {exactIngredientCount !== null && (
                    <Badge variant="secondary" className="text-xs">
                      Exactly {exactIngredientCount} ingredients
                    </Badge>
                  )}
                  {maxIngredients !== null && (
                    <Badge variant="secondary" className="text-xs">
                      ≤{maxIngredients} ingredients
                    </Badge>
                  )}
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      setIngredients([])
                      setExactIngredientCount(null)
                      setMaxIngredients(null)
                      setMeals([])
                      setBackgroundImage('')
                      setRecipeCount(0)
                    }}
                    className="text-xs text-destructive hover:underline"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {meals.map((meal) => (
                <Card
                  key={meal.idMeal}
                  className="group cursor-pointer overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                  onClick={() => fetchMealDetails(meal.idMeal)}
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={meal.strMealThumb}
                      alt={meal.strMeal}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <CardTitle className="text-white text-lg line-clamp-2">{meal.strMeal}</CardTitle>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex gap-2 flex-wrap items-start justify-between">
                      <div className="flex gap-2 flex-wrap">
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
                        {/* Show ingredient count */}
                        {meal.ingredientCount !== undefined && (
                          <Badge variant="default" className="text-xs bg-primary/20">
                            {meal.ingredientCount} ingredient{meal.ingredientCount !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {!loading && meals.length === 0 && (searchTerm || ingredients.length > 0 || exactIngredientCount !== null || maxIngredients !== null) && (
          <div className="text-center py-12">
            <ChefHat className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No recipes found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search terms, ingredient combinations, or count filters.
            </p>
          </div>
        )}
      </main>

      {/* Recipe Detail Dialog */}
      <Dialog open={!!selectedMeal} onOpenChange={() => setSelectedMeal(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          {selectedMeal && (
            <>
              <DialogHeader>
                <div className="flex gap-4">
                  <img
                    src={selectedMeal.strMealThumb}
                    alt={selectedMeal.strMeal}
                    className="w-32 h-32 object-cover rounded-lg flex-shrink-0"
                  />
                  <div className="flex-1">
                    <DialogTitle className="text-2xl">{selectedMeal.strMeal}</DialogTitle>
                    <DialogDescription className="mt-2">
                      <div className="flex gap-2 flex-wrap">
                        {selectedMeal.strCategory && (
                          <Badge variant="secondary">{selectedMeal.strCategory}</Badge>
                        )}
                        {selectedMeal.strArea && (
                          <Badge variant="outline">{selectedMeal.strArea}</Badge>
                        )}
                      </div>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-6">
                  {/* Ingredients */}
                  <div>
                    <h4 className="font-semibold mb-3 text-lg">Ingredients</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {selectedMeal.strIngredients.map((ing, index) => (
                        <div key={index} className="flex items-start gap-2 bg-card/50 rounded-md p-2">
                          <span className="text-muted-foreground">•</span>
                          <div className="flex-1">
                            <span className="font-medium">{ing.name}</span>
                            {ing.measure && <span className="text-muted-foreground"> - {ing.measure}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Instructions */}
                  <div>
                    <h4 className="font-semibold mb-3 text-lg">Instructions</h4>
                    <div className="space-y-3">
                      {selectedMeal.strInstructionsList.map((step, index) => (
                        <div key={index} className="flex gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <p className="flex-1 pt-1">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedMeal.strTags && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-semibold mb-3">Tags</h4>
                        <div className="flex gap-2 flex-wrap">
                          {selectedMeal.strTags.split(',').map((tag, index) => (
                            <Badge key={index} variant="outline">
                              {tag.trim()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {selectedMeal.strYoutube && (
                    <>
                      <Separator />
                      <div>
                        <Button
                          variant="outline"
                          onClick={() => window.open(selectedMeal.strYoutube, '_blank')}
                          className="w-full"
                        >
                          Watch Video Tutorial
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t bg-background/80 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ChefHat className="h-4 w-4" />
              <span>Gourmet Recipes - Powered by TheMealDB & USDA</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Data provided by TheMealDB API and USDA FoodData Central
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
