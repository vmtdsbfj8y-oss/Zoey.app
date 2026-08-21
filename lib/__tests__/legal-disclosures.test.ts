import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  LEGAL_DOCUMENTS,
  SIGNUP_ACCEPTED_DOCUMENTS,
  acceptanceIsCurrent,
  counselReviewItems,
  documentsRequiringPublicUrl,
  legalDocument,
  signupAcceptance,
} from '../legal';

const ROOT = join(__dirname, '..', '..');

/**
 * Walks the consumer-facing source. Excludes the legal documents themselves, because they QUOTE the
 * forbidden phrasings in order to correct them -- "no score increase is guaranteed" contains the
 * word "guaranteed", and a scan that cannot tell a disclaimer from a promise would fail on the very
 * text written to prevent the promise.
 */
function consumerSourceFiles(): string[] {
  const out: string[] = [];
  const skip = new Set(['node_modules', '.git', '.expo', 'dist', 'build', '__tests__', 'legal', 'docs', 'api']);
  (function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      if (skip.has(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
    }
  })(ROOT);
  return out;
}

/** Strips comments, so an explanation of a removed claim is not mistaken for the claim. */
function codeText(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');
}

describe('Legal & Privacy is reachable and real', () => {
  it('exposes every document the launch checklist requires', () => {
    const ids = LEGAL_DOCUMENTS.map((d) => d.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'privacy',
        'terms',
        'ai-disclosure',
        'credit-information',
        'dispute-services',
        'data-choices',
        'account-deletion',
        'contact',
      ])
    );
  });

  it('routes to a hub and a document viewer that exist on disk', () => {
    expect(statSync(join(ROOT, 'app', 'legal', 'index.tsx')).isFile()).toBe(true);
    expect(statSync(join(ROOT, 'app', 'legal', '[doc].tsx')).isFile()).toBe(true);
  });

  it('registers the legal routes OUTSIDE the signed-in guard, so the policy does not require an account', () => {
    const layout = readFileSync(join(ROOT, 'app', '_layout.tsx'), 'utf8');
    const protectedBlock = layout.slice(
      layout.indexOf('guard={Boolean(session)}'),
      layout.lastIndexOf('</Stack.Protected>')
    );
    expect(layout).toContain('name="legal/index"');
    expect(layout).toContain('name="legal/[doc]"');
    expect(protectedBlock).not.toContain('legal/');
  });

  it('links to Legal & Privacy from the signed-out sign-in screen', () => {
    const signIn = readFileSync(join(ROOT, 'app', 'sign-in.tsx'), 'utf8');
    expect(signIn).toContain("router.push('/legal')");
    expect(signIn).toContain("router.push('/legal/privacy')");
    expect(signIn).toContain("router.push('/legal/terms')");
  });

  it('reaches Legal & Privacy and Data choices from Settings', () => {
    const settings = readFileSync(join(ROOT, 'app', 'settings.tsx'), 'utf8');
    expect(settings).toContain("router.push('/legal')");
    expect(settings).toContain("router.push('/legal/data-choices')");
  });

  it('keeps account deletion reachable from Settings', () => {
    const settings = readFileSync(join(ROOT, 'app', 'settings.tsx'), 'utf8');
    expect(settings).toContain('confirmDeleteAccount');
    expect(settings).toContain('Delete account');
  });

  it('reaches the AI disclosure from the screen where the AI speaks', () => {
    expect(readFileSync(join(ROOT, 'app', 'chat.tsx'), 'utf8')).toContain(
      "router.push('/legal/ai-disclosure')"
    );
  });

  it('has no placeholder, lorem ipsum or empty section in any document', () => {
    for (const doc of LEGAL_DOCUMENTS) {
      expect(doc.sections.length, doc.id).toBeGreaterThan(0);
      expect(doc.version, doc.id).toMatch(/\S/);
      expect(doc.effective, doc.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const section of doc.sections) {
        expect(section.heading, doc.id).toMatch(/\S/);
        expect(section.body.length, `${doc.id}/${section.heading}`).toBeGreaterThan(0);
        for (const paragraph of section.body) {
          expect(paragraph.trim().length, `${doc.id}/${section.heading}`).toBeGreaterThan(0);
          expect(paragraph.toLowerCase()).not.toContain('lorem ipsum');
          expect(paragraph).not.toContain('TODO');
          expect(paragraph).not.toContain('TBD');
          expect(paragraph).not.toMatch(/\[.*(placeholder|insert|xxx).*\]/i);
        }
      }
    }
  });

  it('every section with no drafted content carries a counsel note explaining why', () => {
    for (const doc of LEGAL_DOCUMENTS) {
      for (const section of doc.sections) {
        const undrafted = section.body.some((p) => p.includes('has not been drafted'));
        if (undrafted) expect(section.counselNote, `${doc.id}/${section.heading}`).toBeTruthy();
      }
    }
  });
});

describe('AI disclosure states real limits and claims no authority', () => {
  const ai = legalDocument('ai-disclosure')!;
  const text = ai.sections.flatMap((s) => s.body).join(' ').toLowerCase();

  it('says AI output can be wrong and should be checked against the records', () => {
    expect(text).toContain('may be incomplete or inaccurate');
    expect(text).toContain('verified against the underlying records');
  });

  it('states what the AI does not do', () => {
    expect(text).toContain('does not generate an official credit score');
    expect(text).toContain('does not independently mail, sign, or approve disputes');
  });

  it('describes chat as informational', () => {
    expect(text).toContain('informational and explanatory');
  });

  it('claims no professional authority anywhere', () => {
    for (const forbidden of [
      'infallible',
      'certified legal advice',
      'always accurate',
      'never wrong',
      'guarantees accuracy',
    ]) {
      expect(text, forbidden).not.toContain(forbidden);
    }
    expect(text).toContain('not a law firm');
    expect(text).toContain('is not an attorney');
  });
});

describe('credit and dispute disclosures', () => {
  const credit = legalDocument('credit-information')!;
  const creditText = credit.sections.flatMap((s) => s.body).join(' ').toLowerCase();
  const dispute = legalDocument('dispute-services')!;
  const disputeText = dispute.sections.flatMap((s) => s.body).join(' ').toLowerCase();

  it('explains that Zoey’s numbers may differ from a lender’s', () => {
    expect(creditText).toContain('may differ from information or scores used by a lender');
    expect(creditText).toContain('scoring models');
  });

  it('rules out every guaranteed outcome', () => {
    expect(creditText).toContain('no score increase is guaranteed');
    expect(creditText).toContain('no deletion or removal of any item is guaranteed');
    expect(creditText).toContain('no credit approval is guaranteed');
    expect(creditText).toContain('no funding is guaranteed');
    expect(creditText).toContain('no timeline is guaranteed');
  });

  it('says stale or missing bureau information is labelled as such', () => {
    expect(creditText).toContain('out of date');
    expect(creditText).toContain('unavailable');
  });

  it('does not repeat the credit-repair myths', () => {
    expect(disputeText).toContain('not every collection account must be deleted');
    expect(disputeText).toContain('is not always legally required');
    expect(disputeText).toContain('does not automatically require deletion');
    expect(disputeText).toContain('not automatically a legal violation');
  });

  it('refuses to coach false claims and says outcomes depend on other parties', () => {
    expect(disputeText).toContain('does not manufacture facts');
    expect(disputeText).toContain('falsely claim fraud');
    expect(disputeText).toContain('results depend on the facts');
  });
});

describe('privacy disclosure matches the real data map', () => {
  const privacy = legalDocument('privacy')!;
  const text = privacy.sections.flatMap((s) => s.body).join(' ').toLowerCase();

  it('names every high-sensitivity category Zoey actually collects', () => {
    for (const item of [
      'credit report',
      'government-issued photo id',
      'social security card',
      'proof of address',
      'supporting evidence',
      'signatures and consents',
      'mailing information',
      'zoey chat content',
    ]) {
      expect(text, item).toContain(item);
    }
  });

  it('names the processors that actually receive data', () => {
    for (const processor of ['supabase', 'vercel', 'openai', 'lob']) {
      expect(text, processor).toContain(processor);
    }
  });

  it('never claims data is never shared', () => {
    for (const forbidden of [
      'never shared',
      'we never share',
      'is not shared with anyone',
      'no one else ever sees',
      'stays only on your device',
    ]) {
      expect(text, forbidden).not.toContain(forbidden);
    }
  });

  it('distinguishes using service providers from selling', () => {
    expect(text).toContain('does not sell your personal information');
    expect(text).toContain('not the same as selling your information');
  });

  it('does not promise that deletion erases everything forever', () => {
    for (const forbidden of [
      'erased forever',
      'every trace is removed',
      'completely erased',
      'permanently erased from everywhere',
    ]) {
      expect(text, forbidden).not.toContain(forbidden);
    }
    expect(text).toContain('a limited amount of information is kept after deletion');
  });

  it('makes no absolute security promise', () => {
    expect(text).toContain('no security measure is perfect');
  });
});

describe('account deletion language reflects the proven architecture', () => {
  const deletion = legalDocument('account-deletion')!;
  const text = deletion.sections.flatMap((s) => s.body).join(' ').toLowerCase();

  it('says where the button is', () => {
    expect(text).toContain('settings');
    expect(text).toContain('delete account');
  });

  it('names what is retained without exposing the internal mechanism', () => {
    expect(text).toContain('records of correspondence actually sent');
    expect(text).toContain('required to be retained by law');
    for (const internal of ['tombstone', 'hash', 'sha-256', 'subject hash', 'database id']) {
      expect(text, internal).not.toContain(internal);
    }
  });

  it('flags the retention wording for counsel', () => {
    const notes = counselReviewItems().filter((i) => i.documentId === 'account-deletion');
    expect(notes.length).toBeGreaterThan(0);
    expect(notes.map((n) => n.note).join(' ')).toContain('FOR COUNSEL REVIEW');
  });

  it('the Settings confirmation no longer promises total erasure', () => {
    const settings = readFileSync(join(ROOT, 'app', 'settings.tsx'), 'utf8');
    const dialogs = settings.slice(settings.indexOf('confirmDeleteAccount'));
    expect(dialogs).not.toContain('everything in it for good');
    expect(dialogs).toContain('kept afterwards');
  });
});

describe('counsel review and public URLs are tracked, not assumed', () => {
  it('leaves liability and governing law to a lawyer rather than inventing them', () => {
    const terms = legalDocument('terms')!;
    const liability = terms.sections.find((s) => s.heading.includes('Warranties'))!;
    const law = terms.sections.find((s) => s.heading.includes('Governing law'))!;
    expect(liability.counselNote).toContain('FOR COUNSEL REVIEW');
    expect(law.counselNote).toContain('FOR COUNSEL REVIEW');

    const text = terms.sections.flatMap((s) => s.body).join(' ').toLowerCase();
    for (const fabricated of ['arbitration', 'class action', 'exclusive jurisdiction', 'governed by the laws of']) {
      expect(text, fabricated).not.toContain(fabricated);
    }
  });

  it('never claims a disclaimer removes liability', () => {
    const all = LEGAL_DOCUMENTS.flatMap((d) => d.sections.flatMap((s) => s.body)).join(' ').toLowerCase();
    for (const forbidden of [
      'not liable for anything',
      'waive all rights',
      'you cannot sue',
      'eliminates all liability',
      'no liability whatsoever',
    ]) {
      expect(all, forbidden).not.toContain(forbidden);
    }
  });

  it('marks exactly the documents that need a public web URL', () => {
    expect(documentsRequiringPublicUrl().map((d) => d.id).sort()).toEqual([
      'contact',
      'privacy',
      'terms',
    ]);
  });

  it('derives the counsel list from the documents themselves', () => {
    const items = counselReviewItems();
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.note.trim().length).toBeGreaterThan(20);
      expect(legalDocument(item.documentId)).toBeTruthy();
    }
  });
});

describe('consent versioning', () => {
  it('asks for two acknowledgements, not one per document', () => {
    expect(SIGNUP_ACCEPTED_DOCUMENTS).toEqual(['terms', 'privacy']);
    expect(SIGNUP_ACCEPTED_DOCUMENTS.length).toBeLessThan(LEGAL_DOCUMENTS.length);
  });

  it('stamps the version in force, not just a timestamp', () => {
    const records = signupAcceptance(1_700_000_000_000);
    expect(records).toHaveLength(2);
    for (const record of records) {
      expect(record.version).toBe(legalDocument(record.documentId)!.version);
      expect(record.acceptedAt).toBe(1_700_000_000_000);
      expect(acceptanceIsCurrent(record)).toBe(true);
    }
  });

  it('detects an acceptance that predates a revision', () => {
    expect(
      acceptanceIsCurrent({ documentId: 'terms', version: 'terms-2020-01-01', acceptedAt: 0 })
    ).toBe(false);
  });

  it('requires the box before an account can be created', () => {
    const signIn = readFileSync(join(ROOT, 'app', 'sign-in.tsx'), 'utf8');
    expect(signIn).toContain("mode === 'create' && !acceptedLegal");
    expect(signIn).toContain('useState(false)');
  });

  it('records acceptance server-side, append-only, with a server-set timestamp', () => {
    const route = readFileSync(join(ROOT, 'api', 'profile.ts'), 'utf8');
    expect(route).toContain('legalAcceptance');
    expect(route).toContain('acceptedAt: Date.now()');
    expect(route).toContain('next.legalAcceptance = [...existing, ...additions]');
  });
});

describe('no guaranteed-result marketing survives in the consumer app', () => {
  const FORBIDDEN = [
    /\bguaranteed (score|deletion|removal|approval|result|outcome|increase)\b/i,
    /\bwe (will|can) (fix|repair) your credit\b/i,
    /\bguarantee(d)? to (remove|delete|raise|boost|increase)\b/i,
    /\b100% (confidential|secure|guaranteed|accurate)\b/i,
    /\bmaximum accuracy\b/i,
    /\bmilitary[- ]grade\b/i,
    /\bwe never share your (data|information)\b/i,
    /\berase[d]? forever\b/i,
  ];

  it('finds none of the prohibited claims in any consumer screen or component', () => {
    const offenders: string[] = [];
    for (const file of consumerSourceFiles()) {
      const text = codeText(file);
      for (const pattern of FORBIDDEN) {
        const match = pattern.exec(text);
        if (match) offenders.push(`${file.replace(ROOT, '')}: ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('scanned a meaningful number of files, so a passing result means something', () => {
    expect(consumerSourceFiles().length).toBeGreaterThan(30);
  });
});
