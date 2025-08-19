import { NextRequest } from 'next/server'
import { WebSocketWatcher } from '../../lib/websocketWatcher'
import { promises as fs } from 'fs'
import path from 'path'

const DOMAINS_FILE = path.join(process.cwd(), 'data', 'domains.json')

let watcher: WebSocketWatcher | null = null
let connections: any[] = []

// Function to save domains to file
async function saveDomainsToFile(domains: any[]) {
  try {
    await fs.mkdir(path.dirname(DOMAINS_FILE), { recursive: true })
    await fs.writeFile(DOMAINS_FILE, JSON.stringify(domains, null, 2))
  } catch (error) {
    console.error('Error saving domains to file:', error)
  }
}

// Function to load existing domains
async function loadDomainsFromFile() {
  try {
    const data = await fs.readFile(DOMAINS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    return []
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'start') {
    const rpcUrl = process.env.HELIUS_RPC || 'https://api.mainnet-beta.solana.com'
    console.log(`🔗 Using RPC: ${rpcUrl === 'https://api.mainnet-beta.solana.com' ? 'Default Solana RPC' : 'Helius RPC'}`)

    if (!watcher) {
      watcher = new WebSocketWatcher(
        rpcUrl,
        async (domain) => {
          try {
            // Load existing domains
            const existingDomains = await loadDomainsFromFile()
            
            // Check if domain already exists
            const domainExists = existingDomains.some((d: any) => d.signature === domain.signature)
            
            if (!domainExists) {
              // Add new domain to the beginning of the array
              const updatedDomains = [domain, ...existingDomains]
              
              // Save updated domains to file
              await saveDomainsToFile(updatedDomains)
              
              console.log(`✅ New domain saved: ${domain.name}`)
              
              // Broadcast new domain to all connections (ONLY if it's actually new)
              connections.forEach(conn => {
                try {
                  conn.write(`data: ${JSON.stringify({ type: 'newDomain', domain })}\n\n`)
                } catch (error) {
                  console.error('Error sending to connection:', error)
                }
              })
            }
            
            // Broadcast stats update to all connections
            connections.forEach(conn => {
              try {
                conn.write(`data: ${JSON.stringify({ type: 'stats', stats })}\n\n`)
              } catch (error) {
                console.error('Error sending stats to connection:', error)
              }
            })
          } catch (error) {
            console.error('Error processing new domain:', error)
          }
        },
        (stats) => {
          // Broadcast stats update to all connections
          connections.forEach(conn => {
            try {
              conn.write(`data: ${JSON.stringify({ type: 'stats', stats })}\n\n`)
            } catch (error) {
              console.error('Error sending stats to connection:', error)
            }
          })
        }
      )
    }

    await watcher.start()
    return new Response(JSON.stringify({ success: true, message: 'Watcher started' }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (action === 'stop') {
    if (watcher) {
      watcher.stop()
      watcher = null
    }
    return new Response(JSON.stringify({ success: true, message: 'Watcher stopped' }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (action === 'status') {
    const stats = watcher ? watcher.getStats() : null
    return new Response(JSON.stringify({ 
      isRunning: !!watcher,
      stats: stats || { totalProcessed: 0, domainsFound: 0, isConnected: false }
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // SSE endpoint for real-time updates
  const stream = new ReadableStream({
    start(controller) {
      const connection = {
        write: (data: string) => {
          controller.enqueue(new TextEncoder().encode(data))
        }
      }
      
      connections.push(connection)
      
      // Send initial stats
      const stats = watcher ? watcher.getStats() : { totalProcessed: 0, domainsFound: 0, isConnected: false }
      connection.write(`data: ${JSON.stringify({ type: 'stats', stats })}\n\n`)

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        connections = connections.filter(conn => conn !== connection)
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  })
}
