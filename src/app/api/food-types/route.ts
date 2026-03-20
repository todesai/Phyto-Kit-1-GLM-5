import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Get distinct tipoAlimento values with counts
    const foodTypes = await db.mexicanFood.groupBy({
      by: ['tipoAlimento'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    })

    const result = foodTypes
      .filter(ft => ft.tipoAlimento) // Remove nulls
      .map(ft => ({
        name: ft.tipoAlimento,
        count: ft._count.id
      }))

    return NextResponse.json({
      foodTypes: result,
      total: result.reduce((sum, ft) => sum + ft.count, 0)
    })
  } catch (error) {
    console.error('Error fetching food types:', error)
    return NextResponse.json({ foodTypes: [], total: 0 })
  }
}
