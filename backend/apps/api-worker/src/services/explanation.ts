/**
 * Explanation mode service.
 * Handles image analysis, Nano Banana planning, and transcript generation.
 */

import type { Env } from '../types/env';

export type LayoutMode = 'annotate' | 'expand';

export interface ExplanationRequest {
  imageBase64: string;
  audience?: string;
  promptHint?: string;
  maxPages?: number;
}

export interface ExplanationResponse {
  editedImageBase64: string;
  transcript: string;
  nanoBananaPlan: NanoBananaPlan;
  rawAnalysis: ImageAnalysis;
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

/**
 * Main entry point for explanation mode.
 */
export async function runExplanation(
  request: ExplanationRequest,
  env: Env
): Promise<ExplanationResponse> {
  assertRequest(request);

  const analysis = await analyzeImage(request, env);
  const nanoBananaPlan = buildNanoBananaPlan(analysis, request);
  const transcript = await generateTranscript(analysis, nanoBananaPlan, request, env);
  const editedImageBase64 = await callNanoBanana(nanoBananaPlan, request.imageBase64, env);

  return {
    editedImageBase64,
    transcript,
    nanoBananaPlan,
    rawAnalysis: analysis,
  };
}

function assertRequest(request: ExplanationRequest): void {
  if (!request?.imageBase64) {
    throw new Error('runExplanation requires request.imageBase64 (base64 string without data URI prefix).');
  }
}

async function analyzeImage(request: ExplanationRequest, env: Env): Promise<ImageAnalysis> {
  const prompt = [
    'You are Explanation Mode planner.',
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

function buildNanoBananaPlan(analysis: ImageAnalysis, request: ExplanationRequest): NanoBananaPlan {
  if (analysis.mode === 'annotate') {
    return {
      mode: 'annotate',
      summary: 'Annotate directly on the uploaded page. Keep overlays tidy and do not cover original text.',
      pages: [
        {
          pageNumber: 1,
          title: 'Original worksheet annotated',
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
      title: `Expanded layout for question ${index + 1}`,
      instructions: [
        `Copy the question text: ${question.questionText}`,
        `Provide room for the answer: ${question.answerInstructions}`,
        `Add diagram guidance: ${question.diagramInstructions}`,
      ],
    })),
  };
}

async function generateTranscript(
  analysis: ImageAnalysis,
  nanoBananaPlan: NanoBananaPlan,
  request: ExplanationRequest,
  env: Env
): Promise<string> {
  const prompt = [
    'You are the Explanation Mode narrator.',
    'Write a clear, friendly transcript that references the Nano Banana plan when helpful.',
    'Encourage the learner and highlight where answers or diagrams will appear.',
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
  env: Env
): Promise<string> {
  console.log('[Explanation] Nano Banana mode:', plan.mode);

  // TODO: integrate the real Nano Banana API call using env.NANOBANANA_API_KEY
  // Example structure (uncomment and adjust when endpoint details are available):
  // const response = await fetch('https://api.nanobanana.ai/v1/explain', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     Authorization: `Bearer ${env.NANOBANANA_API_KEY}`,
  //   },
  //   body: JSON.stringify({ image_base64: originalImageBase64, plan }),
  // });
  // if (!response.ok) {
  //   throw new Error(`Nano Banana API error: ${response.status} ${response.statusText}`);
  // }
  // const result = await response.json() as { image_base64: string };
  // return result.image_base64;

  return originalImageBase64;
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

export type { ExplanationRequest as ExplanationRequestInput, ExplanationResponse as ExplanationResponseOutput };
