/**
 * EPA CompTox Chemistry Dashboard API Client
 * 
 * Provides access to toxicity, hazard, and exposure data for chemicals.
 * API Documentation: https://comptox.epa.gov/ctx-api/docs/chemical.html
 * 
 * Cross-reference with PhytoHub compounds using:
 * - InChI Key (most reliable)
 * - CAS Number
 * - Chemical Name (fuzzy match)
 */

import { db } from '@/lib/db'

// API Configuration
const COMPTOX_API_BASE = 'https://comptox.epa.gov/ctx-api'

// Rate limiting
const REQUEST_DELAY_MS = 200 // Be respectful to EPA servers
let lastRequestTime = 0

// Types for API responses
interface CompToxChemicalDetail {
  dtxsid: string
  dtxcid?: string
  inchikey?: string
  casrn?: string
  iupacName?: string
  preferredName?: string
  synonyms?: string[]
  molecularFormula?: string
  molecularWeight?: number
  smile?: string
  inchi?: string
}

interface CompToxToxicityData {
  dtxsid: string
  endpointType: string
  endpointValue: number
  endpointUnit: string
  species?: string
  route?: string
  duration?: string
  studyType?: string
  source?: string
}

interface CompToxHazardData {
  dtxsid: string
  hazardCategory?: string
  hazardCode?: string
  hazardStatement?: string
  signalWord?: string
  pictogram?: string
  source?: string
}

interface CompToxSearchResult {
  dtxsid: string
  preferredName?: string
  casrn?: string
  inchikey?: string
  matchConfidence?: number
}

/**
 * Rate-limited fetch wrapper
 */
async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  
  if (timeSinceLastRequest < REQUEST_DELAY_MS) {
    await new Promise(resolve => 
      setTimeout(resolve, REQUEST_DELAY_MS - timeSinceLastRequest)
    )
  }
  
  lastRequestTime = Date.now()
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'PhytoKit/1.0 (Food Recipe Nutrition App)'
    }
  })
  
  return response
}

/**
 * Search for a chemical by InChI Key
 * Most reliable method for cross-referencing with PhytoHub
 */
export async function searchByInchiKey(inchiKey: string): Promise<CompToxSearchResult | null> {
  try {
    const url = `${COMPTOX_API_BASE}/chemical/detail/by-inchikey/${encodeURIComponent(inchiKey)}`
    const response = await rateLimitedFetch(url)
    
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`CompTox API error: ${response.status}`)
    }
    
    const data: CompToxChemicalDetail = await response.json()
    
    return {
      dtxsid: data.dtxsid,
      preferredName: data.preferredName,
      casrn: data.casrn,
      inchikey: data.inchikey,
      matchConfidence: 1.0 // Exact match
    }
  } catch (error) {
    console.error('CompTox InChI Key search error:', error)
    return null
  }
}

/**
 * Search for a chemical by CAS Registry Number
 */
export async function searchByCasNumber(casNumber: string): Promise<CompToxSearchResult | null> {
  try {
    const url = `${COMPTOX_API_BASE}/chemical/detail/by-casrn/${encodeURIComponent(casNumber)}`
    const response = await rateLimitedFetch(url)
    
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`CompTox API error: ${response.status}`)
    }
    
    const data: CompToxChemicalDetail = await response.json()
    
    return {
      dtxsid: data.dtxsid,
      preferredName: data.preferredName,
      casrn: data.casrn,
      inchikey: data.inchikey,
      matchConfidence: 1.0 // Exact match
    }
  } catch (error) {
    console.error('CompTox CAS search error:', error)
    return null
  }
}

/**
 * Search for a chemical by name (fuzzy matching)
 */
export async function searchByName(chemicalName: string): Promise<CompToxSearchResult[]> {
  try {
    const url = `${COMPTOX_API_BASE}/chemical/search?keyword=${encodeURIComponent(chemicalName)}`
    const response = await rateLimitedFetch(url)
    
    if (!response.ok) {
      throw new Error(`CompTox API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!Array.isArray(data)) return []
    
    return data.slice(0, 5).map((item: any) => ({
      dtxsid: item.dtxsid,
      preferredName: item.preferredName,
      casrn: item.casrn,
      inchikey: item.inchikey,
      matchConfidence: 0.8 // Name match is less reliable
    }))
  } catch (error) {
    console.error('CompTox name search error:', error)
    return []
  }
}

/**
 * Get detailed chemical information by DTXSID
 */
export async function getChemicalDetails(dtxsid: string): Promise<CompToxChemicalDetail | null> {
  try {
    const url = `${COMPTOX_API_BASE}/chemical/detail/by-dtxsid/${encodeURIComponent(dtxsid)}`
    const response = await rateLimitedFetch(url)
    
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`CompTox API error: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('CompTox detail fetch error:', error)
    return null
  }
}

/**
 * Get hazard data for a chemical
 */
export async function getHazardData(dtxsid: string): Promise<CompToxHazardData[]> {
  try {
    const url = `${COMPTOX_API_BASE}/hazard/search/by-dtxsid/${encodeURIComponent(dtxsid)}`
    const response = await rateLimitedFetch(url)
    
    if (!response.ok) {
      if (response.status === 404) return []
      throw new Error(`CompTox API error: ${response.status}`)
    }
    
    const data = await response.json()
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('CompTox hazard fetch error:', error)
    return []
  }
}

/**
 * Get toxicity data for a chemical
 */
export async function getToxicityData(dtxsid: string): Promise<CompToxToxicityData[]> {
  try {
    const url = `${COMPTOX_API_BASE}/toxicity/search/by-dtxsid/${encodeURIComponent(dtxsid)}`
    const response = await rateLimitedFetch(url)
    
    if (!response.ok) {
      if (response.status === 404) return []
      throw new Error(`CompTox API error: ${response.status}`)
    }
    
    const data = await response.json()
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('CompTox toxicity fetch error:', error)
    return []
  }
}

/**
 * Parse toxicity data into structured format
 */
function parseToxicityData(toxicityData: CompToxToxicityData[]): {
  ld50Oral?: number
  ld50OralSpecies?: string
  noael?: number
  noaelSpecies?: string
  loael?: number
  loaelSpecies?: string
} {
  const result: any = {}
  
  for (const item of toxicityData) {
    const endpoint = item.endpointType?.toLowerCase()
    
    if (endpoint?.includes('ld50') && item.route?.toLowerCase().includes('oral')) {
      if (!result.ld50Oral || item.endpointValue < result.ld50Oral) {
        result.ld50Oral = item.endpointValue
        result.ld50OralSpecies = item.species
      }
    }
    
    if (endpoint?.includes('noael')) {
      if (!result.noael || item.endpointValue < result.noael) {
        result.noael = item.endpointValue
        result.noaelSpecies = item.species
      }
    }
    
    if (endpoint?.includes('loael')) {
      if (!result.loael || item.endpointValue < result.loael) {
        result.loael = item.endpointValue
        result.loaelSpecies = item.species
      }
    }
  }
  
  return result
}

/**
 * Parse hazard data into GHS classifications
 */
function parseHazardData(hazardData: CompToxHazardData[]): {
  ghsHazardCategories?: string[]
  ghsSignalWord?: string
  ghsPictograms?: string[]
  hazardStatements?: string[]
} {
  const categories = new Set<string>()
  const pictograms = new Set<string>()
  const statements: string[] = []
  let signalWord: string | undefined
  
  for (const item of hazardData) {
    if (item.hazardCategory) categories.add(item.hazardCategory)
    if (item.pictogram) pictograms.add(item.pictogram)
    if (item.hazardStatement) statements.push(item.hazardStatement)
    if (item.signalWord && !signalWord) signalWord = item.signalWord
  }
  
  const result: any = {}
  if (categories.size > 0) result.ghsHazardCategories = Array.from(categories)
  if (signalWord) result.ghsSignalWord = signalWord
  if (pictograms.size > 0) result.ghsPictograms = Array.from(pictograms)
  if (statements.length > 0) result.hazardStatements = statements
  
  return result
}

/**
 * Fetch and cache toxicity data for a PhytoHub compound
 */
export async function fetchAndCacheToxicity(
  phytoHubId: string,
  inchiKey?: string | null,
  casNumber?: string | null,
  chemicalName?: string
): Promise<{
  found: boolean
  dtxsid?: string
  hasWarnings: boolean
  warnings: string[]
}> {
  try {
    // Check if we already have cached data
    const existingMatch = await db.toxicityMatch.findUnique({
      where: { phytoHubCompoundId: phytoHubId }
    })
    
    // Return cached data if recent (within 30 days)
    if (existingMatch) {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      if (existingMatch.lastChecked > thirtyDaysAgo) {
        return {
          found: existingMatch.hasToxicityData,
          dtxsid: existingMatch.comptoxId || undefined,
          hasWarnings: existingMatch.hasWarnings,
          warnings: existingMatch.cachedWarnings 
            ? JSON.parse(existingMatch.cachedWarnings) 
            : []
        }
      }
    }
    
    // Try to find chemical in CompTox
    let searchResult: CompToxSearchResult | null = null
    let matchMethod = 'none'
    
    // Priority 1: InChI Key (most reliable)
    if (inchiKey) {
      searchResult = await searchByInchiKey(inchiKey)
      if (searchResult) matchMethod = 'inchikey'
    }
    
    // Priority 2: CAS Number
    if (!searchResult && casNumber) {
      searchResult = await searchByCasNumber(casNumber)
      if (searchResult) matchMethod = 'cas'
    }
    
    // Priority 3: Chemical Name (less reliable)
    if (!searchResult && chemicalName) {
      const results = await searchByName(chemicalName)
      if (results.length > 0) {
        searchResult = results[0]
        matchMethod = 'name-fuzzy'
      }
    }
    
    if (!searchResult) {
      // No match found - create negative cache entry
      await db.toxicityMatch.upsert({
        where: { phytoHubCompoundId: phytoHubId },
        create: {
          phytoHubCompoundId: phytoHubId,
          phytoHubCompoundName: chemicalName || 'Unknown',
          matchMethod: 'none',
          matchConfidence: 0,
          hasToxicityData: false,
          hasWarnings: false
        },
        update: {
          lastChecked: new Date()
        }
      })
      
      return { found: false, hasWarnings: false, warnings: [] }
    }
    
    // Fetch detailed toxicity and hazard data
    const [toxicityData, hazardData] = await Promise.all([
      getToxicityData(searchResult.dtxsid),
      getHazardData(searchResult.dtxsid)
    ])
    
    // Parse data
    const parsedToxicity = parseToxicityData(toxicityData)
    const parsedHazard = parseHazardData(hazardData)
    
    // Build warnings list
    const warnings: string[] = []
    if (parsedToxicity.ld50Oral && parsedToxicity.ld50Oral < 500) {
      warnings.push(`High acute toxicity (LD50: ${parsedToxicity.ld50Oral} mg/kg)`)
    }
    if (parsedHazard.ghsSignalWord === 'Danger') {
      warnings.push('GHS Signal Word: Danger')
    }
    if (parsedHazard.ghsHazardCategories?.length) {
      warnings.push(...parsedHazard.ghsHazardCategories)
    }
    if (parsedHazard.hazardStatements?.length) {
      warnings.push(...parsedHazard.hazardStatements.slice(0, 3))
    }
    
    // Store in CompTox cache
    await db.compToxToxicity.upsert({
      where: { dtxsid: searchResult.dtxsid },
      create: {
        dtxsid: searchResult.dtxsid,
        inchiKey: searchResult.inchikey || inchiKey,
        casrn: searchResult.casrn || casNumber,
        preferredName: searchResult.preferredName,
        ld50Oral: parsedToxicity.ld50Oral,
        ld50OralSpecies: parsedToxicity.ld50OralSpecies,
        noael: parsedToxicity.noael,
        noaelSpecies: parsedToxicity.noaelSpecies,
        loael: parsedToxicity.loael,
        loaelSpecies: parsedToxicity.loaelSpecies,
        ghsHazardCategories: parsedHazard.ghsHazardCategories 
          ? JSON.stringify(parsedHazard.ghsHazardCategories) 
          : null,
        ghsSignalWord: parsedHazard.ghsSignalWord,
        ghsPictograms: parsedHazard.ghsPictograms 
          ? JSON.stringify(parsedHazard.ghsPictograms) 
          : null,
        hazardStatements: parsedHazard.hazardStatements 
          ? JSON.stringify(parsedHazard.hazardStatements) 
          : null,
        sources: JSON.stringify(['CompTox API']),
        lastApiFetch: new Date()
      },
      update: {
        inchiKey: searchResult.inchikey || inchiKey,
        casrn: searchResult.casrn || casNumber,
        preferredName: searchResult.preferredName,
        ld50Oral: parsedToxicity.ld50Oral,
        ld50OralSpecies: parsedToxicity.ld50OralSpecies,
        noael: parsedToxicity.noael,
        noaelSpecies: parsedToxicity.noaelSpecies,
        loael: parsedToxicity.loael,
        loaelSpecies: parsedToxicity.loaelSpecies,
        ghsHazardCategories: parsedHazard.ghsHazardCategories 
          ? JSON.stringify(parsedHazard.ghsHazardCategories) 
          : null,
        ghsSignalWord: parsedHazard.ghsSignalWord,
        ghsPictograms: parsedHazard.ghsPictograms 
          ? JSON.stringify(parsedHazard.ghsPictograms) 
          : null,
        hazardStatements: parsedHazard.hazardStatements 
          ? JSON.stringify(parsedHazard.hazardStatements) 
          : null,
        lastApiFetch: new Date()
      }
    })
    
    // Store toxicity match
    await db.toxicityMatch.upsert({
      where: { phytoHubCompoundId: phytoHubId },
      create: {
        phytoHubCompoundId: phytoHubId,
        phytoHubCompoundName: chemicalName || 'Unknown',
        comptoxId: searchResult.dtxsid,
        matchMethod,
        matchConfidence: searchResult.matchConfidence || 0.8,
        hasToxicityData: toxicityData.length > 0 || hazardData.length > 0,
        hasWarnings: warnings.length > 0,
        warningCount: warnings.length,
        cachedLd50: parsedToxicity.ld50Oral,
        cachedNoael: parsedToxicity.noael,
        cachedWarnings: warnings.length > 0 ? JSON.stringify(warnings) : null,
        lastChecked: new Date()
      },
      update: {
        comptoxId: searchResult.dtxsid,
        matchMethod,
        matchConfidence: searchResult.matchConfidence || 0.8,
        hasToxicityData: toxicityData.length > 0 || hazardData.length > 0,
        hasWarnings: warnings.length > 0,
        warningCount: warnings.length,
        cachedLd50: parsedToxicity.ld50Oral,
        cachedNoael: parsedToxicity.noael,
        cachedWarnings: warnings.length > 0 ? JSON.stringify(warnings) : null,
        lastChecked: new Date()
      }
    })
    
    return {
      found: true,
      dtxsid: searchResult.dtxsid,
      hasWarnings: warnings.length > 0,
      warnings
    }
  } catch (error) {
    console.error('Error fetching CompTox toxicity:', error)
    return { found: false, hasWarnings: false, warnings: [] }
  }
}

/**
 * Batch fetch toxicity for multiple compounds
 */
export async function batchFetchToxicity(
  compounds: Array<{
    id: string
    name: string
    inchiKey?: string | null
    casNumber?: string | null
  }>,
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, { found: boolean; hasWarnings: boolean; warnings: string[] }>> {
  const results = new Map<string, { found: boolean; hasWarnings: boolean; warnings: string[] }>()
  
  for (let i = 0; i < compounds.length; i++) {
    const compound = compounds[i]
    
    const result = await fetchAndCacheToxicity(
      compound.id,
      compound.inchiKey,
      compound.casNumber,
      compound.name
    )
    
    results.set(compound.id, result)
    
    if (onProgress) {
      onProgress(i + 1, compounds.length)
    }
  }
  
  return results
}

/**
 * Get cached toxicity data for display
 */
export async function getToxicityForCompound(phytoHubCompoundId: string): Promise<{
  hasData: boolean
  ld50?: number
  noael?: number
  adi?: number
  warnings: string[]
  hazardCategories: string[]
  lastChecked?: Date
}> {
  const match = await db.toxicityMatch.findUnique({
    where: { phytoHubCompoundId }
  })
  
  if (!match) {
    return { hasData: false, warnings: [], hazardCategories: [] }
  }
  
  let hazardCategories: string[] = []
  
  if (match.comptoxId) {
    const comptox = await db.compToxToxicity.findUnique({
      where: { dtxsid: match.comptoxId }
    })
    
    if (comptox?.ghsHazardCategories) {
      hazardCategories = JSON.parse(comptox.ghsHazardCategories)
    }
  }
  
  return {
    hasData: match.hasToxicityData,
    ld50: match.cachedLd50 || undefined,
    noael: match.cachedNoael || undefined,
    adi: match.cachedAdi || undefined,
    warnings: match.cachedWarnings ? JSON.parse(match.cachedWarnings) : [],
    hazardCategories,
    lastChecked: match.lastChecked
  }
}
