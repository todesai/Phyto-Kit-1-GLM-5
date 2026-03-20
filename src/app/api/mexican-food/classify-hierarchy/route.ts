import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Comprehensive descriptors list organized by category
const DESCRIPTOR_CATEGORIES = {
  processing: [
    'seco', 'seca', 'secos', 'secas',
    'molido', 'molida', 'molidos', 'molidas',
    'en polvo', 'polvo',
    'deshidratado', 'deshidratada', 'deshidratados', 'deshidratadas',
    'fresco', 'fresca', 'frescos', 'frescas',
    'crudo', 'cruda', 'crudos', 'crudas',
    'cocido', 'cocida', 'cocidos', 'cocidas',
    'asado', 'asada', 'asados', 'asadas',
    'frito', 'frita', 'fritos', 'fritas',
    'hervido', 'hervida', 'hervidos', 'hervidas',
    'horneado', 'horneada', 'horneados', 'horneadas',
    'ahumado', 'ahumada', 'ahumados', 'ahumadas',
    'salado', 'salada', 'salados', 'saladas',
    'salmuera', 'en salmuera',
    'vinagre', 'en vinagre', 'encurtido', 'encurtida',
    'en lata', 'enlatado', 'enlatada',
    'congelado', 'congelada', 'congelados', 'congeladas',
    'pasteurizado', 'pasteurizada',
    'ultrapasteurizado', 'ultrapasteurizada',
    'refrigerado', 'refrigerada',
  ],
  form: [
    'entero', 'entera', 'enteros', 'enteras',
    'troceado', 'troceada', 'troceados', 'troceadas', 'trozos', 'en trozos',
    'rallado', 'rallada', 'rallados', 'ralladas',
    'rebanado', 'rebanada', 'rebanados', 'rebanadas', 'lonchas',
    'cortado', 'cortada', 'cortados', 'cortadas',
    'picado', 'picada', 'picados', 'picadas',
    'fileteado', 'fileteada',
    'en grano', 'granos', 'grano',
  ],
  derivative: [
    'jugo', 'jugos', 'zumo', 'zumos',
    'concentrado', 'concentrada', 'concentrados', 'concentradas',
    'extracto',
    'esencia',
    'aceite',
    'harina', 'harinas',
    'almidón', 'almidon',
    'pulpa',
    'puré', 'pure',
    'jarabe',
    'almíbar', 'almibar', 'en almíbar',
    'miel',
    'cáscara', 'cascara',
    'semilla', 'semillas',
    'hoja', 'hojas',
    'raíz', 'raiz',
    'flor', 'flores',
    'tallo',
    'germen',
    'salvado',
  ],
  color: [
    'verde', 'verdes',
    'rojo', 'roja', 'rojos', 'rojas',
    'amarillo', 'amarilla', 'amarillos', 'amarillas',
    'negro', 'negra', 'negros', 'negras',
    'blanco', 'blanca', 'blancos', 'blancas',
    'azul', 'azules',
    'morado', 'morada', 'morados', 'moradas',
    'dorado', 'dorada',
  ],
  quality: [
    'orgánico', 'organico', 'organica', 'orgánica',
    'natural',
    'artesanal',
    'casero', 'casera',
    'premium', 'gourmet', 'selecto', 'selecta',
  ],
  dietary: [
    'light', 'diet', 'bajo en grasa',
    'desgrasado', 'desgrasada',
    'descremado', 'descremada',
    'sin azúcar', 'sin azucar', 'sin grasa', 'sin sal',
    'reducido', 'reducida',
  ],
  taste: [
    'dulce', 'dulces',
    'salado', 'salada', 'salados', 'saladas',
    'amargo', 'amarga',
    'agrio', 'agria',
    'picante', 'picosos', 'picosa',
    'amargo', 'amarga',
  ],
  use: [
    'para mesa', 'para cocinar', 'de cocina', 'de mesa',
    'cobertura', 'relleno', 'decoración', 'decoracion',
    'instantáneo', 'instantaneo', 'instantánea', 'instantanea',
    'baby', 'infantil', 'bebé', 'bebe',
  ],
  state: [
    'maduro', 'madura', 'maduros', 'maduras',
    'tierno', 'tierna', 'tiernos', 'tiernas',
  ]
}

// Flatten descriptors with category info
const ALL_DESCRIPTORS: { term: string; category: string }[] = []
Object.entries(DESCRIPTOR_CATEGORIES).forEach(([category, terms]) => {
  terms.forEach(term => {
    ALL_DESCRIPTORS.push({ term: term.toLowerCase(), category })
  })
})
// Sort by length (longest first) for matching priority
ALL_DESCRIPTORS.sort((a, b) => b.term.length - a.term.length)

// Normalize text
function normalize(text: string): string {
  return text.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Analyze ingredient name
function analyzeIngredient(name: string): {
  baseName: string
  descriptor: string | null
  descriptorCategory: string | null
  isParent: boolean
} {
  if (!name) return { baseName: '', descriptor: null, descriptorCategory: null, isParent: true }
  
  const lowerName = normalize(name)
  
  for (const { term, category } of ALL_DESCRIPTORS) {
    // Check for "de [descriptor]" patterns first (more specific)
    const dePattern = new RegExp(`\\bde\\s+${term}\\b`, 'i')
    if (dePattern.test(name)) {
      const baseName = name.replace(dePattern, '').replace(/\s+/g, ' ').replace(/^[,\s]+|[,\\s]+$/g, '').trim()
      if (baseName && baseName !== name) {
        return {
          baseName,
          descriptor: `de ${term}`,
          descriptorCategory: category,
          isParent: false
        }
      }
    }
    
    // Check for "[descriptor] de" patterns
    const descriptorDePattern = new RegExp(`\\b${term}\\s+de\\b`, 'i')
    if (descriptorDePattern.test(name)) {
      // This is like "harina de trigo" - the descriptor comes before
      const baseMatch = name.match(new RegExp(`\\b${term}\\s+de\\s+(.+)$`, 'i'))
      if (baseMatch && baseMatch[1]) {
        return {
          baseName: baseMatch[1].trim(),
          descriptor: term,
          descriptorCategory: category,
          isParent: false
        }
      }
    }
    
    // Check for standalone descriptor
    const standalonePattern = new RegExp(`\\b${term}\\b`, 'i')
    if (standalonePattern.test(name)) {
      const baseName = name.replace(standalonePattern, '').replace(/\s+/g, ' ').replace(/^[,\s]+|[,\\s]+$/g, '').trim()
      if (baseName && baseName !== name && baseName.length > 1) {
        return {
          baseName,
          descriptor: term,
          descriptorCategory: category,
          isParent: false
        }
      }
    }
  }
  
  // No descriptor found - this is a parent ingredient
  return { baseName: name, descriptor: null, descriptorCategory: null, isParent: true }
}

// GET - Preview classification without updating
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const category = searchParams.get('category') || null
    
    const foods = await db.mexicanFood.findMany({
      select: {
        id: true,
        nombreEspanol: true,
        taxon: true,
        tipoAlimento: true,
        parentIngredientId: true,
        descriptor: true,
        isParent: true
      },
      ...(category ? { where: { tipoAlimento: category } } : {})
    })
    
    const analysis = {
      parents: new Map<string, any>(),
      children: [] as any[],
      unclassified: [] as any[]
    }
    
    for (const food of foods) {
      const result = analyzeIngredient(food.nombreEspanol)
      
      if (result.isParent) {
        const key = normalize(result.baseName)
        if (!analysis.parents.has(key)) {
          analysis.parents.set(key, {
            baseName: result.baseName,
            foods: [],
            taxon: food.taxon,
            category: food.tipoAlimento
          })
        }
        analysis.parents.get(key).foods.push(food)
      } else {
        analysis.children.push({
          ...food,
          extractedBaseName: result.baseName,
          extractedDescriptor: result.descriptor,
          descriptorCategory: result.descriptorCategory
        })
      }
    }
    
    // Build family groups
    const families: any[] = []
    analysis.parents.forEach((parentData, key) => {
      const children = analysis.children.filter(c => 
        normalize(c.extractedBaseName) === key || 
        normalize(c.nombreEspanol).includes(key)
      )
      if (children.length > 0 || parentData.foods.length > 1) {
        families.push({
          parentName: parentData.baseName,
          taxon: parentData.taxon,
          directRecords: parentData.foods.length,
          derivedForms: children.length,
          totalFamily: parentData.foods.length + children.length,
          descriptors: [...new Set(children.map(c => c.extractedDescriptor).filter(Boolean))]
        })
      }
    })
    
    families.sort((a, b) => b.totalFamily - a.totalFamily)
    
    // Descriptor statistics
    const descriptorStats: Record<string, number> = {}
    analysis.children.forEach(c => {
      if (c.extractedDescriptor) {
        const desc = c.extractedDescriptor.toLowerCase()
        descriptorStats[desc] = (descriptorStats[desc] || 0) + 1
      }
    })
    
    return NextResponse.json({
      stats: {
        total: foods.length,
        parents: analysis.parents.size,
        children: analysis.children.length,
        families: families.length
      },
      topFamilies: families.slice(0, limit),
      descriptorStats: Object.entries(descriptorStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([descriptor, count]) => ({ descriptor, count })),
      sampleChildren: analysis.children.slice(0, limit)
    })
    
  } catch (error) {
    console.error('Classification error:', error)
    return NextResponse.json({
      error: 'Failed to analyze classification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Apply classification to database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { dryRun = false, category = null } = body
    
    const foods = await db.mexicanFood.findMany({
      select: {
        id: true,
        nombreEspanol: true,
        taxon: true,
        tipoAlimento: true
      },
      ...(category ? { where: { tipoAlimento: category } } : {})
    })
    
    // Step 1: Analyze all foods
    const analyzedFoods = foods.map(food => ({
      ...food,
      analysis: analyzeIngredient(food.nombreEspanol)
    }))
    
    // Step 2: Build parent lookup (by normalized base name)
    const parentLookup = new Map<string, { id: string; name: string; taxon: string | null }>()
    
    // First, find existing parent records
    analyzedFoods.forEach(food => {
      if (food.analysis.isParent) {
        const key = normalize(food.analysis.baseName)
        if (!parentLookup.has(key)) {
          parentLookup.set(key, {
            id: food.id,
            name: food.analysis.baseName,
            taxon: food.taxon
          })
        }
      }
    })
    
    // Step 3: Prepare updates
    const updates: {
      id: string
      nombreBase: string
      descriptor: string | null
      parentIngredientId: string | null
      isParent: boolean
    }[] = []
    
    const newParents: { baseName: string; taxon: string | null }[] = []
    
    for (const food of analyzedFoods) {
      const { baseName, descriptor, isParent } = food.analysis
      
      if (isParent) {
        // This is a parent ingredient
        updates.push({
          id: food.id,
          nombreBase: baseName,
          descriptor: null,
          parentIngredientId: null,
          isParent: true
        })
      } else {
        // This is a child ingredient
        const parentKey = normalize(baseName)
        let parent = parentLookup.get(parentKey)
        
        if (!parent) {
          // Need to create a parent reference
          newParents.push({ baseName, taxon: food.taxon })
          // For now, we'll set parent to null but mark the base name
          updates.push({
            id: food.id,
            nombreBase: baseName,
            descriptor,
            parentIngredientId: null,
            isParent: false
          })
        } else {
          updates.push({
            id: food.id,
            nombreBase: baseName,
            descriptor,
            parentIngredientId: parent.id,
            isParent: false
          })
        }
      }
    }
    
    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        stats: {
          totalFoods: foods.length,
          parentsIdentified: updates.filter(u => u.isParent).length,
          childrenIdentified: updates.filter(u => !u.isParent).length,
          newParentsNeeded: newParents.length
        },
        sampleParents: updates.filter(u => u.isParent).slice(0, 20),
        sampleChildren: updates.filter(u => !u.isParent).slice(0, 20),
        newParentsNeeded: newParents.slice(0, 20)
      })
    }
    
    // Step 4: Apply updates
    let updated = 0
    let parentsMarked = 0
    let childrenLinked = 0
    const errors: string[] = []
    
    // Group updates by parent for child counting
    const childrenByParent = new Map<string, number>()
    updates.forEach(u => {
      if (u.parentIngredientId) {
        childrenByParent.set(u.parentIngredientId, (childrenByParent.get(u.parentIngredientId) || 0) + 1)
      }
    })
    
    for (const update of updates) {
      try {
        const childCount = childrenByParent.get(update.id) || 0
        
        await db.mexicanFood.update({
          where: { id: update.id },
          data: {
            nombreBase: update.nombreBase,
            descriptor: update.descriptor,
            parentIngredientId: update.parentIngredientId,
            isParent: update.isParent,
            childCount: childCount
          }
        })
        
        updated++
        if (update.isParent) parentsMarked++
        if (update.parentIngredientId) childrenLinked++
        
      } catch (err) {
        errors.push(`${update.id}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }
    
    // Final statistics
    const finalStats = await db.mexicanFood.groupBy({
      by: ['isParent'],
      _count: { id: true }
    })
    
    const withDescriptor = await db.mexicanFood.count({
      where: { descriptor: { not: null } }
    })
    
    const withParent = await db.mexicanFood.count({
      where: { parentIngredientId: { not: null } }
    })
    
    return NextResponse.json({
      success: true,
      stats: {
        processed: foods.length,
        updated,
        parentsMarked,
        childrenLinked,
        errors: errors.length
      },
      finalDatabase: {
        total: foods.length,
        parents: finalStats.find(s => s.isParent)?._count.id || 0,
        children: finalStats.find(s => !s.isParent)?._count.id || 0,
        withDescriptor,
        linkedToParent: withParent
      },
      sampleUpdates: updates.slice(0, 15).map(u => ({
        name: foods.find(f => f.id === u.id)?.nombreEspanol,
        baseName: u.nombreBase,
        descriptor: u.descriptor,
        isParent: u.isParent
      })),
      errorDetails: errors.slice(0, 10)
    })
    
  } catch (error) {
    console.error('Classification update error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update classification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
