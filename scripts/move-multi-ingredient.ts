import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // IDs from our search
  const coreIngredients = new Set([
    'uva', 'zarzamora', 'fresa', 'mango', 'piña', 'naranja', 'limón', 'toronja', 
    'mandarina', 'durazno', 'manzana', 'pera', 'guayaba', 'papaya', 'mamey', 
    'tamarindo', 'maracuyá', 'ciruela', 'melón', 'sandía', 'capulín',
    'tejocote', 'guanábana', 'zapote', 'chicozapote', 'plátano', 'platano',
    'zanahoria', 'papa', 'camote', 'jícama', 'nopal', 'tuna', 'chile', 'jitomate',
    'tomate', 'cebolla', 'ajo', 'calabaza', 'chayote', 'elote',
    'pollo', 'res', 'cerdo', 'pescado', 'camarón', 'atún', 'sardina', 'carne',
    'queso', 'leche',
    'arroz', 'frijol', 'lenteja', 'garbanzo', 'haba', 'soya', 'trigo', 'maíz', 'maiz',
    'amaranto', 'avena', 'cebada', 'centeno', 'sorgo',
    'nuez', 'almendra', 'cacahuate', 'ajonjolí', 'pepita',
    'chocolate', 'cacao', 'café', 'miel', 'canela', 'vainilla', 'coco',
    'yogurt', 'crema'
  ]);
  
  const colorWords = ['café', 'blanco', 'negro', 'rojo', 'verde', 'amarillo', 'azul', 'morado', 'naranja'];
  
  // Get pending items
  const pendingItems = await prisma.mexicanFood.findMany({
    where: { hierarchyStatus: 'pending' },
    select: { id: true, nombreEspanol: true }
  });
  
  const idsToMove: string[] = [];
  
  pendingItems.forEach(item => {
    const name = item.nombreEspanol;
    const nameLower = name.toLowerCase();
    
    if (/sin\s+\w+/.test(nameLower)) return;
    
    const foundIngredients: string[] = [];
    
    // Hyphenated
    const hyphenMatch = nameLower.match(/(\w+)-(\w+)/g);
    if (hyphenMatch) {
      hyphenMatch.forEach(h => {
        h.split('-').forEach(p => {
          if (coreIngredients.has(p) && !colorWords.includes(p) && !foundIngredients.includes(p)) {
            foundIngredients.push(p);
          }
        });
      });
    }
    
    // X y Y
    const yPattern = /(\w+)\s+y\s+(\w+)/gi;
    let match;
    while ((match = yPattern.exec(nameLower)) !== null) {
      if (coreIngredients.has(match[1]) && !colorWords.includes(match[1]) && !foundIngredients.includes(match[1])) {
        foundIngredients.push(match[1]);
      }
      if (coreIngredients.has(match[2]) && !colorWords.includes(match[2]) && !foundIngredients.includes(match[2])) {
        foundIngredients.push(match[2]);
      }
    }
    
    // Comma-separated
    if (nameLower.includes(',')) {
      nameLower.split(',').forEach(part => {
        part.trim().split(/\s+/).forEach(w => {
          if (coreIngredients.has(w) && !colorWords.includes(w) && !foundIngredients.includes(w)) {
            foundIngredients.push(w);
          }
        });
      });
    }
    
    if (foundIngredients.length >= 2) {
      const excludePatterns = [/gallina/i, /vaca/i, /cabra/i, /enano/i, /gigante/i, /dominico/i, /macho/i, /criollo/i];
      let shouldExclude = false;
      for (const pattern of excludePatterns) {
        if (pattern.test(name)) {
          shouldExclude = true;
          break;
        }
      }
      
      if (!shouldExclude) {
        idsToMove.push(item.id);
      }
    }
  });
  
  console.log(`Moving ${idsToMove.length} multi-ingredient items to prepared...\n`);
  
  const result = await prisma.mexicanFood.updateMany({
    where: { id: { in: idsToMove } },
    data: { hierarchyStatus: 'prepared' }
  });
  
  console.log(`Updated ${result.count} items to prepared status.`);
  
  // Show final stats
  console.log(`\n=== FINAL STATUS DISTRIBUTION ===`);
  const statusCounts = await prisma.mexicanFood.groupBy({
    by: ['hierarchyStatus'],
    _count: true
  });
  statusCounts.forEach(s => {
    console.log(`  ${s.hierarchyStatus}: ${s._count}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
