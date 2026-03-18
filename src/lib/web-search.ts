/**
 * Web Search and Conservation API Utility
 * 
 * Provides web search functionality and direct API access to:
 * - IUCN Red List API (official)
 * - CITES database (via web search)
 */

interface SearchResult {
  url: string
  name: string
  snippet: string
  host_name: string
  rank: number
  date: string
  favicon: string
}

interface SearchResponse {
  result: SearchResult[]
}

// API Configuration
const API_BASE_URL = process.env.Z_AI_BASE_URL || 'http://172.25.136.193:8080/v1'
const API_KEY = process.env.Z_AI_API_KEY || 'Z.ai'
const IUCN_API_TOKEN = process.env.IUCN_API_TOKEN || ''

// ============================================
// IUCN RED LIST API (Official v4)
// ============================================

interface IucnV4Response {
  taxon: {
    sis_id: number
    scientific_name: string
    kingdom_name: string
    phylum_name: string
    class_name: string
    order_name: string
    family_name: string
    genus_name: string
    species_name: string
    authority: string
    common_names: Array<{
      main: boolean
      name: string
      language: string
    }>
    ssc_groups: Array<{
      name: string
      url: string
    }>
  }
  assessments: Array<{
    year_published: string
    latest: boolean
    sis_taxon_id: number
    url: string
    taxon_scientific_name: string
    red_list_category_code: string  // CR, EN, VU, NT, LC, etc.
    assessment_id: number
    scopes: Array<{
      description: { en: string }
      code: string
    }>
  }>
}

/**
 * Look up species directly from IUCN Red List API v4
 * API Documentation: https://api.iucnredlist.org/
 */
export async function lookupIucnSpecies(scientificName: string): Promise<{
  category: string | null
  populationTrend: string | null
  commonName: string | null
  source: string
  taxonId: number | null
  assessmentYear: string | null
  assessmentUrl: string | null
}> {
  if (!IUCN_API_TOKEN) {
    console.log('[IUCN] No API token configured')
    return { 
      category: null, 
      populationTrend: null, 
      commonName: null, 
      source: '', 
      taxonId: null,
      assessmentYear: null,
      assessmentUrl: null
    }
  }

  // Parse the scientific name into genus and species
  const parts = scientificName.trim().split(/\s+/)
  if (parts.length < 2) {
    console.log(`[IUCN] Invalid scientific name format: ${scientificName}`)
    return { 
      category: null, 
      populationTrend: null, 
      commonName: null, 
      source: '', 
      taxonId: null,
      assessmentYear: null,
      assessmentUrl: null
    }
  }

  const genusName = parts[0]
  const speciesName = parts[1]

  // Use the v4 API endpoint
  const url = `https://api.iucnredlist.org/api/v4/taxa/scientific_name?genus_name=${encodeURIComponent(genusName)}&species_name=${encodeURIComponent(speciesName)}`

  try {
    console.log(`[IUCN] Looking up: ${scientificName}`)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': IUCN_API_TOKEN,
        'Accept': 'application/json',
        'User-Agent': 'PhytoKit/1.0 (Conservation Status Lookup)'
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`[IUCN] Species not found: ${scientificName}`)
        return { 
          category: null, 
          populationTrend: null, 
          commonName: null, 
          source: '', 
          taxonId: null,
          assessmentYear: null,
          assessmentUrl: null
        }
      }
      const errorText = await response.text()
      console.error(`[IUCN] API error ${response.status}: ${errorText.substring(0, 200)}`)
      return { 
        category: null, 
        populationTrend: null, 
        commonName: null, 
        source: '', 
        taxonId: null,
        assessmentYear: null,
        assessmentUrl: null
      }
    }

    const data: IucnV4Response = await response.json()

    if (data.assessments && data.assessments.length > 0) {
      // Get the latest global assessment
      const latestGlobal = data.assessments.find(a => 
        a.latest && a.scopes.some(s => s.code === '1')
      ) || data.assessments.find(a => a.latest) || data.assessments[0]
      
      const mainCommonName = data.taxon?.common_names?.find(c => c.main)?.name || 
                            data.taxon?.common_names?.[0]?.name || null
      
      console.log(`[IUCN] Found: ${data.taxon.scientific_name} -> ${latestGlobal.red_list_category_code} (${latestGlobal.year_published})`)
      
      return {
        category: latestGlobal.red_list_category_code || null,
        populationTrend: null, // Not in v4 minimal response
        commonName: mainCommonName,
        source: `IUCN Red List v4 (ID: ${data.taxon.sis_id})`,
        taxonId: data.taxon.sis_id || null,
        assessmentYear: latestGlobal.year_published || null,
        assessmentUrl: latestGlobal.url || null
      }
    }

    console.log(`[IUCN] No assessments for: ${scientificName}`)
    return { 
      category: null, 
      populationTrend: null, 
      commonName: null, 
      source: '', 
      taxonId: null,
      assessmentYear: null,
      assessmentUrl: null
    }
  } catch (error) {
    console.error(`[IUCN] Error looking up ${scientificName}:`, error)
    return { 
      category: null, 
      populationTrend: null, 
      commonName: null, 
      source: '', 
      taxonId: null,
      assessmentYear: null,
      assessmentUrl: null
    }
  }
}

/**
 * Search IUCN by common name
 */
export async function searchIucnByCommonName(commonName: string): Promise<{
  results: Array<{
    scientificName: string
    category: string
    commonName: string
  }>
}> {
  if (!IUCN_API_TOKEN) {
    return { results: [] }
  }

  const encodedName = encodeURIComponent(commonName)
  const url = `https://apiv3.iucnredlist.org/api/v3/species/common-name/${encodedName}?token=${IUCN_API_TOKEN}`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PhytoKit/1.0',
        'Accept': 'application/json',
      }
    })

    if (!response.ok) {
      return { results: [] }
    }

    const data = await response.json()
    
    return {
      results: (data.result || []).map((r: any) => ({
        scientificName: r.scientific_name,
        category: r.category,
        commonName: r.main_common_name
      }))
    }
  } catch (error) {
    console.error('[IUCN] Common name search error:', error)
    return { results: [] }
  }
}

// ============================================
// WEB SEARCH (Fallback)
// ============================================

/**
 * Perform a web search using the Z-AI API
 */
export async function webSearch(query: string, numResults: number = 10): Promise<SearchResult[]> {
  const url = `${API_BASE_URL}/functions/invoke`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Token': API_KEY,
      'X-Z-AI-From': 'Z',
    },
    body: JSON.stringify({
      function_name: 'web_search',
      args: {
        query,
        num: numResults
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Web search failed: ${response.status} - ${errorText}`)
  }

  const data: SearchResponse = await response.json()
  return data.result || []
}

/**
 * Read a web page and extract content
 */
export async function readWebPage(url: string): Promise<any> {
  const apiUrl = `${API_BASE_URL}/functions/invoke`
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Token': API_KEY,
      'X-Z-AI-From': 'Z',
    },
    body: JSON.stringify({
      function_name: 'page_reader',
      args: {
        url
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Page read failed: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.result
}

// ============================================
// COMBINED SEARCH FUNCTIONS
// ============================================

/**
 * Search IUCN Red List for species conservation status
 * First tries the official API, then falls back to web search
 */
export async function searchIucn(scientificName: string): Promise<{ category: string | null; source: string }> {
  // Try official API first
  const apiResult = await lookupIucnSpecies(scientificName)
  
  if (apiResult.category) {
    return { 
      category: apiResult.category, 
      source: apiResult.source 
    }
  }

  // Fallback to web search (if API fails or token not configured)
  try {
    const results = await webSearch(`site:iucnredlist.org "${scientificName}" status`, 5)
    
    for (const result of results) {
      const snippet = result.snippet?.toLowerCase() || ''
      const category = mapIucnCategory(snippet)
      
      if (category) {
        return { category, source: result.url || 'IUCN Red List (web)' }
      }
    }
    
    const foundOnIucn = results.some(r => 
      r.url?.includes('iucnredlist.org') || r.host_name?.includes('iucnredlist.org')
    )
    
    if (foundOnIucn) {
      return { category: 'DD', source: 'IUCN Red List (needs verification)' }
    }
    
    return { category: null, source: '' }
  } catch (error) {
    console.error('IUCN search error:', error)
    return { category: null, source: '' }
  }
}

/**
 * Search CITES for trade status
 */
export async function searchCites(scientificName: string): Promise<{ status: string | null; source: string }> {
  try {
    const results = await webSearch(`site:speciesplus.net OR site:cites.org "${scientificName}" appendix`, 5)
    
    for (const result of results) {
      const snippet = result.snippet?.toLowerCase() || ''
      const url = result.url?.toLowerCase() || ''
      
      if (snippet.includes('appendix i') || snippet.includes('appendix 1')) {
        return { status: 'I', source: result.url || 'CITES' }
      }
      if (snippet.includes('appendix ii') || snippet.includes('appendix 2')) {
        return { status: 'II', source: result.url || 'CITES' }
      }
      if (snippet.includes('appendix iii') || snippet.includes('appendix 3')) {
        return { status: 'III', source: result.url || 'CITES' }
      }
    }
    
    const foundOnCites = results.some(r => 
      r.url?.includes('speciesplus.net') || r.url?.includes('cites.org')
    )
    
    if (foundOnCites) {
      return { status: 'not_listed', source: 'CITES (not listed)' }
    }
    
    return { status: null, source: '' }
  } catch (error) {
    console.error('CITES search error:', error)
    return { status: null, source: '' }
  }
}

// Helper function to map IUCN category text to code
function mapIucnCategory(text: string): string | null {
  if (text.includes('extinct in the wild') || text.includes('(ew)')) return 'EW'
  if (text.includes('extinct') && !text.includes('wild')) return 'EX'
  if (text.includes('critically endangered') || text.includes('(cr)')) return 'CR'
  if (text.includes('endangered') || text.includes('(en)')) return 'EN'
  if (text.includes('vulnerable') || text.includes('(vu)')) return 'VU'
  if (text.includes('near threatened') || text.includes('(nt)')) return 'NT'
  if (text.includes('least concern') || text.includes('(lc)')) return 'LC'
  if (text.includes('data deficient') || text.includes('(dd)')) return 'DD'
  return null
}
