/**
 * Process CITES CSV files and generate lookup cache
 * Run with: bun run scripts/process-cites.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const USER_UPLOADS_DIR = join(process.cwd(), 'user-uploads', 'general')
const OUTPUT_DIR = join(process.cwd(), 'src', 'data')

// CITES files
const CITES_FILES = [
  '2026-03-07T06-06-09-663Z_CITES_listings_2026-03-06_08_11_1.csv', // Animals
  '2026-03-07T06-06-34-772Z_CITES_listings_2026-03-06_08_11_2.csv', // Plants part 1
  '2026-03-07T06-06-51-834Z_CITES_listings_2026-03-06_08_11_3.csv', // Plants part 2
]

interface CITESRecord {
  scientificName: string
  listing: string
  kingdom: string
  class: string
  family: string
}

interface CITESCache {
  [key: string]: {
    citesStatus: string
    kingdom: string
    class: string
    family: string
  }
}

// Parse CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
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

// Extract listing code from CITES format (e.g., "I", "II", "III", "#1", etc.)
function normalizeListing(listing: string): string {
  if (!listing) return ''
  
  // Clean up the listing
  const cleaned = listing.trim().toUpperCase()
  
  // Standard listings
  if (cleaned === 'I' || cleaned === 'II' || cleaned === 'III') {
    return cleaned
  }
  
  // Handle annotations like "I#", "II#", etc.
  if (cleaned.startsWith('I') || cleaned.startsWith('II') || cleaned.startsWith('III')) {
    // Extract just the Roman numeral
    if (cleaned.startsWith('III')) return 'III'
    if (cleaned.startsWith('II')) return 'II'
    if (cleaned.startsWith('I')) return 'I'
  }
  
  return cleaned
}

function processCITESFiles(): CITESCache {
  const cache: CITESCache = {}
  let totalRecords = 0
  let uniqueSpecies = 0
  
  console.log('Processing CITES files...\n')
  
  for (const fileName of CITES_FILES) {
    const filePath = join(USER_UPLOADS_DIR, fileName)
    
    if (!existsSync(filePath)) {
      console.log(`File not found: ${fileName}`)
      continue
    }
    
    console.log(`Processing: ${fileName}`)
    
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    
    // Get header
    const headers = parseCSVLine(lines[0])
    const scientificNameIdx = headers.indexOf('Scientific Name')
    const listingIdx = headers.indexOf('Listing')
    const kingdomIdx = headers.indexOf('Kingdom')
    const classIdx = headers.indexOf('Class')
    const familyIdx = headers.indexOf('Family')
    
    console.log(`  Headers found: Scientific Name=${scientificNameIdx}, Listing=${listingIdx}`)
    
    let fileRecords = 0
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      const fields = parseCSVLine(line)
      
      const scientificName = fields[scientificNameIdx]?.trim()
      const listing = fields[listingIdx]?.trim()
      const kingdom = fields[kingdomIdx]?.trim() || ''
      const class_ = fields[classIdx]?.trim() || ''
      const family = fields[familyIdx]?.trim() || ''
      
      if (!scientificName || !listing) continue
      
      // Normalize scientific name for lookup
      const normalizedName = scientificName.toLowerCase().trim()
      
      // Normalize listing
      const normalizedListing = normalizeListing(listing)
      
      if (!normalizedListing) continue
      
      // Add to cache
      cache[normalizedName] = {
        citesStatus: normalizedListing,
        kingdom,
        class: class_,
        family
      }
      
      fileRecords++
      totalRecords++
    }
    
    console.log(`  Processed ${fileRecords} records`)
  }
  
  uniqueSpecies = Object.keys(cache).length
  
  console.log(`\n=== Summary ===`)
  console.log(`Total records processed: ${totalRecords}`)
  console.log(`Unique species: ${uniqueSpecies}`)
  
  return cache
}

function main() {
  console.log('CITES Data Processor')
  console.log('===================\n')
  
  // Process files
  const cache = processCITESFiles()
  
  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
  }
  
  // Write cache to JSON file
  const outputPath = join(OUTPUT_DIR, 'cites-cache.json')
  writeFileSync(outputPath, JSON.stringify(cache, null, 2))
  console.log(`\nCache saved to: ${outputPath}`)
  
  // Also generate TypeScript file for direct import
  const tsContent = `// Auto-generated CITES cache
// Generated: ${new Date().toISOString()}
// Total species: ${Object.keys(cache).length}

export const CITES_CACHE: Record<string, { citesStatus: string; kingdom: string; class: string; family: string }> = ${JSON.stringify(cache, null, 2)};
`
  
  const tsOutputPath = join(OUTPUT_DIR, 'cites-cache.ts')
  writeFileSync(tsOutputPath, tsContent)
  console.log(`TypeScript cache saved to: ${tsOutputPath}`)
  
  // Print sample entries
  console.log('\n=== Sample entries ===')
  const sampleKeys = Object.keys(cache).slice(0, 10)
  for (const key of sampleKeys) {
    console.log(`  ${key}: ${JSON.stringify(cache[key])}`)
  }
  
  // Print statistics by kingdom
  console.log('\n=== Statistics by Kingdom ===')
  const kingdomStats: Record<string, number> = {}
  for (const key of Object.keys(cache)) {
    const kingdom = cache[key].kingdom || 'Unknown'
    kingdomStats[kingdom] = (kingdomStats[kingdom] || 0) + 1
  }
  for (const [kingdom, count] of Object.entries(kingdomStats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${kingdom}: ${count}`)
  }
}

main()
