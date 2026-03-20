import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Common Spanish words to ignore (connectors, articles, prepositions)
const STOP_WORDS = new Set([
  // Articles
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  // Prepositions
  'de', 'del', 'en', 'con', 'por', 'para', 'sin', 'sobre', 'entre', 'hacia',
  'hasta', 'desde', 'durante', 'mediante', 'según', 'contra', 'bajo',
  // Conjunctions
  'y', 'e', 'o', 'u', 'ni', 'que', 'pero', 'sino', 'aunque', 'mientras',
  'porque', 'cuando', 'si', 'como', 'donde', 'cual', 'quien',
  // Other common words
  'a', 'al', 'su', 'sus', 'su', 'mi', 'tu', 'nuestro', 'muy', 'más', 'menos',
  'no', 'sí', 'ya', ' aún', 'todavía', 'siempre', 'nunca', 'jamás', 'quizás',
  'tal vez', 'puede', 'ser', 'es', 'son', 'fue', 'era', 'han', 'hay', 'tiene',
  // Numbers
  'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
  // Measurements (handled separately but common)
  'g', 'kg', 'mg', 'ml', 'l', 'oz', 'lb', 'tsp', 'tbsp', 'cup',
])

// Word classification patterns
const CLASSIFICATION_PATTERNS: Record<string, {
  patterns: RegExp[]
  category: string
  priority: number
  examples: string[]
}> = {
  core: {
    patterns: [
      // Basic vegetables
      /^(ajo|cebolla|tomate|chile|pimiento|zanahoria|papa|patata|camote|nabo|betabel|remolacha|rábano|rabano|nopal|tuna|ejote|haba|alubia|lenteja|garbanzo|soya|soja|frijol|arroz|trigo|avena|cebada|centeno|maíz|maiz|elote|grano|cereales?|sorgo)$/i,
      // Leafy greens and herbs
      /^(lechuga|espinaca|acelga|col|repollo|coliflor|brocoli|brócoli|brocolí|calabaza|calabacita|chayote|verduras?|verdura|hortalizas?|legumbres?|quélite|quelite|epazote|cilantro|perejil|orégano|oregano|tomillo|romero|laurel|eneldo|hinojo|albahaca|menta|hierbabuena|diente|león|berro|alfalfa|espárrago|esparrago|alcachofa|apio|poro|puerro)$/i,
      // Fruits
      /^(limón|limon|naranja|mandarina|toronja|lima|manzana|pera|durazno|melocotón|melocoton|ciruela|ciruelo|mango|papaya|piña|pina|plátano|platano|aguacate|guayaba|maracuyá|maracuya|guanábana|guanabana|mamey|zapote|nanche|tejocote|capulín|capulin|chabacano|membrillo|higo|datil|uva|fresa|mora|zarzamora|frambuesa|arándano|arandano|ciruela|cerezas?|guinda|tamarindo|pitahaya|pitaya|cacao|cocoa|chocolate|café|cafe)$/i,
      // Proteins
      /^(pollo|res|cerdo|pescado|atún|atun|salmón|salmon|sardina|jurel|mojarra|huachinango|tilapia|trucha|camarón|camaron|langosta|jaiba|cangrejo|pulpo|calamar|ostión|ostion|mejillón|mejillon|almeja|caracol|surimi|huevo|clara|yema|queso|leche|crema|mantequilla|manteca|yogurt|yogur)$/i,
      // Nuts and seeds
      /^(nuez|nueces|almendra|almendras|cacahuate|cacahuates|ajonjolí|ajonjoli|semilla|semillas|pipa|pepita|castaña|castana|piñón|pinon|pistache|pistacho|nuez|moscada|coco)$/i,
      // Oils and fats
      /^(aceite|margarina|manteca|schmalz|dripping)$/i,
      // Spices and seasonings
      /^(sal|azúcar|azucar|pimienta|canela|clavo|comino|anis|anís|curry|mostaza|páprika|paprika|jengibre|cúrcuma|curcuma|cardamomo|azafrán|azafran|vainilla|vainillina|consomé|consome|caldo)$/i,
      // Sweeteners
      /^(miel|piloncillo|melaza|jarabe|almíbar|almibar)$/i,
      // Mexican specialties
      /^(amaranto|chía|chia|chícharo|chicharo|arveja|gandul|huauzontle|romeritos|quelite|quintonil|huauzontle|chilacayote|gourd)$/i,
      // Other core ingredients
      /^(hongos?|champiñones?|champiñon|champinon|setas?|hongo|levadura|flores?|flor|maguey|mezquite|guaje|guamúchil|guamuchil|huamuchil|parota|ramon|ébano|ebano|capomo|jojoba|linaza)$/i,
    ],
    category: 'core',
    priority: 1,
    examples: ['ajo', 'cebolla', 'tomate', 'chile', 'verduras', 'lechuga', 'camote']
  },
  species: {
    patterns: [
      // Farm animals
      /^(vaca|toro|buey|gallina|gallo|pollo|bovino|porcino|caprino|ovino|vacuno|cerdo|puerco|cerda|cerdo|lechón|lechon|cordero|cabrito|chivo|cabra|oveja|carnero|borrego|res)$/i,
      // Poultry
      /^(ave|aves|pavo|guajolote|pata|patos?|ganso|gansa|codorniz|paloma|faisán|faisan)$/i,
      // Game animals
      /^(conejo|liebre|venado|jabalí|jabali|iguana|armadillo|xoloitzcuintle)$/i,
      // Seafood species
      /^(pescado|marisco|mariscos|tiburón|tiburon|cazón|cazon|sierra|lenguado|cabrilla|huachinango|mojarra|carpa|trucha|tilapia|robalo|barrilete|atún|atun|sardina|jurel|salmon|salmón|bacalao)$/i,
      // Edible insects (Mexican)
      /^(chapulín|chapulin|chapulines|gusano|gusanos|jumil|chinche|escamol|escamoles|ahuatele|axayácatl|axayacatl|ahuautle|hormiga|avispa|abeja|mariposa|mosca|larva|larvas|ninfas?|pupa|pupas)$/i,
    ],
    category: 'species',
    priority: 2,
    examples: ['gallina', 'bovino', 'porcino', 'borrego', 'puerco', 'vaca', 'chapulín']
  },
  part: {
    patterns: [
      // Meat cuts
      /^(pierna|muslo|pechuga|lomo|costilla|filete|bistec|bisteck|carne|hueso|piel|hígado|corazón|riñón|lengua|cabeza|patas|alas|rabo|sesos|molleja|estómago|panza|buche|tripa|chuleta|bola|aguayón|espaldilla|diezmillo|sirloin|arrachera|falda|pecho|cadera|brazuelo)$/i,
      // Processed parts
      /^(chorizo|salchicha|tocino|jamón|jamon|longaniza|morcilla|cecina|machaca|carne)$/i,
      // Plant parts
      /^(hoja|hojas|tallo|raíz|raiz|semilla|semillas|cáscara|cascara|cáscaras|cascaras|pulpa|hollejo|pepita|corazón|corazon|nuez|grano|germen|salvado|endospermo)$/i,
      // Other parts
      /^(músculo|musculo|hueso|huesos|cuero|cuerito|cueritos|sesos|seso|colágeno|colageno|gelatina|grenetina)$/i,
    ],
    category: 'part',
    priority: 2,
    examples: ['pierna', 'pechuga', 'lomo', 'hoja', 'cáscara', 'pulpa']
  },
  prepared: {
    patterns: [
      // Mexican antojitos
      /^(tortilla|tortillas|taco|tacos|tamal|tamales|quesadilla|quesadillas|gordita|gorditas|sope|sopes|tostada|tostadas|chalupa|chalupas|huarache|huaraches|tlacoyo|tlacoyos|mollete|molletes|cemitas?|cemita|pambazos?|pambazo|torta|tortas|burrito|burritos|fajita|fajitas|enchilada|enchiladas|flauta|flautas|chalupa|chancla)$/i,
      // Traditional dishes
      /^(pozole|menudo|birria|barbacoa|carnitas|cochinita|mole|pipián|pipian|chilaquiles|tinga|pastor|pibil|suadero|arrachera|milanesa|milanesas|empanizada|empanizado|caldillo|guiso|guisado|guisos|antojito|antojitos|picadillo)$/i,
      // Soups and stews
      /^(sopa|caldo|consome|consomé|consomé|caldito|caldillo|pozole|menudo|birria)$/i,
      // Breads and pastries
      /^(pan|bolillo|bolillos|telera|teleras|concha|conchas|conchita|cuerno|oreja|polvorón|polvoron|galleta|galletas|pan|dulce|pastel|paste|pay|cake|cakes|cheesecake|brownie|muffin|panqué|panque)$/i,
      // Desserts and sweets
      /^(postre|flan|gelatina|budín|budin|pudding|helado|nieve|paleta|paletas|helados|nieves|dulce|caramelo|dulces|chocolate|mermelada|cajeta|dulce|de|leche)$/i,
      // Beverages
      /^(bebida|bebidas|agua|aguas|fresca|frescas|jugo|jugos|licuado|licuados|batido|batidos|smoothie|atole|champurrado|horchata|jamaica|te|té|café|cafe|refresco|soda|cerveza|vino|licor|tequila|mezcal|whisky|ron|brandy|coctel|cóctel)$/i,
      // Sauces and condiments
      /^(salsa|salsas|guacamole|mole|adobo|escabeche|chamoy|pico|gallo|rajas|chipotle|verde|roja|moles?|pipianes?|pipián)$/i,
      // International foods
      /^(pizza|hamburguesa|hamburguesas|hot|dog|sandwich|sándwich|paella|espagueti|espaguetti|espagueti|fideo|fideos|lasaña|lasana|ravioli|raviolis|risotto|sushi)$/i,
      // Snacks
      /^(botana|snack|chicharrón|chicharron|chicharrones|nachos|totopo|totopos|fritos|papitas|papas|fritas)$/i,
      // Other prepared
      /^(barra|pastilla|uva|pasas|endrinas|cubierta|fruta|cristalizada|platillo|platillos|relleno|rellena|cubierto|cubiertos?|garapiñado|garapiñada)$/i,
    ],
    category: 'prepared',
    priority: 2,
    examples: ['tortilla', 'sopa', 'taco', 'tamal', 'barbacoa', 'carnitas', 'guisos', 'antojitos']
  },
  color: {
    patterns: [
      /^(blanco|blanca|negro|negra|rojo|roja|verde|amarillo|amarilla|azul|morado|morada|naranja|rosa|gris|marrón|café|cafe|dorado|plateado|parda|pardo|colorada?|negros?|blancos?|verdes?|rojos?|amarillos?|azules?|morados?|morita|mulato|pinto)$/i,
    ],
    category: 'color',
    priority: 3,
    examples: ['blanco', 'negro', 'rojo', 'verde', 'colorado']
  },
  processing: {
    patterns: [
      // Grinding, cutting
      /^(molido|molida|picado|picada|rebanado|rebanada|trozado|trozada|cortado|cortada|rallado|rallada|machacado|machacada|aplastado|aplastada|triturado|triturada|desmenuzado|desmenuzada|deshebrado|deshebrada|deshuesado)$/i,
      // Cooking methods
      /^(hervido|hervida|cocido|cocida|asado|asada|frito|frita|horcado|horneada|freído|freida|horneado|horneada| sudado|sudada|steamed|stewed)$/i,
      // Preservation
      /^(deshidratado|deshidratada|seco|seca|fresco|fresca|crudo|cruda|congelado|congelada|enlatado|enlatada|ahumado|ahumada|salado|salada|curado|curada|fermentado|fermentada|encerado|encerada)$/i,
      // Industrial processing
      /^(pasteurizado|pasteurizada|ultrapasteurizado|ultrapasteurizada|esterilizado|refinado|refinada|enriquecido|enriquecida|fortificado|adicionado|procesado|procesada|instantáneo|instantánea|desgrasado|desgrasada|descremado|descremada|light|diet)$/i,
      // Other processing
      /^(maduro|madura|tierno|tierna|germinado|nixtamalizado|nixtamalizada|tostado|tostada|refrito|enchilado|empanizado|empanizada|rebozado|rebozada|salteado|salteada|guisado|guisada|cocinado|cocinada|preparado|preparada|licuado)$/i,
      // Packaging terms
      /^(embotellado|embotellada|envasado|envasada|empacado|empacada)$/i,
    ],
    category: 'processing',
    priority: 3,
    examples: ['molido', 'picado', 'asado', 'frito', 'integral', 'fermentada']
  },
  form: {
    patterns: [
      /^(polvo|harina|harinas|pasta|pastas|salsa|salsas|jugo|jugos|zumo|zumos|aceite|aceites|vinagre|líquido|liquido|sólido|solido|crema|cremas|gel|jarabe|cápsula|capsula|tableta|tabletas|extracto|esencia|concentrado|infusión|infusion|té|tisana|bebida|almíbar|almibar|puré|pure|suero|masa|cuerito|cascaron)$/i,
    ],
    category: 'form',
    priority: 3,
    examples: ['polvo', 'harina', 'pasta', 'salsa', 'té', 'infusión', 'puré', 'masa']
  },
  descriptor: {
    patterns: [
      // Size
      /^(grande|pequeño|pequeña|pequeños|pequeñas|mediano|mediana|medianos|medianas|grueso|gruesa|delgado|delgada|fino|fina|gigante|enano|chico|chica)$/i,
      // Quantity
      /^(entero|entera|mitad|cuarto|trozo|pieza|porción|ración|raciones|unidad|unidades|bulto|caja|bolsa|paquete|paquetes)$/i,
      // Quality/Origin
      /^(natural|orgánico|orgánica|artesanal|casero|casera|tradicional|regional|local|importado|importada|nacional|industrial|comercial|criollo|criolla|criollos?|autóctono|autoctono)$/i,
      // Dietary descriptors
      /^(integral|light|diet|bajo|baja|reducido|reducida|cero|libre|sin|bajo|grasa|azúcar|azucar|sodio|calorías|calorias)$/i,
      // Usage context
      /^(desayuno|almuerzo|comida|cena|botana|snack|postre|bebida|infantil|adulto|adultos)$/i,
      // Other descriptors
      /^(picante|dulce|salado|agrio|agria|amargo|amarga|suave|fuerte|suave|fino|largo|larga|corta|corto|sencillo|simple|combinación|combinado|sustituto|base)$/i,
    ],
    category: 'descriptor',
    priority: 4,
    examples: ['grande', 'pequeño', 'natural', 'integral', 'picante']
  },
  connector: {
    patterns: [
      /^(y|con|sin|de|del|en|para|por|sobre|entre|hasta|desde|durante|mediante|según|contra|bajo)$/i,
    ],
    category: 'connector',
    priority: 5,
    examples: ['y', 'con', 'sin']
  },
  excluded: {
    patterns: [
      // Nutrition terms
      /^(sabor|tipo|estilo|marca|producto|presentación|presentacion|contenido|ingredientes|información|informacion|nutrimental|datos|valor|energía|energia|proteína|proteina|proteínas|proteinas|grasa|grasas|carbohidrato|carbohidratos|fibra|sodio|azúcar|azucar|colesterol|vitamina|vitaminas|mineral|minerales|calcio|hierro|potasio|fósforo|fosforo|magnesio|zinc|cobre|manganeso|selenio|litio|ceniza|calorías|calorias|gr)$/i,
      // Marketing terms
      /^(light|diet|bajo|reducido|cero|libre|alimenticio|suplemento|infantil|energética|energetica|proteinada|aislado|satisfacción|satisfaccion|premium|selecto|calidad|especial|gourmet)$/i,
      // Verbs
      /^(beber|comer|tomar|preparar|cocinar|hervir|freír|freir|asar|hornear)$/i,
      // Packaging
      /^(caja|bolsa|envase|frasco|botella|lata|tetrapak|tetrabrick|envasado|empacado)$/i,
      // Other excluded
      /^(días|dia|día|meses|años|fecha|caducidad|expiración|lote|código|codigo|origen|país|pais|registro|permiso|norma|especificación|especificacion|variedad|figura|mesa|cobertura)$/i,
    ],
    category: 'excluded',
    priority: 6,
    examples: ['sabor', 'tipo', 'estilo', 'marca', 'alimenticio', 'suplemento', 'vitaminas']
  }
}

function classifyWord(word: string): { category: string; priority: number } {
  const lowerWord = word.toLowerCase()
  
  // Check each classification pattern
  for (const [key, config] of Object.entries(CLASSIFICATION_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(lowerWord)) {
        return { category: config.category, priority: config.priority }
      }
    }
  }
  
  // Default to unknown
  return { category: 'unknown', priority: 4 }
}

function extractWordsFromName(name: string): string[] {
  if (!name) return []
  
  // Split on spaces, hyphens, and other delimiters
  const words = name
    .toLowerCase()
    .replace(/[^\wáéíóúüñ\s-]/g, '') // Remove special chars except accented letters
    .split(/[\s-]+/)
    .filter(word => {
      // Filter out empty strings, numbers, and stop words
      if (!word || word.length < 2) return false
      if (/^\d+$/.test(word)) return false
      if (STOP_WORDS.has(word)) return false
      return true
    })
  
  return words
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reset = false, resetCategory = null, excludeFoodTypes = [], reclassifyUnknown = true } = body
    
    // Build where clause to exclude certain food types
    const where: any = {}
    if (excludeFoodTypes.length > 0) {
      where.tipoAlimento = { notIn: excludeFoodTypes }
    }
    
    // Get all Mexican foods (optionally filtered)
    const foods = await db.mexicanFood.findMany({
      where,
      select: { nombreEspanol: true, tipoAlimento: true }
    })
    
    if (foods.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No Mexican foods found in database. Please import the CSV first.'
      })
    }
    
    // Count word frequencies
    const wordFrequency = new Map<string, number>()
    const wordExamples = new Map<string, string[]>()
    
    for (const food of foods) {
      const name = food.nombreEspanol
      if (!name) continue
      
      const words = extractWordsFromName(name)
      const uniqueWords = [...new Set(words)] // Count each word once per food
      
      for (const word of uniqueWords) {
        wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1)
        
        if (!wordExamples.has(word)) {
          wordExamples.set(word, [])
        }
        const examples = wordExamples.get(word)!
        if (examples.length < 3) {
          examples.push(name)
        }
      }
    }
    
    // Full reset - clears everything (use with caution!)
    if (reset) {
      await db.wordClassification.deleteMany()
    }
    // Category reset - only clears words in a specific category
    else if (resetCategory) {
      await db.wordClassification.deleteMany({
        where: { category: resetCategory }
      })
    }
    
    // Get existing words (preserve manual classifications)
    const existing = await db.wordClassification.findMany({
      select: { word: true, wordLower: true, category: true, needsReview: true }
    })
    const existingWords = new Map<string, { category: string, needsReview: boolean }>()
    for (const w of existing) {
      existingWords.set(w.wordLower, { category: w.category, needsReview: w.needsReview })
    }
    
    // Create new classifications (only for words that don't exist)
    let created = 0
    let updated = 0
    let preserved = 0
    let reclassified = 0
    
    for (const [word, frequency] of wordFrequency) {
      const wordLower = word.toLowerCase()
      const { category, priority } = classifyWord(word)
      const examples = wordExamples.get(word) || []
      
      if (existingWords.has(wordLower)) {
        const existingData = existingWords.get(wordLower)!
        
        // Reclassify unknown words with new patterns (if enabled)
        if (reclassifyUnknown && existingData.category === 'unknown' && category !== 'unknown') {
          try {
            await db.wordClassification.updateMany({
              where: { wordLower },
              data: { 
                category, 
                priority, 
                needsReview: false,
                frequency 
              }
            })
            reclassified++
          } catch {
            // Ignore errors
          }
        } else {
          // Word exists with a valid classification - only update frequency
          try {
            await db.wordClassification.updateMany({
              where: { wordLower },
              data: { frequency }
            })
            updated++
          } catch {
            // Ignore errors
          }
        }
        preserved++
      } else {
        // New word - create with auto-classification
        try {
          await db.wordClassification.create({
            data: {
              word: word.charAt(0).toUpperCase() + word.slice(1), // Capitalize
              wordLower: word.toLowerCase(),
              category,
              priority,
              frequency,
              examples: JSON.stringify(examples),
              needsReview: category === 'unknown', // Unknown words need review
            }
          })
          created++
        } catch {
          // Word might already exist (race condition)
        }
      }
    }
    
    // Get final stats
    const stats = await db.wordClassification.groupBy({
      by: ['category'],
      _count: true
    })
    
    const total = await db.wordClassification.count()
    const needsReview = await db.wordClassification.count({
      where: { needsReview: true }
    })
    
    return NextResponse.json({
      success: true,
      stats: {
        foodsProcessed: foods.length,
        uniqueWords: wordFrequency.size,
        created,
        updated,
        preserved,
        reclassified,
        total,
        needsReview,
        byCategory: stats.reduce((acc, s) => {
          acc[s.category] = s._count
          return acc
        }, {} as Record<string, number>)
      }
    })
    
  } catch (error) {
    console.error('Word extraction error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to extract words',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const total = await db.wordClassification.count()
    const needsReview = await db.wordClassification.count({
      where: { needsReview: true }
    })
    const mexicanFoods = await db.mexicanFood.count()
    
    return NextResponse.json({
      wordClassifications: total,
      needsReview,
      mexicanFoods,
      ready: mexicanFoods > 0
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
