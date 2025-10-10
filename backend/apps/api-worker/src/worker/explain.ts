/**
 * Explain workflow - replaces LangGraph orchestration
 * Runs entirely in Cloudflare Workers queue consumer
 */

import type { Env } from '../types/env';
import { getSupabaseServiceClient } from '../lib/supabase';
import {
  analyzeQuestions,
  generateDiagramSpec,
  generateTranscript,
  researchTopic,
  generateDiagram,
  generateEmbedding,
} from '../services/ai';

interface ExplainPayload {
  jobId: string;
  document_id: string;
  org_id: string;
  user_id: string;
  source: 'typed' | 'pdf';
  text?: string;
  file_url?: string;
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

async function uploadToStorage(
  env: Env,
  bucket: string,
  path: string,
  data: Uint8Array,
  contentType: string
): Promise<string> {
  const supabase = getSupabaseServiceClient(env);
  const { error } = await supabase.storage.from(bucket).upload(path, data, {
    contentType,
    upsert: true,
  });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  return urlData.publicUrl;
}

export async function processExplainJob(payload: ExplainPayload, env: Env): Promise<void> {
  const supabase = getSupabaseServiceClient(env);
  const { jobId, document_id, org_id, user_id, source, text } = payload;

  try {
    // Step 1: Ingest - load or extract questions
    await updateJobStatus(env, jobId, 'working', { step: 'ingest', progress: 1, total: 6 });

    let questions: string[] = [];

    if (source === 'typed' && text) {
      questions = [text];
    } else if (source === 'pdf') {
      throw new Error('PDF explain jobs are no longer supported without OCR');
    }

    if (!questions.length) {
      throw new Error('No questions found');
    }

    // Step 3: Analyze
    await updateJobStatus(env, jobId, 'working', { step: 'analyze', progress: 2, total: 6 });
    const analysis = await analyzeQuestions(questions, env);

    // Step 4: Research
    await updateJobStatus(env, jobId, 'working', { step: 'research', progress: 3, total: 6 });
    const research = await researchTopic(analysis.subject, questions, env);

    // Step 5: Diagram planning
    await updateJobStatus(env, jobId, 'working', {
      step: 'diagram_plan',
      progress: 4,
      total: 6,
    });

    const diagramSpecs = [];
    for (const diagramType of analysis.diagrams || []) {
      const spec = await generateDiagramSpec(
        analysis.subject,
        diagramType,
        research.content || '',
        env
      );
      diagramSpecs.push(spec);
    }

    // Step 6: Render diagrams
    await updateJobStatus(env, jobId, 'working', {
      step: 'diagram_render',
      progress: 5,
      total: 6,
    });

    const canvasElements = [];
    for (let i = 0; i < diagramSpecs.length; i++) {
      const spec = diagramSpecs[i];
      const imageBytes = await generateDiagram(spec, env);

      // Upload to Supabase Storage
      const timestamp = Date.now();
      const imagePath = `${org_id}/diagrams/${timestamp}-${i}.png`;
      const imageUrl = await uploadToStorage(env, 'assets', imagePath, imageBytes, 'image/png');

      // Store asset
      const { data: asset } = await supabase
        .from('canvas_assets')
        .insert({
          org_id,
          document_id,
          kind: 'diagram',
          url: imageUrl,
          bbox: { x: 100, y: 100 + i * 300, width: 600, height: 400 },
        })
        .select()
        .single();

      canvasElements.push(asset);
    }

    // Step 7: Generate transcript
    await updateJobStatus(env, jobId, 'working', {
      step: 'transcript',
      progress: 6,
      total: 6,
    });

    const transcript = await generateTranscript(questions, canvasElements, diagramSpecs, env);

    // Store transcript
    await supabase.from('transcripts').insert({
      org_id,
      document_id,
      content: transcript,
      tokens: Math.ceil(transcript.length / 4),
      model: 'gpt-4o',
    });

    // Generate embeddings
    const chunks = transcript.split('\n\n').filter(Boolean);
    for (const chunk of chunks) {
      const vec = await generateEmbedding(chunk, env);
      await supabase.from('embeddings').insert({
        org_id,
        document_id,
        chunk,
        vec,
      });
    }

    // Complete
    await updateJobStatus(env, jobId, 'done', { step: 'complete', progress: 6, total: 6 });
  } catch (error: any) {
    console.error('Explain job failed:', error);
    await updateJobStatus(env, jobId, 'failed', undefined, {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
