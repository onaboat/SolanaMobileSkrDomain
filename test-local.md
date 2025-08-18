# Local Testing Guide

## 🧪 **Testing Steps:**

### 1. **Start the Development Server:**
```bash
npm run dev
```

### 2. **Test Health Check:**
- Visit: `http://localhost:3000/api/health`
- Should return: `{"status":"healthy","timestamp":"...","service":"skr-domain-watcher","version":"1.0.0"}`

### 3. **Test Domains API:**
- Visit: `http://localhost:3000/api/domains`
- Should return: `{"domains":[]}` (empty array since we cleared the data)

### 4. **Test WebSocket Start:**
- Visit: `http://localhost:3000/api/websocket?action=start`
- Should return: `{"success":true,"message":"Watcher started"}`
- Check console for: `🔗 Using RPC: Default Solana RPC`

### 5. **Test WebSocket Status:**
- Visit: `http://localhost:3000/api/websocket?action=status`
- Should return: `{"isRunning":true,"stats":{"totalProcessed":0,"domainsFound":0,"isConnected":true}}`

### 6. **Test Main Page:**
- Visit: `http://localhost:3000`
- Should show empty domain list with "NO DOMAINS REGISTERED YET"
- Status should show "CONNECTED" if WebSocket is running

### 7. **Test Real-time Updates:**
- Keep the page open
- Wait for new domain registrations (may take a while)
- New domains should appear with flash animation

## 🔧 **Troubleshooting:**

### If WebSocket doesn't start:
- Check browser console for errors
- Check terminal for connection logs
- Default Solana RPC may have rate limits

### If no domains appear:
- This is normal - domains are only registered occasionally
- You can run backfill to get historical data:
  ```bash
  npm run backfill:full 10
  ```

### If you want to test with Helius RPC:
- Create `.env.local` file:
  ```
  HELIUS_RPC=https://your-helius-endpoint.com
  ```
- Restart the dev server

## ✅ **Success Indicators:**
- Health check returns 200
- WebSocket starts without errors
- Main page loads with "CONNECTED" status
- No console errors
- Ready for Railway deployment!
