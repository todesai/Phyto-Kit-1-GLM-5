/**
 * Cross-reference Global Edible Items with CITES database
 * Run with: bun run scripts/cross-reference-cites.ts
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const GLOBAL_EDIBLE_FILE = join(process.cwd(), 'user-uploads', 'general', '2026-02-17T05-49-48-604Z_Global_edible_items_export_20260216.json')
const CITES_CACHE_FILE = join(process.cwd(), 'src', 'data', 'cites-cache.json')

interface EdibleItem {
  'Scientific Name': string
  'English Name': string
  'Category': string
  'Subcategory': string
  'Primary Regional Name': string
  'Primary Region': string
  'Botanical Family': string
  'Culinary Function': string
}

interface CITESMatch {
  scientificName: string
  englishName: string
  category: string
  citesStatus: string
  kingdom: string
  family: string
}

function main() {
  console.log('Cross-referencing Global Edible Items with CITES database...\n')
  
  // Load data
  const edibleData: EdibleItem[] = JSON.parse(readFileSync(GLOBAL_EDIBLE_FILE, 'utf-8'))
  const citesCache: Record<string, { citesStatus: string; kingdom: string; class: string; family: string }> = 
    JSON.parse(readFileSync(CITES_CACHE_FILE, 'utf-8'))
  
  console.log(`Global Edible Items: ${edibleData.length}`)
  console.log(`CITES species: ${Object.keys(citesCache).length}\n`)
  
  // Get unique scientific names from edible items
  const uniqueSpecies = new Map<string, EdibleItem>()
  for (const item of edibleData) {
    const name = item['Scientific Name']?.trim().toLowerCase()
    if (name && !uniqueSpecies.has(name)) {
      uniqueSpecies.set(name, item)
    }
  }
  
  console.log(`Unique edible species: ${uniqueSpecies.size}\n`)
  
  // Cross-reference
  const matches: CITESMatch[] = []
  const appendixI: CITESMatch[] = []
  const appendixII: CITESMatch[] = []
  const appendixIII: CITESMatch[] = []
  
  for (const [normalizedName, item] of uniqueSpecies) {
    const citesEntry = citesCache[normalizedName]
    
    if (citesEntry && ['I', 'II', 'III'].includes(citesEntry.citesStatus)) {
      const match: CITESMatch = {
        scientificName: item['Scientific Name'],
        englishName: item['English Name'] || item['Primary Regional Name'],
        category: item['Category'],
        citesStatus: citesEntry.citesStatus,
        kingdom: citesEntry.kingdom,
        family: citesEntry.family || item['Botanical Family']
      }
      
      matches.push(match)
      
      if (citesEntry.citesStatus === 'I') {
        appendixI.push(match)
      } else if (citesEntry.citesStatus === 'II') {
        appendixII.push(match)
      } else if (citesEntry.citesStatus === 'III') {
        appendixIII.push(match)
      }
    }
  }
  
  // Sort by CITES status
  matches.sort((a, b) => {
    const order = { 'I': 1, 'II': 2, 'III': 3 }
    return (order[a.citesStatus as keyof typeof order] || 99) - (order[b.citesStatus as keyof typeof order] || 99)
  })
  
  // Print summary
  console.log('=== CITES MATCHES IN EDIBLE SPECIES ===\n')
  console.log(`Total matches: ${matches.length} out of ${uniqueSpecies.size} unique species (${((matches.length / uniqueSpecies.size) * 100).toFixed(2)}%)`)
  console.log(`  Appendix I (highest protection): ${appendixI.length}`)
  console.log(`  Appendix II (trade regulated): ${appendixII.length}`)
  console.log(`  Appendix III (country-specific): ${appendixIII.length}\n`)
  
  // Print Appendix I species (most critical)
  if (appendixI.length > 0) {
    console.log('=== APPENDIX I - HIGHEST PROTECTION (Trade Banned) ===\n')
    for (const item of appendixI) {
      console.log(`  ${item.scientificName}`)
      console.log(`    English: ${item.englishName}`)
      console.log(`    Category: ${item.category}`)
      console.log(`    Kingdom: ${item.kingdom}`)
      console.log('')
    }
  }
  
  // Print Appendix II species (sample)
  if (appendixII.length > 0) {
    console.log(`\n=== APPENDIX II - TRADE REGULATED (${appendixII.length} species) ===\n`)
    console.log('Sample of Appendix II species:')
    for (const item of appendixII.slice(0, 20)) {
      console.log(`  ${item.scientificName} (${item.englishName}) - ${item.category}`)
    }
    if (appendixII.length > 20) {
      console.log(`  ... and ${appendixII.length - 20} more`)
    }
  }
  
  // Print Appendix III species (sample)
  if (appendixIII.length > 0) {
    console.log(`\n=== APPENDIX III - COUNTRY-SPECIFIC PROTECTION (${appendixIII.length} species) ===\n`)
    for (const item of appendixIII.slice(0, 10)) {
      console.log(`  ${item.scientificName} (${item.englishName}) - ${item.category}`)
    }
    if (appendixIII.length > 10) {
      console.log(`  ... and ${appendixIII.length - 10} more`)
    }
  }
  
  // Group by category
  console.log('\n=== MATCHES BY CATEGORY ===\n')
  const categoryCount: Record<string, { total: number; I: number; II: number; III: number }> = {}
  for (const match of matches) {
    const cat = match.category || 'Unknown'
    if (!categoryCount[cat]) {
      categoryCount[cat] = { total: 0, I: 0, II: 0, III: 0 }
    }
    categoryCount[cat].total++
    if (match.citesStatus === 'I') categoryCount[cat].I++
    if (match.citesStatus === 'II') categoryCount[cat].II++
    if (match.citesStatus === 'III') categoryCount[cat].III++
  }
  
  const sortedCategories = Object.entries(categoryCount)
    .sort((a, b) => b[1].total - a[1].total)
  
  for (const [category, counts] of sortedCategories) {
    console.log(`${category}: ${counts.total} species`)
    if (counts.I > 0) console.log(`  - Appendix I: ${counts.I}`)
    if (counts.II > 0) console.log(`  - Appendix II: ${counts.II}`)
    if (counts.III > 0) console.log(`  - Appendix III: ${counts.III}`)
  }
  
  // Save full report
  const reportPath = join(process.cwd(), 'src', 'data', 'cites-edible-matches.json')
  writeFileSync(reportPath, JSON.stringify({
    summary: {
      totalEdibleSpecies: uniqueSpecies.size,
      totalCitesMatches: matches.length,
      appendixI: appendixI.length,
      appendixII: appendixII.length,
      appendixIII: appendixIII.length
    },
    appendixI,
    appendixII,
    appendixIII,
    allMatches: matches
  }, null, 2))
  
  console.log(`\n\nFull report saved to: ${reportPath}`)
}

main()
