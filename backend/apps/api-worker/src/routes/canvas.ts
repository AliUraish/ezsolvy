import { Hono } from 'hono';
import type { Env } from '../types/env';
import type { AuthContext } from '@ezsolvy/shared';
import { getSupabaseClient } from '../lib/supabase';

const app = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

app.post('/:id/export', async (c) => {
  try {
    const auth = c.get('auth');
    const canvasId = c.req.param('id');
    
    const supabase = getSupabaseClient(c.env, auth.supabaseJwt);

    // Verify canvas exists and get document
    const { data: canvas, error } = await supabase
      .from('canvases')
      .select('*, documents(*)')
      .eq('id', canvasId)
      .single();

    if (error || !canvas) {
      return c.json({ error: 'Canvas not found' }, 404);
    }

    // Create job record
    const { data: job } = await supabase
      .from('jobs')
      .insert({
        org_id: auth.orgId,
        document_id: canvas.document_id,
        type: 'pdf',
        status: 'queued',
        payload: {
          canvas_id: canvasId,
        },
      })
      .select('id')
      .single();

    const jobId = job!.id;

    // Enqueue to Cloudflare Queue
    await c.env.EXPLAIN_QUEUE.send({
      jobId,
      canvas_id: canvasId,
      document_id: canvas.document_id,
      org_id: auth.orgId,
      user_id: auth.userId,
    });

    return c.json({
      job_id: jobId,
      message: 'PDF export queued',
    });
  } catch (error: any) {
    console.error('Error exporting canvas:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;

