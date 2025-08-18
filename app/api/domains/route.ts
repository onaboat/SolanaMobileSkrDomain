import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const DOMAINS_FILE = path.join(process.cwd(), 'data', 'domains.json')

export async function GET() {
  try {
    await fs.mkdir(path.dirname(DOMAINS_FILE), { recursive: true })
    
    try {
      const data = await fs.readFile(DOMAINS_FILE, 'utf-8')
      const domains = JSON.parse(data)
      return NextResponse.json({ domains })
    } catch {
      // File doesn't exist, return empty array
      return NextResponse.json({ domains: [] })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load domains' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { domain } = body

    await fs.mkdir(path.dirname(DOMAINS_FILE), { recursive: true })
    
    // Read existing domains
    let domains = []
    try {
      const data = await fs.readFile(DOMAINS_FILE, 'utf-8')
      domains = JSON.parse(data)
    } catch {
      // File doesn't exist, start with empty array
    }

    // Add new domain
    domains.unshift(domain)

    // Keep only last 1000 domains
    domains = domains.slice(0, 1000)

    // Write back to file
    await fs.writeFile(DOMAINS_FILE, JSON.stringify(domains, null, 2))

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save domain' }, { status: 500 })
  }
}
