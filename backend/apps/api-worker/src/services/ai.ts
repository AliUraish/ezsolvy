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

