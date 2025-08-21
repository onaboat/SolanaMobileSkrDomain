#!/usr/bin/env tsx

import { Connection, PublicKey } from '@solana/web3.js'
import { PrismaClient } from '@prisma/client'

const TLDH_PROGRAM_ID = 'TLDHkysf5pCnKsVA4gXpNvmy7psXLPEu4LAdDJthT9S'

class DatabaseOwnerFixer {
  private connection: Connection
  private prisma: PrismaClient

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, { commitment: 'confirmed' })
    this.prisma = new PrismaClient()
  }

  private extractOwnerAddress(tx: any): string | null {
    if (!tx?.transaction?.message) return null
    
    try {
      // For versioned transactions, look at staticAccountKeys
      if ('staticAccountKeys' in tx.transaction.message) {
        const staticKeys = tx.transaction.message.staticAccountKeys
        if (Array.isArray(staticKeys) && staticKeys.length > 7) {
          // Based on the debug output, owner is at index 7
          return staticKeys[7]
        }
      }
      
      // For legacy transactions, try accountKeys
      if ('accountKeys' in tx.transaction.message) {
        const accountKeys = tx.transaction.message.accountKeys
        if (Array.isArray(accountKeys) && accountKeys.length > 7) {
          return accountKeys[7]
        }
      }
    } catch (error) {
      console.error('Error extracting owner address:', error)
    }
    
    return null
  }

  async fixOwnerAddresses(limit: number = 100): Promise<void> {
    console.log('🔧 Starting database owner address fix...')
    
    // Get domains from database that have owner addresses
    const domains = await this.prisma.domain.findMany({
      where: {
        owner: {
          not: null
        }
      },
      take: limit,
      orderBy: { timestamp: 'desc' }
    })
    
    console.log(`📊 Found ${domains.length} domains to check`)
    
    let fixed = 0
    let errors = 0
    let unchanged = 0
    
    for (let i = 0; i < domains.length; i++) {
      const domain = domains[i]
      
      try {
        // Add delay to avoid rate limiting
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000)) // Increased delay to 2 seconds
        }
        
        console.log(`🔍 Checking ${i + 1}/${domains.length}: ${domain.name} (${domain.signature.slice(0, 8)}...)`)
        
        // Fetch transaction
        const tx = await this.connection.getTransaction(domain.signature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0,
        })
        
        if (tx) {
          const correctOwner = this.extractOwnerAddress(tx)
          
          if (correctOwner && correctOwner !== domain.owner) {
            console.log(`✅ Fixing ${domain.name}: ${domain.owner} → ${correctOwner}`)
            
            // Update database
            await this.prisma.domain.update({
              where: { signature: domain.signature },
              data: { owner: correctOwner }
            })
            
            fixed++
          } else if (correctOwner === domain.owner) {
            console.log(`✅ ${domain.name} already has correct owner`)
            unchanged++
          } else {
            console.log(`⚠️  Could not extract owner for ${domain.name}`)
            errors++
          }
        } else {
          console.log(`⚠️  Transaction not found for ${domain.name}`)
          errors++
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${domain.name}:`, error)
        errors++
      }
    }
    
    console.log(`🎉 Fix complete!`)
    console.log(`📊 Fixed: ${fixed} domains`)
    console.log(`✅ Unchanged: ${unchanged} domains`)
    console.log(`❌ Errors: ${errors} domains`)
  }

  async disconnect() {
    await this.prisma.$disconnect()
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  const limit = parseInt(args[0]) || 100

  // Use Helius RPC from environment variable, fall back to default
  const rpcUrl = process.env.HELIUS_RPC || 'https://api.mainnet-beta.solana.com'
  console.log(`🔗 Using RPC: ${rpcUrl === 'https://api.mainnet-beta.solana.com' ? 'Default Solana RPC' : 'Helius RPC'}`)

  const fixer = new DatabaseOwnerFixer(rpcUrl)

  try {
    await fixer.fixOwnerAddresses(limit)
  } finally {
    await fixer.disconnect()
  }
}

main().catch(console.error)
