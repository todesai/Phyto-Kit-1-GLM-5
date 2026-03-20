import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { readFile } from 'fs/promises'
import { join } from 'path'

interface GlobalEdibleItemJson {
  Category: string
  Subcategory: string | null
  "Scientific Name": string | null
  "Scientific Author": string | null
  Synonyms: string | null
  "Regional Names": string | null
  "Primary Regional Name": string | null
  "Primary Region": string | null
  "English Name": string | null
  "Local Name": string | null
  "Botanical Family": string | null
  "Culinary Function": string | null
  "Processing Form": string | null
  "Climate Zone": string | null
  "HS Code": string | null
  "HS Code Extended": string | null
  "Codex Alimentarius Code": string | null
  "FAO Commodity Code": string | null
  "UNSPSC Code": string | null
  "ITIS TSN": string | null
  "USDA Plants ID": string | null
  "GBIF ID": string | null
  "Catalog of Life ID": string | null
  "Primary Use Regions": string | null
  "Cultural Significance": string | null
  "Culinary Uses": string | null
  "Nutritional Highlights": string | null
  "Origin Region": string | null
  "Major Producers": string | null
  "Cultivation Status": string | null
  "Edible Part": string | null
  "Storage Conditions": string | null
  "Shelf Life": string | null
  Sources: string | null
  Verified: string | null
  Notes: string | null
}

// GET - Get stats and list items
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    if (action === 'categories') {
      const categories = await db.globalEdibleItem.groupBy({
        by: ['category'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      })
      
      return NextResponse.json({
        categories: categories.map(c => ({
          name: c.category,
          count: c._count.id
        }))
      })
    }
    
    if (action === 'search') {
      const query = searchParams.get('q') || ''
      const limit = parseInt(searchParams.get('limit') || '20')
      
      const items = await db.globalEdibleItem.findMany({
        where: {
          OR: [
            { englishName: { contains: query, mode: 'insensitive' } },
            { localName: { contains: query, mode: 'insensitive' } },
            { scientificName: { contains: query, mode: 'insensitive' } },
          ]
        },
        take: limit
      })
      
      return NextResponse.json({ items })
    }
    
    // Default: return stats
    const total = await db.globalEdibleItem.count()
    const categories = await db.globalEdibleItem.groupBy({
      by: ['category'],
      _count: { id: true }
    })
    
    return NextResponse.json({
      total,
      categories: categories.map(c => ({
        name: c.category,
        count: c._count.id
      }))
    })
    
  } catch (error) {
    console.error('Global Edible Items API error:', error)
    return NextResponse.json({
      error: 'Failed to fetch data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Import from JSON file
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filePath, clearExisting = false } = body
    
    // Default file path
    const jsonPath = filePath || join(
      process.cwd(), 
      'user-uploads/general/2026-02-17T05-49-48-604Z_Global_edible_items_export_20260216.json'
    )
    
    // Read the JSON file
    let jsonData: GlobalEdibleItemJson[]
    try {
      const fileContent = await readFile(jsonPath, 'utf-8')
      jsonData = JSON.parse(fileContent)
    } catch (readError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to read JSON file',
        path: jsonPath,
        details: readError instanceof Error ? readError.message : 'Unknown error'
      }, { status: 400 })
    }
    
    if (!Array.isArray(jsonData)) {
      return NextResponse.json({
        success: false,
        error: 'JSON file must contain an array of items'
      }, { status: 400 })
    }
    
    // Clear existing data if requested
    if (clearExisting) {
      await db.globalEdibleItem.deleteMany()
    }
    
    // Import items
    let imported = 0
    let skipped = 0
    const errors: string[] = []
    
    for (const item of jsonData) {
      try {
        // Check if item already exists (by scientific name + english name)
        const existing = await db.globalEdibleItem.findFirst({
          where: {
            AND: [
              { scientificName: item["Scientific Name"] || null },
              { englishName: item["English Name"] || null }
            ]
          }
        })
        
        if (existing && !clearExisting) {
          skipped++
          continue
        }
        
        await db.globalEdibleItem.create({
          data: {
            category: item.Category || 'Unknown',
            subcategory: item.Subcategory || null,
            scientificName: item["Scientific Name"] || null,
            scientificAuthor: item["Scientific Author"] || null,
            botanicalFamily: item["Botanical Family"] || null,
            synonyms: item.Synonyms || null,
            englishName: item["English Name"] || null,
            localName: item["Local Name"] || null,
            regionalNames: item["Regional Names"] || null,
            primaryRegionalName: item["Primary Regional Name"] || null,
            primaryRegion: item["Primary Region"] || null,
            hsCode: item["HS Code"] || null,
            hsCodeExtended: item["HS Code Extended"] || null,
            codexAlimentariusCode: item["Codex Alimentarius Code"] || null,
            faoCommodityCode: item["FAO Commodity Code"] || null,
            unspscCode: item["UNSPSC Code"] || null,
            itisTsn: item["ITIS TSN"] || null,
            usdaPlantsId: item["USDA Plants ID"] || null,
            gbifId: item["GBIF ID"] || null,
            catalogOfLifeId: item["Catalog of Life ID"] || null,
            culinaryFunction: item["Culinary Function"] || null,
            processingForm: item["Processing Form"] || null,
            culinaryUses: item["Culinary Uses"] || null,
            ediblePart: item["Edible Part"] || null,
            originRegion: item["Origin Region"] || null,
            climateZone: item["Climate Zone"] || null,
            cultivationStatus: item["Cultivation Status"] || null,
            majorProducers: item["Major Producers"] || null,
            primaryUseRegions: item["Primary Use Regions"] || null,
            storageConditions: item["Storage Conditions"] || null,
            shelfLife: item["Shelf Life"] || null,
            culturalSignificance: item["Cultural Significance"] || null,
            nutritionalHighlights: item["Nutritional Highlights"] || null,
            verified: item.Verified || null,
            notes: item.Notes || null,
            sources: item.Sources || null,
          }
        })
        imported++
        
      } catch (itemError) {
        errors.push(`Item "${item["English Name"] || item["Local Name"] || "unknown"}": ${itemError instanceof Error ? itemError.message : 'Unknown error'}`)
      }
    }
    
    // Get final stats
    const total = await db.globalEdibleItem.count()
    const categories = await db.globalEdibleItem.groupBy({
      by: ['category'],
      _count: { id: true }
    })
    
    return NextResponse.json({
      success: true,
      stats: {
        itemsInFile: jsonData.length,
        imported,
        skipped,
        errors: errors.length,
        errorDetails: errors.slice(0, 10), // First 10 errors
        total,
        byCategory: categories.reduce((acc, c) => {
          acc[c.category] = c._count.id
          return acc
        }, {} as Record<string, number>)
      }
    })
    
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to import data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE - Clear all items
export async function DELETE() {
  try {
    const result = await db.globalEdibleItem.deleteMany()
    
    return NextResponse.json({
      success: true,
      deleted: result.count
    })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
