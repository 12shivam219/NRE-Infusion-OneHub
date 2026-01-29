#!/bin/bash

# NRE Infusion - Production Startup Script
# Handles Redis, Database, and App initialization

set -e

echo "🚀 Starting NRE Infusion OneHub..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# ============================================
# 1. Check Redis
# ============================================
echo -e "${BLUE}[1/5] Checking Redis...${NC}"
if ! redis-cli PING > /dev/null 2>&1; then
  echo -e "${RED}❌ Redis not running${NC}"
  echo "Start Redis with: redis-server"
  exit 1
fi
echo -e "${GREEN}✅ Redis connected${NC}"

# ============================================
# 2. Check Database Connection
# ============================================
echo -e "${BLUE}[2/5] Checking Database...${NC}"
if [ -z "$DATABASE_URL" ] && [ -z "$SUPABASE_URL" ]; then
  echo -e "${RED}❌ Database URL not configured${NC}"
  echo "Set SUPABASE_URL and SUPABASE_ANON_KEY in .env"
  exit 1
fi
echo -e "${GREEN}✅ Database URL configured${NC}"

# ============================================
# 3. Check PgBouncer (optional)
# ============================================
if [ -n "$PGBOUNCER_URL" ]; then
  echo -e "${BLUE}[3/5] Checking PgBouncer...${NC}"
  if nc -z localhost 6432 2>/dev/null; then
    echo -e "${GREEN}✅ PgBouncer available${NC}"
  else
    echo -e "${YELLOW}⚠️  PgBouncer not running${NC}"
  fi
else
  echo -e "${BLUE}[3/5] PgBouncer not configured (optional)${NC}"
fi

# ============================================
# 4. Install dependencies
# ============================================
echo -e "${BLUE}[4/5] Installing dependencies...${NC}"
if ! npm install --production > /dev/null 2>&1; then
  echo -e "${RED}❌ npm install failed${NC}"
  exit 1
fi
cd email-server && npm install --production > /dev/null 2>&1 && cd ..
echo -e "${GREEN}✅ Dependencies installed${NC}"

# ============================================
# 5. Start services
# ============================================
echo -e "${BLUE}[5/5] Starting services...${NC}"

# Start in background
NODE_ENV=production npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"

cd email-server
NODE_ENV=production npm run dev &
EMAIL_PID=$!
echo -e "${GREEN}✅ Email server started (PID: $EMAIL_PID)${NC}"

NODE_ENV=production npm run dev:worker &
WORKER_PID=$!
echo -e "${GREEN}✅ Email worker started (PID: $WORKER_PID)${NC}"
cd ..

# ============================================
# Final Status
# ============================================
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ NRE Infusion Ready!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "Services running:"
echo "  • Frontend: http://localhost:5173"
echo "  • Backend: http://localhost:3000"
echo "  • Email Server: http://localhost:3001"
echo "  • Redis: localhost:6379"
echo ""
echo "Process IDs:"
echo "  • Frontend: $FRONTEND_PID"
echo "  • Email Server: $EMAIL_PID"
echo "  • Email Worker: $WORKER_PID"
echo ""
echo "Stop with: kill $FRONTEND_PID $EMAIL_PID $WORKER_PID"
echo ""

# Keep script running
wait
