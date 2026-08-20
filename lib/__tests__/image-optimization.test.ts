import { describe, expect, it, vi } from 'vitest';

const manipulate = vi.hoisted(() => vi.fn());
vi.mock('expo-image-manipulator', () => ({
  manipulateAsync: (...args: unknown[]) => manipulate(...args),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));

import {
  isOptimizableImage,
  optimizeImageForUpload,
  planImageOptimization,
  stillTooLargeMessage,
  withJpegExtension,
} from '@/lib/image-optimization';
import { MAX_UPLOAD_BYTES } from '@/lib/documents-data';

/**
 * WHAT MAY BE RE-ENCODED, AND WHAT MAY NEVER BE.
 *
 * A phone photo of a licence routinely exceeds the 4 MB ceiling, and "choose a smaller file" is not
 * something a person can act on when the file is the photo they just took. A credit report is the
 * opposite case entirely: its bytes are the evidence, and it must arrive exactly as it left.
 *
 * Every file, name and size here is invented.
 */

const MB = 1024 * 1024;
const OVERSIZED = 6 * MB;

describe('only images, and only when they are too big', () => {
  it('leaves a PDF alone however large it is', () => {
    expect(
      planImageOptimization({ mimeType: 'application/pdf', name: 'report.pdf', sizeBytes: 40 * MB, maxBytes: MAX_UPLOAD_BYTES })
    ).toEqual({ action: 'UPLOAD_ORIGINAL', reason: 'NOT_AN_IMAGE' });
  });

  it('leaves the IdentityIQ report alone, by type and by extension', () => {
    for (const file of [
      { mimeType: 'application/pdf', name: 'identityiq-report.pdf' },
      { mimeType: 'text/html', name: 'identityiq-export.html' },
      // Even with no MIME type at all, the extension keeps it out.
      { mimeType: null, name: 'credit-report.pdf' },
    ]) {
      expect(
        planImageOptimization({ ...file, sizeBytes: OVERSIZED, maxBytes: MAX_UPLOAD_BYTES }).action,
        file.name
      ).toBe('UPLOAD_ORIGINAL');
    }
  });

  it('uploads an image that already fits, untouched', () => {
    expect(
      planImageOptimization({ mimeType: 'image/jpeg', name: 'id.jpg', sizeBytes: 2 * MB, maxBytes: MAX_UPLOAD_BYTES })
    ).toEqual({ action: 'UPLOAD_ORIGINAL', reason: 'WITHIN_LIMIT' });
  });

  it('treats a file exactly at the limit as fitting', () => {
    expect(
      planImageOptimization({ mimeType: 'image/jpeg', name: 'id.jpg', sizeBytes: MAX_UPLOAD_BYTES, maxBytes: MAX_UPLOAD_BYTES })
    ).toMatchObject({ action: 'UPLOAD_ORIGINAL' });
  });

  it('does not re-encode a file nobody measured', () => {
    expect(
      planImageOptimization({ mimeType: 'image/jpeg', name: 'id.jpg', sizeBytes: null, maxBytes: MAX_UPLOAD_BYTES })
    ).toEqual({ action: 'UPLOAD_ORIGINAL', reason: 'SIZE_UNKNOWN' });
  });

  it('optimizes an oversized photo of every supported kind', () => {
    for (const mimeType of ['image/jpeg', 'image/png', 'image/heic', 'image/heif']) {
      expect(
        planImageOptimization({ mimeType, name: 'photo', sizeBytes: OVERSIZED, maxBytes: MAX_UPLOAD_BYTES }).action,
        mimeType
      ).toBe('OPTIMIZE');
    }
  });

  it('recognises a photo by extension when the picker reports no type', () => {
    expect(isOptimizableImage({ mimeType: null, name: 'IMG_0421.HEIC' })).toBe(true);
    expect(isOptimizableImage({ mimeType: null, name: 'statement.pdf' })).toBe(false);
  });

  it('takes the limit from its caller and defines none of its own', () => {
    const source = new URL('../image-optimization.ts', import.meta.url).pathname;
    const text = require('fs').readFileSync(source, 'utf8');
    expect(text).not.toMatch(/=\s*4\s*\*\s*1024\s*\*\s*1024/);
    expect(text).toContain('maxBytes');
  });
});

describe('the ladder resizes before it degrades', () => {
  const plan = planImageOptimization({ mimeType: 'image/jpeg', name: 'id.jpg', sizeBytes: OVERSIZED, maxBytes: MAX_UPLOAD_BYTES });

  it('tries the widest, highest-quality step first', () => {
    if (plan.action !== 'OPTIMIZE') throw new Error('expected a plan');
    expect(plan.steps[0]).toEqual({ maxEdgePixels: 2400, quality: 0.85 });
  });

  it('narrows resolution and quality together, and stops at a readable floor', () => {
    if (plan.action !== 'OPTIMIZE') throw new Error('expected a plan');
    const edges = plan.steps.map((s) => s.maxEdgePixels);
    const qualities = plan.steps.map((s) => s.quality);
    expect(edges).toEqual([...edges].sort((a, b) => b - a));
    expect(qualities).toEqual([...qualities].sort((a, b) => b - a));
    // An ID at 1600px on the long edge is legible; nothing below it is attempted.
    expect(Math.min(...edges)).toBeGreaterThanOrEqual(1600);
    expect(Math.min(...qualities)).toBeGreaterThanOrEqual(0.7);
  });

  it('resizes proportionally: width only, never a forced height, never a crop', async () => {
    manipulate.mockResolvedValue({ uri: 'file:///cache/out.jpg' });
    await optimizeImageForUpload({
      uri: 'file:///photo.heic',
      name: 'IMG_1.HEIC',
      plan,
      maxBytes: MAX_UPLOAD_BYTES,
      readSize: async () => 1 * MB,
    });
    const [, actions, options] = manipulate.mock.calls[0];
    expect(actions).toEqual([{ resize: { width: 2400 } }]);
    expect(Object.keys((actions as { resize: object }[])[0].resize)).toEqual(['width']);
    expect(actions).toHaveLength(1);
    expect(options).toMatchObject({ format: 'jpeg' });
  });

  it('stops at the first step that fits', async () => {
    manipulate.mockReset();
    manipulate.mockResolvedValue({ uri: 'file:///cache/out.jpg' });
    const result = await optimizeImageForUpload({
      uri: 'file:///photo.jpg', name: 'id.jpg', plan, maxBytes: MAX_UPLOAD_BYTES, readSize: async () => 3 * MB,
    });
    expect(result.state).toBe('optimized');
    expect(manipulate).toHaveBeenCalledTimes(1);
  });

  it('walks down the ladder while it still does not fit', async () => {
    manipulate.mockReset();
    manipulate.mockResolvedValue({ uri: 'file:///cache/out.jpg' });
    const sizes = [5 * MB, 4.5 * MB, 2 * MB];
    let call = 0;
    const result = await optimizeImageForUpload({
      uri: 'file:///photo.jpg', name: 'id.jpg', plan, maxBytes: MAX_UPLOAD_BYTES,
      readSize: async () => sizes[call++],
    });
    expect(result.state).toBe('optimized');
    expect(manipulate).toHaveBeenCalledTimes(3);
  });

  it('refuses rather than grinding a document into mush', async () => {
    manipulate.mockReset();
    manipulate.mockResolvedValue({ uri: 'file:///cache/out.jpg' });
    const result = await optimizeImageForUpload({
      uri: 'file:///photo.jpg', name: 'id.jpg', plan, maxBytes: MAX_UPLOAD_BYTES,
      readSize: async () => 9 * MB,
    });
    expect(result.state).toBe('still_too_large');
    // Three attempts and no more -- it does not keep inventing lower settings.
    expect(manipulate).toHaveBeenCalledTimes(3);
  });

  /*
   * Its own outcome, not a generic failure: nothing is wrong with the photo, so telling somebody to
   * retake it wastes their time -- and sending a file we could not stat is how a request dies in the
   * native layer with no usable error at all.
   */
  it('will not pass along a file whose size it could not read', async () => {
    manipulate.mockReset();
    manipulate.mockResolvedValue({ uri: 'file:///cache/out.jpg' });
    const result = await optimizeImageForUpload({
      uri: 'file:///photo.jpg', name: 'id.jpg', plan, maxBytes: MAX_UPLOAD_BYTES, readSize: async () => null,
    });
    expect(result.state).toBe('unreadable_output');
  });

  it('reports a failure rather than a partial result when the image cannot be read', async () => {
    manipulate.mockReset();
    manipulate.mockRejectedValue(new Error('unsupported'));
    const result = await optimizeImageForUpload({
      uri: 'file:///broken.heic', name: 'x.heic', plan, maxBytes: MAX_UPLOAD_BYTES, readSize: async () => 1 * MB,
    });
    expect(result.state).toBe('failed');
  });

  it('does nothing at all when the plan says not to', async () => {
    manipulate.mockReset();
    const result = await optimizeImageForUpload({
      uri: 'file:///report.pdf', name: 'report.pdf',
      plan: { action: 'UPLOAD_ORIGINAL', reason: 'NOT_AN_IMAGE' },
      maxBytes: MAX_UPLOAD_BYTES, readSize: async () => 40 * MB,
    });
    expect(result).toEqual({ state: 'unchanged' });
    expect(manipulate).not.toHaveBeenCalled();
  });
});

describe('the result tells the truth about itself', () => {
  it('renames to .jpg, because the server checks that type and bytes agree', async () => {
    manipulate.mockReset();
    manipulate.mockResolvedValue({ uri: 'file:///cache/out.jpg' });
    const plan = planImageOptimization({ mimeType: 'image/heic', name: 'IMG_0421.HEIC', sizeBytes: OVERSIZED, maxBytes: MAX_UPLOAD_BYTES });
    const result = await optimizeImageForUpload({
      uri: 'file:///IMG_0421.HEIC', name: 'IMG_0421.HEIC', plan, maxBytes: MAX_UPLOAD_BYTES, readSize: async () => 2 * MB,
    });
    if (result.state !== 'optimized') throw new Error('expected success');
    expect(result.image.name).toBe('IMG_0421.jpg');
    expect(result.image.mimeType).toBe('image/jpeg');
    expect(result.image.sizeBytes).toBe(2 * MB);
  });

  it('keeps a recognisable name and never produces a bare extension', () => {
    expect(withJpegExtension('IMG_0421.HEIC')).toBe('IMG_0421.jpg');
    expect(withJpegExtension('drivers licence.png')).toBe('drivers licence.jpg');
    expect(withJpegExtension('')).toBe('photo.jpg');
    expect(withJpegExtension('.HEIC')).toBe('photo.jpg');
  });

  it('writes somewhere new, so the library original is untouched', async () => {
    manipulate.mockReset();
    manipulate.mockResolvedValue({ uri: 'file:///cache/ImageManipulator/out.jpg' });
    const plan = planImageOptimization({ mimeType: 'image/jpeg', name: 'id.jpg', sizeBytes: OVERSIZED, maxBytes: MAX_UPLOAD_BYTES });
    const result = await optimizeImageForUpload({
      uri: 'file:///DCIM/original.jpg', name: 'id.jpg', plan, maxBytes: MAX_UPLOAD_BYTES, readSize: async () => 1 * MB,
    });
    if (result.state !== 'optimized') throw new Error('expected success');
    expect(result.image.uri).not.toBe('file:///DCIM/original.jpg');
  });

  it('says what to do next when a photo cannot be made to fit', () => {
    const message = stillTooLargeMessage('4 MB');
    expect(message).toContain('Take a new photo');
    expect(message).toContain('4 MB');
    expect(message).not.toMatch(/quality|compress|resize|pixel/i);
  });
});

describe('regression: an oversized photo must reach the optimizer', () => {
  /*
   * Reported from a real device: selecting an oversized image showed the plain 4 MB refusal and
   * "Preparing your photo…" never appeared. The optimizer was gated on positively recognising the
   * file as an image, and `DocumentPicker`'s mimeType is optional -- so a photo the picker did not
   * label was classified as a non-image, skipped the optimizer, and hit the size guard.
   *
   * The question is inverted now: what is PROTECTED is enumerated, and everything else oversized is
   * at least attempted.
   */
  const oversized = (file: { mimeType: string | null; name: string }) =>
    planImageOptimization({ ...file, sizeBytes: 5.5 * MB, maxBytes: MAX_UPLOAD_BYTES });

  it('a 5.5 MB JPEG reaches the optimizer', () => {
    expect(oversized({ mimeType: 'image/jpeg', name: 'IMG_0001.jpg' }).action).toBe('OPTIMIZE');
  });

  it('a 5.5 MB HEIC reaches the optimizer', () => {
    expect(oversized({ mimeType: 'image/heic', name: 'IMG_0001.HEIC' }).action).toBe('OPTIMIZE');
  });

  /* The exact shapes a picker produces when it cannot label the file. All were failing. */
  it('an oversized photo the picker could not label still reaches the optimizer', () => {
    for (const file of [
      { mimeType: null, name: 'IMG_0001.HEIC' },
      { mimeType: null, name: 'IMG_0001' },
      { mimeType: null, name: 'image' },
      { mimeType: '', name: 'photo' },
      { mimeType: 'application/octet-stream', name: 'IMG_0001' },
      { mimeType: null, name: '' },
    ]) {
      expect(oversized(file).action, JSON.stringify(file)).toBe('OPTIMIZE');
    }
  });

  it('a 5.5 MB PDF is never optimized, however it is labelled', () => {
    for (const file of [
      { mimeType: 'application/pdf', name: 'report.pdf' },
      { mimeType: null, name: 'report.pdf' },
      // Mislabelled name, honest type: still protected.
      { mimeType: 'application/pdf', name: 'report.jpg' },
    ]) {
      expect(oversized(file), JSON.stringify(file)).toEqual({ action: 'UPLOAD_ORIGINAL', reason: 'NOT_AN_IMAGE' });
    }
  });

  it('an oversized IdentityIQ HTML export is never optimized', () => {
    for (const file of [
      { mimeType: 'text/html', name: 'identityiq.html' },
      { mimeType: null, name: 'identityiq.htm' },
    ]) {
      expect(oversized(file).action, JSON.stringify(file)).toBe('UPLOAD_ORIGINAL');
    }
  });

  it('the encoder is never even called for a protected document', async () => {
    manipulate.mockReset();
    await optimizeImageForUpload({
      uri: 'file:///report.pdf',
      name: 'report.pdf',
      plan: oversized({ mimeType: 'application/pdf', name: 'report.pdf' }),
      maxBytes: MAX_UPLOAD_BYTES,
      readSize: async () => 5.5 * MB,
    });
    expect(manipulate).not.toHaveBeenCalled();
  });

  it('an optimized photo that now fits is what gets uploaded', async () => {
    manipulate.mockReset();
    manipulate.mockResolvedValue({ uri: 'file:///cache/out.jpg' });
    const result = await optimizeImageForUpload({
      uri: 'file:///IMG_0001',
      name: 'IMG_0001',
      plan: oversized({ mimeType: null, name: 'IMG_0001' }),
      maxBytes: MAX_UPLOAD_BYTES,
      readSize: async () => 2.2 * MB,
    });
    if (result.state !== 'optimized') throw new Error(`expected optimized, got ${result.state}`);
    expect(result.image.sizeBytes).toBeLessThanOrEqual(MAX_UPLOAD_BYTES);
    expect(result.image.name).toBe('IMG_0001.jpg');
    expect(result.image.mimeType).toBe('image/jpeg');
  });

  it('a photo still over the limit after the whole ladder refuses cleanly', async () => {
    manipulate.mockReset();
    manipulate.mockResolvedValue({ uri: 'file:///cache/out.jpg' });
    const result = await optimizeImageForUpload({
      uri: 'file:///huge.jpg',
      name: 'huge.jpg',
      plan: oversized({ mimeType: 'image/jpeg', name: 'huge.jpg' }),
      maxBytes: MAX_UPLOAD_BYTES,
      readSize: async () => 8 * MB,
    });
    expect(result.state).toBe('still_too_large');
    expect(manipulate).toHaveBeenCalledTimes(3);
  });

  it('something that is not an image at all fails the attempt without harm', async () => {
    manipulate.mockReset();
    manipulate.mockRejectedValue(new Error('cannot decode'));
    const result = await optimizeImageForUpload({
      uri: 'file:///mystery.bin',
      name: 'mystery',
      plan: oversized({ mimeType: null, name: 'mystery' }),
      maxBytes: MAX_UPLOAD_BYTES,
      readSize: async () => 5.5 * MB,
    });
    // Nothing was produced and nothing was altered; the caller shows the size refusal.
    expect(result.state).toBe('failed');
  });
});

describe('regression: the flow runs in the required order', () => {
  const STORE = require('fs').readFileSync(
    new URL('../documents-store.tsx', import.meta.url).pathname,
    'utf8'
  ) as string;

  /* Call sites, not import lines -- an import proves nothing about order. */
  const callOf = (name: string) => STORE.indexOf(`${name}({`);

  it('plans and optimizes before it ever calls the uploader', () => {
    expect(callOf('planImageOptimization')).toBeGreaterThan(-1);
    expect(callOf('planImageOptimization')).toBeLessThan(STORE.indexOf('uploadDocumentToEngine('));
    expect(callOf('optimizeImageForUpload')).toBeLessThan(STORE.indexOf('uploadDocumentToEngine('));
  });

  it('shows the preparing state before the encoder runs', () => {
    // The state is SET inside the handler, after the type union declares it -- compare the setter.
    const setsPreparing = STORE.indexOf("{ kind: 'preparing' } }))");
    expect(setsPreparing).toBeGreaterThan(-1);
    expect(setsPreparing).toBeLessThan(callOf('optimizeImageForUpload'));
  });

  it('uploads the possibly-replaced document, not the originally picked one', () => {
    expect(STORE).toContain('uploadDocumentToEngine(slotId, document, maxBytes)');
    expect(STORE).not.toContain('uploadDocumentToEngine(slotId, picked.document');
  });

  it("reads the engine's limit without a stale closure", () => {
    expect(STORE).toContain('[refresh, overview]');
  });
});

describe('regression: the optimized copy is what actually gets sent', () => {
  const STORE = require('fs').readFileSync(new URL('../documents-store.tsx', import.meta.url).pathname, 'utf8') as string;
  const UPLOAD = require('fs').readFileSync(new URL('../mobile-documents.ts', import.meta.url).pathname, 'utf8') as string;

  /*
   * The reported failure was "prepares but doesn't send". Reading the code proved the ORDER was
   * right, so these pin the things that could still make the sent file the wrong one.
   */
  it('FormData is built from the possibly-replaced document, never the picker asset', () => {
    expect(UPLOAD).toContain('uri: document.uri');
    expect(UPLOAD).not.toContain('uri: picked.document.uri');
    expect(STORE).toContain('uploadDocumentToEngine(slotId, document, maxBytes)');
  });

  it('the file part carries the RN shape, not a browser Blob', () => {
    expect(UPLOAD).toMatch(/form\.append\('file',\s*\{\s*\n\s*uri:/);
    expect(UPLOAD).toContain('as unknown as Blob');
    expect(UPLOAD).not.toContain('new Blob(');
  });

  it('nothing forces a Content-Type that would break the multipart boundary', () => {
    const AUTH = require('fs').readFileSync(new URL('../auth-fetch.ts', import.meta.url).pathname, 'utf8') as string;
    // The shared fetch wrapper must add only Authorization -- a Content-Type here would break every
    // multipart body, since the runtime has to write the boundary itself.
    expect(AUTH).not.toMatch(/content-type/i);

    // And the upload function specifically must not set one. Other requests in this file are JSON
    // and set it correctly; scoping to the function is the point.
    const fn = UPLOAD.slice(
      UPLOAD.indexOf('export async function uploadDocumentToEngine'),
      UPLOAD.indexOf('export async function readableFileSize')
    );
    expect(fn).not.toMatch(/'Content-Type'/i);
  });

  it('the produced file is checked for existence before the request is made', () => {
    expect(STORE.indexOf('readableFileSize')).toBeLessThan(STORE.indexOf('uploadDocumentToEngine('));
  });

  it('an unmeasurable filesystem does not block the upload', async () => {
    // Unknown is not the same as missing: only a definite zero refuses.
    expect(STORE).toContain('onDisk === 0');
    expect(STORE).not.toContain('onDisk === null)');
  });

  it('a fetch failure says it could not upload, not that the connection was wrong', () => {
    const fn = UPLOAD.slice(
      UPLOAD.indexOf('export async function uploadDocumentToEngine'),
      UPLOAD.indexOf('export async function readableFileSize')
    );
    expect(fn).toContain("Zoey couldn't upload that photo. Try again.");
    /*
     * The old wording blamed the connection, which is only sometimes true: the same throw happens
     * when the file part names something the platform cannot read. Other functions in this file
     * still use it correctly for genuine JSON round trips.
     */
    expect(fn).not.toContain("Check your connection");
  });

  it('every step of the path is traced', () => {
    for (const step of ['picked', 'plan', 'optimized', 'output-check', 'form-built', 'request', 'response']) {
      expect(STORE + UPLOAD + require('fs').readFileSync(new URL('../image-optimization.ts', import.meta.url).pathname, 'utf8'), step).toContain(`'${step}'`);
    }
  });
});
