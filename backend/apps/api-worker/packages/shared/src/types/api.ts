import type { DocumentSource, JobStatus, JobType } from './database';

export interface AuthContext {
  clerkUserId: string;
  userId: string;
  orgId: string;
  supabaseJwt: string;
}

export interface CreateDocumentRequest {
  title: string;
  source: DocumentSource;
  text?: string;
  fileUrl?: string;
}

export interface CreateDocumentResponse {
  document_id: string;
  job_id?: string;
}

export interface ExplainRequest {
  document_id?: string;
  text?: string;
}

export interface ExplainResponse {
  job_id: string;
}

export interface GetDocumentResponse {
  document: {
    id: string;
    title: string;
    source: DocumentSource;
    created_at: string;
  };
  canvases: Array<{
    id: string;
    state: Record<string, any>;
    width: number;
    height: number;
  }>;
  assets: Array<{
    id: string;
    kind: string;
    url: string;
    bbox: any;
  }>;
  transcripts: Array<{
    id: string;
    content: string;
    model: string;
  }>;
}

export interface GetJobResponse {
  id: string;
  type: JobType;
  status: JobStatus;
  progress: Record<string, any> | null;
  error: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface JobEvent {
  type: 'progress' | 'transcript' | 'complete' | 'error';
  job_id: string;
  timestamp: string;
  data: Record<string, any>;
}

export interface ExportCanvasRequest {
  canvas_id: string;
}

export interface ExportCanvasResponse {
  pdf_url: string;
}

export interface PresignedUploadRequest {
  filename: string;
  content_type: string;
  org_id: string;
}

export interface PresignedUploadResponse {
  upload_url: string;
  file_url: string;
  file_path: string;
}

