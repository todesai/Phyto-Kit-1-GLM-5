# 🛠️ Setup Guide - Gourmet Recipes App

This guide will help you set up the Gourmet Recipes App on your local machine for development or production deployment.

## 📋 Prerequisites

### Required Software
- **Node.js** (v18 or higher) or **Bun** (recommended)
- **Git** - For version control
- **Code Editor** - VS Code recommended with extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript & JavaScript Language Features

### Optional Software
- **Postman** or **Insomnia** - For API testing
- **Git Desktop** - For graphical Git operations (optional)

## 🚀 Quick Start (5 minutes)

### 1. Clone or Download the Project

**Option A: Clone from GitHub (if you have push access)**
```bash
git clone https://github.com/todesai/gourmet-recipes-app.git
cd gourmet-recipes-app
```

**Option B: Download and Extract**
1. Download the `gourmet-recipes-app-complete.tar.gz` file
2. Extract to your desired location
3. Navigate to the project directory

### 2. Install Dependencies

```bash
# Using Bun (recommended - faster)
bun install

# OR using npm
npm install

# OR using yarn
yarn install
```

### 3. Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your preferred editor
# Add your USDA API key (optional, for nutritional data)
```

**Example `.env` file:**
```env
# USDA FoodData Central API (optional)
NEXT_PUBLIC_USDA_API_KEY=your_api_key_here
```

### 4. Run the Development Server

```bash
# Using Bun
bun run dev

# OR using npm
npm run dev

# OR using yarn
yarn dev
```

The app will be available at `http://localhost:3000`

## 📦 Detailed Setup Steps

### Step 1: Get a USDA API Key (Optional)

If you want to use nutritional data features:

1. Visit [USDA FoodData Central](https://fdc.nal.usda.gov/)
2. Click "Sign Up" to create a free account
3. Verify your email address
4. Go to "API Keys" in your account settings
5. Generate a new API key
6. Add the key to your `.env` file:
   ```env
   NEXT_PUBLIC_USDA_API_KEY=your_generated_key_here
   ```

**Note:** The app works without the USDA key. Nutritional features will just return placeholder data.

### Step 2: Database Setup (Future Features)

The project includes Prisma ORM for future database features. To set it up:

```bash
# Install Prisma CLI (if not already installed)
npm install -g prisma

# Generate Prisma Client
bun run prisma generate

# Push schema to database (creates SQLite file)
bun run db:push

# View database with Prisma Studio (optional)
bun run prisma studio
```

**Note:** Database features are planned for Phase 2 and are not currently used.

### Step 3: Verify Installation

Check that everything is working:

```bash
# Run linter to check code quality
bun run lint

# Run TypeScript type checking
npx tsc --noEmit

# Build the project (this also verifies everything compiles)
bun run build
```

## 🎨 Development Workflow

### Starting Development

```bash
# Start dev server with hot reload
bun run dev
```

The dev server:
- Runs on port 3000
- Automatically reloads on file changes
- Shows compilation errors in the terminal
- Supports fast refresh for React components

### Code Quality

```bash
# Run ESLint
bun run lint

# Auto-fix linting issues
bun run lint --fix

# Format code (if you add Prettier)
npx prettier --write .
```

### Building for Production

```bash
# Create optimized production build
bun run build

# Test production build locally
bun start
```

## 🌐 Deploying the App

### Vercel (Recommended)

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin master
   ```

2. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variables in Vercel dashboard:
     - `NEXT_PUBLIC_USDA_API_KEY` (if using nutritional data)
   - Click "Deploy"

3. **Your app will be live!** 🚀

### Other Deployment Options

**Netlify:**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build the project
bun run build

# Deploy
netlify deploy --prod --dir=.next
```

**Self-hosted:**
```bash
# Build the project
bun run build

# Start with PM2 (process manager)
npm install -g pm2
pm2 start bun --name "gourmet-recipes" -- start
```

## 🔧 Troubleshooting

### Common Issues

**Issue: Port 3000 is already in use**
```bash
# Kill the process using port 3000
# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# On macOS/Linux:
lsof -ti:3000 | xargs kill -9

# OR run on a different port
PORT=3001 bun run dev
```

**Issue: Module not found errors**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
bun install
```

**Issue: TypeScript errors**
```bash
# Regenerate types
npx tsc --noEmit

# If issues persist, try:
rm -rf node_modules .next
bun install
```

**Issue: USDA API returns errors**
- Verify your API key is correct in `.env`
- Check if you've exceeded API rate limits
- Try using the app without the API key (it will still work)

### Getting Help

If you encounter issues not covered here:

1. Check the [GitHub Issues](https://github.com/todesai/gourmet-recipes-app/issues)
2. Review the [DOCUMENTATION_STATUS.md](DOCUMENTATION_STATUS.md)
3. Check the [PHASE1_HANDOVER.md](PHASE1_HANDOVER.md) for known issues

## 📚 Next Steps

After setting up the app:

1. **Explore the Features**
   - Try searching for recipes by name
   - Add multiple ingredients to filter
   - Test the ingredient count filters
   - Switch between background modes
   - Toggle dark/light themes

2. **Read the Documentation**
   - [FEATURES.md](FEATURES.md) - See what's planned for Phase 2
   - [PHASE1_HANDOVER.md](PHASE1_HANDOVER.md) - Understand Phase 1 implementation

3. **Start Contributing**
   - Fork the repository
   - Create a feature branch
   - Make your changes
   - Submit a Pull Request

## 🔐 Security Notes

- **Never commit** `.env` files with real API keys
- Use `.env.example` for templates
- Rotate API keys regularly
- Keep dependencies updated: `bun update`

## 📞 Support

For questions or issues:
- GitHub Issues: https://github.com/todesai/gourmet-recipes-app/issues
- Documentation: Check the `*.md` files in the project root

---

Happy cooking and coding! 🍳👨‍💻
