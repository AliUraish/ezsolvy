// Minimal Queue type to avoid @cloudflare/workers-types dependency
export interface CfQueueMessage<T = any> {
  body: T;
  ack: () => void;
  retry: () => void;
}

export interface MessageBatch<T = any> {
  messages: Array<CfQueueMessage<T>>;
}

export interface Queue<T = any> {
  send: (message: T) => Promise<void>;
}

export interface ExecutionContext {
  waitUntil: (promise: Promise<any>) => void;
  passThroughOnException?: () => void;
}

export interface Env {
  CLERK_SECRET_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  SUPABASE_JWT_SECRET: string;
  OPENAI_API_KEY: string;
  PERPLEXITY_API_KEY: string;
  NANOBANANA_API_KEY: string;
  EXPLAIN_QUEUE: Queue;
}
