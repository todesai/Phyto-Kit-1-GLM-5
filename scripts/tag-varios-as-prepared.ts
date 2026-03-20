/**
 * Script to tag all items with tipoAlimento = "VARIOS" as "prepared"
 * These are prepared food items that should not be linked to parent ingredients
 */

import { db } from '../src/lib/db'

async function main() {
  console.log('Tagging VARIOS items as prepared...')
  
  // Find all items with tipoAlimento = "VARIOS"
  const variosItems = await db.mexicanFood.findMany({
    where: {
      tipoAlimento: 'VARIOS'
    },
    select: {
      id: true,
      nombreEspanol: true,
      hierarchyStatus: true
    }
  })
  
  console.log(`Found ${variosItems.length} items with tipoAlimento = "VARIOS"`)
  
  // Update all VARIOS items to have hierarchyStatus = "prepared"
  const result = await db.mexicanFood.updateMany({
    where: {
      tipoAlimento: 'VARIOS'
    },
    data: {
      hierarchyStatus: 'prepared'
    }
  })
  
  console.log(`Updated ${result.count} items to status "prepared"`)
  
  // Show some examples
  const examples = variosItems.slice(0, 10)
  console.log('\nExamples of tagged items:')
  examples.forEach(item => {
    console.log(`  - ${item.nombreEspanol} (was: ${item.hierarchyStatus})`)
  })
  
  // Count by status
  const statusCounts = await db.mexicanFood.groupBy({
    by: ['hierarchyStatus'],
    _count: true
  })
  
  console.log('\nStatus distribution after update:')
  statusCounts.forEach(s => {
    console.log(`  ${s.hierarchyStatus || 'null'}: ${s._count}`)
  })
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
