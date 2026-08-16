import { requireApiBaseUrl } from '@/lib/api-config';
import { authenticatedFetch } from '@/lib/auth-fetch';

export type ChatAnswer = { message: string; groundedIn: string[]; needsHuman: boolean };

export async function askZoey(message: string): Promise<ChatAnswer> {
  const res = await authenticatedFetch(`${requireApiBaseUrl()}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    let detail = `Zoey could not answer (${res.status}).`;
    try {
      const body = (await res.json()) as { error?: string };
      detail = body.error ?? detail;
    } catch {}
    throw new Error(detail);
  }
  return (await res.json()) as ChatAnswer;
}
