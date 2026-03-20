import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Get distinct tipoAlimento values with counts
    const categories = await db.mexicanFood.groupBy({
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

    const total = await db.mexicanFood.count()

    return NextResponse.json({
      categories: categories.map(c => ({
        name: c.tipoAlimento || 'Sin categoría',
        count: c._count.id
      })),
      total
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}
