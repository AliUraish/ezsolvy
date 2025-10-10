import { Hono } from 'hono';
import type { Env } from '../types/env';
import type { AuthContext, CreateDocumentRequest, GetDocumentResponse } from '@ezsolvy/shared';
import { createDocumentSchema } from '@ezsolvy/shared';
import { getSupabaseClient } from '../lib/supabase';

const app = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

app.post('/', async (c) => {
  try {
    const auth = c.get('auth');
    const body = await c.req.json();
    
    // Validate request
    const validated = createDocumentSchema.parse(body);
    
    const supabase = getSupabaseClient(c.env, auth.supabaseJwt);

    // Create document
    const { data: document, error } = await supabase
      .from('documents')
      .insert({
        org_id: auth.orgId,
        user_id: auth.userId,
        title: validated.title,
        source: validated.source,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create document:', error);
      return c.json({ error: 'Failed to create document' }, 500);
    }

    // Create initial canvas
    await supabase.from('canvases').insert({
      org_id: auth.orgId,
      document_id: document.id,
      state: {},
      width: 1920,
      height: 1080,
    });

    // If typed questions, create question records
    if (validated.source === 'typed' && validated.text) {
      await supabase.from('questions').insert({
        org_id: auth.orgId,
        document_id: document.id,
        text: validated.text,
        page: null,
      });
    }

    // Create job record first
    const { data: job } = await supabase
      .from('jobs')
      .insert({
        org_id: auth.orgId,
        document_id: document.id,
        type: 'explain',
        status: 'queued',
        payload: {
          source: validated.source,
          text: validated.text,
          file_url: validated.fileUrl,
        },
      })
      .select('id')
      .single();

    const jobId = job!.id;

    // Enqueue to Cloudflare Queue
    await c.env.EXPLAIN_QUEUE.send({
      jobId,
      document_id: document.id,
      org_id: auth.orgId,
      user_id: auth.userId,
      source: validated.source,
      text: validated.text,
      file_url: validated.fileUrl,
    });

    return c.json({
      document_id: document.id,
      job_id: jobId,
    });
  } catch (error: any) {
    console.error('Error creating document:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

app.get('/:id', async (c) => {
  try {
    const auth = c.get('auth');
    const documentId = c.req.param('id');
    
    const supabase = getSupabaseClient(c.env, auth.supabaseJwt);

    // Get document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, title, source, created_at')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return c.json({ error: 'Document not found' }, 404);
    }

    // Get canvases
    const { data: canvases } = await supabase
      .from('canvases')
      .select('id, state, width, height')
      .eq('document_id', documentId);

    // Get assets
    const { data: assets } = await supabase
      .from('canvas_assets')
      .select('id, kind, url, bbox')
      .eq('document_id', documentId);

    // Get transcripts
    const { data: transcripts } = await supabase
      .from('transcripts')
      .select('id, content, model')
      .eq('document_id', documentId);

    const response: GetDocumentResponse = {
      document,
      canvases: canvases || [],
      assets: assets || [],
      transcripts: transcripts || [],
    };

    return c.json(response);
  } catch (error: any) {
    console.error('Error fetching document:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;

