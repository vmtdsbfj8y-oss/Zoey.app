import { requireEngineBaseUrl } from '@/lib/api-config';
import { authenticatedFetch } from '@/lib/auth-fetch';

/**
 * Zoey's chat, against the engine.
 *
 * The previous version POSTed to `/api/chat`, a route that does not exist on the engine and never
 * has -- every message came back a 404 and was rendered to the client as a chat bubble containing
 * the error text. This points at the real endpoint, and carries the conversation so a follow-up
 * question means something.
 *
 * Nothing about the client's identity travels in the body. The engine decides whose file is being
 * discussed from the verified session alone, so there is no field here that could name anyone.
 */

export type ChatAction = { label: string; target: 'scores' | 'disputes' | 'documents' | 'dashboard' | 'run' };
export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export type ChatAnswer = { message: string; actions: ChatAction[] };

export type ChatOpening = {
  firstName: string | null;
  suggestions: string[];
  hasReport: boolean;
  analysisState: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE' | 'NEEDS_ATTENTION';
};

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

/** The opening state: a name to greet them by, and suggestions their own file supports. */
export async function getChatOpening(): Promise<ChatOpening | null> {
  try {
    const res = await authenticatedFetch(`${requireEngineBaseUrl()}/api/mobile/chat`);
    if (!res.ok) return null;
    const body = (await res.json()) as { ok?: boolean } & ChatOpening;
    return body.ok ? { firstName: body.firstName, suggestions: body.suggestions ?? [], hasReport: body.hasReport, analysisState: body.analysisState } : null;
  } catch {
    // A greeting that cannot load is not an error worth showing. The screen falls back to neutral.
    return null;
  }
}

export async function askZoey(message: string, history: ChatTurn[]): Promise<ChatAnswer> {
  const res = await authenticatedFetch(`${requireEngineBaseUrl()}/api/mobile/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  });

  if (!res.ok) {
    throw new Error(await readError(res, "I'm having trouble answering right now. Please try again shortly."));
  }

  const body = (await res.json()) as { ok?: boolean; message?: string; actions?: ChatAction[] };
  if (!body.ok || !body.message) throw new Error("I couldn't put an answer together just then. Try asking again.");
  return { message: body.message, actions: body.actions ?? [] };
}
