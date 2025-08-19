import { Connection, PublicKey } from '@solana/web3.js'

const TLDH_PROGRAM_ID = 'TLDHkysf5pCnKsVA4gXpNvmy7psXLPEu4LAdDJthT9S'

export interface DomainRegistration {
  name: string
  signature: string
  timestamp: string
  blockTime?: number
  owner: string // Domain owner wallet address
  fee?: number
}

export interface WatcherStats {
  totalProcessed: number
  domainsFound: number
  lastSignature: string | null
  isConnected: boolean
  startTime: string
}

export class WebSocketWatcher {
  private connection: Connection
  private isRunning = false
  private subscriptionId: number | null = null
  private seenSignatures = new Set<string>()
  private stats: WatcherStats
  private onNewDomain: (domain: DomainRegistration) => void
  private onStatsUpdate: (stats: WatcherStats) => void

  constructor(
    rpcUrl: string, 
    onNewDomain: (domain: DomainRegistration) => void,
    onStatsUpdate: (stats: WatcherStats) => void
  ) {
    this.connection = new Connection(rpcUrl, { commitment: 'confirmed' })
    this.onNewDomain = onNewDomain
    this.onStatsUpdate = onStatsUpdate
    this.stats = {
      totalProcessed: 0,
      domainsFound: 0,
      lastSignature: null,
      isConnected: false,
      startTime: new Date().toISOString()
    }
  }

  async start() {
    if (this.isRunning) return
    
    this.isRunning = true
    this.stats.isConnected = true
    this.stats.startTime = new Date().toISOString()
    this.onStatsUpdate(this.stats)
    
    console.log('🔌 Starting WebSocket domain watcher...')
    
    // Subscribe to program logs
    this.subscriptionId = await this.connection.onLogs(
      new PublicKey(TLDH_PROGRAM_ID),
      (logInfo) => {
        this.handleLog(logInfo)
      },
      'confirmed'
    )
    
    console.log('✅ WebSocket subscription started (id =', this.subscriptionId, ')')
  }

  stop() {
    this.isRunning = false
    this.stats.isConnected = false
    
    if (this.subscriptionId) {
      this.connection.removeOnLogsListener(this.subscriptionId)
      this.subscriptionId = null
    }
    
    this.onStatsUpdate(this.stats)
    console.log('🛑 Stopping WebSocket domain watcher...')
  }

  getStats(): WatcherStats {
    return { ...this.stats }
  }

  private async handleLog(logInfo: any) {
    try {
      const { signature, logs } = logInfo
      
      // Dedupe by signature
      if (this.seenSignatures.has(signature)) return
      this.seenSignatures.add(signature)
      
      this.stats.totalProcessed++
      this.stats.lastSignature = signature
      
      const domain = this.extractDomainFromLogs(logs)
      if (domain) {
        this.stats.domainsFound++
        
        try {
          // Get transaction details to extract domain address
          const tx = await this.connection.getTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
          })
          
          const blockTime = tx?.blockTime || Math.floor(Date.now() / 1000)
          const owner = this.extractDomainAddress(tx) || ''
          
          const domainData: DomainRegistration = {
            name: domain,
            signature: signature,
            timestamp: new Date(blockTime * 1000).toISOString(),
            blockTime: blockTime,
            fee: tx?.meta?.fee,
            owner: owner
          }

          this.onNewDomain(domainData)
        } catch (error) {
          // If RPC fails, still create domain with basic info
          console.log('RPC failed for signature:', signature, 'using fallback data')
          
          const domainData: DomainRegistration = {
            name: domain,
            signature: signature,
            timestamp: new Date().toISOString(),
            blockTime: Math.floor(Date.now() / 1000),
            fee: 0,
            owner: '' // Empty owner if RPC fails
          }

          this.onNewDomain(domainData)
        }
      }
      
      this.onStatsUpdate(this.stats)
    } catch (error) {
      console.error('Error processing log:', error)
    }
  }

  private async processSignature(sig: any) {
    try {
      this.stats.totalProcessed++
      
      const tx = await this.connection.getTransaction(sig.signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      })

      const domain = this.extractDomainFromLogs(tx?.meta?.logMessages)
      if (domain) {
        this.stats.domainsFound++
        
        // Use the actual blockchain timestamp from the signature
        const blockTime = sig.blockTime || tx?.blockTime || Math.floor(Date.now() / 1000)
        
        const domainData: DomainRegistration = {
          name: domain,
          signature: sig.signature,
          timestamp: new Date(blockTime * 1000).toISOString(),
          blockTime: blockTime,
          fee: tx?.meta?.fee,
          owner: this.extractDomainAddress(tx) || '', // Use owner instead of accounts
        }

        this.onNewDomain(domainData)
      }
    } catch (error) {
      console.error('Error processing signature:', error)
    }
  }

  private extractDomainFromLogs(logs?: string[] | null): string | null {
    if (!logs?.length) return null
    
    const patterns = [
      /Buying domain\s+([a-z0-9._-]+\.skr)/i,
      /register(?:ing)?\s+([a-z0-9._-]+\.skr)/i,
      /domain[:\s]+([a-z0-9._-]+\.skr)/i,
    ]

    const joined = logs.join('\n')
    for (const pattern of patterns) {
      const match = joined.match(pattern)
      if (match?.[1]) return match[1].toLowerCase()
    }
    
    return null
  }

  private getAccountKeys(tx: any): string[] {
    if (!tx?.transaction?.message) return []
    
    try {
      if ('getAccountKeys' in tx.transaction.message) {
        // For versioned transactions
        const keys = tx.transaction.message.getAccountKeys()
        if (Array.isArray(keys)) {
          return keys
            .filter((key: any) => key && typeof key.toBase58 === 'function')
            .map((key: any) => key.toBase58())
        } else if (keys && typeof keys.map === 'function') {
          return keys
            .filter((key: any) => key && typeof key.toBase58 === 'function')
            .map((key: any) => key.toBase58())
        } else {
          // If keys is not an array, try to convert it
          const keysArray = Array.from(keys || [])
          return keysArray
            .filter((key: any) => key && typeof key.toBase58 === 'function')
            .map((key: any) => key.toBase58())
        }
      } else if ('accountKeys' in tx.transaction.message) {
        // For legacy transactions
        const accountKeys = tx.transaction.message.accountKeys
        if (Array.isArray(accountKeys)) {
          return accountKeys
            .filter((key: any) => key && typeof key.toBase58 === 'function')
            .map((key: any) => key.toBase58())
        }
      }
    } catch (error) {
      console.error('Error getting account keys:', error)
    }
    
    return []
  }

  private extractDomainAddress(tx: any): string | null {
    if (!tx?.transaction?.message) return null
    
    try {
      // For versioned transactions, look at staticAccountKeys
      if ('staticAccountKeys' in tx.transaction.message) {
        const staticKeys = tx.transaction.message.staticAccountKeys
        if (Array.isArray(staticKeys) && staticKeys.length > 2) {
          // Based on your Dune query, owner is at index 2
          return staticKeys[2]
        }
      }
      
      // For legacy transactions, try accountKeys
      if ('accountKeys' in tx.transaction.message) {
        const accountKeys = tx.transaction.message.accountKeys
        if (Array.isArray(accountKeys) && accountKeys.length > 2) {
          return accountKeys[2]
        }
      }
      
      // Try to find the owner from the account keys array
      const accountKeys = this.getAccountKeys(tx)
      if (accountKeys.length > 2) {
        return accountKeys[2]
      }
      
      // If we can't find it at index 2, try to find it in the accounts
      for (let i = 0; i < accountKeys.length; i++) {
        const key = accountKeys[i]
        // Skip program IDs and known addresses
        if (key !== TLDH_PROGRAM_ID && key !== '11111111111111111111111111111111') {
          return key
        }
      }
    } catch (error) {
      console.error('Error extracting owner address:', error)
    }
    
    return null
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
