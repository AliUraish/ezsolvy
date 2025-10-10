/**
 * PDF export workflow
 * Runs entirely in Cloudflare Workers queue consumer
 */

import type { Env } from '../types/env';
import { getSupabaseServiceClient } from '../lib/supabase';
import { composePDF } from '../services/pdf';

interface PDFExportPayload {
  jobId: string;
  canvas_id: string;
  document_id: string;
  org_id: string;
  user_id: string;
}

async function updateJobStatus(
  env: Env,
  jobId: string,
  status: 'queued' | 'working' | 'done' | 'failed',
  progress?: Record<string, any>,
  error?: Record<string, any>
) {
  const supabase = getSupabaseServiceClient(env);
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

export async function processPDFExportJob(payload: PDFExportPayload, env: Env): Promise<void> {
  const supabase = getSupabaseServiceClient(env);
  const { jobId, canvas_id, document_id, org_id } = payload;

  try {
    await updateJobStatus(env, jobId, 'working', { step: 'pdf_generation' });

    // Get canvas
    const { data: canvas, error: canvasError } = await supabase
      .from('canvases')
      .select('*')
      .eq('id', canvas_id)
      .single();

    if (canvasError || !canvas) {
      throw new Error('Canvas not found');
    }

    // Get transcript
    const { data: transcripts } = await supabase
      .from('transcripts')
      .select('content')
      .eq('document_id', document_id)
      .limit(1);

    const canvasState = {
      ...canvas.state,
      title: canvas.title || 'EzSolvy Export',
      transcript: transcripts?.[0]?.content || '',
    };

    // Generate PDF
    const pdfBytes = await composePDF(canvasState, env);

    // Upload to Supabase Storage
    const timestamp = Date.now();
    const pdfPath = `${org_id}/exports/${document_id}-${timestamp}.pdf`;

    const { error: uploadError } = await supabase.storage.from('exports').upload(pdfPath, pdfBytes, {
      contentType: 'application/pdf',
      upsert: true,
    });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('exports').getPublicUrl(pdfPath);
    const pdfUrl = urlData.publicUrl;

    // Complete job
    await updateJobStatus(env, jobId, 'done', { pdf_url: pdfUrl });
  } catch (error: any) {
    console.error('PDF export job failed:', error);
    await updateJobStatus(env, jobId, 'failed', undefined, {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

