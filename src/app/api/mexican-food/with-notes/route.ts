import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get all items with notes
    const itemsWithNotes = await db.mexicanFood.findMany({
      where: {
        notes: { not: null }
      },
      select: {
        id: true,
        nombreEspanol: true,
        nombreIngles: true,
        taxon: true,
        isParent: true,
        parentIngredientId: true,
        notes: true
      },
      orderBy: {
        nombreEspanol: 'asc'
      }
    })
    
    // Separate parents and children
    const parents = itemsWithNotes.filter(i => i.isParent || !i.parentIngredientId)
    const children = itemsWithNotes.filter(i => !i.isParent && i.parentIngredientId)
    
    return NextResponse.json({
      success: true,
      total: itemsWithNotes.length,
      parentsCount: parents.length,
      childrenCount: children.length,
      parents: parents.map(i => ({
        nombre: i.nombreEspanol,
        nombreIngles: i.nombreIngles,
        taxon: i.taxon,
        notes: i.notes
      })),
      children: children.map(i => ({
        nombre: i.nombreEspanol,
        nombreIngles: i.nombreIngles,
        taxon: i.taxon,
        notes: i.notes
      }))
    })
  } catch (error) {
    console.error('Error fetching items with notes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
