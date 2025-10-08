Backend

Cloudflare Worker (Hono) for API + queue consumer in one deployment

Workers/queues: Cloudflare Queues (heavy jobs: OCR, image-gen, PDF build)

Orchestration: Lightweight async workflow inside the Worker (no LangGraph)

Storage: Supabase

AI

OpenAI (GPT-4o family) → planning, pedagogy, transcripts, summaries

Perplexity API → research w/ citations

NanoBanana (Gemini 2.5 Flash Image) → diagram creation/edits

Embeddings: OpenAI text-embedding-3-large (evaluate OSS bge-m3 if needed)

Document I/O

OCR (images/scans/handwriting): AWS Textract (primary service today)

Layout-aware parsing (optional) : Integrate Unstructured later if we need table/figure capture

PDF maker: pdf-lib inside the Worker (precise layout)

Export quality extras (future): WeasyPrint or LaTeX only if print-grade output becomes a requirement
