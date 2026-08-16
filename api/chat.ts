import { guard, readBody, type ApiRequest, type ApiResponse } from './_lib/http.js';
import { REQUIRED_DOC_IDS } from './_lib/pipeline.js';
import { requireUser } from './_lib/auth.js';
import { storeFor, type Store } from './_lib/store.js';

type ChatRequest = { message: string };
const clean = (value: unknown) => (typeof value === 'string' ? value.trim().slice(0, 1200) : '');

function scoreAnswer(scores: Awaited<ReturnType<Store['listScores']>>) {
  if (!scores.length) return 'I do not have a verified credit score from an analyzed report yet. I will never estimate or average one. Upload a current IdentityIQ report and, once score extraction is connected, each available bureau score will appear separately.';
  const latest = new Map<string, (typeof scores)[number]>();
  for (const score of scores) latest.set(score.bureau, score);
  return `Your latest verified scores are ${[...latest.values()].map((s) => `${s.bureau}: ${s.score}${s.model ? ` (${s.model})` : ''}`).join(', ')}. These came from your analyzed report; no scores were estimated or averaged.`;
}

function generalAnswer(message: string): string | null {
  if (/what is a dispute|how (does|do) dispute/i.test(message)) return 'A credit dispute asks a bureau or furnisher to investigate specific information you believe is inaccurate or incomplete. A dispute does not guarantee deletion. Zoey should identify the exact field, use supporting evidence, record when it was sent, and track the response.';
  if (/how long|deadline|30 days|response time/i.test(message)) return 'Many credit-report disputes are generally investigated within 30 days, but the exact deadline can change based on how and when the dispute was submitted and whether more information was supplied. I need the real sent date and recipient before giving you a case-specific deadline.';
  if (/guarantee|will .*delete|score.*increase|how many points/i.test(message)) return 'I cannot promise a deletion or a score increase. I can show what was disputed, the evidence used, the confirmed response, and any verified score change after a newer report is analyzed.';
  if (/utilization/i.test(message)) return 'Credit utilization is the portion of revolving credit limits currently reported as used. Lower utilization can help, but I need the balances and limits from your current report before making a personal recommendation.';
  if (/collection|charge.?off|late payment|inquir/i.test(message)) return 'I can explain that item and its dispute options, but I need it connected to your verified report and case record first. I will not assume an account is inaccurate or claim it was disputed without supporting records.';
  return null;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (guard(req, res, 'POST')) return;
  const user = await requireUser(req, res); if (!user) return;
  const store = storeFor(user.id);
  const message = clean(readBody<ChatRequest>(req.body).message);
  if (!message) return void res.status(400).json({ error: 'Ask Zoey a question first.' });
  const [profile, documents, goals, scores] = await Promise.all([store.getProfile(), store.listDocs(), store.listGoals(), store.listScores()]);
  const lower = message.toLowerCase();
  let answer: string | null = null;
  let groundedIn: string[] = [];
  let needsHuman = false;

  if (/score|fico|vantage|credit rating/.test(lower)) {
    answer = scoreAnswer(scores); groundedIn = ['verified score records'];
  } else if (/document|upload|missing|intake|resubmit/.test(lower)) {
    const received = new Set(documents.map((d) => d.slotId));
    const missing = REQUIRED_DOC_IDS.filter((id) => !received.has(id));
    answer = missing.length ? `I have ${documents.length} required document${documents.length === 1 ? '' : 's'} on file. I still need: ${missing.join(', ')}. I am reporting the intake record only; this does not mean the document contents were approved.` : 'All four required intake slots are filled: Social Security card, photo ID, proof of address, and credit report. This only confirms receipt; the current analyzer does not yet verify their contents.';
    groundedIn = ['document intake records'];
  } else if (/goal|home|car|vehicle|funding/.test(lower) && goals.length) {
    const active = goals.filter((g) => g.status === 'active');
    answer = active.length ? `You have ${active.length} active goal${active.length === 1 ? '' : 's'}: ${active.map((g) => g.title).join(', ')}.` : 'You do not have an active goal saved right now.';
    groundedIn = ['saved goals'];
  } else if (/subscription|payment|billing|plan/.test(lower)) {
    answer = 'Billing is not connected yet, so I cannot truthfully confirm a subscription or payment status.'; groundedIn = ['billing connection status'];
  } else if (generalAnswer(message)) {
    answer = generalAnswer(message); groundedIn = ['verified credit guidance'];
  } else if (/dispute|deleted|removed|bureau|experian|equifax|transunion|letter|round|update|status/.test(lower)) {
    answer = 'Your live dispute records are not connected to this app yet, so I cannot truthfully say that a letter was sent, a bureau responded, or an item was deleted. I can explain the dispute process, or you can request an owner update.';
    groundedIn = ['dispute connection status']; needsHuman = true;
  }
  if (!answer) {
    answer = `I do not have enough verified information to answer that safely${profile?.firstName ? `, ${profile.firstName}` : ''}. I can help with your documents, scores, goals, subscription, or general dispute questions. For a personal case update, request an owner review.`;
    needsHuman = true;
  }
  res.status(200).json({ message: answer, groundedIn, needsHuman });
}
