# 🍽️ Gourmet Recipes App - Phase 1

An elegant, feature-rich recipe discovery application with integrated nutrition information, built with Next.js 16, TheMealDB API, and USDA FoodData Central.

## ✨ Features

### 🎨 Elegant Design
- **Dark Mode by Default**: Sophisticated dark theme with seamless light/dark toggle
- **Dynamic Background**: Recipe images create an immersive, gourmet atmosphere
- **Responsive Design**: Beautiful experience on all devices
- **Smooth Animations**: Subtle transitions for premium feel

### 🔍 Powerful Search
- **Name Search**: Find recipes by name with instant results
- **Multi-Ingredient Filtering**: Compound filters (e.g., "pork + cinnamon + prunes")
- **Ingredient Autocomplete**: Smart suggestions from 500+ ingredients
- **Real-time Results**: Instant feedback as you search

### 📊 Nutrition Information
- **USDA Integration**: Accurate nutrition data from FoodData Central
- **Comprehensive Metrics**: Calories, protein, carbs, fat, fiber, and micronutrients
- **Smart Estimation**: Fallback calculation when API is unavailable
- **Per Serving Display**: Clear, easy-to-read nutrition cards

### 🍽️ Recipe Details
- **Full Ingredient List**: With measurements
- **Step-by-Step Instructions**: Numbered, easy-to-follow
- **Recipe Tags**: Dietary information and cuisine types
- **Video Tutorials**: Direct links to YouTube videos
- **Category & Origin**: Visual badges for quick reference

## 🏗️ Architecture

### Frontend Components
```
src/
├── app/
│   ├── page.tsx                    # Main recipe discovery page
│   ├── layout.tsx                  # Root layout with ThemeProvider
│   └── globals.css                 # Theme variables and styles
├── components/
│   ├── theme-provider.tsx          # Dark/light mode provider
│   └── ui/                         # shadcn/ui components
└── types/
    └── recipe.ts                   # TypeScript interfaces
```

### Backend API Routes
```
src/app/api/
├── recipes/
│   ├── route.ts                    # Search by name or ingredients
│   └── [id]/route.ts               # Get recipe details
├── ingredients/
│   └── route.ts                    # List/search ingredients
└── nutrition/
    └── route.ts                    # Calculate nutrition from ingredients
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (via Bun)
- USDA API Key (optional, for accurate nutrition data)

### Setup

1. **Install Dependencies**
   ```bash
   bun install
   ```

2. **Configure Environment**
   ```bash
   # Copy the example file
   cp .env.example .env

   # Get your free USDA API key at:
   # https://fdc.nal.usda.gov/api-key-signup.html
   # Add it to .env:
   USDA_API_KEY=your_api_key_here
   ```

3. **Start Development Server**
   ```bash
   bun run dev
   ```

4. **Open in Browser**
   - Use the Preview Panel in your IDE
   - Or click "Open in New Tab" button

## 📖 Usage Guide

### Searching by Recipe Name
1. Type in the search bar (e.g., "Chicken Curry")
2. Press Enter or click Search
3. Browse results in the recipe grid
4. Click any recipe card for full details

### Filtering by Multiple Ingredients
1. Scroll to the ingredient filter section
2. Type an ingredient name (e.g., "pork")
3. Select from autocomplete suggestions or press Enter
4. Add more ingredients (e.g., "cinnamon", "prunes")
5. Click "Find Recipes with These Ingredients"
6. View recipes that contain ALL specified ingredients

### Viewing Nutrition Data
1. Open any recipe by clicking its card
2. Scroll to the "Nutrition Information" section
3. View comprehensive macro and micronutrient data
4. Note: If no USDA API key is configured, estimated values are shown

### Managing Theme
1. Click the Sun/Moon icon in the header
2. Toggle between dark and light modes
3. Your preference is persisted across sessions

## 🔌 API Integrations

### TheMealDB API
- **Endpoint**: `https://www.themealdb.com/api/json/v1/1/`
- **Features Used**:
  - Search recipes by name
  - Filter by ingredients
  - Get recipe details
  - List all ingredients
- **Rate Limit**: None (public API)
- **Caching**: 1 hour for recipes, 24 hours for ingredients

### USDA FoodData Central
- **Endpoint**: `https://api.nal.usda.gov/fdc/v1/`
- **Features Used**:
  - Search foods by ingredient name
  - Retrieve comprehensive nutrient data
- **Rate Limit**: 1,000 requests/hour (free tier)
- **Caching**: 24 hours for nutrition data
- **Required**: Free API key from [USDA](https://fdc.nal.usda.gov/api-key-signup.html)

## 🎯 Key Features Explained

### Compound Ingredient Filtering
The app implements sophisticated ingredient matching:
```typescript
// Example: Finding recipes with pork, cinnamon, and prunes
const ingredients = ['pork', 'cinnamon', 'prunes']

// For each ingredient, fetch all meals that contain it
const mealsWithPork = await fetchMealsByIngredient('pork')
const mealsWithCinnamon = await fetchMealsByIngredient('cinnamon')
const mealsWithPrunes = await fetchMealsByIngredient('prunes')

// Find intersection (meals that contain ALL ingredients)
const recipesWithAll = mealsWithPork.filter(meal =>
  mealsWithCinnamon.includes(meal) && mealsWithPrunes.includes(meal)
)
```

### Dynamic Background Image
The app creates an immersive experience by:
1. Setting the first recipe's image as the background
2. Applying a gradient overlay for readability
3. Smoothly transitioning when viewing different recipes
4. Maintaining low opacity for subtle effect

### Nutrition Calculation
The app provides accurate nutrition data by:
1. Extracting ingredients from recipe
2. Querying USDA database for each ingredient
3. Aggregating nutrient values
4. Converting to standard units
5. Displaying comprehensive breakdown

## 🎨 Design Decisions

### Color Palette
- **No Blue/Indigo**: As requested, using warm, gourmet-appropriate colors
- **Gradients**: Subtle gradients for text and backgrounds
- **High Contrast**: Ensuring readability in both themes

### Typography
- **Headings**: Bold, large, gradient text
- **Body**: Clear, readable with proper line spacing
- **Labels**: Small, muted but legible

### Components Used
- **Card**: Recipe cards with hover effects
- **Badge**: Categories, tags, and nutrition labels
- **Dialog**: Recipe detail modal
- **Scroll Area**: Smooth scrolling for long content
- **Input**: Search and ingredient input
- **Button**: Primary and outline variants

## 🔮 Phase 2 Features (Planned)

The following features are planned for future development:

### 📄 Document Import
- **URL Scraping**: Extract recipes from web pages
- **PDF Upload**: Parse recipe PDFs
- **Document Scanning**: OCR for printed recipes
- **Manual Entry**: Form-based recipe creation

### 🧪 Advanced Features
- **Food Safety**: Safety information and allergen detection
- **Phytochemicals**: Health compounds in ingredients
- **Cost Calculator**: Recipe cost estimation
- **Collections**: Save and organize recipes into albums
- **Nutrition Goals**: Filter by dietary requirements

## 🐛 Troubleshooting

### No Recipes Found
- Try fewer ingredients in compound search
- Check ingredient spelling
- Use more generic ingredient names

### Nutrition Data Shows as Estimated
- Add your USDA API key to `.env`
- Verify the API key is valid
- Check your internet connection

### Images Not Loading
- Check internet connection (TheMealDB is external)
- Try refreshing the page
- Images may be slow to load initially

## 📝 Environment Variables

```env
# Database (not currently used in Phase 1)
DATABASE_URL=file:/home/z/my-project/db/custom.db

# USDA FoodData Central API Key
# Get your free key at: https://fdc.nal.usda.gov/api-key-signup.html
USDA_API_KEY=your_usda_api_key_here
```

## 🚀 Performance Optimizations

- **API Caching**: Reduce external API calls with Next.js caching
- **Image Lazy Loading**: Load images as needed
- **Debounced Search**: Prevent excessive API calls
- **Optimistic UI**: Instant feedback for better UX

## 📊 Browser Compatibility

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS 14+, Android 10+
- **Features Used**: CSS Grid, Flexbox, Custom Properties, Backdrop Filter

## 🤝 Contributing

This is Phase 1 of the Gourmet Recipes app. Future phases will include:
- Recipe management (create, edit, delete)
- User authentication and favorites
- Advanced nutrition tracking
- Meal planning and shopping lists
- Social features (sharing, comments)

## 📄 License

This project uses:
- **TheMealDB API**: Open source (CC0 1.0 Universal)
- **USDA FoodData Central**: Public domain data
- **shadcn/ui**: MIT License
- **Next.js**: MIT License

---

**Built with ❤️ for food enthusiasts and home chefs everywhere!**
