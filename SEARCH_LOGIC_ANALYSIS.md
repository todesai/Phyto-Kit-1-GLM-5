# Search Logic Analysis & Improvement Plan

## 1. Current Database State

### Mexican Food DB
- **Total foods**: ~2,100 records
- **Categories**: 17 categories
- **Languages**: Spanish (`nombreEspanol`) + English (`nombreIngles`)

### PhytoHub (Bioactive Compounds)
- **Status**: ❌ NOT IMPORTED (0 records)
- **CSV Location**: `user-uploads/general/PhytoHub_Compounds_20260212.csv`
- **Expected**: ~1,500 compounds with food sources

### USDA API
- **Status**: ✅ Working (external API)
- **Scoring**: ❌ None (relies on API ranking)

---

## 2. Single Word Analysis - Mexican DB

### Most Common Words (10-100 occurrences)

| Word | Count | Primary Categories |
|------|-------|-------------------|
| maiz | 98 | SEMILLAS DE CEREALES Y DERIVADOS |
| pasta | 95 | OTRAS SEMILLAS, SEMILLAS DE CEREALES |
| vaca | 89 | LECHE Y DERIVADOS, VERDURAS |
| frijol | 89 | OTRAS SEMILLAS, SEMILLAS DE CEREALES |
| pan | 85 | SEMILLAS DE CEREALES Y DERIVADOS |
| queso | 66 | LECHE Y DERIVADOS, INSECTOS |
| yogurt | 58 | LECHE Y DERIVADOS |
| taco | 57 | VARIOS |
| fresa | 46 | LECHE Y DERIVADOS, AZÚCARES |
| tortilla | 45 | SEMILLAS DE CEREALES Y DERIVADOS |
| pollo | 41 | VARIOS, PESCADOS Y MARISCOS |
| arroz | 32 | SEMILLAS DE CEREALES Y DERIVADOS |
| naranja | 34 | FRUTAS, BEBIDAS |
| ajo | 26 | TUBERCULOS, BULBOS Y RAICES |
| tomate | 22 | VERDURAS |

### Key Observations

1. **Missing plain ingredients**: No plain "Fresa" in FRUTAS category
2. **Category spread**: Common ingredients appear in multiple categories
3. **Processed products**: Most matches are processed (yogurt, drinks, jams)

---

## 3. Search Result Examples by Category

### Example: "fresa" (47 results in 5 categories)

```
📁 LECHE Y DERIVADOS (21 items)
   • Helado Con Fresa
   • Helado De Fresa
   • Yogurt Con Fresa
   ... and 18 more

📁 AZÚCARES, MIELES Y DULCES (10 items)
   • Mermelada Fresa
   • Gelatina Fresa
   • Dulce Fresa-Chocolate
   ... and 7 more

📁 BEBIDAS ALCOHOLICAS Y NO ALCOHOLICAS (11 items)
   • Refresco De Fresa
   • Bebida sabor fresa-sandía
   ... and 9 more

📁 SEMILLAS DE CEREALES Y DERIVADOS (2 items)
   • Trigo Cereal Con Relleno De Fresa

📁 VARIOS (3 items)
   • Nieve De Fresa
   • Suplemento Alimenticio Sabor Fresa
```

### Example: "ajo" (26 results in 8 categories)

```
📁 TUBERCULOS, BULBOS Y RAICES (5 items) ← RAW INGREDIENT
   • Ajo
   • Ajo, fresco
   • Ajo Deshidratado Y Molido

📁 OTRAS SEMILLAS (6 items) ← Contains "ajo" in "ajonjolí"
   • Ajonjoli Garapiñado
   • Ajonjoli Grano
   ... (sesame seeds, NOT garlic)

📁 INSECTOS (6 items)
   • Escarabajo Gusanos De Elite Podrido (contains "ajo")
   ... (false matches)

📁 LECHE Y DERIVADOS (2 items)
   • Yogurt Blanco (contains "ajo" in "bajo")
```

---

## 4. Proposed UI Simulation

### Search Bar Design
```
┌─────────────────────────────────────────────────────────────────────┐
│  🔍 Search ingredient...                                     [ES ▼] │
├─────────────────────────────────────────────────────────────────────┤
│  fresa                                                               │
└─────────────────────────────────────────────────────────────────────┘
```

### Results Display (With Category Grouping)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Search results for "fresa"                    47 items in 5 categories │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ▼ 📁 FRUTAS (0 items)                                               │
│      No items found in this category                                  │
│                                                                       │
│  ▼ 📁 LECHE Y DERIVADOS (21 items)                      [Most Relevant]│
│  ├─ 🥛 Helado Con Fresa                              Score: 716       │
│  ├─ 🥛 Helado De Fresa                               Score: 715       │
│  ├─ 🥛 Yogurt Con Fresa                              Score: 710       │
│  └─ ... show 18 more                                                  │
│                                                                       │
│  ▶ 📁 AZÚCARES, MIELES Y DULCES (10 items)                           │
│  ▶ 📁 BEBIDAS (11 items)                                             │
│  ▶ 📁 CEREALES (2 items)                                             │
│                                                                       │
├─────────────────────────────────────────────────────────────────────┤
│  💡 Looking for plain strawberry? Try searching "strawberry" in USDA│
└─────────────────────────────────────────────────────────────────────┘
```

### Multi-Word Search Result

```
┌─────────────────────────────────────────────────────────────────────┐
│  Search: "mermelada de fresa"                     6 items found      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Words matched: "mermelada" AND "fresa"                              │
│                                                                       │
│  📁 AZÚCARES, MIELES Y DULCES (6 items)                              │
│  ├─ 🍯 Mermelada Fresa                               Score: 1216     │
│  ├─ 🍯 Mermelada Fresa                               Score: 1210     │
│  ├─ 🍯 Mermelada Horneable De Fresa                  Score: 715      │
│  └─ ... show 3 more                                                   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Multi-Word Search Logic

### Current Behavior (Single Word)
```javascript
// User types: "mermelada de fresa"
// System searches: "mermelada de fresa" (exact phrase)
// Result: 0 matches ❌
```

### Proposed Behavior (Multi-Word)
```javascript
// User types: "mermelada de fresa"
// Step 1: Split into words → ["mermelada", "de", "fresa"]
// Step 2: Remove connectors → ["mermelada", "fresa"]
// Step 3: Search with AND logic
// Result: 6 matches ✅
```

### Implementation
```typescript
function parseSearchQuery(input: string): string[] {
  const connectors = ['de', 'con', 'y', 'en', 'la', 'el', 'the', 'with', 'and', 'of', 'a', 'an'];
  
  return input
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length >= 2)
    .filter(word => !connectors.includes(word));
}

async function searchMexicanDB(words: string[]) {
  return await db.mexicanFood.findMany({
    where: {
      AND: words.map(word => ({
        OR: [
          { nombreEspanol: { contains: word } },
          { nombreIngles: { contains: word } },
          { descripcionAlimento: { contains: word } },
        ]
      }))
    }
  });
}
```

---

## 6. Translation/Alias Table Structure

### Proposed Schema
```prisma
model IngredientAlias {
  id            String   @id @default(cuid())
  canonicalName String   // Preferred name for matching
  language      String   // "es" or "en"
  aliases       String   // JSON array of alternative names
  category      String?  // Suggested category (fruit, vegetable, etc.)
  usdaMatch     String?  // Best USDA search term
  createdAt     DateTime @default(now())
  
  @@index([canonicalName])
  @@index([language])
}
```

### Sample Data
```json
[
  {
    "canonicalName": "strawberry",
    "language": "en",
    "aliases": ["fresa", "frutilla", "strawberries"],
    "category": "fruit",
    "usdaMatch": "strawberry, raw"
  },
  {
    "canonicalName": "fresa",
    "language": "es",
    "aliases": ["strawberry", "frutilla", "fresas"],
    "category": "fruta",
    "usdaMatch": "strawberry, raw"
  },
  {
    "canonicalName": "garlic",
    "language": "en",
    "aliases": ["ajo", "garlic clove", "ail"],
    "category": "vegetable",
    "usdaMatch": "garlic, raw"
  },
  {
    "canonicalName": "ajo",
    "language": "es",
    "aliases": ["garlic", "ajo crudo"],
    "category": "verdura",
    "usdaMatch": "garlic, raw"
  },
  {
    "canonicalName": "apple",
    "language": "en",
    "aliases": ["manzana", "pomme"],
    "category": "fruit",
    "usdaMatch": "apple, raw"
  }
]
```

---

## 7. USDA Scoring Logic

### Current Behavior
- USDA API returns ranked results (API decides ranking)
- No custom scoring applied

### Proposed Scoring
```typescript
function scoreUSDAResult(food: USDAFood, searchTerms: string[]): number {
  let score = 0;
  const description = food.description.toLowerCase();
  
  // Exact match
  if (searchTerms.every(term => description === term)) {
    score += 1000;
  }
  
  // All words present
  if (searchTerms.every(term => description.includes(term))) {
    score += 500;
  }
  
  // Starts with first search term
  if (description.startsWith(searchTerms[0])) {
    score += 200;
  }
  
  // Prefer "raw" or "fresh" items
  if (description.includes('raw') || description.includes('fresh')) {
    score += 100;
  }
  
  // Penalize processed items
  const processedKeywords = ['juice', 'drink', 'flavored', 'canned', 'frozen'];
  for (const keyword of processedKeywords) {
    if (description.includes(keyword)) {
      score -= 100;
    }
  }
  
  return score;
}
```

---

## 8. Category Grouping Implementation

### Data Source Categories

| Source | Has Categories? | Category Field |
|--------|-----------------|----------------|
| Mexican DB | ✅ Yes | `tipoAlimento` |
| USDA API | ❌ No | N/A |
| PhytoHub | ⚠️ Partial | `foodSources` (implies food groups) |

### Display Strategy
1. **Mexican DB results**: Group by `tipoAlimento`, sorted by relevance
2. **USDA results**: Single list (no categories), sorted by score
3. **PhytoHub results**: Group by chemical class, sorted by relevance

### Category Priority for Single-Word Searches
1. Raw ingredients (FRUTAS, VERDURAS, TUBERCULOS)
2. Basic preparations (raw, fresh, cooked)
3. Processed products (yogurts, drinks, jams)
4. Mixed dishes (tacos, tamales)

---

## 9. Implementation Priority

1. **[HIGH] Import PhytoHub CSV** - Bioactive section currently broken
2. **[HIGH] Multi-word search** - Critical for compound searches
3. **[HIGH] Translation/alias table** - Enables cross-language matching
4. **[MEDIUM] USDA scoring** - Improves result quality
5. **[MEDIUM] Category grouping UI** - Improves user experience

---

## 10. Expected Improvements

| Search Query | Current Result | Improved Result |
|--------------|----------------|-----------------|
| "fresa" | 47 processed items | Shows FRUTAS first, suggests "strawberry" from USDA |
| "mermelada de fresa" | 0 results | 6 mermeladas with fresa |
| "ajo" | 26 mixed items | Shows TUBERCULOS (garlic) first, filters false matches |
| "apple" (from recipe) | Not found | Finds via alias → "manzana" → USDA "strawberry, raw" |
| "garlic chicken" | N/A | Multi-word finds garlic AND chicken dishes |
