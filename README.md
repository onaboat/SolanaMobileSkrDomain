# Solana Mobile SKR Domain Watcher

An interactive dashboard for exploring .skr domain registrations on Solana, featuring real-time updates, search functionality, and detailed domain ownership tracking with visual analytics.

## Features

- 🔍 **Real-time monitoring** of .skr domain registrations via WebSocket
- 📊 **Interactive analytics** with growth charts and regional statistics
- 🔍 **Advanced search** and filtering capabilities
- 📱 **Responsive design** optimized for mobile and desktop
- 🔗 **Transaction links** to Solscan for verification
- 📈 **Historical data** with time-based filtering (1d, 7d, 30d, all time)
- 💾 **Database persistence** with Prisma ORM
- ⚡ **Real-time updates** with Server-Sent Events (SSE)

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (via Railway)
- **Blockchain**: Helius RPC for Solana network access
- **Real-time**: WebSocket monitoring and Server-Sent Events
- **Deployment**: Railway with automatic deployments

## Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Helius RPC endpoint
- PostgreSQL database (optional for local development)

### Local Development

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd SolanaMobileSkrDomain
npm install
```

2. **Set up environment variables:**
```bash
# Create .env.local file
cp .env.example .env.local
```

Add your configuration:
```env
HELIUS_RPC=https://your-helius-rpc-endpoint.com
DATABASE_URL=postgresql://user:password@localhost:5432/skr_domains
NODE_ENV=development
```

3. **Set up database (optional for local development):**
```bash
# Install Prisma CLI
npm install -g prisma

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (if needed)
npx prisma db seed
```

4. **Start development server:**
```bash
npm run dev
```

5. **Open [http://localhost:3000](http://localhost:3000)**

### Production Deployment

See [RAILWAY_SETUP.md](./RAILWAY_SETUP.md) for detailed deployment instructions on Railway.

## Usage

### Dashboard Features

- **Real-time Monitoring**: Watch live domain registrations as they happen
- **Search & Filter**: Find specific domains or filter by time ranges
- **Analytics View**: Interactive charts showing domain growth trends
- **Regional Statistics**: Geographic distribution of domain registrations
- **Transaction Details**: Click any domain to view Solscan transaction details

### Time Range Filtering

- **1 Day**: Recent registrations from the last 24 hours
- **7 Days**: Weekly domain registration trends
- **30 Days**: Monthly growth patterns
- **All Time**: Complete historical data

## Admin Backfill Commands

The backfill system populates the database with historical domain data from the Solana blockchain.

### Initial Data Population

```bash
# Full backfill (recommended for first run)
npm run backfill:full 1000

# Or with custom RPC
HELIUS_RPC="your-rpc-url" npm run backfill:full 1000
```

### Incremental Updates

```bash
# Daily incremental updates
npm run backfill:incremental 100
```

### Status Monitoring

```bash
# Check backfill progress
npm run backfill:status
```

### Available Scripts

- `npm run backfill:full [limit]` - Process all historical transactions
- `npm run backfill:incremental [limit]` - Process only new transactions
- `npm run backfill:status` - Show current status and statistics

## Architecture

### Frontend Components

- **FilterPresets**: Time range selection and filtering
- **GrowthChart**: Interactive domain growth visualization
- **RegionalCards**: Geographic distribution statistics
- **Real-time Updates**: Server-Sent Events for live data

### Backend Services

- **API Routes**: RESTful endpoints for domain data
- **WebSocket Monitoring**: Real-time blockchain monitoring
- **Database Layer**: Prisma ORM with PostgreSQL
- **Data Processing**: Transaction parsing and domain extraction

### Data Flow

1. **WebSocket Connection**: Monitors TLDH program transactions
2. **Transaction Processing**: Extracts .skr domain registrations
3. **Database Storage**: Persists domain data with ownership info
4. **Real-time Updates**: Pushes new data to connected clients
5. **Analytics**: Generates charts and statistics from stored data

## Database Schema

The application uses Prisma with the following main entities:

- **DomainRegistration**: Domain name, owner, timestamp, transaction signature
- **BackfillState**: Tracks backfill progress and last processed transactions

## Monitoring

The app monitors the TLDH program (`TLDHkysf5pCnKsVA4gXpNvmy7psXLPEu4LAdDJthT9S`) for domain registration transactions and extracts .skr domain names from program logs.

### Health Checks

- **API Health**: `/api/health` - Application status
- **Database Health**: `/api/test-db` - Database connectivity
- **WebSocket Status**: Real-time connection monitoring

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### Database Management

```bash
npx prisma generate  # Generate Prisma client
npx prisma migrate   # Run database migrations
npx prisma studio    # Open database GUI
npx prisma db push   # Push schema changes
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Future Features

- **Domain Analytics**: Advanced metrics and insights
- **Wallet Integration**: Direct wallet connections
- **Notification System**: Email/SMS alerts for new registrations
- **API Access**: Public API for third-party integrations
- **Mobile App**: Native mobile application
- **Domain Marketplace**: Secondary market for .skr domains

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Check the [Railway Setup Guide](./RAILWAY_SETUP.md)
- Review the [test-local.md](./test-local.md) for local testing
