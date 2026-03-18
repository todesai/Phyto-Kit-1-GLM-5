import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

interface MealDetail {
  idMeal: string
  strMeal: string
  strMealThumb: string
  strCategory?: string
  strArea?: string
  strInstructions?: string
  strTags?: string
  strYoutube?: string
  strIngredients: { name: string; measure: string }[]
  strInstructionsList: string[]
  [key: string]: unknown
}

interface BioactiveCompound {
  name: string
  source: string
  benefits: string[]
  warnings?: string[]
}

interface FoodSafetyInfo {
  ingredient: string
  hazards: string[]
  safeHandling: string[]
  storageTips: string[]
  allergenInfo?: string[]
  cookingTemp?: string
}

// Get bioactive compounds for ingredients using AI
async function getBioactiveCompounds(ingredients: { name: string; measure: string }[], language: string): Promise<BioactiveCompound[]> {
  try {
    const zai = await ZAI.create()
    
    const ingredientList = ingredients.map(i => i.name).join(', ')
    const isSpanish = language === 'es'
    
    const systemPrompt = isSpanish 
      ? `Eres un experto en química de alimentos especializado en fitoquímicos y compuestos bioactivos.
          Devuelve un arreglo JSON de compuestos bioactivos encontrados en los ingredientes dados.
          Cada compuesto debe tener: name (string), source (string - nombre del ingrediente), benefits (arreglo de strings), warnings (arreglo de strings, opcional).
          Enfócate en compuestos científicamente validados como flavonoides, carotenoides, polifenoles, etc.
          Devuelve SOLO JSON válido, sin markdown ni explicación.`
      : `You are a food chemistry expert specializing in phytochemicals and bioactive compounds. 
          Return a JSON array of bioactive compounds found in the given ingredients.
          Each compound should have: name (string), source (string - ingredient name), benefits (array of strings), warnings (array of strings, optional).
          Focus on scientifically validated compounds like flavonoids, carotenoids, polyphenols, etc.
          Return ONLY valid JSON, no markdown or explanation.`

    const userPrompt = isSpanish
      ? `Analiza estos ingredientes para compuestos bioactivos: ${ingredientList}. 
          Devuelve un arreglo JSON con 3-5 compuestos clave. Cada objeto debe tener: name, source, benefits (arreglo), warnings (arreglo si hay).`
      : `Analyze these ingredients for bioactive compounds: ${ingredientList}. 
          Return a JSON array with 3-5 key compounds. Each object must have: name, source, benefits (array), warnings (array if any).`

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
    })

    const content = completion.choices[0]?.message?.content || '[]'
    
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) return JSON.parse(jsonMatch[0])
    } catch {
      console.error('Failed to parse bioactive compounds response')
    }
    
    return []
  } catch (error) {
    console.error('Error getting bioactive compounds:', error)
    return []
  }
}

// Get food safety information for ingredients using AI
async function getFoodSafety(ingredients: { name: string; measure: string }[], language: string): Promise<FoodSafetyInfo[]> {
  try {
    const zai = await ZAI.create()
    
    const ingredientList = ingredients.map(i => i.name).join(', ')
    const isSpanish = language === 'es'
    
    const systemPrompt = isSpanish
      ? `Eres un experto en seguridad alimentaria especializado en HACCP, directrices FDA y estándares Codex Alimentarius.
          Devuelve un arreglo JSON de información de seguridad alimentaria para los ingredientes dados.
          Cada elemento debe tener: ingredient (string), hazards (arreglo de strings), safeHandling (arreglo de strings), 
          storageTips (arreglo de strings), allergenInfo (arreglo de strings, opcional), cookingTemp (string, opcional).
          Enfócate en orientación práctica basada en evidencia.
          Devuelve SOLO JSON válido, sin markdown ni explicación.`
      : `You are a food safety expert specializing in HACCP, FDA guidelines, and Codex Alimentarius standards.
          Return a JSON array of food safety information for the given ingredients.
          Each item should have: ingredient (string), hazards (array of strings), safeHandling (array of strings), 
          storageTips (array of strings), allergenInfo (array of strings, optional), cookingTemp (string, optional).
          Focus on practical, evidence-based safety guidance.
          Return ONLY valid JSON, no markdown or explanation.`

    const userPrompt = isSpanish
      ? `Proporciona información de seguridad alimentaria para estos ingredientes: ${ingredientList}.
          Devuelve un arreglo JSON con información de seguridad para ingredientes clave (especialmente proteínas y artículos de alto riesgo).
          Cada objeto debe tener: ingredient, hazards (arreglo), safeHandling (arreglo), storageTips (arreglo). 
          Opcionalmente incluye: allergenInfo (arreglo), cookingTemp (string).`
      : `Provide food safety information for these ingredients: ${ingredientList}.
          Return a JSON array with safety info for key ingredients (especially proteins and high-risk items).
          Each object must have: ingredient, hazards (array), safeHandling (array), storageTips (array). 
          Optionally include: allergenInfo (array), cookingTemp (string).`

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
    })

    const content = completion.choices[0]?.message?.content || '[]'
    
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) return JSON.parse(jsonMatch[0])
    } catch {
      console.error('Failed to parse food safety response')
    }
    
    return []
  } catch (error) {
    console.error('Error getting food safety:', error)
    return []
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const searchParams = request.nextUrl.searchParams
  const aiOnly = searchParams.get('aiOnly') === 'true'
  const language = searchParams.get('lang') || 'en'
  
  try {
    // If aiOnly is true, we only return AI-generated data
    if (aiOnly) {
      // First fetch the meal to get ingredients
      const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`)
      const data = await response.json()
      const meal = data.meals?.[0]
      
      if (!meal) {
        return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
      }
      
      // Parse ingredients
      const ingredients: { name: string; measure: string }[] = []
      for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`]
        const measure = meal[`strMeasure${i}`]
        if (ingredient && ingredient.trim()) {
          ingredients.push({ name: ingredient.trim(), measure: measure?.trim() || '' })
        }
      }
      
      // Get AI analysis in parallel
      const [bioactiveCompounds, foodSafety] = await Promise.all([
        getBioactiveCompounds(ingredients, language),
        getFoodSafety(ingredients, language),
      ])
      
      return NextResponse.json({
        bioactiveCompounds,
        foodSafety,
      })
    }
    
    // Full fetch (original behavior for backward compatibility)
    const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`)
    const data = await response.json()
    const meal = data.meals?.[0]
    
    if (!meal) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }
    
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
    const instructionsList: string[] = meal.strInstructions
      ? meal.strInstructions.split('\r\n').filter((step: string) => step.trim())
      : []
    
    const mealDetail: MealDetail = {
      ...meal,
      strIngredients: ingredients,
      strInstructionsList: instructionsList,
    }
    
    // Estimate nutrition (fast, no AI)
    const nutrition = {
      calories: ingredients.length * 120,
      protein: ingredients.length * 6,
      carbs: ingredients.length * 15,
      fat: ingredients.length * 5,
      fiber: ingredients.length * 2,
      sugar: ingredients.length * 3,
      sodium: ingredients.length * 150,
      potassium: ingredients.length * 200,
      calcium: ingredients.length * 40,
      iron: ingredients.length * 1.5,
      vitaminC: ingredients.length * 8,
      vitaminA: ingredients.length * 300,
    }
    
    // Get AI analysis in parallel
    const [bioactiveCompounds, foodSafety] = await Promise.all([
      getBioactiveCompounds(ingredients, language),
      getFoodSafety(ingredients, language),
    ])
    
    return NextResponse.json({
      meal: mealDetail,
      nutrition,
      bioactiveCompounds,
      foodSafety,
    })
  } catch (error) {
    console.error('Error fetching meal details:', error)
    return NextResponse.json({ error: 'Failed to fetch recipe details' }, { status: 500 })
  }
}
