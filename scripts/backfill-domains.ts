#!/usr/bin/env tsx

import { Connection, PublicKey } from '@solana/web3.js'
import * as fs from 'fs/promises'
import * as path from 'path'

const TLDH_PROGRAM_ID = 'TLDHkysf5pCnKsVA4gXpNvmy7psXLPEu4LAdDJthT9S'

interface DomainRegistration {
  name: string
  signature: string
  timestamp: string
  blockTime?: number
  fee?: number
  accounts?: string[]
  owner?: string // Add missing owner property
}

interface DomainTransaction {
  signature: string
  blockTime?: number
  timestamp: string
  fullTransaction: any // Store the complete transaction data
  domainName?: string // Optional: extracted domain name if we can get it from logs
}

interface FullTransaction extends DomainTransaction {
  // Additional properties for full transaction data
}

interface BackfillState {
  lastProcessedSignature: string | null
  totalTransactions: number
  lastRun: string
  totalDomains?: number // Add missing property
}

class DomainBackfill {
  private connection: Connection
  private dataDir: string
  private transactionsFile: string
  private stateFile: string
  private domainsFile: string

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, { commitment: 'confirmed' })
    this.dataDir = path.join(process.cwd(), 'data')
    this.transactionsFile = path.join(this.dataDir, 'transactions.json')
    this.stateFile = path.join(this.dataDir, 'backfill-state.json')
    this.domainsFile = path.join(this.dataDir, 'domains.json')
  }

  async ensureDataDir() {
    await fs.mkdir(this.dataDir, { recursive: true })
  }

  async loadState(): Promise<BackfillState> {
    try {
      const data = await fs.readFile(this.stateFile, 'utf-8')
      return JSON.parse(data)
    } catch {
      return {
        lastProcessedSignature: null,
        totalTransactions: 0,
        lastRun: new Date().toISOString()
      }
    }
  }

  async saveState(state: BackfillState) {
    await fs.writeFile(this.stateFile, JSON.stringify(state, null, 2))
  }

  async loadDomains(): Promise<DomainRegistration[]> {
    try {
      const data = await fs.readFile(this.domainsFile, 'utf-8')
      return JSON.parse(data)
    } catch {
      return []
    }
  }

  async saveDomains(domains: DomainRegistration[]) {
    await fs.writeFile(this.domainsFile, JSON.stringify(domains, null, 2))
  }

  async loadTransactions(): Promise<FullTransaction[]> {
    try {
      const data = await fs.readFile(this.transactionsFile, 'utf-8')
      return JSON.parse(data)
    } catch {
      return []
    }
  }

  async saveTransactions(transactions: FullTransaction[]) {
    await fs.writeFile(this.transactionsFile, JSON.stringify(transactions, null, 2))
  }

  async backfillDomains(limit: number = 10): Promise<number> {
    console.log('🚀 Starting domain backfill...')
    console.log(` Limit: ${limit}`)
    
    await this.ensureDataDir()
    const state = await this.loadState()
    const existingDomains = await this.loadDomains()
    const existingTransactions = await this.loadTransactions()
    
    console.log(`📈 Current domains: ${existingDomains.length}`)
    console.log(`📈 Current transactions: ${existingTransactions.length}`)
    console.log(` Last processed: ${state.lastProcessedSignature || 'None'}`)

    try {
      // Get signatures for the TLDH program
      let signatures
      
      if (state.lastProcessedSignature) {
        // Get older transactions than the last one we processed
        console.log(`🔄 Getting transactions before: ${state.lastProcessedSignature.slice(0, 8)}...`)
        signatures = await this.connection.getSignaturesForAddress(
          new PublicKey(TLDH_PROGRAM_ID),
          { 
            limit,
            before: state.lastProcessedSignature 
          },
          'confirmed'
        )
      } else {
        // First run - start from the old signature you provided
        console.log(`🔄 Starting from old signature: 2LSFccEnZXeFy3SqjnGGNBBwErsghTZxGei4BgrSuunaSmXFCkUDLBavEih4rGXMvXLjnwtz6ZgcNA8LgtYPCvDb`)
        signatures = await this.connection.getSignaturesForAddress(
          new PublicKey(TLDH_PROGRAM_ID),
          { 
            limit,
            before: '2LSFccEnZXeFy3SqjnGGNBBwErsghTZxGei4BgrSuunaSmXFCkUDLBavEih4rGXMvXLjnwtz6ZgcNA8LgtYPCvDb'
          },
          'confirmed'
        )
      }

      if (signatures.length === 0) {
        console.log(`📭 No more transactions to process`)
        return 0
      }

      console.log(` Found ${signatures.length} signatures`)
      if (signatures.length > 0) {
        const firstTime = signatures[0]?.blockTime || Date.now() / 1000
        const lastTime = signatures[signatures.length-1]?.blockTime || Date.now() / 1000
        console.log(`📅 Date range: ${new Date(firstTime * 1000).toISOString()} to ${new Date(lastTime * 1000).toISOString()}`)
      }

      const newDomains: DomainRegistration[] = []
      const newTransactions: FullTransaction[] = []
      let processed = 0
      let skipped = 0

      // Process signatures one by one
      for (let i = 0; i < signatures.length; i++) {
        const sig = signatures[i]
        
        // Skip if we already have this transaction
        if (existingTransactions.some(t => t.signature === sig.signature)) {
          console.log(`⏭️  Skipping existing transaction: ${sig.signature.slice(0, 8)}...`)
          skipped++
          processed++
          continue
        }
        
        try {
          // Add delay between requests to avoid rate limiting
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 3000)) // 3 second delay
          }

          console.log(`📥 Fetching transaction ${i + 1}/${signatures.length}: ${sig.signature.slice(0, 8)}...`)

          const tx = await this.connection.getTransaction(sig.signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
          })

          if (tx) {
            // Store full transaction
            const fullTransaction: FullTransaction = {
              signature: sig.signature,
              blockTime: sig.blockTime || undefined, // Fix: handle null case
              timestamp: new Date((sig.blockTime || Date.now() / 1000) * 1000).toISOString(),
              fullTransaction: tx
            }
            
            // Extract domain name from the transaction data
            const domainName = this.extractDomainFromTransaction(tx)
            if (domainName) {
              fullTransaction.domainName = domainName
              
              // Extract owner address
              const owner = this.extractOwnerAddress(tx)
              
              if (owner) {
                // Create clean domain data for frontend
                const domainData: DomainRegistration = {
                  name: domainName,
                  signature: sig.signature,
                  timestamp: new Date((sig.blockTime || Date.now() / 1000) * 1000).toISOString(),
                  blockTime: sig.blockTime || undefined, // Fix: handle null case
                  owner: owner,
                  fee: tx?.meta?.fee
                }
                
                newDomains.push(domainData)
                console.log(`✅ Found domain: ${domainName} (owner: ${owner})`)
              } else {
                console.log(`⚠️  Domain found but owner not detected: ${domainName}`)
              }
            } else {
              console.log(`⚠️  No domain detected in transaction`)
            }
            
            newTransactions.push(fullTransaction)
          } else {
            console.log(`⚠️  Transaction not found: ${sig.signature}`)
          }

          processed++
          const progress = ((i + 1) / signatures.length * 100).toFixed(1)
          console.log(`📊 Progress: ${progress}% | Processed: ${processed}/${signatures.length} | Found: ${newDomains.length} domains | Skipped: ${skipped}`)

        } catch (error) {
          console.error(`❌ Error processing signature ${sig.signature}:`, error)
          // Continue with next signature instead of failing completely
          processed++
        }
      }

      // If all transactions were skipped, we need to get even older ones
      if (skipped === signatures.length && signatures.length > 0) {
        console.log(`🔄 All transactions were duplicates. Getting older transactions...`)
        // Update state to the oldest signature we saw
        const oldestSignature = signatures[signatures.length - 1].signature
        const newState: BackfillState = {
          lastProcessedSignature: oldestSignature,
          totalTransactions: existingTransactions.length, // Fix: use correct property
          lastRun: new Date().toISOString()
        }
        await this.saveState(newState)
        console.log(`💾 Updated last processed signature to: ${oldestSignature.slice(0, 8)}...`)
        return 0
      }

      // Merge with existing data and remove duplicates
      const allDomains = [...existingDomains, ...newDomains]
      const allTransactions = [...existingTransactions, ...newTransactions]
      
      const uniqueDomains = this.removeDuplicates(allDomains, 'signature')
      const uniqueTransactions = this.removeDuplicates(allTransactions, 'signature')

      // Save both files
      await this.saveDomains(uniqueDomains)
      await this.saveTransactions(uniqueTransactions)

      // Update state with the oldest signature we processed
      const newState: BackfillState = {
        lastProcessedSignature: signatures[signatures.length-1]?.signature || state.lastProcessedSignature,
        totalTransactions: uniqueTransactions.length, // Fix: use correct property
        lastRun: new Date().toISOString()
      }
      await this.saveState(newState)

      const newDomainCount = uniqueDomains.length - existingDomains.length
      const newTransactionCount = uniqueTransactions.length - existingTransactions.length
      
      console.log(` Backfill complete!`)
      console.log(`📊 Total domains: ${uniqueDomains.length} (+${newDomainCount})`)
      console.log(` Total transactions: ${uniqueTransactions.length} (+${newTransactionCount})`)
      console.log(` Last signature: ${newState.lastProcessedSignature}`)

      return newDomainCount

    } catch (error) {
      console.error('❌ Error during backfill:', error)
      throw error
    }
  }

  private removeDuplicates<T extends { signature: string }>(items: T[], key: keyof T): T[] {
    const seen = new Set<string>()
    return items.filter(item => {
      if (seen.has(item.signature)) {
        return false
      }
      seen.add(item.signature)
      return true
    })
  }

  private extractDomainFromTransaction(tx: any): string | null {
    // The domain name is already extracted and available in the transaction data
    // We can look for it in the transaction logs or other parsed data
    if (!tx?.meta?.logMessages) return null
    
    const logs = tx.meta.logMessages
    const joined = logs.join('\n')
    
    // Look for the domain name pattern in the logs
    const domainPattern = /([a-z0-9._-]+\.skr)/i
    const match = joined.match(domainPattern)
    
    return match ? match[1].toLowerCase() : null
  }

  private extractOwnerAddress(tx: any): string | null {
    if (!tx?.transaction?.message) return null
    
    try {
      // For versioned transactions, look at staticAccountKeys
      if ('staticAccountKeys' in tx.transaction.message) {
        const staticKeys = tx.transaction.message.staticAccountKeys
        if (Array.isArray(staticKeys) && staticKeys.length > 7) {
          // Based on the transaction structure, the owner is typically at index 7
          // This is the first account in the main instruction's accountKeyIndexes
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
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  const limit = parseInt(args[1]) || 10

  // Use default Solana RPC for backfill to save credits for WebSocket
  const rpcUrl = process.env.HELIUS_RPC || 'https://api.mainnet-beta.solana.com'
  console.log(`🔗 Using RPC: ${rpcUrl === 'https://api.mainnet-beta.solana.com' ? 'Default Solana RPC' : 'Helius RPC'}`)

  const backfill = new DomainBackfill(rpcUrl)

  switch (command) {
    case 'full':
      console.log(`🔄 Running full backfill (limit: ${limit})`)
      await backfill.backfillDomains(limit)
      break
      
    case 'status':
      const state = await backfill.loadState()
      const transactions = await backfill.loadTransactions()
      console.log('📊 Backfill Status:')
      console.log(`  Total transactions: ${transactions.length}`)
      console.log(`  Last processed: ${state.lastProcessedSignature || 'None'}`)
      console.log(`  Last run: ${state.lastRun}`)
      
      // Count domains found
      const domainsFound = transactions.filter(t => t.domainName).length
      console.log(`  Domains detected: ${domainsFound}`)
      break
      
    default:
      console.log('Usage:')
      console.log('  npm run backfill:full [limit]     - Full backfill (default: 10)')
      console.log('  npm run backfill:status          - Show status')
      console.log('')
      console.log('Note: Stores full transaction data in data/transactions.json')
      break
  }
}

main().catch(console.error)
