/**
 * AI services (OpenAI, Perplexity, NanoBanana)
 * Runs entirely in Cloudflare Workers
 */

import type { Env } from '../types/env';
import {
  ANALYZE_QUESTIONS_PROMPT,
  DIAGRAM_SPECIFICATION_PROMPT,
  TRANSCRIPT_PROMPT,
  RESEARCH_PROMPT,
} from '@ezsolvy/shared';

export async function analyzeQuestions(questions: string[], env: Env): Promise<any> {
  const prompt = ANALYZE_QUESTIONS_PROMPT.replace('{questions}', questions.join('\n\n'));

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an expert educational AI assistant.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  const data = (await response.json()) as {
    choices: Array<{ message: { content?: string } }>;
  };
  return JSON.parse(data.choices[0]?.message?.content || '{}');
}

export async function generateDiagramSpec(
  topic: string,
  diagramType: string,
  context: string,
  env: Env
): Promise<any> {
  const prompt = DIAGRAM_SPECIFICATION_PROMPT.replace('{topic}', topic)
    .replace('{diagram_type}', diagramType)
    .replace('{context}', context);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at creating diagram specifications.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  const data = (await response.json()) as {
    choices: Array<{ message: { content?: string } }>;
  };
  return JSON.parse(data.choices[0]?.message?.content || '{}');
}

export async function generateTranscript(
  questions: string[],
  canvasElements: any[],
  diagrams: any[],
  env: Env
): Promise<string> {
  const prompt = TRANSCRIPT_PROMPT.replace('{questions}', questions.join('\n\n'))
    .replace('{canvas_elements}', JSON.stringify(canvasElements, null, 2))
    .replace('{diagrams}', JSON.stringify(diagrams, null, 2));

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert tutor creating educational transcripts.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });

  const data = (await response.json()) as {
    choices: Array<{ message: { content?: string } }>;
  };
  return data.choices[0]?.message?.content || '';
}

export async function researchTopic(
  topic: string,
  questions: string[],
  env: Env
): Promise<any> {
  const prompt = RESEARCH_PROMPT.replace('{topic}', topic).replace(
    '{questions}',
    questions.join('\n\n')
  );

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        {
          role: 'system',
          content: 'You are a research assistant providing educational context with citations.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });

  const data = (await response.json()) as {
    choices: Array<{ message: { content?: string } }>;
    citations?: Array<any>;
  };
  return {
    content: data.choices[0]?.message?.content || '',
    citations: data.citations || [],
  };
}

export async function generateDiagram(spec: any, env: Env): Promise<Uint8Array> {
  const response = await fetch('https://api.nanobanana.ai/v1/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.NANOBANANA_API_KEY}`,
    },
    body: JSON.stringify({
      prompt: spec.title,
      type: spec.type || 'diagram',
      elements: spec.elements,
      style: spec.style || 'educational',
    }),
  });

  if (!response.ok) {
    throw new Error(`NanoBanana API error: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

export async function generateEmbedding(text: string, env: Env): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-large',
      input: text,
    }),
  });

  const data = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
  };
  return data.data[0]?.embedding || [];
}

// Concurrency limiter and timeout for Perplexity embeddings (used by processExplainJob only)
const PPLX_EMBED_MAX_CONCURRENCY = 4;
const PPLX_EMBED_TIMEOUT_MS = 12_000; // 12 seconds timeout
let pplxEmbedInFlight = 0;
const pplxEmbedQueue: Array<() => void> = [];

async function acquirePplxEmbedSlot(): Promise<void> {
  if (pplxEmbedInFlight >= PPLX_EMBED_MAX_CONCURRENCY) {
    await new Promise<void>((resolve) => pplxEmbedQueue.push(resolve));
  }
  pplxEmbedInFlight += 1;
}

function releasePplxEmbedSlot(): void {
  pplxEmbedInFlight = Math.max(0, pplxEmbedInFlight - 1);
  const next = pplxEmbedQueue.shift();
  if (next) next();
}

export async function generateEmbeddingViaPerplexity(text: string, env: Env): Promise<number[]> {
  await acquirePplxEmbedSlot();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(new Error('Perplexity embeddings request timed out')), PPLX_EMBED_TIMEOUT_MS);

    try {
      const response = await fetch('https://api.perplexity.ai/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.PERPLEXITY_API_KEY}`,
        },
        body: JSON.stringify({
          // Assumed OpenAI-compatible embeddings endpoint/model; see PR open_questions.
          model: 'text-embedding-3-large',
          input: text,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = (await response.json()) as { data?: Array<{ embedding?: number[] }> };
        const vec = data?.data?.[0]?.embedding;
        if (Array.isArray(vec) && vec.length > 0) {
          return vec;
        }
        console.warn('Perplexity embeddings: missing embedding in response; falling back to OpenAI.');
      } else {
        const errText = await response.text().catch(() => '');
        console.warn(`Perplexity embeddings HTTP ${response.status} ${response.statusText} - ${errText}`);
      }
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (/abort|timed out/i.test(msg)) {
        console.warn(`Perplexity embeddings aborted: ${msg}`);
      } else {
        console.warn(`Perplexity embeddings failed: ${msg}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }

    // Fallback to original OpenAI embeddings to preserve behavior.
    return await generateEmbedding(text, env);
  } finally {
    releasePplxEmbedSlot();
  }
}
