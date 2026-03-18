import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'

// Create a fresh PrismaClient to avoid caching issues
const db = new PrismaClient({ log: ['query'] })

interface EFSARecord {
  substanceName: string
  casNumber: string | null
  inchiKey: string | null
  assessmentType: string // ADI, TDI, UL, ARfD
  riskValue: number | null
  riskUnit: string | null
  population: string | null
  endpointType: string | null // NOAEL, LOAEL, LD50
  endpointValue: number | null
  endpointUnit: string | null
  species: string | null
  studyDuration: string | null
  efsaOpinionId: string | null
  efsaOpinionUrl: string | null
  efsaOpinionYear: number | null
}

/**
 * Parse the OpenFoodTox Excel file and extract toxicity data
 */
async function parseOpenFoodTox(filePath: string): Promise<{
  substances: Map<string, EFSARecord[]>
  stats: {
    totalRecords: number
    uniqueSubstances: number
    withADI: number
    withNOAEL: number
    withCAS: number
  }
}> {
  // Read file as buffer first (more reliable for large files)
  const fileBuffer = fs.readFileSync(filePath)
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
  
  // Log available sheets for debugging
  console.log('Available sheets:', workbook.SheetNames)
  
  // Read relevant sheets
  const chemAssessSheet = workbook.Sheets['CHEM_ASSESS']
  const endpointStudySheet = workbook.Sheets['ENDPOINTSTUDY']
  const componentSheet = workbook.Sheets['COMPONENT']
  
  if (!chemAssessSheet || !endpointStudySheet || !componentSheet) {
    throw new Error(`Missing required sheets. Available: ${workbook.SheetNames.join(', ')}`)
  }
  
  const chemAssessData = XLSX.utils.sheet_to_json(chemAssessSheet) as any[]
  const endpointStudyData = XLSX.utils.sheet_to_json(endpointStudySheet) as any[]
  const componentData = XLSX.utils.sheet_to_json(componentSheet) as any[]
  
  // Build substance lookup by SUB_COM_ID
  const substanceLookup = new Map<number, {
    name: string
    casNumber: string | null
  }>()
  
  for (const comp of componentData) {
    const subComId = comp.SUB_COM_ID
    if (!substanceLookup.has(subComId)) {
      substanceLookup.set(subComId, {
        name: comp.SUB_NAME || comp.COM_NAME || 'Unknown',
        casNumber: comp.SUB_CASNUMBER || comp.COM_CASNUMBER || null
      })
    }
  }
  
  // Process CHEM_ASSESS (ADI, TDI, UL, ARfD)
  const substances = new Map<string, EFSARecord[]>()
  let withADI = 0
  let withNOAEL = 0
  let withCAS = 0
  
  for (const assess of chemAssessData) {
    const subComId = assess.HAZARD_ID
    const substance = substanceLookup.get(subComId)
    
    if (!substance) continue
    
    const key = substance.name.toLowerCase()
    const assessmentType = assess.ASSESSMENTTYPE || ''
    
    const record: EFSARecord = {
      substanceName: substance.name,
      casNumber: substance.casNumber,
      inchiKey: null,
      assessmentType,
      riskValue: assess.RISKVALUE_MILLI || assess.RISKVALUE || null,
      riskUnit: assess.RISKUNIT || 'mg/kg bw/day',
      population: assess.POPULATIONTEXT || null,
      endpointType: null,
      endpointValue: null,
      endpointUnit: null,
      species: null,
      studyDuration: null,
      efsaOpinionId: assess.OP_ID?.toString() || null,
      efsaOpinionUrl: null,
      efsaOpinionYear: null
    }
    
    if (!substances.has(key)) {
      substances.set(key, [])
    }
    substances.get(key)!.push(record)
    
    if (assessmentType === 'ADI' || assessmentType === 'TDI' || assessmentType === 'UL') {
      withADI++
    }
    if (substance.casNumber) withCAS++
  }
  
  // Process ENDPOINTSTUDY (NOAEL, LOAEL, LD50)
  for (const endpoint of endpointStudyData) {
    const subComId = endpoint.TOX_ID
    const substance = substanceLookup.get(subComId)
    
    if (!substance) continue
    
    const key = substance.name.toLowerCase()
    const endpointType = endpoint.ENDPOINT || ''
    
    // Filter for relevant endpoints
    if (!['NOAEL', 'LOAEL', 'NOEL', 'LOEL', 'LD50', 'LD100', 'BMDL', 'BMDL10', 'BMDL5'].includes(endpointType)) {
      continue
    }
    
    const record: EFSARecord = {
      substanceName: substance.name,
      casNumber: substance.casNumber,
      inchiKey: null,
      assessmentType: 'Endpoint',
      riskValue: null,
      riskUnit: null,
      population: null,
      endpointType,
      endpointValue: endpoint.VALUE_MILLI || endpoint.VALUE || null,
      endpointUnit: endpoint.DOSEUNITFULLTEXT || endpoint.DOSEUNIT || 'mg/kg',
      species: endpoint.SPECIES || null,
      studyDuration: endpoint.EXP_DURATION_DAYS?.toString() || null,
      efsaOpinionId: null,
      efsaOpinionUrl: null,
      efsaOpinionYear: null
    }
    
    if (!substances.has(key)) {
      substances.set(key, [])
    }
    substances.get(key)!.push(record)
    
    if (endpointType === 'NOAEL' || endpointType === 'LOAEL') {
      withNOAEL++
    }
  }
  
  return {
    substances,
    stats: {
      totalRecords: chemAssessData.length + endpointStudyData.length,
      uniqueSubstances: substances.size,
      withADI,
      withNOAEL,
      withCAS
    }
  }
}

/**
 * Import EFSA data into the database
 */
async function importEFSAData(
  substances: Map<string, EFSARecord[]>
): Promise<{
  imported: number
  skipped: number
  matchedToPhytoHub: number
  errors: string[]
}> {
  const errors: string[] = []
  let imported = 0
  let skipped = 0
  let matchedToPhytoHub = 0
  
  for (const [substanceName, records] of substances) {
    try {
      // Aggregate data from all records for this substance
      const firstRecord = records[0]
      const casNumber = firstRecord.casNumber
      
      // Extract ADI, TDI, UL values
      let hbgvChronic: number | null = null
      let hbgvChronicType: string | null = null
      let hbgvAcute: number | null = null
      let hbgvAcuteType: string | null = null
      let ul: number | null = null
      
      // Extract NOAEL, LOAEL values
      let referencePoint: number | null = null
      let referencePointType: string | null = null
      let referencePointSpecies: string | null = null
      
      for (const record of records) {
        // Handle reference values (ADI, TDI, UL)
        if (record.assessmentType === 'ADI' && record.riskValue) {
          hbgvChronic = record.riskValue
          hbgvChronicType = 'ADI'
        } else if (record.assessmentType === 'TDI' && record.riskValue) {
          hbgvChronic = hbgvChronic || record.riskValue
          hbgvChronicType = hbgvChronicType || 'TDI'
        } else if (record.assessmentType === 'ARfD' && record.riskValue) {
          hbgvAcute = record.riskValue
          hbgvAcuteType = 'ARfD'
        } else if (record.assessmentType === 'UL' && record.riskValue) {
          ul = record.riskValue
        }
        
        // Handle endpoints (NOAEL, LOAEL)
        if (record.endpointType === 'NOAEL' && record.endpointValue) {
          if (!referencePoint || record.endpointValue < referencePoint) {
            referencePoint = record.endpointValue
            referencePointType = 'NOAEL'
            referencePointSpecies = record.species
          }
        } else if (record.endpointType === 'LOAEL' && record.endpointValue && !referencePoint) {
          referencePoint = record.endpointValue
          referencePointType = 'LOAEL'
          referencePointSpecies = record.species
        }
      }
      
      // Skip if no useful data
      if (!hbgvChronic && !hbgvAcute && !ul && !referencePoint) {
        skipped++
        continue
      }
      
      // Check if this substance exists in PhytoHub
      let phytoHubMatch = null
      if (casNumber) {
        // SQLite: use equals without mode (case-insensitive for ASCII by default)
        phytoHubMatch = await db.phytoHubCompound.findFirst({
          where: { casNumber: casNumber }
        })
      }
      if (!phytoHubMatch) {
        // SQLite: search by lowercase name using contains
        phytoHubMatch = await db.phytoHubCompound.findFirst({
          where: { 
            OR: [
              { name: { contains: substanceName } },
              { systematicName: { contains: substanceName } }
            ]
          }
        })
      }
      
      // Create/update EFSA toxicity record
      // Use findFirst + create/update since substanceName is not unique
      const existingRecord = await db.eFSAToxicity.findFirst({
        where: { substanceName: firstRecord.substanceName }
      })
      
      if (existingRecord) {
        await db.eFSAToxicity.update({
          where: { id: existingRecord.id },
          data: {
            casNumber,
            hbgvChronic,
            hbgvChronicType,
            hbgvAcute,
            hbgvAcuteType,
            ul,
            referencePoint,
            referencePointType,
            referencePointUnit: 'mg/kg bw/day',
            referencePointSpecies
          }
        })
      } else {
        await db.eFSAToxicity.create({
          data: {
            substanceName: firstRecord.substanceName,
            casNumber,
            hbgvChronic,
            hbgvChronicType,
            hbgvAcute,
            hbgvAcuteType,
            ul,
            ulUnit: 'mg/day',
            referencePoint,
            referencePointType,
            referencePointUnit: 'mg/kg bw/day',
            referencePointSpecies,
            substanceGroup: 'EFSA assessed',
            efsaOpinionYear: firstRecord.efsaOpinionYear
          }
        })
      }
      
      // If matched to PhytoHub, update ToxicityMatch
      if (phytoHubMatch) {
        const warnings: string[] = []
        if (hbgvChronic) warnings.push(`HBGV: ${hbgvChronic} mg/kg/day (${hbgvChronicType})`)
        if (ul) warnings.push(`Upper Limit: ${ul} mg/day`)
        if (referencePoint) warnings.push(`${referencePointType}: ${referencePoint} mg/kg/day (${referencePointSpecies || 'unknown species'})`)
        
        await db.toxicityMatch.upsert({
          where: { phytoHubCompoundId: phytoHubMatch.id },
          create: {
            phytoHubCompoundId: phytoHubMatch.id,
            phytoHubCompoundName: phytoHubMatch.name,
            matchMethod: casNumber ? 'cas' : 'name-fuzzy',
            matchConfidence: casNumber ? 1.0 : 0.7,
            hasToxicityData: true,
            hasWarnings: warnings.length > 0,
            warningCount: warnings.length,
            cachedAdi: hbgvChronic,
            cachedNoael: referencePoint,
            cachedUl: ul,
            cachedWarnings: warnings.length > 0 ? JSON.stringify(warnings) : null,
            efsaId: firstRecord.substanceName // Store EFSA record reference
          },
          update: {
            matchMethod: casNumber ? 'cas' : 'name-fuzzy',
            matchConfidence: casNumber ? 1.0 : 0.7,
            hasToxicityData: true,
            hasWarnings: warnings.length > 0,
            warningCount: warnings.length,
            cachedAdi: hbgvChronic,
            cachedNoael: referencePoint,
            cachedUl: ul,
            cachedWarnings: warnings.length > 0 ? JSON.stringify(warnings) : null,
            efsaId: firstRecord.substanceName
          }
        })
        
        matchedToPhytoHub++
      }
      
      imported++
      
    } catch (error) {
      errors.push(`${substanceName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  return { imported, skipped, matchedToPhytoHub, errors }
}

/**
 * GET: Check import status and available files
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const check = searchParams.get('check')
    
    if (check === 'files') {
      // Check for OpenFoodTox files in upload directory
      const uploadDir = path.join(process.cwd(), 'upload')
      const files = fs.existsSync(uploadDir) 
        ? fs.readdirSync(uploadDir).filter(f => 
            f.toLowerCase().includes('openfoodtox') || 
            f.toLowerCase().includes('efsa')
          )
        : []
      
      // Get current EFSA stats
      const stats = await db.eFSAToxicity.count()
      const matchedStats = await db.toxicityMatch.count({
        where: { efsaId: { not: null } }
      })
      
      return NextResponse.json({
        success: true,
        availableFiles: files,
        alreadyImported: stats,
        matchedToPhytoHub: matchedStats
      })
    }
    
    // Get EFSA statistics
    const [
      totalEFSA,
      withHBGV,
      withUL,
      withNOAEL,
      matchedToPhytoHub
    ] = await Promise.all([
      db.eFSAToxicity.count(),
      db.eFSAToxicity.count({ where: { hbgvChronic: { not: null } } }),
      db.eFSAToxicity.count({ where: { ul: { not: null } } }),
      db.eFSAToxicity.count({ where: { referencePoint: { not: null } } }),
      db.toxicityMatch.count({ where: { efsaId: { not: null } } })
    ])
    
    return NextResponse.json({
      success: true,
      statistics: {
        totalEFSA,
        withHBGV,
        withUL,
        withNOAEL,
        matchedToPhytoHub
      }
    })
  } catch (error) {
    console.error('EFSA status error:', error)
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
  }
}

/**
 * POST: Import EFSA OpenFoodTox data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filename = 'OpenFoodToxTX22809_2023.xlsx' } = body
    
    // Find the file
    const filePath = path.join(process.cwd(), 'upload', filename)
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: `File not found: ${filename}. Please upload the OpenFoodTox Excel file first.` },
        { status: 404 }
      )
    }
    
    console.log('Parsing OpenFoodTox file:', filePath)
    
    // Parse the Excel file
    const { substances, stats: parseStats } = await parseOpenFoodTox(filePath)
    
    console.log('Parsed substances:', parseStats)
    
    // Import into database
    const importResult = await importEFSAData(substances)
    
    return NextResponse.json({
      success: true,
      message: 'OpenFoodTox import completed',
      parseStats,
      importResult: {
        imported: importResult.imported,
        skipped: importResult.skipped,
        matchedToPhytoHub: importResult.matchedToPhytoHub,
        errors: importResult.errors.slice(0, 10) // First 10 errors
      }
    })
    
  } catch (error) {
    console.error('EFSA import error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to import OpenFoodTox data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
