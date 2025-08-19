import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const timeRange = searchParams.get('timeRange') || 'all'
    const search = searchParams.get('search') || ''

    console.log('🔍 API Request:', { page, limit, timeRange, search })

    // Calculate date filter based on timeRange
    let dateFilter = {}
    if (timeRange !== 'all') {
      const now = new Date()
      let daysAgo = 0
      
      switch (timeRange) {
        case '3d':
          daysAgo = 3
          break
        case '5d':
          daysAgo = 5
          break
        case '7d':
          daysAgo = 7
          break
        case '10d':
          daysAgo = 10
          break
        case '14d':
          daysAgo = 14
          break
        case '21d':
          daysAgo = 21
          break
        case '30d':
          daysAgo = 30
          break
      }
      
      if (daysAgo > 0) {
        const cutoffDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000))
        dateFilter = {
          timestamp: {
            gte: cutoffDate.toISOString()
          }
        }
        console.log('📅 Date filter:', { 
          now: now.toISOString(),
          daysAgo, 
          cutoffDate: cutoffDate.toISOString(),
          timeRange 
        })
      }
    }

    // Build where clause
    const where = {
      ...dateFilter,
      ...(search && {
        name: {
          contains: search,
          mode: 'insensitive' as const
        }
      })
    }

    console.log('🔍 Database query where clause:', where)

    // Get total count for pagination
    const totalCount = await prisma.domain.count({ where })
    console.log('📊 Total count:', totalCount)

    // For charts, we want more data. For the domain list, we use pagination
    const isChartRequest = searchParams.get('forChart') === 'true'
    const actualLimit = isChartRequest ? Math.min(10000, totalCount) : limit

    // Get domains with pagination
    const domains = await prisma.domain.findMany({
      where,
      orderBy: {
        timestamp: 'desc'
      },
      skip: isChartRequest ? 0 : (page - 1) * limit,
      take: actualLimit
    })

    // Add debugging for the first few domains to see their timestamps
    if (domains.length > 0) {
      console.log('📅 Sample domain timestamps:', domains.slice(0, 3).map(d => ({
        name: d.name,
        timestamp: d.timestamp,
        blockTime: d.blockTime
      })))
    }

    console.log('📊 Found domains:', domains.length)

    return NextResponse.json({
      domains,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })
  } catch (error) {
    console.error('❌ Failed to load domains:', error)
    return NextResponse.json({ error: 'Failed to load domains', details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { domain } = body

    // Check if domain already exists
    const existingDomain = await prisma.domain.findUnique({
      where: { signature: domain.signature }
    })

    if (existingDomain) {
      return NextResponse.json({ success: true, message: 'Domain already exists' })
    }

    // Add new domain to database
    const newDomain = await prisma.domain.create({
      data: {
        signature: domain.signature,
        name: domain.name,
        timestamp: domain.timestamp,
        blockTime: domain.blockTime,
        owner: domain.owner,
        fee: domain.fee
      }
    })

    return NextResponse.json({ success: true, domain: newDomain })
  } catch (error) {
    console.error('Failed to save domain:', error)
    return NextResponse.json({ error: 'Failed to save domain' }, { status: 500 })
  }
}
