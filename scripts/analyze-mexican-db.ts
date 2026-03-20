/**
 * Analyze Mexican DB - Extract and classify all words from nombreEspanol
 */

import { db } from '../src/lib/db'

interface WordClassification {
  word: string
  count: number
  category: 'core' | 'species' | 'part' | 'color' | 'processing' | 'form' | 'descriptor' | 'connector' | 'unknown'
  examples: string[]
}

async function main() {
  console.log('Fetching all foods from Mexican DB...')
  
  const foods = await db.mexicanFood.findMany({
    select: {
      nombreEspanol: true,
      tipoAlimento: true,
      categoria: true,
    }
  })
  
  console.log(`Found ${foods.length} foods`)
  
  // Extract all unique words
  const wordMap = new Map<string, { count: number; examples: Set<string> }>()
  
  for (const food of foods) {
    const name = food.nombreEspanol.toLowerCase()
    const words = name.split(/[\s,()\-\/]+/).filter(w => w.length >= 2)
    
    for (const word of words) {
      if (!wordMap.has(word)) {
        wordMap.set(word, { count: 0, examples: new Set() })
      }
      const entry = wordMap.get(word)!
      entry.count++
      if (entry.examples.size < 5) {
        entry.examples.add(food.nombreEspanol)
      }
    }
  }
  
  // Known classifications
  const CORE_FOODS = new Set([
    'huevo', 'pollo', 'res', 'cerdo', 'pescado', 'leche', 'queso', 'crema',
    'mantequilla', 'arroz', 'frijol', 'maiz', 'trigo', 'avena', 'cebolla',
    'ajo', 'tomate', 'jitomate', 'papa', 'zanahoria', 'lechuga', 'espinaca',
    'manzana', 'naranja', 'limon', 'platano', 'uva', 'fresa', 'mango',
    'aguacate', 'pepino', 'calabaza', 'chile', 'pimiento', 'apio', 'col',
    'brocoli', 'coliflor', 'ejote', 'champiñon', 'hongo', 'nuez', 'almendra',
    'aceite', 'azucar', 'miel', 'sal', 'pimienta', 'canela', 'comino',
    'oregano', 'cilantro', 'perejil', 'albahaca', 'tomillo', 'romero',
    'vainilla', 'chocolate', 'cafe', 'te', 'vino', 'cerveza', 'agua',
    'pan', 'tortilla', 'galleta', 'pastel', 'gelatina', 'yogurt'
  ])
  
  const SPECIES = new Set([
    'gallina', 'gallinola', 'vaca', 'puerco', 'pato', 'codorniz', 'iguana',
    'conejo', 'borrego', 'cabra', 'venado', 'jabali', 'atun',
    'salmon', 'sardina', 'mojarra', 'camaron', 'langosta', 'cangrejo',
    'pulpo', 'calamar', 'carpa', 'tilapia', 'huachinango', 'sierra'
  ])
  
  const PARTS = new Set([
    'clara', 'yema', 'pechuga', 'muslo', 'pierna', 'ala', 'higado',
    'corazon', 'riñon', 'lengua', 'sesos', 'machaca', 'filete', 'bistec',
    'carne', 'costilla', 'chuleta', 'lomo', 'falda', 'bola', 'espaldilla',
    'cabecero', 'maciza', 'suadero', 'cabeza', 'patitas', 'cuero', 'tocino'
  ])
  
  const COLORS = new Set([
    'rojo', 'roja', 'blanco', 'blanca', 'verde', 'amarillo', 'amarilla',
    'negro', 'negra', 'naranja', 'morado', 'morada', 'rosa', 'azul',
    'oscuro', 'oscura', 'claro', 'clara', 'pardo', 'parda'
  ])
  
  const PROCESSING = new Set([
    'crudo', 'cruda', 'cocido', 'cocida', 'hervido', 'hervida', 'frito', 'frita',
    'asado', 'asada', 'horneado', 'horneada', 'tostado', 'tostada', 'seco', 'seca',
    'fresco', 'fresca', 'congelado', 'congelada', 'enlatado', 'enlatada',
    'deshidratado', 'deshidratada', 'ahumado', 'ahumada', 'salado', 'salada',
    'dulce', 'fermentado', 'fermentada', 'pasteurizado', 'pasteurizada'
  ])
  
  const FORMS = new Set([
    'polvo', 'harina', 'trozo', 'trozos', 'rodaja', 'rodajas', 'filetes',
    'entero', 'entera', 'troceado', 'troceada', 'picado', 'picada', 'molido', 'molida',
    'rallado', 'rallada', 'rebanado', 'rebanada', 'jugo', 'extracto',
    'esencia', 'concentrado', 'concentrada', 'jarabe', 'salsa', 'puré', 'pasta'
  ])
  
  const CONNECTORS = new Set([
    'de', 'del', 'la', 'el', 'las', 'los', 'y', 'con', 'sin', 'en', 'para',
    'por', 'a', 'al', 'un', 'una', 'unos', 'unas', 'que', 'se', 'su', 'sus'
  ])
  
  // Classify words
  const classified = new Map<string, WordClassification>()
  
  for (const [word, data] of wordMap) {
    let category: WordClassification['category'] = 'unknown'
    
    if (CORE_FOODS.has(word)) category = 'core'
    else if (SPECIES.has(word)) category = 'species'
    else if (PARTS.has(word)) category = 'part'
    else if (COLORS.has(word)) category = 'color'
    else if (PROCESSING.has(word)) category = 'processing'
    else if (FORMS.has(word)) category = 'form'
    else if (CONNECTORS.has(word)) category = 'connector'
    else if (data.count >= 5) category = 'descriptor' // Frequent unknown words
    
    classified.set(word, {
      word,
      count: data.count,
      category,
      examples: [...data.examples]
    })
  }
  
  // Print summary
  console.log('\n=== WORD CLASSIFICATION SUMMARY ===\n')
  
  const categories = ['core', 'species', 'part', 'color', 'processing', 'form', 'descriptor', 'connector', 'unknown'] as const
  
  for (const cat of categories) {
    const words = [...classified.values()].filter(w => w.category === cat).sort((a, b) => b.count - a.count)
    console.log(`\n--- ${cat.toUpperCase()} (${words.length} words) ---`)
    
    for (const w of words.slice(0, 20)) {
      console.log(`  ${w.word.padEnd(15)} (${w.count.toString().padStart(4)}) → ${w.examples[0]?.substring(0, 50)}`)
    }
    
    if (words.length > 20) {
      console.log(`  ... and ${words.length - 20} more`)
    }
  }
  
  // Print unclassified words that appear frequently
  console.log('\n\n=== UNCLASSIFIED FREQUENT WORDS (need human review) ===\n')
  const unknown = [...classified.values()]
    .filter(w => w.category === 'unknown' || w.category === 'descriptor')
    .sort((a, b) => b.count - a.count)
    .slice(0, 50)
  
  for (const w of unknown) {
    console.log(`  "${w.word}" (${w.count}) → ${w.examples.slice(0, 2).join(' | ')}`)
  }
  
  // Total stats
  console.log('\n\n=== TOTALS ===')
  console.log(`Total unique words: ${wordMap.size}`)
  console.log(`Total foods analyzed: ${foods.length}`)
  
  // Category breakdown
  const byCategory = new Map<string, number>()
  for (const w of classified.values()) {
    byCategory.set(w.category, (byCategory.get(w.category) || 0) + 1)
  }
  console.log('\nBy category:')
  for (const [cat, count] of [...byCategory.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`)
  }
  
  await db.$disconnect()
}

main().catch(console.error)
