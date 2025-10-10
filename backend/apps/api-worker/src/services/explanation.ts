/**
 * Explanation mode service.
 * Handles image analysis, Nano Banana planning, and transcript generation.
 */

import type { Env } from '../types/env';

export type LayoutMode = 'annotate' | 'expand';

export interface ExplanationRequest {
  imageBase64?: string;
  imagesBase64?: string[];
  audience?: string;
  promptHint?: string;
  maxPages?: number;
}

export interface ExplanationResponse {
  transcript: string;
  pages: ExplanationPageResult[];
}

export interface ImageAnalysis {
  mode: LayoutMode;
  reasoning: string;
  questions: ImageQuestion[];
}

export interface ImageQuestion {
  id: string;
  questionText: string;
  hasWhitespaceBelow: boolean;
  answerInstructions: string;
  diagramInstructions: string;
  annotationZones?: AnnotationZone[];
}

export interface AnnotationZone {
  label: string;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  notes: string;
}

export interface NanoBananaPlan {
  mode: LayoutMode;
  summary: string;
  pages: NanoBananaPage[];
}

export interface NanoBananaPage {
  pageNumber: number;
  title: string;
  instructions: string[];
}

export interface ExplanationPageResult {
  pageIndex: number;
  editedImageBase64: string;
  transcriptSegment: string;
  nanoBananaPlan: NanoBananaPlan;
  rawAnalysis: ImageAnalysis;
}

/**
 * Main entry point for explanation mode.
 */
export async function runExplanation(request: ExplanationRequest, env: Env): Promise<ExplanationResponse> {
  assertRequest(request);

  const images = normalizeImages(request);
  const pageResults: ExplanationPageResult[] = [];
  const transcriptSegments: string[] = [];

  for (let index = 0; index < images.length; index += 1) {
    const imageBase64 = images[index];
    const pageRequest: ExplanationRequest = {
      ...request,
      imageBase64,
      imagesBase64: undefined,
    };

    const analysis = await analyzeImageWithRetry(pageRequest, env, index);
    const nanoBananaPlan = buildNanoBananaPlan(analysis, index);
    const transcriptSegment = await generateTranscriptSegment(
      analysis,
      nanoBananaPlan,
      pageRequest,
      env,
      index
    );
    const editedImageBase64 = await callNanoBanana(nanoBananaPlan, imageBase64, env, index);

    pageResults.push({
      pageIndex: index,
      editedImageBase64,
      transcriptSegment,
      nanoBananaPlan,
      rawAnalysis: analysis,
    });
    transcriptSegments.push(transcriptSegment);
  }

  const transcript = combineTranscriptSegments(transcriptSegments);

  return { transcript, pages: pageResults };
}

function assertRequest(request: ExplanationRequest): void {
  const hasPrimary = Boolean(request?.imageBase64);
  const hasList = Array.isArray(request?.imagesBase64) && request.imagesBase64.length > 0;

  if (!hasPrimary && !hasList) {
    throw new Error(
      'runExplanation requires either imageBase64 or imagesBase64 with at least one image (base64 without data URI prefix).'
    );
  }
}

function normalizeImages(request: ExplanationRequest): string[] {
  if (Array.isArray(request.imagesBase64) && request.imagesBase64.length > 0) {
    const sanitized = request.imagesBase64
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter((value) => value.length > 0);
    if (!sanitized.length) {
      throw new Error('imagesBase64 must contain at least one non-empty base64 string.');
    }
    return sanitized;
  }

  if (request.imageBase64) {
    const trimmed = request.imageBase64.trim();
    if (!trimmed) {
      throw new Error('imageBase64 cannot be empty.');
    }
    return [trimmed];
  }

  return [];
}

async function analyzeImageWithRetry(
  request: ExplanationRequest,
  env: Env,
  pageIndex: number
): Promise<ImageAnalysis> {
  const MAX_ATTEMPTS = 3;
  let attempt = 0;
  let lastError: Error | undefined;

  while (attempt < MAX_ATTEMPTS) {
    attempt += 1;
    try {
      return await analyzeImage(request, env, pageIndex);
    } catch (error) {
      lastError = error as Error;
      const message = lastError.message.toLowerCase();
      const isParseFailure = message.includes('parse') || message.includes('json');

      if (!isParseFailure) {
        throw lastError;
      }
      if (attempt >= MAX_ATTEMPTS) {
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error(`Unknown error analyzing image (page ${pageIndex + 1}).`);
}

async function analyzeImage(
  request: ExplanationRequest,
  env: Env,
  pageIndex: number
): Promise<ImageAnalysis> {
  const prompt = [
    'You are Explanation Mode planner.',
    `This analysis is for source page ${pageIndex + 1}. Treat each page independently.`,
    'Inspect the worksheet image and decide whether answers can be written beneath each question without overlapping existing text.',
    'If yes, set mode to "annotate" and provide precise annotation zones in percentages.',
    'If not, set mode to "expand" and plan separate clean pages for each question.',
    'Return strict JSON with keys: mode, reasoning, questions[].',
    'Each question must include: id, questionText, hasWhitespaceBelow, answerInstructions, diagramInstructions.',
    'Include annotationZones only when mode === "annotate" (array of { label, xPct, yPct, widthPct, heightPct, notes }).',
    request.promptHint ? `Follow user hint: ${request.promptHint}` : 'No additional hints provided.',
  ].join('\n');

  const payload = {
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' as const },
    messages: [
      {
        role: 'system',
        content: 'Return JSON only. Use numeric percentages (0-100).',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${request.imageBase64}`,
            },
          },
        ],
      },
    ],
  };

  const data = await callOpenAI(payload, env);
  const rawContent = data.choices?.[0]?.message?.content ?? '{}';
  const parsed = safeParseJson<ImageAnalysis>(rawContent, 'image analysis');

  if (parsed.mode === 'expand' && request.maxPages && parsed.questions.length > request.maxPages) {
    parsed.questions = parsed.questions.slice(0, request.maxPages);
  }

  return parsed;
}

function buildNanoBananaPlan(analysis: ImageAnalysis, pageIndex: number): NanoBananaPlan {
  if (analysis.mode === 'annotate') {
    return {
      mode: 'annotate',
      summary: 'Annotate directly on the uploaded page. Keep overlays tidy and do not cover original text.',
      pages: [
        {
          pageNumber: pageIndex + 1,
          title: `Annotated worksheet page ${pageIndex + 1}`,
          instructions: analysis.questions.map((question, index) => {
            const zones = question.annotationZones
              ?.map(
                (zone) =>
                  `Zone ${zone.label}: place overlay at ${zone.xPct}%/${zone.yPct}% size ${zone.widthPct}%×${zone.heightPct}% to ${zone.notes}`
              )
              .join(' ');
            const baseInstruction = `Question ${index + 1}: ${question.answerInstructions}`;
            return zones ? `${baseInstruction}. ${zones}` : `${baseInstruction}. Use nearby whitespace only.`;
          }),
        },
      ],
    };
  }

  return {
    mode: 'expand',
    summary: 'Recreate the content across multiple clean pages with space for solutions.',
    pages: analysis.questions.map((question, index) => ({
      pageNumber: index + 1,
      title: `Expanded layout for question ${index + 1} (source page ${pageIndex + 1})`,
      instructions: [
        `Copy the question text: ${question.questionText}`,
        `Provide room for the answer: ${question.answerInstructions}`,
        `Add diagram guidance: ${question.diagramInstructions}`,
      ],
    })),
  };
}

async function generateTranscriptSegment(
  analysis: ImageAnalysis,
  nanoBananaPlan: NanoBananaPlan,
  request: ExplanationRequest,
  env: Env,
  pageIndex: number
): Promise<string> {
  const prompt = [
    'You are the Explanation Mode narrator.',
    'Write a clear, friendly transcript that references the Nano Banana plan when helpful.',
    'Encourage the learner and highlight where answers or diagrams will appear.',
    `This narration is for source page ${pageIndex + 1}.`,
    `Audience: ${request.audience ?? 'Beginner learner'}`,
    'Nano Banana plan:',
    JSON.stringify(nanoBananaPlan),
    'Questions:',
    JSON.stringify(analysis.questions),
  ].join('\n');

  const payload = {
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'Produce a plain text transcript with short paragraphs. Reference pages using tags like [NB Page 1].',
      },
      { role: 'user', content: prompt },
    ],
  };

  const data = await callOpenAI(payload, env);
  return data.choices?.[0]?.message?.content ?? '';
}

async function callNanoBanana(
  plan: NanoBananaPlan,
  originalImageBase64: string,
  env: Env,
  pageIndex: number
): Promise<string> {
  console.log('[Explanation] Nano Banana mode:', plan.mode, 'page', pageIndex + 1);

  const response = await fetch('https://api.nanobanana.ai/v1/explain', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.NANOBANANA_API_KEY}`,
    },
    body: JSON.stringify({
      image_base64: originalImageBase64,
      source_page: pageIndex + 1,
      plan,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Nano Banana API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = (await response.json()) as { image_base64: string };
  if (!data?.image_base64) {
    throw new Error('Nano Banana API returned no image_base64 field.');
  }

  return data.image_base64;
}

function combineTranscriptSegments(segments: string[]): string {
  return segments
    .map((segment, index) => `Page ${index + 1} Narration:\n${segment.trim()}`)
    .join('\n\n');
}

async function callOpenAI(body: unknown, env: Env): Promise<OpenAIChatResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return (await response.json()) as OpenAIChatResponse;
}

function safeParseJson<T>(raw: string, label: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new Error(`Failed to parse ${label} JSON: ${(error as Error).message}`);
  }
}

interface OpenAIChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export type {
  ExplanationRequest as ExplanationRequestInput,
  ExplanationResponse as ExplanationResponseOutput,
};
