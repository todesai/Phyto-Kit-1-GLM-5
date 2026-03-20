// Dynamic import to avoid caching issues
console.log('=== DB.TS MODULE LOADED - ' + new Date().toISOString() + ' ===')

// Singleton pattern for Prisma client
const globalForPrisma = globalThis as unknown as {
  prisma: any
}

// Create Prisma client synchronously using bundled client
function getPrismaClient() {
  if (globalForPrisma.prisma) {
    console.log('Using cached Prisma client')
    return globalForPrisma.prisma
  }
  
  console.log('Creating new Prisma client...')
  
  // Import PrismaClient - this uses the bundled version
  // Using require for synchronous loading is intentional here for Prisma client initialization
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient } = require('@prisma/client')
  const client = new PrismaClient({ log: ['query'] })
  
  const modelCount = Object.keys(client).filter((k: string) => !k.startsWith('_') && !k.startsWith('$')).length
  console.log(`New client has ${modelCount} models`)
  
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client
  }
  
  return client
}

export const db = getPrismaClient()

// Debug log
const models = Object.keys(db).filter((k: string) => !k.startsWith('_') && !k.startsWith('$'))
console.log('Prisma client ready with', models.length, 'models, including globalEdibleItem:', 'globalEdibleItem' in db)
