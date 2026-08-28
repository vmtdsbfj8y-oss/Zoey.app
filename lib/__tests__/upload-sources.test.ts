import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';

import {
  permissionDeniedMessage,
  SOURCE_LABEL_KEYS,
  slotOffersPhotos,
  sourcesForSlot,
} from '@/lib/upload-sources';

/**
 * THE OPTIMIZER NEEDS A DOOR WITH A HANDLE.
 *
 * Documents only opened the iOS Files picker, so everything built to make a phone photo of an ID fit
 * under 4 MB was unreachable: the only thing realistically pickable from Files is a PDF, which is
 * correctly never optimized. The feature existed and could not be used.
 *
 * A credit report is the opposite case. It is exported, not photographed, and a camera picture of
 * one is a document the pipeline cannot read -- so offering a camera there would invite the failure.
 */

describe('which sources a slot offers', () => {
  it('offers all three for documents you physically hold', () => {
    for (const slot of ['GOVERNMENT_ID', 'SOCIAL_SECURITY_CARD', 'PROOF_OF_ADDRESS', 'SUPPORTING_EVIDENCE']) {
      expect(sourcesForSlot(slot), slot).toEqual(['camera', 'library', 'files']);
      expect(slotOffersPhotos(slot), slot).toBe(true);
    }
  });

  it('never offers a camera for the credit report', () => {
    for (const slot of ['IDENTITYIQ_CREDIT_REPORT', 'CREDIT_REPORT']) {
      expect(sourcesForSlot(slot), slot).toEqual(['files']);
      expect(slotOffersPhotos(slot), slot).toBe(false);
    }
  });

  /*
   * The identity-theft pair splits on how the document reaches the person, not on how important it
   * is. A police report is paper across a counter; the FTC report is a PDF IdentityTheft.gov emails.
   * Photographing the second would be a worse copy of a file they already hold.
   */
  it('lets a police report be photographed, because paper is how it arrives', () => {
    expect(sourcesForSlot('POLICE_REPORT')).toEqual(['camera', 'library', 'files']);
    expect(slotOffersPhotos('POLICE_REPORT')).toBe(true);
  });

  it('keeps the FTC identity theft report file-only, because it is a generated PDF', () => {
    expect(sourcesForSlot('FTC_IDENTITY_THEFT_REPORT')).toEqual(['files']);
    expect(slotOffersPhotos('FTC_IDENTITY_THEFT_REPORT')).toBe(false);
  });

  /* A slot nobody has considered gets the safe treatment, not the permissive one. */
  it('defaults an unrecognised slot to files only', () => {
    expect(sourcesForSlot('SOMETHING_NEW')).toEqual(['files']);
    expect(sourcesForSlot('')).toEqual(['files']);
  });

  it('matches the engine ids case-insensitively and ignores stray spacing', () => {
    expect(sourcesForSlot(' government_id ')).toEqual(['camera', 'library', 'files']);
  });

  it('labels the sources in plain words', () => {
    expect(SOURCE_LABEL_KEYS.camera).toBe('upload.sourceCamera');
    expect(SOURCE_LABEL_KEYS.library).toBe('upload.sourceLibrary');
    expect(SOURCE_LABEL_KEYS.files).toBe('upload.sourceFiles');
  });
});

describe('a refused permission', () => {
  it('says what it was for and what still works', () => {
    for (const source of ['camera', 'library'] as const) {
      const message = permissionDeniedMessage(source);
      expect(message, source).toContain('Choose File');
      expect(message, source).toContain('Settings');
    }
    expect(permissionDeniedMessage('camera')).toContain('camera');
    expect(permissionDeniedMessage('library')).toContain('photo');
  });

  it('does not scold or ask again', () => {
    for (const source of ['camera', 'library'] as const) {
      const message = permissionDeniedMessage(source);
      expect(message).not.toMatch(/must|required|please allow|you need to/i);
    }
  });
});

describe('the flow wires the sources correctly', () => {
  const STORE = readFileSync(new URL('../documents-store.tsx', import.meta.url).pathname, 'utf8');
  const DOCS = readFileSync(new URL('../mobile-documents.ts', import.meta.url).pathname, 'utf8');

  it('asks for a source before opening any picker', () => {
    expect(STORE.indexOf('sourcesForSlot(slotId)')).toBeLessThan(STORE.indexOf('await pickFromCamera()'));
    expect(STORE.indexOf('sourcesForSlot(slotId)')).toBeLessThan(STORE.indexOf('await pickDocument()'));
  });

  it('does not ask when there is only one source', () => {
    expect(STORE).toContain('sources.length === 1 ? sources[0] : await askUploadSource(sources)');
  });

  it('routes each source to its own picker', () => {
    expect(STORE).toContain('await pickFromCamera()');
    expect(STORE).toContain('await pickFromLibrary()');
    expect(STORE).toContain('await pickDocument()');
  });

  it('every source lands in the same optimize-then-upload path', () => {
    // One plan, one optimizer, one uploader, after the branch that chose the source.
    expect(STORE.indexOf('const picked =')).toBeLessThan(STORE.indexOf('planImageOptimization({'));
    expect(STORE.match(/planImageOptimization\(\{/g) ?? []).toHaveLength(1);
    expect(STORE.match(/uploadDocumentToEngine\(slotId/g) ?? []).toHaveLength(1);
  });

  it('a denied permission ends the attempt with an explanation, not a picker', () => {
    expect(STORE).toContain("picked.state === 'denied'");
    expect(STORE).toContain('permissionDeniedMessage(picked.source)');
  });

  it('asks permission through the Expo API and honours the answer', () => {
    expect(DOCS).toContain('requestCameraPermissionsAsync');
    expect(DOCS).toContain('requestMediaLibraryPermissionsAsync');
    expect(DOCS).toContain('if (!permission.granted) return { state: \'denied\', source };');
  });

  /*
   * The picker's own `quality` would re-encode before anything measured the file, and shrinking
   * twice is how a legible ID becomes an unreadable one. The ladder owns that decision.
   */
  it('takes the photo at full resolution and lets the optimizer decide', () => {
    expect(DOCS).toContain('quality: 1');
    expect(DOCS).toContain("mediaTypes: ['images']");
    expect(DOCS).toContain('exif: false');
  });
});
