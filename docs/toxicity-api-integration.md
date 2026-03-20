# Toxicity Database Integration Research

## Overview

This document summarizes research on integrating external toxicity databases to provide real safety warnings in the Phyto Kit Bioactives section.

---

## 1. EPA CompTox Chemistry Dashboard API

### Overview
The EPA CompTox (Computational Toxicology) Chemistry Dashboard provides chemistry, toxicity, and exposure information for over **1 million chemicals**.

### API Access
- **Base URL**: `https://comptox.epa.gov/ctx-api/`
- **Documentation**: `https://comptox.epa.gov/ctx-api/docs/chemical.html`
- **Authentication**: Open API (no key required for basic access)
- **Rate Limits**: Not explicitly documented, implement reasonable rate limiting

### Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/chemical/detail/by-dtxsid/{dtxsid}` | GET | Get chemical details by DTXSID |
| `/chemical/detail/by-casrn/{casrn}` | GET | Get chemical details by CAS number |
| `/chemical/detail/by-inchikey/{inchikey}` | GET | Get chemical details by InChI Key |
| `/chemical/search` | GET | Search chemicals by name |
| `/hazard/search/by-dtxsid/{dtxsid}` | GET | Get hazard data |
| `/toxicity/search/by-dtxsid/{dtxsid}` | GET | Get toxicity data |

### Data Available
- **Chemical Identifiers**: DTXSID, CASRN, InChI Key, Synonyms
- **Toxicity Data**: LD50, NOAEL, LOAEL, POD (Point of Departure)
- **Hazard Classifications**: GHS classifications, cancer classifications
- **Bioassay Data**: ToxCast/Tox21 assay results
- **Exposure Data**: Predicted exposure levels

### Cross-Reference with PhytoHub
PhytoHub compounds have:
- `inchiKey` column → Direct match to CompTox InChI Key
- `casNumber` column → Direct match to CompTox CASRN
- `name` column → Can search by chemical name

### Example API Call
```typescript
// Search by InChI Key
const response = await fetch(
  'https://comptox.epa.gov/ctx-api/chemical/detail/by-inchikey/QUGDDKDJOWCCLH-UHFFFAOYSA-N'
);
const data = await response.json();

// Returns: DTXSID, CASRN, toxicity values, hazard classifications
```

---

## 2. EFSA OpenFoodTox Database

### Overview
OpenFoodTox is EFSA's chemical hazards database containing summary hazard data for **5,000+ chemicals** in food and feed. It provides Health-Based Guidance Values (HBGVs) and reference points.

### Access Method
- **Dashboard**: `https://www.efsa.europa.eu/en/microstrategy/openfoodtox`
- **Download**: CSV/XLS export available from dashboard
- **API**: **No REST API** - Data must be downloaded as bulk files

### Data Available
| Data Type | Description |
|-----------|-------------|
| **Reference Points** | NOAEL, LOAEL, BMDL (Benchmark Dose Lower Limit) |
| **Reference Values** | ADI (Acceptable Daily Intake), UL (Tolerable Upper Intake) |
| **Health-Based Guidance Values** | HBGV for chronic and acute exposure |
| **Toxicity Studies** | 11,698+ toxicity studies |
| **Target Populations** | Human, Animal (livestock, pets, wildlife) |
| **Endpoints** | Acute, sub-chronic, chronic toxicity, genotoxicity |

### Key Fields for Cross-Reference
- Chemical name (may need fuzzy matching)
- CAS number (when available)
- EFSA substance ID

### Data Download Process
1. Access dashboard: `https://www.efsa.europa.eu/en/microstrategy/openfoodtox`
2. Export as CSV/XLS
3. Import into local SQLite database
4. Match compounds by chemical name or CAS number

---

## 3. NIH ODS DSLD (Dietary Supplement Label Database)

### Overview
Contains **180,000+ dietary supplement labels** with ingredient and dosage information.

### API Access
- **Base URL**: `https://dsld.od.nih.gov/api/`
- **API Guide**: `https://dsld.od.nih.gov/api-guide`
- **Authentication**: Open API

### Key Endpoints
| Endpoint | Description |
|----------|-------------|
| `/products` | List supplement products |
| `/products/{id}` | Get product details |
| `/ingredients` | List ingredients |
| `/ingredients/search` | Search ingredients |

### Relevance for Phyto Kit
- Useful for supplement analysis feature
- Provides real-world dosage information
- Ingredient synonyms and brand names

---

## 4. NIH ODS Fact Sheets

### Overview
Expert-reviewed fact sheets on vitamins, minerals, and other dietary supplements.

### Access
- **Website**: `https://ods.od.nih.gov/factsheets/`
- **API**: `https://ods.od.nih.gov/api/` (limited)
- **Content**: Upper limits, recommended intakes, interactions, safety

### Data Available
- Recommended Dietary Allowances (RDA)
- Tolerable Upper Intake Levels (UL)
- Drug interactions
- Health conditions and contraindications
- Pregnancy/lactation safety

---

## Database Connection Strategy

### Primary Cross-Reference Identifiers

```
┌─────────────────────────────────────────────────────────────────┐
│                    PhytoHub Compound                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   InChI Key │  │ CAS Number  │  │    Name     │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EPA CompTox API                              │
│  • InChI Key exact match                                        │
│  • CAS Number exact match                                       │
│  • Name fuzzy search                                            │
│  • Returns: DTXSID, LD50, NOAEL, Hazard Class                   │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EFSA OpenFoodTox (Local DB)                  │
│  • CAS Number exact match                                       │
│  • Name fuzzy search                                            │
│  • Returns: ADI, UL, HBGV, Reference Points                     │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NIH ODS Fact Sheets                          │
│  • Name/synonym match                                           │
│  • Returns: RDA, UL, Interactions, Safety warnings              │
└─────────────────────────────────────────────────────────────────┘
```

### Matching Priority

1. **InChI Key** → Most reliable, unique identifier
2. **CAS Number** → Widely used, reliable
3. **Chemical Name** → Requires fuzzy matching, may have synonyms

---

## Implementation Plan

### Phase 1: EPA CompTox Integration (Priority: High)
1. Create Prisma schema for toxicity data cache
2. Implement CompTox API client service
3. Create endpoint to fetch toxicity by InChI Key/CAS
4. Cache results locally to minimize API calls
5. Update Bioactives tab to show real warnings

### Phase 2: EFSA OpenFoodTox Import (Priority: Medium)
1. Download OpenFoodTox CSV from EFSA dashboard
2. Create import script similar to PhytoHub import
3. Match compounds by CAS number and name
4. Store ADI, UL, HBGV values

### Phase 3: NIH ODS Integration (Priority: Low)
1. Integrate DSLD for supplement analysis
2. Import fact sheet data for upper limits
3. Add interaction checking

---

## Data Schema Design

### New Prisma Models

```prisma
model ToxicityData {
  id              String   @id @default(cuid())
  compoundId      String?  // Link to PhytoHubCompound
  dtxsid          String?  @unique // EPA CompTox ID
  casNumber       String?
  inchiKey        String?
  
  // Toxicity Values
  ld50            Float?   // mg/kg
  ld50Species     String?
  noael           Float?   // mg/kg/day
  noaelSpecies    String?
  loael           Float?   // mg/kg/day
  loaelSpecies    String?
  
  // EFSA Data
  adi             Float?   // Acceptable Daily Intake mg/kg/day
  ul              Float?   // Tolerable Upper Intake
  hbgv            Float?   // Health-Based Guidance Value
  
  // Hazard Classifications
  ghsCategory     String?  // GHS hazard category
  cancerGroup     String?  // IARC, EPA cancer classification
  
  // Warnings
  warnings        String?  // JSON array of warning strings
  interactions    String?  // JSON array of drug interactions
  pregnancySafety String?  // Safety during pregnancy
  
  // Metadata
  source          String   // 'comptox', 'efsa', 'nih-ods'
  lastUpdated     DateTime @default(now())
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model CompoundMatch {
  id              String   @id @default(cuid())
  phytoHubId      String   // PhytoHubCompound.id
  dtxsid          String?  // CompTox DTXSID
  casNumber       String?
  matchConfidence Float    // 0-1 confidence score
  matchMethod     String   // 'inchikey', 'cas', 'name'
  verified        Boolean  @default(false)
  
  createdAt       DateTime @default(now())
}
```

---

## Next Steps

1. ✅ Research completed
2. 🔄 Create database schema for toxicity data
3. ⬜ Implement EPA CompTox API client
4. ⬜ Download and import EFSA OpenFoodTox data
5. ⬜ Create unified toxicity search endpoint
6. ⬜ Update Bioactives UI to display real warnings
