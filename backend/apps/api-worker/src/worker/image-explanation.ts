import type { Env } from '../types/env';
import { getSupabaseServiceClient } from '../lib/supabase';
import { runExplanation } from '../services/explanation';
import type { ExplanationRequest } from '../services/explanation';

interface ImageExplanationPayload {
  type: 'image-explanation';
  jobId: string;
  org_id: string;
  user_id: string;
  document_id?: string | null;
  request: ExplanationRequest;
  attempt?: number;
}

export async function processImageExplanationJob(
  payload: ImageExplanationPayload,
  env: Env
): Promise<void> {
  const supabase = getSupabaseServiceClient(env);
  const attempt = payload.attempt ?? 0;

  try {
    await updateJobStatus(supabase, payload.jobId, 'working', {
      step: 'explanation_planning',
      message: 'Running explanation workflow',
    });

    const result = await runExplanation(payload.request, env);

    await updateJobStatus(supabase, payload.jobId, 'done', {
      step: 'complete',
      message: 'Explanation completed',
      result,
    });
  } catch (error: any) {
    console.error('processImageExplanationJob failed:', error);
    await updateJobStatus(
      supabase,
      payload.jobId,
      'failed',
      undefined,
      {
        message: error.message || 'Explanation job failed',
        stack: error.stack,
      }
    );

    if (attempt + 1 < 3) {
      console.warn(
        `Re-enqueueing image explanation job ${payload.jobId} (attempt ${attempt + 1} of 3)`
      );
      await env.EXPLAIN_QUEUE.send({
        ...payload,
        attempt: attempt + 1,
      });
    }

    throw error;
  }
}

async function updateJobStatus(
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  jobId: string,
  status: 'queued' | 'working' | 'done' | 'failed',
  progress?: Record<string, any>,
  error?: Record<string, any>
): Promise<void> {
  await supabase
    .from('jobs')
    .update({
      status,
      progress,
      error,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);
}
