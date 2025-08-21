# SKR Domain Watcher

An interactive dashboard for exploring .skr domain registrations on Solana, featuring real-time updates, search functionality, and detailed domain ownership tracking with visual analytics.

## Features

- 🔍 **Real-time monitoring** of .skr domain registrations
- 🖥️ **Authentic terminal interface** with command-line interaction
- 📊 **SETI-style searching animations** with progress bars and scanning effects
- 💾 **Local data storage** with incremental backfill capability
- ⚙️ **Admin backfill scripts** for historical data collection
- 🔗 **Transaction links** to Solscan

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```env
HELIUS_RPC=https://your-helius-rpc-endpoint.com
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Admin Backfill Commands

The backfill system is designed for administrators to populate the database with historical domain data. Users cannot run backfill commands from the web interface.

### Initial Data Population

Run a full backfill to populate the database with historical domains:

```bash
# Full backfill (recommended for first run)
HELIUS_RPC="your-rpc-url" npm run backfill:full 1000

# Or with environment variable set
npm run backfill:full 1000
```

### Incremental Updates

For daily updates, use incremental backfill:

```bash
# Incremental backfill (only new transactions since last run)
npm run backfill:incremental 100
```

### Check Status

View current backfill status:

```bash
npm run backfill:status
```

### Backfill Scripts

- `npm run backfill:full [limit]` - Full backfill (processes all transactions)
- `npm run backfill:incremental [limit]` - Incremental backfill (only new transactions)
- `npm run backfill:status` - Show current status and statistics

## User Interface

### Available Commands

- `help` - Show available commands
- `start` - Start watching for new domain registrations
- `stop` - Stop the watcher
- `status` - Show current status and statistics
- `domains` - List registered domains
- `clear` - Clear terminal output

### SETI-Style Animations

When the watcher is active, users see:
- **Progress bars** with scanning effects
- **Grid animations** simulating data processing
- **Status indicators** showing connection and processing state
- **Real-time statistics** in the status bar

## Architecture

- **Frontend**: Next.js with TypeScript and authentic terminal styling
- **Backend**: Next.js API routes for data persistence
- **Blockchain**: Helius RPC for Solana network access
- **Storage**: JSON file-based storage with state tracking
- **Backfill**: Standalone CLI scripts for data population

## Data Management

### File Structure

```
data/
├── domains.json          # Domain registrations
└── backfill-state.json   # Backfill progress tracking
```

### State Tracking

The backfill system tracks:
- Last processed transaction signature
- Last block hash
- Total domains found
- Last run timestamp

This enables incremental updates without reprocessing existing data.

## Monitoring

The app monitors the TLDH program (`TLDHkysf5pCnKsVA4gXpNvmy7psXLPEu4LAdDJthT9S`) for domain registration transactions and extracts .skr domain names from program logs.

## Future Features

- **Domain search** - Search for specific domains
- **Wallet linking** - Link domains to wallet addresses
- **SOL sending** - Send SOL to domain owners
- **WebSocket real-time updates** - Live domain registration notifications

## License

MIT
