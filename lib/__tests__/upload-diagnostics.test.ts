import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  extensionOnly,
  recordUploadDiagnostic,
  resetUploadDiagnostics,
  uploadDiagnostics,
  uriScheme,
} from '@/lib/upload-diagnostics';

/**
 * A TRACE THAT CANNOT CARRY A PERSON'S DETAILS.
 *
 * This exists because an optimized photo "didn't send" on a real device and every layer fails the
 * same way from the screen. A trace that leaked a filename or a cache path would trade one problem
 * for a worse one -- a document's filename is very often somebody's name.
 */

beforeEach(() => resetUploadDiagnostics());

describe('a URI is reduced to its scheme', () => {
  it('keeps the scheme and nothing after it', () => {
    expect(uriScheme('file:///var/mobile/Containers/Data/Application/ABC/tmp/Jane-Doe-licence.jpg')).toBe('file');
    expect(uriScheme('ph://A1B2C3/Jane.HEIC')).toBe('ph');
    expect(uriScheme('content://media/external/images/1')).toBe('content');
  });

  it('never returns any part of the path', () => {
    const uri = 'file:///cache/Jane-Doe-passport.jpg';
    expect(uriScheme(uri)).not.toContain('Jane');
    expect(uriScheme(uri)).not.toContain('passport');
    expect(uriScheme(uri)).not.toContain('/');
  });

  it('says so when there is nothing to read', () => {
    expect(uriScheme(null)).toBe('none');
    expect(uriScheme('')).toBe('none');
    expect(uriScheme('/tmp/relative.jpg')).toBe('relative');
  });
});

describe('a filename is reduced to its extension', () => {
  it('keeps the extension and nothing else', () => {
    expect(extensionOnly('Jane Doe drivers licence.HEIC')).toBe('heic');
    expect(extensionOnly('social-security-card.pdf')).toBe('pdf');
  });

  it('never returns the name itself', () => {
    expect(extensionOnly('Jane-Doe.jpg')).not.toContain('Jane');
  });

  it('does not invent an extension where there is none', () => {
    expect(extensionOnly('IMG_0001')).toBe('none');
    expect(extensionOnly(null)).toBe('none');
  });
});

describe('the recorded trace', () => {
  it('captures the steps in order', () => {
    recordUploadDiagnostic({ step: 'picked', sizeBytes: 5_500_000, extension: 'heic' });
    recordUploadDiagnostic({ step: 'plan', detail: 'optimize' });
    recordUploadDiagnostic({ step: 'optimized', sizeBytes: 2_100_000, uriScheme: 'file' });
    recordUploadDiagnostic({ step: 'response', httpStatus: 200 });

    expect(uploadDiagnostics().map((e) => e.step)).toEqual(['picked', 'plan', 'optimized', 'response']);
  });

  it('logs one sanitized line per step', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    recordUploadDiagnostic({ step: 'form-built', uriScheme: 'file', extension: 'jpg', mimeType: 'image/jpeg' });
    expect(log).toHaveBeenCalledTimes(1);
    const line = String(log.mock.calls[0][0]);
    expect(line).toContain('[zoey-upload] form-built');
    expect(line).toContain('ext=jpg');
    expect(line).toContain('mime=image/jpeg');
    log.mockRestore();
  });

  it('is bounded, so a long session cannot grow without limit', () => {
    for (let i = 0; i < 200; i++) recordUploadDiagnostic({ step: 'optimize-step', detail: `n${i}` });
    expect(uploadDiagnostics().length).toBeLessThanOrEqual(60);
  });

  /*
   * The type has no field that could carry one, which is the actual protection -- this asserts the
   * shape rather than trusting every future call site to be careful.
   */
  it('has no field capable of carrying a name, token or identifier', () => {
    const allowed = ['step', 'detail', 'sizeBytes', 'uriScheme', 'extension', 'mimeType', 'httpStatus'];
    recordUploadDiagnostic({ step: 'picked', detail: 'x', sizeBytes: 1, uriScheme: 'file', extension: 'jpg', mimeType: 'image/jpeg', httpStatus: 200 });
    const recorded = uploadDiagnostics()[0];
    for (const key of Object.keys(recorded)) {
      expect(allowed.concat('at')).toContain(key);
    }
  });
});
