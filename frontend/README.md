# AI Singer Studio - Frontend

Complete Next.js frontend for AI Singer Studio with integrated song selector and music video generation.

## Features

- **Video Generation** - Create AI videos with Veo 3 or Sora 2
- **Singer Selection** - Choose from available virtual singers
- **Song Selector** - Select songs for music videos (appears after singer selection)
- **Music Video Creation** - Generate videos with synchronized audio
- **Beautiful UI** - Modern, responsive design with Tailwind CSS

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Beautiful icons
- **Cloudflare Pages** - Deployment platform

## Getting Started

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment

Create `.env.local` or use the existing `.env`:

```bash
NEXT_PUBLIC_API_URL=https://ai-singer-studio-production.ivanleejackson.workers.dev
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Deployment to Cloudflare Pages

### Option 1: Direct Deploy (Fastest)

```bash
# Build the project
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy out --project-name=ai-singer-studio-frontend --commit-dirty=true
```

### Option 2: Git Integration (Recommended for Production)

1. **Initialize Git (if not already done)**
   ```bash
   git init
   git add .
   git commit -m "feat: Complete frontend with song selector"
   ```

2. **Push to GitHub**
   ```bash
   # Create a new repository on GitHub
   # Then push:
   git remote add origin YOUR_GITHUB_REPO_URL
   git branch -M main
   git push -u origin main
   ```

3. **Connect to Cloudflare Pages**
   - Go to Cloudflare Dashboard: https://dash.cloudflare.com
   - Navigate to Workers & Pages
   - Click "Create application" → "Pages" → "Connect to Git"
   - Select your repository
   - Configure build settings:
     - **Build command**: `npm run build`
     - **Build output directory**: `out`
     - **Environment variables**: Add `NEXT_PUBLIC_API_URL`

4. **Deploy**
   - Cloudflare Pages will auto-deploy on every push to main

## Project Structure

```
frontend/
├── app/                          # Next.js App Router
│   ├── generate/
│   │   └── video/
│   │       └── page.tsx         # Video generation page with song selector
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page
├── components/
│   └── SongSelector.tsx         # Song selection component
├── lib/
│   └── hooks/
│       └── useSingerSongs.ts    # Hook to fetch songs
├── public/                       # Static assets
├── .env                         # Environment variables
├── .gitignore                   # Git ignore rules
├── next.config.js               # Next.js configuration
├── package.json                 # Dependencies
├── postcss.config.js            # PostCSS configuration
├── tailwind.config.js           # Tailwind CSS configuration
└── tsconfig.json                # TypeScript configuration
```

## Key Components

### Video Generation Page
**Location**: `app/generate/video/page.tsx`

Features:
- AI Provider selection (Veo 3 / Sora 2)
- Singer selection
- **Song Selector** (automatically appears when singer is selected)
- Video details (prompt, duration, aspect ratio)
- Real-time job creation and status

### Song Selector Component
**Location**: `components/SongSelector.tsx`

Features:
- Fetches available songs for selected singer
- Shows song name, duration, and creation date
- "No song" option for regular videos
- Visual selection feedback
- Loading and error states

### useSingerSongs Hook
**Location**: `lib/hooks/useSingerSongs.ts`

Features:
- Fetches songs from API
- Auto-refreshes when singer changes
- Handles loading and error states
- Type-safe with TypeScript

## API Integration

The frontend integrates with the backend API:

**Base URL**: `https://ai-singer-studio-production.ivanleejackson.workers.dev`

### Endpoints Used:

1. **Get Singer's Songs**
   ```
   GET /api/assets/audio/:singerId
   ```

2. **Generate Video**
   ```
   POST /api/generate/video
   Body: {
     singerId: string,
     prompt: string,
     provider: 'veo3' | 'sora2',
     aspectRatio: string,
     durationSeconds: number,
     audioAssetId?: string  // Include for music videos
   }
   ```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://ai-singer-studio-production.ivanleejackson.workers.dev` |

**Note**: Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

## Testing Locally

1. **Start the dev server**:
   ```bash
   npm run dev
   ```

2. **Navigate to video generation**:
   - Open http://localhost:3000
   - Click "Generate Music Video"

3. **Test the song selector**:
   - Select a singer (e.g., "Jill")
   - Song selector should appear below
   - Select a song
   - Button text changes to "Generate Music Video"

4. **Generate a music video**:
   - Fill in the prompt
   - Select duration and aspect ratio
   - Click "Generate Music Video"
   - Job ID will appear on success

## Deployment URLs

- **Development**: http://localhost:3000
- **Production**: Update after deploying to Cloudflare Pages

## Testing After Deployment

After deploying to Cloudflare Pages:

1. Visit your Cloudflare Pages URL
2. Navigate to "Generate Music Video"
3. Select singer "Jill" (`singer_1760559095501_emyt1i`)
4. Verify song selector appears with available songs
5. Select a song and generate a music video
6. Check that job is created successfully

## Troubleshooting

### Song selector not appearing
- Check that you selected a singer first
- Open browser console for errors
- Verify API URL is correct in `.env`

### Songs not loading
- Check network tab for API request
- Verify singer has songs in the database
- Check Authorization header (should include session token)

### Build errors
- Delete `.next` folder and `node_modules`
- Run `npm install` again
- Try `npm run build` to see detailed errors

### Deployment fails
- Verify build output directory is set to `out`
- Check environment variables in Cloudflare Pages
- Ensure `output: 'export'` is in `next.config.js`

## Next Steps

1. ✅ Complete frontend structure created
2. ✅ Song selector integrated
3. ✅ Video generation page built
4. **Deploy to Cloudflare Pages** (next step)
5. **Test complete music video feature**
6. **Connect to existing frontend domain** if needed

## Support

For issues or questions, check the backend repository at `/Users/ivanjackson/Desktop/soraveo/video-gen-platform/`

---

**Ready to deploy!** Follow the deployment instructions above to go live.
