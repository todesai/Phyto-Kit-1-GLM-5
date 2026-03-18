# Phyto Kit Development Worklog

---
Task ID: 8
Agent: Main Agent
Task: Analyze Zenodo OpenFoodTox dataset and add EFSA toxicity import UI

Work Log:
- Analyzed Zenodo URL: https://zenodo.org/records/8120114
- Identified most useful dataset: **OpenFoodToxTX22809_2023.xlsx** (Full Database)
  - Contains 5,700+ unique substances with toxicological data
  - Health-based guidance values (ADI, TDI, UL, ARfD)
  - Reference points (NOAEL, LOAEL, BMDL)
  - Already uploaded at `/home/z/my-project/upload/OpenFoodToxTX22809_2023.xlsx`
- Analyzed uploaded UI mockup images:
  - Recipe card with hero image
  - Tab navigation (Recipe, Nutrition, Bioactives, Safety, Chef Mode)
  - Ingredients with source badges ("BD Mexicana", "USDA", "No Encontrado")
- Added EFSA Import Tab to Documents dialog:
  - New EFSA states (efsaFiles, efsaImporting, efsaResult, efsaStats)
  - EFSA import function (handleImportEfsa)
  - EFSA fetch function (fetchEfsaFiles)
  - Translations for EN/ES
  - Tab panel with:
    - Database stats display
    - Available files list
    - Import button with loading state
    - Import result display (parse stats + import stats)
    - Link to Zenodo source

Available Files from Zenodo:
| File | Use Case |
|------|----------|
| OpenFoodToxTX22809_2023.xlsx | Full database (recommended) |
| SubstanceCharacterisation_KJ_2023.xlsx | Chemical identification |
| ReferenceValues_KJ_2023.xlsx | ADI, TDI, UL values |
| ReferencePoints_KJ_2023.xlsx | NOAEL, LOAEL data |
| Genotoxicity_KJ_2023.xlsx | Genotoxicity assessments |
| PhysChem_Toxicokinetics_KJ_2023.xlsx | Pharmacokinetic data |

Stage Summary:
- Zenodo dataset analysis complete
- OpenFoodToxTX22809_2023.xlsx identified as most useful
- EFSA import UI added to Documents dialog (4th tab)
- API endpoint already exists at `/api/toxicity/import-efsa`
- Ready for user to import EFSA data

Files Modified:
- `/src/app/page.tsx` - Added EFSA import tab and functions

---
Task ID: 7-11
Agent: Main Agent
Task: Integrate USDA API and update nutrition UI

Work Log:
- Created USDA FoodData Central API service (`/src/lib/usda-api.ts`)
  - Nutrient ID mapping (81 nutrients mapped to our schema)
  - Search and fetch functions
  - Rate limit handling (1,200 requests/hour)
- Added USDA_API_KEY to .env (user needs to add their key)
- Updated nutrition calculation API to use cascade:
  1. Mexican DB (primary) - for Mexican ingredients
  2. USDA (fallback) - for international ingredients
  3. AI estimation (last resort) - if both fail
- Updated NutritionData type with expanded fields
- Added NutritionApiResponse type for API response
- Updated page.tsx with:
  - New translations for data sources and nutrients
  - Nutrition stats state (source breakdown)
  - Loading indicator while fetching nutrition
  - Data source indicator badges (Mexican DB / USDA / Not Found)
  - Expanded nutrition sections:
    - Macronutrients (always visible, 6 items)
    - Vitamins (always visible, 5 items: A, B1, B2, B3, C)
    - Minerals (collapsible, 11 items with values)
  - Hide null/zero values

UI Layout Strategy Implemented:
| Section | Items | Display |
|---------|-------|---------|
| Macronutrients | 6 | Always visible |
| Vitamins | 5 | Always visible |
| Minerals | 11 | Collapsible (show only with values) |

Data Source Cascade:
```
Ingredient → Mexican DB → USDA → Estimation
            (primary)   (fallback) (last resort)
```

Stage Summary:
- USDA API integration complete (needs API key)
- Nutrition calculation uses cascade fallback
- UI shows data source indicator
- Expanded nutrients displayed with collapsible sections
- Null/zero values hidden from display

Files Created/Modified:
- `/src/lib/usda-api.ts` - USDA API service
- `/src/app/api/nutrition/calculate/route.ts` - Cascade nutrition API
- `/src/types/recipe.ts` - Extended nutrition types
- `/src/app/page.tsx` - Expanded nutrition UI
- `.env` - Added USDA_API_KEY placeholder

Next Steps:
- User needs to add USDA API key to .env
- Import the Mexican CSV database
- Test the complete cascade with real recipes

---
Task ID: 9
Agent: Main Agent
Task: Optimize hierarchy algorithm and implement audit trail

Work Log:
- **Algorithm Optimization**:
  - Identified performance issue: original algorithm did 2,239 individual DB updates
  - Created optimized `establish-hierarchy-v2` algorithm
  - Processes descriptor extraction in memory first, then batch updates
  - Uses 500-item batch size for parallel updates
  - Completed in 2.5 seconds (vs timing out before)
  - Results: 27 parents, 63 children from 72 taxon groups

- **Algorithm Improvements**:
  - Primary grouping by scientific name (taxon)
  - Correctly excludes derived products (miel de, aceite de, etc.)
  - Correctly excludes different biological entities (gusano de, larva de, etc.)
  - Conservative fallback for items without taxon

- **Audit Trail System**:
  - Added `HierarchyAuditLog` model to Prisma schema
  - Tracks: action, old/new parent, old/new status, reviewedBy, reason, timestamp
  - Added audit logging to ALL hierarchy actions:
    - confirm-parent, confirm-all-children, confirm-child
    - reject-child, reject-multiple-children
    - reassign-child, set-standalone

- **Bug Fixes**:
  - Fixed race condition in reject-child (was querying parent after nulling it)
  - Fixed multiple children rejection to properly track parent names

- **UI Improvements**:
  - Added `reviewedBy: 'user'` to all API calls
  - Added "Recent Changes" button to show audit history
  - Fixed stats display to show confirmed/pending/rejected breakdown (5 columns)
  - Added collapsible audit history panel with last 10 changes

Stage Summary:
- Hierarchy algorithm optimized (2.5s runtime)
- Full audit trail implemented
- All race conditions fixed
- UI shows proper status breakdown and change history

Files Modified:
- `/prisma/schema.prisma` - Added HierarchyAuditLog model
- `/src/app/api/mexican-food/hierarchy/route.ts` - Audit logging + new GET endpoint
- `/src/components/hierarchy-review.tsx` - UI improvements + audit history display
- `/scripts/run-hierarchy-v2.ts` - Standalone script for algorithm

---
Task ID: 10
Agent: Main Agent
Task: Create unified Classification Workspace for parent-child relationships and word tagging

Work Log:
- **Data Cleanup**:
  - Identified 25 multi-word parents that needed reclassification as children
  - Reclassified all multi-word parents to children (unlinked)
  - Excluded tipoAlimento "VARIOS" (225 items) and "ADEREZO" (4 items) from parent candidates
  - Remaining parents: 2 (Apio, Mezquite)
  - Single-word parent candidates: 92 unique words

- **New Classification Workspace Component** (`/src/components/ingredient-classification-workspace.tsx`):
  - Single-tab interface combining parent-child review and word classification
  - Left panel: Parent candidates list with search, filter, pagination (50/100/200/500)
  - Right panel: Children list with inline word breakdown
  - Features:
    - Click parent → shows all items containing that word
    - Batch select children (link/reject)
    - Expand child to classify individual words
    - 12 word categories: core, processing, form, color, state, part, size, presentation, species, connector, excluded, unknown
    - Color-coded word tags with category badges
    - Already-classified words shown with green checkmark

- **API Endpoints**:
  - `GET /api/mexican-food/classification-workspace` - Fetch parent candidates with potential child counts
  - `GET /api/mexican-food/classification-workspace/children` - Fetch children for a parent word
  - `POST /api/mexican-food/classification-workspace` - Actions: set-as-parent, link-children, reject-children, upgrade-to-parent

- **Page.tsx Updates**:
  - Added `Layers` icon import
  - Added `IngredientClassificationWorkspace` component import
  - Added state: `classificationWorkspaceOpen`, `setClassificationWorkspaceOpen`
  - Added button in header (next to Hierarchy Review)
  - Added full-screen dialog (95vw x 95vh)

Stage Summary:
- Data cleanup complete: multi-word parents reclassified
- Unified workspace created for parent-child + word classification workflow
- Single-tab interface as requested
- Color-coded word classification with dropdowns
- App running successfully at localhost:3000

Files Created/Modified:
- `/src/components/ingredient-classification-workspace.tsx` - New unified workspace component
- `/src/app/api/mexican-food/classification-workspace/route.ts` - Main API
- `/src/app/api/mexican-food/classification-workspace/children/route.ts` - Children API
- `/src/app/page.tsx` - Added button and dialog
