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

interface FullTransaction {
  signature: string
  blockTime?: number
  timestamp: string
  fullTransaction: any
  domainName?: string
}

async function processExistingTransactions() {
  console.log('🔄 Processing existing transaction data...')
  
  const dataDir = path.join(process.cwd(), 'data')
  const transactionsFile = path.join(dataDir, 'transactions.json')
  const domainsFile = path.join(dataDir, 'domains.json')
  
  try {
    // Read existing transactions
    const transactionsData = await fs.readFile(transactionsFile, 'utf-8')
    const transactions: FullTransaction[] = JSON.parse(transactionsData)
    
    console.log(`📈 Found ${transactions.length} transactions to process`)
    
    const domains: DomainRegistration[] = []
    
    for (const tx of transactions) {
      if (tx.domainName) {
        // Extract owner from the transaction data
        const owner = extractOwnerFromTransaction(tx.fullTransaction)
        
        if (owner) {
          const domainData: DomainRegistration = {
            name: tx.domainName,
            signature: tx.signature,
            timestamp: tx.timestamp,
            blockTime: tx.blockTime,
            owner: owner,
            fee: tx.fullTransaction?.meta?.fee
          }
          
          domains.push(domainData)
          console.log(`✅ Processed: ${tx.domainName} (owner: ${owner})`)
        } else {
          console.log(`⚠️  No owner found for: ${tx.domainName}`)
        }
      }
    }
    
    // Save to domains.json
    await fs.writeFile(domainsFile, JSON.stringify(domains, null, 2))
    
    console.log(`🎉 Processed ${domains.length} domains`)
    console.log(`�� Saved to ${domainsFile}`)
    
  } catch (error) {
    console.error('❌ Error processing transactions:', error)
  }
}

function extractOwnerFromTransaction(tx: any): string | null {
  if (!tx?.transaction?.message) return null
  
  try {
    // For versioned transactions, look at staticAccountKeys
    if ('staticAccountKeys' in tx.transaction.message) {
      const staticKeys = tx.transaction.message.staticAccountKeys
      if (Array.isArray(staticKeys) && staticKeys.length > 7) {
        // Based on the transaction structure, the owner is typically at index 7
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

// Run the processor
processExistingTransactions().catch(console.error)
