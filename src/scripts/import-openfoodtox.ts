/**
 * EFSA OpenFoodTox Import Script
 * 
 * Imports toxicity data from EFSA's OpenFoodTox database
 * Downloaded from: https://zenodo.org/records/8120114
 */

import XLSX from 'xlsx'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const OPENFOODTOX_FILE = 'upload/OpenFoodToxTX22809_2023.xlsx'

export async function importOpenFoodTox(
  onProgress?: (status: string, current: number, total: number) => void
): Promise<{
  success: boolean
  stats: {
    componentsProcessed: number
    assessmentsImported: number
    endpointsImported: number
    errors: number
  }
  error?: string
}> {
  const stats = {
    componentsProcessed: 0,
    assessmentsImported: 0,
    endpointsImported: 0,
    errors: 0
  }

  try {
    onProgress?.('Loading Excel file...', 0, 100)
    
    // Load workbook
    const workbook = XLSX.readFile(OPENFOODTOX_FILE)
    
    // Parse sheets
    onProgress?.('Parsing sheets...', 10, 100)
    const componentSheet = workbook.Sheets['COMPONENT']
    const componentData = XLSX.utils.sheet_to_json(componentSheet) as any[]
    
    const assessSheet = workbook.Sheets['CHEM_ASSESS']
    const assessData = XLSX.utils.sheet_to_json(assessSheet) as any[]
    
    const endpointSheet = workbook.Sheets['ENDPOINTSTUDY']
    const endpointData = XLSX.utils.sheet_to_json(endpointSheet) as any[]
    
    const studySheet = workbook.Sheets['STUDY']
    const studyData = XLSX.utils.sheet_to_json(studySheet) as any[]
    
    // Build lookup maps
    onProgress?.('Building lookup maps...', 30, 100)
    
    // Map HAZARD_ID to assessments
    const hazardToAssess = new Map<number, any[]>()
    for (const assess of assessData) {
      const id = assess.HAZARD_ID
      if (!hazardToAssess.has(id)) hazardToAssess.set(id, [])
      hazardToAssess.get(id)!.push(assess)
    }
    
    // Map TOX_ID to endpoints
    const toxToEndpoint = new Map<number, any[]>()
    for (const endpoint of endpointData) {
      const id = endpoint.TOX_ID
      if (!id) continue
      if (!toxToEndpoint.has(id)) toxToEndpoint.set(id, [])
      toxToEndpoint.get(id)!.push(endpoint)
    }
    
    // Map SUB_COM_ID to study links
    const subComToStudy = new Map<number, { hazardIds: Set<number>; toxIds: Set<number> }>()
    for (const study of studyData) {
      const id = study.SUB_COM_ID
      if (!subComToStudy.has(id)) {
        subComToStudy.set(id, { hazardIds: new Set(), toxIds: new Set() })
      }
      if (study.HAZARD_ID) subComToStudy.get(id)!.hazardIds.add(study.HAZARD_ID)
      if (study.TOX_ID) subComToStudy.get(id)!.toxIds.add(study.TOX_ID)
    }
    
    // Get unique substances
    onProgress?.('Processing substances...', 50, 100)
    const uniqueSubstances = new Map<number, any>()
    for (const comp of componentData) {
      if (!uniqueSubstances.has(comp.SUB_COM_ID)) {
        uniqueSubstances.set(comp.SUB_COM_ID, comp)
      }
    }
    
    const substanceList = Array.from(uniqueSubstances.values())
    const total = substanceList.length
    
    onProgress?.(`Found ${total} substances`, 55, 100)
    
    // Import in batches
    for (let i = 0; i < substanceList.length; i++) {
      const substance = substanceList[i]
      const studyLinks = subComToStudy.get(substance.SUB_COM_ID)
      
      if (!studyLinks) continue
      
      // Aggregate ADI/TDI values
      let adi: number | undefined
      let tdi: number | undefined
      let arfd: number | undefined
      let ul: number | undefined
      let hbgvChronic: number | undefined
      let hbgvChronicType: string | undefined
      
      for (const hazardId of studyLinks.hazardIds) {
        const assessments = hazardToAssess.get(hazardId) || []
        for (const assess of assessments) {
          const type = (assess.ASSESSMENTTYPE || '').toUpperCase()
          const value = parseFloat(assess.RISKVALUE)
          if (isNaN(value)) continue
          
          if (type === 'ADI' && !adi) {
            adi = value
            hbgvChronic = value
            hbgvChronicType = 'ADI'
          }
          if (type === 'TDI' && !tdi) {
            tdi = value
            if (!hbgvChronic) {
              hbgvChronic = value
              hbgvChronicType = 'TDI'
            }
          }
          if (type === 'ARFD' && !arfd) arfd = value
          if (type.includes('UPPER') && !ul) ul = value
          stats.assessmentsImported++
        }
      }
      
      // Aggregate NOAEL/LOAEL values
      let noael: number | undefined
      let loael: number | undefined
      let noaelSpecies: string | undefined
      
      for (const toxId of studyLinks.toxIds) {
        const endpoints = toxToEndpoint.get(toxId) || []
        for (const ep of endpoints) {
          const epType = (ep.ENDPOINT || '').toUpperCase()
          const value = parseFloat(ep.VALUE)
          if (isNaN(value)) continue
          
          if (epType === 'NOAEL' || epType === 'NOEL') {
            if (!noael || value < noael) {
              noael = value
              noaelSpecies = ep.SPECIES || undefined
            }
          }
          if (epType === 'LOAEL' || epType === 'LOEL') {
            if (!loael || value < loael) loael = value
          }
          stats.endpointsImported++
        }
      }
      
      // Create record if we have useful data
      if (adi || tdi || arfd || ul || noael || loael) {
        try {
          await prisma.eFSAToxicity.create({
            data: {
              efsaSubstanceId: `EFSA-${substance.SUB_COM_ID}`,
              substanceName: substance.SUB_NAME || substance.COM_NAME || 'Unknown',
              casNumber: substance.SUB_CASNUMBER || substance.COM_CASNUMBER || null,
              inchiKey: substance.INCHI || null,
              hbgvChronic: hbgvChronic || null,
              hbgvChronicType: hbgvChronicType || null,
              hbgvAcute: arfd || null,
              hbgvAcuteType: arfd ? 'ARfD' : null,
              referencePoint: noael || loael || null,
              referencePointType: noael ? 'NOAEL' : loael ? 'LOAEL' : null,
              referencePointSpecies: noaelSpecies || null,
              ul: ul || null,
              substanceGroup: 'EFSA assessed',
              importDate: new Date()
            }
          })
          stats.componentsProcessed++
        } catch {
          stats.errors++
        }
      }
      
      if (i % 200 === 0) {
        onProgress?.(`Importing... ${i}/${total}`, 55 + Math.floor((i / total) * 40), 100)
      }
    }
    
    onProgress?.('Complete!', 100, 100)
    return { success: true, stats }
    
  } catch (error) {
    return {
      success: false,
      stats,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  } finally {
    await prisma.$disconnect()
  }
}

// CLI execution
importOpenFoodTox((status, current, total) => {
  console.log(`[${current}%] ${status}`)
}).then(result => {
  console.log('\nResult:', JSON.stringify(result, null, 2))
})
