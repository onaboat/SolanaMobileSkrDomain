import { Connection, PublicKey } from '@solana/web3.js'

const TLDH_PROGRAM_ID = 'TLDHkysf5pCnKsVA4gXpNvmy7psXLPEu4LAdDJthT9S'

export class DomainWatcher {
  private connection: Connection
  private isRunning = false
  private lastSignature: string | null = null
  private onNewDomain: (domain: any) => void

  constructor(rpcUrl: string, onNewDomain: (domain: any) => void) {
    this.connection = new Connection(rpcUrl, { commitment: 'confirmed' })
    this.onNewDomain = onNewDomain
  }

  async start() {
    if (this.isRunning) return
    
    this.isRunning = true
    console.log('🔌 Starting SKR domain watcher...')
    
    // Get initial signature
    const signatures = await this.connection.getSignaturesForAddress(
      new PublicKey(TLDH_PROGRAM_ID),
      { limit: 1 },
      'confirmed'
    )
    
    if (signatures.length > 0) {
      this.lastSignature = signatures[0].signature
    }

    this.poll()
  }

  stop() {
    this.isRunning = false
    console.log('🛑 Stopping SKR domain watcher...')
  }

  private async poll() {
    while (this.isRunning) {
      try {
        const signatures = await this.connection.getSignaturesForAddress(
          new PublicKey(TLDH_PROGRAM_ID),
          { limit: 50 },
          'confirmed'
        )

        if (signatures.length === 0) {
          await this.sleep(15000) // 15 second delay
          continue
        }

        // Find new signatures
        let newSignatures = signatures
        if (this.lastSignature) {
          const lastIndex = signatures.findIndex(s => s.signature === this.lastSignature)
          if (lastIndex >= 0) {
            newSignatures = signatures.slice(0, lastIndex)
          }
        }

        // Process new signatures in reverse order (oldest first)
        for (const sig of newSignatures.reverse()) {
          await this.processSignature(sig)
          await this.sleep(100) // Small delay between processing
        }

        // Update last signature
        if (signatures.length > 0) {
          this.lastSignature = signatures[0].signature
        }

        await this.sleep(15000) // 15 second polling interval
      } catch (error) {
        console.error('❌ Polling error:', error)
        await this.sleep(5000)
      }
    }
  }

  private async processSignature(sig: any) {
    try {
      const tx = await this.connection.getTransaction(sig.signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      })

      const domain = this.extractDomainFromLogs(tx?.meta?.logMessages)
      if (domain) {
        const domainData = {
          name: domain,
          signature: sig.signature,
          timestamp: new Date().toISOString(),
          blockTime: sig.blockTime,
          fee: tx?.meta?.fee,
          accounts: undefined
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

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
