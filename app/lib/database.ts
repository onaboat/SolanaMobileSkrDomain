import { prisma } from './prisma'
import type { DomainRegistration } from '../types'

export async function getDomainsWithFilters(options: {
  timeRange?: string
  search?: string
  page?: number
  limit?: number
}) {
  const { timeRange = 'all', search = '', page = 1, limit = 100 } = options

  // Calculate date filter based on timeRange
  let dateFilter = {}
  if (timeRange !== 'all') {
    const now = new Date()
    let daysAgo = 0
    
    switch (timeRange) {
      case '7d':
        daysAgo = 7
        break
      case '30d':
        daysAgo = 30
        break
      case '90d':
        daysAgo = 90
        break
    }
    
    if (daysAgo > 0) {
      const cutoffDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000))
      dateFilter = {
        timestamp: {
          gte: cutoffDate.toISOString()
        }
      }
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

  // Get total count for pagination
  const totalCount = await prisma.domain.count({ where })

  // Get domains with pagination
  const domains = await prisma.domain.findMany({
    where,
    orderBy: {
      timestamp: 'desc'
    },
    skip: (page - 1) * limit,
    take: limit
  })

  return {
    domains,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit)
    }
  }
}

export async function saveDomain(domain: DomainRegistration) {
  // Check if domain already exists
  const existingDomain = await prisma.domain.findUnique({
    where: { signature: domain.signature }
  })

  if (existingDomain) {
    return { success: true, message: 'Domain already exists', domain: existingDomain }
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

  return { success: true, domain: newDomain }
}

export async function getDomainStats() {
  const totalDomains = await prisma.domain.count()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const todayDomains = await prisma.domain.count({
    where: {
      timestamp: {
        gte: today.toISOString()
      }
    }
  })

  return {
    total: totalDomains,
    today: todayDomains
  }
}
