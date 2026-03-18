import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const parent = await prisma.mexicanFood.findFirst({
    where: { nombreEspanol: 'Cacahuate', isParent: true },
    select: { id: true, nombreEspanol: true, taxon: true }
  })
  console.log('Cacahuate parent:', parent)
  
  await prisma.$disconnect()
}

main().catch(console.error)
