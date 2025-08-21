import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'

export async function GET() {
  try {
    // Get the oldest and newest domains
    const oldestDomain = await prisma.domain.findFirst({
      orderBy: { timestamp: 'asc' }
    })
    
    const newestDomain = await prisma.domain.findFirst({
      orderBy: { timestamp: 'desc' }
    })
    
    // Get total count
    const totalCount = await prisma.domain.count()
    
    // Get count by day for the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentDomains = await prisma.domain.findMany({
      where: {
        timestamp: {
          gte: thirtyDaysAgo.toISOString()
        }
      },
      orderBy: { timestamp: 'desc' }
    })
    
    // Group by day
    const dailyCounts = recentDomains.reduce((acc, domain) => {
      const date = new Date(domain.timestamp).toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      totalCount,
      oldestDomain: oldestDomain?.timestamp,
      newestDomain: newestDomain?.timestamp,
      dailyCounts,
      recentCount: recentDomains.length
    })
  } catch (error) {
    console.error('Failed to get data stats:', error)
    return NextResponse.json({ error: 'Failed to get data stats' }, { status: 500 })
  }
}
