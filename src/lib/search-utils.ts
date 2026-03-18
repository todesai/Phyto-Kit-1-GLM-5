/**
 * Shared Search Utilities
 * Provides multi-word search, translation, stemming, descriptor removal,
 * and scoring for all data sources
 */

// ============================================
// DESCRIPTORS TO REMOVE (Preparation states, varieties, cuts)
// ============================================

/**
 * Descriptors that modify the ingredient but don't change its core identity
 * These are removed to find better matches
 */
const PREPARATION_DESCRIPTORS = [
  // Preparation states
  'chopped', 'diced', 'sliced', 'minced', 'grated', 'shredded', 'mashed',
  'crushed', 'ground', 'whole', 'halved', 'quartered', 'julienned',
  'peeled', 'seeded', 'de-seeded', 'cored', 'trimmed', 'cut',
  'fresh', 'dried', 'frozen', 'canned', 'jarred', 'bottled',
  'raw', 'cooked', 'boiled', 'steamed', 'fried', 'baked', 'roasted',
  'pickled', 'fermented', 'smoked', 'cured', 'salted', 'sweetened',
  'unsweetened', 'unsalted', 'low-sodium', 'reduced-fat', 'fat-free',
  'picado', 'picada', 'rebanado', 'rebanada', 'troceado', 'troceada',
  'pelado', 'pelada', 'cocido', 'cocida', 'crudo', 'cruda',
  'fresco', 'fresca', 'seco', 'seca', 'congelado', 'congelada',
  'enlatado', 'enlatada', 'hervido', 'hervida', 'frito', 'frita',
  'asado', 'asada', 'horneado', 'horneada', 'salado', 'salada',
  
  // Size descriptors
  'large', 'medium', 'small', 'baby', 'mini', 'jumbo', 'extra-large',
  'grande', 'mediano', 'mediana', 'pequeno', 'pequena', 'chico', 'chica',
  
  // Quality descriptors
  'organic', 'free-range', 'grass-fed', 'wild-caught', 'farm-raised',
  'organico', 'organica', 'criado en libertad', 'de pastoreo',
  
  // Temperature
  'hot', 'cold', 'warm', 'chilled', 'room temperature',
  'caliente', 'frio', 'fria', 'templado', 'templada',
  
  // Common phrases
  'beaten', 'whisked', 'softened', 'melted', 'divided',
  'batido', 'batida', 'ablandado', 'derretido',
].sort((a, b) => b.length - a.length) // Sort by length (longest first)

/**
 * Cuts and varieties that should map to the base ingredient
 * Key = specific cut/variety, Value = base ingredient(s) to search
 */
const CUT_VARIETY_MAPPINGS: Record<string, string[]> = {
  // Chicken cuts
  'chicken breast': ['chicken', 'pollo'],
  'chicken breasts': ['chicken', 'pollo'],
  'chicken thigh': ['chicken', 'pollo'],
  'chicken thighs': ['chicken', 'pollo'],
  'chicken leg': ['chicken', 'pollo'],
  'chicken legs': ['chicken', 'pollo'],
  'chicken wings': ['chicken', 'pollo'],
  'chicken drumstick': ['chicken', 'pollo'],
  'chicken drumsticks': ['chicken', 'pollo'],
  
  // Beef cuts
  'beef brisket': ['beef', 'res', 'carne de res'],
  'beef fillet': ['beef', 'res', 'carne de res'],
  'beef steak': ['beef', 'res', 'carne de res'],
  'beef mince': ['beef', 'res', 'carne de res'],
  'ground beef': ['beef', 'res', 'carne de res'],
  'minced beef': ['beef', 'res', 'carne de res'],
  'steak': ['beef', 'res', 'carne'],
  
  // Pork cuts
  'pork chop': ['pork', 'cerdo', 'carne de cerdo'],
  'pork chops': ['pork', 'cerdo', 'carne de cerdo'],
  'pork loin': ['pork', 'cerdo', 'carne de cerdo'],
  'pork tenderloin': ['pork', 'cerdo', 'carne de cerdo'],
  'pork shoulder': ['pork', 'cerdo', 'carne de cerdo'],
  'pork belly': ['pork', 'cerdo', 'carne de cerdo'],
  'bacon': ['pork', 'cerdo'],
  'ham': ['pork', 'cerdo'],
  
  // Fish cuts
  'fish fillet': ['fish', 'pescado'],
  'fish fillets': ['fish', 'pescado'],
  'salmon fillet': ['salmon', 'salmon', 'pescado'],
  'salmon fillets': ['salmon', 'salmon', 'pescado'],
  
  // Apple varieties
  'bramley apples': ['apple', 'manzana'],
  'bramley apple': ['apple', 'manzana'],
  'braeburn apples': ['apple', 'manzana'],
  'braeburn apple': ['apple', 'manzana'],
  'granny smith apples': ['apple', 'manzana'],
  'granny smith apple': ['apple', 'manzana'],
  'red apple': ['apple', 'manzana'],
  'green apple': ['apple', 'manzana'],
  'apples': ['apple', 'manzana'],
  
  // Rice varieties
  'brown rice': ['rice', 'arroz'],
  'white rice': ['rice', 'arroz'],
  'basmati rice': ['rice', 'arroz'],
  'jasmine rice': ['rice', 'arroz'],
  'wild rice': ['rice', 'arroz'],
  
  // Potato varieties
  'potatoes': ['potato', 'papa', 'patata'],
  'baked potato': ['potato', 'papa'],
  'mashed potato': ['potato', 'papa'],
  'mashed potatoes': ['potato', 'papa'],
  'french fries': ['potato', 'papa'],
  'chips': ['potato', 'papa'],
  'charlotte potatoes': ['potato', 'papa'],
  'floury potatoes': ['potato', 'papa'],
  
  // Onion varieties
  'onions': ['onion', 'cebolla'],
  'red onion': ['onion', 'cebolla'],
  'white onion': ['onion', 'cebolla'],
  'yellow onion': ['onion', 'cebolla'],
  'green onion': ['onion', 'cebolla', 'cebollin'],
  'spring onion': ['onion', 'cebolla'],
  'shallots': ['onion', 'shallot', 'cebolla'],
  
  // Tomato varieties
  'tomatoes': ['tomato', 'tomate', 'jitomate'],
  'cherry tomatoes': ['tomato', 'tomate'],
  'plum tomatoes': ['tomato', 'tomate'],
  'baby plum tomatoes': ['tomato', 'tomate'],
  'roma tomatoes': ['tomato', 'tomate'],
  'canned tomatoes': ['tomato', 'tomate'],
  'diced tomatoes': ['tomato', 'tomate'],
  'chopped tomatoes': ['tomato', 'tomate'],
  'sun-dried tomatoes': ['tomato', 'tomate'],
  
  // Pepper varieties
  'bell pepper': ['pepper', 'pimiento'],
  'bell peppers': ['pepper', 'pimiento'],
  'red pepper': ['pepper', 'pimiento'],
  'green pepper': ['pepper', 'pimiento'],
  'chili powder': ['chili', 'chile', 'pepper'],
  'chilli': ['chili', 'chile'],
  'chilli powder': ['chili', 'chile'],
  
  // Garlic varieties
  'garlic cloves': ['garlic', 'ajo'],
  'garlic clove': ['garlic', 'ajo'],
  'minced garlic': ['garlic', 'ajo'],
  'garlic powder': ['garlic', 'ajo'],
  
  // Ginger varieties
  'ginger root': ['ginger', 'jengibre'],
  'fresh ginger': ['ginger', 'jengibre'],
  'ground ginger': ['ginger', 'jengibre'],
  
  // Carrot varieties
  'carrots': ['carrot', 'zanahoria'],
  'baby carrots': ['carrot', 'zanahoria'],
  
  // Celery
  'celery stalk': ['celery', 'apio'],
  'celery stalks': ['celery', 'apio'],
  'celery salt': ['celery', 'apio'],
  
  // Cheese
  'cheddar cheese': ['cheese', 'queso'],
  'parmesan cheese': ['cheese', 'queso', 'parmesano'],
  'mozzarella cheese': ['cheese', 'queso', 'mozzarella'],
  'cream cheese': ['cheese', 'queso crema'],
  'feta cheese': ['cheese', 'queso', 'feta'],
  'feta': ['cheese', 'queso', 'feta'],
  'cubed feta cheese': ['cheese', 'queso', 'feta'],
  
  // Cream varieties
  'sour cream': ['cream', 'crema'],
  'heavy cream': ['cream', 'crema'],
  'double cream': ['cream', 'crema'],
  'creme fraiche': ['cream', 'crema'],
  'whipping cream': ['cream', 'crema'],
  'whipped cream': ['cream', 'crema'],
  
  // Milk varieties
  'whole milk': ['milk', 'leche'],
  'skim milk': ['milk', 'leche'],
  'skimmed milk': ['milk', 'leche'],
  'condensed milk': ['milk', 'leche'],
  'evaporated milk': ['milk', 'leche'],
  'coconut milk': ['coconut', 'coco', 'milk', 'leche'],
  
  // Butter
  'salted butter': ['butter', 'mantequilla'],
  'unsalted butter': ['butter', 'mantequilla'],
  'chilled butter': ['butter', 'mantequilla'],
  
  // Sugar varieties
  'brown sugar': ['sugar', 'azucar'],
  'white sugar': ['sugar', 'azucar'],
  'caster sugar': ['sugar', 'azucar'],
  'powdered sugar': ['sugar', 'azucar'],
  'icing sugar': ['sugar', 'azucar'],
  'demerara sugar': ['sugar', 'azucar'],
  'dark brown sugar': ['sugar', 'azucar'],
  'light brown sugar': ['sugar', 'azucar'],
  'soft brown sugar': ['sugar', 'azucar'],
  
  // Flour varieties
  'all-purpose flour': ['flour', 'harina'],
  'plain flour': ['flour', 'harina'],
  'self-raising flour': ['flour', 'harina'],
  'self rising flour': ['flour', 'harina'],
  'whole wheat flour': ['flour', 'harina'],
  'bread flour': ['flour', 'harina'],
  'cake flour': ['flour', 'harina'],
  
  // Egg
  'eggs': ['egg', 'huevo'],
  'egg yolks': ['egg', 'huevo'],
  'egg whites': ['egg', 'huevo'],
  'beaten egg': ['egg', 'huevo'],
  'free-range egg': ['egg', 'huevo'],
  'free-range eggs': ['egg', 'huevo'],
  
  // Oil
  'olive oil': ['oil', 'aceite', 'olive', 'aceituna'],
  'vegetable oil': ['oil', 'aceite'],
  'coconut oil': ['oil', 'aceite', 'coconut', 'coco'],
  'sesame oil': ['oil', 'aceite', 'sesame', 'ajonjoli'],
  
  // Lemon
  'lemon juice': ['lemon', 'limon'],
  'lemon zest': ['lemon', 'limon'],
  'lemons': ['lemon', 'limon'],
  
  // Lime
  'lime juice': ['lime', 'lima'],
  'lime zest': ['lime', 'lima'],
  'limes': ['lime', 'lima'],
  
  // Orange
  'orange juice': ['orange', 'naranja'],
  'orange zest': ['orange', 'naranja'],
  'oranges': ['orange', 'naranja'],
  
  // Mushroom
  'mushrooms': ['mushroom', 'hongo', 'champinon'],
  'chestnut mushroom': ['mushroom', 'hongo', 'champinon'],
  'button mushroom': ['mushroom', 'hongo', 'champinon'],
  
  // Bread
  'breadcrumbs': ['bread', 'pan'],
  'bread crumbs': ['bread', 'pan'],
  'white bread': ['bread', 'pan'],
  'whole wheat bread': ['bread', 'pan'],
  'brown bread': ['bread', 'pan'],
  'digestive biscuits': ['biscuit', 'cookie', 'galleta'],
  
  // Stock
  'chicken stock': ['chicken', 'pollo', 'stock', 'caldo'],
  'beef stock': ['beef', 'res', 'stock', 'caldo'],
  'vegetable stock': ['vegetable', 'verdura', 'stock', 'caldo'],
  
  // Soy sauce
  'soy sauce': ['soy sauce', 'salsa de soya'],
  'dark soy sauce': ['soy sauce', 'salsa de soya'],
  'light soy sauce': ['soy sauce', 'salsa de soya'],
  
  // Vinegar
  'apple cider vinegar': ['vinegar', 'vinagre', 'apple', 'manzana'],
  'balsamic vinegar': ['vinegar', 'vinagre', 'balsamic'],
  'white vinegar': ['vinegar', 'vinagre'],
  'red wine vinegar': ['vinegar', 'vinagre', 'wine', 'vino'],
  
  // Other common items
  'vanilla extract': ['vanilla', 'vainilla'],
  'vanilla essence': ['vanilla', 'vainilla'],
  'almond extract': ['almond', 'almendra'],
  
  // Beans
  'black beans': ['beans', 'frijol', 'frijoles'],
  'kidney beans': ['beans', 'frijol', 'frijoles'],
  'cannellini beans': ['beans', 'frijol', 'frijoles'],
  'borlotti beans': ['beans', 'frijol', 'frijoles'],
  'chickpeas': ['chickpea', 'garbanzo'],
  'brown lentils': ['lentils', 'lentejas', 'lenteja'],
  'french lentils': ['lentils', 'lentejas', 'lenteja'],
  
  // Pasta
  'pasta': ['pasta', 'fideo'],
  'spaghetti': ['pasta', 'spaghetti', 'fideo'],
  'penne': ['pasta', 'penne', 'fideo'],
  'farfalle': ['pasta', 'farfalle', 'fideo'],
  'bowtie pasta': ['pasta', 'fideo'],
  'rigatoni': ['pasta', 'rigatoni', 'fideo'],
  
  // Nuts
  'cashew nuts': ['cashew', 'cashews', 'anacardo'],
  'flaked almonds': ['almond', 'almendra'],
  'slivered almonds': ['almond', 'almendra'],
  'ground almonds': ['almond', 'almendra'],
  'pine nuts': ['pine nut', 'pinon'],
  'walnuts': ['walnut', 'nuez'],
  'pecans': ['pecan', 'nuez'],
  
  // Herbs
  'fresh basil': ['basil', 'albahaca'],
  'fresh thyme': ['thyme', 'tomillo'],
  'fresh parsley': ['parsley', 'perejil'],
  'fresh cilantro': ['cilantro', 'coriander'],
  'coriander leaves': ['coriander', 'cilantro'],
  'coriander seeds': ['coriander', 'cilantro'],
  'dried oregano': ['oregano', 'oregano'],
  'dried thyme': ['thyme', 'tomillo'],
  'bay leaf': ['bay leaf', 'laurel', 'hoja de laurel'],
  'bay leaves': ['bay leaf', 'laurel', 'hoja de laurel'],
  
  // Spices (whole vs ground)
  'cumin seeds': ['cumin', 'comino'],
  'ground cumin': ['cumin', 'comino'],
  'fennel seeds': ['fennel', 'hinojo'],
  'fennel bulb': ['fennel', 'hinojo'],
  'cardamom': ['cardamom', 'cardamomo'],
  'cardamom pods': ['cardamom', 'cardamomo'],
  'cinnamon stick': ['cinnamon', 'canela'],
  'ground cinnamon': ['cinnamon', 'canela'],
  'ground nutmeg': ['nutmeg', 'nuez moscada'],
  'cayenne pepper': ['cayenne', 'cayena', 'pepper', 'pimiento'],
  'black pepper': ['pepper', 'pimienta', 'pimienta negra'],
  'white pepper': ['pepper', 'pimienta', 'pimienta blanca'],
  
  // Coconut
  'coconut cream': ['coconut', 'coco', 'cream', 'crema'],
  'desiccated coconut': ['coconut', 'coco'],
  'shredded coconut': ['coconut', 'coco'],
  'coco sugar': ['coconut sugar', 'azucar de coco', 'sugar'],
  
  // Water
  'cold water': ['water', 'agua'],
  'hot water': ['water', 'agua'],
  'boiling water': ['water', 'agua'],
  'ice water': ['water', 'agua'],
  
  // Wine
  'white wine': ['wine', 'vino blanco', 'vino'],
  'red wine': ['wine', 'vino tinto', 'vino'],
  'dry white wine': ['wine', 'vino blanco', 'vino'],
  
  // Chocolate
  'dark chocolate': ['chocolate'],
  'milk chocolate': ['chocolate'],
  'white chocolate': ['chocolate'],
  'chocolate chips': ['chocolate'],
  'cocoa powder': ['cocoa', 'cacao', 'chocolate'],
  'cacao': ['cocoa', 'cacao', 'chocolate'],
}

// ============================================
// SPICE BLEND COMPONENTS (for AI expansion)
// ============================================

/**
 * Common spice blends and their typical components
 * Used to expand spice blends into individual ingredients
 */
export const SPICE_BLEND_COMPONENTS: Record<string, string[]> = {
  // Mexican
  'taco seasoning': ['cumin', 'chili powder', 'paprika', 'garlic powder', 'onion powder', 'oregano', 'salt'],
  'fajita seasoning': ['cumin', 'chili powder', 'paprika', 'garlic powder', 'onion powder', 'salt', 'pepper'],
  'adobo seasoning': ['garlic powder', 'onion powder', 'oregano', 'salt', 'pepper', 'cumin'],
  'sazon seasoning': ['annatto', 'cumin', 'coriander', 'garlic powder', 'salt'],
  
  // Indian
  'garam masala': ['cumin', 'coriander', 'cardamom', 'cinnamon', 'cloves', 'nutmeg', 'pepper'],
  'curry powder': ['turmeric', 'cumin', 'coriander', 'fenugreek', 'cinnamon', 'cayenne', 'cloves'],
  'biryani masala': ['cumin', 'coriander', 'cardamom', 'cinnamon', 'cloves', 'nutmeg', 'mace', 'pepper'],
  'tandoori masala': ['cumin', 'coriander', 'paprika', 'turmeric', 'ginger', 'garlic', 'cayenne'],
  'chaat masala': ['cumin', 'coriander', 'mango powder', 'black salt', 'ginger', 'pepper'],
  
  // Middle Eastern
  'zaatar': ['thyme', 'oregano', 'marjoram', 'sumac', 'sesame seeds'],
  'ras el hanout': ['cumin', 'coriander', 'cinnamon', 'ginger', 'turmeric', 'pepper', 'cardamom', 'cloves'],
  'baharat': ['pepper', 'cumin', 'cinnamon', 'cloves', 'nutmeg', 'cardamom'],
  'dukkah': ['hazelnuts', 'sesame seeds', 'coriander', 'cumin', 'pepper'],
  
  // Cajun/Creole
  'cajun seasoning': ['paprika', 'cayenne', 'garlic powder', 'onion powder', 'oregano', 'thyme', 'pepper'],
  'creole seasoning': ['paprika', 'cayenne', 'garlic powder', 'onion powder', 'oregano', 'thyme', 'pepper', 'celery salt'],
  'blackened seasoning': ['paprika', 'cayenne', 'garlic powder', 'onion powder', 'thyme', 'pepper'],
  
  // Chinese
  'five spice': ['star anise', 'sichuan pepper', 'fennel', 'cinnamon', 'cloves'],
  'chinese five spice': ['star anise', 'sichuan pepper', 'fennel', 'cinnamon', 'cloves'],
  
  // Herbes de Provence
  'herbes de provence': ['rosemary', 'thyme', 'marjoram', 'oregano', 'savory', 'lavender'],
  
  // Italian
  'italian seasoning': ['oregano', 'basil', 'thyme', 'rosemary', 'marjoram', 'sage'],
  'pizza seasoning': ['oregano', 'basil', 'thyme', 'garlic powder', 'onion powder'],
  
  // BBQ
  'bbq rub': ['paprika', 'brown sugar', 'garlic powder', 'onion powder', 'cumin', 'cayenne', 'salt', 'pepper'],
  'smoked paprika': ['paprika'], // Just paprika for nutrition purposes
  
  // Others
  'pumpkin pie spice': ['cinnamon', 'ginger', 'nutmeg', 'cloves', 'allspice'],
  'apple pie spice': ['cinnamon', 'nutmeg', 'allspice'],
  'pickling spice': ['mustard seeds', 'coriander', 'dill', 'bay leaf', 'pepper', 'cloves', 'cinnamon'],
  'jerk seasoning': ['allspice', 'scotch bonnet', 'thyme', 'cinnamon', 'garlic', 'onion', 'pepper'],
  
  // English
  'english mustard': ['mustard powder', 'turmeric', 'flour', 'salt'],
  'mustard powder': ['mustard'],
}

// ============================================
// TRANSLATION/ALIAS TABLE
// ============================================

/**
 * Translation table for common ingredients
 * Maps English → Spanish and Spanish → English
 * Also includes common aliases and variations
 */
export const INGREDIENT_TRANSLATIONS: Record<string, string[]> = {
  // Fruits
  'apple': ['manzana', 'apple'],
  'manzana': ['manzana', 'apple'],
  'strawberry': ['fresa', 'strawberry', 'frutilla'],
  'fresa': ['fresa', 'strawberry', 'frutilla'],
  'orange': ['naranja', 'orange'],
  'naranja': ['naranja', 'orange'],
  'banana': ['platano', 'banana', 'plátano'],
  'platano': ['platano', 'banana', 'plátano'],
  'lemon': ['limon', 'lemon', 'limón'],
  'limon': ['limon', 'lemon', 'limón'],
  'lime': ['lima', 'lime'],
  'lima': ['lima', 'lime'],
  'pineapple': ['piña', 'pineapple', 'pina'],
  'piña': ['piña', 'pineapple', 'pina'],
  'grape': ['uva', 'grape'],
  'uva': ['uva', 'grape'],
  'watermelon': ['sandia', 'watermelon', 'sandía'],
  'sandia': ['sandia', 'watermelon', 'sandía'],
  'mango': ['mango', 'mangos'],
  'papaya': ['papaya'],
  'peach': ['durazno', 'peach'],
  'durazno': ['durazno', 'peach'],
  'pear': ['pera', 'pear'],
  'pera': ['pera', 'pear'],
  'grapefruit': ['toronja', 'grapefruit'],
  'toronja': ['toronja', 'grapefruit'],
  'guava': ['guayaba', 'guava'],
  'guayaba': ['guayaba', 'guava'],
  'apricot': ['albaricoque', 'apricot', 'chabacano'],
  'chabacano': ['chabacano', 'apricot', 'albaricoque'],
  
  // Vegetables
  'tomato': ['tomate', 'jitomate', 'tomato'],
  'tomate': ['tomate', 'jitomate', 'tomato'],
  'jitomate': ['jitomate', 'tomate', 'tomato'],
  'onion': ['cebolla', 'onion'],
  'cebolla': ['cebolla', 'onion'],
  'garlic': ['ajo', 'garlic'],
  'ajo': ['ajo', 'garlic'],
  'carrot': ['zanahoria', 'carrot'],
  'zanahoria': ['zanahoria', 'carrot'],
  'potato': ['papa', 'potato', 'patata'],
  'papa': ['papa', 'potato', 'patata'],
  'pepper': ['pimiento', 'pepper', 'chile'],
  'chile': ['chile', 'pepper', 'pimiento'],
  'pimiento': ['pimiento', 'pepper'],
  'cucumber': ['pepino', 'cucumber'],
  'pepino': ['pepino', 'cucumber'],
  'lettuce': ['lechuga', 'lettuce'],
  'lechuga': ['lechuga', 'lettuce'],
  'spinach': ['espinaca', 'spinach'],
  'espinaca': ['espinaca', 'spinach'],
  'broccoli': ['brocoli', 'broccoli', 'brócoli'],
  'brocoli': ['brocoli', 'broccoli', 'brócoli'],
  'cauliflower': ['coliflor', 'cauliflower'],
  'coliflor': ['coliflor', 'cauliflower'],
  'corn': ['elote', 'maiz', 'corn', 'maíz'],
  'elote': ['elote', 'maiz', 'corn', 'maíz'],
  'maiz': ['elote', 'maiz', 'corn', 'maíz'],
  'bean': ['frijol', 'bean', 'frijoles'],
  'frijol': ['frijol', 'bean', 'frijoles'],
  'cabbage': ['col', 'repollo', 'cabbage'],
  'col': ['col', 'repollo', 'cabbage'],
  'zucchini': ['calabacin', 'calabacita', 'zucchini', 'courgette'],
  'calabacita': ['calabacita', 'calabacin', 'zucchini'],
  'celery': ['apio', 'celery'],
  'apio': ['apio', 'celery'],
  'eggplant': ['berenjena', 'eggplant', 'aubergine'],
  'aubergine': ['berenjena', 'eggplant', 'aubergine'],
  'berenjena': ['berenjena', 'eggplant'],
  
  // Proteins
  'chicken': ['pollo', 'chicken'],
  'pollo': ['pollo', 'chicken'],
  'beef': ['res', 'carne de res', 'beef'],
  'res': ['res', 'carne de res', 'beef', 'carne'],
  'pork': ['cerdo', 'puerco', 'pork'],
  'cerdo': ['cerdo', 'puerco', 'pork', 'carne de cerdo'],
  'fish': ['pescado', 'fish'],
  'pescado': ['pescado', 'fish'],
  'shrimp': ['camaron', 'shrimp', 'camarón'],
  'camaron': ['camaron', 'shrimp', 'camarón'],
  'egg': ['huevo', 'egg'],
  'huevo': ['huevo', 'egg'],
  'salmon': ['salmon', 'salmon', 'salmón'],
  'salmón': ['salmon', 'salmón'],
  'tuna': ['atun', 'tuna', 'atún'],
  'atun': ['atun', 'tuna', 'atún'],
  
  // Grains & Starches
  'rice': ['arroz', 'rice'],
  'arroz': ['arroz', 'rice'],
  'bread': ['pan', 'bread'],
  'pan': ['pan', 'bread'],
  'pasta': ['pasta', 'fideo', 'tallarines'],
  'fideo': ['fideo', 'pasta', 'noodle'],
  'tortilla': ['tortilla', 'tortillas'],
  'flour': ['harina', 'flour'],
  'harina': ['harina', 'flour'],
  'oat': ['avena', 'oat', 'oats', 'oatmeal'],
  'oats': ['avena', 'oat', 'oats', 'oatmeal'],
  'avena': ['avena', 'oat', 'oats', 'oatmeal'],
  
  // Dairy
  'milk': ['leche', 'milk'],
  'leche': ['leche', 'milk'],
  'cheese': ['queso', 'cheese'],
  'queso': ['queso', 'cheese'],
  'cream': ['crema', 'cream'],
  'crema': ['crema', 'cream'],
  'butter': ['mantequilla', 'butter'],
  'mantequilla': ['mantequilla', 'butter'],
  'yogurt': ['yogurt', 'yogurt', 'yoghurt'],
  'yoghurt': ['yogurt', 'yoghurt'],
  
  // Fats & Oils
  'oil': ['aceite', 'oil'],
  'aceite': ['aceite', 'oil'],
  'olive': ['aceituna', 'olive'],
  'aceituna': ['aceituna', 'olive'],
  
  // Sweeteners
  'sugar': ['azucar', 'sugar', 'azúcar'],
  'azucar': ['azucar', 'sugar', 'azúcar'],
  'honey': ['miel', 'honey'],
  'miel': ['miel', 'honey'],
  
  // Seasonings
  'salt': ['sal', 'salt'],
  'sal': ['sal', 'salt'],
  'vanilla': ['vainilla', 'vanilla'],
  'vainilla': ['vainilla', 'vanilla'],
  'cinnamon': ['canela', 'cinnamon'],
  'canela': ['canela', 'cinnamon'],
  'cumin': ['comino', 'cumin'],
  'comino': ['comino', 'cumin'],
  'oregano': ['oregano', 'oregano', 'orégano'],
  'basil': ['albahaca', 'basil'],
  'albahaca': ['albahaca', 'basil'],
  'thyme': ['tomillo', 'thyme'],
  'tomillo': ['tomillo', 'thyme'],
  'rosemary': ['romero', 'rosemary'],
  'romero': ['romero', 'rosemary'],
  'cilantro': ['cilantro', 'coriander'],
  'coriander': ['cilantro', 'coriander'],
  'parsley': ['perejil', 'parsley'],
  'perejil': ['perejil', 'parsley'],
  'mint': ['menta', 'mint', 'hierbabuena'],
  'menta': ['menta', 'mint'],
  'ginger': ['jengibre', 'ginger'],
  'jengibre': ['jengibre', 'ginger'],
  'nutmeg': ['nuez moscada', 'nutmeg'],
  'turmeric': ['curcuma', 'turmeric', 'cúrcuma'],
  'curcuma': ['curcuma', 'turmeric'],
  
  // Others
  'jam': ['mermelada', 'jam', 'jelly'],
  'mermelada': ['mermelada', 'jam', 'jelly'],
  'chocolate': ['chocolate', 'chocolates'],
  'coffee': ['cafe', 'coffee', 'café'],
  'cafe': ['cafe', 'coffee', 'café'],
  'tea': ['te', 'tea', 'té'],
  'te': ['te', 'tea', 'té'],
  'mushroom': ['hongo', 'champiñon', 'mushroom', 'champiñón'],
  'hongo': ['hongo', 'champiñon', 'mushroom'],
  'champiñon': ['champiñon', 'hongo', 'mushroom', 'champiñón'],
  'nut': ['nuez', 'nut', 'nuts'],
  'nuez': ['nuez', 'nut', 'nuts'],
  'almond': ['almendra', 'almond'],
  'almendra': ['almendra', 'almond'],
  'walnut': ['nuez', 'walnut'],
  'cashew': ['anacardo', 'cashew', 'marañon'],
  'peanut': ['cacahuate', 'mani', 'peanut', 'maní'],
  'cacahuate': ['cacahuate', 'peanut', 'mani', 'maní'],
  'coconut': ['coco', 'coconut'],
  'coco': ['coco', 'coconut'],
  'water': ['agua', 'water'],
  'agua': ['agua', 'water'],
  'wine': ['vino', 'wine'],
  'vino': ['vino', 'wine'],
  'vinegar': ['vinagre', 'vinegar'],
  'vinagre': ['vinagre', 'vinegar'],
  'soy sauce': ['salsa de soya', 'soy sauce', 'soja'],
}

// ============================================
// WORD PROCESSING
// ============================================

/**
 * Connector words to remove from search
 * These are words that don't add meaning to the search
 */
const CONNECTOR_WORDS = new Set([
  // Spanish
  'de', 'del', 'la', 'el', 'las', 'los', 'un', 'una', 'unos', 'unas',
  'y', 'e', 'o', 'u', 'con', 'sin', 'en', 'por', 'para', 'a', 'al',
  'que', 'se', 'su', 'sus',
  // English
  'the', 'a', 'an', 'and', 'or', 'with', 'without', 'in', 'for', 'to',
  'of', 'from', 'on', 'at', 'by', 'is', 'are', 'was', 'were', 'some',
  'any', 'all', 'each', 'every', 'few', 'many', 'much', 'more', 'most',
])

/**
 * Apply stemming to get the singular/base form
 */
function stemWord(word: string): string {
  const lower = word.toLowerCase()
  
  // Common plural endings
  if (lower.endsWith('ies') && lower.length > 4) {
    return lower.slice(0, -3) + 'y' // strawberries → strawberry
  }
  if (lower.endsWith('es') && lower.length > 3) {
    // Check for common -es endings
    if (lower.endsWith('ches') || lower.endsWith('shes') || lower.endsWith('sses') || 
        lower.endsWith('xes') || lower.endsWith('zes')) {
      return lower.slice(0, -2) // dishes → dish
    }
    // tomatoes → tomato
    if (lower.endsWith('oes')) {
      return lower.slice(0, -2)
    }
  }
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 2) {
    return lower.slice(0, -1) // apples → apple
  }
  
  return lower
}

/**
 * Remove preparation descriptors from ingredient name
 */
function removeDescriptors(name: string): string {
  let result = name.toLowerCase()
  
  // Sort by length (longest first) to avoid partial matches
  const sortedDescriptors = [...PREPARATION_DESCRIPTORS].sort((a, b) => b.length - a.length)
  
  for (const descriptor of sortedDescriptors) {
    // Match whole word only
    const regex = new RegExp(`\\b${escapeRegex(descriptor)}\\b`, 'gi')
    result = result.replace(regex, '')
  }
  
  // Clean up multiple spaces
  result = result.replace(/\s+/g, ' ').trim()
  
  return result
}

/**
 * Check if the ingredient matches a cut/variety pattern
 * Returns the base ingredient(s) to search for
 */
function matchCutOrVariety(name: string): string[] | null {
  const lower = name.toLowerCase().trim()
  
  // Direct match
  if (CUT_VARIETY_MAPPINGS[lower]) {
    return CUT_VARIETY_MAPPINGS[lower]
  }
  
  // Try removing descriptors first
  const cleaned = removeDescriptors(lower)
  if (CUT_VARIETY_MAPPINGS[cleaned]) {
    return CUT_VARIETY_MAPPINGS[cleaned]
  }
  
  return null
}

/**
 * Check if ingredient is a spice blend and return its components
 */
export function getSpiceBlendComponents(name: string): string[] | null {
  const lower = name.toLowerCase().trim()
  
  // Direct match
  if (SPICE_BLEND_COMPONENTS[lower]) {
    return SPICE_BLEND_COMPONENTS[lower]
  }
  
  // Check if contains seasoning/masala/etc
  for (const [blend, components] of Object.entries(SPICE_BLEND_COMPONENTS)) {
    if (lower.includes(blend) || blend.includes(lower)) {
      return components
    }
  }
  
  return null
}

/**
 * Clean and normalize a word for searching
 */
export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents for matching
}

/**
 * Process search input into search words with comprehensive normalization
 * - Removes connector words
 * - Applies stemming
 * - Removes descriptors
 * - Checks for cut/variety mappings
 * - Adds translations/aliases
 */
export function processSearchWords(input: string): {
  originalWords: string[]
  searchWords: string[]
  translatedWords: string[]
  baseIngredients: string[] // After cut/variety mapping
} {
  // Split into words
  const originalWords = input
    .toLowerCase()
    .split(/[\s,()]+/)
    .filter(w => w.length >= 2)
  
  // Check for cut/variety mapping FIRST
  const cutVarietyMatch = matchCutOrVariety(input)
  let baseIngredients: string[] = []
  
  if (cutVarietyMatch) {
    baseIngredients = cutVarietyMatch
  }
  
  // Remove connectors, apply stemming, remove descriptors
  let processedInput = input.toLowerCase()
  
  // Remove descriptors
  processedInput = removeDescriptors(processedInput)
  
  // Split into words again after descriptor removal
  const cleanedWords = processedInput
    .split(/[\s,()]+/)
    .filter(w => w.length >= 2 && !CONNECTOR_WORDS.has(w.toLowerCase()))
  
  // Apply stemming to get base forms
  const searchWords = cleanedWords.map(w => stemWord(w)).filter(w => w.length >= 2)
  
  // Get all translations/aliases for each word
  const translatedWords = new Set<string>()
  
  // Add base ingredients from cut/variety mapping
  for (const base of baseIngredients) {
    translatedWords.add(normalizeWord(base))
  }
  
  // Add stemmed search words
  for (const word of searchWords) {
    translatedWords.add(normalizeWord(word))
    
    // Check for translations
    const translations = INGREDIENT_TRANSLATIONS[word]
    if (translations) {
      for (const t of translations) {
        translatedWords.add(normalizeWord(t))
        // Also add stemmed version of translation
        translatedWords.add(normalizeWord(stemWord(t)))
      }
    }
  }
  
  return {
    originalWords,
    searchWords,
    translatedWords: Array.from(translatedWords),
    baseIngredients
  }
}

// ============================================
// SCORING FUNCTIONS
// ============================================

/**
 * Score a match for Mexican DB
 * 
 * ALL rows are treated equally as nutritional samples.
 * Priority: Best match name + Best nutritional data completeness
 */
export function scoreMexicanMatch(
  food: { nombreEspanol: string; nombreIngles?: string | null; nutrientScore?: number | null },
  searchWords: string[],
  translatedWords: string[]
): { score: number; reasons: string[]; matchType: 'exact' | 'word-boundary' | 'starts-with' | 'partial' | 'contains' } {
  const nameEs = (food.nombreEspanol || '').toLowerCase()
  const nameEn = (food.nombreIngles || '').toLowerCase()
  
  let score = 0
  const reasons: string[] = []
  let matchType: 'exact' | 'word-boundary' | 'starts-with' | 'partial' | 'contains' = 'contains'
  
  // BONUS: Full phrase exact match (HIGHEST PRIORITY)
  // This is when the search phrase matches the entire food name
  const searchPhrase = searchWords.join(' ')
  if (nameEs === searchPhrase || nameEn === searchPhrase) {
    score += 3000
    reasons.push(`Full phrase exact match (+3000)`)
    matchType = 'exact'
  }
  
  // Check for exact matches (any translated word) - HIGH PRIORITY
  if (matchType !== 'exact') {
    for (const word of translatedWords) {
      if (nameEs === word || nameEn === word) {
        score += 2000
        reasons.push(`Exact match "${word}" (+2000)`)
        matchType = 'exact'
        break
      }
    }
  }
  
  // Word-boundary matches (whole word) - MEDIUM-HIGH PRIORITY
  if (matchType !== 'exact') {
    let matchedWords = 0
    for (const word of searchWords) {
      const wordRegex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i')
      if (wordRegex.test(nameEs) || wordRegex.test(nameEn)) {
        matchedWords++
      }
    }
    
    if (matchedWords > 0) {
      // Base score for word matches
      score += matchedWords * 500
      reasons.push(`Word-boundary matches: ${matchedWords} (+${matchedWords * 500})`)
      matchType = 'word-boundary'
      
      // BONUS: All search words matched
      if (matchedWords === searchWords.length) {
        score += 1000
        reasons.push(`All words matched (+1000)`)
      }
    }
  }
  
  // Starts-with match - MEDIUM PRIORITY
  if (matchType === 'contains') {
    for (const word of searchWords) {
      if (nameEs.startsWith(word) || nameEn.startsWith(word)) {
        score += 500
        reasons.push(`Starts-with "${word}" (+500)`)
        matchType = 'starts-with'
      }
    }
  }
  
  // Penalize partial word matches (word inside another word)
  const allWords = [...nameEs.split(/[\s,()]+/), ...nameEn.split(/[\s,()]+/)]
  for (const word of searchWords) {
    for (const foodWord of allWords) {
      if (foodWord !== word && foodWord.includes(word) && !CONNECTOR_WORDS.has(foodWord)) {
        score -= 200
        reasons.push(`Partial in "${foodWord}" (-200)`)
        if (matchType === 'contains') matchType = 'partial'
        break
      }
    }
  }
  
  // NO processing penalty - if recipe calls for "fried lechuga", that's what should match
  // The user explicitly stated the processed form, so honor that match
  // Instead, prioritize nutrient completeness to get the best data for whatever form is matched
  
  // Bonus for nutrient score (data completeness) - INCREASED WEIGHT
  // This is crucial: rows with more complete data should be preferred
  const nutrientBonus = Math.min(food.nutrientScore || 0, 100)
  if (nutrientBonus > 0) {
    score += nutrientBonus
    reasons.push(`Nutrient completeness (+${nutrientBonus})`)
  }
  
  // Bonus for single-word matches when search is single word
  // This helps when searching "lechuga" to prefer "Lechuga" over "Lechuga Hojas"
  const foodWords = nameEs.split(/\s+/).filter(w => w.length > 0)
  if (searchWords.length === 1 && foodWords.length === 1) {
    score += 100
    reasons.push('Single-word match (+100)')
  }
  
  return { score, reasons, matchType }
}

/**
 * Score a match for USDA API results
 */
export function scoreUSDAMatch(
  food: { description: string; dataType?: string },
  searchWords: string[],
  translatedWords: string[]
): { score: number; reasons: string[] } {
  const description = (food.description || '').toLowerCase()
  
  let score = 0
  const reasons: string[] = []
  
  // Exact match
  for (const word of translatedWords) {
    if (description === word) {
      score += 1000
      reasons.push(`Exact match (+1000)`)
      break
    }
  }
  
  // Word-boundary matches
  for (const word of searchWords) {
    const wordRegex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i')
    if (wordRegex.test(description)) {
      score += 500
      reasons.push(`Word-boundary (+500)`)
    }
  }
  
  // Starts-with match
  for (const word of searchWords) {
    if (description.startsWith(word)) {
      score += 200
      reasons.push(`Starts-with (+200)`)
    }
  }
  
  // Bonus for certain data types
  if (food.dataType === 'Foundation' || food.dataType === 'Survey (FNDDS)') {
    score += 100
    reasons.push(`Quality data type (+100)`)
  } else if (food.dataType === 'Branded') {
    score -= 50
    reasons.push(`Branded product (-50)`)
  }
  
  // Penalize processed products
  const processedKeywords = [
    'flavored', 'flavour', 'drink', 'juice', 'concentrate', 'powder',
    'frozen', 'canned', 'preserved', 'dehydrated', 'instant',
    'beverage', 'syrup', 'jam', 'jelly'
  ]
  
  for (const keyword of processedKeywords) {
    if (description.includes(keyword)) {
      score -= 150
      reasons.push(`Processed (-150)`)
      break
    }
  }
  
  // Bonus for raw/fresh foods
  if (description.includes('raw') || description.includes('fresh')) {
    score += 200
    reasons.push(`Raw/fresh (+200)`)
  }
  
  return { score, reasons }
}

/**
 * Score a match for PhytoHub compounds
 */
export function scorePhytoHubMatch(
  compound: { name: string; foodSources?: string | null },
  searchWords: string[],
  translatedWords: string[]
): { score: number; reasons: string[] } {
  const name = (compound.name || '').toLowerCase()
  const foodSources = compound.foodSources 
    ? JSON.parse(compound.foodSources).map((f: string) => f.toLowerCase())
    : []
  
  let score = 0
  const reasons: string[] = []
  
  // Check if search term matches compound name
  for (const word of searchWords) {
    if (name.includes(word)) {
      score += 800
      reasons.push(`Compound name match (+800)`)
      break
    }
  }
  
  // Check food sources
  for (const foodSource of foodSources) {
    for (const word of translatedWords) {
      if (foodSource.includes(word)) {
        score += 500
        reasons.push(`Food source match (+500)`)
        break
      }
    }
  }
  
  return { score, reasons }
}

// ============================================
// QUERY BUILDERS
// ============================================

/**
 * Build Prisma where clause for multi-word AND search
 */
export function buildMultiWordWhere(
  searchWords: string[],
  translatedWords: string[],
  fields: string[]
): any {
  if (searchWords.length === 0) {
    return {}
  }
  
  // For single word, use OR with all translations
  if (searchWords.length === 1) {
    return {
      OR: fields.map(field => ({
        OR: translatedWords.map(word => ({
          [field]: { contains: word }
        }))
      }))
    }
  }
  
  // For multiple words, each word must be present (AND)
  // But each word can match any of its translations
  return {
    AND: searchWords.map(word => {
      const translations = INGREDIENT_TRANSLATIONS[word] || [word]
      const allVariants = [word, ...translations.filter(t => t !== word)]
      
      return {
        OR: fields.map(field => ({
          OR: allVariants.map(v => ({
            [field]: { contains: v }
          }))
        }))
      }
    })
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Get category priority for sorting results
 */
export function getCategoryPriority(category: string): number {
  const priorities: Record<string, number> = {
    'FRUTAS': 1,
    'VERDURAS': 2,
    'TUBERCULOS, BULBOS Y RAICES': 3,
    'PESCADOS Y MARISCOS': 4,
    'SEMILLAS DE LEGUMINOSAS Y DERIVADOS': 5,
    'SEMILLAS DE CEREALES Y DERIVADOS': 6,
    'LECHE Y DERIVADOS': 7,
    'OTRAS SEMILLAS': 8,
    'AZÚCARES, MIELES Y DULCES': 9,
    'BEBIDAS ALCOHOLICAS Y NO ALCOHOLICAS': 10,
    'ALGAS Y HONGOS': 11,
    'INSECTOS': 12,
    'VARIOS': 13,
  }
  
  return priorities[category] || 99
}

/**
 * Get icon for category
 */
export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'FRUTAS': '🍎',
    'VERDURAS': '🥬',
    'TUBERCULOS, BULBOS Y RAICES': '🥕',
    'PESCADOS Y MARISCOS': '🐟',
    'SEMILLAS DE LEGUMINOSAS Y DERIVADOS': '🫘',
    'SEMILLAS DE CEREALES Y DERIVADOS': '🌾',
    'LECHE Y DERIVADOS': '🥛',
    'OTRAS SEMILLAS': '🌰',
    'AZÚCARES, MIELES Y DULCES': '🍯',
    'BEBIDAS ALCOHOLICAS Y NO ALCOHOLICAS': '🥤',
    'ALGAS Y HONGOS': '🍄',
    'INSECTOS': '🦗',
    'VARIOS': '📦',
  }
  
  return icons[category] || '📁'
}
