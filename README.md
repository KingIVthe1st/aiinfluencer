# AI Influencer

Create and manage AI-generated influencer personas. Generate images, content, and videos featuring your custom AI influencers.

## Features

- **AI Persona Creation**: Create unique AI influencer personas with custom appearances
- **Image Generation**: Generate high-quality images featuring your AI influencers
- **Video Content**: Create engaging video content with your AI influencers
- **Content Gallery**: Manage and organize all your generated content
- **Voice Customization**: Customize voices for your AI influencers

## Tech Stack

- **Frontend**: Next.js 15, React 18, TailwindCSS
- **Backend**: Cloudflare Workers, Hono
- **Database**: Cloudflare D1 (SQLite), Drizzle ORM
- **Storage**: Cloudflare R2
- **Queue**: Cloudflare Queues
- **AI Providers**: Gemini, ElevenLabs, OpenAI, Kie.ai

## Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account with Workers, D1, R2, and Queues access
- API keys for: Gemini, ElevenLabs, OpenAI (optional), Kie.ai

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd ai-influencer

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install
```

### 2. Create Cloudflare Resources

```bash
# Create D1 Database
wrangler d1 create ai-influencer-db

# Create R2 Buckets
wrangler r2 bucket create ai-influencer-assets
wrangler r2 bucket create ai-influencer-video-assets

# Create KV Namespaces
wrangler kv:namespace create VIDEO_HISTORY
wrangler kv:namespace create SESSIONS
wrangler kv:namespace create CACHE

# Create Queue
wrangler queues create ai-influencer-jobs
```

### 3. Update Configuration

Update `wrangler.toml` with the IDs from step 2:
- `database_id` for D1
- `id` for each KV namespace

### 4. Set Secrets

```bash
wrangler secret put GEMINI_API_KEY
wrangler secret put ELEVENLABS_API_KEY
wrangler secret put KIE_API_KEY
# Add other secrets as needed
```

### 5. Run Migrations

```bash
npm run db:migrate
```

### 6. Development

```bash
# Terminal 1: Backend
npm run dev:worker

# Terminal 2: Frontend
cd frontend && npm run dev
```

### 7. Deploy

```bash
# Deploy backend
npm run deploy:worker

# Deploy frontend
cd frontend && npm run pages:build
# Deploy via Cloudflare Pages
```

## Environment Variables

### Backend (wrangler secrets)

- `GEMINI_API_KEY` - Google Gemini API key
- `ELEVENLABS_API_KEY` - ElevenLabs API key
- `OPENAI_API_KEY` - OpenAI API key (optional)
- `KIE_API_KEY` - Kie.ai API key for video generation
- `CLERK_SECRET_KEY` - Clerk authentication secret

### Frontend (.env)

- `NEXT_PUBLIC_API_URL` - Backend API URL

## Project Structure

```
ai-influencer/
├── src/                    # Backend source code
│   ├── api/               # API routes
│   ├── db/                # Database schema
│   ├── lib/               # Utilities
│   ├── middleware/        # Auth, DB middleware
│   ├── providers/         # AI provider adapters
│   └── services/          # Business logic
├── frontend/              # Next.js frontend
│   ├── app/              # App router pages
│   ├── components/       # React components
│   └── lib/              # Frontend utilities
├── migrations/            # D1 migrations
└── wrangler.toml         # Cloudflare config
```

## License

Private - All rights reserved
