# Email Server Architecture - Separate Worker Process

## Overview

The email server now runs as **two separate Node.js processes**:

1. **Express API Server** (`server.js`) - Handles HTTP requests and queues email campaigns
2. **Email Worker** (`worker.js`) - Processes queued emails in a separate process

This architecture prevents CPU-intensive email sending from blocking API responses during high load.

## Benefits

✅ **API Responsiveness** - HTTP requests are not blocked by email processing  
✅ **Resource Isolation** - Worker can be scaled independently  
✅ **Fault Tolerance** - Worker crash doesn't affect API server  
✅ **Better Performance** - Multi-core CPU utilization with separate processes  
✅ **Production Ready** - Recommended architecture for high-volume operations  

## Local Development

### Running Both Processes

**Option 1: Two Terminal Windows**

Terminal 1 - API Server:
```bash
npm start
```

Terminal 2 - Email Worker:
```bash
npm run start:worker
```

**Option 2: Single Command (requires `concurrently`)**

First, install concurrently:
```bash
npm install --save-dev concurrently
```

Then run both processes:
```bash
npm run start:all
```

**Option 3: Development with File Watching**

Terminal 1:
```bash
npm run dev
```

Terminal 2:
```bash
npm run dev:worker
```

Or both with file watching:
```bash
npm run dev:all
```

## Production Deployment

### Using PM2 (Recommended)

1. Install PM2 globally:
```bash
npm install -g pm2
```

2. Create an `ecosystem.config.js` file in the email-server directory:
```javascript
module.exports = {
  apps: [
    {
      name: 'email-api',
      script: './server.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'email-worker',
      script: './worker.js',
      instances: 1,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

3. Start both processes:
```bash
pm2 start ecosystem.config.js
```

4. View logs:
```bash
pm2 logs email-api
pm2 logs email-worker
pm2 logs
```

5. Monitor:
```bash
pm2 monit
```

### Using Docker

Example Dockerfile setup for production:

```dockerfile
# Base image
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY email-server/ ./

# Expose API port
EXPOSE 3001

# Run API server
CMD ["node", "server.js"]
```

For the worker, create a separate container:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY email-server/ ./

# Run worker
CMD ["node", "worker.js"]
```

### Using Docker Compose

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  email-api:
    build:
      context: .
      dockerfile: Dockerfile.api
    depends_on:
      - redis
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - EMAIL_USER=${EMAIL_USER}
      - EMAIL_PASSWORD=${EMAIL_PASSWORD}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
      - API_KEY=${API_KEY}

  email-worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    depends_on:
      - redis
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - EMAIL_USER=${EMAIL_USER}
      - EMAIL_PASSWORD=${EMAIL_PASSWORD}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}

volumes:
  redis_data:
```

## Process Communication

Both processes communicate through:

- **Redis Queue** (BullMQ) - Email jobs are queued and dequeued
- **Supabase Database** - Campaign status is persisted

### Data Flow

```
Client Request
    ↓
API Server (server.js)
    ├─ Validates request
    ├─ Adds job to Redis queue
    └─ Returns campaign ID to client
         ↓
       Redis Queue (bulk-email-queue)
         ↓
    Email Worker (worker.js)
    ├─ Polls queue for jobs
    ├─ Processes emails
    └─ Updates campaign status in Supabase
         ↓
    Client polls campaign status via API
```

## Monitoring

### Check Process Status

**With PM2:**
```bash
pm2 status
pm2 logs email-api
pm2 logs email-worker
```

**With Docker:**
```bash
docker ps -a
docker logs <container_id>
```

### Health Check

API Server health:
```bash
curl http://localhost:3001/health
```

### Queue Status

Check Redis queue length:
```bash
redis-cli LLEN bull:bulk-email-queue:wait
```

## Scaling the Worker

You can run multiple worker instances for higher throughput:

**With PM2:**
```javascript
// In ecosystem.config.js
{
  name: 'email-worker',
  script: './worker.js',
  instances: 4,  // Run 4 worker instances
  exec_mode: 'cluster'
}
```

**With Docker Compose:**
```yaml
email-worker:
  # ...
  deploy:
    replicas: 4
```

## Environment Variables

Ensure these are set before running:

```env
# Redis
REDIS_URL=redis://localhost:6379

# Email Configuration
EMAIL_ACCOUNTS=account1@gmail.com:encrypted_password1;account2@gmail.com:encrypted_password2
EMAIL_USER=default@gmail.com
EMAIL_PASSWORD=encrypted_password

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# API
API_KEY=your-api-key
EMAIL_SERVER_PORT=3001
NODE_ENV=production
```

## Troubleshooting

### Worker not processing jobs

1. Check Redis connection:
```bash
redis-cli ping
```

2. Verify worker is running:
```bash
ps aux | grep worker.js
```

3. Check logs:
```bash
pm2 logs email-worker
```

### API server not responding

1. Verify API server is running:
```bash
curl http://localhost:3001/health
```

2. Check port conflicts:
```bash
lsof -i :3001
```

### Jobs stuck in queue

1. Clear stuck jobs:
```bash
redis-cli DEL "bull:bulk-email-queue:*"
```

2. Restart worker:
```bash
pm2 restart email-worker
```

## Migration from Old Architecture

If upgrading from the in-process worker:

1. Stop the old server: `Ctrl+C`
2. Create the new `worker.js` file (already done)
3. Update `server.js` (already done)
4. Start API server: `npm start`
5. Start worker in new terminal: `npm run start:worker`

## Security Notes

- Both processes should run in isolated environments
- Use strong API keys for inter-service communication
- Keep Redis protected (use password, firewall rules)
- Rotate email account credentials regularly
- Monitor resource usage on worker process
- Use HTTPS for production API endpoints
