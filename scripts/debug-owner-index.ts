#!/usr/bin/env tsx

import { Connection, PublicKey } from '@solana/web3.js'

const TLDH_PROGRAM_ID = 'TLDHkysf5pCnKsVA4gXpNvmy7psXLPEu4LAdDJthT9S'

class OwnerIndexDebugger {
  private connection: Connection

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, { commitment: 'confirmed' })
  }

  async debugTransaction(signature: string): Promise<void> {
    console.log(`🔍 Debugging transaction: ${signature}`)
    
    try {
      const tx = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      })
      
      if (!tx) {
        console.log('❌ Transaction not found')
        return
      }
      
      console.log('\n📋 Transaction Structure:')
      console.log('Header:', tx.transaction.message.header)
      
      if ('staticAccountKeys' in tx.transaction.message) {
        const staticKeys = tx.transaction.message.staticAccountKeys
        console.log('\n🔑 Static Account Keys:')
        staticKeys.forEach((key, index) => {
          const keyString = typeof key === 'string' ? key : key.toBase58()
          console.log(`[${index}]: ${keyString}`)
        })
        
        // Look for the expected owner address
        const expectedOwner = 'Etp7vf427jqAnheG14UmgokVMQnWUDLxoAJWU1r5154n'
        const ownerIndex = staticKeys.findIndex(key => {
          const keyString = typeof key === 'string' ? key : key.toBase58()
          return keyString === expectedOwner
        })
        console.log(`\n Expected owner "${expectedOwner}" found at index: ${ownerIndex}`)
        
        // Show all non-program addresses
        console.log('\n👤 Non-program addresses:')
        staticKeys.forEach((key, index) => {
          const keyString = typeof key === 'string' ? key : key.toBase58()
          if (keyString !== TLDH_PROGRAM_ID && 
              keyString !== '11111111111111111111111111111111' &&
              keyString !== 'ComputeBudget111111111111111111111111111111') {
            console.log(`[${index}]: ${keyString}`)
          }
        })
        
        // Test our extraction logic
        console.log('\n Testing extraction logic:')
        const extractedOwner = this.extractOwnerAddress(tx)
        console.log(`Extracted owner: ${extractedOwner}`)
        console.log(`Expected owner: ${expectedOwner}`)
        console.log(`Match: ${extractedOwner === expectedOwner ? '✅' : '❌'}`)
      }
      
      if ('accountKeys' in tx.transaction.message) {
        const accountKeys = tx.transaction.message.accountKeys
        console.log('\n🔑 Account Keys:')
        accountKeys.forEach((key, index) => {
          const keyString = typeof key === 'string' ? key : key.toBase58()
          console.log(`[${index}]: ${keyString}`)
        })
      }
      
      // Show instructions
      if ('compiledInstructions' in tx.transaction.message) {
        console.log('\n📝 Instructions:')
        tx.transaction.message.compiledInstructions.forEach((instruction, index) => {
          console.log(`Instruction ${index}:`, {
            programIdIndex: instruction.programIdIndex,
            accountKeyIndexes: instruction.accountKeyIndexes, // Fixed: use accountKeyIndexes instead of accounts
            data: instruction.data.slice(0, 20) + '...'
          })
        })
      }
      
    } catch (error) {
      console.error('❌ Error debugging transaction:', error)
    }
  }

  private extractOwnerAddress(tx: any): string | null {
    if (!tx?.transaction?.message) return null
    
    try {
      // For versioned transactions, look at staticAccountKeys
      if ('staticAccountKeys' in tx.transaction.message) {
        const staticKeys = tx.transaction.message.staticAccountKeys
        if (Array.isArray(staticKeys) && staticKeys.length > 7) {
          // Based on the debug output, owner is at index 7
          const key = staticKeys[7]
          return typeof key === 'string' ? key : key.toBase58()
        }
      }
      
      // For legacy transactions, try accountKeys
      if ('accountKeys' in tx.transaction.message) {
        const accountKeys = tx.transaction.message.accountKeys
        if (Array.isArray(accountKeys) && accountKeys.length > 7) {
          const key = accountKeys[7]
          return typeof key === 'string' ? key : key.toBase58()
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
  const signature = args[0]
  
  if (!signature) {
    console.log('Usage: npm run debug:owner <signature>')
    console.log('Example: npm run debug:owner 3RQQVudimpFjMv7rJ85JVY2vbE2UVcq3VZtbVDCQXtyUHuDTYiyWHfku4QhD7QGGaLJwrxGVi2H4U7AyykjngkAB')
    return
  }

  // Use Helius RPC from environment variable, fall back to default
  const rpcUrl = process.env.HELIUS_RPC || 'https://api.mainnet-beta.solana.com'
  console.log(`🔗 Using RPC: ${rpcUrl === 'https://api.mainnet-beta.solana.com' ? 'Default Solana RPC' : 'Helius RPC'}`)

  const debuggerInstance = new OwnerIndexDebugger(rpcUrl)
  await debuggerInstance.debugTransaction(signature)
}

main().catch(console.error)