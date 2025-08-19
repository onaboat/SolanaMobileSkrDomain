import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'

export async function GET() {
  try {
    console.log('🔍 Testing database connection...')
    
    // Test basic connection
    const totalDomains = await prisma.domain.count()
    console.log('📊 Total domains in database:', totalDomains)
    
    // Get a few sample domains
    const sampleDomains = await prisma.domain.findMany({
      take: 5,
      orderBy: { timestamp: 'desc' }
    })
    
    return NextResponse.json({
      success: true,
      totalDomains,
      sampleDomains: sampleDomains.map(d => ({
        name: d.name,
        timestamp: d.timestamp,
        signature: d.signature
      }))
    })
  } catch (error) {
    console.error('❌ Database test failed:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
