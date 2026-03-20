# Phyto Kit - Complete Application Documentation

> **Version:** 2.0  
> **Last Updated:** March 2026  
> **Purpose:** Comprehensive documentation for recreating the entire Phyto Kit application

---

## Table of Contents

1. [Application Overview](#application-overview)
2. [Technology Stack](#technology-stack)
3. [External APIs & Tokens](#external-apis--tokens)
4. [Project Structure](#project-structure)
5. [Main Page Layout](#main-page-layout)
6. [Header Section](#header-section)
7. [Hero Search Section](#hero-search-section)
8. [Recipe Cards Grid](#recipe-cards-grid)
9. [Recipe Detail Dialog](#recipe-detail-dialog)
10. [File Upload Dialog](#file-upload-dialog)
11. [Word Classification Dialog](#word-classification-dialog)
12. [Hierarchy Review Dialog](#hierarchy-review-dialog)
13. [Classification Workspace](#classification-workspace)
14. [Backup Management Dialog](#backup-management-dialog)
15. [Conservation Status System](#conservation-status-system)
16. [API Endpoints](#api-endpoints)
17. [Database Schema](#database-schema)
18. [State Management](#state-management)
19. [Translations](#translations)
20. [Visual Design Specifications](#visual-design-specifications)

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
- Track conservation status of wild-harvested ingredients (IUCN/CITES)
- Create and restore backups of classification work

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
| **Conservation Status** | IUCN Red List and CITES database integration |
| **Backup Management** | File-based backup system with incremental support |

### Workflow
```
Search Recipes → Select Recipe → View Details (Recipe/Nutrition/Bioactive/Safety/Chef Mode)
                                    ↓
                          Manage Data (Upload/Import/Classification/Backup)
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
| API | Purpose | Token Required |
|-----|---------|----------------|
| IUCN Red List v4 | Species conservation status | Yes |
| USDA FoodData Central | Nutrition data fallback | Yes |
| EPA CompTox | Toxicity data | No (open) |
| TheMealDB | Recipe data | No |
| Web Speech API | Text-to-speech | No |

---

## External APIs & Tokens

### Environment Variables (.env)

```env
DATABASE_URL=file:/home/z/my-project/db/custom.db
IUCN_API_TOKEN=your_iucn_api_token_here
USDA_API_KEY=your_usda_api_key_here
```

### IUCN Red List API

| Property | Value |
|----------|-------|
| **Environment Variable** | `IUCN_API_TOKEN` |
| **API Version** | v4 |
| **Base URL** | `https://api.iucnredlist.org/api/v4` |
| **Endpoint** | `/taxa/scientific_name?genus_name={genus}&species_name={species}` |
| **Authentication** | Header: `Authorization: {token}` |
| **Purpose** | Species conservation status (CR, EN, VU, NT, LC, etc.) |

**Request Example:**
```typescript
const response = await fetch(
  `https://api.iucnredlist.org/api/v4/taxa/scientific_name?genus_name=Ceiba&species_name=pentandra`,
  {
    headers: {
      'Authorization': IUCN_API_TOKEN,
      'Accept': 'application/json',
      'User-Agent': 'PhytoKit/1.0'
    }
  }
)
```

### USDA FoodData Central API

| Property | Value |
|----------|-------|
| **Environment Variable** | `USDA_API_KEY` |
| **Base URL** | `https://api.nal.usda.gov/fdc/v1` |
| **Endpoint** | `/foods/search?api_key={key}&query={query}` |
| **Purpose** | Nutrition data fallback for ingredients not in Mexican database |

**Request Example:**
```typescript
const response = await fetch(
  `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${query}`
)
```

### EPA CompTox API

| Property | Value |
|----------|-------|
| **Authentication** | Open (no token required) |
| **Base URL** | `https://comptox.epa.gov/ctx-api` |
| **Purpose** | Toxicity, hazard, and exposure data for chemicals |
| **Rate Limiting** | 200ms delay between requests (self-imposed) |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Main application page (3791 lines)
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
│       ├── backup/route.ts           # Backup management API
│       ├── conservation-status/route.ts  # IUCN/CITES lookup
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
│   ├── ingredient-classification-workspace.tsx  # (3630 lines)
│   ├── backup-management.tsx                    # (1054 lines)
│   ├── word-classification-dialog.tsx
│   ├── hierarchy-review.tsx
│   ├── theme-provider.tsx
│   └── ui/                    # shadcn/ui components
├── lib/
│   ├── db.ts                  # Prisma client
│   ├── utils.ts               # Utilities
│   ├── usda-api.ts            # USDA API
│   ├── comptox-api.ts         # CompTox API
│   ├── web-search.ts          # Web search & IUCN API
│   ├── backup-service.ts      # Backup functionality
│   └── search-utils.ts        # Search utilities
├── data/
│   └── cites-cache.ts         # CITES species cache (41,664 species)
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
      {/* Backup Management Button */}
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

#### 7. Backup Management Button
| Property | Value |
|----------|-------|
| **Icon** | Archive |
| **Variant** | ghost |
| **Size** | icon |
| **Shape** | rounded-full |
| **Title** | "Backup Management" |
| **Action** | Opens backup management dialog |

#### 8. Theme Toggle
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
- **Conservation Status**: Auto-check from IUCN/CITES for parents
- **Notes**: Add ethnobotanical notes for parents and children

---

## Backup Management Dialog

### Purpose
Manage file-based backups stored in `/backups` folder. Supports incremental and full backups.

### Dialog Structure
```
┌─────────────────────────────────────────────────────────────────────┐
│ 📦 Backup Management                                                │
│ File-based backups stored in /backups folder                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ CURRENT STATUS                                                  │ │
│ │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │ │
│ │ │Total│ │Child│ │Items│ │Pend │ │Words│ │Last │               │ │
│ │ │Paren│ │ren  │ │Total│ │Items│ │Class│ │Backu│               │ │
│ │ │ 53  │ │ 126 │ │2239 │ │  0  │ │1315 │ │p    │               │ │
│ │ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘               │ │
│ │                                                                 │ │
│ │ Storage Usage                                                   │ │
│ │ [████████░░░░░░░░░░░░] 42%                                     │ │
│ │ 2.1 MB / 5.0 MB                                                │ │
│ │ [7 Total] [3 Auto] [4 Manual] [5 Incremental] [2 Full]         │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ ACTIONS                                                         │ │
│ │ ┌─────────────────────────────────────────────────────────────┐ │ │
│ │ │ 🔧 Incremental Mode                                    [🟢] │ │ │
│ │ │ Only backup changes since last backup (saves space)         │ │ │
│ │ └─────────────────────────────────────────────────────────────┘ │ │
│ │                                                                 │ │
│ │ [📥 Create Backup]  [🗄 Create Full Backup]                     │ │
│ │                                                                 │ │
│ │ Incremental backups save space by storing only changes         │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ BACKUP HISTORY                                                  │ │
│ │ ┌─────────────────────────────────────────────────────────────┐ │ │
│ │ │ ☐ backup-2026-03-19...json                                 │ │ │
│ │ │   [Manual] [Incremental] [3 changes]                        │ │ │
│ │ │   Includes: Hierarchy, Taxonomy, Conservation, Notes        │ │ │
│ │ │   🕐 Mar 19, 2026, 5:56 AM • 45.2 KB • 53p, 126c           │ │ │
│ │ │                                             [↺ Restore]      │ │ │
│ │ └─────────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Dialog Properties
| Property | Value |
|----------|-------|
| **Max Width** | max-w-5xl |
| **Height** | h-[85vh] (fixed height for scroll) |
| **Overflow** | hidden, flex flex-col |
| **ScrollArea** | flex-1 h-0 (enables scrolling) |

### Current Status Card

**Stats Grid (6 columns):**
| Stat | Label |
|------|-------|
| Total Parents | `totalParents` |
| Total Children | `totalChildren` |
| Total Items | `totalItems` |
| Pending Items | `pendingItems` |
| Word Classifications | `totalWordClassifications` |
| Last Backup | `lastBackup` (or "Never") |

**Storage Usage:**
- Progress bar showing `usagePercent`
- Colors: Normal (default), Warning (>50%, yellow), Critical (>80%, red)
- Badge row: Total, Automatic, Manual, Incremental, Full

### Actions Section

**Incremental Mode Toggle:**
```tsx
<div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
  <div className="flex items-center gap-3">
    <FileJson className="w-5 h-5 text-emerald-500" />
    <div>
      <Label>Incremental Mode</Label>
      <p className="text-sm text-muted-foreground">
        Only backup changes since last backup (saves space)
      </p>
    </div>
  </div>
  <Switch checked={incrementalMode} onCheckedChange={setIncrementalMode} />
</div>
```

**Action Buttons:**

| Button | Icon | Description |
|--------|------|-------------|
| Create Backup | Download | Creates incremental or full backup based on toggle |
| Create Full Backup | Database | Always creates full backup |
| Delete Selected | Trash2 | Deletes selected backups (shown when items selected) |

### Backup History

**Backup Item Card:**
```tsx
<div className="border rounded-lg p-4">
  <div className="flex items-start gap-3">
    <Checkbox />  {/* For selection */}
    
    <div className="flex-1">
      {/* Name + Badges */}
      <div className="flex items-center gap-2 mb-2">
        <span className="font-medium">{backup.name}</span>
        <Badge>{trigger}</Badge>  {/* Manual/Auto */}
        <Badge>{type}</Badge>     {/* Incremental/Full */}
        {backup.changesCount && <Badge>{changesCount} Changes</Badge>}
      </div>
      
      {/* Includes badges */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs">Includes:</span>
        {includesHierarchy && <Badge>Hierarchy</Badge>}
        {includesTaxonomy && <Badge>Taxonomy</Badge>}
        {/* ... other includes */}
      </div>
      
      {/* Metadata row */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span><Clock /> {formatDate(backup.createdAt)}</span>
        <span><FileJson /> {formatSize(backup.fileSizeBytes)}</span>
        <span>{backup.totalParents} parents, {backup.totalChildren} children</span>
      </div>
    </div>
    
    <Button variant="outline" size="sm">
      <RotateCcw /> Restore
    </Button>
  </div>
</div>
```

### Restore Dialog

**Selective Restore Options:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ Selective Restore                                                   │
│ Select which parts to restore                                       │
│                                                                     │
│ backup-2026-03-19...json • 45.2 KB • Incremental                  │
│                                                                     │
│ ☑ Hierarchy Relationships                                          │
│ ☑ Scientific Names                                                 │
│ ☑ Conservation Status                                              │
│ ☑ Notes                                                            │
│ ☑ Word Classifications                                             │
│ ☐ Audit Logs                                                       │
│ ☐ Nutrition Data                                                   │
│ ☐ Recipes                                                          │
│                                                                     │
│ [👁 Preview]                              [Cancel] [Confirm Restore] │
└─────────────────────────────────────────────────────────────────────┘
```

### Backup Triggers

| Trigger | Icon | Description |
|---------|------|-------------|
| manual | FileText | User-initiated backup |
| hierarchy | Layers | After hierarchy change |
| taxonomy | Tag | After scientific name update |
| conservation | Shield | After conservation status update |
| notes | FileQuestion | After notes update |
| auto | RefreshCw | Automatic backup |

---

## Conservation Status System

### Purpose
Track conservation status of wild-harvested ingredients using IUCN Red List and CITES databases.

### Data Flow
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  MexicanFood    │     │  Conservation   │     │   External      │
│  (taxon field)  │────▶│  Status API     │────▶│   APIs          │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │                        │
                               ▼                        ▼
                        ┌─────────────────────────────────────┐
                        │  1. Check KNOWN_STATUS cache        │
                        │  2. Check CITES_CACHE (41,664 spp)  │
                        │  3. Try IUCN API (if token set)     │
                        │  4. Fallback to web search          │
                        └─────────────────────────────────────┘
```

### Conservation Status Structure

```typescript
interface ConservationResult {
  scientificName: string
  iucnCategory: string | null      // CR, EN, VU, NT, LC, DD, NE
  citesStatus: string | null       // I, II, III, not_listed
  regionalStatus: string | null    // NOM-059, etc.
  riskLevel: string                // critical, high, moderate, low, stable, unknown
  tradeRestricted: boolean         // True if CITES I or II
  sources: string[]                // ['IUCN', 'CITES', 'NOM-059']
  lastAssessed: string | null      // ISO date
  matchType: 'exact' | 'genus_inference' | 'web_search' | 'not_found' | 'error'
  matchedSpecies?: string          // When genus inference used
  needsVerification?: boolean      // True for inferred results
}
```

### IUCN Categories

| Code | Category | Risk Level |
|------|----------|------------|
| CR | Critically Endangered | critical |
| EN | Endangered | high |
| VU | Vulnerable | moderate |
| NT | Near Threatened | low |
| LC | Least Concern | stable |
| DD | Data Deficient | unknown |
| NE | Not Evaluated | unknown |

### CITES Appendices

| Appendix | Description | Trade Restricted |
|----------|-------------|------------------|
| I | Threatened with extinction | Yes |
| II | May become threatened | Yes |
| III | Protected in at least one country | Varies |
| not_listed | Not on CITES | No |

### Local Cache (KNOWN_STATUS)

The API includes a local cache for commonly used food species:

```typescript
const KNOWN_STATUS: Record<string, Partial<ConservationResult>> = {
  // Ceiba pentandra (Pochote, Kapok tree) - Vulnerable
  'ceiba pentandra': { 
    iucnCategory: 'VU', 
    citesStatus: 'not_listed', 
    riskLevel: 'moderate', 
    tradeRestricted: false, 
    sources: ['IUCN'] 
  },
  
  // Sturgeons - critically endangered
  'acipenser baerii': { iucnCategory: 'EN', citesStatus: 'II', riskLevel: 'high', tradeRestricted: true },
  
  // Common safe species
  'allium cepa': { iucnCategory: 'LC', citesStatus: 'not_listed', riskLevel: 'stable' },
  // ... more species
}
```

### UI in Classification Workspace

**Parent Conservation Status Section:**
```tsx
{/* Conservation Status Section */}
<div className="mt-2 pt-2 border-t">
  <div className="flex items-center justify-between mb-1.5">
    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
      <ShieldAlert className="h-3 w-3" />
      Conservation Status:
    </span>
  </div>
  
  {selectedParent.conservationStatus ? (
    <div className="bg-muted/30 p-2 rounded">
      {/* Status display with badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {iucnCategory && <Badge>{iucnCategory}</Badge>}
        {citesStatus && <Badge>{citesStatus}</Badge>}
        <Badge className={riskColor}>{riskLevel}</Badge>
      </div>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Not checked</span>
      <Button size="sm" variant="outline" onClick={checkConservationStatus}>
        Check Status
      </Button>
    </div>
  )}
</div>
```

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

### Conservation Status API

#### `GET /api/conservation-status`
**Query Parameters:**
| Param | Description |
|-------|-------------|
| `scientificName` | Scientific name to check |
| `itemId` | MexicanFood item ID (to get taxon) |
| `batch` | Set to 'true' for batch processing |

**Response:**
```json
{
  "success": true,
  "scientificName": "Ceiba pentandra",
  "result": {
    "iucnCategory": "VU",
    "citesStatus": "not_listed",
    "riskLevel": "moderate",
    "tradeRestricted": false,
    "sources": ["IUCN"],
    "matchType": "exact"
  }
}
```

#### `POST /api/conservation-status`
**Body:** `{ itemId, autoLookup: true }`
**Action:** Auto-lookup and save conservation status

### Backup API

#### `GET /api/backup`
**Query Parameters:**
| Param | Description |
|-------|-------------|
| `action` | 'stats' or 'list' |
| `limit` | Number of backups to return |

#### `POST /api/backup`
**Actions:**
| Action | Body | Description |
|--------|------|-------------|
| `create` | `{ trigger, description, isIncremental }` | Create new backup |
| `restore` | `{ backupId, restoreOptions, dryRun }` | Restore from backup |
| `delete-multiple` | `{ backupIds }` | Delete backups |

### Classification APIs

#### `GET/POST /api/words/classifications`
Manage word classifications

#### `POST /api/words/extract`
Extract words from Mexican food database

#### `GET/POST /api/mexican-food/classification-workspace`
Main classification workspace API

**Response includes:**
```json
{
  "candidates": [{
    "word": "Pochote",
    "wordLower": "pochote",
    "itemId": "abc123",
    "potentialChildren": 0,
    "isParent": true,
    "taxon": "Ceiba pentandra",
    "conservationStatus": "{...json...}",
    "notes": "Nombre con el que se conoce a Ceiba pentandra..."
  }]
}
```

**Actions:**
| Action | Body | Description |
|--------|------|-------------|
| `set-as-parent` | `{ itemId, scientificName? }` | Confirm as parent |
| `update-conservation-status` | `{ itemId, conservationStatus }` | Update conservation |
| `update-notes` | `{ itemId, notes }` | Update notes |
| `link-children` | `{ childIds, parentId }` | Link children |
| `reject-children` | `{ childIds }` | Reject children |
| `mark-prepared` | `{ childIds }` | Mark as prepared |

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

### MexicanFood Model (Complete)
```prisma
model MexicanFood {
  id                      String   @id @default(cuid())
  conabioId               Int      @unique
  nombreEspanol           String
  taxon                   String?  // Scientific name
  tipoAlimento            String?  // VERDURA, FRUTA, VARIOS, MANUAL
  
  // Hierarchy fields
  isParent                Boolean  @default(false)
  parentIngredientId      String?
  childCount              Int      @default(0)
  hierarchyStatus         String?  // 'pending', 'confirmed', 'rejected', 'prepared'
  hierarchyReviewedBy     String?
  hierarchyReviewedAt     DateTime?
  hierarchyNotes          String?
  
  // Scientific name tracking
  scientificNameNotNeeded Boolean  @default(false)
  
  // Conservation & Notes
  conservationStatus      String?  // JSON: ConservationResult
  notes                   String?  // Ethnobotanical notes
  
  // For manually created parents
  claveOriginal           String?  // 'MANUAL-{NAME}' for created parents
  descripcionAlimento     String?
  
  // Nutrition fields (50+ fields)
  energia                 Float?
  proteinaBruta           Float?
  // ... all nutrition fields
  
  // Metadata
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
  
  @@map("MexicanFood")
}
```

### WordClassification Model
```prisma
model WordClassification {
  id           String   @id @default(cuid())
  word         String
  wordLower    String   @unique
  category     String
  subcategory  String?
  priority     Int
  examples     String?
  frequency    Int
  needsReview  Boolean  @default(true)
  reviewedBy   String?
  reviewedAt   DateTime?
  notes        String?
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@map("WordClassification")
}
```

### BackupRecord Model
```prisma
model BackupRecord {
  id                      String   @id @default(cuid())
  name                    String
  filePath                String
  fileName                String
  fileSizeBytes           Float
  checksum                String?
  
  // Backup type
  trigger                 String   // manual, hierarchy, taxonomy, etc.
  triggerDescription      String?
  isAutomatic             Boolean  @default(false)
  isIncremental           Boolean  @default(false)
  previousBackupId        String?
  changesCount            Int      @default(0)
  includesFullSnapshot    Boolean  @default(false)
  
  // What's included
  includesHierarchy       Boolean  @default(true)
  includesTaxonomy        Boolean  @default(true)
  includesConservation    Boolean  @default(true)
  includesNotes           Boolean  @default(true)
  includesWordClassifications Boolean @default(true)
  includesAuditLogs       Boolean  @default(false)
  includesNutrition       Boolean  @default(false)
  includesRecipes         Boolean  @default(false)
  
  // Stats at backup time
  totalParents            Int
  totalChildren           Int
  totalItems              Int
  pendingItems            Int
  totalWordClassifications Int
  
  // Management
  isDeleted               Boolean  @default(false)
  
  createdAt               DateTime @default(now())
  
  @@map("BackupRecord")
}
```

### HierarchyAuditLog Model
```prisma
model HierarchyAuditLog {
  id            String   @id @default(cuid())
  itemId        String
  itemName      String
  action        String   // 'set_as_parent', 'link_child', 'update_notes', etc.
  oldParentId   String?
  newParentId   String?
  oldStatus     String?
  newStatus     String?
  reviewedBy    String?
  reason        String?
  createdAt     DateTime @default(now())
  
  @@map("HierarchyAuditLog")
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
const [backupManagementOpen, setBackupManagementOpen] = useState(false)

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
| `src/app/page.tsx` | 3791 | Main application page |
| `src/components/ingredient-classification-workspace.tsx` | 3630 | Classification workspace |
| `src/components/backup-management.tsx` | 1054 | Backup management dialog |
| `src/app/api/mexican-food/classification-workspace/route.ts` | ~950 | Classification API |
| `src/app/api/conservation-status/route.ts` | ~475 | Conservation status API |
| `src/app/api/backup/route.ts` | ~400 | Backup API |
| `src/lib/web-search.ts` | ~407 | IUCN API & web search |
| `src/lib/backup-service.ts` | ~300 | Backup utilities |

---

## Deployment Notes

### Environment Setup
1. Copy `.env.example` to `.env`
2. Add required API tokens:
   - `IUCN_API_TOKEN` - Get from IUCN Red List
   - `USDA_API_KEY` - Get from USDA FoodData Central
3. Run `bun run db:push` to initialize database
4. Run `bun run dev` to start development server

### Backup Storage
- Backups are stored in `/backups` folder
- Default size limit: 5MB
- Configure via `maxBackupSizeBytes` in backup API

### CITES Cache
- Pre-loaded with 41,664 species
- File: `src/data/cites-cache.ts`
- Generated from CITES Species+ database

---

*Documentation generated for Phyto Kit v2.0 - March 2026*
