export interface DomainRegistration {
  name: string
  signature: string
  timestamp: string
  blockTime?: number
  owner: string // Domain owner wallet address
  fee?: number
}

export interface WatcherConfig {
  pollInterval: number
  rpcUrl: string
  programId: string
}
