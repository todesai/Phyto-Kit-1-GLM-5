import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const updated = await prisma.mexicanFood.update({
    where: { id: 'cmllv2him029nqk6s1pue2dff' },
    data: { taxon: 'Arachis hypogaea' }
  })
  console.log('Updated Cacahuate parent:')
  console.log(`  ${updated.nombreEspanol}: ${updated.taxon}`)
  
  await prisma.$disconnect()
}

main().catch(console.error)
