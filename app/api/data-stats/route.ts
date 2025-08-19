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
      const date
