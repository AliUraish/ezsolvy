# EzSolvy

AI-powered canvas explainer app for educational questions with diagrams and transcripts.

## Architecture (100% Serverless)

- **API + Workers**: Single Cloudflare Worker (Hono + Queues)
- **Auth**: Clerk
- **Database**: Supabase Postgres with RLS
- **Storage**: Supabase Storage (no local persistence)
- **Queue**: Cloudflare Queues (no Redis)
- **AI**: OpenAI, Perplexity, NanoBanana
- **OCR**: AWS Textract (via signed HTTP)
- **PDF**: pdf-lib (in-Worker)

## Project Structure

```
apps/
  api-worker/       # Single Cloudflare Worker (API + queue consumer)
packages/
  shared/           # Shared types, schemas, prompts
infra/
  supabase/         # Database migrations
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure Wrangler secrets:
   ```bash
   cd apps/api-worker
   wrangler secret put CLERK_SECRET_KEY
   wrangler secret put SUPABASE_URL
   wrangler secret put SUPABASE_SERVICE_KEY
   wrangler secret put SUPABASE_JWT_SECRET
   wrangler secret put OPENAI_API_KEY
   wrangler secret put PERPLEXITY_API_KEY
   wrangler secret put NANOBANANA_API_KEY
   wrangler secret put AWS_ACCESS_KEY_ID
   wrangler secret put AWS_SECRET_ACCESS_KEY
   wrangler secret put AWS_REGION
   ```

3. Run Supabase migrations:
   ```bash
   npx supabase db push --db-url <your-supabase-db-url>
   ```

4. Start development:
   ```bash
   npm run dev:api  # Starts Cloudflare Workers with queue consumer
   ```

## Deployment

```bash
cd apps/api-worker
npm run deploy  # Deploys to Cloudflare Workers
```

Cloudflare automatically creates the queues defined in `wrangler.toml`.

## Key Features

- **Two modes**: Typed questions & PDF questions
- **100% serverless**: No containers, no servers
- **No local storage**: All files stream to/from Supabase
- **Multi-tenant**: RLS-enforced org isolation
- **Real-time**: SSE progress streams
- **Zero ops**: Single Worker handles API + background jobs

