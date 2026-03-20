/**
 * Classify all words from Mexican DB nombreEspanol
 * Populates WordClassification table with best-guess classifications
 */

import { db } from '../src/lib/db'

// =============================================================================
// COMPREHENSIVE WORD CLASSIFICATIONS (Priority-based)
// =============================================================================

// All classifications with priority (1 = highest)
const WORD_CLASSIFICATIONS: Record<string, {
  category: 'core' | 'species' | 'part' | 'color' | 'processing' | 'form' | 'descriptor' | 'connector' | 'unknown'
  subcategory?: string
  priority: number
  notes?: string
}> = {
  // ===== PRIORITY 1: CORE INGREDIENTS =====
  'huevo': { category: 'core', subcategory: 'protein', priority: 1, notes: 'Egg' },
  'pollo': { category: 'core', subcategory: 'protein', priority: 1, notes: 'Chicken' },
  'res': { category: 'core', subcategory: 'protein', priority: 1, notes: 'Beef' },
  'cerdo': { category: 'core', subcategory: 'protein', priority: 1, notes: 'Pork' },
  'pescado': { category: 'core', subcategory: 'protein', priority: 1, notes: 'Fish (generic)' },
  'carne': { category: 'core', subcategory: 'protein', priority: 1, notes: 'Meat' },
  'leche': { category: 'core', subcategory: 'dairy', priority: 1, notes: 'Milk' },
  'queso': { category: 'core', subcategory: 'dairy', priority: 1, notes: 'Cheese' },
  'crema': { category: 'core', subcategory: 'dairy', priority: 1, notes: 'Cream' },
  'mantequilla': { category: 'core', subcategory: 'dairy', priority: 1, notes: 'Butter' },
  'yogurt': { category: 'core', subcategory: 'dairy', priority: 1 },
  'jocoque': { category: 'core', subcategory: 'dairy', priority: 1, notes: 'Fermented milk' },
  'arroz': { category: 'core', subcategory: 'grain', priority: 1, notes: 'Rice' },
  'frijol': { category: 'core', subcategory: 'legume', priority: 1, notes: 'Bean' },
  'maiz': { category: 'core', subcategory: 'grain', priority: 1, notes: 'Corn' },
  'maíz': { category: 'core', subcategory: 'grain', priority: 1, notes: 'Corn (accented)' },
  'trigo': { category: 'core', subcategory: 'grain', priority: 1, notes: 'Wheat' },
  'avena': { category: 'core', subcategory: 'grain', priority: 1, notes: 'Oats' },
  'cebada': { category: 'core', subcategory: 'grain', priority: 1, notes: 'Barley' },
  'centeno': { category: 'core', subcategory: 'grain', priority: 1, notes: 'Rye' },
  'amaranto': { category: 'core', subcategory: 'grain', priority: 1 },
  'quinoa': { category: 'core', subcategory: 'grain', priority: 1 },
  'cebolla': { category: 'core', subcategory: 'vegetable', priority: 1, notes: 'Onion' },
  'ajo': { category: 'core', subcategory: 'vegetable', priority: 1, notes: 'Garlic' },
  'tomate': { category: 'core', subcategory: 'vegetable', priority: 1 },
  'jitomate': { category: 'core', subcategory: 'vegetable', priority: 1, notes: 'Tomato (red)' },
  'papa': { category: 'core', subcategory: 'vegetable', priority: 1, notes: 'Potato' },
  'zanahoria': { category: 'core', subcategory: 'vegetable', priority: 1, notes: 'Carrot' },
  'lechuga': { category: 'core', subcategory: 'vegetable', priority: 1 },
  'espinaca': { category: 'core', subcategory: 'vegetable', priority: 1, notes: 'Spinach' },
  'pepino': { category: 'core', subcategory: 'vegetable', priority: 1, notes: 'Cucumber' },
  'calabaza': { category: 'core', subcategory: 'vegetable', priority: 1, notes: 'Squash' },
  'chile': { category: 'core', subcategory: 'vegetable', priority: 1, notes: 'Chili pepper' },
  'pimiento': { category: 'core', subcategory: 'vegetable', priority: 1, notes: 'Bell pepper' },
  'apio': { category: 'core', subcategory: 'vegetable', priority: 1, notes: 'Celery' },
  'col': { category: 'core', subcategory: 'vegetable', priority: 1, notes: 'Cabbage' },
  'brocoli': { category: 'core', subcategory: 'vegetable', priority: 1 },
  'coliflor': { category: 'core', subcategory: 'vegetable', priority: 1, notes: 'Cauliflower' },
  'ejote': { category: 'core', subcategory: 'vegetable', priority: 1, notes: 'Green bean' },
  'nopal': { category: 'core', subcategory: 'vegetable', priority: 1, notes: 'Cactus paddle' },
  'elote': { category: 'core', subcategory: 'vegetable', priority: 1, notes: 'Corn on cob' },
  'camote': { category: 'core', subcategory: 'vegetable', priority: 1, notes: 'Sweet potato' },
  'yuca': { category: 'core', subcategory: 'vegetable', priority: 1 },
  'jicama': { category: 'core', subcategory: 'vegetable', priority: 1 },
  'manzana': { category: 'core', subcategory: 'fruit', priority: 1, notes: 'Apple' },
  'naranja': { category: 'core', subcategory: 'fruit', priority: 1, notes: 'Orange' },
  'limon': { category: 'core', subcategory: 'fruit', priority: 1, notes: 'Lemon' },
  'limón': { category: 'core', subcategory: 'fruit', priority: 1, notes: 'Lemon (accented)' },
  'platano': { category: 'core', subcategory: 'fruit', priority: 1, notes: 'Banana' },
  'plátano': { category: 'core', subcategory: 'fruit', priority: 1, notes: 'Banana (accented)' },
  'uva': { category: 'core', subcategory: 'fruit', priority: 1, notes: 'Grape' },
  'fresa': { category: 'core', subcategory: 'fruit', priority: 1, notes: 'Strawberry' },
  'mango': { category: 'core', subcategory: 'fruit', priority: 1 },
  'aguacate': { category: 'core', subcategory: 'fruit', priority: 1, notes: 'Avocado' },
  'piña': { category: 'core', subcategory: 'fruit', priority: 1, notes: 'Pineapple' },
  'papaya': { category: 'core', subcategory: 'fruit', priority: 1 },
  'guayaba': { category: 'core', subcategory: 'fruit', priority: 1, notes: 'Guava' },
  'melon': { category: 'core', subcategory: 'fruit', priority: 1, notes: 'Melon' },
  'sandia': { category: 'core', subcategory: 'fruit', priority: 1, notes: 'Watermelon' },
  'ciruela': { category: 'core', subcategory: 'fruit', priority: 1, notes: 'Plum' },
  'durazno': { category: 'core', subcategory: 'fruit', priority: 1, notes: 'Peach' },
  'pera': { category: 'core', subcategory: 'fruit', priority: 1, notes: 'Pear' },
  'tuna': { category: 'core', subcategory: 'fruit', priority: 1, notes: 'Prickly pear' },
  'zapote': { category: 'core', subcategory: 'fruit', priority: 1 },
  'mamey': { category: 'core', subcategory: 'fruit', priority: 1 },
  'aceite': { category: 'core', subcategory: 'fat', priority: 1, notes: 'Oil' },
  'azucar': { category: 'core', subcategory: 'sweetener', priority: 1, notes: 'Sugar' },
  'azúcar': { category: 'core', subcategory: 'sweetener', priority: 1, notes: 'Sugar (accented)' },
  'miel': { category: 'core', subcategory: 'sweetener', priority: 1, notes: 'Honey' },
  'sal': { category: 'core', subcategory: 'seasoning', priority: 1, notes: 'Salt' },
  'pimienta': { category: 'core', subcategory: 'seasoning', priority: 1, notes: 'Pepper' },
  'canela': { category: 'core', subcategory: 'seasoning', priority: 1, notes: 'Cinnamon' },
  'comino': { category: 'core', subcategory: 'seasoning', priority: 1, notes: 'Cumin' },
  'oregano': { category: 'core', subcategory: 'seasoning', priority: 1, notes: 'Oregano' },
  'cilantro': { category: 'core', subcategory: 'seasoning', priority: 1 },
  'perejil': { category: 'core', subcategory: 'seasoning', priority: 1, notes: 'Parsley' },
  'albahaca': { category: 'core', subcategory: 'seasoning', priority: 1, notes: 'Basil' },
  'tomillo': { category: 'core', subcategory: 'seasoning', priority: 1, notes: 'Thyme' },
  'romero': { category: 'core', subcategory: 'seasoning', priority: 1, notes: 'Rosemary' },
  'vainilla': { category: 'core', subcategory: 'seasoning', priority: 1, notes: 'Vanilla' },
  'nuez': { category: 'core', subcategory: 'nut', priority: 1, notes: 'Walnut/Nut' },
  'almendra': { category: 'core', subcategory: 'nut', priority: 1, notes: 'Almond' },
  'cacahuate': { category: 'core', subcategory: 'nut', priority: 1, notes: 'Peanut' },
  'ajonjoli': { category: 'core', subcategory: 'seed', priority: 1, notes: 'Sesame' },
  'pan': { category: 'core', subcategory: 'prepared', priority: 1, notes: 'Bread' },
  'tortilla': { category: 'core', subcategory: 'prepared', priority: 1 },
  'galleta': { category: 'core', subcategory: 'prepared', priority: 1, notes: 'Cookie' },
  'gelatina': { category: 'core', subcategory: 'prepared', priority: 1 },
  'chocolate': { category: 'core', subcategory: 'prepared', priority: 1 },
  'cacao': { category: 'core', subcategory: 'prepared', priority: 1 },
  'cafe': { category: 'core', subcategory: 'beverage', priority: 1, notes: 'Coffee' },
  'café': { category: 'core', subcategory: 'beverage', priority: 1, notes: 'Coffee (accented)' },
  'te': { category: 'core', subcategory: 'beverage', priority: 1, notes: 'Tea' },
  'té': { category: 'core', subcategory: 'beverage', priority: 1, notes: 'Tea (accented)' },
  'vino': { category: 'core', subcategory: 'beverage', priority: 1, notes: 'Wine' },
  'cerveza': { category: 'core', subcategory: 'beverage', priority: 1, notes: 'Beer' },
  'agua': { category: 'core', subcategory: 'beverage', priority: 1, notes: 'Water' },
  'hongo': { category: 'core', subcategory: 'fungi', priority: 1, notes: 'Mushroom' },
  'champiñon': { category: 'core', subcategory: 'fungi', priority: 1, notes: 'Button mushroom' },

  // ===== PRIORITY 2: SPECIES =====
  'gallina': { category: 'species', priority: 2, notes: 'Chicken (species)' },
  'vaca': { category: 'species', priority: 2, notes: 'Cow' },
  'puerco': { category: 'species', priority: 2, notes: 'Pig' },
  'cabra': { category: 'species', priority: 2, notes: 'Goat' },
  'borrego': { category: 'species', priority: 2, notes: 'Sheep' },
  'conejo': { category: 'species', priority: 2, notes: 'Rabbit' },
  'pato': { category: 'species', priority: 2, notes: 'Duck' },
  'codorniz': { category: 'species', priority: 2, notes: 'Quail' },
  'iguana': { category: 'species', priority: 2 },
  'venado': { category: 'species', priority: 2, notes: 'Deer' },
  'jabali': { category: 'species', priority: 2, notes: 'Wild boar' },
  'atun': { category: 'species', priority: 2, notes: 'Tuna' },
  'atún': { category: 'species', priority: 2, notes: 'Tuna (accented)' },
  'salmon': { category: 'species', priority: 2, notes: 'Salmon' },
  'salmón': { category: 'species', priority: 2, notes: 'Salmon (accented)' },
  'sardina': { category: 'species', priority: 2 },
  'mojarra': { category: 'species', priority: 2 },
  'camaron': { category: 'species', priority: 2, notes: 'Shrimp' },
  'camarón': { category: 'species', priority: 2, notes: 'Shrimp (accented)' },
  'langosta': { category: 'species', priority: 2, notes: 'Lobster' },
  'cangrejo': { category: 'species', priority: 2, notes: 'Crab' },
  'pulpo': { category: 'species', priority: 2, notes: 'Octopus' },
  'calamar': { category: 'species', priority: 2 },
  'carpa': { category: 'species', priority: 2 },
  'tilapia': { category: 'species', priority: 2 },
  'huachinango': { category: 'species', priority: 2, notes: 'Red snapper' },
  'sierra': { category: 'species', priority: 2 },
  'cazon': { category: 'species', priority: 2, notes: 'Dogfish shark' },
  'cazón': { category: 'species', priority: 2, notes: 'Dogfish (accented)' },
  'jaiba': { category: 'species', priority: 2, notes: 'Blue crab' },
  'ostion': { category: 'species', priority: 2, notes: 'Oyster' },
  'ostión': { category: 'species', priority: 2, notes: 'Oyster (accented)' },
  'mejillon': { category: 'species', priority: 2, notes: 'Mussel' },
  'mejillón': { category: 'species', priority: 2, notes: 'Mussel (accented)' },
  'almeja': { category: 'species', priority: 2, notes: 'Clam' },
  'hormiga': { category: 'species', priority: 2, notes: 'Ant' },
  'chapulin': { category: 'species', priority: 2, notes: 'Grasshopper' },
  'chapulín': { category: 'species', priority: 2, notes: 'Grasshopper (accented)' },
  'gusano': { category: 'species', priority: 2, notes: 'Worm (maguey)' },
  'escamol': { category: 'species', priority: 2, notes: 'Ant eggs' },
  'ahuautle': { category: 'species', priority: 2, notes: 'Water fly eggs' },
  'avispa': { category: 'species', priority: 2, notes: 'Wasp' },
  'abeja': { category: 'species', priority: 2, notes: 'Bee' },
  'chinche': { category: 'species', priority: 2, notes: 'Stink bug' },
  'mariposa': { category: 'species', priority: 2, notes: 'Butterfly' },
  'escarabajo': { category: 'species', priority: 2, notes: 'Beetle' },

  // ===== PRIORITY 2: PARTS =====
  'clara': { category: 'part', priority: 2, notes: 'Egg white' },
  'yema': { category: 'part', priority: 2, notes: 'Egg yolk' },
  'pechuga': { category: 'part', priority: 2, notes: 'Breast' },
  'muslo': { category: 'part', priority: 2, notes: 'Thigh' },
  'pierna': { category: 'part', priority: 2, notes: 'Leg' },
  'ala': { category: 'part', priority: 2, notes: 'Wing' },
  'higado': { category: 'part', priority: 2, notes: 'Liver' },
  'hígado': { category: 'part', priority: 2, notes: 'Liver (accented)' },
  'corazon': { category: 'part', priority: 2, notes: 'Heart' },
  'corazón': { category: 'part', priority: 2, notes: 'Heart (accented)' },
  'riñon': { category: 'part', priority: 2, notes: 'Kidney' },
  'riñón': { category: 'part', priority: 2, notes: 'Kidney (accented)' },
  'lengua': { category: 'part', priority: 2, notes: 'Tongue' },
  'sesos': { category: 'part', priority: 2, notes: 'Brains' },
  'machaca': { category: 'part', priority: 2, notes: 'Shredded meat' },
  'filete': { category: 'part', priority: 2, notes: 'Fillet' },
  'bistec': { category: 'part', priority: 2, notes: 'Steak' },
  'costilla': { category: 'part', priority: 2, notes: 'Rib' },
  'chuleta': { category: 'part', priority: 2, notes: 'Chop' },
  'lomo': { category: 'part', priority: 2, notes: 'Loin' },
  'falda': { category: 'part', priority: 2, notes: 'Flank' },
  'bola': { category: 'part', priority: 2, notes: 'Round' },
  'espaldilla': { category: 'part', priority: 2, notes: 'Shoulder' },
  'cabecero': { category: 'part', priority: 2, notes: 'Chuck' },
  'maciza': { category: 'part', priority: 2, notes: 'Lean meat' },
  'suadero': { category: 'part', priority: 2, notes: 'Brisket' },
  'cabeza': { category: 'part', priority: 2, notes: 'Head' },
  'patitas': { category: 'part', priority: 2, notes: 'Feet' },
  'cuero': { category: 'part', priority: 2, notes: 'Skin' },
  'tocino': { category: 'part', priority: 2, notes: 'Bacon' },
  'tripa': { category: 'part', priority: 2, notes: 'Tripe' },
  'panza': { category: 'part', priority: 2, notes: 'Stomach' },
  'hueso': { category: 'part', priority: 2, notes: 'Bone' },
  'cola': { category: 'part', priority: 2, notes: 'Tail' },
  'hoja': { category: 'part', priority: 2, notes: 'Leaf' },

  // ===== PRIORITY 3: COLORS =====
  'rojo': { category: 'color', priority: 3, notes: 'Red' },
  'roja': { category: 'color', priority: 3, notes: 'Red (fem)' },
  'blanco': { category: 'color', priority: 3, notes: 'White' },
  'blanca': { category: 'color', priority: 3, notes: 'White (fem)' },
  'verde': { category: 'color', priority: 3, notes: 'Green' },
  'verdes': { category: 'color', priority: 3, notes: 'Green (plural)' },
  'amarillo': { category: 'color', priority: 3, notes: 'Yellow' },
  'amarilla': { category: 'color', priority: 3, notes: 'Yellow (fem)' },
  'negro': { category: 'color', priority: 3, notes: 'Black' },
  'negra': { category: 'color', priority: 3, notes: 'Black (fem)' },
  'naranja': { category: 'color', priority: 3, notes: 'Orange' },
  'morado': { category: 'color', priority: 3, notes: 'Purple' },
  'morada': { category: 'color', priority: 3, notes: 'Purple (fem)' },
  'rosa': { category: 'color', priority: 3, notes: 'Pink' },
  'azul': { category: 'color', priority: 3, notes: 'Blue' },
  'oscuro': { category: 'color', priority: 3, notes: 'Dark' },
  'oscura': { category: 'color', priority: 3, notes: 'Dark (fem)' },
  'claro': { category: 'color', priority: 3, notes: 'Light' },
  'clara': { category: 'color', priority: 3, notes: 'Light (fem)' },
  'pardo': { category: 'color', priority: 3, notes: 'Brown' },
  'parda': { category: 'color', priority: 3, notes: 'Brown (fem)' },
  'cafe': { category: 'color', priority: 3, notes: 'Brown' },
  'café': { category: 'color', priority: 3, notes: 'Brown (accented)' },
  'dorado': { category: 'color', priority: 3, notes: 'Golden' },

  // ===== PRIORITY 3: PROCESSING STATES =====
  'crudo': { category: 'processing', subcategory: 'raw', priority: 3, notes: 'Raw (masc)' },
  'cruda': { category: 'processing', subcategory: 'raw', priority: 3, notes: 'Raw (fem)' },
  'fresco': { category: 'processing', subcategory: 'raw', priority: 3, notes: 'Fresh (masc)' },
  'fresca': { category: 'processing', subcategory: 'raw', priority: 3, notes: 'Fresh (fem)' },
  'natural': { category: 'processing', subcategory: 'raw', priority: 3, notes: 'Natural' },
  'cocido': { category: 'processing', subcategory: 'cooked', priority: 3, notes: 'Cooked (masc)' },
  'cocida': { category: 'processing', subcategory: 'cooked', priority: 3, notes: 'Cooked (fem)' },
  'hervido': { category: 'processing', subcategory: 'cooked', priority: 3, notes: 'Boiled (masc)' },
  'hervida': { category: 'processing', subcategory: 'cooked', priority: 3, notes: 'Boiled (fem)' },
  'frito': { category: 'processing', subcategory: 'cooked', priority: 3, notes: 'Fried (masc)' },
  'frita': { category: 'processing', subcategory: 'cooked', priority: 3, notes: 'Fried (fem)' },
  'asado': { category: 'processing', subcategory: 'cooked', priority: 3, notes: 'Roasted (masc)' },
  'asada': { category: 'processing', subcategory: 'cooked', priority: 3, notes: 'Roasted (fem)' },
  'horneado': { category: 'processing', subcategory: 'cooked', priority: 3, notes: 'Baked (masc)' },
  'horneada': { category: 'processing', subcategory: 'cooked', priority: 3, notes: 'Baked (fem)' },
  'tostado': { category: 'processing', subcategory: 'cooked', priority: 3, notes: 'Toasted (masc)' },
  'tostada': { category: 'processing', subcategory: 'cooked', priority: 3, notes: 'Toasted (fem)' },
  'seco': { category: 'processing', subcategory: 'preserved', priority: 3, notes: 'Dried (masc)' },
  'seca': { category: 'processing', subcategory: 'preserved', priority: 3, notes: 'Dried (fem)' },
  'deshidratado': { category: 'processing', subcategory: 'preserved', priority: 3, notes: 'Dehydrated (masc)' },
  'deshidratada': { category: 'processing', subcategory: 'preserved', priority: 3, notes: 'Dehydrated (fem)' },
  'congelado': { category: 'processing', subcategory: 'preserved', priority: 3, notes: 'Frozen (masc)' },
  'congelada': { category: 'processing', subcategory: 'preserved', priority: 3, notes: 'Frozen (fem)' },
  'enlatado': { category: 'processing', subcategory: 'preserved', priority: 3, notes: 'Canned (masc)' },
  'enlatada': { category: 'processing', subcategory: 'preserved', priority: 3, notes: 'Canned (fem)' },
  'ahumado': { category: 'processing', subcategory: 'preserved', priority: 3, notes: 'Smoked (masc)' },
  'ahumada': { category: 'processing', subcategory: 'preserved', priority: 3, notes: 'Smoked (fem)' },
  'salado': { category: 'processing', subcategory: 'preserved', priority: 3, notes: 'Salted (masc)' },
  'salada': { category: 'processing', subcategory: 'preserved', priority: 3, notes: 'Salted (fem)' },
  'fermentado': { category: 'processing', subcategory: 'fermented', priority: 3, notes: 'Fermented (masc)' },
  'fermentada': { category: 'processing', subcategory: 'fermented', priority: 3, notes: 'Fermented (fem)' },
  'pasteurizado': { category: 'processing', subcategory: 'processed', priority: 3, notes: 'Pasteurized' },
  'pasteurizada': { category: 'processing', subcategory: 'processed', priority: 3, notes: 'Pasteurized (fem)' },
  'ultrapasteurizada': { category: 'processing', subcategory: 'processed', priority: 3, notes: 'Ultra-pasteurized' },
  'dulce': { category: 'processing', subcategory: 'flavor', priority: 3, notes: 'Sweet' },
  'amargo': { category: 'processing', subcategory: 'flavor', priority: 3, notes: 'Bitter' },
  'agrio': { category: 'processing', subcategory: 'flavor', priority: 3, notes: 'Sour' },
  'agria': { category: 'processing', subcategory: 'flavor', priority: 3, notes: 'Sour (fem)' },
  'picante': { category: 'processing', subcategory: 'flavor', priority: 3, notes: 'Spicy' },

  // ===== PRIORITY 3: FORMS =====
  'harina': { category: 'form', priority: 3, notes: 'Flour' },
  'polvo': { category: 'form', priority: 3, notes: 'Powder' },
  'entero': { category: 'form', priority: 3, notes: 'Whole (masc)' },
  'entera': { category: 'form', priority: 3, notes: 'Whole (fem)' },
  'trozo': { category: 'form', priority: 3, notes: 'Piece' },
  'trozos': { category: 'form', priority: 3, notes: 'Pieces' },
  'rodaja': { category: 'form', priority: 3, notes: 'Slice' },
  'rodajas': { category: 'form', priority: 3, notes: 'Slices' },
  'picado': { category: 'form', priority: 3, notes: 'Chopped (masc)' },
  'picada': { category: 'form', priority: 3, notes: 'Chopped (fem)' },
  'molido': { category: 'form', priority: 3, notes: 'Ground (masc)' },
  'molida': { category: 'form', priority: 3, notes: 'Ground (fem)' },
  'rallado': { category: 'form', priority: 3, notes: 'Grated (masc)' },
  'rallada': { category: 'form', priority: 3, notes: 'Grated (fem)' },
  'rebanado': { category: 'form', priority: 3, notes: 'Sliced (masc)' },
  'rebanada': { category: 'form', priority: 3, notes: 'Sliced (fem)' },
  'jugo': { category: 'form', priority: 3, notes: 'Juice' },
  'extracto': { category: 'form', priority: 3, notes: 'Extract' },
  'esencia': { category: 'form', priority: 3, notes: 'Essence' },
  'concentrado': { category: 'form', priority: 3, notes: 'Concentrate (masc)' },
  'concentrada': { category: 'form', priority: 3, notes: 'Concentrate (fem)' },
  'jarabe': { category: 'form', priority: 3, notes: 'Syrup' },
  'salsa': { category: 'form', priority: 3, notes: 'Sauce' },
  'puré': { category: 'form', priority: 3, notes: 'Puree' },
  'pasta': { category: 'form', priority: 3, notes: 'Paste' },
  'instantaneo': { category: 'form', priority: 3, notes: 'Instant (masc)' },
  'instantáneo': { category: 'form', priority: 3, notes: 'Instant (masc, accented)' },
  'instantánea': { category: 'form', priority: 3, notes: 'Instant (fem)' },
  'pelado': { category: 'form', priority: 3, notes: 'Peeled (masc)' },
  'pelada': { category: 'form', priority: 3, notes: 'Peeled (fem)' },
  'pulpa': { category: 'form', priority: 3, notes: 'Pulp' },
  'cáscara': { category: 'form', priority: 3, notes: 'Shell/peel' },
  'semilla': { category: 'form', priority: 3, notes: 'Seed' },
  'grano': { category: 'form', priority: 3, notes: 'Grain' },

  // ===== PRIORITY 4: DESCRIPTORS =====
  'sabor': { category: 'descriptor', subcategory: 'product', priority: 4, notes: 'Flavor' },
  'light': { category: 'descriptor', subcategory: 'product', priority: 4, notes: 'Light/low-cal' },
  'tipo': { category: 'descriptor', subcategory: 'product', priority: 4, notes: 'Type' },
  'imitación': { category: 'descriptor', subcategory: 'product', priority: 4, notes: 'Imitation' },
  'sustituida': { category: 'descriptor', subcategory: 'product', priority: 4, notes: 'Substituted' },
  'extendida': { category: 'descriptor', subcategory: 'product', priority: 4, notes: 'Extended' },
  'guisos': { category: 'descriptor', subcategory: 'prepared', priority: 4, notes: 'Stews' },
  'antojitos': { category: 'descriptor', subcategory: 'prepared', priority: 4, notes: 'Street food' },
  'taco': { category: 'descriptor', subcategory: 'prepared', priority: 4, notes: 'Taco' },
  'sopa': { category: 'descriptor', subcategory: 'prepared', priority: 4, notes: 'Soup' },
  'botana': { category: 'descriptor', subcategory: 'prepared', priority: 4, notes: 'Snack' },
  'helado': { category: 'descriptor', subcategory: 'prepared', priority: 4, notes: 'Ice cream' },
  'torta': { category: 'descriptor', subcategory: 'prepared', priority: 4, notes: 'Cake/sandwich' },
  'barra': { category: 'descriptor', subcategory: 'prepared', priority: 4, notes: 'Bar' },
  'refresco': { category: 'descriptor', subcategory: 'prepared', priority: 4, notes: 'Soda' },
  'bebida': { category: 'descriptor', subcategory: 'prepared', priority: 4, notes: 'Beverage' },
  'bebidas': { category: 'descriptor', subcategory: 'prepared', priority: 4, notes: 'Beverages' },
  'mermelada': { category: 'descriptor', subcategory: 'prepared', priority: 4, notes: 'Jam' },
  'conserva': { category: 'descriptor', subcategory: 'prepared', priority: 4, notes: 'Preserve' },
  'preparada': { category: 'descriptor', subcategory: 'state', priority: 4, notes: 'Prepared' },
  'preparar': { category: 'descriptor', subcategory: 'state', priority: 4, notes: 'To prepare' },
  'mezcla': { category: 'descriptor', subcategory: 'state', priority: 4, notes: 'Mixture' },
  'soya': { category: 'descriptor', subcategory: 'ingredient', priority: 4, notes: 'Soy' },
  'soja': { category: 'descriptor', subcategory: 'ingredient', priority: 4, notes: 'Soy (alt)' },
  'cereal': { category: 'descriptor', subcategory: 'ingredient', priority: 4, notes: 'Cereal' },
  'integral': { category: 'descriptor', subcategory: 'ingredient', priority: 4, notes: 'Whole grain' },
  'vitaminas': { category: 'descriptor', subcategory: 'ingredient', priority: 4, notes: 'Vitamins' },
  'minerales': { category: 'descriptor', subcategory: 'ingredient', priority: 4, notes: 'Minerals' },
  'proteína': { category: 'descriptor', subcategory: 'ingredient', priority: 4, notes: 'Protein' },
  'maguey': { category: 'descriptor', subcategory: 'regional', priority: 4, notes: 'Maguey/agave' },
  'quelite': { category: 'descriptor', subcategory: 'regional', priority: 4, notes: 'Wild greens' },
  'ramon': { category: 'descriptor', subcategory: 'regional', priority: 4, notes: 'Breadnut' },
  'tamarindo': { category: 'descriptor', subcategory: 'ingredient', priority: 4, notes: 'Tamarind' },
  'zarzamora': { category: 'descriptor', subcategory: 'ingredient', priority: 4, notes: 'Blackberry' },
  'mezquite': { category: 'descriptor', subcategory: 'ingredient', priority: 4, notes: 'Mesquite' },
  'variedad': { category: 'descriptor', subcategory: 'descriptor', priority: 4, notes: 'Variety' },
  'gigante': { category: 'descriptor', subcategory: 'descriptor', priority: 4, notes: 'Giant' },
  'adultos': { category: 'descriptor', subcategory: 'descriptor', priority: 4, notes: 'Adults' },
  'adulto': { category: 'descriptor', subcategory: 'descriptor', priority: 4, notes: 'Adult' },
  'larva': { category: 'descriptor', subcategory: 'descriptor', priority: 4, notes: 'Larva' },
  'larvas': { category: 'descriptor', subcategory: 'descriptor', priority: 4, notes: 'Larvae' },
  'pupa': { category: 'descriptor', subcategory: 'descriptor', priority: 4, notes: 'Pupa' },
  'ninfas': { category: 'descriptor', subcategory: 'descriptor', priority: 4, notes: 'Nymphs' },
  'membrillo': { category: 'descriptor', subcategory: 'ingredient', priority: 4, notes: 'Quince' },
  'mayonesa': { category: 'descriptor', subcategory: 'ingredient', priority: 4, notes: 'Mayonnaise' },
  'limón': { category: 'descriptor', subcategory: 'ingredient', priority: 4, notes: 'Lemon' },
  'alubia': { category: 'descriptor', subcategory: 'ingredient', priority: 4, notes: 'White bean' },
  'guindas': { category: 'descriptor', subcategory: 'ingredient', priority: 4, notes: 'Sour cherries' },
  'jamón': { category: 'descriptor', subcategory: 'ingredient', priority: 4, notes: 'Ham' },
  'néctar': { category: 'descriptor', subcategory: 'form', priority: 4, notes: 'Nectar' },
  'artesanal': { category: 'descriptor', subcategory: 'descriptor', priority: 4, notes: 'Artisanal' },
  'casera': { category: 'descriptor', subcategory: 'descriptor', priority: 4, notes: 'Homemade' },
  'parcialmente': { category: 'descriptor', subcategory: 'descriptor', priority: 4, notes: 'Partially' },
  'adicionada': { category: 'descriptor', subcategory: 'descriptor', priority: 4, notes: 'Added' },
  'descremada': { category: 'descriptor', subcategory: 'descriptor', priority: 4, notes: 'Skimmed' },
  'cobertura': { category: 'descriptor', subcategory: 'form', priority: 4, notes: 'Coating' },
  'forma': { category: 'descriptor', subcategory: 'form', priority: 4, notes: 'Form/shape' },
  'figura': { category: 'descriptor', subcategory: 'form', priority: 4, notes: 'Figure/shape' },
  'mesa': { category: 'descriptor', subcategory: 'descriptor', priority: 4, notes: 'Table (for serving)' },
  'barquillo': { category: 'descriptor', subcategory: 'prepared', priority: 4, notes: 'Wafer cone' },
  'tableta': { category: 'descriptor', subcategory: 'form', priority: 4, notes: 'Tablet/bar' },
  'monedas': { category: 'descriptor', subcategory: 'form', priority: 4, notes: 'Coins' },
  'granulado': { category: 'descriptor', subcategory: 'form', priority: 4, notes: 'Granulated' },

  // ===== PRIORITY 5: CONNECTORS (ignored in matching) =====
  'de': { category: 'connector', priority: 5, notes: 'of/from' },
  'del': { category: 'connector', priority: 5, notes: 'of the' },
  'la': { category: 'connector', priority: 5, notes: 'the (fem)' },
  'el': { category: 'connector', priority: 5, notes: 'the (masc)' },
  'las': { category: 'connector', priority: 5, notes: 'the (pl fem)' },
  'los': { category: 'connector', priority: 5, notes: 'the (pl masc)' },
  'y': { category: 'connector', priority: 5, notes: 'and' },
  'con': { category: 'connector', priority: 5, notes: 'with' },
  'sin': { category: 'connector', priority: 5, notes: 'without' },
  'en': { category: 'connector', priority: 5, notes: 'in' },
  'para': { category: 'connector', priority: 5, notes: 'for' },
  'por': { category: 'connector', priority: 5, notes: 'by' },
  'a': { category: 'connector', priority: 5, notes: 'to' },
  'al': { category: 'connector', priority: 5, notes: 'to the' },
  'un': { category: 'connector', priority: 5, notes: 'a (masc)' },
  'una': { category: 'connector', priority: 5, notes: 'a (fem)' },
  'unos': { category: 'connector', priority: 5, notes: 'some (masc)' },
  'unas': { category: 'connector', priority: 5, notes: 'some (fem)' },
  'que': { category: 'connector', priority: 5, notes: 'that' },
  'se': { category: 'connector', priority: 5, notes: 'reflexive' },
  'su': { category: 'connector', priority: 5, notes: 'his/her' },
  'sus': { category: 'connector', priority: 5, notes: 'his/her (pl)' },
  'o': { category: 'connector', priority: 5, notes: 'or' },
}

// =============================================================================
// MAIN SCRIPT
// =============================================================================

async function main() {
  console.log('Fetching all foods from Mexican DB...')
  
  const foods = await db.mexicanFood.findMany({
    select: { nombreEspanol: true }
  })
  
  console.log(`Found ${foods.length} foods`)
  
  // Extract all unique words with examples
  const wordMap = new Map<string, { count: number; examples: Set<string> }>()
  
  for (const food of foods) {
    const name = food.nombreEspanol.toLowerCase()
    // Normalize: remove accents for matching, but keep original
    const words = name.split(/[\s,()\-\/]+/).filter(w => w.length >= 2)
    
    for (const word of words) {
      if (!wordMap.has(word)) {
        wordMap.set(word, { count: 0, examples: new Set() })
      }
      const entry = wordMap.get(word)!
      entry.count++
      if (entry.examples.size < 3) {
        entry.examples.add(food.nombreEspanol)
      }
    }
  }
  
  console.log(`Found ${wordMap.size} unique words`)
  
  // Build classification data
  const classifications: Array<{
    word: string
    wordLower: string
    category: string
    subcategory: string | null
    priority: number
    frequency: number
    examples: string
    needsReview: boolean
    notes: string | null
  }> = []
  
  for (const [word, data] of wordMap) {
    const classification = WORD_CLASSIFICATIONS[word]
    
    let category: string
    let subcategory: string | null = null
    let priority: number
    let notes: string | null = null
    
    if (classification) {
      category = classification.category
      subcategory = classification.subcategory || null
      priority = classification.priority
      notes = classification.notes || null
    } else {
      category = 'unknown'
      priority = 4
      notes = 'Needs classification'
    }
    
    // Needs review if unknown or frequent descriptor
    const needsReview = category === 'unknown' || 
                        (category === 'descriptor' && data.count >= 20)
    
    classifications.push({
      word,
      wordLower: word.toLowerCase(),
      category,
      subcategory,
      priority,
      frequency: data.count,
      examples: JSON.stringify([...data.examples]),
      needsReview,
      notes,
    })
  }
  
  // Clear existing
  console.log('Clearing existing classifications...')
  await db.wordClassification.deleteMany({})
  
  // Insert one by one (SQLite doesn't support skipDuplicates well)
  console.log('Inserting classifications...')
  let inserted = 0
  for (const c of classifications) {
    try {
      await db.wordClassification.create({ data: c })
      inserted++
      if (inserted % 100 === 0) {
        console.log(`  Inserted ${inserted}/${classifications.length}`)
      }
    } catch (e) {
      // Skip duplicates silently
    }
  }
  
  // Summary
  const byCategory = new Map<string, number>()
  const needsReviewCount = classifications.filter(c => c.needsReview).length
  
  for (const c of classifications) {
    byCategory.set(c.category, (byCategory.get(c.category) || 0) + 1)
  }
  
  console.log('\n=== CLASSIFICATION SUMMARY ===')
  console.log(`Total words: ${classifications.length}`)
  console.log(`Needs review: ${needsReviewCount}`)
  console.log('\nBy category:')
  for (const [cat, count] of [...byCategory.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`)
  }
  
  // Show unknown words
  console.log('\n=== UNKNOWN WORDS (need review) ===')
  const unknown = classifications.filter(c => c.category === 'unknown').sort((a, b) => b.frequency - a.frequency)
  console.log(`Total unknown: ${unknown.length}`)
  for (const w of unknown.slice(0, 30)) {
    console.log(`  "${w.word}" (${w.frequency})`)
  }
  if (unknown.length > 30) {
    console.log(`  ... and ${unknown.length - 30} more`)
  }
  
  await db.$disconnect()
  console.log('\nDone!')
}

main().catch(console.error)
