/**
 * Minimal request/response shapes compatible with Vercel's Node runtime.
 *
 * Declared locally rather than pulling in `@vercel/node` -- these three fields
 * are all the handlers touch, and the dev server in `api/dev-server.ts` can
 * satisfy the same shape over plain `node:http`.
 */

export type ApiRequest = {
  method?: string;
  url?: string;
  query: Record<string, string | string[] | undefined>;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
};

export type ApiResponse = {
  status(code: number): ApiResponse;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
};

/** Native clients don't need CORS; this is here for the web target. */
export function applyCors(res: ApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/**
 * Handles CORS preflight and method mismatches.
 * Returns true when the request has been answered and the handler should stop.
 */
export function guard(req: ApiRequest, res: ApiResponse, allowed: string) {
  applyCors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).json(null);
    return true;
  }

  if (req.method !== allowed) {
    res.status(405).json({ error: `Method not allowed. Use ${allowed}.` });
    return true;
  }

  return false;
}

/** Body may arrive parsed (Vercel) or as a raw string (dev server). */
export function readBody<T>(body: unknown): Partial<T> {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as Partial<T>;
    } catch {
      return {};
    }
  }
  return body as Partial<T>;
}

export function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
