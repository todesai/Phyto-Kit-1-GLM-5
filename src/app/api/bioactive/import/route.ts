import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import fs from 'fs'
import path from 'path'

// PhytoHub CSV column mappings - EXACT column names from PhytoHub export
// Based on the actual export format from https://phytohub.eu/entries
const COLUMN_MAPPINGS = {
  // Primary identification
  name: ['chemical name', 'chemical_name', 'name', 'compound_name'],  // "Chemical Name"
  phytoHubId: ['identifier', 'identifier', 'id', 'phytohub_id'],  // "Identifier"
  systematicName: ['systematic name', 'systematic_name', 'iupac_name'],  // "Systematic name"
  primaryKey: ['primary key', 'primary_key'],  // "Primary key"
  
  // Chemical properties
  molecularFormula: ['formula', 'molecular_formula'],  // "Formula"
  monoisotopicMass: ['monoisotopic mass', 'monoisotopic_mass'],  // "Monoisotopic mass"
  averageMass: ['average mass', 'average_mass', 'molecular weight'],  // "Average mass"
  
  // Classification
  phytochemicalFamily: ['phytochemical family', 'phytochemical_family', 'family'],  // "Phytochemical family"
  chemicalClass: ['phytochemical class', 'phytochemical_class', 'class'],  // "Phytochemical class"
  subClass: ['phytochemical subclass', 'phytochemical_subclass', 'subclass'],  // "Phytochemical subclass"
  
  // Metabolite classification
  metaboliteFamily: ['metabolite family', 'metabolite_family'],  // "Metabolite family"
  metaboliteClass: ['metabolite class', 'metabolite_class'],  // "Metabolite class"
  metaboliteSubclass: ['metabolite subclass', 'metabolite_subclass'],  // "Metabolite subclass"
  
  // Names and identifiers
  synonyms: ['synonyms', 'synonym'],  // "Synonyms"
  inchiKey: ['inchi key'],  // "InChI Key" - exact match only
  casNumber: ['cas number', 'cas_number', 'cas'],  // "CAS Number"
  iupacName: ['iupac name', 'iupac_name'],  // "IUPAC Name"
  
  // Chemical structure
  inchi: ['inchi'],  // "Inchi" - exact match only (different from InChI Key)
  smiles: ['smiles', 'smiles_string'],  // "Smiles"
  
  // Bioavailability properties
  solubility: ['solubility', 'water solubility'],  // "Solubility"
  predictedLogP: ['predicted alogps logp', 'predicted_alogps_logp', 'logp'],  // "Predicted alogps logp"
  predictedLogS: ['predicted alogps logs', 'predicted_alogps_logs', 'logs'],  // "Predicted alogps logs"
  pkaBasic: ['pka strongest basic', 'pka_strongest_basic', 'pka_basic'],  // "Pka strongest basic"
  pkaAcidic: ['pka strongest acidic', 'pka_strongest_acidic', 'pka_acidic'],  // "Pka strongest acidic"
  
  // Food sources - PhytoHub uses "/" as separator
  foodSources: ['food sources', 'food_sources', 'foods', 'sources'],  // "Food sources"
  
  // Metabolites and biomarkers
  metabolites: ['metabolites / precursor', 'metabolites/precursor', 'metabolites', 'precursors'],  // "Metabolites / Precursor"
  intakeBiomarkers: ['intake biomarkers', 'intake_biomarkers', 'biomarkers'],  // "Intake biomarkers"
  
  // Additional fields (not in current export but may be useful)
  healthEffects: ['health_effects', 'benefits'],
  toxicityData: ['toxicity', 'toxicity_data'],
  interactions: ['interactions', 'drug_interactions'],
  beneficialDose: ['beneficial_dose', 'recommended_dose'],
}

// Find column index by mapping
function findColumnIndex(headers: string[], mappings: string[]): number {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim().replace(/[\s-]/g, '_'))
  
  for (const mapping of mappings) {
    const normalizedMapping = mapping.toLowerCase().replace(/[\s-]/g, '_')
    // First try exact match
    const exactIndex = normalizedHeaders.findIndex(h => h === normalizedMapping)
    if (exactIndex !== -1) return exactIndex
    // Then try contains match (but ensure it's not a partial match of another column)
    const containsIndex = normalizedHeaders.findIndex(h => h.includes(normalizedMapping) || normalizedMapping.includes(h))
    if (containsIndex !== -1) return containsIndex
  }
  return -1
}

// Parse CSV row handling quoted fields (supports both comma and tab delimiters)
function parseCSVRow(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if ((char === ',' || char === '\t') && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

// Parse JSON field safely
function parseJSONField(value: string | null): string | null {
  if (!value) return null
  
  // Already JSON array
  if (value.startsWith('[')) {
    try {
      JSON.parse(value)
      return value
    } catch {
      // Fall through to convert to JSON
    }
  }
  
  // Convert semicolon, pipe, or slash separated to JSON array
  // PhytoHub uses "/" as separator for food sources
  const items = value.split(/[;|/]/).map(s => s.trim()).filter(Boolean)
  if (items.length > 1) {
    return JSON.stringify(items)
  }
  
  return JSON.stringify([value.trim()])
}

// Parse food sources specifically - PhytoHub uses "/" as separator
function parseFoodSources(value: string | null): string | null {
  if (!value) return null
  
  // Already JSON array
  if (value.startsWith('[')) {
    try {
      JSON.parse(value)
      return value
    } catch {
      // Fall through
    }
  }
  
  // Split by "/" which is PhytoHub's separator for food sources
  const items = value.split('/')
    .map(s => s.trim())
    .filter(s => s.length > 0)
  
  if (items.length === 0) return null
  return JSON.stringify(items)
}

// Parse float safely
function parseFloatSafe(value: string | null): number | null {
  if (!value) return null
  const num = parseFloat(value.replace(/[^\d.-]/g, ''))
  return isNaN(num) ? null : num
}

// Parse boolean
function parseBoolean(value: string | null): boolean {
  if (!value) return false
  const lower = value.toLowerCase()
  return lower === 'true' || lower === 'yes' || lower === '1' || lower === 'y'
}

// GET: List available CSV files and database stats
export async function GET() {
  try {
    // Check for PhytoHub CSV files
    const uploadDir = '/home/z/my-project/user-uploads'
    const csvFiles: Array<{ path: string; name: string; category: string; size: number }> = []
    
    const scanDir = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            scanDir(fullPath)
          } else if (entry.name.toLowerCase().endsWith('.csv')) {
            const stats = fs.statSync(fullPath)
            // Check if it looks like a PhytoHub export
            const nameLower = entry.name.toLowerCase()
            if (nameLower.includes('phyto') || nameLower.includes('bioactive') || 
                nameLower.includes('compound') || nameLower.includes('phytochemical')) {
              const relativePath = fullPath.replace('/home/z/my-project/', '')
              csvFiles.push({
                path: relativePath,
                name: entry.name,
                category: path.basename(dir),
                size: stats.size,
              })
            }
          }
        }
      } catch (e) {
        // Directory doesn't exist or can't be read
      }
    }
    
    scanDir(uploadDir)
    
    // Get database stats
    const totalCompounds = await db.phytoHubCompound.count()
    const totalFoods = await db.phytoHubFood.count()
    const metaboliteCount = await db.phytoHubCompound.count({
      where: { isMetabolite: true }
    })
    
    return NextResponse.json({
      files: csvFiles,
      databaseStats: {
        totalCompounds,
        totalFoods,
        metaboliteCount,
        parentCompounds: totalCompounds - metaboliteCount,
      }
    })
    
  } catch (error) {
    console.error('Error listing PhytoHub files:', error)
    return NextResponse.json({ 
      error: 'Failed to list files', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

// POST: Import PhytoHub CSV
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filePath, options = {} } = body as { 
      filePath: string; 
      options?: { 
        clearExisting?: boolean;
        skipDuplicates?: boolean;
        batchSize?: number;
      } 
    }
    
    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 })
    }
    
    const fullPath = path.join('/home/z/my-project', filePath)
    
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    
    let content = fs.readFileSync(fullPath, 'utf-8')
    // Remove BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1)
    }
    const lines = content.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file is empty or has no data rows' }, { status: 400 })
    }
    
    // Parse headers
    const headers = parseCSVRow(lines[0])
    
    // Find column indices
    const columnIndices: Record<string, number> = {}
    for (const [field, mappings] of Object.entries(COLUMN_MAPPINGS)) {
      const index = findColumnIndex(headers, mappings)
      if (index !== -1) {
        columnIndices[field] = index
      }
    }
    
    // Check we have at least a name column
    if (columnIndices.name === undefined) {
      return NextResponse.json({ 
        error: 'Could not find compound name column. Please ensure your CSV has a "name" or "compound_name" column.' 
      }, { status: 400 })
    }
    
    // Clear existing data if requested
    if (options.clearExisting) {
      await db.phytoHubCompound.deleteMany()
      await db.phytoHubFood.deleteMany()
    }
    
    // Get existing compounds for fast duplicate checking (batch)
    const existingCompounds = await db.phytoHubCompound.findMany({
      select: { phytoHubId: true, inchiKey: true, name: true }
    })
    const existingPhytoHubIds = new Set(existingCompounds.filter(c => c.phytoHubId).map(c => c.phytoHubId))
    const existingInchiKeys = new Set(existingCompounds.filter(c => c.inchiKey).map(c => c.inchiKey))
    const existingNames = new Set(existingCompounds.map(c => c.name.toLowerCase()))
    
    // Process data rows
    const stats = {
      totalRows: lines.length - 1,
      imported: 0,
      skipped: 0,
      errors: 0,
    }
    
    const batchSize = options.batchSize || 100
    const batch: any[] = []
    
    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVRow(lines[i])
      
      // Get name (required) - "Chemical Name" column
      const name = row[columnIndices.name] || ''
      if (!name || name.length < 2) {
        stats.skipped++
        continue
      }
      
      // Determine if metabolite based on metabolite classification fields
      const metaboliteFamily = columnIndices.metaboliteFamily !== undefined ? row[columnIndices.metaboliteFamily]?.trim() : null
      const metaboliteClass = columnIndices.metaboliteClass !== undefined ? row[columnIndices.metaboliteClass]?.trim() : null
      const isMetabolite = !!(metaboliteFamily || metaboliteClass)
      
      // Get identifiers for duplicate checking
      const phytoHubId = columnIndices.phytoHubId !== undefined ? row[columnIndices.phytoHubId]?.trim() || null : null
      const inchiKey = columnIndices.inchiKey !== undefined ? row[columnIndices.inchiKey]?.trim() || null : null
      
      // Check for duplicates using in-memory sets (fast)
      if (options.skipDuplicates !== false) {
        const isDuplicate = 
          (phytoHubId && existingPhytoHubIds.has(phytoHubId)) ||
          (inchiKey && existingInchiKeys.has(inchiKey)) ||
          existingNames.has(name.toLowerCase())
        
        if (isDuplicate) {
          stats.skipped++
          continue
        }
        
        // Add to sets for future duplicate checks in this batch
        if (phytoHubId) existingPhytoHubIds.add(phytoHubId)
        if (inchiKey) existingInchiKeys.add(inchiKey)
        existingNames.add(name.toLowerCase())
      }
      
      // Build compound data with exact PhytoHub column mappings
      const compoundData: any = {
        name: name.trim(),
        // Primary identifiers
        phytoHubId: phytoHubId,
        primaryKey: columnIndices.primaryKey !== undefined ? row[columnIndices.primaryKey]?.trim() || null : null,
        
        // Names
        systematicName: columnIndices.systematicName !== undefined ? row[columnIndices.systematicName]?.trim() || null : null,
        iupacName: columnIndices.iupacName !== undefined ? row[columnIndices.iupacName]?.trim() || null : null,
        synonyms: parseJSONField(columnIndices.synonyms !== undefined ? row[columnIndices.synonyms] : null),
        
        // Classification - parent compounds
        phytochemicalFamily: columnIndices.phytochemicalFamily !== undefined ? row[columnIndices.phytochemicalFamily]?.trim() || null : null,
        chemicalClass: columnIndices.chemicalClass !== undefined ? row[columnIndices.chemicalClass]?.trim() || null : null,
        subClass: columnIndices.subClass !== undefined ? row[columnIndices.subClass]?.trim() || null : null,
        
        // Classification - metabolites
        metaboliteFamily: metaboliteFamily,
        metaboliteClass: metaboliteClass,
        metaboliteSubclass: columnIndices.metaboliteSubclass !== undefined ? row[columnIndices.metaboliteSubclass]?.trim() || null : null,
        isMetabolite: isMetabolite,
        
        // Chemical properties
        molecularFormula: columnIndices.molecularFormula !== undefined ? row[columnIndices.molecularFormula]?.trim() || null : null,
        monoisotopicMass: parseFloatSafe(columnIndices.monoisotopicMass !== undefined ? row[columnIndices.monoisotopicMass] : null),
        averageMass: parseFloatSafe(columnIndices.averageMass !== undefined ? row[columnIndices.averageMass] : null),
        smiles: columnIndices.smiles !== undefined ? row[columnIndices.smiles]?.trim() || null : null,
        inchi: columnIndices.inchi !== undefined ? row[columnIndices.inchi]?.trim() || null : null,
        inchiKey: inchiKey,
        casNumber: columnIndices.casNumber !== undefined ? row[columnIndices.casNumber]?.trim() || null : null,
        
        // Bioavailability properties
        solubility: parseFloatSafe(columnIndices.solubility !== undefined ? row[columnIndices.solubility] : null),
        predictedLogP: parseFloatSafe(columnIndices.predictedLogP !== undefined ? row[columnIndices.predictedLogP] : null),
        predictedLogS: parseFloatSafe(columnIndices.predictedLogS !== undefined ? row[columnIndices.predictedLogS] : null),
        pkaBasic: parseFloatSafe(columnIndices.pkaBasic !== undefined ? row[columnIndices.pkaBasic] : null),
        pkaAcidic: parseFloatSafe(columnIndices.pkaAcidic !== undefined ? row[columnIndices.pkaAcidic] : null),
        
        // Food sources - uses "/" as separator in PhytoHub
        foodSources: parseFoodSources(columnIndices.foodSources !== undefined ? row[columnIndices.foodSources] : null),
        
        // Metabolites and biomarkers
        metabolites: parseJSONField(columnIndices.metabolites !== undefined ? row[columnIndices.metabolites] : null),
        intakeBiomarkers: parseJSONField(columnIndices.intakeBiomarkers !== undefined ? row[columnIndices.intakeBiomarkers] : null),
        
        // Health & Safety (not in current export)
        healthEffects: parseJSONField(columnIndices.healthEffects !== undefined ? row[columnIndices.healthEffects] : null),
        toxicityData: parseJSONField(columnIndices.toxicityData !== undefined ? row[columnIndices.toxicityData] : null),
        interactions: parseJSONField(columnIndices.interactions !== undefined ? row[columnIndices.interactions] : null),
        
        // Dosage (not in current export)
        beneficialDose: parseFloatSafe(columnIndices.beneficialDose !== undefined ? row[columnIndices.beneficialDose] : null),
        
        // Quality score
        dataQuality: calculateDataQuality(row, columnIndices),
      }
      
      batch.push(compoundData)
      
      // Insert batch
      if (batch.length >= batchSize) {
        for (const data of batch) {
          try {
            await db.phytoHubCompound.create({ data })
            stats.imported++
          } catch (e: any) {
            // Handle duplicate or other errors
            if (e.code === 'P2002') {
              // Unique constraint violation - skip
              stats.skipped++
            } else {
              stats.errors++
            }
          }
        }
        batch.length = 0
      }
    }
    
    // Insert remaining
    for (const data of batch) {
      try {
        await db.phytoHubCompound.create({ data })
        stats.imported++
      } catch (e: any) {
        if (e.code === 'P2002') {
          stats.skipped++
        } else {
          stats.errors++
        }
      }
    }
    
    // Build food index
    await buildFoodIndex()
    
    return NextResponse.json({
      success: true,
      stats: {
        totalRows: stats.totalRows,
        imported: stats.imported,
        skipped: stats.skipped,
        errors: stats.errors,
      },
      columnMapping: Object.fromEntries(
        Object.entries(columnIndices).map(([k, v]) => [k, headers[v]])
      ),
    })
    
  } catch (error) {
    console.error('PhytoHub import error:', error)
    return NextResponse.json({ 
      error: 'Import failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

// Calculate data quality score (0-100)
function calculateDataQuality(row: string[], indices: Record<string, number>): number {
  let score = 0
  
  // Weights for different fields
  const weights: Record<string, number> = {
    name: 10,               // Chemical Name - always present
    chemicalClass: 10,      // Phytochemical class
    phytochemicalFamily: 10, // Phytochemical family
    molecularFormula: 15,   // Formula
    averageMass: 5,         // Average mass
    monoisotopicMass: 5,    // Monoisotopic mass
    foodSources: 20,        // Food sources - most important for matching
    solubility: 5,          // Bioavailability
    pkaBasic: 5,            // Bioavailability
    pkaAcidic: 5,           // Bioavailability
    synonyms: 5,            // Alternative names
    inchiKey: 5,            // Unique identifier
  }
  
  for (const [field, weight] of Object.entries(weights)) {
    const index = indices[field]
    if (index !== undefined && row[index] && row[index].trim()) {
      score += weight
    }
  }
  
  return Math.min(100, score) // Cap at 100
}

// Build food-compound index for faster lookups
async function buildFoodIndex() {
  const compounds = await db.phytoHubCompound.findMany({
    where: {
      foodSources: { not: null }
    },
    select: { id: true, foodSources: true }
  })
  
  const foodMap: Record<string, string[]> = {}
  
  for (const compound of compounds) {
    if (!compound.foodSources) continue
    
    try {
      const foods = JSON.parse(compound.foodSources) as string[]
      for (const food of foods) {
        const foodLower = food.toLowerCase().trim()
        if (!foodMap[foodLower]) {
          foodMap[foodLower] = []
        }
        foodMap[foodLower].push(compound.id)
      }
    } catch {
      // Skip invalid JSON
    }
  }
  
  // Insert into PhytoHubFood
  for (const [foodName, compoundIds] of Object.entries(foodMap)) {
    try {
      await db.phytoHubFood.upsert({
        where: { name: foodName },
        update: {
          compoundIds: JSON.stringify(compoundIds)
        },
        create: {
          name: foodName,
          compoundIds: JSON.stringify(compoundIds)
        }
      })
    } catch {
      // Skip on error
    }
  }
}
