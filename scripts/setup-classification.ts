/**
 * Script to set up the classification workspace:
 * 1. Import Mexican food data from CSV
 * 2. Extract words for classification
 * 3. Identify single-word parent candidates
 * 4. Mark multi-word items as potential children
 */

import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { db } from '../src/lib/db'

const CSV_PATH = '/home/z/my-project/user-uploads/general/2026-02-12T14-42-30-271Z_Base_de_datos_Nutricion_alimentos_Siagro_20260212.csv'

// CSV column indices (0-based) - based on actual CSV header
const COLUMNS = {
  conabioId: 0,
  claveOriginal: 1,
  tipoAlimento: 2,
  foodType: 3,
  descripcionAlimento: 4,
  foodDescription: 5,
  procedencia: 6,
  referenciasIds: 7,
  taxonId: 8,
  taxon: 9,
  categoria: 10,
  estatus: 11,
  fuente: 12,
  nombreAutoridad: 13,
  cites: 14,
  // Nutrients start at column 15
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
  // Metadata columns
  similarAbajo: 96,
  similarArriba: 97,
  checkForSimilar: 98,
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

// Parse numeric value from CSV
function parseNutrientValue(value: string): number | null {
  if (!value || value.trim() === '') return null
  const cleaned = value.replace(/[^\d.\-]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

// Count non-null nutrient values
function countNutrients(row: string[]): number {
  let count = 0
  for (let i = 15; i <= 95; i++) {
    if (row[i] && row[i].trim() !== '') {
      count++
    }
  }
  return count
}

// Parse Spanish name from column 5
function parseNames(descripcionAlimento: string): { spanish: string; english: string | null } {
  if (!descripcionAlimento) {
    return { spanish: 'Unknown', english: null }
  }
  
  const separatorIndex = descripcionAlimento.indexOf(' - ')
  
  if (separatorIndex > 0) {
    const spanish = descripcionAlimento.substring(0, separatorIndex).trim()
    const english = descripcionAlimento.substring(separatorIndex + 3).trim()
    return { spanish, english: english || null }
  }
  
  return { spanish: descripcionAlimento.trim(), english: null }
}

async function main() {
  console.log('🚀 Starting classification setup...\n')
  
  // Step 1: Check if data already exists
  const existingCount = await db.mexicanFood.count()
  if (existingCount > 0) {
    console.log(`⚠️  Database already has ${existingCount} items. Clearing...`)
    await db.mexicanFood.deleteMany()
    await db.wordClassification.deleteMany()
    await db.hierarchyAuditLog.deleteMany()
  }
  
  // Step 2: Read and parse CSV
  console.log('📖 Reading CSV file...')
  const content = await readFile(CSV_PATH, 'utf-8')
  const cleanContent = content.replace(/^\uFEFF/, '')
  const lines = cleanContent.split('\n').filter(line => line.trim())
  const dataLines = lines.slice(1) // Skip header
  
  console.log(`📊 Found ${dataLines.length} rows in CSV\n`)
  
  // Step 3: Parse rows and handle duplicates
  interface CSVRow {
    raw: string[]
    nutrientCount: number
    nombreEspanol: string
    nombreIngles: string | null
    isSimilarBelow: boolean
    isSimilarAbove: boolean
  }
  
  const allRows: CSVRow[] = dataLines.map((line) => {
    const raw = parseCSVLine(line)
    const descripcionAlimento = raw[COLUMNS.descripcionAlimento] || ''
    const { spanish, english } = parseNames(descripcionAlimento)
    const nutrientCount = countNutrients(raw)
    
    return {
      raw,
      nutrientCount,
      nombreEspanol: spanish,
      nombreIngles: english,
      isSimilarBelow: raw[COLUMNS.similarAbajo]?.toUpperCase() === 'VERDADERO',
      isSimilarAbove: raw[COLUMNS.similarArriba]?.toUpperCase() === 'VERDADERO',
    }
  })
  
  // Group similar rows
  const groups: CSVRow[][] = []
  let currentGroup: CSVRow[] = []
  
  for (const row of allRows) {
    if (row.isSimilarAbove && currentGroup.length > 0) {
      currentGroup.push(row)
    } else {
      if (currentGroup.length > 0) {
        groups.push(currentGroup)
      }
      currentGroup = [row]
    }
  }
  if (currentGroup.length > 0) {
    groups.push(currentGroup)
  }
  
  // Select best row from each group
  const uniqueRows: CSVRow[] = []
  for (const group of groups) {
    group.sort((a, b) => b.nutrientCount - a.nutrientCount)
    uniqueRows.push(group[0])
  }
  
  console.log(`✅ ${uniqueRows.length} unique items after deduplication\n`)
  
  // Step 4: Import to database
  console.log('💾 Importing to database...')
  let imported = 0
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
          taxon: raw[COLUMNS.taxon] || null,
          categoria: raw[COLUMNS.categoria] || null,
          estatus: raw[COLUMNS.estatus] || null,
          fuente: raw[COLUMNS.fuente] || null,
          nombreAutoridad: raw[COLUMNS.nombreAutoridad] || null,
          
          // Fatty acids
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
          
          // Amino acids and other nutrients
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
      imported++
      
      if (imported % 500 === 0) {
        console.log(`  Imported ${imported} items...`)
      }
    } catch (error) {
      errors.push(`Row ${row.raw[0]}: ${error}`)
    }
  }
  
  console.log(`✅ Imported ${imported} items\n`)
  
  if (errors.length > 0) {
    console.log(`⚠️  ${errors.length} errors during import`)
  }
  
  // Step 5: Extract words for classification
  console.log('📝 Extracting words for classification...')
  
  const allItems = await db.mexicanFood.findMany({
    select: { id: true, nombreEspanol: true, tipoAlimento: true }
  })
  
  // Excluded types for parent candidates
  const excludedTypes = ['VARIOS', 'ADEREZO']
  
  // Word frequency map
  const wordFrequency = new Map<string, { count: number; examples: string[] }>()
  
  for (const item of allItems) {
    // Remove content in parentheses and split into words
    const cleanName = item.nombreEspanol.replace(/\([^)]*\)/g, '').trim()
    const words = cleanName.split(/\s+/).filter(w => w.length > 1)
    
    for (const word of words) {
      const normalized = word.toLowerCase()
      const existing = wordFrequency.get(normalized)
      
      if (existing) {
        existing.count++
        if (existing.examples.length < 5 && !existing.examples.includes(item.nombreEspanol)) {
          existing.examples.push(item.nombreEspanol)
        }
      } else {
        wordFrequency.set(normalized, {
          count: 1,
          examples: [item.nombreEspanol]
        })
      }
    }
  }
  
  console.log(`📊 Found ${wordFrequency.size} unique words\n`)
  
  // Step 6: Create word classifications
  console.log('🏷️  Creating word classifications...')
  
  // Pre-defined word categories
  const knownCategories: Record<string, { category: string; priority: number }> = {
    // Core ingredients (highest priority)
    'papa': { category: 'core', priority: 1 },
    'tomate': { category: 'core', priority: 1 },
    'chile': { category: 'core', priority: 1 },
    'ajo': { category: 'core', priority: 1 },
    'cebolla': { category: 'core', priority: 1 },
    'maiz': { category: 'core', priority: 1 },
    'frijol': { category: 'core', priority: 1 },
    'arroz': { category: 'core', priority: 1 },
    'pollo': { category: 'core', priority: 1 },
    'res': { category: 'core', priority: 1 },
    'cerdo': { category: 'core', priority: 1 },
    'pescado': { category: 'core', priority: 1 },
    'naranja': { category: 'core', priority: 1 },
    'limon': { category: 'core', priority: 1 },
    'platano': { category: 'core', priority: 1 },
    'papaya': { category: 'core', priority: 1 },
    'aguacate': { category: 'core', priority: 1 },
    'cacao': { category: 'core', priority: 1 },
    'café': { category: 'core', priority: 1 },
    'huevo': { category: 'core', priority: 1 },
    'leche': { category: 'core', priority: 1 },
    'queso': { category: 'core', priority: 1 },
    'crema': { category: 'core', priority: 1 },
    'manteca': { category: 'core', priority: 1 },
    'aceite': { category: 'core', priority: 1 },
    'harina': { category: 'core', priority: 1 },
    'azucar': { category: 'core', priority: 1 },
    'sal': { category: 'core', priority: 1 },
    'pimienta': { category: 'core', priority: 1 },
    'cilantro': { category: 'core', priority: 1 },
    'oregano': { category: 'core', priority: 1 },
    'comino': { category: 'core', priority: 1 },
    'canela': { category: 'core', priority: 1 },
    
    // Processing descriptors
    'molido': { category: 'processing', priority: 2 },
    'seco': { category: 'processing', priority: 2 },
    'fresco': { category: 'processing', priority: 2 },
    'asado': { category: 'processing', priority: 2 },
    'frito': { category: 'processing', priority: 2 },
    'cocido': { category: 'processing', priority: 2 },
    'crudo': { category: 'processing', priority: 2 },
    'deshidratado': { category: 'processing', priority: 2 },
    'concentrado': { category: 'processing', priority: 2 },
    'jarabe': { category: 'processing', priority: 2 },
    'jugo': { category: 'processing', priority: 2 },
    'pulpa': { category: 'processing', priority: 2 },
    'puré': { category: 'processing', priority: 2 },
    'polvo': { category: 'processing', priority: 2 },
    'tostado': { category: 'processing', priority: 2 },
    
    // Colors
    'blanco': { category: 'color', priority: 3 },
    'negro': { category: 'color', priority: 3 },
    'rojo': { category: 'color', priority: 3 },
    'verde': { category: 'color', priority: 3 },
    'amarillo': { category: 'color', priority: 3 },
    'morado': { category: 'color', priority: 3 },
    
    // Forms/cuts
    'entero': { category: 'form', priority: 3 },
    'trozo': { category: 'form', priority: 3 },
    'rodaja': { category: 'form', priority: 3 },
    'trocitos': { category: 'form', priority: 3 },
    'filete': { category: 'form', priority: 3 },
    
    // Connectors (lowest priority)
    'de': { category: 'connector', priority: 5 },
    'con': { category: 'connector', priority: 5 },
    'sin': { category: 'connector', priority: 5 },
    'y': { category: 'connector', priority: 5 },
    'para': { category: 'connector', priority: 5 },
    'en': { category: 'connector', priority: 5 },
    'la': { category: 'connector', priority: 5 },
    'el': { category: 'connector', priority: 5 },
    'las': { category: 'connector', priority: 5 },
    'los': { category: 'connector', priority: 5 },
    'del': { category: 'connector', priority: 5 },
  }
  
  // Create word classifications
  let wordsCreated = 0
  for (const [wordLower, data] of wordFrequency) {
    const known = knownCategories[wordLower]
    
    await db.wordClassification.create({
      data: {
        word: wordLower.charAt(0).toUpperCase() + wordLower.slice(1), // Capitalized
        wordLower,
        category: known?.category || 'unknown',
        priority: known?.priority || 4,
        frequency: data.count,
        examples: JSON.stringify(data.examples),
        needsReview: !known, // Needs review if not in known categories
      }
    })
    wordsCreated++
  }
  
  console.log(`✅ Created ${wordsCreated} word classifications\n`)
  
  // Step 7: Identify single-word parent candidates
  console.log('🔍 Identifying single-word parent candidates...')
  
  // Single-word items that are NOT in excluded types
  const singleWordItems = allItems.filter(item => {
    if (excludedTypes.includes(item.tipoAlimento || '')) return false
    const cleanName = item.nombreEspanol.replace(/\([^)]*\)/g, '').trim()
    return !cleanName.includes(' ')
  })
  
  console.log(`📊 Found ${singleWordItems.length} single-word items as parent candidates\n`)
  
  // Step 8: Count potential children for each parent
  console.log('👨‍👩‍👧‍👦 Counting potential children...')
  
  let parentCandidates = 0
  let potentialChildren = 0
  
  // Group single-word items by lowercase name
  const parentMap = new Map<string, { id: string; name: string; count: number }>()
  
  for (const item of singleWordItems) {
    const wordLower = item.nombreEspanol.toLowerCase()
    const existing = parentMap.get(wordLower)
    
    if (existing) {
      existing.count++
    } else {
      parentMap.set(wordLower, {
        id: item.id,
        name: item.nombreEspanol,
        count: 1
      })
    }
  }
  
  // For each parent candidate, count potential children
  for (const [parentWordLower, parentData] of parentMap) {
    // Find all items that contain this word (but aren't exactly this word)
    const children = allItems.filter(item => {
      if (item.id === parentData.id) return false
      const nameLower = item.nombreEspanol.toLowerCase()
      // Word boundary match
      const regex = new RegExp(`\\b${parentWordLower}\\b`, 'i')
      return regex.test(item.nombreEspanol) && nameLower !== parentWordLower
    })
    
    if (children.length > 0) {
      parentCandidates++
      potentialChildren += children.length
    }
  }
  
  console.log(`✅ Found ${parentCandidates} parent candidates with potential children`)
  console.log(`✅ Found ${potentialChildren} potential child relationships\n`)
  
  // Summary
  console.log('═'.repeat(50))
  console.log('📋 SETUP COMPLETE')
  console.log('═'.repeat(50))
  console.log(`✅ Imported: ${imported} food items`)
  console.log(`✅ Created: ${wordsCreated} word classifications`)
  console.log(`✅ Parent candidates: ${singleWordItems.length} single-word items`)
  console.log(`✅ Potential relationships: ${parentCandidates} parents with children`)
  console.log('')
  console.log('🎯 Next steps:')
  console.log('   1. Open the app in your browser')
  console.log('   2. Click the "Classification Workspace" button')
  console.log('   3. Review and confirm parents')
  console.log('   4. Link or reject children')
  console.log('   5. Classify unknown words')
  console.log('')
  
  await db.$disconnect()
}

main().catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})
