import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { Env } from '../types/env';
import type { AuthContext, GetJobResponse, JobEvent } from '@ezsolvy/shared';
import { getSupabaseClient } from '../lib/supabase';

const app = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

app.get('/:id', async (c) => {
  try {
    const auth = c.get('auth');
    const jobId = c.req.param('id');
    
    const supabase = getSupabaseClient(c.env, auth.supabaseJwt);

    const { data: job, error } = await supabase
      .from('jobs')
      .select('id, type, status, progress, error, created_at, updated_at')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      return c.json({ error: 'Job not found' }, 404);
    }

    const response: GetJobResponse = job;
    return c.json(response);
  } catch (error: any) {
    console.error('Error fetching job:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/:id/stream', async (c) => {
  const auth = c.get('auth');
  const jobId = c.req.param('id');

  return streamSSE(c, async (stream) => {
    const supabase = getSupabaseClient(c.env, auth.supabaseJwt);

    // Initial job status
    const { data: job } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (!job) {
      await stream.writeSSE({
        data: JSON.stringify({
          type: 'error',
          job_id: jobId,
          timestamp: new Date().toISOString(),
          data: { message: 'Job not found' },
        }),
      });
      return;
    }

    // Send initial status
    await stream.writeSSE({
      data: JSON.stringify({
        type: 'progress',
        job_id: jobId,
        timestamp: new Date().toISOString(),
        data: { status: job.status, progress: job.progress },
      }),
    });

    // Poll for updates every 2 seconds
    const intervalId = setInterval(async () => {
      const { data: updatedJob } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (!updatedJob) return;

      const event: JobEvent = {
        type: updatedJob.status === 'done' ? 'complete' : updatedJob.status === 'failed' ? 'error' : 'progress',
        job_id: jobId,
        timestamp: new Date().toISOString(),
        data: {
          status: updatedJob.status,
          progress: updatedJob.progress,
          error: updatedJob.error,
        },
      };

      await stream.writeSSE({
        data: JSON.stringify(event),
      });

      // Stop streaming when job is complete or failed
      if (updatedJob.status === 'done' || updatedJob.status === 'failed') {
        clearInterval(intervalId);
        stream.close();
      }
    }, 2000);

    // Cleanup on disconnect
    c.req.raw.signal.addEventListener('abort', () => {
      clearInterval(intervalId);
    });
  });
});

export default app;

