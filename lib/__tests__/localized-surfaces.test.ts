import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { en } from '../i18n/en';
import { es } from '../i18n/es';

/**
 * The surfaces the identity-theft flow actually passes through, with no English left behind.
 *
 * The gap this closes: choosing Español translated the body of every screen while the things
 * built imperatively or declared in a module-level constant stayed English -- the native
 * "Add document" / "Cancel" sheet the Documents row opens, the navigation header above the
 * interview and the upload modal, and the Settings field labels, whose translations already
 * existed in both resource files and simply were not being read.
 *
 * These are literal-source assertions rather than render assertions on purpose: the defect is
 * always "a word was written here instead of a key", and that is visible in the file.
 */

const read = (rel: string) => readFileSync(new URL(`../../${rel}`, import.meta.url).pathname, 'utf8');

const STORE = read('lib/documents-store.tsx');
const LAYOUT = read('app/_layout.tsx');
const SETTINGS = read('app/settings.tsx');

describe('the upload source sheet speaks the reader’s language', () => {
  it('titles and cancels through keys, not words', () => {
    expect(STORE).toContain("tr('upload.addDocument')");
    expect(STORE).toContain("tr('common.cancel')");
    expect(STORE).toContain("tr('upload.howToAdd')");
  });

  it('has no English literal left in the sheet or the photo-prep failure', () => {
    for (const literal of ["'Add document'", "text: 'Cancel'", 'prepare that photo']) {
      expect(`${literal}:${STORE.includes(literal)}`).toBe(`${literal}:false`);
    }
    expect(STORE).toContain("tr('upload.couldNotPreparePhoto')");
  });
});

describe('the header above the flow is translated', () => {
  it('keys the three screens this flow reaches', () => {
    expect(LAYOUT).toContain("title: t('upload.title')");
    expect(LAYOUT).toContain("title: t('interview.title')");
    expect(LAYOUT).toContain("title: t('settings.title')");
  });

  it('no longer hardcodes those three titles', () => {
    for (const literal of ["'Upload Document'", "'Identity Review'", "title: 'Settings'"]) {
      expect(`${literal}:${LAYOUT.includes(literal)}`).toBe(`${literal}:false`);
    }
  });
});

describe('Settings reads its own translations', () => {
  it('carries label KEYS in the field list, never words', () => {
    for (const key of [
      'settings.firstName',
      'settings.lastName',
      'settings.email',
      'settings.phone',
      'settings.city',
      'settings.state',
    ]) {
      expect(SETTINGS).toContain(`labelKey: '${key}'`);
      expect(`${key}:en:${key in en}`).toBe(`${key}:en:true`);
      expect(`${key}:es:${key in es}`).toBe(`${key}:es:true`);
    }
    expect(SETTINGS).toContain("placeholder={t('common.notSet')}");
  });

  it('does not reintroduce the English field words', () => {
    for (const literal of ["label: 'First name'", "placeholder: 'Not set'", "text: 'Sign out'"]) {
      expect(`${literal}:${SETTINGS.includes(literal)}`).toBe(`${literal}:false`);
    }
  });

  it('confirms sign-out in one language at a time', () => {
    expect(SETTINGS).toContain("t('settings.signOutConfirmTitle')");
    expect(SETTINGS).toContain("t('settings.signOutConfirmBody')");
    // Both branches of the destructive dialog, not just the button.
    expect(SETTINGS.includes("{ text: 'Cancel', style: 'cancel' }")).toBe(false);
  });
});

describe('every key these surfaces use resolves in both languages', () => {
  it('is present in en and es alike', () => {
    for (const key of [
      'upload.addDocument',
      'upload.howToAdd',
      'upload.couldNotPreparePhoto',
      'upload.title',
      'interview.title',
      'settings.title',
      'settings.signOut',
      'settings.signOutConfirmTitle',
      'settings.signOutConfirmBody',
      'common.cancel',
      'common.notSet',
    ]) {
      expect(`${key}:en:${key in en}`).toBe(`${key}:en:true`);
      expect(`${key}:es:${key in es}`).toBe(`${key}:es:true`);
    }
  });

  it('says the Spanish a reviewer can check by eye', () => {
    expect(es['upload.addDocument']).toBe('Agregar documento');
    expect(es['common.cancel']).toBe('Cancelar');
    expect(es['upload.title']).toBe('Subir documento');
    expect(String(es['settings.signOutConfirmTitle'])).toContain('Zoey');
  });

  it('addresses the reader as usted in the new strings', () => {
    for (const key of ['upload.couldNotPreparePhoto', 'settings.signOutConfirmBody']) {
      const value = String(es[key] ?? '');
      expect(`${key}:${/\btú\b|\btuyo\b|\btus\b/i.test(value)}`).toBe(`${key}:false`);
    }
  });
});

describe('the document vocabulary has no import cycle', () => {
  /*
   * Metro reported `document-copy -> interview-evidence-actions -> document-copy` at runtime. A
   * cycle is not a style problem here: whichever module the bundler evaluates second can see the
   * other's exports as undefined, so `DOCUMENT_ACTION_KEYS[action]` was one import-order change
   * away from throwing on a cold start.
   */
  const COPY = read('lib/document-copy.ts');
  const ACTIONS = read('lib/interview-evidence-actions.ts');
  const SLOT_ID = read('lib/slot-id.ts');

  it('takes the shared id helper from a leaf module, not from each other', () => {
    expect(COPY).toContain("from './slot-id'");
    expect(ACTIONS).toContain("from './slot-id'");
    expect(COPY.includes("from './interview-evidence-actions'")).toBe(false);
  });

  it('keeps that leaf module a leaf, so it cannot join a cycle', () => {
    expect(SLOT_ID).toContain('export function normalizeSlotId');
    expect(/^\s*import\s/m.test(SLOT_ID)).toBe(false);
  });
});
