# Ingredient Classification Workspace - Complete UI Documentation

> **Version:** 2.0  
> **Last Updated:** March 2026  
> **Purpose:** Detailed documentation for recreating the Phyto Kit Classification Workspace interface

---

## Table of Contents

1. [Overview](#overview)
2. [Layout Structure](#layout-structure)
3. [Header Section](#header-section)
4. [Left Panel - Parent Candidates](#left-panel---parent-candidates)
5. [Right Panel - Children & Classification](#right-panel---children--classification)
6. [Rejected Items View](#rejected-items-view)
7. [Prepared Items View](#prepared-items-view)
8. [Create Parent Dialog](#create-parent-dialog)
9. [Word Categories System](#word-categories-system)
10. [API Endpoints](#api-endpoints)
11. [Database Schema](#database-schema)
12. [State Management](#state-management)
13. [Visual Design Specifications](#visual-design-specifications)

---

## Overview

### Purpose
The Ingredient Classification Workspace is a dual-panel interface for managing food ingredient hierarchies in the Mexican Food Database. It allows users to:
- Identify parent ingredients (single-word items)
- Link child ingredients to their parents
- Classify individual words within ingredient names
- Manage rejected and prepared food items

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Parent** | A single-word ingredient (e.g., "Papa", "Tomate") that has children variants |
| **Child** | A multi-word ingredient containing a parent word (e.g., "Papa Blanca", "Tomate Verde") |
| **Potential Child** | An item that matches the parent word but isn't linked yet |
| **Linked Child** | A child item that has been confirmed to belong to a parent |
| **Rejected** | Items explicitly marked as NOT children of a parent |
| **Prepared** | Processed/prepared food items (e.g., from VARIOS category) |
| **Word Classification** | Categorizing each word in an ingredient name (e.g., "descriptor", "form", "color") |

### Workflow
```
Select Parent → Confirm as Parent → Link/Reject Children → Classify Words
```

---

## Layout Structure

### Overall Layout
```
┌─────────────────────────────────────────────────────────────────────┐
│                         HEADER SECTION                              │
│  Title + Buttons (Rejected, Prepared, Refresh, Create Parent)       │
│  Stats Bar (parent counts, word classification counts)              │
├──────────────────────┬──────────────────────────────────────────────┤
│                      │                                              │
│   LEFT PANEL         │              RIGHT PANEL                     │
│   Parent Candidates  │              Children & Classification       │
│   (35% width)        │              (65% width)                     │
│                      │                                              │
│   - Search           │   - Selected Parent Header                   │
│   - Filter dropdown  │   - Scientific Name Selector                 │
│   - Page size        │   - Bulk Actions (when items selected)       │
│   - Parent list      │   - Children List with word breakdown        │
│   - Pagination       │                                              │
│                      │                                              │
├──────────────────────┴──────────────────────────────────────────────┤
│                         LEGEND FOOTER                               │
│            Word Categories + Status Indicators                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Container Classes
```css
/* Main Container */
.h-full.flex.flex-col.bg-background

/* Main Content (Two Panels) */
.flex-1.flex.min-h-0.overflow-hidden

/* Left Panel */
.w-[35%].min-w-[300px].border-r.flex.flex-col.min-h-0

/* Right Panel */
.flex-1.flex.flex-col.min-h-0.overflow-hidden
```

---

## Header Section

### Structure
```tsx
<div className="border-b bg-muted/30 px-4 py-3 flex-shrink-0">
  {/* Row 1: Title + Action Buttons */}
  <div className="flex items-center justify-between mb-3">
    {/* Title Group */}
    <div>
      <h1>Ingredient Classification Workspace</h1>
      <p>Select a parent → Confirm/reject children → Classify words</p>
    </div>
    {/* Action Buttons */}
    <div className="flex items-center gap-2">
      {/* Rejected Button */}
      {/* Prepared Button */}
      {/* Refresh Button */}
      {/* Create Parent Button */}
      {/* Close Button (optional) */}
    </div>
  </div>
  
  {/* Row 2: Stats Bar */}
  <div className="flex gap-4 text-sm flex-wrap">
    {/* Stats items */}
  </div>
</div>
```

### Header Action Buttons

#### 1. Rejected Button
| Property | Value |
|----------|-------|
| **Icon** | `XCircle` (lucide-react) |
| **Label** | `Rejected ({count})` |
| **Variant** | `outline` |
| **Size** | `sm` |
| **Active Style** | `bg-destructive/10 text-destructive border-destructive/50` |
| **Click Action** | Toggle Rejected view, close Prepared view, fetch rejected items |

```tsx
<Button 
  variant="outline" 
  size="sm" 
  onClick={() => {
    setShowRejectedView(!showRejectedView)
    setShowPreparedView(false)
    if (!showRejectedView) fetchRejectedItems()
  }}
  className={showRejectedView ? 'bg-destructive/10 text-destructive border-destructive/50' : ''}
>
  <XCircle className="h-4 w-4 mr-2" />
  Rejected ({rejectedItems.length})
</Button>
```

#### 2. Prepared Button
| Property | Value |
|----------|-------|
| **Icon** | `ChefHat` (lucide-react) |
| **Label** | `Prepared ({count})` |
| **Variant** | `outline` |
| **Size** | `sm` |
| **Active Style** | `bg-primary/10 text-primary border-primary/50` |
| **Click Action** | Toggle Prepared view, close Rejected view, fetch prepared items |

#### 3. Refresh Button
| Property | Value |
|----------|-------|
| **Icon** | `RefreshCw` (lucide-react) |
| **Label** | `Refresh` |
| **Variant** | `outline` |
| **Size** | `sm` |
| **Click Action** | Fetch parent candidates + word classifications |

#### 4. Create Parent Button
| Property | Value |
|----------|-------|
| **Icon** | `Plus` (lucide-react) |
| **Label** | `Create Parent` |
| **Variant** | default (solid) |
| **Size** | `sm` |
| **Style** | `bg-green-600 hover:bg-green-700` |
| **Click Action** | Open Create Parent Dialog |

#### 5. Close Button (Optional)
| Property | Value |
|----------|-------|
| **Icon** | `X` (lucide-react) |
| **Label** | `Close` |
| **Variant** | `ghost` |
| **Size** | `sm` |
| **Click Action** | Call `onClose` prop |
| **Condition** | Only rendered if `onClose` prop is provided |

### Stats Bar Items

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🏷 1,890 parent candidates  ✅ 60 confirmed  [Words: 150 classified] [30 pending] │
└─────────────────────────────────────────────────────────────────────┘
```

| Stat | Icon | Format |
|------|------|--------|
| Parent Candidates | `Tag` | `{count} parent candidates` |
| Confirmed Parents | `CheckCircle2` (green) | `{count} confirmed` |
| Words Classified | Badge (green, filled) | `Words: {count} classified` |
| Words Pending | Badge (outline) | `{count} pending` |

### Success Message Toast
- **Position**: Fixed, centered at top
- **Style**: `fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white`
- **Animation**: `animate-in fade-in slide-in-from-top`
- **Duration**: 3 seconds
- **Content**: CheckCircle2 icon + message text

---

## Left Panel - Parent Candidates

### Purpose
Display a searchable, paginated list of single-word items that can be parent ingredients.

### Layout
```
┌─────────────────────────────┐
│ [🔍 Search...] [Filter ▼] [100▼] │  ← Filter Bar
├─────────────────────────────┤
│ 🟢 Papa (Solanum tuberosum) [45] ✓ │  ← Parent Item
│ ⚪ Tomate              [32] ✓ │
│ ⚪ Chile               [28]   │
│ 🟢 Maguey (Agave americana) [20] │
│ ...                              │
├─────────────────────────────┤
│ 1-100 of 1890    [Prev] 1/19 [Next] │  ← Pagination
└─────────────────────────────┘
```

### Filter Bar Components

#### Search Input
```tsx
<div className="relative flex-1">
  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
  <Input
    placeholder="Search parents..."
    value={parentSearch}
    onChange={(e) => setParentSearch(e.target.value)}
    onKeyDown={(e) => e.key === 'Enter' && setParentPage(0)}
    className="pl-7 h-7 text-sm"
  />
</div>
```

#### Filter Dropdown
| Option | Value | Description |
|--------|-------|-------------|
| All | `all` | Show all candidates |
| Has matches | `hasChildren` | Only show items with potential children |
| No matches | `unmatched` | Only show items without potential children |

```tsx
<Select value={parentFilter} onValueChange={(v) => setParentFilter(v as 'all' | 'unmatched' | 'hasChildren')}>
  <SelectTrigger className="w-28 h-7 text-xs">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All</SelectItem>
    <SelectItem value="hasChildren">Has matches</SelectItem>
    <SelectItem value="unmatched">No matches</SelectItem>
  </SelectContent>
</Select>
```

#### Page Size Dropdown
- **Options**: 50, 100, 200, 500
- **Default**: 100
- **Width**: `w-16`

### Parent Item Row

#### Structure
```tsx
<div
  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm ${
    selectedParent?.wordLower === candidate.wordLower
      ? 'bg-primary/20 border border-primary/50'
      : 'hover:bg-muted/50'
  }`}
  onClick={() => setSelectedParent(candidate)}
>
  {/* Status Dot */}
  {/* Word */}
  {/* Scientific Name */}
  {/* Count Badge */}
  {/* Confirm Button (conditional) */}
</div>
```

#### Row Elements

| Element | Description | Style |
|---------|-------------|-------|
| **Status Dot** | Green dot if confirmed parent, gray otherwise | `w-2 h-2 rounded-full bg-green-500` or `bg-gray-300` |
| **Word** | Parent name, truncated at 120px | `font-medium truncate max-w-[120px]` |
| **Scientific Name** | Displayed inline in parentheses, italic | `text-[10px] text-blue-600 italic truncate flex-1` |
| **Count Badge** | Number of potential children | `Badge variant="outline" text-[10px] h-4 px-1` |
| **Confirm Button** | Only shown if NOT confirmed AND has matches | `h-5 w-5 p-0 hover:bg-green-100` |

#### Confirm as Parent Button
- **Icon**: `CheckCircle2` (green) or `Loader2` (spinning when loading)
- **Title**: "Confirm as Parent"
- **Action**: Call `setAsParent(candidate)` API
- **Condition**: Only shown when `!candidate.isParent && candidate.potentialChildren > 0`

### Pagination Controls

```
┌─────────────────────────────────────────────────────────┐
│ 1-100 of 1890           [Prev] 1/19 [Next]              │
└─────────────────────────────────────────────────────────┘
```

- **Range Display**: `{start}-{end} of {total}`
- **Page Indicator**: `{currentPage}/{totalPages}`
- **Prev/Next Buttons**: `h-6 px-2`, disabled at boundaries

---

## Right Panel - Children & Classification

### Purpose
Display children of the selected parent, allow linking/rejecting, and classify individual words.

### States

1. **No Parent Selected** → Empty state message
2. **Parent Selected** → Children list
3. **Rejected View Active** → Rejected items list
4. **Prepared View Active** → Prepared items list

### Empty State (No Parent Selected)
```tsx
<div className="flex-1 flex items-center justify-center">
  <div className="text-center">
    <p className="text-muted-foreground">Select a parent from the left panel</p>
    <p className="text-sm">to view and classify children</p>
  </div>
</div>
```

### Selected Parent Header

```
┌───────────────────────────────────────────────────────────────────────┐
│ Papa ✅ Confirmed Parent  [5 linked] 15 potential  🔄                │
│                                                                       │
│ 🔬 Scientific name: Solanum tuberosum                                │
│                                                                       │
│ [🔬 Link Scientific Name]  [✅ Confirm as Parent]                     │
│                                                                       │
│ ┌─────────────────────────────────────────────────────────────────┐   │
│ │ Select or Enter Scientific Name:                    [Save]       │   │
│ │ [Custom scientific name input...]                               │   │
│ │ ─── Or search existing database ───                             │   │
│ │ [Search by name or scientific name...]                          │   │
│ │ ┌─────────────────────────────────────────────────────────────┐ │   │
│ │ │ Potato (Solanum tuberosum)                                   │ │   │
│ │ │ Potato Sweet (Ipomoea batatas)                               │ │   │
│ │ └─────────────────────────────────────────────────────────────┘ │   │
│ └─────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────┘
```

#### Header Elements

| Element | Condition | Style |
|---------|-----------|-------|
| **Parent Name** | Always | `font-semibold text-lg` |
| **Confirmed Badge** | `isParent === true` | `bg-green-500 text-white` |
| **Not Confirmed Badge** | `isParent === false` | `variant="outline" text-orange-600` |
| **Linked Count** | Has linked children | `bg-green-100 text-green-700 border-green-300` |
| **Potential Count** | Has potential children | `text-muted-foreground` |
| **Refresh Button** | Always | Ghost button with RefreshCw icon |
| **Scientific Name Badge** | Has scientific name | `bg-blue-100 text-blue-700 border-blue-300` |

#### Scientific Name Selector

- **Toggle Button**: Opens/closes the selector panel
- **Custom Input**: Text field for manual scientific name entry
- **Search Input**: Search existing GlobalEdibleItems
- **Results List**: Scrollable list (max height 128px) of matching items
- **Save Button**: Confirm & assign scientific name to parent

### Conservation Status Section

Shows IUCN/CITES conservation status for parent ingredients. This is especially important for wild-harvested ingredients.

```
┌───────────────────────────────────────────────────────────────────────┐
│ 🛡️ Conservation Status:                                               │
│                                                                       │
│ ┌─────────────────────────────────────────────────────────────────┐   │
│ │ [VU] [Not Listed] [Moderate Risk]                              │   │
│ │                                                                 │   │
│ │ IUCN: Vulnerable (VU)                                          │   │
│ │ CITES: Not listed                                               │   │
│ │ Risk Level: Moderate                                            │   │
│ │ Trade Restricted: No                                            │   │
│ │ Sources: IUCN Red List                                          │   │
│ │ Last Assessed: Mar 2026                                         │   │
│ │ Match Type: Exact match ✓                                       │   │
│ └─────────────────────────────────────────────────────────────────┘   │
│                                                                       │
│ [🔄 Refresh Status]                                                   │
└───────────────────────────────────────────────────────────────────────┘
```

#### Status Display Elements

| Element | Description |
|---------|-------------|
| **IUCN Category Badge** | CR (red), EN (orange), VU (yellow), NT (amber), LC (green), DD (gray), NE (muted) |
| **CITES Status Badge** | Appendix I/II/III (warning), Not Listed (default) |
| **Risk Level Badge** | critical (red), high (orange), moderate (yellow), low (green), stable (emerald) |
| **Match Type** | exact (green check), genus_inference (yellow warning), web_search (blue info), not_found (gray) |

#### Check Status Button

```tsx
<Button 
  size="sm" 
  variant="outline" 
  onClick={checkConservationStatus}
  disabled={!selectedParent.taxon}
>
  <ShieldAlert className="h-3 w-3 mr-1" />
  Check Status
</Button>
```

#### Match Type Indicators

| Match Type | Color | Icon | Description |
|------------|-------|------|-------------|
| `exact` | green | Check | Exact species match in KNOWN_STATUS cache |
| `genus_inference` | yellow | AlertTriangle | Matched to related species in same genus - needs verification |
| `web_search` | blue | Globe | Found via IUCN/CITES web search |
| `not_found` | gray | Minus | Species not found in any database |

#### Risk Level Colors

| Risk Level | Background | Text | Border |
|------------|------------|------|--------|
| critical | red-100 | red-800 | red-300 |
| high | orange-100 | orange-800 | orange-300 |
| moderate | yellow-100 | yellow-800 | yellow-300 |
| low | green-100 | green-800 | green-300 |
| stable | emerald-100 | emerald-800 | emerald-300 |
| unknown | gray-100 | gray-600 | gray-300 |

### Parent Notes Section

Allows adding ethnobotanical notes, culinary uses, and other information about parent ingredients.

```
┌───────────────────────────────────────────────────────────────────────┐
│ ℹ️ Notes:                                                             │
│                                                                       │
│ ┌─────────────────────────────────────────────────────────────────┐   │
│ │ Nombre con el que se conoce a Ceiba pentandra y Ceiba          │   │
│ │ parvifolia. Proviene del náhuatl pochotl o puchotl que         │   │
│ │ significa padre, madre, jefe, gobernante o protector...        │   │
│ │                                                                 │   │
│ │ Los tarahumaras comen los frutos tiernos y asados; también    │   │
│ │ consumen la raíz tierna que es de sabor dulce...              │   │
│ └─────────────────────────────────────────────────────────────────┘   │
│                                                                       │
│ [✏️ Edit Notes]                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

#### Notes Editing Mode

```tsx
{editingNotes === selectedParent.itemId ? (
  <div className="space-y-2">
    <Textarea
      placeholder="Add notes about this ingredient..."
      value={notesInput}
      onChange={(e) => setNotesInput(e.target.value)}
      className="min-h-[60px] text-xs"
    />
    <div className="flex justify-end gap-1">
      <Button size="sm" variant="ghost" onClick={() => setEditingNotes(null)}>
        Cancel
      </Button>
      <Button 
        size="sm" 
        onClick={() => saveNotes(selectedParent.itemId, notesInput)}
        className="h-6 text-xs bg-green-600 hover:bg-green-700"
      >
        Save
      </Button>
    </div>
  </div>
) : (
  <div className="flex items-start gap-2">
    {selectedParent.notes ? (
      <div className="flex-1 text-xs text-muted-foreground bg-muted/30 p-2 rounded">
        {selectedParent.notes}
      </div>
    ) : (
      <span className="text-xs text-muted-foreground flex-1">No notes</span>
    )}
    <Button
      size="sm"
      variant="ghost"
      onClick={() => {
        setEditingNotes(selectedParent.itemId)
        setNotesInput(selectedParent.notes || '')
      }}
    >
      <Pencil className="h-3 w-3" />
    </Button>
  </div>
)}
```

#### Notes Use Cases

- Ethnobotanical information (traditional names, cultural significance)
- Culinary uses and preparations
- Geographic distribution
- Nutritional highlights
- Seasonal availability
- Harvesting notes

### Bulk Actions Bar (When Children Selected)

```
┌───────────────────────────────────────────────────────────────────────┐
│ ✅ 5 selected  [Link Selected] [Mark as Prepared] [Reject] [Clear]    │
└───────────────────────────────────────────────────────────────────────┘
```

| Button | Icon | Color | Action | Condition |
|--------|------|-------|--------|-----------|
| **Link Selected** | `Link2` | Default (primary) | Link children to parent | Parent must be confirmed |
| **Mark as Prepared** | `ChefHat` | Purple (`bg-purple-50 text-purple-700`) | Mark as prepared items | Always |
| **Reject** | `XCircle` | Destructive | Reject children | Always |
| **Clear** | None | Ghost | Clear selection | Always |

### Children List

#### List Structure
```
┌───────────────────────────────────────────────────────────────────────┐
│ ✅ Linked children (5)                                                │
├───────────────────────────────────────────────────────────────────────┤
│ ☑ Papa Blanca          [Core] [Descriptor]     ✅ Linked      ▼      │
│ ☑ Papa Amarilla        [Core] [Color]          ✅ Linked      ▼      │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ Potential children ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤
│ ☐ Papa Morada          [Core] [Color]                         ▼      │
│ ☐ Papa Roja            [Core] [Color]                         ▼      │
└───────────────────────────────────────────────────────────────────────┘
```

#### Select All Row (Potential Children Only)
```tsx
<div className="flex items-center gap-2 px-2 py-1.5 bg-muted/30 rounded mb-2 sticky top-0 z-10">
  <Checkbox
    checked={selectedChildren.size === potentialChildren.length && potentialChildren.length > 0}
    onCheckedChange={toggleAllPotentialChildren}
  />
  <span className="text-xs text-muted-foreground">
    Select all potential ({potentialChildren.length})
  </span>
</div>
```

#### Child Item Card

```tsx
<div className={`border rounded-lg mb-2 overflow-hidden ${
  child.isLinked ? 'border-green-500/50 bg-green-500/5' :
  selectedChildren.has(child.id) ? 'border-primary bg-primary/5' :
  'border-border'
}`}>
  {/* Header Row */}
  <div className="flex items-center gap-2 px-3 py-2 cursor-pointer">
    <Checkbox />
    {/* Word Breakdown */}
    {/* Status Badge */}
    {/* Expand Button */}
  </div>
  
  {/* Expanded Content (Word Classification) */}
  {isExpanded && <WordClassificationPanel />}
</div>
```

#### Word Breakdown Inline Display

Each word in the ingredient name is displayed with:
- The word itself (bold + green if it matches the parent word)
- A small category badge if the word is classified

```tsx
<div className="flex-1 flex flex-wrap items-center gap-1">
  {child.words.map((w, idx) => {
    const cat = w.classification ? getCategoryInfo(w.classification.category) : null
    return (
      <span key={idx} className={`inline-flex items-center gap-0.5 text-sm ${
        w.isParent ? 'font-bold text-green-700' :
        w.classification ? '' : 'text-muted-foreground'
      }`}>
        {w.word}
        {w.classification && !w.isParent && (
          <span className={`text-[9px] px-1 rounded ${cat?.bgColor} ${cat?.textColor}`}>
            {cat?.label.split(' ')[0]}
          </span>
        )}
      </span>
    )
  })}
</div>
```

#### Expanded Word Classification Panel

When a child item is expanded, show word-by-word classification:

```
┌───────────────────────────────────────────────────────────────────────┐
│ Classify words:                                                       │
│ ──────────────────────────────────────────────────────────────────── │
│ Papa        [Core Ingredient ▼]                          ✅ Done      │
│ Blanca      [Color ▼]                                    ✅ Done      │
└───────────────────────────────────────────────────────────────────────┘
```

Each word row:
- Word label (w-24, truncate)
- Category dropdown (flex-1)
- "Done" badge if classified (green outline)

**Note**: Parent word is excluded from classification panel.

---

## Rejected Items View

### Trigger
Click "Rejected" button in header

### Header
```
┌───────────────────────────────────────────────────────────────────────┐
│ ❌ Rejected Items  [58 of 58]                           [Close]       │
│ These items were rejected as children. You can upgrade them to       │
│ parents or link them to an existing parent.                          │
│ [🔍 Search rejected items...]                                         │
└───────────────────────────────────────────────────────────────────────┘
```

### Item Card
```
┌───────────────────────────────────────────────────────────────────────┐
│ Papaya Ensalada                                                       │
│ Type: FRUTA                                                           │
│ [Papaya] [Ensalada]                                                   │
│                                                                       │
│ [Select parent... ▼] [🔗]  [Scientific name...] [⬆]                  │
└───────────────────────────────────────────────────────────────────────┘
```

### Actions per Item

| Action | Description | Control |
|--------|-------------|---------|
| **Link to Parent** | Dropdown to select an existing confirmed parent | Select + Link button |
| **Upgrade to Parent** | Make this item a parent ingredient | Text input (scientific name) + Button |

### Link to Parent Dropdown
- Filters to only show confirmed parents (`isParent === true`)
- Searchable by parent name or scientific name
- Limited to 20 results in dropdown

---

## Prepared Items View

### Trigger
Click "Prepared" button in header

### Header
```
┌───────────────────────────────────────────────────────────────────────┐
│ 👨‍🍳 Prepared Items  [230 of 230]                          [Close]     │
│ These items are prepared or processed foods (e.g., from VARIOS       │
│ category) that are not linked to parent ingredients.                 │
│ [🔍 Search prepared items...]                                         │
└───────────────────────────────────────────────────────────────────────┘
```

### Item Card
Same structure as Rejected Items view with link/upgrade actions.

---

## Create Parent Dialog

### Trigger
Click "Create Parent" button in header

### Dialog Structure
```tsx
<Dialog open={showCreateParentDialog} onOpenChange={setShowCreateParentDialog}>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>Create New Parent Ingredient</DialogTitle>
      <DialogDescription>
        Create a parent ingredient that doesn't exist in the Mexican database. 
        This is useful for cross-cuisine recipes (e.g., Thai, Mediterranean).
      </DialogDescription>
    </DialogHeader>
    
    {/* Form Fields */}
    <div className="grid gap-4 py-4">
      {/* Parent Name */}
      <div className="grid gap-2">
        <label>Parent Name <span className="text-destructive">*</span></label>
        <Input placeholder="e.g., Coco, Oliva, Basil..." />
      </div>
      
      {/* Scientific Name */}
      <div className="grid gap-2">
        <label>Scientific Name <span className="text-muted-foreground">(optional)</span></label>
        <Input placeholder="e.g., Cocos nucifera, Olea europaea..." />
      </div>
    </div>
    
    {/* Footer */}
    <DialogFooter>
      <Button variant="outline" onClick={handleCancel}>Cancel</Button>
      <Button 
        onClick={handleCreate}
        disabled={!newParentName.trim() || loading}
        className="bg-green-600 hover:bg-green-700"
      >
        <Plus className="h-4 w-4 mr-2" />
        Create Parent
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Validation
- **Parent Name**: Required, must not be empty
- **Scientific Name**: Optional

### API Action
Calls `create-parent` action which:
1. Checks if parent already exists
2. Creates new MexicanFood record with:
   - `tipoAlimento: 'MANUAL'`
   - `claveOriginal: 'MANUAL-{NAME}'`
   - `isParent: true`
   - `hierarchyStatus: 'confirmed'`
   - `taxon: scientificName` (if provided)

---

## Word Categories System

### Categories List

| Value | Label | Color | Text Color | Bg Color |
|-------|-------|-------|------------|----------|
| `core` | Core Ingredient | `bg-green-500` | `text-green-700` | `bg-green-100` |
| `descriptor` | Descriptor | `bg-amber-500` | `text-amber-700` | `bg-amber-100` |
| `processing` | Processing | `bg-orange-500` | `text-orange-700` | `bg-orange-100` |
| `form` | Form/Cut | `bg-pink-500` | `text-pink-700` | `bg-pink-100` |
| `color` | Color | `bg-yellow-500` | `text-yellow-700` | `bg-yellow-100` |
| `state` | State/Ripeness | `bg-purple-500` | `text-purple-700` | `bg-purple-100` |
| `part` | Plant Part | `bg-blue-500` | `text-blue-700` | `bg-blue-100` |
| `size` | Size | `bg-cyan-500` | `text-cyan-700` | `bg-cyan-100` |
| `presentation` | Presentation | `bg-indigo-500` | `text-indigo-700` | `bg-indigo-100` |
| `variety` | Variety | `bg-teal-500` | `text-teal-700` | `bg-teal-100` |
| `connector` | Connector | `bg-gray-500` | `text-gray-700` | `bg-gray-100` |
| `excluded` | Excluded | `bg-slate-400` | `text-slate-600` | `bg-slate-100` |
| `unknown` | Unknown | `bg-red-400` | `text-red-700` | `bg-red-100` |

### Legend Footer
Displays first 8 categories in the footer:
```tsx
<div className="border-t bg-muted/30 px-4 py-2 flex-shrink-0 flex items-center gap-4 text-xs flex-wrap">
  <span className="text-muted-foreground">Word Categories:</span>
  {WORD_CATEGORIES.slice(0, 8).map(cat => (
    <div key={cat.value} className="flex items-center gap-1">
      <div className={`w-2 h-2 rounded-full ${cat.color}`} />
      <span>{cat.label}</span>
    </div>
  ))}
  <div className="ml-auto flex items-center gap-2 text-muted-foreground">
    <span className="inline-block w-2 h-2 rounded-full bg-green-500" /> = Already classified
  </div>
</div>
```

---

## API Endpoints

### Main Workspace API

#### `GET /api/mexican-food/classification-workspace`

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | string | '' | Filter by parent name |
| `filter` | 'all' \| 'hasChildren' \| 'unmatched' | 'all' | Filter type |
| `limit` | number | 100 | Items per page |
| `offset` | number | 0 | Pagination offset |

**Response:**
```json
{
  "success": true,
  "candidates": [
    {
      "word": "Papa",
      "wordLower": "papa",
      "itemId": "abc123",
      "potentialChildren": 45,
      "isParent": true,
      "currentChildren": 30,
      "tipoAlimento": "VERDURA",
      "taxon": "Solanum tuberosum"
    }
  ],
  "total": 1890,
  "confirmedParents": 60,
  "pendingLinks": 1830,
  "pagination": {
    "limit": 100,
    "offset": 0,
    "totalPages": 19
  }
}
```

#### `POST /api/mexican-food/classification-workspace`

**Actions:**

| Action | Body | Description |
|--------|------|-------------|
| `set-as-parent` | `{ action, itemId, scientificName? }` | Confirm item as parent |
| `link-children` | `{ action, childIds[], parentId }` | Link children to parent |
| `reject-children` | `{ action, childIds[] }` | Mark children as rejected |
| `mark-prepared` | `{ action, childIds[] }` | Mark children as prepared |
| `upgrade-to-parent` | `{ action, itemId, scientificName? }` | Upgrade rejected item to parent |
| `create-parent` | `{ action, name, scientificName? }` | Create new parent ingredient |

### Children API

#### `GET /api/mexican-food/classification-workspace/children`

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `parentWord` | string | Parent word to search for |
| `parentWordLower` | string | Lowercase version for matching |

**Response:**
```json
{
  "success": true,
  "children": [
    {
      "id": "xyz789",
      "nombreEspanol": "Papa Blanca",
      "taxon": null,
      "tipoAlimento": "VERDURA",
      "isParent": false,
      "parentIngredientId": "abc123",
      "hierarchyStatus": "confirmed"
    }
  ],
  "total": 45,
  "linkedCount": 30,
  "potentialCount": 15
}
```

### Rejected Items API

#### `GET /api/mexican-food/classification-workspace/rejected`

**Response:**
```json
{
  "success": true,
  "items": [
    {
      "id": "rejected123",
      "nombreEspanol": "Papaya Ensalada",
      "tipoAlimento": "FRUTA",
      "hierarchyStatus": "rejected"
    }
  ],
  "total": 58
}
```

### Prepared Items API

#### `GET /api/mexican-food/classification-workspace/prepared`

**Response:**
```json
{
  "success": true,
  "items": [
    {
      "id": "prepared456",
      "nombreEspanol": "Dulce De Coco",
      "tipoAlimento": "VARIOS",
      "hierarchyStatus": "prepared"
    }
  ],
  "total": 230
}
```

---

## Database Schema

### MexicanFood Model (Relevant Fields)

```prisma
model MexicanFood {
  id                  String   @id @default(cuid())
  conabioId           Int      @unique
  nombreEspanol       String
  taxon               String?  // Scientific name
  tipoAlimento        String?  // Category (VERDURA, FRUTA, VARIOS, MANUAL, etc.)
  
  // Hierarchy fields
  isParent            Boolean  @default(false)
  parentIngredientId  String?
  childCount          Int      @default(0)
  hierarchyStatus     String?  // 'pending', 'confirmed', 'rejected', 'prepared'
  hierarchyReviewedBy String?
  hierarchyReviewedAt DateTime?
  
  // For manually created parents
  claveOriginal       String?  // 'MANUAL-{NAME}' for created parents
  descripcionAlimento String?  // 'Manually created parent ingredient'
  
  // Relations
  parent              MexicanFood?  @relation("ParentChild", fields: [parentIngredientId], references: [id])
  children            MexicanFood[] @relation("ParentChild")
  
  @@map("MexicanFood")
}
```

### HierarchyAuditLog Model

```prisma
model HierarchyAuditLog {
  id            String   @id @default(cuid())
  itemId        String
  itemName      String
  action        String   // 'set_as_parent', 'link_child', 'reject_child', etc.
  oldParentId   String?
  newParentId   String?
  oldStatus     String?
  newStatus     String?
  reviewedBy    String
  reason        String?
  createdAt     DateTime @default(now())
  
  @@map("HierarchyAuditLog")
}
```

### WordClassification Model

```prisma
model WordClassification {
  id           String   @id @default(cuid())
  word         String
  wordLower    String   @unique
  category     String
  needsReview  Boolean  @default(true)
  
  @@map("WordClassification")
}
```

---

## State Management

### Component State Variables

```typescript
// Loading states
const [loading, setLoading] = useState(true)
const [actionLoading, setActionLoading] = useState<string | null>(null)

// Parent candidates
const [parentCandidates, setParentCandidates] = useState<ParentCandidate[]>([])
const [selectedParent, setSelectedParent] = useState<ParentCandidate | null>(null)
const [parentSearch, setParentSearch] = useState('')
const [parentFilter, setParentFilter] = useState<'all' | 'unmatched' | 'hasChildren'>('all')
const [parentPageSize, setParentPageSize] = useState(100)
const [parentPage, setParentPage] = useState(0)
const [totalParents, setTotalParents] = useState(0)

// Children
const [children, setChildren] = useState<ChildWithWords[]>([])
const [selectedChildren, setSelectedChildren] = useState<Set<string>>(new Set())
const [expandedChild, setExpandedChild] = useState<string | null>(null)

// Word classifications
const [wordClassifications, setWordClassifications] = useState<Map<string, WordClassification>>(new Map())

// Global edible items (for scientific name matching)
const [globalItems, setGlobalItems] = useState<GlobalEdibleItem[]>([])
const [selectedGlobalItem, setSelectedGlobalItem] = useState<GlobalEdibleItem | null>(null)
const [globalSearch, setGlobalSearch] = useState('')
const [showGlobalSelector, setShowGlobalSelector] = useState(false)
const [customScientificName, setCustomScientificName] = useState('')

// Views
const [showRejectedView, setShowRejectedView] = useState(false)
const [rejectedItems, setRejectedItems] = useState<ChildWithWords[]>([])
const [rejectedSearch, setRejectedSearch] = useState('')

const [showPreparedView, setShowPreparedView] = useState(false)
const [preparedItems, setPreparedItems] = useState<ChildWithWords[]>([])
const [preparedSearch, setPreparedSearch] = useState('')

// Create parent dialog
const [showCreateParentDialog, setShowCreateParentDialog] = useState(false)
const [newParentName, setNewParentName] = useState('')
const [newParentScientificName, setNewParentScientificName] = useState('')

// Feedback
const [successMessage, setSuccessMessage] = useState<string | null>(null)

// Stats
const [stats, setStats] = useState<Stats>({...})
```

### Key Callbacks

| Callback | Triggers When |
|----------|---------------|
| `fetchParentCandidates` | Search/filter/page/pageSize changes |
| `fetchChildrenForParent` | Parent selected |
| `fetchWordClassifications` | Component mount, refresh click |
| `fetchGlobalItems` | Component mount |
| `fetchRejectedItems` | Component mount, rejected button click, after reject action |

---

## Visual Design Specifications

### Color Palette

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Background | `bg-background` | Auto-adjusts |
| Muted areas | `bg-muted/30` | Auto-adjusts |
| Primary accent | `bg-primary` | Auto-adjusts |
| Success | `bg-green-500` / `text-green-700` | Same |
| Destructive | `bg-destructive` | Auto-adjusts |
| Linked children | `bg-green-500/5`, `border-green-500/50` | Same |
| Selected items | `bg-primary/5`, `border-primary` | Auto-adjusts |
| Scientific name | `text-blue-600`, `bg-blue-100` | Same |

### Typography

| Element | Size | Weight |
|---------|------|--------|
| Page Title | `text-xl` | `bold` |
| Section Header | `text-lg` | `semibold` |
| Parent Word | `text-sm` | `medium` |
| Scientific Name | `text-[10px]` | normal, italic |
| Count Badge | `text-[10px]` | normal |
| Body Text | `text-sm` | normal |
| Stats | `text-sm` | `medium` for numbers |

### Spacing

| Context | Value |
|---------|-------|
| Header padding | `px-4 py-3` |
| Panel padding | `px-3 py-2` |
| Item padding | `px-2 py-1.5` |
| Card padding | `px-3 py-2` |
| Gap between items | `gap-2` |
| Gap between sections | `gap-3` / `gap-4` |

### Border Styles

| Element | Style |
|---------|-------|
| Section dividers | `border-b` |
| Panel separator | `border-r` |
| Item cards | `border rounded-lg` |
| Selected state | `border border-primary/50` |
| Linked children | `border-green-500/50` |

### ScrollAreas

- **Parent List**: `flex-1 min-h-0`
- **Children List**: `flex-1 min-h-0`
- **Global Items Selector**: `h-32`
- **Parent Dropdown (Linking)**: `max-h-40`

---

## Appendix: Key Files

| File | Purpose |
|------|---------|
| `src/components/ingredient-classification-workspace.tsx` | Main component |
| `src/app/api/mexican-food/classification-workspace/route.ts` | Main API (GET/POST) |
| `src/app/api/mexican-food/classification-workspace/children/route.ts` | Children API |
| `src/app/api/mexican-food/classification-workspace/rejected/route.ts` | Rejected items API |
| `src/app/api/mexican-food/classification-workspace/prepared/route.ts` | Prepared items API |
| `src/app/api/words/classifications/route.ts` | Word classification API |

---

*Documentation generated for Phyto Kit - Ingredient Classification Workspace*
