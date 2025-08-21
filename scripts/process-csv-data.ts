#!/usr/bin/env tsx

import * as fs from 'fs/promises'
import * as path from 'path'

interface DomainRegistration {
  name: string
  signature: string
  timestamp: string
  blockTime?: number
  owner: string
  fee?: number
}

async function processCsvData() {
  console.log('🔄 Processing CSV data...')
  
  const dataDir = path.join(process.cwd(), 'data')
  const csvFile = path.join(dataDir, 'rawdata_skr_only.csv')
  const domainsFile = path.join(dataDir, 'domains.json')
  
  try {
    // Read CSV file
    const csvData = await fs.readFile(csvFile, 'utf-8')
    const lines = csvData.trim().split('\n')
    
    console.log(`📈 Found ${lines.length} CSV rows to process`)
    
    // Parse CSV data
    const domains: DomainRegistration[] = []
    
    for (const line of lines) {
      const [timestamp, signature, owner, domainName] = line.split(',')
      
      if (!domainName || !domainName.endsWith('.skr')) {
        continue // Skip invalid entries
      }
      
      // Convert timestamp format
      const isoTimestamp = convertTimestamp(timestamp)
      
      const domainData: DomainRegistration = {
        name: domainName,
        signature: signature,
        timestamp: isoTimestamp,
        owner: owner,
        // Note: fee and blockTime are not available in CSV data
      }
      
      domains.push(domainData)
    }
    
    console.log(`✅ Processed ${domains.length} domains from CSV`)
    
    // Sort by timestamp (newest first)
    domains.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    // Overwrite domains.json with new data
    await fs.writeFile(domainsFile, JSON.stringify(domains, null, 2))
    
    console.log(`�� Successfully overwrote domains.json!`)
    console.log(`📊 Total domains: ${domains.length}`)
    console.log(`�� Saved to ${domainsFile}`)
    
    // Show some statistics
    if (domains.length > 0) {
      const earliestDate = new Date(domains[domains.length - 1]?.timestamp || Date.now())
      const latestDate = new Date(domains[0]?.timestamp || Date.now())
      
      console.log(`📅 Date range: ${earliestDate.toISOString().split('T')[0]} to ${latestDate.toISOString().split('T')[0]}`)
    }
    
  } catch (error) {
    console.error('❌ Error processing CSV data:', error)
  }
}

function convertTimestamp(timestamp: string): string {
  // Convert "2025-01-29 09:15:13.000 UTC" to ISO format
  try {
    // Remove the ".000 UTC" part and parse
    const cleanTimestamp = timestamp.replace('.000 UTC', '')
    const date = new Date(cleanTimestamp + ' UTC')
    return date.toISOString()
  } catch (error) {
    console.error('Error converting timestamp:', timestamp, error)
    return new Date().toISOString()
  }
}

// Run the processor
processCsvData().catch(console.error)
