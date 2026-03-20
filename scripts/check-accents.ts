import { db } from '../src/lib/db'

// Normalization function
function normalizeForMatching(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u0302\u0304-\u030C\u030E-\u0310\u0312-\u0314\u031A\u031B\u0323-\u0328\u032D-\u0330\u0335-\u0338\u033A\u033B\u0340\u0341\u0358\u035B-\u035D]/g, '')
    .normalize('NFC')
}

async function checkAccents() {
  // Get all confirmed parents
  const parents = await db.mexicanFood.findMany({
    where: { isParent: true },
    select: { id: true, nombreEspanol: true, childCount: true, taxon: true }
  })
  
  // Get all unlinked items (potential children)
  const unlinkedItems = await db.mexicanFood.findMany({
    where: {
      parentIngredientId: null,
      isParent: false,
      tipoAlimento: { notIn: ['VARIOS', 'ADEREZO'] }
    },
    select: { id: true, nombreEspanol: true, hierarchyStatus: true }
  })
  
  console.log(`\n=== PARENTS CONFIRMADOS: ${parents.length} ===\n`)
  
  // For each parent, check for new potential children with accent normalization
  const parentsWithNewChildren: Array<{
    parent: string
    parentId: string
    currentChildren: number
    newPotentialChildren: Array<{ name: string, status: string }>
  }> = []
  
  for (const parent of parents) {
    const normalizedParent = normalizeForMatching(parent.nombreEspanol)
    const isMultiWord = normalizedParent.includes(' ')
    
    // Find potential children with normalized matching
    const potentialChildren = unlinkedItems.filter(item => {
      const normalizedItem = normalizeForMatching(item.nombreEspanol)
      
      let matches: boolean
      if (isMultiWord) {
        matches = normalizedItem.includes(normalizedParent)
      } else {
        const escapedParent = normalizedParent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`\\b${escapedParent}\\b`, 'i')
        matches = regex.test(normalizedItem)
      }
      
      // Not exact match
      const isExact = normalizedItem === normalizedParent
      
      return matches && !isExact
    })
    
    if (potentialChildren.length > 0) {
      parentsWithNewChildren.push({
        parent: parent.nombreEspanol,
        parentId: parent.id,
        currentChildren: parent.childCount,
        newPotentialChildren: potentialChildren.map(i => ({ 
          name: i.nombreEspanol, 
          status: i.hierarchyStatus || 'pending' 
        }))
      })
    }
  }
  
  // Show parents with new potential children
  console.log(`=== PARENTS CON NUEVOS CHILDREN POTENCIALES: ${parentsWithNewChildren.length} ===\n`)
  
  for (const p of parentsWithNewChildren) {
    console.log(`\n📌 ${p.parent} (children actuales: ${p.currentChildren})`)
    console.log(`   Nuevos children potenciales (${p.newPotentialChildren.length}):`)
    for (const child of p.newPotentialChildren.slice(0, 10)) {
      console.log(`   - ${child.name} [${child.status}]`)
    }
    if (p.newPotentialChildren.length > 10) {
      console.log(`   ... y ${p.newPotentialChildren.length - 10} más`)
    }
  }
  
  // Check for accent differences specifically
  console.log(`\n\n=== ANÁLISIS DE ACENTOS ===\n`)
  
  // Find items with accents in the database
  const itemsWithAccents = await db.mexicanFood.findMany({
    where: {
      OR: [
        { nombreEspanol: { contains: 'á' } },
        { nombreEspanol: { contains: 'é' } },
        { nombreEspanol: { contains: 'í' } },
        { nombreEspanol: { contains: 'ó' } },
        { nombreEspanol: { contains: 'ú' } },
        { nombreEspanol: { contains: 'ü' } }
      ]
    },
    select: { id: true, nombreEspanol: true, parentIngredientId: true, isParent: true }
  })
  
  console.log(`Items con acentos en BD: ${itemsWithAccents.length}`)
  
  // Find parents without accents that might match children with accents
  const accentPairs: Array<{ parent: string, children: string[] }> = []
  
  for (const parent of parents) {
    // Check if parent has no accent
    const hasAccent = /[áéíóúü]/.test(parent.nombreEspanol)
    if (hasAccent) continue
    
    // Find children with accents that match
    const childrenWithAccents = itemsWithAccents.filter(item => {
      if (item.isParent) return false
      const normalizedItem = normalizeForMatching(item.nombreEspanol)
      const normalizedParent = normalizeForMatching(parent.nombreEspanol)
      
      if (normalizedParent.includes(' ')) {
        return normalizedItem.includes(normalizedParent) && normalizedItem !== normalizedParent
      } else {
        const escapedParent = normalizedParent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`\\b${escapedParent}\\b`, 'i')
        return regex.test(normalizedItem) && normalizedItem !== normalizedParent
      }
    })
    
    if (childrenWithAccents.length > 0) {
      accentPairs.push({
        parent: parent.nombreEspanol,
        children: childrenWithAccents.map(c => c.nombreEspanol)
      })
    }
  }
  
  console.log(`\nParents SIN acento con children potenciales CON acento: ${accentPairs.length}`)
  for (const pair of accentPairs.slice(0, 20)) {
    console.log(`\n📌 ${pair.parent}:`)
    for (const child of pair.children) {
      console.log(`   - ${child}`)
    }
  }
  if (accentPairs.length > 20) {
    console.log(`\n... y ${accentPairs.length - 20} parents más`)
  }
  
  await db.$disconnect()
}

checkAccents().catch(console.error)
