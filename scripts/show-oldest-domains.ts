#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function showOldestDomains() {
  try {
    console.log('🔍 Finding the 10 oldest domains...\n')
    
    const oldestDomains = await prisma.domain.findMany({
      take: 10,
      orderBy: [
        { blockTime: 'asc' },
        { timestamp: 'asc' }
      ],
      select: {
        name: true,
        signature: true,
        timestamp: true,
        blockTime: true,
        owner: true
      }
    })
    
    console.log('�� 10 Oldest Domains:')
    console.log('─'.repeat(120))
    console.log(`${'Rank'.padEnd(4)} | ${'Domain Name'.padEnd(20)} | ${'Owner'.padEnd(44)} | ${'Block Time'.padEnd(20)} | ${'Date'.padEnd(25)}`)
    console.log('─'.repeat(120))
    
    oldestDomains.forEach((domain, index) => {
      const rank = (index + 1).toString().padEnd(4)
      const name = domain.name.padEnd(20)
      const owner = (domain.owner || 'Unknown').padEnd(44)
      const blockTime = (domain.blockTime?.toString() || 'N/A').padEnd(20)
      
      let date = 'N/A'
      if (domain.blockTime) {
        date = new Date(domain.blockTime * 1000).toLocaleString().padEnd(25)
      } else if (domain.timestamp) {
        date = new Date(domain.timestamp).toLocaleString().padEnd(25)
      }
      
      console.log(`${rank} | ${name} | ${owner} | ${blockTime} | ${date}`)
    })
    
    console.log('─'.repeat(120))
    
    // Also show some stats
    const totalDomains = await prisma.domain.count()
    console.log(`\n📈 Total domains in database: ${totalDomains}`)
    
    if (oldestDomains.length > 0) {
      const oldest = oldestDomains[0]
      const newest = await prisma.domain.findFirst({
        orderBy: [
          { blockTime: 'desc' },
          { timestamp: 'desc' }
        ]
      })
      
      if (oldest.blockTime && newest?.blockTime) {
        const timeSpan = newest.blockTime - oldest.blockTime
        const daysSpan = Math.floor(timeSpan / (24 * 60 * 60))
        console.log(`📅 Time span: ${daysSpan} days (${oldest.blockTime} to ${newest.blockTime})`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error fetching oldest domains:', error)
  } finally {
    await prisma.$disconnect()
  }
}

showOldestDomains()
