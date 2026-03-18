import { NextRequest, NextResponse } from 'next/server'
import { readFile, readdir, stat } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { db } from '@/lib/db'

const UPLOAD_DIR = path.join(process.cwd(), 'user-uploads')

// CSV column indices (0-based)
const COLUMNS = {
  conabioId: 0,
  claveOriginal: 1,
  tipoAlimento: 2,
  foodType: 3,
  descripcionAlimento: 4,  // Column 5: "Spanish Name - English Name" format
  foodDescription: 5,       // Column 6: English name only
  procedencia: 6,
  referenciasIds: 7,
  taxonId: 8,
  taxon: 9,
  categoria: 10,
  estatus: 11,
  fuente: 12,
  nombreAutoridad: 13,
  cites: 14,
  // Nutrients start at column 15 (index 15)
  acidoAscorbico: 15,
  acidoLaurico: 16,
  acidoAraquidico: 17,
  acidoAspartico: 18,
  acidoBehenico: 19,
  acidoButirico: 20,
  acidoCaprico: 21,
  acidoCaprilico: 22,
  acidoCaproico: 23,
  acidoCis10Heptadecanoico: 24,
  acidoCis11Eicosenoico: 25,
  acidoCis1114Eicosatrienoico: 26,
  acidoCis111417Eicosatrienoico: 27,
  acidoElaidico: 28,
  acidoEsteaico: 29,
  acidoGlutamico: 30,
  acidoHeneicosanoico: 31,
  acidoHeptadecanoico: 32,
  acidoLignocerico: 33,
  acidoLinoleico: 34,
  acidoLinolenico: 35,
  acidoMiristico: 36,
  acidoOleico: 37,
  acidoPalmitico: 38,
  acidoPalmitoleico: 39,
  acidoPentadecanoico: 40,
  acidoTricosanoico: 41,
  acidoUndecanoico: 42,
  acidoYLinolenico: 43,
  acidosGrasosSaturados: 44,
  alanina: 45,
  almidon: 46,
  aminoacidosAromaticos: 47,
  aminoacidosAzufrados: 48,
  arginina: 49,
  azucares: 50,
  betaCarotenos: 51,
  calcio: 52,
  carotenos: 53,
  cenizas: 54,
  cisteina: 55,
  cobre: 56,
  colesterol: 57,
  energia: 58,
  extractoEtereo: 59,
  fenilalanina: 60,
  fibraBruta: 61,
  fibraDietariaInsoluble: 62,
  fibraDietariaTotal: 63,
  fosforo: 64,
  glicina: 65,
  hidratosCarbono: 66,
  hierro: 67,
  histidina: 68,
  humedad: 69,
  isoleucina: 70,
  lactosa: 71,
  leucina: 72,
  lisina: 73,
  litio: 74,
  magnesio: 75,
  manganeso: 76,
  metionina: 77,
  niacina: 78,
  polisacaridosNoAmilaceosInsolubles: 79,
  polisacaridosNoAmilaceosTotales: 80,
  porcionComestible: 81,
  potasio: 82,
  prolina: 83,
  proteinaBruta: 84,
  riboflavina: 85,
  selenio: 86,
  serina: 87,
  sodio: 88,
  tiamina: 89,
  tirosina: 90,
  treonina: 91,
  triptofano: 92,
  valina: 93,
  vitaminaA: 94,
  zinc: 95,
  // Metadata columns for duplicate detection
  similarAbajo: 96,       // "Similar abajo?" - Similar below?
  similarArriba: 97,      // "Similar arriba?" - Similar above?
  checkForSimilar: 98,    // "Check for similar items"
  columnasSinNutrientes: 99,   // Columns without nutrients
  columnasConNutrientes: 100,  // Columns with nutrients
}

// Parse a CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
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
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  
  return result
}

// Parse numeric value from CSV (handles "12.4 g", "68887.45 mg", etc.)
function parseNutrientValue(value: string): number | null {
  if (!value || value.trim() === '') return null
  
  // Remove any text units and extract number
  const cleaned = value.replace(/[^\d.\-]/g, '')
  const num = parseFloat(cleaned)
  
  return isNaN(num) ? null : num
}

// Count non-null nutrient values in a row (columns 15-95)
function countNutrients(row: string[]): number {
  let count = 0
  for (let i = 15; i <= 95; i++) {
    if (row[i] && row[i].trim() !== '') {
      count++
    }
  }
  return count
}

// Parse Spanish and English names from column 5
// Format: "Spanish Name - English Name" or just "Spanish Name"
function parseNames(descripcionAlimento: string): { spanish: string; english: string | null } {
  if (!descripcionAlimento) {
    return { spanish: 'Unknown', english: null }
  }
  
  // Check for " - " separator (Spanish - English format)
  const separatorIndex = descripcionAlimento.indexOf(' - ')
  
  if (separatorIndex > 0) {
    const spanish = descripcionAlimento.substring(0, separatorIndex).trim()
    const english = descripcionAlimento.substring(separatorIndex + 3).trim()
    return { spanish, english: english || null }
  }
  
  // No separator, entire string is Spanish name
  return { spanish: descripcionAlimento.trim(), english: null }
}

interface CSVRow {
  raw: string[]
  nutrientCount: number
  descripcionAlimento: string
  nombreEspanol: string
  nombreIngles: string | null
  isSimilarBelow: boolean
  isSimilarAbove: boolean
  index: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filePath } = body
    
    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 })
    }
    
    // Security check - ensure path is within UPLOAD_DIR
    const resolvedPath = path.resolve(filePath)
    if (!resolvedPath.startsWith(UPLOAD_DIR)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }
    
    if (!existsSync(resolvedPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    
    // Read CSV file
    const content = await readFile(resolvedPath, 'utf-8')
    
    // Handle BOM if present
    const cleanContent = content.replace(/^\uFEFF/, '')
    
    const lines = cleanContent.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file is empty or has no data rows' }, { status: 400 })
    }
    
    // Skip header row
    const dataLines = lines.slice(1)
    
    // Parse all rows with metadata
    const allRows: CSVRow[] = dataLines.map((line, index) => {
      const raw = parseCSVLine(line)
      const descripcionAlimento = raw[COLUMNS.descripcionAlimento] || ''
      const { spanish, english } = parseNames(descripcionAlimento)
      const nutrientCount = countNutrients(raw)
      
      // Check similarity flags
      const similarAbajo = raw[COLUMNS.similarAbajo]?.toUpperCase() === 'VERDADERO'
      const similarArriba = raw[COLUMNS.similarArriba]?.toUpperCase() === 'VERDADERO'
      
      return { 
        raw, 
        nutrientCount, 
        descripcionAlimento,
        nombreEspanol: spanish,
        nombreIngles: english,
        isSimilarBelow: similarAbajo,
        isSimilarAbove: similarArriba,
        index 
      }
    })
    
    // Group similar rows using the similarity flags
    // Rows are similar if they have similarArriba=true (similar to row above)
    // or similarAbajo=true (similar to row below)
    const groups: CSVRow[][] = []
    let currentGroup: CSVRow[] = []
    
    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i]
      
      if (row.isSimilarAbove && currentGroup.length > 0) {
        // This row is similar to the previous one, add to current group
        currentGroup.push(row)
      } else {
        // This row starts a new group
        if (currentGroup.length > 0) {
          groups.push(currentGroup)
        }
        currentGroup = [row]
      }
    }
    
    // Don't forget the last group
    if (currentGroup.length > 0) {
      groups.push(currentGroup)
    }
    
    // For each group, select the row with the highest nutrient count
    const uniqueRows: CSVRow[] = []
    const duplicates: { name: string; count: number; selected: number }[] = []
    
    for (const group of groups) {
      if (group.length > 1) {
        // Sort by nutrient count descending
        group.sort((a, b) => b.nutrientCount - a.nutrientCount)
        duplicates.push({ 
          name: group[0].nombreEspanol, 
          count: group.length, 
          selected: group[0].nutrientCount 
        })
      }
      uniqueRows.push(group[0])
    }
    
    // Clear existing data
    await db.mexicanFood.deleteMany()
    
    // Insert unique rows
    let inserted = 0
    const errors: string[] = []
    
    for (const row of uniqueRows) {
      try {
        const raw = row.raw
        
        await db.mexicanFood.create({
          data: {
            conabioId: parseInt(raw[COLUMNS.conabioId]) || 0,
            claveOriginal: raw[COLUMNS.claveOriginal] || null,
            tipoAlimento: raw[COLUMNS.tipoAlimento] || null,
            foodType: raw[COLUMNS.foodType] || null,
            nombreEspanol: row.nombreEspanol,
            nombreIngles: row.nombreIngles,
            descripcionAlimento: raw[COLUMNS.descripcionAlimento] || 'Unknown',
            foodDescription: raw[COLUMNS.foodDescription] || null,
            procedencia: raw[COLUMNS.procedencia] || null,
            taxonId: raw[COLUMNS.taxonId] || null,
            taxon: raw[COLUMNS.taxon] || null,
            categoria: raw[COLUMNS.categoria] || null,
            estatus: raw[COLUMNS.estatus] || null,
            fuente: raw[COLUMNS.fuente] || null,
            nombreAutoridad: raw[COLUMNS.nombreAutoridad] || null,
            
            // Nutrients
            acidoAscorbico: parseNutrientValue(raw[COLUMNS.acidoAscorbico]),
            acidoLaurico: parseNutrientValue(raw[COLUMNS.acidoLaurico]),
            acidoAraquidico: parseNutrientValue(raw[COLUMNS.acidoAraquidico]),
            acidoAspartico: parseNutrientValue(raw[COLUMNS.acidoAspartico]),
            acidoBehenico: parseNutrientValue(raw[COLUMNS.acidoBehenico]),
            acidoButirico: parseNutrientValue(raw[COLUMNS.acidoButirico]),
            acidoCaprico: parseNutrientValue(raw[COLUMNS.acidoCaprico]),
            acidoCaprilico: parseNutrientValue(raw[COLUMNS.acidoCaprilico]),
            acidoCaproico: parseNutrientValue(raw[COLUMNS.acidoCaproico]),
            acidoCis10Heptadecanoico: parseNutrientValue(raw[COLUMNS.acidoCis10Heptadecanoico]),
            acidoCis11Eicosenoico: parseNutrientValue(raw[COLUMNS.acidoCis11Eicosenoico]),
            acidoCis1114Eicosatrienoico: parseNutrientValue(raw[COLUMNS.acidoCis1114Eicosatrienoico]),
            acidoCis111417Eicosatrienoico: parseNutrientValue(raw[COLUMNS.acidoCis111417Eicosatrienoico]),
            acidoElaidico: parseNutrientValue(raw[COLUMNS.acidoElaidico]),
            acidoEsteaico: parseNutrientValue(raw[COLUMNS.acidoEsteaico]),
            acidoGlutamico: parseNutrientValue(raw[COLUMNS.acidoGlutamico]),
            acidoHeneicosanoico: parseNutrientValue(raw[COLUMNS.acidoHeneicosanoico]),
            acidoHeptadecanoico: parseNutrientValue(raw[COLUMNS.acidoHeptadecanoico]),
            acidoLignocerico: parseNutrientValue(raw[COLUMNS.acidoLignocerico]),
            acidoLinoleico: parseNutrientValue(raw[COLUMNS.acidoLinoleico]),
            acidoLinolenico: parseNutrientValue(raw[COLUMNS.acidoLinolenico]),
            acidoMiristico: parseNutrientValue(raw[COLUMNS.acidoMiristico]),
            acidoOleico: parseNutrientValue(raw[COLUMNS.acidoOleico]),
            acidoPalmitico: parseNutrientValue(raw[COLUMNS.acidoPalmitico]),
            acidoPalmitoleico: parseNutrientValue(raw[COLUMNS.acidoPalmitoleico]),
            acidoPentadecanoico: parseNutrientValue(raw[COLUMNS.acidoPentadecanoico]),
            acidoTricosanoico: parseNutrientValue(raw[COLUMNS.acidoTricosanoico]),
            acidoUndecanoico: parseNutrientValue(raw[COLUMNS.acidoUndecanoico]),
            acidoYLinolenico: parseNutrientValue(raw[COLUMNS.acidoYLinolenico]),
            acidosGrasosSaturados: parseNutrientValue(raw[COLUMNS.acidosGrasosSaturados]),
            alanina: parseNutrientValue(raw[COLUMNS.alanina]),
            almidon: parseNutrientValue(raw[COLUMNS.almidon]),
            aminoacidosAromaticos: parseNutrientValue(raw[COLUMNS.aminoacidosAromaticos]),
            aminoacidosAzufrados: parseNutrientValue(raw[COLUMNS.aminoacidosAzufrados]),
            arginina: parseNutrientValue(raw[COLUMNS.arginina]),
            azucares: parseNutrientValue(raw[COLUMNS.azucares]),
            betaCarotenos: parseNutrientValue(raw[COLUMNS.betaCarotenos]),
            calcio: parseNutrientValue(raw[COLUMNS.calcio]),
            carotenos: parseNutrientValue(raw[COLUMNS.carotenos]),
            cenizas: parseNutrientValue(raw[COLUMNS.cenizas]),
            cisteina: parseNutrientValue(raw[COLUMNS.cisteina]),
            cobre: parseNutrientValue(raw[COLUMNS.cobre]),
            colesterol: parseNutrientValue(raw[COLUMNS.colesterol]),
            energia: parseNutrientValue(raw[COLUMNS.energia]),
            extractoEtereo: parseNutrientValue(raw[COLUMNS.extractoEtereo]),
            fenilalanina: parseNutrientValue(raw[COLUMNS.fenilalanina]),
            fibraBruta: parseNutrientValue(raw[COLUMNS.fibraBruta]),
            fibraDietariaInsoluble: parseNutrientValue(raw[COLUMNS.fibraDietariaInsoluble]),
            fibraDietariaTotal: parseNutrientValue(raw[COLUMNS.fibraDietariaTotal]),
            fosforo: parseNutrientValue(raw[COLUMNS.fosforo]),
            glicina: parseNutrientValue(raw[COLUMNS.glicina]),
            hidratosCarbono: parseNutrientValue(raw[COLUMNS.hidratosCarbono]),
            hierro: parseNutrientValue(raw[COLUMNS.hierro]),
            histidina: parseNutrientValue(raw[COLUMNS.histidina]),
            humedad: parseNutrientValue(raw[COLUMNS.humedad]),
            isoleucina: parseNutrientValue(raw[COLUMNS.isoleucina]),
            lactosa: parseNutrientValue(raw[COLUMNS.lactosa]),
            leucina: parseNutrientValue(raw[COLUMNS.leucina]),
            lisina: parseNutrientValue(raw[COLUMNS.lisina]),
            litio: parseNutrientValue(raw[COLUMNS.litio]),
            magnesio: parseNutrientValue(raw[COLUMNS.magnesio]),
            manganeso: parseNutrientValue(raw[COLUMNS.manganeso]),
            metionina: parseNutrientValue(raw[COLUMNS.metionina]),
            niacina: parseNutrientValue(raw[COLUMNS.niacina]),
            polisacaridosNoAmilaceosInsolubles: parseNutrientValue(raw[COLUMNS.polisacaridosNoAmilaceosInsolubles]),
            polisacaridosNoAmilaceosTotales: parseNutrientValue(raw[COLUMNS.polisacaridosNoAmilaceosTotales]),
            porcionComestible: parseNutrientValue(raw[COLUMNS.porcionComestible]),
            potasio: parseNutrientValue(raw[COLUMNS.potasio]),
            prolina: parseNutrientValue(raw[COLUMNS.prolina]),
            proteinaBruta: parseNutrientValue(raw[COLUMNS.proteinaBruta]),
            riboflavina: parseNutrientValue(raw[COLUMNS.riboflavina]),
            selenio: parseNutrientValue(raw[COLUMNS.selenio]),
            serina: parseNutrientValue(raw[COLUMNS.serina]),
            sodio: parseNutrientValue(raw[COLUMNS.sodio]),
            tiamina: parseNutrientValue(raw[COLUMNS.tiamina]),
            tirosina: parseNutrientValue(raw[COLUMNS.tirosina]),
            treonina: parseNutrientValue(raw[COLUMNS.treonina]),
            triptofano: parseNutrientValue(raw[COLUMNS.triptofano]),
            valina: parseNutrientValue(raw[COLUMNS.valina]),
            vitaminaA: parseNutrientValue(raw[COLUMNS.vitaminaA]),
            zinc: parseNutrientValue(raw[COLUMNS.zinc]),
            
            nutrientScore: row.nutrientCount,
          }
        })
        inserted++
      } catch (error) {
        errors.push(`Row ${raw[0]}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
    return NextResponse.json({
      success: true,
      stats: {
        totalRows: allRows.length,
        uniqueFoods: uniqueRows.length,
        duplicatesRemoved: allRows.length - uniqueRows.length,
        inserted,
        errors: errors.length,
      },
      duplicateDetails: duplicates.slice(0, 30), // Show first 30 duplicates
      errorDetails: errors.slice(0, 10), // Show first 10 errors
    })
    
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ 
      error: 'Failed to import CSV', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

// GET endpoint to list available CSV files and database stats
export async function GET() {
  try {
    const csvFiles: Array<{
      path: string
      name: string
      category: string
      size: number
    }> = []
    
    if (existsSync(UPLOAD_DIR)) {
      const categories = await readdir(UPLOAD_DIR)
      
      for (const category of categories) {
        const categoryPath = path.join(UPLOAD_DIR, category)
        const categoryStat = await stat(categoryPath)
        
        if (categoryStat.isDirectory()) {
          const files = await readdir(categoryPath)
          
          for (const fileName of files) {
            if (fileName.toLowerCase().endsWith('.csv')) {
              const filePath = path.join(categoryPath, fileName)
              const fileStat = await stat(filePath)
              
              csvFiles.push({
                path: filePath,
                name: fileName,
                category,
                size: fileStat.size,
              })
            }
          }
        }
      }
    }
    
    // Get database stats
    const dbCount = await db.mexicanFood.count()
    
    return NextResponse.json({ 
      files: csvFiles,
      databaseStats: {
        totalFoods: dbCount,
      }
    })
    
  } catch (error) {
    console.error('List CSV files error:', error)
    return NextResponse.json({ files: [], databaseStats: { totalFoods: 0 } })
  }
}
