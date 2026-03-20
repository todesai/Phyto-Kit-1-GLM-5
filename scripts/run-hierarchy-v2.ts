/**
 * Standalone script to run the optimized hierarchy algorithm
 * This runs outside the Next.js API to avoid timeouts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// IMPROVED HIERARCHY ALGORITHM CONSTANTS
// ============================================

const PROCESSING_DESCRIPTORS = [
  'molido', 'molida', 'en polvo', 'polvo', 'seco', 'seca', 'fresco', 'fresca',
  'ahumado', 'ahumada', 'asado', 'asada', 'tostado', 'tostada', 'cocido', 'cocida',
  'crudo', 'cruda', 'fermentado', 'salado', 'salada', 'deshidratado', 'congelado',
  'enlatado', 'en conserva', 'hervido', 'hervida', 'pasteurizado', 'pasteurizada',
  'ultrapasteurizado', 'ultrapasteurizada',
];

const CUT_DESCRIPTORS = [
  'picado', 'picada', 'cortado', 'cortada', 'rebanado', 'rebanada', 'rallado', 'rallada',
  'fileteado', 'trozado', 'troceado', 'entero', 'entera', 'mitad', 'mitades', 'cuarto',
  'rodaja', 'rodajas', 'cubos', 'juliana', 'brunoise',
];

const STATE_DESCRIPTORS = [
  'maduro', 'madura', 'verde', 'tierno', 'tierna', 'duro', 'dura', 'blando', 'blanda', 'madurado',
];

const SIZE_DESCRIPTORS = [
  'grande', 'grandes', 'pequeño', 'pequeña', 'pequeños', 'pequeñas',
  'chico', 'chica', 'chicos', 'chicas', 'mediano', 'medianos', 'medianas', 'gigante', 'gigantes',
];

const DERIVED_PRODUCT_PREFIXES = [
  'miel de', 'aceite de', 'harina de', 'jugo de', 'zumo de', 'extracto de',
  'esencia de', 'concentrado de', 'jarabe de', 'sirope de', 'pasta de', 'salsa de',
  'puré de', 'pure de', 'pulpa de', 'vino de', 'vinagre de', 'licor de',
];

const ENTITY_INDICATORS = [
  'gusano de', 'larva de', 'oruga de', 'mariposa de', 'hongo de', 'flor de',
];

const VALID_CHILD_DESCRIPTORS = [
  ...PROCESSING_DESCRIPTORS, ...CUT_DESCRIPTORS, ...STATE_DESCRIPTORS, ...SIZE_DESCRIPTORS,
].map(d => d.toLowerCase());

// ============================================
// HELPER FUNCTIONS
// ============================================

function isDerivedProduct(name: string): { isDerived: boolean; productType: string | null } {
  const lower = name.toLowerCase();
  for (const prefix of DERIVED_PRODUCT_PREFIXES) {
    if (lower.startsWith(prefix)) {
      return { isDerived: true, productType: prefix.replace(' de', '').trim() };
    }
  }
  return { isDerived: false, productType: null };
}

function isDifferentEntity(name: string): { isDifferent: boolean; entityType: string | null } {
  const lower = name.toLowerCase();
  for (const indicator of ENTITY_INDICATORS) {
    if (lower.startsWith(indicator)) {
      return { isDifferent: true, entityType: indicator.replace(' de', '').trim() };
    }
  }
  return { isDifferent: false, entityType: null };
}

function extractProcessingDescriptor(fullName: string): { baseName: string; descriptor: string | null; descriptorType: string | null } {
  const normalized = fullName.toLowerCase().trim();
  
  const derivedCheck = isDerivedProduct(fullName);
  if (derivedCheck.isDerived) {
    return { baseName: normalized, descriptor: derivedCheck.productType, descriptorType: 'derived_product' };
  }
  
  const entityCheck = isDifferentEntity(fullName);
  if (entityCheck.isDifferent) {
    return { baseName: normalized, descriptor: entityCheck.entityType, descriptorType: 'different_entity' };
  }
  
  for (const descriptor of VALID_CHILD_DESCRIPTORS) {
    const endPattern = new RegExp(`\\s+${descriptor}\\s*$`, 'i');
    if (endPattern.test(normalized)) {
      const baseName = normalized.replace(endPattern, '').trim();
      if (baseName && baseName.length >= 2) {
        let descriptorType = 'processing';
        if (CUT_DESCRIPTORS.includes(descriptor)) descriptorType = 'cut';
        else if (STATE_DESCRIPTORS.includes(descriptor)) descriptorType = 'state';
        else if (SIZE_DESCRIPTORS.includes(descriptor)) descriptorType = 'size';
        return { baseName, descriptor, descriptorType };
      }
    }
  }
  
  return { baseName: normalized, descriptor: null, descriptorType: null };
}

function normalizeTaxon(taxon: string | null): string | null {
  if (!taxon) return null;
  return taxon.toLowerCase().trim();
}

// ============================================
// MAIN ALGORITHM
// ============================================

async function runHierarchyAlgorithm() {
  console.log('Starting optimized hierarchy algorithm...');
  const startTime = Date.now();
  
  // Step 1: Reset all hierarchy data
  console.log('Step 1: Resetting hierarchy data...');
  await prisma.mexicanFood.updateMany({
    data: { 
      isParent: false, 
      parentIngredientId: null, 
      childCount: 0,
      nombreBase: null,
      descriptor: null,
    },
  });
  
  // Step 2: Get all foods
  console.log('Step 2: Fetching all foods...');
  const foods = await prisma.mexicanFood.findMany({
    select: { id: true, nombreEspanol: true, taxon: true, nutrientScore: true },
  });
  console.log(`Found ${foods.length} foods`);
  
  // Step 3: Process descriptor extraction IN MEMORY
  console.log('Step 3: Extracting descriptors in memory...');
  const foodWithDescriptors = foods.map(food => {
    const { baseName, descriptor, descriptorType } = extractProcessingDescriptor(food.nombreEspanol);
    return { ...food, baseName, descriptor, descriptorType };
  });
  
  // Step 4: Batch update nombreBase and descriptor
  console.log('Step 4: Batch updating descriptors...');
  const batchSize = 500;
  for (let i = 0; i < foodWithDescriptors.length; i += batchSize) {
    const batch = foodWithDescriptors.slice(i, i + batchSize);
    await Promise.all(
      batch.map(food => 
        prisma.mexicanFood.update({
          where: { id: food.id },
          data: { nombreBase: food.baseName, descriptor: food.descriptor },
        })
      )
    );
    console.log(`  Updated ${Math.min(i + batchSize, foodWithDescriptors.length)}/${foodWithDescriptors.length}`);
  }
  
  // Step 5: Group by taxon
  console.log('Step 5: Grouping by taxon...');
  const taxonGroups: Map<string, typeof foodWithDescriptors> = new Map();
  const noTaxonFoods: typeof foodWithDescriptors = [];
  
  for (const food of foodWithDescriptors) {
    if (food.taxon) {
      const normalizedTaxon = normalizeTaxon(food.taxon)!;
      if (!taxonGroups.has(normalizedTaxon)) {
        taxonGroups.set(normalizedTaxon, []);
      }
      taxonGroups.get(normalizedTaxon)!.push(food);
    } else {
      noTaxonFoods.push(food);
    }
  }
  
  console.log(`  Taxon groups: ${taxonGroups.size}, No taxon: ${noTaxonFoods.length}`);
  
  // Step 6: Process taxon groups
  console.log('Step 6: Processing taxon groups...');
  let parentCount = 0;
  let childCount = 0;
  const updates: Promise<unknown>[] = [];
  const hierarchyBatchSize = 100;
  
  for (const [taxon, items] of taxonGroups) {
    if (items.length === 1) continue;
    
    // Filter out derived products and different entities
    const validChildren = items.filter(item => {
      const derivedCheck = isDerivedProduct(item.nombreEspanol);
      const entityCheck = isDifferentEntity(item.nombreEspanol);
      return !derivedCheck.isDerived && !entityCheck.isDifferent;
    });
    
    if (validChildren.length <= 1) continue;
    
    // Find best parent: prefer items without descriptor
    const noDescriptorItems = validChildren.filter(i => !i.descriptor || i.descriptorType === 'color');
    const candidates = noDescriptorItems.length > 0 ? noDescriptorItems : validChildren;
    
    // Sort by nutrient score, then by name length
    const parent = candidates.sort((a, b) => {
      const scoreDiff = (b.nutrientScore || 0) - (a.nutrientScore || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return a.nombreEspanol.length - b.nombreEspanol.length;
    })[0];
    
    const children = validChildren.filter(i => i.id !== parent.id);
    
    updates.push(
      prisma.mexicanFood.update({
        where: { id: parent.id },
        data: { isParent: true, childCount: children.length },
      })
    );
    parentCount++;
    
    for (const child of children) {
      updates.push(
        prisma.mexicanFood.update({
          where: { id: child.id },
          data: { parentIngredientId: parent.id },
        })
      );
      childCount++;
    }
    
    if (updates.length >= hierarchyBatchSize) {
      await Promise.all(updates.splice(0, hierarchyBatchSize));
    }
  }
  
  // Step 7: Process items without taxon (conservative)
  console.log('Step 7: Processing items without taxon...');
  const baseNameGroups: Map<string, typeof foodWithDescriptors> = new Map();
  
  for (const food of noTaxonFoods) {
    if (food.descriptorType && ['processing', 'cut', 'state'].includes(food.descriptorType)) {
      if (!baseNameGroups.has(food.baseName)) {
        baseNameGroups.set(food.baseName, []);
      }
      baseNameGroups.get(food.baseName)!.push(food);
    }
  }
  
  for (const [baseName, items] of baseNameGroups) {
    if (items.length <= 1) continue;
    
    const noDescriptorItems = items.filter(i => !i.descriptor);
    if (noDescriptorItems.length === 0) continue;
    
    const parent = noDescriptorItems.sort((a, b) => {
      const scoreDiff = (b.nutrientScore || 0) - (a.nutrientScore || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return a.nombreEspanol.length - b.nombreEspanol.length;
    })[0];
    
    const children = items.filter(i => i.id !== parent.id);
    
    updates.push(
      prisma.mexicanFood.update({
        where: { id: parent.id },
        data: { isParent: true, childCount: children.length },
      })
    );
    parentCount++;
    
    for (const child of children) {
      updates.push(
        prisma.mexicanFood.update({
          where: { id: child.id },
          data: { parentIngredientId: parent.id },
        })
      );
      childCount++;
    }
    
    if (updates.length >= hierarchyBatchSize) {
      await Promise.all(updates.splice(0, hierarchyBatchSize));
    }
  }
  
  // Execute remaining updates
  if (updates.length > 0) {
    await Promise.all(updates);
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('\n=== Algorithm Complete ===');
  console.log(`Time: ${elapsed}s`);
  console.log(`Parents: ${parentCount}`);
  console.log(`Children: ${childCount}`);
  console.log(`Taxon groups: ${taxonGroups.size}`);
  console.log(`Base name groups: ${baseNameGroups.size}`);
  
  return { parentCount, childCount, elapsed };
}

// Run
runHierarchyAlgorithm()
  .then(result => {
    console.log('\nResult:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
