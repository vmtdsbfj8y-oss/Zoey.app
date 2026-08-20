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

  it('will not pass along a file whose size it could not read', async () => {
    manipulate.mockReset();
    manipulate.mockResolvedValue({ uri: 'file:///cache/out.jpg' });
    const result = await optimizeImageForUpload({
      uri: 'file:///photo.jpg', name: 'id.jpg', plan, maxBytes: MAX_UPLOAD_BYTES, readSize: async () => null,
    });
    expect(result.state).toBe('failed');
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
