# 🍽️ Gourmet Recipes App

A modern, feature-rich recipe discovery and management application built with Next.js 16, designed to help food enthusiasts find, explore, and organize delicious recipes.

## ✨ Features

### 🔍 Comprehensive Search System
- **Multi-mode Search**: Search by recipe name, ingredients, or combine both
- **Smart Ingredient Filtering**: Add multiple ingredients with partial matching (case-insensitive)
- **Ingredient Count Filters**:
  - Filter by exact ingredient count
  - Filter by maximum number of ingredients
  - Combine both filters for precise results
- **Auto-update**: Results update automatically when filters change
- **Undo Support**: Restore the last removed ingredient with one click

### 🎨 Dynamic Background System
- **Three Background Modes**:
  - **Full**: 100% opacity background image
  - **Balanced**: Theme-aware opacity (60% light / 35% dark) for better readability
  - **None**: Clean background without image
- **Thumbnail Preview**: See current background mode at a glance
- **Persistent Preference**: Your choice is saved to localStorage

### 🌓 Theme Support
- Dark mode (default)
- Light mode toggle
- Automatic theme detection
- Smooth theme transitions

### 📊 Recipe Information
- Recipe cards with images, categories, and cuisines
- Ingredient count badges
- Active filter summary
- Nutritional data integration (USDA API ready)

## 🛠️ Technology Stack

### Core Framework
- **Next.js 16** - React framework with App Router
- **React 19** - Latest React features
- **TypeScript 5** - Type-safe development

### UI & Styling
- **Tailwind CSS 4** - Utility-first CSS
- **shadcn/ui** - High-quality accessible components
- **Lucide React** - Icon library
- **next-themes** - Theme management

### APIs
- **TheMealDB API** - Recipe database (free, no auth required)
- **USDA FoodData Central** - Nutritional data (requires API key)

### State Management
- **React Hooks** - useState, useEffect, useMemo
- **localStorage** - Client-side persistence

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Bun
- USDA API Key (optional, for nutritional data)

### Installation

```bash
# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env and add your USDA API key (optional)

# Initialize database (if using features that require it)
bun run db:push

# Start development server
bun run dev
```

### Build & Deploy

```bash
# Build for production
bun run build

# Start production server
bun start

# Run linter
bun run lint
```

## 📁 Project Structure

```
gourmet-recipes-app/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main application (1,210 lines)
│   │   ├── layout.tsx            # Root layout with ThemeProvider
│   │   ├── globals.css           # Global styles
│   │   └── api/                  # API routes (future features)
│   ├── components/
│   │   └── ui/                   # shadcn/ui components
│   ├── hooks/
│   │   ├── use-toast.ts          # Toast notifications
│   │   └── use-mobile.ts         # Mobile detection
│   ├── lib/
│   │   └── utils.ts              # Utility functions
│   └── types/
│       └── recipe.ts             # TypeScript interfaces
├── prisma/
│   └── schema.prisma             # Database schema (future features)
├── public/                       # Static assets
├── .env                          # Environment variables
├── .env.example                  # Environment template
├── package.json                  # Dependencies
├── next.config.ts                # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.ts            # Tailwind configuration
└── components.json               # shadcn/ui configuration
```

## 📚 Documentation

### Available Documentation
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Detailed setup instructions
- **[FEATURES.md](FEATURES.md)** - Current and planned features
- **[PHASE1_HANDOVER.md](PHASE1_HANDOVER.md)** - Phase 1 development summary
- **[DOCUMENTATION_STATUS.md](DOCUMENTATION_STATUS.md)** - Documentation audit

## 🎯 Current Status (Phase 1 - ✅ Complete)

### Implemented Features
- ✅ Comprehensive search system (name + ingredients)
- ✅ Multi-ingredient filtering with partial matching
- ✅ Ingredient count filters (exact and maximum)
- ✅ Dynamic background system (3 modes)
- ✅ Dark/light theme support
- ✅ Auto-update on filter changes
- ✅ Undo functionality for ingredients
- ✅ Active filter summary
- ✅ Responsive design
- ✅ Loading states (skeletons)
- ✅ Error handling

### Phase 2 (Planned)
- 📋 URL scraping for recipe import
- 📋 PDF upload for recipe parsing
- 📋 Manual recipe entry
- 📋 Recipe collections/favorites
- 📋 Recipe ratings and reviews
- 📋 Advanced search with filters
- 📋 Nutritional data visualization
- 📋 Meal planning features

## 🔧 Environment Variables

```env
# USDA FoodData Central API (optional, for nutritional data)
NEXT_PUBLIC_USDA_API_KEY=your_api_key_here
```

To get a USDA API key:
1. Visit [USDA FoodData Central](https://fdc.nal.usda.gov/)
2. Create a free account
3. Generate an API key
4. Add it to your `.env` file

## 📖 API Usage

### TheMealDB API
The app uses the free TheMealDB API:
- Search recipes by name
- Filter by ingredients
- Get recipe details
- No API key required

### USDA FoodData Central (Optional)
Used for nutritional data:
- Requires free API key
- Provides detailed nutritional information
- Enables nutritional comparisons

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 License

This project is open source and available under the MIT License.

## 🔗 Links

- **GitHub Repository**: https://github.com/todesai/gourmet-recipes-app
- **TheMealDB API**: https://www.themealdb.com/api.php
- **USDA FoodData Central**: https://fdc.nal.usda.gov/

## 🙏 Acknowledgments

- [TheMealDB](https://www.themealdb.com/) - Recipe database API
- [USDA](https://fdc.nal.usda.gov/) - Nutritional data
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components
- [Vercel](https://vercel.com/) - Next.js hosting platform

---

Built with ❤️ for food enthusiasts everywhere. Enjoy discovering delicious recipes! 🍽️✨
