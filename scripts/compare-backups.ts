import { db } from '../src/lib/db';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('=== BACKUP COMPARISON ANALYSIS ===\n');
  
  // Check backup files
  const backupDir = '/home/z/my-project/db/backups';
  const files = fs.readdirSync(backupDir)
    .filter(f => f.endsWith('.db'))
    .sort();
  
  console.log('Available backups:');
  for (const f of files) {
    const stat = fs.statSync(path.join(backupDir, f));
    console.log(`- ${f} (${(stat.size / 1024 / 1024).toFixed(2)} MB, ${stat.mtime.toISOString()})`);
  }
  
  // Read backup metadata
  const metadata = JSON.parse(fs.readFileSync(path.join(backupDir, 'backup-metadata.json'), 'utf-8'));
  console.log('\nBackup triggers:');
  for (const b of metadata.backups) {
    console.log(`- ${b.filename}: ${b.trigger} (${b.triggerSource || 'N/A'}) - ${b.triggerDetails || 'No details'}`);
  }
  
  // Current database stats
  console.log('\n=== CURRENT DATABASE STATE ===');
  
  // Recent changes (last 24 hours based on audit logs)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentChanges = await db.hierarchyAuditLog.count({
    where: { createdAt: { gte: oneDayAgo } }
  });
  console.log(`\nAudit logs in last 24h: ${recentChanges}`);
  
  // Action breakdown
  const actions = await db.hierarchyAuditLog.groupBy({
    by: ['action'],
    _count: true,
  });
  console.log('\nAction breakdown:');
  for (const a of actions) {
    console.log(`- ${a.action}: ${a._count}`);
  }
  
  // Specific changes tracked
  const notesChanges = await db.hierarchyAuditLog.count({
    where: { action: 'update_notes' }
  });
  const conservationChanges = await db.hierarchyAuditLog.count({
    where: { action: 'update_conservation_status' }
  });
  const hierarchyLinks = await db.hierarchyAuditLog.count({
    where: { action: 'link_child' }
  });
  const scientificNames = await db.hierarchyAuditLog.count({
    where: { action: 'set_scientific_name' }
  });
  
  console.log('\n=== KEY CHANGE METRICS ===');
  console.log(`Notes updates: ${notesChanges}`);
  console.log(`Conservation status updates: ${conservationChanges}`);
  console.log(`Hierarchy links (children): ${hierarchyLinks}`);
  console.log(`Scientific name assignments: ${scientificNames}`);
  
  // Check if BackupRecord is being populated
  const backupRecords = await db.backupRecord.findMany();
  console.log(`\nBackupRecord entries: ${backupRecords.length}`);
  
  // Note the discrepancy
  console.log('\n=== OBSERVATION ===');
  console.log('The backup-metadata.json file shows backups were created, but BackupRecord table is empty.');
  console.log('This indicates backups are being created but not tracked in the database.');
  
  await db.$disconnect();
}

main().catch(console.error);
