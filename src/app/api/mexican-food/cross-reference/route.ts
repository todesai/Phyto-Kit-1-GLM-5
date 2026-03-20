import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Normalize text for matching
function normalize(text: string): string {
  if (!text) return ''
  return text.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Extract base name (remove descriptors)
function getBaseName(name: string): string {
  if (!name) return ''
  const descriptors = [
    'fresco', 'seca', 'seco', 'molida', 'molido', 'crudo', 'cocida', 'cocido',
    'asada', 'asado', 'frita', 'frito', 'hervida', 'hervido', 'horneada', 'horneado',
    'salada', 'salado', 'dulce', 'natural', 'organico', 'organica',
    'concentrado', 'concentrada', 'jugo', 'pulpa', 'pure', 'harina', 'aceite',
    'hoja', 'hojas', 'raiz', 'fruto', 'verde', 'roja', 'rojo',
    'amarilla', 'amarillo', 'blanca', 'blanco', 'negra', 'negro',
    'deshidratada', 'deshidratado', 'en polvo', 'polvo',
    'fresca', 'entera', 'entero', 'trozos', 'semilla', 'semillas'
  ]
  
  let normalized = normalize(name)
  descriptors.forEach(d => {
    normalized = normalized.replace(new RegExp(`\\b${d}\\b`, 'g'), '')
  })
  return normalized.replace(/\s+/g, ' ').trim()
}

// Build lookup dictionary from Global Edible Items
async function buildLookupDictionary(): Promise<Map<string, { scientificName: string; source: string }>> {
  const globalItems = await db.globalEdibleItem.findMany({
    select: {
      englishName: true,
      localName: true,
      scientificName: true,
      regionalNames: true,
      synonyms: true
    }
  })
  
  const lookup = new Map<string, { scientificName: string; source: string }>()
  
  globalItems.forEach(item => {
    if (!item.scientificName) return
    
    const names: string[] = []
    if (item.englishName) names.push(item.englishName)
    if (item.localName) names.push(item.localName)
    
    if (item.regionalNames) {
      item.regionalNames.split(';').forEach(part => {
        const name = part.split('(')[0].trim()
        if (name) names.push(name)
      })
    }
    
    if (item.synonyms) {
      item.synonyms.split(',').forEach(n => names.push(n.trim()))
    }
    
    names.forEach(name => {
      const normalizedName = normalize(name)
      const baseName = getBaseName(name)
      
      if (normalizedName && !lookup.has(normalizedName)) {
        lookup.set(normalizedName, { scientificName: item.scientificName!, source: name })
      }
      if (baseName && baseName !== normalizedName && !lookup.has(baseName)) {
        lookup.set(baseName, { scientificName: item.scientificName!, source: `${name} (base)` })
      }
    })
  })
  
  return lookup
}

// GET - Preview matches
export async function GET() {
  try {
    const lookup = await buildLookupDictionary()
    const mexicanFoods = await db.mexicanFood.findMany({
      where: { taxon: null },
      select: { id: true, nombreEspanol: true, tipoAlimento: true }
    })
    
    let exactMatches = 0
    let partialMatches = 0
    let noMatch = 0
    
    mexicanFoods.forEach(food => {
      const normalizedName = normalize(food.nombreEspanol)
      const baseName = getBaseName(food.nombreEspanol)
      
      if (lookup.has(normalizedName)) exactMatches++
      else if (lookup.has(baseName)) partialMatches++
      else noMatch++
    })
    
    return NextResponse.json({
      stats: {
        total: mexicanFoods.length,
        exactMatches,
        partialMatches,
        noMatch,
        lookupSize: lookup.size
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed', details: String(error) }, { status: 500 })
  }
}

// POST - Apply matches
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { matchTypes = ['exact', 'partial'] } = body
    
    const lookup = await buildLookupDictionary()
    const mexicanFoods = await db.mexicanFood.findMany({
      where: { taxon: null },
      select: { id: true, nombreEspanol: true }
    })
    
    let updatedExact = 0
    let updatedPartial = 0
    
    for (const food of mexicanFoods) {
      const normalizedName = normalize(food.nombreEspanol)
      const baseName = getBaseName(food.nombreEspanol)
      
      if (matchTypes.includes('exact') && lookup.has(normalizedName)) {
        const match = lookup.get(normalizedName)!
        await db.mexicanFood.update({
          where: { id: food.id },
          data: { 
            taxon: match.scientificName,
            nombreAutoridad: `Auto-matched: ${match.source}`
          }
        })
        updatedExact++
      } else if (matchTypes.includes('partial') && lookup.has(baseName)) {
        const match = lookup.get(baseName)!
        await db.mexicanFood.update({
          where: { id: food.id },
          data: { 
            taxon: match.scientificName,
            nombreAutoridad: `Auto-matched (partial): ${match.source}`
          }
        })
        updatedPartial++
      }
    }
    
    const withTaxon = await db.mexicanFood.count({ where: { taxon: { not: null } } })
    const withoutTaxon = await db.mexicanFood.count({ where: { taxon: null } })
    
    return NextResponse.json({
      success: true,
      stats: {
        processed: mexicanFoods.length,
        updatedExact,
        updatedPartial,
        totalUpdated: updatedExact + updatedPartial
      },
      finalDatabase: { withTaxon, withoutTaxon, total: withTaxon + withoutTaxon }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed', details: String(error) }, { status: 500 })
  }
}
