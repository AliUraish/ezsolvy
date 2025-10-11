import { Hono } from 'hono';
import type { Env } from '../types/env';
import type { AuthContext } from '@ezsolvy/shared';
import { runExplanation } from '../services/explanation';
import { getSupabaseClient } from '../lib/supabase';

const MAX_SYNC_IMAGES = 4;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB

const app = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

app.post('/', async (c) => {
  try {
    const auth = c.get('auth');
    const body = await c.req.json();

    const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64.trim() : undefined;
    const imagesBase64 = Array.isArray(body.imagesBase64)
      ? body.imagesBase64
          .map((value: unknown) => (typeof value === 'string' ? value.trim() : ''))
          .filter((value: string) => value.length > 0)
      : undefined;
    const audience = typeof body.audience === 'string' ? body.audience : undefined;
    const promptHint = typeof body.promptHint === 'string' ? body.promptHint : undefined;
    const maxPages = typeof body.maxPages === 'number' ? body.maxPages : undefined;
    const documentId = typeof body.documentId === 'string' ? body.documentId : undefined;

    const collectedImages = imagesBase64?.length ? imagesBase64 : imageBase64 ? [imageBase64] : [];

    if (!collectedImages.length) {
      return c.json({ error: 'Provide imageBase64 or imagesBase64.' }, 400);
    }

    const oversizedIndex = findOversizedImage(collectedImages);
    if (oversizedIndex !== -1) {
      return c.json(
        { error: `Image at index ${oversizedIndex} exceeds 6MB after decoding. Reduce size and retry.` },
        413
      );
    }

    const explanationRequest = collectedImages.length === 1
      ? { imageBase64: collectedImages[0], audience, promptHint, maxPages }
      : { imagesBase64: collectedImages, audience, promptHint, maxPages };

    if (collectedImages.length <= MAX_SYNC_IMAGES) {
      const result = await runExplanation(explanationRequest, c.env);
      return c.json({
        mode: 'sync',
        result,
      });
    }

    const supabase = getSupabaseClient(c.env, auth.supabaseJwt);

    const { data: job } = await supabase
      .from('jobs')
      .insert({
        org_id: auth.orgId,
        document_id: documentId ?? null,
        type: 'image-explanation',
        status: 'queued',
        payload: {
          request: explanationRequest,
        },
      })
      .select('id')
      .single();

    const jobId = job!.id;

    await c.env.EXPLAIN_QUEUE.send({
      type: 'image-explanation',
      jobId,
      org_id: auth.orgId,
      user_id: auth.userId,
      document_id: documentId ?? null,
      request: explanationRequest,
      attempt: 0,
    });

    return c.json(
      {
        mode: 'async',
        job_id: jobId,
        message: 'Explanation request queued for processing.',
      },
      202
    );
  } catch (error: any) {
    console.error('Explanation route error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

export default app;

function findOversizedImage(images: string[]): number {
  for (let index = 0; index < images.length; index += 1) {
    const base64 = images[index];
    try {
      const bytes = decodeBase64Length(base64);
      if (bytes > MAX_IMAGE_BYTES) {
        return index;
      }
    } catch {
      return index;
    }
  }
  return -1;
}

function decodeBase64Length(input: string): number {
  const sanitized = input.replace(/\s/g, '');

  if (!sanitized.length || sanitized.length % 4 !== 0) {
    throw new Error('Invalid base64 string');
  }

  const padding = sanitized.endsWith('==') ? 2 : sanitized.endsWith('=') ? 1 : 0;
  return (sanitized.length * 3) / 4 - padding;
}
