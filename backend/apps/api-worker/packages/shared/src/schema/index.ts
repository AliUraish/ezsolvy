import { z } from 'zod';

export const documentSourceSchema = z.enum(['typed', 'pdf']);
export const jobTypeSchema = z.enum(['ocr', 'explain', 'diagram', 'pdf']);
export const jobStatusSchema = z.enum(['queued', 'working', 'done', 'failed']);
export const assetKindSchema = z.enum(['text', 'diagram', 'image']);

export const createDocumentSchema = z.object({
  title: z.string().min(1).max(500),
  source: documentSourceSchema,
  text: z.string().optional(),
  fileUrl: z.string().url().optional(),
});

export const explainSchema = z.object({
  document_id: z.string().uuid().optional(),
  text: z.string().min(1).optional(),
}).refine(data => data.document_id || data.text, {
  message: 'Either document_id or text must be provided',
});

export const exportCanvasSchema = z.object({
  canvas_id: z.string().uuid(),
});

export const presignedUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  content_type: z.string().min(1).max(100),
  org_id: z.string().uuid(),
});

export const bboxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export const ocrBlockSchema = z.object({
  text: z.string(),
  bbox: bboxSchema,
  confidence: z.number().min(0).max(1),
});

export const ocrPageSchema = z.object({
  page: z.number().int().positive(),
  text: z.string(),
  blocks: z.array(ocrBlockSchema),
  width: z.number().positive(),
  height: z.number().positive(),
});

export const ocrResultSchema = z.object({
  pages: z.array(ocrPageSchema),
  language: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

