import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ============================================
// GET - Fetch prepared items (processed/prepared foods)
// ============================================
export async function GET() {
  try {
    // Find items that have been marked as prepared
    // Prisma auto-connects on first query, no need for explicit $connect()
    const preparedItems = await db.mexicanFood.findMany({
      where: {
        hierarchyStatus: 'prepared',
        isParent: false
      },
      select: {
        id: true,
        nombreEspanol: true,
        taxon: true,
        tipoAlimento: true,
        isParent: true,
        parentIngredientId: true,
        hierarchyStatus: true
      },
      orderBy: { nombreEspanol: 'asc' }
    })

    return NextResponse.json({
      success: true,
      items: preparedItems,
      total: preparedItems.length
    })
  } catch (error) {
    console.error('Fetch prepared items error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
