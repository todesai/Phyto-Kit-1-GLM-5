import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ============================================
// GET - Fetch rejected items (items marked as rejected children)
// ============================================
export async function GET() {
  try {
    // Find items that have been rejected as children
    // Prisma auto-connects on first query, no need for explicit $connect()
    const rejectedItems = await db.mexicanFood.findMany({
      where: {
        hierarchyStatus: 'rejected',
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
      items: rejectedItems,
      total: rejectedItems.length
    })
  } catch (error) {
    console.error('Fetch rejected items error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
