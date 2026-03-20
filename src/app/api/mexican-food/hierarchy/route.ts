import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// ============================================
// IMPROVED HIERARCHY ALGORITHM
// ============================================

// True processing descriptors that indicate a derived form of the SAME ingredient
// These are transformations that don't change the biological entity
const PROCESSING_DESCRIPTORS = [
  // Processing methods (same species, different form)
  'molido', 'molida',        // ground
  'en polvo', 'polvo',       // powder
  'seco', 'seca',            // dried
  'fresco', 'fresca',        // fresh
  'ahumado', 'ahumada',      // smoked
  'asado', 'asada',          // roasted
  'tostado', 'tostada',      // toasted
  'cocido', 'cocida',        // cooked
  'crudo', 'cruda',          // raw
  'fermentado',              // fermented
  'salado', 'salada',        // salted
  'deshidratado',            // dehydrated
  'congelado',               // frozen
  'enlatado',                // canned
  'en conserva',             // preserved
  'hervido', 'hervida',      // boiled
  'pasteurizado', 'pasteurizada', // pasteurized
  'ultrapasteurizado', 'ultrapasteurizada', // ultra-pasteurized
];

// Cut/shape descriptors (same species, different cut)
const CUT_DESCRIPTORS = [
  'picado', 'picada',        // chopped
  'cortado', 'cortada',      // cut
  'rebanado', 'rebanada',    // sliced
  'rallado', 'rallada',      // grated
  'fileteado',               // filleted
  'trozado', 'troceado',     // chunked
  'entero', 'entera',        // whole
  'mitad', 'mitades',        // half/halves
  'cuarto',                  // quarter
  'rodaja', 'rodajas',       // slice(s)
  'cubos',                   // cubes
  'juliana',                 // julienne
  'brunoise',                // brunoise
];

// State/maturity descriptors (same species, different state)
const STATE_DESCRIPTORS = [
  'maduro', 'madura',        // ripe
  'verde',                   // unripe/green
  'tierno', 'tierna',        // tender
  'duro', 'dura',            // hard
  'blando', 'blanda',        // soft
  'madurado',                // aged
];

// Color/variety descriptors - THESE MAY INDICATE DIFFERENT VARIETIES
// Same species, but different cultivars - still valid parent-child
const COLOR_DESCRIPTORS = [
  'rojo', 'roja',
  'verde',
  'amarillo', 'amarilla',
  'negro', 'negra',
  'blanco', 'blanca',
  'morado', 'morada',
  'naranja',
  'rosa',
  'azul',
];

// Size descriptors
const SIZE_DESCRIPTORS = [
  'grande', 'grandes',
  'pequeño', 'pequeña', 'pequeños', 'pequeñas',
  'chico', 'chica', 'chicos', 'chicas',
  'mediano', 'medianos', 'medianas',
  'gigante', 'gigantes',
];

// DERIVED PRODUCT indicators - These are DIFFERENT entities
// "Miel de X" = honey FROM X (different product, different species in final form)
// "Aceite de X" = oil FROM X
// These should NOT be children of X in a biological sense
const DERIVED_PRODUCT_PREFIXES = [
  'miel de',           // honey from
  'aceite de',         // oil from
  'harina de',         // flour from
  'jugo de', 'zumo de', // juice from
  'extracto de',       // extract from
  'esencia de',        // essence from
  'concentrado de',    // concentrate from
  'jarabe de', 'sirope de', // syrup from
  'pasta de',          // paste from
  'salsa de',          // sauce from
  'puré de', 'pure de', // puree from
  'pulpa de',          // pulp from
  'vino de',           // wine from
  'vinagre de',        // vinegar from
  'licor de',          // liquor from
];

// Entity indicators - These live ON or WITH the named organism
// NOT derived FROM it - completely different biological entities
const ENTITY_INDICATORS = [
  'gusano de',         // worm from/living on
  'larva de',          // larva from/living on
  'oruga de',          // caterpillar from
  'mariposa de',       // butterfly from
  'hongo de',          // fungus from/growing on
  'flor de',           // flower of (plant part, but often different usage)
];

// All valid child descriptors (processing + cuts + states)
const VALID_CHILD_DESCRIPTORS = [
  ...PROCESSING_DESCRIPTORS,
  ...CUT_DESCRIPTORS,
  ...STATE_DESCRIPTORS,
  ...SIZE_DESCRIPTORS,
].map(d => d.toLowerCase());

/**
 * Check if a name represents a derived product (different entity)
 * Example: "Miel de Maguey" is honey made from maguey, not a form of maguey
 */
function isDerivedProduct(name: string): { isDerived: boolean; productType: string | null; sourceName: string | null } {
  const lower = name.toLowerCase();
  
  for (const prefix of DERIVED_PRODUCT_PREFIXES) {
    if (lower.startsWith(prefix)) {
      const sourceName = lower.replace(prefix, '').trim();
      return { isDerived: true, productType: prefix.replace(' de', '').trim(), sourceName };
    }
  }
  
  return { isDerived: false, productType: null, sourceName: null };
}

/**
 * Check if a name represents a different biological entity
 * Example: "Gusano de Maguey" is a worm that lives ON maguey, not derived FROM it
 */
function isDifferentEntity(name: string): { isDifferent: boolean; entityType: string | null; sourceName: string | null } {
  const lower = name.toLowerCase();
  
  for (const indicator of ENTITY_INDICATORS) {
    if (lower.startsWith(indicator)) {
      const sourceName = lower.replace(indicator, '').trim();
      return { isDifferent: true, entityType: indicator.replace(' de', '').trim(), sourceName };
    }
  }
  
  return { isDifferent: false, entityType: null, sourceName: null };
}

/**
 * Extract processing descriptor from a name
 * Only returns VALID child descriptors (processing forms)
 */
function extractProcessingDescriptor(fullName: string): { baseName: string; descriptor: string | null; descriptorType: string | null } {
  const normalized = fullName.toLowerCase().trim();
  
  // First check if this is a derived product or different entity
  const derivedCheck = isDerivedProduct(fullName);
  if (derivedCheck.isDerived) {
    return { 
      baseName: normalized, 
      descriptor: derivedCheck.productType, 
      descriptorType: 'derived_product' 
    };
  }
  
  const entityCheck = isDifferentEntity(fullName);
  if (entityCheck.isDifferent) {
    return { 
      baseName: normalized, 
      descriptor: entityCheck.entityType, 
      descriptorType: 'different_entity' 
    };
  }
  
  // Look for valid processing descriptors
  for (const descriptor of VALID_CHILD_DESCRIPTORS) {
    // Check at end of name
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
  
  // No descriptor found - this could be a parent ingredient
  return { baseName: normalized, descriptor: null, descriptorType: null };
}

/**
 * Normalize taxon for comparison
 */
function normalizeTaxon(taxon: string | null): string | null {
  if (!taxon) return null;
  return taxon.toLowerCase().trim();
}

// ============================================
// API HANDLERS
// ============================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'stats';

    if (action === 'stats') {
      const totalFoods = await db.mexicanFood.count();
      const parentCount = await db.mexicanFood.count({ where: { isParent: true } });
      const childCount = await db.mexicanFood.count({ where: { parentIngredientId: { not: null } } });
      const confirmedCount = await db.mexicanFood.count({ where: { hierarchyStatus: 'confirmed' } });
      const pendingCount = await db.mexicanFood.count({ where: { hierarchyStatus: 'pending' } });
      const rejectedCount = await db.mexicanFood.count({ where: { hierarchyStatus: 'rejected' } });
      
      // Count items with taxon conflicts
      const parentsWithChildren = await db.mexicanFood.findMany({
        where: { isParent: true, childCount: { gt: 0 } },
        select: { id: true, taxon: true, children: { select: { taxon: true } } }
      });
      
      let conflictCount = 0;
      for (const parent of parentsWithChildren) {
        const parentTaxon = normalizeTaxon(parent.taxon);
        for (const child of parent.children) {
          const childTaxon = normalizeTaxon(child.taxon);
          if (childTaxon && parentTaxon && childTaxon !== parentTaxon) {
            conflictCount++;
          }
        }
      }

      return NextResponse.json({
        success: true,
        stats: {
          total: totalFoods,
          parents: parentCount,
          children: childCount,
          standalone: totalFoods - parentCount - childCount,
          confirmed: confirmedCount,
          pending: pendingCount,
          rejected: rejectedCount,
          taxonConflicts: conflictCount,
        },
      });
    }

    if (action === 'pending-reviews') {
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const skip = (page - 1) * limit;
      const filter = searchParams.get('filter') || 'all'; // all, conflicts, unconfirmed

      let whereClause: any = { isParent: true, childCount: { gt: 0 } };
      
      if (filter === 'unconfirmed') {
        whereClause.hierarchyStatus = { not: 'confirmed' };
      }

      const parents = await db.mexicanFood.findMany({
        where: whereClause,
        select: {
          id: true,
          nombreEspanol: true,
          nombreBase: true,
          taxon: true,
          childCount: true,
          hierarchyStatus: true,
          hierarchyNotes: true,
          children: {
            select: {
              id: true,
              nombreEspanol: true,
              descriptor: true,
              taxon: true,
              hierarchyStatus: true,
              hierarchyNotes: true,
            },
          },
        },
        orderBy: { childCount: 'desc' },
        skip,
        take: limit,
      });

      // Process each parent to detect conflicts
      const reviewsWithWarnings = parents.map(parent => {
        const parentTaxon = normalizeTaxon(parent.taxon);
        const childrenWithDifferentTaxon = parent.children.filter(child => {
          const childTaxon = normalizeTaxon(child.taxon);
          return childTaxon && parentTaxon && childTaxon !== parentTaxon;
        });

        const derivedProducts = parent.children.filter(child => {
          const check = isDerivedProduct(child.nombreEspanol);
          return check.isDerived;
        });

        const differentEntities = parent.children.filter(child => {
          const check = isDifferentEntity(child.nombreEspanol);
          return check.isDifferent;
        });

        return {
          ...parent,
          hasTaxonConflict: childrenWithDifferentTaxon.length > 0,
          taxonConflicts: childrenWithDifferentTaxon.map(c => ({
            id: c.id,
            nombreEspanol: c.nombreEspanol,
            taxon: c.taxon,
          })),
          hasDerivedProducts: derivedProducts.length > 0,
          derivedProducts: derivedProducts.map(c => ({
            id: c.id,
            nombreEspanol: c.nombreEspanol,
          })),
          hasDifferentEntities: differentEntities.length > 0,
          differentEntities: differentEntities.map(c => ({
            id: c.id,
            nombreEspanol: c.nombreEspanol,
          })),
        };
      });

      // Filter for conflicts if requested
      const filteredReviews = filter === 'conflicts' 
        ? reviewsWithWarnings.filter(r => r.hasTaxonConflict || r.hasDifferentEntities || r.hasDerivedProducts)
        : reviewsWithWarnings;

      const totalParents = await db.mexicanFood.count({ where: whereClause });

      return NextResponse.json({
        success: true,
        reviews: filteredReviews,
        pagination: {
          page,
          limit,
          total: totalParents,
          totalPages: Math.ceil(totalParents / limit),
        },
      });
    }

    if (action === 'search-parents') {
      // Search for potential parents (for reassignment)
      const query = searchParams.get('q') || '';
      const limit = parseInt(searchParams.get('limit') || '20');
      
      const parents = await db.mexicanFood.findMany({
        where: {
          OR: [
            { isParent: true },
            { nombreBase: { not: null } },
          ],
          nombreEspanol: { contains: query, mode: 'insensitive' },
        },
        select: {
          id: true,
          nombreEspanol: true,
          taxon: true,
          childCount: true,
        },
        take: limit,
      });

      return NextResponse.json({ success: true, parents });
    }

    if (action === 'taxon-groups') {
      // Group all items by their scientific name (taxon)
      const groups = await db.mexicanFood.groupBy({
        by: ['taxon'],
        where: { taxon: { not: null } },
        _count: { id: true },
        having: { taxon: { _count: { gt: 1 } } },
        orderBy: { _count: { id: 'desc' } },
        take: 30,
      });

      const results = [];
      for (const group of groups) {
        if (!group.taxon) continue;
        const items = await db.mexicanFood.findMany({
          where: { taxon: group.taxon },
          select: { id: true, nombreEspanol: true, descriptor: true, isParent: true, parentIngredientId: true },
          orderBy: [{ isParent: 'desc' }, { descriptor: 'asc' }],
        });
        results.push({ taxon: group.taxon, count: group._count.id, items });
      }

      return NextResponse.json({ success: true, groups: results });
    }

    if (action === 'audit-history') {
      const itemId = searchParams.get('itemId');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      const skip = (page - 1) * limit;

      let whereClause: any = {};
      if (itemId) {
        whereClause.itemId = itemId;
      }

      const [logs, total] = await Promise.all([
        db.hierarchyAuditLog.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        db.hierarchyAuditLog.count({ where: whereClause }),
      ]);

      return NextResponse.json({
        success: true,
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Hierarchy API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // ============================================
    // NEW IMPROVED HIERARCHY ALGORITHM (OPTIMIZED)
    // ============================================
    if (action === 'establish-hierarchy-v2') {
      // Reset all hierarchy data
      await db.mexicanFood.updateMany({
        data: { 
          isParent: false, 
          parentIngredientId: null, 
          childCount: 0,
          nombreBase: null,
          descriptor: null,
        },
      });

      // Get all foods
      const foods = await db.mexicanFood.findMany({
        select: { 
          id: true, 
          nombreEspanol: true, 
          taxon: true, 
          nutrientScore: true 
        },
      });

      // Step 1: Process descriptor extraction IN MEMORY first (no DB updates yet)
      const foodWithDescriptors = foods.map(food => {
        const { baseName, descriptor, descriptorType } = extractProcessingDescriptor(food.nombreEspanol);
        return {
          ...food,
          baseName,
          descriptor,
          descriptorType,
        };
      });

      // Step 2: Batch update nombreBase and descriptor for all foods
      const batchSize = 500;
      for (let i = 0; i < foodWithDescriptors.length; i += batchSize) {
        const batch = foodWithDescriptors.slice(i, i + batchSize);
        await Promise.all(
          batch.map(food => 
            db.mexicanFood.update({
              where: { id: food.id },
              data: { 
                nombreBase: food.baseName, 
                descriptor: food.descriptor,
              },
            })
          )
        );
      }

      // Step 3: Group by scientific name (PRIMARY grouping)
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

      let parentCount = 0;
      let childCount = 0;
      const hierarchyBatchSize = 100;
      const updates: Prisma.PrismaPromise<unknown>[] = [];

      // Step 4: Process taxon groups (biologically related items)
      for (const [taxon, items] of taxonGroups) {
        if (items.length === 1) continue; // Standalone

        // Filter out derived products and different entities from being children
        const validChildren = items.filter(item => {
          const derivedCheck = isDerivedProduct(item.nombreEspanol);
          const entityCheck = isDifferentEntity(item.nombreEspanol);
          return !derivedCheck.isDerived && !entityCheck.isDifferent;
        });

        if (validChildren.length <= 1) continue;

        // Find best parent: prefer items without descriptor (raw form)
        const noDescriptorItems = validChildren.filter(i => {
          // Use pre-computed descriptor info
          return !i.descriptor || i.descriptorType === 'color'; // Colors are OK for parents
        });

        const candidates = noDescriptorItems.length > 0 ? noDescriptorItems : validChildren;
        
        // Sort by nutrient score (higher = better), then by name length (shorter = more base form)
        const parent = candidates.sort((a, b) => {
          const scoreDiff = (b.nutrientScore || 0) - (a.nutrientScore || 0);
          if (scoreDiff !== 0) return scoreDiff;
          return a.nombreEspanol.length - b.nombreEspanol.length;
        })[0];

        // Mark parent and link children
        const children = validChildren.filter(i => i.id !== parent.id);

        updates.push(
          db.mexicanFood.update({
            where: { id: parent.id },
            data: { isParent: true, childCount: children.length },
          })
        );
        parentCount++;

        for (const child of children) {
          updates.push(
            db.mexicanFood.update({
              where: { id: child.id },
              data: { parentIngredientId: parent.id },
            })
          );
          childCount++;
        }

        // Execute batch if needed
        if (updates.length >= hierarchyBatchSize) {
          await db.$transaction(updates.splice(0, hierarchyBatchSize));
        }
      }

      // Step 5: For items without taxon, only group by name if they share the same base name
      // AND have valid processing descriptors (be very conservative)
      const baseNameGroups: Map<string, typeof foodWithDescriptors> = new Map();
      
      for (const food of noTaxonFoods) {
        // Only group if there's a valid processing descriptor (use pre-computed)
        if (food.descriptorType && ['processing', 'cut', 'state'].includes(food.descriptorType)) {
          if (!baseNameGroups.has(food.baseName)) {
            baseNameGroups.set(food.baseName, []);
          }
          baseNameGroups.get(food.baseName)!.push(food);
        }
      }

      // Process base name groups (conservative - only clear cases)
      for (const [baseName, items] of baseNameGroups) {
        if (items.length <= 1) continue;

        // Find parent (use pre-computed descriptor info)
        const noDescriptorItems = items.filter(i => !i.descriptor);

        if (noDescriptorItems.length === 0) continue; // No clear parent, skip

        const parent = noDescriptorItems.sort((a, b) => {
          const scoreDiff = (b.nutrientScore || 0) - (a.nutrientScore || 0);
          if (scoreDiff !== 0) return scoreDiff;
          return a.nombreEspanol.length - b.nombreEspanol.length;
        })[0];

        const children = items.filter(i => i.id !== parent.id);

        updates.push(
          db.mexicanFood.update({
            where: { id: parent.id },
            data: { isParent: true, childCount: children.length },
          })
        );
        parentCount++;

        for (const child of children) {
          updates.push(
            db.mexicanFood.update({
              where: { id: child.id },
              data: { parentIngredientId: parent.id },
            })
          );
          childCount++;
        }

        if (updates.length >= hierarchyBatchSize) {
          await db.$transaction(updates.splice(0, hierarchyBatchSize));
        }
      }

      // Execute remaining updates
      if (updates.length > 0) {
        await db.$transaction(updates);
      }

      return NextResponse.json({
        success: true,
        message: `Improved hierarchy established: ${parentCount} parents, ${childCount} children`,
        stats: {
          parentCount,
          childCount,
          taxonGroups: taxonGroups.size,
          baseNameGroups: baseNameGroups.size,
          noTaxonItems: noTaxonFoods.length,
        },
      });
    }

    // ============================================
    // CONFIRM ACTIONS
    // ============================================

    if (action === 'confirm-parent') {
      const { parentId, notes, reviewedBy } = body;
      if (!parentId) return NextResponse.json({ error: 'parentId required' }, { status: 400 });

      const parent = await db.mexicanFood.findUnique({
        where: { id: parentId },
        select: { nombreEspanol: true, hierarchyStatus: true, hierarchyNotes: true },
      });

      await db.$transaction([
        db.mexicanFood.update({
          where: { id: parentId },
          data: {
            hierarchyStatus: 'confirmed',
            hierarchyNotes: notes || null,
            hierarchyReviewedAt: new Date(),
          },
        }),
        db.hierarchyAuditLog.create({
          data: {
            itemId: parentId,
            itemName: parent?.nombreEspanol || '',
            action: 'confirm_parent',
            oldStatus: parent?.hierarchyStatus || 'pending',
            oldNotes: parent?.hierarchyNotes,
            newStatus: 'confirmed',
            newNotes: notes || null,
            reviewedBy: reviewedBy || 'system',
            reason: notes,
          },
        }),
      ]);

      return NextResponse.json({ success: true, message: 'Parent confirmed' });
    }

    if (action === 'confirm-all-children') {
      const { parentId, notes, reviewedBy } = body;
      if (!parentId) return NextResponse.json({ error: 'parentId required' }, { status: 400 });

      const parent = await db.mexicanFood.findUnique({
        where: { id: parentId },
        select: { nombreEspanol: true, hierarchyStatus: true },
      });

      const children = await db.mexicanFood.findMany({
        where: { parentIngredientId: parentId },
        select: { id: true, nombreEspanol: true, hierarchyStatus: true },
      });

      await db.$transaction([
        db.mexicanFood.update({
          where: { id: parentId },
          data: { hierarchyStatus: 'confirmed', hierarchyReviewedAt: new Date() },
        }),
        ...children.map(child =>
          db.mexicanFood.update({
            where: { id: child.id },
            data: {
              hierarchyStatus: 'confirmed',
              hierarchyNotes: notes || 'Parent confirmed - all children auto-confirmed',
              hierarchyReviewedAt: new Date(),
            },
          })
        ),
        db.hierarchyAuditLog.create({
          data: {
            itemId: parentId,
            itemName: parent?.nombreEspanol || '',
            action: 'confirm_all',
            oldStatus: parent?.hierarchyStatus || 'pending',
            newStatus: 'confirmed',
            newNotes: notes,
            reviewedBy: reviewedBy || 'system',
            reason: notes || `Confirmed parent and ${children.length} children`,
          },
        }),
      ]);

      return NextResponse.json({ 
        success: true, 
        message: `Parent and ${children.length} children confirmed` 
      });
    }

    if (action === 'confirm-child') {
      const { childId, notes, reviewedBy } = body;
      if (!childId) return NextResponse.json({ error: 'childId required' }, { status: 400 });

      const child = await db.mexicanFood.findUnique({
        where: { id: childId },
        select: { 
          nombreEspanol: true, 
          hierarchyStatus: true, 
          hierarchyNotes: true,
          parentIngredientId: true,
        },
      });

      const parent = child?.parentIngredientId 
        ? await db.mexicanFood.findUnique({
            where: { id: child.parentIngredientId },
            select: { nombreEspanol: true },
          })
        : null;

      await db.$transaction([
        db.mexicanFood.update({
          where: { id: childId },
          data: {
            hierarchyStatus: 'confirmed',
            hierarchyNotes: notes || null,
            hierarchyReviewedAt: new Date(),
          },
        }),
        db.hierarchyAuditLog.create({
          data: {
            itemId: childId,
            itemName: child?.nombreEspanol || '',
            action: 'confirm_child',
            oldParentId: child?.parentIngredientId,
            oldParentName: parent?.nombreEspanol,
            oldStatus: child?.hierarchyStatus || 'pending',
            oldNotes: child?.hierarchyNotes,
            newParentId: child?.parentIngredientId,
            newParentName: parent?.nombreEspanol,
            newStatus: 'confirmed',
            newNotes: notes || null,
            reviewedBy: reviewedBy || 'system',
            reason: notes,
          },
        }),
      ]);

      return NextResponse.json({ success: true, message: 'Child confirmed' });
    }

    if (action === 'reject-child') {
      const { childId, notes, makeStandalone, reviewedBy } = body;
      if (!childId) return NextResponse.json({ error: 'childId required' }, { status: 400 });

      // Fetch child data BEFORE any updates (fixes race condition)
      const child = await db.mexicanFood.findUnique({
        where: { id: childId },
        select: { 
          nombreEspanol: true, 
          hierarchyStatus: true, 
          hierarchyNotes: true,
          parentIngredientId: true,
        },
      });

      const oldParentId = child?.parentIngredientId;
      const oldParent = oldParentId 
        ? await db.mexicanFood.findUnique({
            where: { id: oldParentId },
            select: { nombreEspanol: true },
          })
        : null;

      const updateData: Record<string, unknown> = {
        hierarchyStatus: 'rejected',
        hierarchyNotes: notes || 'Different biological entity - not a derived form',
        hierarchyReviewedAt: new Date(),
      };

      if (makeStandalone) {
        updateData.parentIngredientId = null;
      }

      const updates: Prisma.PrismaPromise<unknown>[] = [
        db.mexicanFood.update({
          where: { id: childId },
          data: updateData,
        }),
        db.hierarchyAuditLog.create({
          data: {
            itemId: childId,
            itemName: child?.nombreEspanol || '',
            action: makeStandalone ? 'reject_child_unlink' : 'reject_child',
            oldParentId: oldParentId,
            oldParentName: oldParent?.nombreEspanol,
            oldStatus: child?.hierarchyStatus || 'pending',
            oldNotes: child?.hierarchyNotes,
            newParentId: makeStandalone ? null : oldParentId,
            newParentName: makeStandalone ? null : oldParent?.nombreEspanol,
            newStatus: 'rejected',
            newNotes: notes || 'Different biological entity - not a derived form',
            reviewedBy: reviewedBy || 'system',
            reason: notes,
          },
        }),
      ];

      // Decrement parent's child count if unlinking
      if (makeStandalone && oldParentId) {
        updates.push(
          db.mexicanFood.update({
            where: { id: oldParentId },
            data: { childCount: { decrement: 1 } },
          })
        );
      }

      await db.$transaction(updates);

      return NextResponse.json({ success: true, message: 'Child rejected' });
    }

    if (action === 'reject-multiple-children') {
      const { childIds, notes, reviewedBy } = body;
      if (!childIds || !Array.isArray(childIds)) {
        return NextResponse.json({ error: 'childIds array required' }, { status: 400 });
      }

      // Fetch all children data BEFORE any updates
      const childrenData = await db.mexicanFood.findMany({
        where: { id: { in: childIds } },
        select: { 
          id: true, 
          nombreEspanol: true, 
          hierarchyStatus: true,
          hierarchyNotes: true,
          parentIngredientId: true,
        },
      });

      // Get unique parent IDs
      const parentIds = [...new Set(childrenData.map(c => c.parentIngredientId).filter(Boolean))];
      const parents = await db.mexicanFood.findMany({
        where: { id: { in: parentIds } },
        select: { id: true, nombreEspanol: true },
      });
      const parentMap = new Map(parents.map(p => [p.id, p.nombreEspanol]));

      const updates: Prisma.PrismaPromise<unknown>[] = [];

      // Update each child and create audit log
      for (const child of childrenData) {
        const parentName = child.parentIngredientId ? parentMap.get(child.parentIngredientId) : null;
        
        updates.push(
          db.mexicanFood.update({
            where: { id: child.id },
            data: {
              parentIngredientId: null,
              hierarchyStatus: 'rejected',
              hierarchyNotes: notes || 'Different biological entity - not a derived form',
              hierarchyReviewedAt: new Date(),
            },
          }),
          db.hierarchyAuditLog.create({
            data: {
              itemId: child.id,
              itemName: child.nombreEspanol,
              action: 'reject_multiple',
              oldParentId: child.parentIngredientId,
              oldParentName: parentName || null,
              oldStatus: child.hierarchyStatus || 'pending',
              oldNotes: child.hierarchyNotes,
              newParentId: null,
              newParentName: null,
              newStatus: 'rejected',
              newNotes: notes || 'Different biological entity - not a derived form',
              reviewedBy: reviewedBy || 'system',
              reason: notes || `Bulk rejection of ${childIds.length} items`,
            },
          })
        );
      }

      // Decrement each parent's child count
      for (const parentId of parentIds) {
        const childCount = childrenData.filter(c => c.parentIngredientId === parentId).length;
        updates.push(
          db.mexicanFood.update({
            where: { id: parentId },
            data: { childCount: { decrement: childCount } },
          })
        );
      }

      await db.$transaction(updates);

      return NextResponse.json({ 
        success: true, 
        message: `${childIds.length} children rejected and made standalone` 
      });
    }

    if (action === 'reassign-child') {
      const { childId, newParentId, notes, reviewedBy } = body;
      if (!childId || !newParentId) {
        return NextResponse.json({ error: 'childId and newParentId required' }, { status: 400 });
      }

      // Fetch child data with more fields for audit
      const child = await db.mexicanFood.findUnique({
        where: { id: childId },
        select: { 
          nombreEspanol: true, 
          hierarchyStatus: true,
          hierarchyNotes: true,
          parentIngredientId: true,
        },
      });

      // Fetch old and new parent names
      const oldParent = child?.parentIngredientId 
        ? await db.mexicanFood.findUnique({
            where: { id: child.parentIngredientId },
            select: { nombreEspanol: true },
          })
        : null;

      const newParent = await db.mexicanFood.findUnique({
        where: { id: newParentId },
        select: { nombreEspanol: true },
      });

      const updates: Prisma.PrismaPromise<unknown>[] = [
        db.mexicanFood.update({
          where: { id: childId },
          data: {
            parentIngredientId: newParentId,
            hierarchyStatus: 'confirmed',
            hierarchyNotes: notes || 'Reassigned to correct parent',
            hierarchyReviewedAt: new Date(),
          },
        }),
        db.mexicanFood.update({
          where: { id: newParentId },
          data: { childCount: { increment: 1 }, isParent: true },
        }),
        db.hierarchyAuditLog.create({
          data: {
            itemId: childId,
            itemName: child?.nombreEspanol || '',
            action: 'reassign_child',
            oldParentId: child?.parentIngredientId,
            oldParentName: oldParent?.nombreEspanol || null,
            oldStatus: child?.hierarchyStatus || 'pending',
            oldNotes: child?.hierarchyNotes,
            newParentId: newParentId,
            newParentName: newParent?.nombreEspanol || '',
            newStatus: 'confirmed',
            newNotes: notes || 'Reassigned to correct parent',
            reviewedBy: reviewedBy || 'system',
            reason: notes,
          },
        }),
      ];

      if (child?.parentIngredientId && child.parentIngredientId !== newParentId) {
        updates.push(
          db.mexicanFood.update({
            where: { id: child.parentIngredientId },
            data: { childCount: { decrement: 1 } },
          })
        );
      }

      await db.$transaction(updates);

      return NextResponse.json({ success: true, message: 'Child reassigned' });
    }

    if (action === 'set-standalone') {
      const { itemId, notes, reviewedBy } = body;
      if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 });

      const item = await db.mexicanFood.findUnique({
        where: { id: itemId },
        select: { 
          nombreEspanol: true,
          isParent: true, 
          parentIngredientId: true, 
          hierarchyStatus: true,
          hierarchyNotes: true,
          children: { select: { id: true, nombreEspanol: true } },
        },
      });

      if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

      // Fetch parent name if exists
      const parent = item.parentIngredientId 
        ? await db.mexicanFood.findUnique({
            where: { id: item.parentIngredientId },
            select: { nombreEspanol: true },
          })
        : null;

      const updates: Prisma.PrismaPromise<unknown>[] = [
        db.mexicanFood.update({
          where: { id: itemId },
          data: {
            isParent: false,
            parentIngredientId: null,
            childCount: 0,
            hierarchyStatus: 'confirmed',
            hierarchyNotes: notes || 'Confirmed as standalone ingredient',
            hierarchyReviewedAt: new Date(),
          },
        }),
        db.hierarchyAuditLog.create({
          data: {
            itemId: itemId,
            itemName: item.nombreEspanol,
            action: 'set_standalone',
            oldParentId: item.parentIngredientId,
            oldParentName: parent?.nombreEspanol || null,
            oldStatus: item.hierarchyStatus || 'pending',
            oldNotes: item.hierarchyNotes,
            newParentId: null,
            newParentName: null,
            newStatus: 'confirmed',
            newNotes: notes || 'Confirmed as standalone ingredient',
            reviewedBy: reviewedBy || 'system',
            reason: notes,
          },
        }),
      ];

      // Decrement old parent's child count if this was a child
      if (item.parentIngredientId) {
        updates.push(
          db.mexicanFood.update({
            where: { id: item.parentIngredientId },
            data: { childCount: { decrement: 1 } },
          })
        );
      }

      if (item.isParent && item.children.length > 0) {
        // Create audit logs for each orphaned child
        for (const child of item.children) {
          updates.push(
            db.mexicanFood.update({
              where: { id: child.id },
              data: {
                parentIngredientId: null,
                hierarchyStatus: 'needs_review',
                hierarchyNotes: 'Previous parent marked as standalone - needs reclassification',
              },
            }),
            db.hierarchyAuditLog.create({
              data: {
                itemId: child.id,
                itemName: child.nombreEspanol,
                action: 'orphaned',
                oldParentId: itemId,
                oldParentName: item.nombreEspanol,
                oldStatus: 'pending',
                newParentId: null,
                newParentName: null,
                newStatus: 'needs_review',
                newNotes: 'Previous parent marked as standalone - needs reclassification',
                reviewedBy: reviewedBy || 'system',
                reason: `Parent "${item.nombreEspanol}" was set as standalone`,
              },
            })
          );
        }
      }

      await db.$transaction(updates);

      return NextResponse.json({
        success: true,
        message: `Item set as standalone${item.children.length > 0 ? `, ${item.children.length} children need re-review` : ''}`,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Hierarchy POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
