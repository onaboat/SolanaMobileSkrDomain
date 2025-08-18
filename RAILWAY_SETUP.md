# Railway Deployment Setup

## Environment Variables

Set these in your Railway project dashboard:

### Required:
- `HELIUS_RPC` - Your Helius RPC endpoint for WebSocket monitoring
  - Example: `https://your-helius-endpoint.com`

### Optional:
- `BACKFILL_RPC` - RPC for backfill operations (defaults to free Solana RPC)
  - Example: `https://api.mainnet-beta.solana.com`

### Next.js:
- `NODE_ENV` - Set to `production`

## Deployment Steps

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Setup for Railway deployment"
   git push origin main
   ```

2. **Connect to Railway:**
   - Go to [Railway Dashboard](https://railway.app/dashboard)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Set Environment Variables:**
   - In Railway dashboard, go to your project
   - Click "Variables" tab
   - Add the required environment variables above

4. **Deploy:**
   - Railway will automatically detect Next.js and deploy
   - WebSocket will start monitoring for new domains

## Architecture

- **Frontend:** Next.js app with domain cards
- **WebSocket:** Real-time domain monitoring via Helius
- **Backfill:** Historical data via free Solana RPC
- **Data Storage:** Local JSON file (can be upgraded to database later)

## Monitoring

- Check Railway logs for WebSocket connection status
- Monitor domain detection in real-time
- Use Railway's built-in observability tools
