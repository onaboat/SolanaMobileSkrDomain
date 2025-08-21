import { NextRequest } from 'next/server'
import { WebSocketWatcher } from '../../lib/websocketWatcher'
import { prisma } from '../../lib/prisma'

let watcher: WebSocketWatcher | null = null
let connections: any[] = []

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
            // Check if domain already exists in database
            const existingDomain = await prisma.domain.findUnique({
              where: { signature: domain.signature }
            })
            
            if (!existingDomain) {
              // Add new domain to database
              const newDomain = await prisma.domain.create({
                data: {
                  signature: domain.signature,
                  name: domain.name,
                  timestamp: domain.timestamp,
                  blockTime: domain.blockTime,
                  owner: domain.owner,
                  fee: domain.fee
                }
              })
              
              console.log(`✅ New domain saved to database: ${domain.name}`)
              console.log(` Broadcasting to ${connections.length} connections`)
              
              // Broadcast new domain to all connections
              connections.forEach((conn, index) => {
                try {
                  const message = JSON.stringify({ type: 'newDomain', domain: newDomain })
                  conn.write(`data: ${message}\n\n`)
                  console.log(` Sent to connection ${index}: ${domain.name}`)
                } catch (error) {
                  console.error(`❌ Error sending to connection ${index}:`, error)
                  // Remove failed connection
                  connections.splice(index, 1)
                }
              })
            } else {
              console.log(`⚠️ Domain already exists in database: ${domain.name}`)
            }
          } catch (error) {
            // Handle unique constraint error gracefully
            if (error instanceof Error && 'code' in error && error.code === 'P2002') {
              console.log(`⚠️ Domain already exists (constraint error): ${domain.name}`)
            } else {
              console.error('Error processing new domain:', error)
            }
          }
        },
        (stats) => {
          // Broadcast stats update to all connections
          connections.forEach((conn, index) => {
            try {
              conn.write(`data: ${JSON.stringify({ type: 'stats', stats })}\n\n`)
            } catch (error) {
              console.error('Error sending stats to connection:', error)
              // Remove failed connection
              connections.splice(index, 1)
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
          try {
            controller.enqueue(new TextEncoder().encode(data))
          } catch (error) {
            console.error('Error writing to controller:', error)
          }
        }
      }
      
      connections.push(connection)
      console.log(` New SSE connection established. Total connections: ${connections.length}`)
      
      // Send initial stats
      const stats = watcher ? watcher.getStats() : { totalProcessed: 0, domainsFound: 0, isConnected: false }
      connection.write(`data: ${JSON.stringify({ type: 'stats', stats })}\n\n`)

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        connections = connections.filter(conn => conn !== connection)
        console.log(`🔌 SSE connection closed. Remaining connections: ${connections.length}`)
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
