import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { searchIucn, searchCites } from '@/lib/web-search'

// Import CITES cache (41,664 species)
import { CITES_CACHE } from '@/data/cites-cache'

// ============================================
// CONSERVATION STATUS LOOKUP API
// ============================================
// This endpoint checks conservation status for ingredients
// using multiple data sources:
// 1. Local cache of known species
// 2. Web search to IUCN Red List
// 3. Web search to CITES Species+ database

interface ConservationResult {
  scientificName: string
  iucnCategory: string | null
  citesStatus: string | null
  regionalStatus: string | null
  riskLevel: string
  tradeRestricted: boolean
  sources: string[]
  lastAssessed: string | null
  // Match information
  matchType: 'exact' | 'genus_inference' | 'web_search' | 'not_found' | 'error'
  matchedSpecies?: string  // When genus inference, which species was matched
  needsVerification?: boolean  // True if the result should be manually verified
  error?: string
}

// Known conservation status for common food species
// This serves as a local cache/fallback
const KNOWN_STATUS: Record<string, Partial<ConservationResult>> = {
  // Sturgeons - critically endangered, CITES Appendix II
  'acipenser baerii': { iucnCategory: 'EN', citesStatus: 'II', riskLevel: 'high', tradeRestricted: true, sources: ['IUCN', 'CITES'] },
  'acipenser gueldenstaedtii': { iucnCategory: 'CR', citesStatus: 'II', riskLevel: 'critical', tradeRestricted: true, sources: ['IUCN', 'CITES'] },
  'acipenser ruthenus': { iucnCategory: 'VU', citesStatus: 'II', riskLevel: 'moderate', tradeRestricted: true, sources: ['IUCN', 'CITES'] },
  'acipenser stellatus': { iucnCategory: 'CR', citesStatus: 'II', riskLevel: 'critical', tradeRestricted: true, sources: ['IUCN', 'CITES'] },
  'huso huso': { iucnCategory: 'CR', citesStatus: 'II', riskLevel: 'critical', tradeRestricted: true, sources: ['IUCN', 'CITES'] },
  
  // Bluefin tuna - endangered
  'thunnus thynnus': { iucnCategory: 'EN', citesStatus: 'not_listed', riskLevel: 'high', tradeRestricted: false, sources: ['IUCN'] },
  'thunnus orientalis': { iucnCategory: 'VU', citesStatus: 'not_listed', riskLevel: 'moderate', tradeRestricted: false, sources: ['IUCN'] },
  
  // Eels - critically endangered
  'anguilla anguilla': { iucnCategory: 'CR', citesStatus: 'II', riskLevel: 'critical', tradeRestricted: true, sources: ['IUCN', 'CITES'] },
  'anguilla rostrata': { iucnCategory: 'EN', citesStatus: 'II', riskLevel: 'high', tradeRestricted: true, sources: ['IUCN', 'CITES'] },
  
  // Sharks
  'sphyrna lewini': { iucnCategory: 'CR', citesStatus: 'II', riskLevel: 'critical', tradeRestricted: true, sources: ['IUCN', 'CITES'] },
  'carcharhinus limbatus': { iucnCategory: 'VU', citesStatus: 'II', riskLevel: 'moderate', tradeRestricted: true, sources: ['IUCN', 'CITES'] },
  'isurus oxyrinchus': { iucnCategory: 'EN', citesStatus: 'II', riskLevel: 'high', tradeRestricted: true, sources: ['IUCN', 'CITES'] },
  'carcharodon carcharias': { iucnCategory: 'VU', citesStatus: 'II', riskLevel: 'moderate', tradeRestricted: true, sources: ['IUCN', 'CITES'] },
  
  // Groupers - important food fish with conservation concerns
  'epinephelus itajara': { iucnCategory: 'VU', citesStatus: 'not_listed', riskLevel: 'moderate', tradeRestricted: false, sources: ['IUCN'], regionalStatus: 'US/Brazil: Protected since 1990/2002' },
  'epinephelus lanceolatus': { iucnCategory: 'VU', citesStatus: 'not_listed', riskLevel: 'moderate', tradeRestricted: false, sources: ['IUCN'] },
  'epinephelus malabaricus': { iucnCategory: 'VU', citesStatus: 'not_listed', riskLevel: 'moderate', tradeRestricted: false, sources: ['IUCN'] },
  'epinephelus coioides': { iucnCategory: 'VU', citesStatus: 'not_listed', riskLevel: 'moderate', tradeRestricted: false, sources: ['IUCN'] },
  'epinephelusfuscoguttatus': { iucnCategory: 'VU', citesStatus: 'not_listed', riskLevel: 'moderate', tradeRestricted: false, sources: ['IUCN'] },
  'mycteroperca microlepis': { iucnCategory: 'VU', citesStatus: 'not_listed', riskLevel: 'moderate', tradeRestricted: false, sources: ['IUCN'] },
  
  // Seahorses - all CITES Appendix II
  'hippocampus kuda': { iucnCategory: 'VU', citesStatus: 'II', riskLevel: 'moderate', tradeRestricted: true, sources: ['IUCN', 'CITES'] },
  'hippocampus abdominalis': { iucnCategory: 'LC', citesStatus: 'II', riskLevel: 'low', tradeRestricted: true, sources: ['IUCN', 'CITES'] },
  
  // Mexican protected species (NOM-059)
  'echinocactus platyacanthus': { iucnCategory: 'VU', citesStatus: 'II', regionalStatus: 'NOM-059: Amenazada', riskLevel: 'moderate', tradeRestricted: true, sources: ['IUCN', 'CITES', 'NOM-059'] },
  'yucca filifera': { citesStatus: 'II', regionalStatus: 'NOM-059: Sujeta a protección especial', riskLevel: 'moderate', tradeRestricted: true, sources: ['CITES', 'NOM-059'] },
  'ambystoma mexicanum': { iucnCategory: 'CR', citesStatus: 'II', regionalStatus: 'NOM-059: En peligro de extinción', riskLevel: 'critical', tradeRestricted: true, sources: ['IUCN', 'CITES', 'NOM-059'] },
  
  // FAO Wild Dozen plants
  'bertholletia excelsa': { iucnCategory: 'VU', citesStatus: 'not_listed', riskLevel: 'moderate', tradeRestricted: false, sources: ['IUCN', 'FAO'] },
  'boswellia sacra': { iucnCategory: 'NT', citesStatus: 'not_listed', riskLevel: 'low', tradeRestricted: false, sources: ['IUCN', 'FAO'] },
  'glycyrrhiza glabra': { iucnCategory: 'LC', citesStatus: 'not_listed', riskLevel: 'stable', tradeRestricted: false, sources: ['IUCN'] },
  'acacia senegal': { iucnCategory: 'LC', citesStatus: 'not_listed', riskLevel: 'stable', tradeRestricted: false, sources: ['IUCN'] },
  'euphorbia antisyphilitica': { citesStatus: 'II', riskLevel: 'moderate', tradeRestricted: true, sources: ['CITES', 'FAO'] },
  
  // Common safe species
  'allium cepa': { iucnCategory: 'LC', citesStatus: 'not_listed', riskLevel: 'stable', tradeRestricted: false, sources: ['IUCN'] },
  'solanum lycopersicum': { iucnCategory: 'LC', citesStatus: 'not_listed', riskLevel: 'stable', tradeRestricted: false, sources: ['IUCN'] },
  'zea mays': { iucnCategory: 'LC', citesStatus: 'not_listed', riskLevel: 'stable', tradeRestricted: false, sources: ['IUCN'] },
  'phaseolus vulgaris': { iucnCategory: 'LC', citesStatus: 'not_listed', riskLevel: 'stable', tradeRestricted: false, sources: ['IUCN'] },
  'capsicum annuum': { iucnCategory: 'LC', citesStatus: 'not_listed', riskLevel: 'stable', tradeRestricted: false, sources: ['IUCN'] },
  
  // Watercress (berro)
  'nasturtium officinale': { iucnCategory: 'LC', citesStatus: 'not_listed', riskLevel: 'stable', tradeRestricted: false, sources: ['IUCN'] },
  'rorippa nasturtium-aquaticum': { iucnCategory: 'LC', citesStatus: 'not_listed', riskLevel: 'stable', tradeRestricted: false, sources: ['IUCN'] },
}

// Normalize scientific name for lookup
function normalizeScientificName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

// Map IUCN category text to code
function mapIucnCategory(text: string): string | null {
  const lowerText = text.toLowerCase()
  
  if (lowerText.includes('extinct in the wild') || lowerText.includes('(ew)')) return 'EW'
  if (lowerText.includes('extinct') && !lowerText.includes('wild')) return 'EX'
  if (lowerText.includes('critically endangered') || lowerText.includes('(cr)')) return 'CR'
  if (lowerText.includes('endangered') || lowerText.includes('(en)')) return 'EN'
  if (lowerText.includes('vulnerable') || lowerText.includes('(vu)')) return 'VU'
  if (lowerText.includes('near threatened') || lowerText.includes('(nt)')) return 'NT'
  if (lowerText.includes('least concern') || lowerText.includes('(lc)')) return 'LC'
  if (lowerText.includes('data deficient') || lowerText.includes('(dd)')) return 'DD'
  
  return null
}

// Map risk level from IUCN category
function calculateRiskLevel(iucnCategory: string | null, citesStatus: string | null): string {
  if (iucnCategory === 'CR' || iucnCategory === 'EW' || iucnCategory === 'EX') return 'critical'
  if (iucnCategory === 'EN' || citesStatus === 'I') return 'high'
  if (iucnCategory === 'VU' || citesStatus === 'II') return 'moderate'
  if (iucnCategory === 'NT' || citesStatus === 'III') return 'low'
  if (iucnCategory === 'LC') return 'stable'
  if (iucnCategory === 'DD') return 'unknown'
  
  return 'unknown'
}

// Search IUCN Red List for conservation status (uses web-search utility)
const searchIucnStatus = searchIucn

// Search CITES for trade status (uses web-search utility)
const searchCitesStatus = searchCites

// ============================================
// GET - Check conservation status for a single species
// ============================================
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const scientificName = searchParams.get('scientificName')
    const itemId = searchParams.get('itemId')
    const batch = searchParams.get('batch') === 'true'

    // Batch mode: Get all items with taxon that need status update
    if (batch) {
      const items = await db.mexicanFood.findMany({
        where: {
          taxon: { not: null },
          conservationStatus: null // Only items without status
        },
        select: {
          id: true,
          nombreEspanol: true,
          taxon: true
        },
        take: 100 // Limit batch size
      })

      const results: Array<{ itemId: string; name: string; result: ConservationResult }> = []

      for (const item of items) {
        if (item.taxon) {
          const result = await lookupConservationStatus(item.taxon)
          results.push({
            itemId: item.id,
            name: item.nombreEspanol,
            result
          })

          // Auto-save if found
          if (result.riskLevel !== 'unknown') {
            await db.mexicanFood.update({
              where: { id: item.id },
              data: {
                conservationStatus: JSON.stringify(result)
              }
            })
          }
        }
      }

      return NextResponse.json({
        success: true,
        processed: results.length,
        results
      })
    }

    // Single item lookup
    if (!scientificName && !itemId) {
      return NextResponse.json({ error: 'scientificName or itemId required' }, { status: 400 })
    }

    let taxonToCheck = scientificName

    // If itemId provided, get the taxon from database
    if (itemId && !taxonToCheck) {
      const item = await db.mexicanFood.findUnique({
        where: { id: itemId },
        select: { taxon: true, nombreEspanol: true }
      })
      
      if (!item) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }
      
      taxonToCheck = item.taxon
      
      if (!taxonToCheck) {
        return NextResponse.json({ 
          error: 'No scientific name (taxon) set for this item',
          itemName: item.nombreEspanol
        }, { status: 400 })
      }
    }

    const result = await lookupConservationStatus(taxonToCheck!)
    
    return NextResponse.json({
      success: true,
      scientificName: taxonToCheck,
      result
    })
  } catch (error) {
    console.error('Conservation status lookup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// POST - Save conservation status to item
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { itemId, conservationStatus, autoLookup } = body

    if (!itemId) {
      return NextResponse.json({ error: 'itemId required' }, { status: 400 })
    }

    const item = await db.mexicanFood.findUnique({
      where: { id: itemId },
      select: { id: true, taxon: true, nombreEspanol: true }
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    let statusToSave = conservationStatus

    // Auto-lookup if requested
    if (autoLookup && item.taxon) {
      const result = await lookupConservationStatus(item.taxon)
      statusToSave = result
    }

    if (!statusToSave) {
      return NextResponse.json({ error: 'No conservation status to save' }, { status: 400 })
    }

    const updated = await db.mexicanFood.update({
      where: { id: itemId },
      data: {
        conservationStatus: typeof statusToSave === 'string' 
          ? statusToSave 
          : JSON.stringify(statusToSave)
      }
    })

    return NextResponse.json({
      success: true,
      item: {
        id: updated.id,
        nombreEspanol: updated.nombreEspanol,
        conservationStatus: updated.conservationStatus
      }
    })
  } catch (error) {
    console.error('Save conservation status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// Core lookup function
// ============================================
async function lookupConservationStatus(scientificName: string): Promise<ConservationResult> {
  const normalizedName = normalizeScientificName(scientificName)
  
  // Check local cache first
  const knownStatus = KNOWN_STATUS[normalizedName]
  
  if (knownStatus) {
    console.log(`[Conservation] Found exact match for "${scientificName}"`)
    return {
      scientificName,
      iucnCategory: knownStatus.iucnCategory || null,
      citesStatus: knownStatus.citesStatus || null,
      regionalStatus: knownStatus.regionalStatus || null,
      riskLevel: knownStatus.riskLevel || 'unknown',
      tradeRestricted: knownStatus.tradeRestricted || false,
      sources: knownStatus.sources || [],
      lastAssessed: knownStatus.lastAssessed || new Date().toISOString().split('T')[0],
      matchType: 'exact' as const,
      needsVerification: false
    }
  }

  // Check CITES cache (41,664 species from uploaded CITES data)
  const citesCacheEntry = CITES_CACHE[normalizedName]
  
  if (citesCacheEntry && ['I', 'II', 'III'].includes(citesCacheEntry.citesStatus)) {
    const citesStatus = citesCacheEntry.citesStatus
    const riskLevel = calculateRiskLevel(null, citesStatus)
    
    console.log(`[Conservation] Found CITES match for "${scientificName}": Appendix ${citesStatus}`)
    
    return {
      scientificName,
      iucnCategory: null,
      citesStatus: citesStatus,
      regionalStatus: null,
      riskLevel,
      tradeRestricted: citesStatus === 'I' || citesStatus === 'II',
      sources: ['CITES Database'],
      lastAssessed: new Date().toISOString().split('T')[0],
      matchType: 'exact' as const,
      needsVerification: false
    }
  }

  // Try partial match for genus-level entries (e.g., "hippocampus spp." matches "hippocampus")
  // WARNING: This is an inference - different species in the same genus may have different statuses
  // Always flag for manual verification
  const genus = normalizedName.split(' ')[0]
  const genusMatch = Object.entries(KNOWN_STATUS).find(([key]) => 
    key.startsWith(genus + ' ') || key === genus
  )
  
  if (genusMatch) {
    const [matchedKey, status] = genusMatch
    console.log(`[Conservation] Found genus match for "${scientificName}" -> matched "${matchedKey}"`)
    return {
      scientificName,
      iucnCategory: status.iucnCategory || null,
      citesStatus: status.citesStatus || null,
      regionalStatus: status.regionalStatus || null,
      riskLevel: status.riskLevel || 'unknown',
      tradeRestricted: status.tradeRestricted || false,
      sources: [...(status.sources || []), 'genus_inference'],
      lastAssessed: new Date().toISOString().split('T')[0],
      matchType: 'genus_inference' as const,
      matchedSpecies: matchedKey,
      needsVerification: true  // Always verify genus-level matches
    }
  }

  // Not in cache - perform web search lookup
  console.log(`[Conservation] Searching IUCN/CITES for "${scientificName}"...`)
  
  try {
    // Search IUCN and CITES in parallel
    const [iucnResult, citesResult] = await Promise.all([
      searchIucnStatus(scientificName),
      searchCitesStatus(scientificName)
    ])
    
    const iucnCategory = iucnResult.category
    const citesStatus = citesResult.status
    const sources: string[] = []
    
    if (iucnCategory) {
      sources.push(`IUCN: ${iucnResult.source}`)
    }
    if (citesStatus) {
      sources.push(`CITES: ${citesResult.source}`)
    }
    
    // Calculate risk level
    const riskLevel = calculateRiskLevel(iucnCategory, citesStatus)
    const tradeRestricted = citesStatus === 'I' || citesStatus === 'II'
    
    // If we found any data, return it
    if (iucnCategory || citesStatus) {
      console.log(`[Conservation] Found data for "${scientificName}": IUCN=${iucnCategory}, CITES=${citesStatus}`)
      return {
        scientificName,
        iucnCategory,
        citesStatus,
        regionalStatus: null,
        riskLevel,
        tradeRestricted,
        sources,
        lastAssessed: new Date().toISOString().split('T')[0],
        matchType: 'web_search' as const,
        needsVerification: false  // Web search results are considered verified
      }
    }
    
    // No data found - species may not be assessed
    console.log(`[Conservation] No conservation data found for "${scientificName}"`)
    return {
      scientificName,
      iucnCategory: 'NE', // Not Evaluated
      citesStatus: 'not_listed',
      regionalStatus: null,
      riskLevel: 'unknown',
      tradeRestricted: false,
      sources: ['Web search performed - no IUCN/CITES record found'],
      lastAssessed: new Date().toISOString().split('T')[0],
      matchType: 'not_found' as const,
      needsVerification: false
    }
  } catch (error) {
    console.error(`[Conservation] Error looking up "${scientificName}":`, error)
    return {
      scientificName,
      iucnCategory: null,
      citesStatus: null,
      regionalStatus: null,
      riskLevel: 'unknown',
      tradeRestricted: false,
      sources: [],
      lastAssessed: null,
      matchType: 'error' as const,
      needsVerification: true,
      error: 'Lookup failed - please try again'
    }
  }
}

// ============================================
// Stats endpoint
// ============================================
export async function PUT(request: NextRequest) {
  try {
    // Get stats on conservation status coverage
    const withTaxon = await db.mexicanFood.count({
      where: { taxon: { not: null } }
    })
    
    const withStatus = await db.mexicanFood.count({
      where: { 
        taxon: { not: null },
        conservationStatus: { not: null }
      }
    })
    
    const withConcerns = await db.mexicanFood.count({
      where: {
        conservationStatus: { 
          contains: '"riskLevel":"critical"'
        }
      }
    })

    return NextResponse.json({
      success: true,
      stats: {
        totalWithTaxon: withTaxon,
        totalWithStatus: withStatus,
        totalWithoutStatus: withTaxon - withStatus,
        withCriticalRisk: withConcerns,
        coveragePercent: withTaxon > 0 ? Math.round((withStatus / withTaxon) * 100) : 0
      }
    })
  } catch (error) {
    console.error('Conservation stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
