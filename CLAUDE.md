# AI Influencer - Project Instructions

## Project Overview

AI Influencer is a full-stack platform for creating and managing AI-generated influencer personas. Users can:
- Create custom AI influencer personas with unique appearances
- Generate images and content featuring their AI influencers
- Create videos with their AI influencers
- Manage a gallery of generated content

## Architecture

- **Frontend**: Next.js 15 deployed on Cloudflare Pages
- **Backend**: Cloudflare Workers with Hono framework
- **Database**: Cloudflare D1 (SQLite) with Drizzle ORM
- **Storage**: Cloudflare R2 for assets and videos
- **Queue**: Cloudflare Queues for async job processing
- **Auth**: Clerk for authentication

## CRITICAL: This is a SEPARATE Project

This project is completely independent from ai-singer-studio. Do NOT:
- Deploy to any ai-singer-studio infrastructure
- Use ai-singer-studio database IDs, KV namespace IDs, or bucket names
- Reference ai-singer-studio URLs in code

## Setup Checklist

Before deploying, you MUST create NEW Cloudflare resources:

```bash
# 1. Create D1 Database
wrangler d1 create ai-influencer-db
# Copy the database_id to wrangler.toml

# 2. Create R2 Buckets
wrangler r2 bucket create ai-influencer-assets
wrangler r2 bucket create ai-influencer-video-assets

# 3. Create KV Namespaces
wrangler kv:namespace create VIDEO_HISTORY
wrangler kv:namespace create SESSIONS
wrangler kv:namespace create CACHE
# Copy all IDs to wrangler.toml

# 4. Create Queue
wrangler queues create ai-influencer-jobs

# 5. Set secrets
wrangler secret put GEMINI_API_KEY
wrangler secret put ELEVENLABS_API_KEY
wrangler secret put OPENAI_API_KEY
wrangler secret put KIE_API_KEY
wrangler secret put CLERK_SECRET_KEY
# etc.

# 6. Run database migrations
npm run db:migrate
```

## Key Files

- `wrangler.toml` - Cloudflare Worker configuration (UPDATE IDs HERE)
- `frontend/.env` - Frontend API URL (UPDATE after deployment)
- `src/index.ts` - Main backend entry point
- `frontend/lib/api-client.ts` - Frontend API client

## Development

```bash
# Backend
cd video-gen-platform
npm install
npm run dev:worker

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Deployment

```bash
# Deploy backend
npm run deploy:worker

# Deploy frontend
cd frontend
npm run pages:build
# Then deploy via Cloudflare Pages dashboard or CLI
```

## Terminology Updates Needed

This codebase was adapted from a music-focused project. You may need to update:
- "Singer" → "Influencer" in UI text
- "Song" → "Content" or "Post"
- "Music video" → "Video content"

The database schema and API use generic terms that work for both use cases.
