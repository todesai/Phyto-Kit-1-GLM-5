import { db } from '../src/lib/db';

async function main() {
  console.log('=== DATABASE CHANGE ANALYSIS ===\n');
  
  // Count audit logs
  const auditCount = await db.hierarchyAuditLog.count();
  console.log('Total audit logs:', auditCount);
  
  // Get recent audit logs
  const recentAudits = await db.hierarchyAuditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 15
  });
  
  console.log('\n=== Recent Audit Logs ===');
  for (const log of recentAudits) {
    console.log(`[${log.createdAt.toISOString()}] ${log.action}: ${log.itemName}`);
    if (log.oldNotes !== log.newNotes) {
      console.log(`  Notes: '${log.oldNotes || '(none)'}' -> '${log.newNotes || '(none)'}'`);
    }
    if (log.oldParentName !== log.newParentName) {
      console.log(`  Parent: '${log.oldParentName || '(none)'}' -> '${log.newParentName || '(none)'}'`);
    }
    if (log.oldStatus !== log.newStatus) {
      console.log(`  Status: '${log.oldStatus || '(none)'}' -> '${log.newStatus || '(none)'}'`);
    }
  }
  
  // Check items with notes
  const itemsWithNotes = await db.mexicanFood.findMany({
    where: { notes: { not: null } },
    select: { nombreEspanol: true, notes: true, updatedAt: true }
  });
  console.log('\n=== Items with Notes ===');
  console.log('Total:', itemsWithNotes.length);
  for (const item of itemsWithNotes) {
    console.log(`- ${item.nombreEspanol}: "${item.notes}" (updated: ${item.updatedAt.toISOString()})`);
  }
  
  // Check conservation status data
  const itemsWithConservation = await db.mexicanFood.count({
    where: { conservationStatus: { not: null } }
  });
  console.log('\nItems with conservation status:', itemsWithConservation);
  
  // Check hierarchy status breakdown
  const confirmed = await db.mexicanFood.count({ where: { hierarchyStatus: 'confirmed' } });
  const pending = await db.mexicanFood.count({ where: { hierarchyStatus: 'pending' } });
  const rejected = await db.mexicanFood.count({ where: { hierarchyStatus: 'rejected' } });
  const needsReview = await db.mexicanFood.count({ where: { hierarchyStatus: 'needs_review' } });
  const nullStatus = await db.mexicanFood.count({ where: { hierarchyStatus: null } });
  console.log('\n=== Hierarchy Status ===');
  console.log({ confirmed, pending, rejected, needsReview, nullStatus });
  
  // Check parents
  const parents = await db.mexicanFood.count({ where: { isParent: true } });
  const children = await db.mexicanFood.count({ where: { parentIngredientId: { not: null } } });
  const totalItems = await db.mexicanFood.count();
  console.log('\n=== Ingredient Hierarchy ===');
  console.log(`Total items: ${totalItems}`);
  console.log(`Parents: ${parents} | Children: ${children} | Standalone: ${totalItems - parents - children}`);
  
  // Check word classifications
  const wordClassCount = await db.wordClassification.count();
  const wordsNeedingReview = await db.wordClassification.count({ where: { needsReview: true } });
  console.log('\n=== Word Classifications ===');
  console.log(`Total: ${wordClassCount} | Needs Review: ${wordsNeedingReview}`);
  
  // Check BackupRecord
  const backupCount = await db.backupRecord.count();
  console.log('\n=== Backup Records ===');
  console.log('Total backups tracked:', backupCount);
  
  await db.$disconnect();
}

main().catch(console.error);
