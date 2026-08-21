import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  LEGAL_DOCUMENTS,
  PLANNED_SUPPORT_URL,
  SUPPORT_EMAIL,
  SUPPORT_URL_IS_LIVE,
  legalDocument,
  supportMailto,
} from '../legal';

const ROOT = join(__dirname, '..', '..');
const OFFICIAL = 'info@pinnaclecapitalusa.com';

function textOf(id: Parameters<typeof legalDocument>[0]): string {
  return legalDocument(id)!.sections.flatMap((s) => s.body).join(' ');
}

function contactSections(id: Parameters<typeof legalDocument>[0]) {
  return legalDocument(id)!.sections.filter((s) => s.contactEmail);
}

/** Consumer-facing source, excluding tests and docs. */
function consumerSourceFiles(): string[] {
  const out: string[] = [];
  const skip = new Set(['node_modules', '.git', '.expo', 'dist', 'build', '__tests__', 'docs']);
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

describe('the official support address is the one that ships', () => {
  it('is the Pinnacle address, defined once', () => {
    expect(SUPPORT_EMAIL).toBe(OFFICIAL);
  });

  it('builds a mailto with a subject so replies arrive labelled', () => {
    const url = supportMailto('Zoey — Privacy Policy');
    expect(url.startsWith(`mailto:${OFFICIAL}?subject=`)).toBe(true);
    expect(decodeURIComponent(url.split('subject=')[1])).toBe('Zoey — Privacy Policy');
  });

  it('appears on Contact & Support as both prose and a tappable action', () => {
    expect(textOf('contact')).toContain(OFFICIAL);
    expect(contactSections('contact').map((s) => s.contactEmail)).toContain(OFFICIAL);
  });

  it('gives the Privacy Policy a real contact path for data requests', () => {
    const text = textOf('privacy');
    expect(text).toContain(OFFICIAL);
    expect(text.toLowerCase()).toContain('ask for a copy of it');
    expect(contactSections('privacy').length).toBeGreaterThan(0);
  });

  it('gives Data & Privacy Choices a real contact path', () => {
    const text = textOf('data-choices');
    expect(text).toContain(OFFICIAL);
    expect(contactSections('data-choices').map((s) => s.contactEmail)).toContain(OFFICIAL);
  });

  it('puts the contact in the Terms', () => {
    expect(textOf('terms')).toContain(OFFICIAL);
    expect(contactSections('terms').map((s) => s.contactEmail)).toContain(OFFICIAL);
  });

  it('offers the contact for questions about deletion and retained information', () => {
    const deletion = legalDocument('account-deletion')!;
    const section = deletion.sections.find((s) => s.heading === 'Questions about deletion')!;
    expect(section.contactEmail).toBe(OFFICIAL);
    expect(section.body.join(' ')).toContain('what is kept afterwards');
  });

  it('does not repeat the address on every legal page', () => {
    const carrying = LEGAL_DOCUMENTS.filter((d) =>
      d.sections.some((s) => s.contactEmail)
    ).map((d) => d.id);
    expect(carrying).toEqual(
      expect.arrayContaining(['contact', 'privacy', 'data-choices', 'terms', 'account-deletion'])
    );
    /* The three explanatory disclosures route to in-app channels instead. */
    expect(carrying).not.toContain('ai-disclosure');
    expect(carrying).not.toContain('credit-information');
    expect(carrying).not.toContain('dispute-services');
  });
});

describe('in-app deletion stays the primary path', () => {
  it('never tells a consumer to email in order to delete their account', () => {
    const choices = textOf('data-choices').toLowerCase();
    expect(choices).toContain('does not require emailing anyone');

    const deletion = textOf('account-deletion').toLowerCase();
    expect(deletion).toContain('you do not need to email anyone in order to delete your account');
    /*
     * Matches an INSTRUCTION to write in, not the disclaimer that you need not.
     *
     * A looser pattern flagged "you do not need to email anyone in order to delete your account" --
     * the very sentence protecting the in-app flow. `[^.]` keeps each match inside one sentence so
     * a nearby support address cannot be read as an instruction to use it.
     */
    for (const instruction of [
      /\bemail (us|support|pinnacle)[^.]{0,60}\bto (delete|close) your account\b/,
      /\bcontact (us|support|pinnacle)[^.]{0,60}\bto (delete|close) your account\b/,
      /\bto delete your account[^.]{0,30}\b(email|contact) (us|support|pinnacle)\b/,
    ]) {
      expect(deletion, String(instruction)).not.toMatch(instruction);
    }
  });

  it('keeps the Delete Account control in Settings', () => {
    const settings = readFileSync(join(ROOT, 'app', 'settings.tsx'), 'utf8');
    expect(settings).toContain('confirmDeleteAccount');
    expect(settings).toContain('deleteAccount()');
    expect(settings).toContain('Delete account');
  });
});

describe('signed-out consumers can reach support and the legal documents', () => {
  it('registers the legal routes outside the signed-in guard', () => {
    const layout = readFileSync(join(ROOT, 'app', '_layout.tsx'), 'utf8');
    const guarded = layout.slice(
      layout.indexOf('guard={Boolean(session)}'),
      layout.lastIndexOf('</Stack.Protected>')
    );
    expect(layout).toContain('name="legal/index"');
    expect(layout).toContain('name="legal/[doc]"');
    expect(guarded).not.toContain('legal/');
  });

  it('links to Legal & Privacy, the policy and the terms from the signed-out screen', () => {
    const signIn = readFileSync(join(ROOT, 'app', 'sign-in.tsx'), 'utf8');
    for (const route of ["/legal'", "/legal/privacy'", "/legal/terms'"]) {
      expect(signIn, route).toContain(`router.push('${route.replace(/'$/, '')}')`);
    }
  });

  it('shows the support address on the hub itself, which needs no account', () => {
    const hub = readFileSync(join(ROOT, 'app', 'legal', 'index.tsx'), 'utf8');
    expect(hub).toContain('SUPPORT_EMAIL');
    expect(hub).toContain('supportMailto');
  });

  it('renders the address as a mailto action, with a fallback when no mail app exists', () => {
    const viewer = readFileSync(join(ROOT, 'app', 'legal', '[doc].tsx'), 'utf8');
    expect(viewer).toContain('supportMailto');
    expect(viewer).toContain('Linking.canOpenURL');
    /* A device with no mail client must still be able to read the address. */
    expect(viewer).toContain('No email app is set up on this device');
  });
});

describe('the website URL is recorded but never rendered as a link', () => {
  it('is marked not live, because the domain serves a construction page on every path', () => {
    expect(SUPPORT_URL_IS_LIVE).toBe(false);
    expect(PLANNED_SUPPORT_URL).toBe('https://pinnaclecapitalusa.com/support');
  });

  it('renders no pinnaclecapitalusa.com link anywhere in the consumer app', () => {
    const offenders: string[] = [];
    for (const file of consumerSourceFiles()) {
      const code = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/^\s*\/\/.*$/gm, ' ');
      /* The constant's own definition is the one permitted mention. */
      if (file.endsWith(join('lib', 'legal', 'contact.ts'))) continue;
      if (/https?:\/\/(www\.)?pinnaclecapitalusa\.com/.test(code)) {
        offenders.push(file.replace(ROOT, ''));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('never passes the planned URL to a link opener', () => {
    for (const file of consumerSourceFiles()) {
      const code = readFileSync(file, 'utf8');
      expect(code, file).not.toMatch(/openURL\(\s*PLANNED_SUPPORT_URL/);
      expect(code, file).not.toMatch(/Linking\.openURL\(\s*['"]https?:\/\/(www\.)?pinnaclecapitalusa/);
    }
  });

  it('documents the planned URL as PENDING for App Store work', () => {
    const worksheet = readFileSync(join(ROOT, 'docs', 'app-store-privacy-worksheet.md'), 'utf8');
    expect(worksheet).toContain('https://pinnaclecapitalusa.com/support');
    expect(worksheet).toContain(OFFICIAL);
    /*
     * Intent, not a literal. The status vocabulary changed once the site was actually built
     * ("PENDING PUBLIC PINNACLE WEBSITE" became "AWAITING DNS CUTOVER"), and pinning the old exact
     * string made an accurate documentation update look like a regression. What must stay true is
     * that the canonical URLs are NOT presented as ready, and that the catch-all trap is recorded.
     */
    expect(worksheet).toMatch(/PENDING|AWAITING DNS CUTOVER/);
    expect(worksheet).not.toMatch(/Support URL \|[^|]*\| \*\*READY\*\*/);
    expect(worksheet).not.toMatch(/Privacy Policy URL \|[^|]*\| \*\*(READY|COMPLETE)\*\*/);
    /* The trap this documentation exists to prevent. */
    expect(worksheet).toContain('HTTP 200 on every path');

    const website = readFileSync(join(ROOT, 'docs', 'pinnacle-website-requirements.md'), 'utf8');
    expect(website).toContain('PENDING');
    expect(website).toContain(OFFICIAL);
  });
});

describe('no placeholder support contact survives', () => {
  const FORBIDDEN = [
    /@example\.(com|org)/i,
    /support@example/i,
    /@gmail\.com/i,
    /@yahoo\.(com|co\.uk)/i,
    /@hotmail\.com/i,
    /\bsupport unavailable\b/i,
    /\bcontact coming soon\b/i,
    /\bTODO\b[^\n]{0,40}\b(support|email|contact)\b/i,
    /\b(support email|contact address)[^\n]{0,40}\bbeing set up\b/i,
    /\bwill be listed here once (it is|they are) live\b/i,
  ];

  it('finds no placeholder contact in consumer source', () => {
    const offenders: string[] = [];
    for (const file of consumerSourceFiles()) {
      const code = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/^\s*\/\/.*$/gm, ' ');
      for (const pattern of FORBIDDEN) {
        const match = pattern.exec(code);
        if (match) offenders.push(`${file.replace(ROOT, '')}: ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('every email rendered to a consumer is the official one', () => {
    const found = new Set<string>();
    for (const doc of LEGAL_DOCUMENTS) {
      for (const section of doc.sections) {
        for (const paragraph of [...section.body, section.counselNote ?? '']) {
          for (const match of paragraph.matchAll(/[\w.%+-]+@[\w.-]+\.\w{2,}/g)) found.add(match[0]);
        }
        if (section.contactEmail) found.add(section.contactEmail);
      }
    }
    expect([...found]).toEqual([OFFICIAL]);
  });

  it('no counsel note leaks internal detail, because they render in the app', () => {
    /*
     * These notes are visible to the consumer, not just to us. An early draft named an internal
     * document path and described submission planning inside one of them.
     */
    const offenders: string[] = [];
    for (const doc of LEGAL_DOCUMENTS) {
      for (const section of doc.sections) {
        const note = section.counselNote;
        if (!note) continue;
        for (const pattern of [
          /docs\/[\w-]+\.md/i,
          /\b[\w-]+\.(ts|tsx|json)\b/i,
          /\bApp Store Connect\b/i,
          /\bMD5\b|\bHTTP \d{3}\b/i,
        ]) {
          const match = pattern.exec(note);
          if (match) offenders.push(`${doc.id}/${section.heading}: ${match[0]}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('scanned enough files for a pass to mean something', () => {
    expect(consumerSourceFiles().length).toBeGreaterThan(30);
  });
});
