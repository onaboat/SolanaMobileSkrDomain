import { Connection, PublicKey } from '@solana/web3.js'

const TLDH_PROGRAM_ID = 'TLDHkysf5pCnKsVA4gXpNvmy7psXLPEu4LAdDJthT9S'

export interface DomainRegistration {
  name: string
  signature: string
  timestamp: string
  blockTime?: number
  fee?: number
  accounts?: string[]
}

export class DomainBackfill {
  private connection: Connection

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, { commitment: 'confirmed' })
  }

  async backfillDomains(limit: number = 1000): Promise<DomainRegistration[]> {
    console.log(`🔍 Fetching last ${limit} transactions from TLDH program...`)
    
    try {
      // Get signatures for the TLDH program
      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(TLDH_PROGRAM_ID),
        { limit },
        'confirmed'
      )

      console.log(`📝 Found ${signatures.length} signatures, processing transactions...`)

      const domains: DomainRegistration[] = []
      let processed = 0

      // Process signatures in batches to avoid rate limits
      const batchSize = 10
      for (let i = 0; i < signatures.length; i += batchSize) {
        const batch = signatures.slice(i, i + batchSize)
        
        const promises = batch.map(async (sig) => {
          try {
            const tx = await this.connection.getTransaction(sig.signature, {
              commitment: 'confirmed',
              maxSupportedTransactionVersion: 0,
            })

            const domain = this.extractDomainFromLogs(tx?.meta?.logMessages)
            if (domain) {
              return {
                name: domain,
                signature: sig.signature,
                timestamp: new Date((sig.blockTime || Date.now() / 1000) * 1000).toISOString(),
                blockTime: sig.blockTime,
                fee: tx?.meta?.fee,
                accounts: tx?.transaction?.message?.accountKeys?.map((key: any) => key.toBase58())
              }
            }
            return null
          } catch (error) {
            console.error(`Error processing signature ${sig.signature}:`, error)
            return null
          }
        })

        const results = await Promise.all(promises)
        const validDomains = results.filter(Boolean) as DomainRegistration[]
        domains.push(...validDomains)

        processed += batch.length
        console.log(`✅ Processed ${processed}/${signatures.length} transactions, found ${domains.length} domains`)

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      console.log(`🎉 Backfill complete! Found ${domains.length} domain registrations`)
      return domains

    } catch (error) {
      console.error('❌ Error during backfill:', error)
      throw error
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
}
