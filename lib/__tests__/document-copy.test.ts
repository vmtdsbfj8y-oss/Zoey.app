import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  DOCUMENT_ACTION_KEYS,
  MISSING_DETAIL_KEY,
  TRANSLATABLE_DOCUMENT_SLOTS,
  TRANSLATABLE_DOCUMENT_STATUSES,
  documentDetailFor,
  documentNameFor,
  slotNameKey,
  statusDetailKey,
} from '../document-copy';
import { en } from '../i18n/en';
import { es } from '../i18n/es';
import { SOURCE_LABEL_KEYS } from '../upload-sources';

/**
 * The checklist, in the reader's language.
 *
 * The gap this closes: the identity review was fully translated while the Documents screen it hands
 * off to was not, so a Spanish reader tapped "Subir" and landed on a list of English document names
 * with English buttons. Half a translation reads worse than none, because it looks like the app
 * lost track of who it was talking to.
 */

const t = (key: string) => `T(${key})`;

describe('names and statuses come from the id and the enum', () => {
  it('maps every slot this build knows to a key that exists in both languages', () => {
    for (const id of TRANSLATABLE_DOCUMENT_SLOTS) {
      const key = slotNameKey(id);
      expect(key, id).toBeTruthy();
      expect(`${id}:en:${key! in en}`).toBe(`${id}:en:true`);
      expect(`${id}:es:${key! in es}`).toBe(`${id}:es:true`);
    }
  });

  it('covers every slot the identity-theft case can require', () => {
    for (const id of ['FTC_IDENTITY_THEFT_REPORT', 'POLICE_REPORT', 'GOVERNMENT_ID', 'PROOF_OF_ADDRESS']) {
      expect(slotNameKey(id), id).toBeTruthy();
    }
  });

  it('maps every checklist status, and defaults to "nothing is in"', () => {
    for (const status of TRANSLATABLE_DOCUMENT_STATUSES) {
      const key = statusDetailKey(status);
      expect(`${status}:en:${key in en}`).toBe(`${status}:en:true`);
      expect(`${status}:es:${key in es}`).toBe(`${status}:es:true`);
    }
    expect(statusDetailKey('MISSING')).toBe(MISSING_DETAIL_KEY);
    expect(statusDetailKey(undefined)).toBe(MISSING_DETAIL_KEY);
    expect(MISSING_DETAIL_KEY in en && MISSING_DETAIL_KEY in es).toBe(true);
  });

  it('matches engine ids case-insensitively, as every other join does', () => {
    expect(slotNameKey(' police_report ')).toBe('documents.slot.policeReport');
    expect(statusDetailKey('accepted')).toBe('documents.detail.accepted');
  });
});

describe('an id or status this build has never seen falls back, never blanks', () => {
  it('renders the engine’s own label for an unknown slot', () => {
    expect(documentNameFor({ id: 'BRAND_NEW_SLOT', name: 'Engine label' }, t)).toBe('Engine label');
    expect(documentNameFor({ id: 'POLICE_REPORT', name: 'Engine label' }, t)).toBe('T(documents.slot.policeReport)');
  });

  it('renders the engine’s own sentence when there is no detail key', () => {
    expect(documentDetailFor({ detail: 'Engine sentence' }, t)).toBe('Engine sentence');
    expect(documentDetailFor({ detail: 'Engine sentence', detailKey: 'documents.detail.accepted' }, t)).toBe(
      'T(documents.detail.accepted)'
    );
  });
});

describe('one action vocabulary for both surfaces', () => {
  it('is defined once and resolves in both languages', () => {
    for (const key of Object.values(DOCUMENT_ACTION_KEYS)) {
      expect(`${key}:en:${key in en}`).toBe(`${key}:en:true`);
      expect(`${key}:es:${key in es}`).toBe(`${key}:es:true`);
    }
  });

  it('no longer keeps a second copy under the interview namespace', () => {
    for (const stale of ['interview.action.upload', 'interview.action.view', 'interview.action.replace']) {
      expect(`${stale}:${stale in en}`).toBe(`${stale}:false`);
      expect(`${stale}:${stale in es}`).toBe(`${stale}:false`);
    }
  });

  it('says Subir / Ver / Reemplazar in Spanish', () => {
    expect(es[DOCUMENT_ACTION_KEYS.UPLOAD]).toBe('Subir');
    expect(es[DOCUMENT_ACTION_KEYS.VIEW]).toBe('Ver');
    expect(es[DOCUMENT_ACTION_KEYS.REPLACE]).toBe('Reemplazar');
  });
});

describe('the checklist row renders no English literals of its own', () => {
  const ROW = readFileSync(new URL('../../components/documents/document-row.tsx', import.meta.url).pathname, 'utf8');

  it('translates the name, the status line and the action', () => {
    expect(ROW).toContain('documentNameFor(slot, t)');
    expect(ROW).toContain('documentDetailFor(slot, t)');
    expect(ROW).toContain('t(DOCUMENT_ACTION_KEYS.VIEW)');
    expect(ROW).toContain('DOCUMENT_ACTION_KEYS.REPLACE : DOCUMENT_ACTION_KEYS.UPLOAD');
  });

  it('has no hardcoded button or status words left', () => {
    for (const literal of [">Upload<", ">View<", "'Not accepted'", '"Didn\'t send"', "'Uploading…'", "'Preparing your photo…'"]) {
      expect(`${literal}:${ROW.includes(literal)}`).toBe(`${literal}:false`);
    }
  });

  it('offers Replace when the engine asked for another copy', () => {
    // The one outstanding status where something IS in and the consumer still has something to do.
    expect(ROW).toContain('slot.replaceRequested ? DOCUMENT_ACTION_KEYS.REPLACE');
  });

  it('keeps its accessibility labels on the translated name', () => {
    expect(ROW).toContain("t('a11y.uploadSlot', { values: { name } })");
    expect(ROW).toContain("t('a11y.viewSlot', { values: { name } })");
    expect(ROW).toContain("t('documents.a11yView', { values: { name } })");
  });
});

describe('the source sheet and the locked card are translated too', () => {
  it('names each upload source by key, in both languages', () => {
    for (const key of Object.values(SOURCE_LABEL_KEYS)) {
      expect(`${key}:en:${key in en}`).toBe(`${key}:en:true`);
      expect(`${key}:es:${key in es}`).toBe(`${key}:es:true`);
    }
    expect(es[SOURCE_LABEL_KEYS.camera]).toBe('Tomar foto');
  });

  it('does not leave the premium bullets as English literals', () => {
    const SCREEN = readFileSync(new URL('../../app/(tabs)/documents.tsx', import.meta.url).pathname, 'utf8');
    expect(SCREEN).toContain("t('documents.lockBullet1')");
    expect(SCREEN).not.toContain("'Upload, replace and review every document'");
  });
});

describe('the Spanish reads like a person wrote it', () => {
  it('addresses the reader as usted and never as tú', () => {
    for (const key of [...TRANSLATABLE_DOCUMENT_SLOTS.map(slotNameKey), 'documents.lockBullet1']) {
      const value = String(es[key as string] ?? '');
      expect(`${key}:${/\btú\b|\btuyo\b/i.test(value)}`).toBe(`${key}:false`);
    }
  });

  it('leaves brand names untranslated', () => {
    expect(String(es['documents.slot.identityiqCreditReport'])).toContain('IdentityIQ');
    expect(String(es['documents.slot.ftcIdentityTheftReport'])).toContain('FTC');
  });
});
