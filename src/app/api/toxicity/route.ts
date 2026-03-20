import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  fetchAndCacheToxicity,
  batchFetchToxicity,
  getToxicityForCompound
} from '@/lib/comptox-api'

/**
 * POST: Fetch toxicity data for compounds
 * 
 * Body: {
 *   action: 'fetch' | 'batch' | 'status',
 *   compoundId?: string,        // For single fetch
 *   compounds?: Array<{id, name, inchiKey?, casNumber?}>, // For batch
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, compoundId, compounds } = body
    
    switch (action) {
      case 'fetch': {
        // Fetch toxicity for a single compound
        if (!compoundId) {
          return NextResponse.json(
            { error: 'compoundId required for fetch action' },
            { status: 400 }
          )
        }
        
        // Get compound details from PhytoHub
        const compound = await db.phytoHubCompound.findUnique({
          where: { id: compoundId },
          select: {
            id: true,
            name: true,
            inchiKey: true,
            casNumber: true
          }
        })
        
        if (!compound) {
          return NextResponse.json(
            { error: 'Compound not found' },
            { status: 404 }
          )
        }
        
        const result = await fetchAndCacheToxicity(
          compound.id,
          compound.inchiKey,
          compound.casNumber,
          compound.name
        )
        
        return NextResponse.json({
          success: true,
          compound: {
            id: compound.id,
            name: compound.name
          },
          toxicity: result
        })
      }
      
      case 'batch': {
        // Batch fetch toxicity for multiple compounds
        if (!compounds || !Array.isArray(compounds)) {
          return NextResponse.json(
            { error: 'compounds array required for batch action' },
            { status: 400 }
          )
        }
        
        // Validate compounds exist in PhytoHub
        const validCompounds = await db.phytoHubCompound.findMany({
          where: { id: { in: compounds.map(c => c.id) } },
          select: { id: true, name: true, inchiKey: true, casNumber: true }
        })
        
        const results = await batchFetchToxicity(validCompounds)
        
        const summary = {
          total: compounds.length,
          found: Array.from(results.values()).filter(r => r.found).length,
          withWarnings: Array.from(results.values()).filter(r => r.hasWarnings).length
        }
        
        return NextResponse.json({
          success: true,
          summary,
          results: Object.fromEntries(results)
        })
      }
      
      case 'status': {
        // Get toxicity status for compounds without fetching
        if (!compounds || !Array.isArray(compounds)) {
          return NextResponse.json(
            { error: 'compounds array required for status action' },
            { status: 400 }
          )
        }
        
        const matches = await db.toxicityMatch.findMany({
          where: { phytoHubCompoundId: { in: compounds.map(c => c.id) } },
          select: {
            phytoHubCompoundId: true,
            hasToxicityData: true,
            hasWarnings: true,
            warningCount: true,
            lastChecked: true,
            matchMethod: true
          }
        })
        
        const results = new Map<string, any>()
        for (const match of matches) {
          results.set(match.phytoHubCompoundId, {
            hasData: match.hasToxicityData,
            hasWarnings: match.hasWarnings,
            warningCount: match.warningCount,
            lastChecked: match.lastChecked,
            matchMethod: match.matchMethod
          })
        }
        
        // Mark compounds without cached data
        for (const compound of compounds) {
          if (!results.has(compound.id)) {
            results.set(compound.id, {
              hasData: false,
              hasWarnings: false,
              warningCount: 0,
              lastChecked: null,
              matchMethod: 'not-checked'
            })
          }
        }
        
        return NextResponse.json({
          success: true,
          results: Object.fromEntries(results)
        })
      }
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: fetch, batch, or status' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Toxicity API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process toxicity request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET: Get cached toxicity data for a compound
 * 
 * Query params:
 * - compoundId: PhytoHub compound ID
 * - dtxsid: EPA DTXSID
 * - stats: Get overall statistics
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const compoundId = searchParams.get('compoundId')
    const dtxsid = searchParams.get('dtxsid')
    const stats = searchParams.get('stats')
    
    // Get overall statistics
    if (stats === 'true') {
      const [totalCompounds, checkedCompounds, compoundsWithData, compoundsWithWarnings] = 
        await Promise.all([
          db.phytoHubCompound.count(),
          db.toxicityMatch.count(),
          db.toxicityMatch.count({ where: { hasToxicityData: true } }),
          db.toxicityMatch.count({ where: { hasWarnings: true } })
        ])
      
      const recentChecks = await db.toxicityMatch.findMany({
        where: { lastChecked: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        select: { phytoHubCompoundName: true, hasWarnings: true, lastChecked: true },
        orderBy: { lastChecked: 'desc' },
        take: 10
      })
      
      return NextResponse.json({
        success: true,
        statistics: {
          totalCompounds,
          checkedCompounds,
          compoundsWithData,
          compoundsWithWarnings,
          coveragePercent: totalCompounds > 0 
            ? Math.round((checkedCompounds / totalCompounds) * 100) 
            : 0
        },
        recentChecks
      })
    }
    
    // Get by DTXSID
    if (dtxsid) {
      const toxicity = await db.compToxToxicity.findUnique({
        where: { dtxsid }
      })
      
      if (!toxicity) {
        return NextResponse.json(
          { error: 'DTXSID not found in cache' },
          { status: 404 }
        )
      }
      
      return NextResponse.json({
        success: true,
        toxicity: {
          dtxsid: toxicity.dtxsid,
          inchiKey: toxicity.inchiKey,
          casrn: toxicity.casrn,
          preferredName: toxicity.preferredName,
          ld50Oral: toxicity.ld50Oral,
          noael: toxicity.noael,
          loael: toxicity.loael,
          rfd: toxicity.rfd,
          adi: toxicity.adi,
          ghsSignalWord: toxicity.ghsSignalWord,
          ghsHazardCategories: toxicity.ghsHazardCategories 
            ? JSON.parse(toxicity.ghsHazardCategories) 
            : [],
          ghsPictograms: toxicity.ghsPictograms 
            ? JSON.parse(toxicity.ghsPictograms) 
            : [],
          hazardStatements: toxicity.hazardStatements 
            ? JSON.parse(toxicity.hazardStatements) 
            : [],
          lastUpdated: toxicity.lastApiFetch
        }
      })
    }
    
    // Get by PhytoHub compound ID
    if (compoundId) {
      const result = await getToxicityForCompound(compoundId)
      
      return NextResponse.json({
        success: true,
        compoundId,
        toxicity: result
      })
    }
    
    return NextResponse.json(
      { error: 'Provide compoundId, dtxsid, or stats=true' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Toxicity GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get toxicity data' },
      { status: 500 }
    )
  }
}
