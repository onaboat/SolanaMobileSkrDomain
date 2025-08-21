import { PrismaClient } from '@prisma/client'
import { promises as fs } from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function migrateData() {
  try {
    console.log('🔄 Starting data migration...')
    
    // Read existing JSON file
    const domainsFile = path.join(process.cwd(), 'data', 'domains.json')
    const domainsData = await fs.readFile(domainsFile, 'utf-8')
    const domains = JSON.parse(domainsData)
    
    console.log(`📊 Found ${domains.length} domains to migrate`)
    
    // Check if database is empty
    const existingCount = await prisma.domain.count()
    if (existingCount > 0) {
      console.log(`⚠️  Database already contains ${existingCount} domains`)
      console.log('🔄 Clearing existing data...')
      await prisma.domain.deleteMany()
    }
    
    // Insert domains in batches to avoid memory issues
    const batchSize = 100
    for (let i = 0; i < domains.length; i += batchSize) {
      const batch = domains.slice(i, i + batchSize)
      
      await prisma.domain.createMany({
        data: batch.map((domain: any) => ({
          signature: domain.signature,
          name: domain.name,
          timestamp: domain.timestamp,
          blockTime: domain.blockTime,
          owner: domain.owner,
          fee: domain.fee
        })),
        skipDuplicates: true // Skip if signature already exists
      })
      
      console.log(`✅ Migrated batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(domains.length / batchSize)}`)
    }
    
    // Verify migration
    const finalCount = await prisma.domain.count()
    console.log(`🎉 Migration completed successfully!`)
    console.log(`📊 Total domains in database: ${finalCount}`)
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

migrateData()
