import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env } from './types/env';
import { authMiddleware } from './middleware/auth';
import documents from './routes/documents';
import jobs from './routes/jobs';
import canvas from './routes/canvas';
import storage from './routes/storage';
import { processExplainJob } from './worker/explain';
import { processPDFExportJob } from './worker/pdf-export';
import explanation from './routes/explanation';
import { processImageExplanationJob } from './worker/image-explanation';

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: ['http://localhost:3000', 'https://ezsolvy.com'],
    credentials: true,
  })
);

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Protected routes
app.use('/v1/*', authMiddleware);

app.route('/v1/documents', documents);
app.route('/v1/jobs', jobs);
app.route('/v1/canvas', canvas);
app.route('/v1/storage', storage);
app.route('/v1/explanation', explanation);

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

// Export for HTTP requests
export default {
  fetch: app.fetch,

  // Queue consumer handler
  async queue(batch: MessageBatch<any>, env: Env, ctx: ExecutionContext): Promise<void> {
    for (const message of batch.messages) {
      try {
        const payload = message.body;

        // Route based on job type
        if (payload?.type === 'image-explanation') {
          await processImageExplanationJob(payload, env);
        } else if (payload.source) {
          // Explain job (has source field)
          await processExplainJob(payload, env);
        } else if (payload.canvas_id) {
          // PDF export job
          await processPDFExportJob(payload, env);
        }

        message.ack();
      } catch (error) {
        console.error('Queue message failed:', error);
        message.retry();
      }
    }
  },
};
