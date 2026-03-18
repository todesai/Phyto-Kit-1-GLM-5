import { NextRequest, NextResponse } from 'next/server'

// Mock global edible items database
// In production, this would be fetched from the Global Edible Items database
const GLOBAL_EDIBLE_ITEMS = [
  { id: '1', name: 'Apple', scientificName: 'Malus domestica', category: 'Fruit' },
  { id: '2', name: 'Orange', scientificName: 'Citrus sinensis', category: 'Fruit' },
  { id: '3', name: 'Lemon', scientificName: 'Citrus limon', category: 'Fruit' },
  { id: '4', name: 'Lime', scientificName: 'Citrus aurantiifolia', category: 'Fruit' },
  { id: '5', name: 'Banana', scientificName: 'Musa paradisiaca', category: 'Fruit' },
  { id: '6', name: 'Pineapple', scientificName: 'Ananas comosus', category: 'Fruit' },
  { id: '7', name: 'Mango', scientificName: 'Mangifera indica', category: 'Fruit' },
  { id: '8', name: 'Papaya', scientificName: 'Carica papaya', category: 'Fruit' },
  { id: '9', name: 'Avocado', scientificName: 'Persea americana', category: 'Fruit' },
  { id: '10', name: 'Tomato', scientificName: 'Solanum lycopersicum', category: 'Vegetable' },
  { id: '11', name: 'Potato', scientificName: 'Solanum tuberosum', category: 'Vegetable' },
  { id: '12', name: 'Sweet Potato', scientificName: 'Ipomoea batatas', category: 'Vegetable' },
  { id: '13', name: 'Carrot', scientificName: 'Daucus carota', category: 'Vegetable' },
  { id: '14', name: 'Onion', scientificName: 'Allium cepa', category: 'Vegetable' },
  { id: '15', name: 'Garlic', scientificName: 'Allium sativum', category: 'Vegetable' },
  { id: '16', name: 'Pepper', scientificName: 'Capsicum annuum', category: 'Vegetable' },
  { id: '17', name: 'Chili', scientificName: 'Capsicum frutescens', category: 'Vegetable' },
  { id: '18', name: 'Corn', scientificName: 'Zea mays', category: 'Cereal' },
  { id: '19', name: 'Rice', scientificName: 'Oryza sativa', category: 'Cereal' },
  { id: '20', name: 'Wheat', scientificName: 'Triticum aestivum', category: 'Cereal' },
  { id: '21', name: 'Beans', scientificName: 'Phaseolus vulgaris', category: 'Legume' },
  { id: '22', name: 'Soybean', scientificName: 'Glycine max', category: 'Legume' },
  { id: '23', name: 'Peanut', scientificName: 'Arachis hypogaea', category: 'Legume' },
  { id: '24', name: 'Chicken', scientificName: 'Gallus gallus domesticus', category: 'Meat' },
  { id: '25', name: 'Beef', scientificName: 'Bos taurus', category: 'Meat' },
  { id: '26', name: 'Pork', scientificName: 'Sus scrofa domesticus', category: 'Meat' },
  { id: '27', name: 'Fish', scientificName: null, category: 'Seafood' },
  { id: '28', name: 'Shrimp', scientificName: 'Penaeus spp.', category: 'Seafood' },
  { id: '29', name: 'Cocoa', scientificName: 'Theobroma cacao', category: 'Beverage' },
  { id: '30', name: 'Coffee', scientificName: 'Coffea arabica', category: 'Beverage' },
  { id: '31', name: 'Nopales', scientificName: 'Opuntia spp.', category: 'Vegetable' },
  { id: '32', name: 'Chayote', scientificName: 'Sechium edule', category: 'Vegetable' },
  { id: '33', name: 'Jicama', scientificName: 'Pachyrhizus erosus', category: 'Vegetable' },
  { id: '34', name: 'Tomatillo', scientificName: 'Physalis philadelphica', category: 'Vegetable' },
  { id: '35', name: 'Huitlacoche', scientificName: 'Ustilago maydis', category: 'Fungus' },
  { id: '36', name: 'Epazote', scientificName: 'Dysphania ambrosioides', category: 'Herb' },
  { id: '37', name: 'Cilantro', scientificName: 'Coriandrum sativum', category: 'Herb' },
  { id: '38', name: 'Oregano', scientificName: 'Origanum vulgare', category: 'Herb' },
  { id: '39', name: 'Cumin', scientificName: 'Cuminum cyminum', category: 'Spice' },
  { id: '40', name: 'Cinnamon', scientificName: 'Cinnamomum verum', category: 'Spice' },
  { id: '41', name: 'Vanilla', scientificName: 'Vanilla planifolia', category: 'Spice' },
  { id: '42', name: 'Amaranth', scientificName: 'Amaranthus spp.', category: 'Cereal' },
  { id: '43', name: 'Chia', scientificName: 'Salvia hispanica', category: 'Seed' },
  { id: '44', name: 'Mezquite', scientificName: 'Prosopis spp.', category: 'Tree' },
  { id: '45', name: 'Avocado leaf', scientificName: 'Persea americana', category: 'Herb' },
  { id: '46', name: 'Hoja santa', scientificName: 'Piper auritum', category: 'Herb' },
  { id: '47', name: 'Chile de árbol', scientificName: 'Capsicum annuum', category: 'Vegetable' },
  { id: '48', name: 'Chipotle', scientificName: 'Capsicum annuum', category: 'Vegetable' },
  { id: '49', name: 'Poblano', scientificName: 'Capsicum annuum', category: 'Vegetable' },
  { id: '50', name: 'Jalapeño', scientificName: 'Capsicum annuum', category: 'Vegetable' },
]

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '100')

    let items = GLOBAL_EDIBLE_ITEMS

    if (search) {
      const searchLower = search.toLowerCase()
      items = items.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        (item.scientificName && item.scientificName.toLowerCase().includes(searchLower))
      )
    }

    return NextResponse.json({
      success: true,
      items: items.slice(0, limit),
      total: items.length
    })
  } catch (error) {
    console.error('Global edible items error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
