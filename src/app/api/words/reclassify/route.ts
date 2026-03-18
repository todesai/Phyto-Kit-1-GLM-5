import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Word classification patterns - expanded
const CLASSIFICATION_PATTERNS: Record<string, {
  patterns: RegExp[]
  category: string
  priority: number
}> = {
  core: {
    patterns: [
      /^(ajo|cebolla|tomate|chile|pimiento|zanahoria|papa|patata|maíz|maiz|frijol|arroz|pollo|res|cerdo|pescado|camarón|camaron|atún|atun|salmón|salmon|huevo|queso|leche|crema|mantequilla|aceite|limón|limon|naranja|manzana|plátano|platano|aguacate|mango|papaya|piña|pina|uva|fresa|mora|ciruela|durazno|melón|melon|sandía|sandia|toronja|lima|guayaba|maracuyá|maracuya|guanábana|guanabana|mamey|zapote|nanche|tejocote|capulín|capulin|chabacano|membrillo|pera|higo|datil|tuna|nopal|trigo|avena|cebada|centeno|lenteja|garbanzo|soya|haba|alubia|ejote|calabaza|chayote|epazote|cilantro|perejil|orégano|oregano|tomillo|romero|laurel|canela|clavo|pimienta|comino|anis|culantro|verduras|verdura|hongos|hongo|champiñones|champiñon|champinones|champinon|poblano|chipotle|chiltepin|chiles|amaranto|ajonjolí|ajonjoli|cacahuate|requesón|requeson|borrego|puerco|levadura|flores|flor|corteza|aloe|acerola)$/i,
    ],
    category: 'core',
    priority: 1,
  },
  species: {
    patterns: [
      /^(gallina|gallo|bovino|porcino|caprino|ovino|vacuno|ave|aves|pavo|pata|codorniz|conejo|liebre|venado|jabalí|jabali|iguana|armadillo|paloma|res|cerdo|pollo|pescado|marisco|borrego|puerco|cordero|cabrito|chivo|gato)$/i,
    ],
    category: 'species',
    priority: 2,
  },
  part: {
    patterns: [
      /^(pierna|muslo|pechuga|lomo|costilla|filete|bistec|carne|hueso|piel|hígado|corazón|riñón|lengua|cabeza|patas|alas|rabo|sesos|molleja|estómago|panza|buche|tripa|chorizo|salchicha|tocino|jamón|chuleta|bola|aguayón|espaldilla|diezmillo|sirloin|arrachera|uña|carnes)$/i,
    ],
    category: 'part',
    priority: 2,
  },
  prepared: {
    patterns: [
      /^(tortilla|sopa|taco|tamal|quesadilla|enchilada|gordita|sope|tostada|tamales|burrito|fajita|nachos|chilaquiles|pozole|menudo|caldillo|guiso|guisado|guisos|antojito|antojitos|botana|snack|postre|dulce|galleta|pan|paste|pastel|pay|flan|gelatina|budín|budin|pudding|helado|nieve|paleta|bolsa|envasado|empacado|refresco|agua|jugo|bebida|licor|cerveza|vino|tequila|mezcal|whisky|ron|brandy|coctel|mole|pipián|pipian|adobo|recado|marinada|asado|cocido|barbacoa|albóndiga|albondiga|albóndigas|albondigas|caldo|carnitas|cecina|chalupa|chalupas|chicharrón|chicharron|chimichurri|chivichanga|chivichangas|chocolate|cochinita|consome|consomé|crepa|crepas|flauta|flautas|empanizada|empanizado|enchiladas|guacamaya|guacamayas|milanesa|milanesas|pastor|pibil|tinga|suadero|torta|tortas|pambazo|pambazos|tlacoyo|tlacoyos|huarache|huaraches|quesadillas|sopes|tacos|tortillas|paella|sandwich|sándwich|hot|dog|pizza|hamburguesa|hamburguesas|papas|arrachera|bisteck|cortes|longaniza|cuerito|cueritos|tostadas|birria|carnita|picadillo|guacamole|salsas|mayonesa|mostaza|catsup|ketchup|aderezo|vinagreta|platillo|platillos|cemita|cemitas|chanclas|alambre|memela|memelas|mollete|molletes|sudado|chileatole|chayotextle|chilposo|bombas|capon|chicharron)$/i,
    ],
    category: 'prepared',
    priority: 2,
  },
  color: {
    patterns: [
      /^(blanco|blanca|negro|negra|rojo|roja|verde|amarillo|amarilla|azul|morado|morada|naranja|rosa|gris|marrón|café|dorado|plateado|parda|pardo)$/i,
    ],
    category: 'color',
    priority: 3,
  },
  processing: {
    patterns: [
      /^(molido|molida|picado|picada|rebanado|rebanada|trozado|trozada|cortado|cortada|rallado|rallada|machacado|machacada|aplastado|aplastada|triturado|triturada|desmenuzado|desmenuzada|deshebrado|deshebrada|hervido|hervida|cocido|cocida|asado|asada|frito|frita|horneado|horneada|deshidratado|deshidratada|seco|seca|fresco|fresca|crudo|cruda|congelado|congelada|enlatado|enlatada|ahumado|ahumada|salado|salada|dulce|curado|curada|maduro|madura|tierno|tierna|cocinado|cocinada|procesado|procesada|pasteurizado|esterilizado)$/i,
    ],
    category: 'processing',
    priority: 3,
  },
  form: {
    patterns: [
      /^(polvo|harina|pasta|salsa|jugo|zumo|aceite|vinagre|líquido|liquido|sólido|solido|crema|gel|jarabe|cápsula|capsula|tableta|extracto|esencia|concentrado|infusión|infusion|té|te|tisana|bebida|almíbar|almibar|barra)$/i,
    ],
    category: 'form',
    priority: 3,
  },
  descriptor: {
    patterns: [
      /^(grande|pequeño|pequeña|mediano|mediana|grueso|gruesa|delgado|delgada|fino|fina|entero|entera|mitad|cuarto|trozo|pieza|porción|ración|natural|orgánico|orgánica|artesanal|casero|casera|tradicional|regional|local|importado|importada|nacional|industrial|comercial|sencillo|suave|rellena)$/i,
    ],
    category: 'descriptor',
    priority: 4,
  },
  connector: {
    patterns: [
      /^(y|con|sin|de|en|para|por|sobre)$/i,
    ],
    category: 'connector',
    priority: 5,
  },
  excluded: {
    patterns: [
      /^(sabor|tipo|estilo|marca|producto|presentación|presentacion|contenido|ingredientes|información|informacion|nutrimental|datos|valor|energía|energia|proteína|proteina|grasa|carbohidrato|fibra|sodio|azúcar|azucar|colesterol|vitamina|mineral|calcio|hierro|potasio|fósforo|fosforo|magnesio|zinc|cobre|manganeso|selenio|litio|light|diet|bajo|reducido|cero|libre|alimenticio|suplemento|infantil|calorías|calorias|ceniza)$/i,
    ],
    category: 'excluded',
    priority: 6,
  }
}

function classifyWord(word: string): { category: string; priority: number } | null {
  const lowerWord = word.toLowerCase()
  
  for (const [key, config] of Object.entries(CLASSIFICATION_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(lowerWord)) {
        return { category: config.category, priority: config.priority }
      }
    }
  }
  
  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { onlyUnknown = true } = body
    
    // Get all words (optionally only unknown)
    const where = onlyUnknown ? { needsReview: true } : {}
    const words = await db.wordClassification.findMany({
      where,
      select: { id: true, word: true, category: true }
    })
    
    let updated = 0
    const updates: Array<{ word: string; oldCategory: string; newCategory: string }> = []
    
    for (const wordRecord of words) {
      const classification = classifyWord(wordRecord.word)
      
      if (classification && classification.category !== wordRecord.category) {
        await db.wordClassification.update({
          where: { id: wordRecord.id },
          data: {
            category: classification.category,
            priority: classification.priority,
            needsReview: false,
          }
        })
        
        updates.push({
          word: wordRecord.word,
          oldCategory: wordRecord.category,
          newCategory: classification.category,
        })
        updated++
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
      wordsProcessed: words.length,
      updated,
      updates: updates.slice(0, 50), // First 50 updates
      stats: {
        total,
        needsReview,
        classified: total - needsReview,
        byCategory: stats.reduce((acc, s) => {
          acc[s.category] = s._count
          return acc
        }, {} as Record<string, number>)
      }
    })
    
  } catch (error) {
    console.error('Re-classification error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to re-classify words',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
