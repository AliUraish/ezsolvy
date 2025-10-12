export type JobStatus = 'queued' | 'working' | 'done' | 'failed';

export interface GetJobResponse {
  id: string;
  type: string;
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

export interface ExplanationRequestBody {
  imageBase64?: string;
  imagesBase64?: string[];
  audience?: string;
  promptHint?: string;
  maxPages?: number;
  documentId?: string;
}

export interface ExplanationSyncResponse {
  mode: 'sync';
  result: any;
}

export interface ExplanationAsyncResponse {
  mode: 'async';
  job_id: string;
  message: string;
}

export type ExplanationResponse = ExplanationSyncResponse | ExplanationAsyncResponse;


