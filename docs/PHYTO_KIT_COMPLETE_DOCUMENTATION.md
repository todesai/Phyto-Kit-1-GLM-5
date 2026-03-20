# Phyto Kit - Complete Application Documentation

> **Version:** 1.0  
> **Last Updated:** February 2026  
> **Purpose:** Comprehensive documentation for recreating the entire Phyto Kit application

---

## Table of Contents

1. [Application Overview](#application-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Main Page Layout](#main-page-layout)
5. [Header Section](#header-section)
6. [Hero Search Section](#hero-search-section)
7. [Recipe Cards Grid](#recipe-cards-grid)
8. [Recipe Detail Dialog](#recipe-detail-dialog)
9. [File Upload Dialog](#file-upload-dialog)
10. [Word Classification Dialog](#word-classification-dialog)
11. [Hierarchy Review Dialog](#hierarchy-review-dialog)
12. [Classification Workspace](#classification-workspace)
13. [API Endpoints](#api-endpoints)
14. [Database Schema](#database-schema)
15. [State Management](#state-management)
16. [Translations](#translations)
17. [Visual Design Specifications](#visual-design-specifications)

---

## Application Overview

### Purpose
Phyto Kit is a comprehensive recipe discovery and nutritional analysis application that allows users to:
- Search recipes by name or ingredients
- View detailed nutritional information (calories, macros, vitamins, minerals, amino acids, fatty acids)
- Analyze bioactive compounds in ingredients
- Review food safety information
- Use "Chef Mode" for hands-free cooking instructions with text-to-speech
- Manage ingredient classification and hierarchy for the Mexican food database
- Import nutrition data from CSV files, PhytoHub compounds, and EFSA toxicity data

### Key Features

| Feature | Description |
|---------|-------------|
| **Recipe Search** | Search by name, ingredients, or ingredient count |
| **Nutrition Analysis** | Detailed macro/micronutrient breakdown per portion or per 100g |
| **Bioactive Compounds** | PhytoHub integration for phytochemical analysis |
| **Food Safety** | HACCP, Codex Alimentarius, FDA standards integration |
| **Chef Mode** | Text-to-speech cooking instructions |
| **Data Import** | CSV, PhytoHub, EFSA OpenFoodTox |
| **Ingredient Classification** | Word classification and hierarchy management |

### Workflow
```
Search Recipes → Select Recipe → View Details (Recipe/Nutrition/Bioactive/Safety/Chef Mode)
                                    ↓
                          Manage Data (Upload/Import/Classification)
```

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16 | App Router framework |
| React | 18 | UI components |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 4 | Styling |
| shadcn/ui | Latest | UI components |
| Framer Motion | Latest | Animations |
| Lucide React | Latest | Icons |
| next-themes | Latest | Dark/light mode |

### Backend
| Technology | Purpose |
|------------|---------|
| Prisma | ORM |
| SQLite | Database |
| Next.js API Routes | REST endpoints |

### External APIs
| API | Purpose |
|-----|---------|
| TheMealDB | Recipe data |
| Web Speech API | Text-to-speech |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Main application page (3724 lines)
│   ├── layout.tsx            # Root layout with theme provider
│   ├── globals.css           # Global styles
│   └── api/
│       ├── search/route.ts           # Recipe search
│       ├── ingredients/route.ts      # Ingredients list
│       ├── recipe/[id]/route.ts      # Recipe details + AI analysis
│       ├── nutrition/
│       │   ├── calculate/route.ts    # Nutrition calculation
│       │   ├── search/route.ts       # Nutrition search
│       │   └── import/route.ts       # CSV import
│       ├── bioactive/
│       │   ├── match/route.ts        # Bioactive matching
│       │   └── import/route.ts       # PhytoHub import
│       ├── toxicity/
│       │   ├── route.ts              # Toxicity data
│       │   └── import-efsa/route.ts  # EFSA import
│       ├── upload/route.ts           # File upload
│       ├── global-edible-items/route.ts
│       ├── food-types/route.ts
│       ├── words/
│       │   ├── classifications/route.ts
│       │   ├── extract/route.ts
│       │   ├── duplicates/route.ts
│       │   └── reclassify/route.ts
│       └── mexican-food/
│           ├── hierarchy/route.ts
│           ├── classify-hierarchy/route.ts
│           ├── cross-reference/route.ts
│           ├── categories/route.ts
│           └── classification-workspace/
│               ├── route.ts
│               ├── children/route.ts
│               ├── rejected/route.ts
│               └── prepared/route.ts
├── components/
│   ├── ingredient-classification-workspace.tsx
│   ├── word-classification-dialog.tsx
│   ├── hierarchy-review.tsx
│   ├── theme-provider.tsx
│   └── ui/                    # shadcn/ui components
├── lib/
│   ├── db.ts                  # Prisma client
│   ├── utils.ts               # Utilities
│   ├── usda-api.ts            # USDA API
│   ├── comptox-api.ts         # CompTox API
│   └── search-utils.ts        # Search utilities
├── types/
│   └── recipe.ts              # TypeScript types
└── hooks/
    ├── use-mobile.ts
    └── use-toast.ts
```

---

## Main Page Layout

### Overall Structure
```
┌─────────────────────────────────────────────────────────────────────┐
│                         HEADER (sticky)                             │
│  Logo + Title | Language | Background | Upload | Tools | Theme     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                         MAIN CONTENT                                │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    HERO SEARCH SECTION                        │  │
│  │  Title + Description                                          │  │
│  │  Search Input + Button                                        │  │
│  │  Active Filters Display                                       │  │
│  │  ─────────── or filter by ingredients ───────────             │  │
│  │  Multi-Ingredient Filter Panel                                │  │
│  │    - Ingredient Input + Suggestions                           │  │
│  │    - Selected Ingredients (badges)                            │  │
│  │    - Ingredient Count Filters                                 │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    RECIPE CARDS GRID                          │  │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                             │  │
│  │  │ R1  │ │ R2  │ │ R3  │ │ R4  │                             │  │
│  │  └─────┘ └─────┘ └─────┘ └─────┘                             │  │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                             │  │
│  │  │ R5  │ │ R6  │ │ R7  │ │ R8  │                             │  │
│  │  └─────┘ └─────┘ └─────┘ └─────┘                             │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                         FOOTER                                      │
│  Disclaimer text                                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Dynamic Background
- **Source**: First recipe image from search results
- **Modes**: Full (100% opacity), Balanced (35-60% with gradient overlay), None
- **Stored in**: localStorage as `backgroundMode`
- **Transition**: 700ms opacity transition

### Container Classes
```css
/* Main Container */
.min-h-screen.flex.flex-col

/* Header */
.border-b.bg-background/80.backdrop-blur-sm.sticky.top-0.z-50

/* Main Content */
.flex-1.container.mx-auto.px-4.py-8

/* Footer */
.border-t.bg-muted/30.px-4.py-4.mt-auto
```

---

## Header Section

### Structure
```tsx
<header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
  <div className="container mx-auto px-4 py-4 flex items-center justify-between">
    {/* Logo + Title */}
    <div className="flex items-center gap-3">
      <Leaf className="h-8 w-8 text-emerald-500" />
      <h1>Phyto Kit</h1>
    </div>
    
    {/* Controls */}
    <div className="flex items-center gap-2">
      {/* Language Selector */}
      {/* Background Mode */}
      {/* Upload Documents Button */}
      {/* Word Classification Button */}
      {/* Hierarchy Review Button */}
      {/* Classification Workspace Button */}
      {/* Theme Toggle */}
    </div>
  </div>
</header>
```

### Header Buttons

#### 1. Language Selector
| Property | Value |
|----------|-------|
| **Type** | Select |
| **Options** | 🇺🇸 EN, 🇲🇽 ES |
| **Width** | 100px |
| **Icon** | Globe |
| **Storage** | localStorage `language` |

#### 2. Background Mode Selector
| Property | Value |
|----------|-------|
| **Type** | Select |
| **Options** | Full, Balanced, None |
| **Width** | 120px |
| **Icon** | ImageIcon / ImageOff |
| **Preview** | Shows mini thumbnail of current background |
| **Storage** | localStorage `backgroundMode` |

#### 3. Upload Documents Button
| Property | Value |
|----------|-------|
| **Icon** | FolderOpen |
| **Variant** | ghost |
| **Size** | icon |
| **Shape** | rounded-full |
| **Action** | Opens upload dialog |

#### 4. Word Classification Button
| Property | Value |
|----------|-------|
| **Icon** | BookOpen |
| **Variant** | ghost |
| **Size** | icon |
| **Shape** | rounded-full |
| **Title** | "Word Classification Review" |
| **Action** | Opens word classification dialog |

#### 5. Hierarchy Review Button
| Property | Value |
|----------|-------|
| **Icon** | Database |
| **Variant** | ghost |
| **Size** | icon |
| **Shape** | rounded-full |
| **Title** | "Hierarchy Review" |
| **Action** | Opens hierarchy review dialog |

#### 6. Classification Workspace Button
| Property | Value |
|----------|-------|
| **Icon** | Layers |
| **Variant** | ghost |
| **Size** | icon |
| **Shape** | rounded-full |
| **Title** | "Classification Workspace" |
| **Action** | Opens classification workspace dialog |

#### 7. Theme Toggle
| Property | Value |
|----------|-------|
| **Icons** | Sun (light) / Moon (dark) |
| **Variant** | ghost |
| **Size** | icon |
| **Shape** | rounded-full |
| **Action** | Toggles between dark/light themes |

---

## Hero Search Section

### Structure
```tsx
<motion.section
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
  className="mb-12 text-center"
>
  {/* Title */}
  <h2>{t.subtitle}</h2>
  <p>{t.description}</p>
  
  {/* Search Input */}
  <div className="flex gap-2">
    <Input placeholder={t.searchPlaceholder} />
    <Button onClick={searchRecipes}>{t.search}</Button>
  </div>
  
  {/* Active Filters Display */}
  {/* Separator with "or filter by ingredients" */}
  
  {/* Multi-Ingredient Filter Panel */}
</motion.section>
```

### Search Input
| Property | Value |
|----------|-------|
| **Placeholder** | "Search recipes by name..." |
| **Height** | h-12 |
| **Icon** | Search (left) |
| **Clear Button** | X icon (right, when text exists) |
| **Enter Key** | Triggers search |

### Active Filters Display
Shows when ingredient count filters are active:
- **Exact Count**: "Exactly X ingredient(s)"
- **Max Count**: "≤X ingredients"
- **Clear Button**: Resets all filters

### Multi-Ingredient Filter Panel

#### Ingredient Input
| Property | Value |
|----------|-------|
| **Placeholder** | "Type an ingredient for suggestions..." |
| **Height** | h-12 |
| **Suggestions Dropdown** | Max 8 items, max-height 192px |
| **Enter Key** | Adds ingredient |
| **Add Button** | Plus icon |

#### Selected Ingredients Display
- Badge for each selected ingredient
- X button to remove each
- Undo button (enabled after removal)
- Clear all button

#### Ingredient Count Filters (Optional)
```
┌─────────────────────────────────────────────────────────────┐
│ ℹ Ingredient Count Filters (Optional)                       │
│                                                             │
│ Exact ingredient count    Maximum ingredients               │
│ [    number input    ]    [    number input    ]            │
│                                                             │
│ [🔍 Search by Count]                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Recipe Cards Grid

### Layout
- **Responsive Grid**: 1 → 2 → 3 → 4 columns (sm → md → lg → xl)
- **Gap**: 24px (gap-6)
- **Animation**: Framer Motion fade-in with staggered delay (0.05s per card)

### Recipe Card Structure
```tsx
<Card className="overflow-hidden cursor-pointer group hover:shadow-lg transition-all duration-300">
  {/* Image Container */}
  <div className="relative h-48 overflow-hidden">
    <img 
      src={meal.strMealThumb} 
      className="group-hover:scale-110 transition-transform duration-500"
    />
    {/* Gradient Overlay */}
    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
    {/* Badges */}
    <div className="absolute bottom-2 left-2 right-2 flex gap-2">
      <Badge variant="secondary">{meal.strCategory}</Badge>
      <Badge variant="outline">{meal.strArea}</Badge>
      <Badge variant="default" className="bg-emerald-600">
        {meal.ingredientCount} ingredients
      </Badge>
    </div>
  </div>
  
  {/* Card Header */}
  <CardHeader className="p-4">
    <CardTitle className="line-clamp-2 group-hover:text-emerald-500">
      {meal.strMeal}
    </CardTitle>
    <CardDescription>
      <ChevronRight /> Click to view details
    </CardDescription>
  </CardHeader>
</Card>
```

### Loading Skeleton
- 8 skeleton cards shown during loading
- Skeleton image (h-48) + title + description

### Empty State
- Leaf icon (large, muted)
- "No recipes found" message
- "Try adjusting your search terms" hint

---

## Recipe Detail Dialog

### Structure
```
┌─────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │                    RECIPE IMAGE (h-40 to h-52)                  │ │
│ │  Gradient overlay from bottom                                   │ │
│ │  ┌──────────────────────────────────────────────────────────┐   │ │
│ │  │ Recipe Title                                             │   │ │
│ │  │ [Category] [Area] [X ingredients]                        │   │ │
│ │  └──────────────────────────────────────────────────────────┘   │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ TABS: Recipe | Nutrition | Bioactive | Safety | Chef Mode      │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │                    TAB CONTENT (ScrollArea)                     │ │
│ │                                                                 │ │
│ │  (Content varies by tab)                                        │ │
│ │                                                                 │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Dialog Properties
| Property | Value |
|----------|-------|
| **Max Width** | max-w-4xl |
| **Height** | h-[90vh] |
| **Overflow** | hidden, flex flex-col |
| **Padding** | p-0 |

### Tabs

#### 1. Recipe Tab
**Ingredients Section:**
- Grid: 2 columns (md:grid-cols-2)
- Each ingredient shows:
  - Number badge
  - Data source badge (Mexican DB / USDA / Not Found)
  - Ingredient name
  - Measure (if available)
- Shows matched/total count: "(X/Y with data)"

**Instructions Section:**
- Each step in a rounded card
- Step number in emerald badge
- Step text with proper line height

**Video Tutorial (if available):**
- Play icon + "Watch on YouTube" link

#### 2. Nutrition Tab

**Portion Controls:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ Portion Size: [Per Portion] [Per 100g]    [4 portions ▼]          │
└─────────────────────────────────────────────────────────────────────┘
```

**Data Coverage Summary:**
- Shows percentage coverage
- Progress bar

**Macronutrients Grid:**
| Nutrient | Color | Unit |
|----------|-------|------|
| Calories | rose-500 | - |
| Protein | blue-500 | g |
| Carbs | amber-500 | g |
| Fat | purple-500 | g |
| Fiber | teal-500 | g |
| Sugar | pink-500 | g |

**Vitamins (Always Visible):**
- Vitamin A (IU)
- Vitamin B1 (mg)
- Vitamin B2 (mg)
- Vitamin B3 (mg)
- Vitamin C (mg)

**Minerals (Collapsible):**
- Calcium, Iron, Sodium, Potassium, Magnesium, Zinc, Phosphorus, Copper, Manganese, Selenium, Cholesterol

**Amino Acids (Collapsible):**
- All 18 amino acids in grid layout

**Fatty Acids (Collapsible):**
- Saturated, Myristic, Palmitic, Stearic, Oleic, Linoleic, Linolenic, Lauric, Palmitoleic

**Other Nutrients (Collapsible):**
- Moisture, Ash, Starch, Lactose, Beta-Carotenes, Carotenes, Edible Portion

#### 3. Bioactive Tab

**Stats Cards:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ [X Compounds] [X/Y Ingredients] [With ADI] [Warnings]              │
└─────────────────────────────────────────────────────────────────────┘
```

**Grouped by Ingredient:**
- Each ingredient shows matched compounds
- Compound card contains:
  - Name + Source + Risk Level badge
  - Your Dose (mg)
  - EFSA Safety Data (if available): ADI, TDI, NOAEL, UL
  - CompTox Warnings (if any)
  - Natural Food Sources
  - Health Benefits (collapsible)

**Risk Levels:**
| Level | Condition | Color |
|-------|-----------|-------|
| Low | >10x below toxic | emerald |
| Moderate | 5-10x below toxic | amber |
| High | <5x below toxic | red |

#### 4. Safety Tab

**Per Ingredient Safety Card:**
- Ingredient name with warning icon
- Potential Hazards list
- Safe Handling tips
- Storage Tips
- Cooking Temperature (alert)
- Allergen Warning (destructive alert)

#### 5. Chef Mode Tab

**Progress Bar:**
- Current step / total steps
- Status: Speaking / Playing / Ready
- Visual progress bar

**Current Step Display:**
- Large card with step number badge
- Step text

**Controls:**
```
[◀ Previous] [▶ Play All] [Next ▶]
```

**Step List:**
- Scrollable list (max-h-32)
- Current step highlighted in emerald
- Click to jump to step
- Speaking indicator (animated volume icon)

---

## File Upload Dialog

### Tab Structure
```
┌─────────────────────────────────────────────────────────────────────┐
│ 📁 Upload Documents                                                 │
│ Upload CSV, PDF, and other files...                                │
├─────────────────────────────────────────────────────────────────────┤
│ [Upload] [Nutrition] [PhytoHub] [EFSA]                             │
├─────────────────────────────────────────────────────────────────────┤
│                     TAB CONTENT                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Upload Tab

**Category Selection:**
- nutrition-csv
- toxins-pdf
- recipes-pdf
- reference-docs
- general

**File Input:**
- Drag & drop zone
- Accept: .csv, .pdf, .xlsx, .xls, .json, .txt
- Max size: 50MB

**Uploaded Files List:**
- File name
- Category badge
- File size
- Upload date
- Delete button

### Nutrition Import Tab

**Database Stats:**
- Total foods in database

**Available CSV Files:**
- File name, category, size
- Import button per file

**Import Result:**
- Total rows, unique foods
- Duplicates removed
- Inserted count
- Error count
- Duplicate details (collapsible)

### PhytoHub Import Tab

**Database Stats:**
- Total compounds
- Foods indexed

**Available Files:**
- Scans for files with "PhytoHub" or "compound" in name
- Import button per file

**Import Result:**
- Total rows, imported, skipped, errors
- Column mapping details

### EFSA Import Tab

**Database Stats:**
- Total EFSA substances
- With HBGV
- Matched to PhytoHub

**Available Files:**
- Looks for OpenFoodToxTX22809_2023.xlsx
- Import button

**Import Result:**
- Imported count
- Matched to PhytoHub count
- Parse statistics

---

## Word Classification Dialog

### Purpose
Review and classify words extracted from Mexican nutrition database for ingredient matching.

### Header
- Title: "Word Classification Review"
- Description explaining purpose

### Stats Section
```
┌─────────────────────────────────────────────────────────────────────┐
│ [Total Words] [Need Review] [Classified] [Completion %]            │
└─────────────────────────────────────────────────────────────────────┘
```

### Action Buttons
- **Food Type Filters**: Toggle filter panel
- **Sync Words**: Extract new words, preserve existing classifications

### Food Type Filter Panel
- Grid of food category checkboxes
- Checked = excluded from extraction
- Default: VARIOS excluded
- Reset to Default button

### Filters Row
- Search input
- Category dropdown
- "Needs Review" toggle button

### Bulk Actions Bar (when items selected)
- Selection count
- Category dropdown
- "Apply to All" button
- Clear button

### Word List
- Select all checkbox
- Each word row:
  - Checkbox
  - Word name
  - Category badge (colored)
  - "Review" badge (if needs review)
  - Frequency count
  - Category dropdown

### Pagination
- "Showing X-Y of Z"
- Previous/Next buttons

### Word Categories

| Value | Label | Color |
|-------|-------|-------|
| `core` | Core Ingredient | green-500 |
| `species` | Species | blue-500 |
| `part` | Part | purple-500 |
| `prepared` | Prepared Item | amber-500 |
| `color` | Color | yellow-500 |
| `processing` | Processing | orange-500 |
| `form` | Form | pink-500 |
| `descriptor` | Descriptor | cyan-500 |
| `connector` | Connector | gray-500 |
| `excluded` | Not Needed | slate-500 |
| `unknown` | Unknown | red-500 |

---

## Hierarchy Review Dialog

### Purpose
Review and confirm parent-child relationships for ingredient hierarchy.

### Header
- Title: "Ingredient Hierarchy Review"
- Description about same species = valid relationship
- Refresh button

### Stats Grid (5 columns)
- Parents count
- Children count
- Confirmed count
- Pending count
- Rejected count

### Audit History Toggle
- Shows recent changes (action, item, from/to parent, status change, date, user)

### Filters
- Search input
- Filter dropdown: All / Conflicts Only / Unconfirmed

### Parent Review Card
```
┌─────────────────────────────────────────────────────────────────────┐
│ ▶ Parent Name [Status Badge] [Conflict Count Badge]       [✓]     │
│   Parent • X children • Scientific Name                            │
│                                                                     │
│   (Expanded content)                                               │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │ ⚠ Taxon Conflicts                                           │  │
│   │ • Child with different taxon                                │  │
│   │ • Different Entity - not a derived form                     │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│   [Notes textarea]                                                  │
│                                                                     │
│   [✓ Confirm All] [✕ Reject Invalid (X)]                           │
│                                                                     │
│   Children List:                                                    │
│   ☐ Child Name [Descriptor] [Status]                               │
│   ☐ Child Name [Different Entity]                       [→]       │
│                                                                     │
│   (Bulk actions when children selected)                            │
└─────────────────────────────────────────────────────────────────────┘
```

### Status Badges
| Status | Color |
|--------|-------|
| Confirmed | green-600 |
| Rejected | destructive |
| Needs Review | yellow-600 |
| Pending | outline |

### Reassign Dialog
- Search for parent input
- List of matching parents
- Select to reassign child

---

## Classification Workspace

**Note**: The Classification Workspace has its own detailed documentation at `/docs/CLASSIFICATION_WORKSPACE_DOCUMENTATION.md`.

### Quick Summary
- Dual-panel layout (35% / 65%)
- Left: Parent candidates list with filtering
- Right: Children list with word classification
- Features: Rejected items view, Prepared items view, Create parent dialog

---

## API Endpoints

### Recipe APIs

#### `GET /api/search`
**Query Parameters:**
| Param | Description |
|-------|-------------|
| `search` | Recipe name search |
| `ingredients` | Comma-separated ingredient list |
| `exactCount` | Exact ingredient count |
| `maxCount` | Maximum ingredients |

#### `GET /api/recipe/[id]`
Returns recipe details + AI-generated analysis

#### `GET /api/ingredients`
Returns list of all ingredients from TheMealDB

### Nutrition APIs

#### `POST /api/nutrition/calculate`
**Body:** `{ ingredients: [{ name, measure }] }`
**Returns:** Total nutrition + per-ingredient data + stats

#### `GET /api/nutrition/import`
Returns available CSV files + database stats

#### `POST /api/nutrition/import`
**Body:** `{ filePath }`
Imports CSV to database

### Bioactive APIs

#### `POST /api/bioactive/match`
**Body:** `{ ingredients, portionCount }`
**Returns:** Matched compounds grouped by ingredient + EFSA/CompTox data

#### `GET/POST /api/bioactive/import`
Manages PhytoHub compound imports

### Toxicity APIs

#### `GET /api/toxicity`
Returns toxicity data

#### `POST /api/toxicity/import-efsa`
Imports EFSA OpenFoodTox data

### Classification APIs

#### `GET/POST /api/words/classifications`
Manage word classifications

#### `POST /api/words/extract`
Extract words from Mexican food database

#### `GET/POST /api/mexican-food/classification-workspace`
Main classification workspace API

#### `GET /api/mexican-food/classification-workspace/children`
Get potential children for a parent

#### `GET /api/mexican-food/classification-workspace/rejected`
Get rejected items

#### `GET /api/mexican-food/classification-workspace/prepared`
Get prepared items

### File APIs

#### `GET /api/upload`
List uploaded files

#### `POST /api/upload`
Upload file with category

#### `DELETE /api/upload`
Delete file

---

## Database Schema

### MexicanFood Model (Key Fields)
```prisma
model MexicanFood {
  id                  String   @id
  conabioId           Int      @unique
  nombreEspanol       String
  taxon               String?  // Scientific name
  tipoAlimento        String?  // VERDURA, FRUTA, VARIOS, MANUAL
  isParent            Boolean  @default(false)
  parentIngredientId  String?
  childCount          Int      @default(0)
  hierarchyStatus     String?  // pending, confirmed, rejected, prepared
  claveOriginal       String?  // MANUAL-{NAME} for manually created
}
```

### WordClassification Model
```prisma
model WordClassification {
  id           String   @id
  word         String
  wordLower    String   @unique
  category     String
  priority     Int
  frequency    Int
  needsReview  Boolean
}
```

### PhytoHubCompound Model
```prisma
model PhytoHubCompound {
  id              String   @id
  name            String
  chemicalClass   String?
  healthEffects   String[]
  foodSources     String[]
  // ... many more fields
}
```

### EFSAReferenceValue Model
```prisma
model EFSAReferenceValue {
  id              String   @id
  substanceName   String
  hbgvType        String?  // ADI, TDI, UL
  adi             Float?
  tdi             Float?
  noael           Float?
  ul              Float?
}
```

### HierarchyAuditLog Model
```prisma
model HierarchyAuditLog {
  id            String   @id
  itemId        String
  itemName      String
  action        String
  oldParentId   String?
  newParentId   String?
  oldStatus     String?
  newStatus     String?
  reviewedBy    String?
  reason        String?
  createdAt     DateTime @default(now())
}
```

---

## State Management

### Main Page State (page.tsx)

```typescript
// UI State
const [loading, setLoading] = useState(false)
const [detailLoading, setDetailLoading] = useState(false)
const [aiLoading, setAiLoading] = useState(false)
const [dialogOpen, setDialogOpen] = useState(false)
const [mounted, setMounted] = useState(false)

// Theme & Language
const { theme, setTheme } = useTheme()
const [language, setLanguage] = useState<Language>('en')

// Search State
const [searchTerm, setSearchTerm] = useState('')
const [ingredients, setIngredients] = useState<string[]>([])
const [ingredientInput, setIngredientInput] = useState('')
const [meals, setMeals] = useState<Meal[]>([])
const [exactIngredientCount, setExactIngredientCount] = useState<number | null>(null)
const [maxIngredients, setMaxIngredients] = useState<number | null>(null)

// Recipe Detail State
const [selectedMeal, setSelectedMeal] = useState<MealDetail | null>(null)
const [nutritionData, setNutritionData] = useState<NutritionData | null>(null)
const [bioactiveCompounds, setBioactiveCompounds] = useState<BioactiveCompound[]>([])
const [foodSafetyData, setFoodSafetyData] = useState<FoodSafetyInfo[]>([])
const [aiLoaded, setAiLoaded] = useState(false)

// Chef Mode State
const [isPlaying, setIsPlaying] = useState(false)
const [currentStep, setCurrentStep] = useState(0)
const [isSpeaking, setIsSpeaking] = useState(false)

// Background State
const [backgroundImage, setBackgroundImage] = useState('')
const [backgroundMode, setBackgroundMode] = useState<'full' | 'balanced' | 'none'>('balanced')

// Dialog States
const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
const [wordClassificationOpen, setWordClassificationOpen] = useState(false)
const [hierarchyReviewOpen, setHierarchyReviewOpen] = useState(false)
const [classificationWorkspaceOpen, setClassificationWorkspaceOpen] = useState(false)

// Nutrition Display State
const [portionMode, setPortionMode] = useState<'portion' | '100g'>('portion')
const [portionCount, setPortionCount] = useState(4)
const [showMinerals, setShowMinerals] = useState(false)
const [showAminoAcids, setShowAminoAcids] = useState(false)
const [showFattyAcids, setShowFattyAcids] = useState(false)
const [showOther, setShowOther] = useState(false)

// File Upload State
const [uploadCategory, setUploadCategory] = useState('general')
const [uploading, setUploading] = useState(false)
const [uploadedFiles, setUploadedFiles] = useState([])

// Import State
const [csvFiles, setCsvFiles] = useState([])
const [importing, setImporting] = useState(false)
const [importResult, setImportResult] = useState(null)
const [phytoHubFiles, setPhytoHubFiles] = useState([])
const [phytoHubImporting, setPhytoHubImporting] = useState(false)
const [efsaFiles, setEfsaFiles] = useState([])
const [efsaImporting, setEfsaImporting] = useState(false)
```

---

## Translations

The application supports English (en) and Spanish (es) with a comprehensive translations object containing 200+ keys.

### Key Translation Categories
- **UI Labels**: Buttons, titles, placeholders
- **Nutrition Terms**: Vitamins, minerals, amino acids, fatty acids
- **Status Messages**: Loading, success, error
- **Food Safety**: Hazards, handling, storage

### Example Structure
```typescript
const translations = {
  en: {
    title: 'Phyto Kit',
    subtitle: 'Discover Nutritious Recipes',
    searchPlaceholder: 'Search recipes by name...',
    // ... 200+ more keys
  },
  es: {
    title: 'Phyto Kit',
    subtitle: 'Descubre Recetas Nutritivas',
    searchPlaceholder: 'Buscar recetas por nombre...',
    // ... 200+ more keys
  }
}
```

---

## Visual Design Specifications

### Color Palette

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Primary | emerald-500/600 | emerald-400/500 |
| Background | white | gray-950 |
| Card | white | gray-900 |
| Muted | gray-100 | gray-800 |
| Border | gray-200 | gray-800 |
| Text | gray-900 | gray-100 |
| Muted Text | gray-500 | gray-400 |
| Destructive | red-500 | red-400 |
| Success | green-500 | green-400 |

### Typography

| Element | Size | Weight | Class |
|---------|------|--------|-------|
| Page Title | text-2xl | bold | font-bold |
| Section Title | text-xl | bold | font-bold |
| Card Title | text-lg | semibold | font-semibold |
| Body | text-sm | normal | - |
| Caption | text-xs | normal | text-muted-foreground |
| Stats Number | text-2xl | bold | font-bold |

### Spacing

| Context | Value |
|---------|-------|
| Page padding | px-4 py-8 |
| Section gap | mb-12 |
| Card padding | p-4 |
| Input height | h-12 (large), h-10 (default), h-7 (small) |
| Button gap | gap-2 |

### Responsive Breakpoints

| Prefix | Min Width |
|--------|-----------|
| sm | 640px |
| md | 768px |
| lg | 1024px |
| xl | 1280px |

### Animation Specs

| Animation | Duration | Timing |
|-----------|----------|--------|
| Page fade in | 500ms | ease-out |
| Card hover | 300ms | ease |
| Image zoom | 500ms | ease |
| Toast slide | 300ms | ease-out |
| Background transition | 700ms | ease |

---

## Key Files Reference

| File | Lines | Purpose |
|------|-------|---------|
| `src/app/page.tsx` | 3724 | Main application page |
| `src/components/ingredient-classification-workspace.tsx` | 1834 | Classification workspace |
| `src/components/word-classification-dialog.tsx` | 648 | Word classification UI |
| `src/components/hierarchy-review.tsx` | 827 | Hierarchy review UI |
| `src/app/layout.tsx` | 62 | Root layout |
| `src/types/recipe.ts` | - | TypeScript types |

---

## Appendix: Getting Started

1. **Install Dependencies**
   ```bash
   bun install
   ```

2. **Setup Database**
   ```bash
   bun run db:push
   ```

3. **Run Development Server**
   ```bash
   bun run dev
   ```

4. **Import Data**
   - Upload nutrition CSV via Documents dialog
   - Import PhytoHub compounds
   - Import EFSA toxicity data

5. **Classify Ingredients**
   - Use Word Classification dialog for word categorization
   - Use Classification Workspace for parent-child relationships
   - Use Hierarchy Review for confirmation

---

*Documentation generated for Phyto Kit - Recipe Discovery & Nutritional Analysis Application*
