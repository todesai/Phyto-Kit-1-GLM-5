/**
 * Cross-reference Mexican Food database with CITES
 * Run with: bun run scripts/cross-reference-mexican-cites.ts
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { db } from '../src/lib/db'

const CITES_CACHE_FILE = join(process.cwd(), 'src', 'data', 'cites-cache.json')

interface CITESMatch {
  id: string
  nombreEspanol: string
  nombreIngles: string | null
  taxon: string
  tipoAlimento: string | null
  citesStatus: string
  kingdom: string
  family: string
}

async function main() {
  console.log('Cross-referencing Mexican Food with CITES database...\n')
  
  // Load CITES cache
  const citesCache: Record<string, { citesStatus: string; kingdom: string; class: string; family: string }> = 
    JSON.parse(readFileSync(CITES_CACHE_FILE, 'utf-8'))
  
  console.log(`CITES species: ${Object.keys(citesCache).length}`)
  
  // Get all Mexican Food items with taxon
  const mexicanFood = await db.mexicanFood.findMany({
    where: {
      taxon: { not: null }
    },
    select: {
      id: true,
      nombreEspanol: true,
      nombreIngles: true,
      taxon: true,
      tipoAlimento: true,
      conservationStatus: true
    }
  })
  
  console.log(`Mexican Food items with taxon: ${mexicanFood.length}\n`)
  
  // Get unique taxa
  const uniqueTaxa = new Map<string, typeof mexicanFood[0]>()
  for (const item of mexicanFood) {
    const taxon = item.taxon?.trim().toLowerCase()
    if (taxon && !uniqueTaxa.has(taxon)) {
      uniqueTaxa.set(taxon, item)
    }
  }
  
  console.log(`Unique taxa: ${uniqueTaxa.size}\n`)
  
  // Cross-reference
  const matches: CITESMatch[] = []
  const appendixI: CITESMatch[] = []
  const appendixII: CITESMatch[] = []
  const appendixIII: CITESMatch[] = []
  
  for (const [normalizedTaxon, item] of uniqueTaxa) {
    const citesEntry = citesCache[normalizedTaxon]
    
    if (citesEntry && ['I', 'II', 'III'].includes(citesEntry.citesStatus)) {
      const match: CITESMatch = {
        id: item.id,
        nombreEspanol: item.nombreEspanol,
        nombreIngles: item.nombreIngles,
        taxon: item.taxon || '',
        tipoAlimento: item.tipoAlimento,
        citesStatus: citesEntry.citesStatus,
        kingdom: citesEntry.kingdom,
        family: citesEntry.family
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
  console.log('=== CITES MATCHES IN MEXICAN FOOD ===\n')
  console.log(`Total matches: ${matches.length} out of ${uniqueTaxa.size} unique taxa (${((matches.length / uniqueTaxa.size) * 100).toFixed(2)}%)`)
  console.log(`  Appendix I (highest protection): ${appendixI.length}`)
  console.log(`  Appendix II (trade regulated): ${appendixII.length}`)
  console.log(`  Appendix III (country-specific): ${appendixIII.length}\n`)
  
  // Print Appendix I species (most critical)
  if (appendixI.length > 0) {
    console.log('=== APPENDIX I - HIGHEST PROTECTION (Trade Banned) ===\n')
    for (const item of appendixI) {
      console.log(`  ${item.taxon}`)
      console.log(`    Spanish: ${item.nombreEspanol}`)
      console.log(`    English: ${item.nombreIngles || 'N/A'}`)
      console.log(`    Category: ${item.tipoAlimento || 'N/A'}`)
      console.log(`    Kingdom: ${item.kingdom}`)
      console.log('')
    }
  }
  
  // Print Appendix II species
  if (appendixII.length > 0) {
    console.log(`\n=== APPENDIX II - TRADE REGULATED (${appendixII.length} species) ===\n`)
    for (const item of appendixII) {
      console.log(`  ${item.taxon}`)
      console.log(`    Spanish: ${item.nombreEspanol}`)
      console.log(`    English: ${item.nombreIngles || 'N/A'}`)
      console.log(`    Category: ${item.tipoAlimento || 'N/A'}`)
      console.log(`    Family: ${item.family}`)
      console.log('')
    }
  }
  
  // Print Appendix III species
  if (appendixIII.length > 0) {
    console.log(`\n=== APPENDIX III - COUNTRY-SPECIFIC PROTECTION (${appendixIII.length} species) ===\n`)
    for (const item of appendixIII) {
      console.log(`  ${item.taxon}`)
      console.log(`    Spanish: ${item.nombreEspanol}`)
      console.log(`    English: ${item.nombreIngles || 'N/A'}`)
      console.log(`    Category: ${item.tipoAlimento || 'N/A'}`)
      console.log('')
    }
  }
  
  // Group by food type
  console.log('\n=== MATCHES BY FOOD TYPE ===\n')
  const typeCount: Record<string, { total: number; I: number; II: number; III: number }> = {}
  for (const match of matches) {
    const type = match.tipoAlimento || 'Unknown'
    if (!typeCount[type]) {
      typeCount[type] = { total: 0, I: 0, II: 0, III: 0 }
    }
    typeCount[type].total++
    if (match.citesStatus === 'I') typeCount[type].I++
    if (match.citesStatus === 'II') typeCount[type].II++
    if (match.citesStatus === 'III') typeCount[type].III++
  }
  
  const sortedTypes = Object.entries(typeCount)
    .sort((a, b) => b[1].total - a[1].total)
  
  for (const [type, counts] of sortedTypes) {
    console.log(`${type}: ${counts.total} species`)
    if (counts.I > 0) console.log(`  - Appendix I: ${counts.I}`)
    if (counts.II > 0) console.log(`  - Appendix II: ${counts.II}`)
    if (counts.III > 0) console.log(`  - Appendix III: ${counts.III}`)
  }
  
  // Check how many already have conservation status
  const withStatus = mexicanFood.filter(item => item.conservationStatus).length
  console.log(`\n\nMexican Food items with conservation status already saved: ${withStatus}`)
  
  // Save full report
  const reportPath = join(process.cwd(), 'src', 'data', 'cites-mexican-matches.json')
  writeFileSync(reportPath, JSON.stringify({
    summary: {
      totalMexicanTaxa: uniqueTaxa.size,
      totalCitesMatches: matches.length,
      appendixI: appendixI.length,
      appendixII: appendixII.length,
      appendixIII: appendixIII.length,
      alreadyWithStatus: withStatus
    },
    appendixI,
    appendixII,
    appendixIII,
    allMatches: matches
  }, null, 2))
  
  console.log(`Full report saved to: ${reportPath}`)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
