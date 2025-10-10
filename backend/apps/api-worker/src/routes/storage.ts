import { Hono } from 'hono';
import type { Env } from '../types/env';
import type { AuthContext, PresignedUploadResponse } from '@ezsolvy/shared';
import { getSupabaseServiceClient } from '../lib/supabase';
import { presignedUploadSchema } from '@ezsolvy/shared';

const app = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

app.post('/presigned-upload', async (c) => {
  try {
    const auth = c.get('auth');
    const body = await c.req.json();
    
    const validated = presignedUploadSchema.parse(body);
    
    const supabase = getSupabaseServiceClient(c.env);

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedFilename = validated.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${validated.org_id}/uploads/${timestamp}-${sanitizedFilename}`;

    // Create presigned URL for upload (Supabase Storage)
    const { data, error } = await supabase.storage
      .from('source-files')
      .createSignedUploadUrl(filePath);

    if (error) {
      console.error('Failed to create presigned URL:', error);
      return c.json({ error: 'Failed to create upload URL' }, 500);
    }

    const fileUrl = `${c.env.SUPABASE_URL}/storage/v1/object/public/source-files/${filePath}`;

    const response: PresignedUploadResponse = {
      upload_url: data.signedUrl,
      file_url: fileUrl,
      file_path: filePath,
    };

    return c.json(response);
  } catch (error: any) {
    console.error('Error creating presigned upload:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

export default app;

