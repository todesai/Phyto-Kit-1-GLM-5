import { NextResponse } from 'next/server'

// Cache ingredients for 1 hour to reduce API calls
let cachedIngredients: any[] = []
let lastFetchTime = 0
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour in milliseconds
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

// Helper function to delay retries
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Helper function to safely parse JSON
async function safeParseJSON(response: Response): Promise<{ success: boolean; data: any }> {
  try {
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      console.error('Non-JSON response received:', text.substring(0, 100))
      return { success: false, data: null }
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('JSON parse error:', error)
    return { success: false, data: null }
  }
}

// Fetch with retry logic
async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<{ success: boolean; data: any }> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'PhytoKit/1.0',
        }
      })
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        console.log(`Attempt ${attempt}/${retries}: HTTP ${response.status}`)
        if (attempt < retries) {
          await delay(RETRY_DELAY * attempt)
          continue
        }
        return { success: false, data: null }
      }
      
      const parseResult = await safeParseJSON(response)
      if (!parseResult.success) {
        if (attempt < retries) {
          await delay(RETRY_DELAY * attempt)
          continue
        }
        return { success: false, data: null }
      }
      
      return { success: true, data: parseResult.data }
    } catch (error: any) {
      clearTimeout(timeoutId)
      console.log(`Attempt ${attempt}/${retries} failed:`, error.message)
      if (attempt < retries) {
        await delay(RETRY_DELAY * attempt)
        continue
      }
      return { success: false, data: null }
    }
  }
  return { success: false, data: null }
}

export async function GET() {
  try {
    const now = Date.now()
    
    // Return cached data if still valid
    if (cachedIngredients.length > 0 && (now - lastFetchTime) < CACHE_DURATION) {
      return NextResponse.json({ ingredients: cachedIngredients, cached: true })
    }
    
    // If we have stale cache, still try to fetch but return cache immediately if available
    const hasStaleCache = cachedIngredients.length > 0
    
    // Fetch from TheMealDB with retry logic
    const result = await fetchWithRetry('https://www.themealdb.com/api/json/v1/1/list.php?i=list')
    
    if (result.success && result.data?.meals && Array.isArray(result.data.meals)) {
      cachedIngredients = result.data.meals
      lastFetchTime = now
      return NextResponse.json({ ingredients: result.data.meals, cached: false })
    }
    
    // If fetch failed but we have cached data, return it
    if (hasStaleCache) {
      console.log('Returning stale cached ingredients due to fetch failure')
      return NextResponse.json({ 
        ingredients: cachedIngredients, 
        cached: true, 
        stale: true,
        warning: 'Using cached data - external API temporarily unavailable'
      })
    }
    
    // No cache available - return empty with helpful message
    console.error('No ingredients available - fetch failed and no cache')
    return NextResponse.json({ 
      ingredients: [],
      error: 'Unable to fetch ingredients. Please check your connection and try again.',
      retryable: true
    })
    
  } catch (error) {
    console.error('Unexpected error in ingredients API:', error)
    
    // Last resort: return cached data if available
    if (cachedIngredients.length > 0) {
      return NextResponse.json({ 
        ingredients: cachedIngredients, 
        cached: true, 
        stale: true,
        warning: 'Using cached data due to unexpected error'
      })
    }
    
    return NextResponse.json({ 
      ingredients: [],
      error: 'Failed to fetch ingredients. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error',
      retryable: true
    })
  }
}
