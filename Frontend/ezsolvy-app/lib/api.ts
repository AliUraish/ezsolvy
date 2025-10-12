export const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN || 'http://localhost:8787';

export class AppError extends Error {
  status: number;
  details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
  }
}

function mapStatusToMessage(status: number, fallback: string): string {
  if (status === 413) return 'Your image is over 6MB. Please compress and retry.';
  if (status === 400) return fallback || 'Invalid request. Please check your inputs.';
  if (status === 401 || status === 403) return 'Authentication not set up in dev yet.';
  if (status === 404) return 'Not found.';
  if (status >= 500) return 'Something went wrong. Please try again.';
  return fallback || 'Request failed.';
}

async function handleError(response: Response): Promise<never> {
  let message = response.statusText || 'Request failed';
  let details: any = undefined;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      const data = await response.json();
      details = data;
      if (typeof data?.error === 'string') message = data.error;
      else if (typeof data?.message === 'string') message = data.message;
    } catch {
      // ignore
    }
  } else {
    try {
      const text = await response.text();
      if (text) details = { raw: text };
    } catch {
      // ignore
    }
  }

  throw new AppError(mapStatusToMessage(response.status, message), response.status, details);
}

export async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_ORIGIN}${path}`, {
    ...init,
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) return handleError(res);
  return (await res.json()) as T;
}

export async function postJson<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_ORIGIN}${path}`, {
    ...init,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return handleError(res);
  return (await res.json()) as T;
}


