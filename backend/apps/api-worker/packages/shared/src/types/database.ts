export type DocumentSource = 'typed' | 'pdf';
export type JobType = 'ocr' | 'explain' | 'diagram' | 'pdf';
export type JobStatus = 'queued' | 'working' | 'done' | 'failed';
export type AssetKind = 'text' | 'diagram' | 'image';
export type OrgRole = 'owner' | 'admin' | 'member';

export interface User {
  id: string;
  clerk_user_id: string;
  name: string | null;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  org_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
}

export interface Document {
  id: string;
  org_id: string;
  user_id: string;
  title: string;
  source: DocumentSource;
  pdf_asset_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Canvas {
  id: string;
  org_id: string;
  document_id: string;
  state: Record<string, any>;
  width: number;
  height: number;
  created_at: string;
  updated_at: string;
}

export interface CanvasAsset {
  id: string;
  org_id: string;
  document_id: string;
  kind: AssetKind;
  url: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  created_at: string;
}

export interface Question {
  id: string;
  org_id: string;
  document_id: string;
  text: string;
  page: number | null;
  created_at: string;
}

export interface Transcript {
  id: string;
  org_id: string;
  document_id: string;
  content: string;
  tokens: number;
  model: string;
  created_at: string;
}

export interface Job {
  id: string;
  org_id: string;
  document_id: string | null;
  type: JobType;
  status: JobStatus;
  payload: Record<string, any>;
  progress: Record<string, any> | null;
  error: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface Embedding {
  id: string;
  org_id: string;
  document_id: string;
  chunk: string;
  vec: number[];
  created_at: string;
}

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OCRBlock {
  text: string;
  bbox: BBox;
  confidence: number;
}

export interface OCRPage {
  page: number;
  text: string;
  blocks: OCRBlock[];
  width: number;
  height: number;
}

export interface OCRResult {
  pages: OCRPage[];
  language?: string;
  metadata?: Record<string, any>;
}

