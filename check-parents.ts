import { db } from './src/lib/db';

async function main() {
  // Get all confirmed parents (isParent = true)
  const confirmedParents = await db.mexicanFood.findMany({
    where: { isParent: true },
    orderBy: { nombreEspanol: 'asc' },
    select: { id: true, nombreEspanol: true, isParent: true, parentIngredientId: true }
  });
  
  console.log('\n=== CONFIRMED PARENTS (' + confirmedParents.length + ') ===');
  confirmedParents.forEach(p => {
    const multiWord = p.nombreEspanol.includes(' ') ? ' [MULTI-WORD]' : '';
    console.log('✓ ' + p.nombreEspanol + multiWord);
  });
  
  // Get all items
  const allItems = await db.mexicanFood.findMany({
    select: { id: true, nombreEspanol: true, isParent: true, parentIngredientId: true, hierarchyStatus: true }
  });
  
  // Get unconfirmed items that could potentially be parents (no parent, not rejected/prepared)
  const potentialParents = allItems.filter(i => 
    !i.isParent && 
    !i.parentIngredientId && 
    i.hierarchyStatus !== 'rejected' && 
    i.hierarchyStatus !== 'prepared'
  );
  
  // Multi-word items that are not confirmed
  const multiWordUnconfirmed = potentialParents.filter(i => i.nombreEspanol.includes(' '));
  
  console.log('\n=== MULTI-WORD UNCONFIRMED ITEMS (' + multiWordUnconfirmed.length + ') ===');
  multiWordUnconfirmed.slice(0, 30).forEach(p => {
    console.log('○ ' + p.nombreEspanol);
  });
  if (multiWordUnconfirmed.length > 30) console.log('... and ' + (multiWordUnconfirmed.length - 30) + ' more');
  
  // Single-word unconfirmed
  const singleWordUnconfirmed = potentialParents.filter(i => !i.nombreEspanol.includes(' '));
  
  console.log('\n=== SINGLE-WORD UNCONFIRMED ITEMS (' + singleWordUnconfirmed.length + ') ===');
  singleWordUnconfirmed.slice(0, 30).forEach(p => {
    console.log('○ ' + p.nombreEspanol);
  });
  if (singleWordUnconfirmed.length > 30) console.log('... and ' + (singleWordUnconfirmed.length - 30) + ' more');
  
  // Items with children already linked (parentIngredientId set)
  const linkedChildren = allItems.filter(i => i.parentIngredientId);
  console.log('\n=== ITEMS WITH PARENT LINKED (' + linkedChildren.length + ') ===');
  linkedChildren.slice(0, 20).forEach(p => {
    console.log('→ ' + p.nombreEspanol);
  });
  if (linkedChildren.length > 20) console.log('... and ' + (linkedChildren.length - 20) + ' more');
  
  await db.$disconnect();
}

main().catch(console.error);
