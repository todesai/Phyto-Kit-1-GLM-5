import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - List word classifications with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const needsReview = searchParams.get('needsReview')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    
    if (category && category !== 'all') {
      where.category = category
    }
    
    if (needsReview === 'true') {
      where.needsReview = true
    }
    
    if (search) {
      where.word = { contains: search, mode: 'insensitive' }
    }

    const [words, total, stats] = await Promise.all([
      prisma.wordClassification.findMany({
        where,
        orderBy: [
          { needsReview: 'desc' },
          { frequency: 'desc' },
          { word: 'asc' }
        ],
        take: limit,
        skip: offset
      }),
      prisma.wordClassification.count({ where }),
      prisma.wordClassification.groupBy({
        by: ['category'],
        _count: true
      })
    ])

    // Calculate summary stats
    const totalWords = await prisma.wordClassification.count()
    const needsReviewCount = await prisma.wordClassification.count({
      where: { needsReview: true }
    })

    return NextResponse.json({
      words,
      total,
      stats: {
        total: totalWords,
        needsReview: needsReviewCount,
        classified: totalWords - needsReviewCount,
        byCategory: stats.reduce((acc, s) => {
          acc[s.category] = s._count
          return acc
        }, {} as Record<string, number>)
      }
    })
  } catch (error) {
    console.error('Error fetching word classifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch word classifications' },
      { status: 500 }
    )
  }
}

// POST - Update a word classification (by id or word)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, word, category, subcategory, priority, notes, needsReview } = body

    // Require either id or word
    if (!id && !word) {
      return NextResponse.json(
        { error: 'Word ID or word text is required' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (category) updateData.category = category
    if (subcategory !== undefined) updateData.subcategory = subcategory
    if (priority !== undefined) updateData.priority = priority
    if (notes !== undefined) updateData.notes = notes
    if (needsReview !== undefined) updateData.needsReview = needsReview

    let updated

    if (id) {
      // Update by ID
      updated = await prisma.wordClassification.update({
        where: { id },
        data: updateData
      })
    } else {
      // Find and update by word (case-insensitive)
      const existing = await prisma.wordClassification.findFirst({
        where: { wordLower: word.toLowerCase() }
      })

      if (existing) {
        updated = await prisma.wordClassification.update({
          where: { id: existing.id },
          data: updateData
        })
      } else {
        // Create new if doesn't exist
        updated = await prisma.wordClassification.create({
          data: {
            word: word,
            wordLower: word.toLowerCase(),
            category: category || 'unknown',
            needsReview: needsReview ?? false,
            frequency: 1
          }
        })
      }
    }

    return NextResponse.json({ success: true, classification: updated })
  } catch (error) {
    console.error('Error updating word classification:', error)
    return NextResponse.json(
      { error: 'Failed to update word classification' },
      { status: 500 }
    )
  }
}

// PUT - Bulk update multiple word classifications
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { updates } = body

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Updates array is required' },
        { status: 400 }
      )
    }

    const results = await Promise.all(
      updates.map((update: any) =>
        prisma.wordClassification.update({
          where: { id: update.id },
          data: {
            category: update.category,
            subcategory: update.subcategory,
            priority: update.priority,
            needsReview: update.needsReview
          }
        })
      )
    )

    return NextResponse.json({ updated: results.length })
  } catch (error) {
    console.error('Error bulk updating word classifications:', error)
    return NextResponse.json(
      { error: 'Failed to bulk update word classifications' },
      { status: 500 }
    )
  }
}
