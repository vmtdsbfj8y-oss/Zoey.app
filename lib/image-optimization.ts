import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { extensionOnly, recordUploadDiagnostic, uriScheme } from '@/lib/upload-diagnostics';

/**
 * Making a phone photo of an ID fit, without making it useless.
 *
 * ==============================  WHY THIS EXISTS  ==============================
 *
 * The real upload ceiling is 4 MB -- not a product decision, a measured platform one: Vercel refuses
 * a function request body at roughly 4.5 MB before any handler runs. A modern phone photographing a
 * driver's licence in good light routinely lands above that, and the only advice the app could give
 * was "choose a smaller file", which is not something a person can act on when the file is the photo
 * they just took.
 *
 * ==============================  WHAT IT WILL NOT DO  ==============================
 *
 * IMAGES ONLY. A PDF is never re-encoded -- not the credit report, not anything else. A PDF is a
 * document whose bytes are the evidence, and "we made your credit report smaller" is not a sentence
 * this product should ever be able to say. An oversized PDF gets the honest size refusal.
 *
 * It also will not grind quality down until something fits. There is a floor, and below it the
 * honest answer is to ask for a different photo rather than to upload an unreadable one and let a
 * human reviewer discover the problem later.
 */

/** The longest edge, in pixels, and the JPEG quality to try with it. Ordered widest-first. */
interface OptimizationStep {
  maxEdgePixels: number;
  quality: number;
}

/**
 * DIMENSIONS FIRST, THEN QUALITY.
 *
 * Halving the pixel count removes far more bytes than dropping JPEG quality does, and it removes
 * them from detail the eye was never going to use at review size. Repeatedly re-compressing at full
 * resolution is what produces the mushy, ringing text that makes an ID unreadable, so quality only
 * moves after the resolution has.
 *
 * The floor is 1600 px on the long edge at quality 0.7. A licence or a Social Security card at that
 * size is roughly 1600x1000 -- comfortably legible for a person checking a name and a number, and
 * far above what OCR would need. Nothing below it is attempted.
 */
const OPTIMIZATION_LADDER: OptimizationStep[] = [
  { maxEdgePixels: 2400, quality: 0.85 },
  { maxEdgePixels: 2000, quality: 0.8 },
  { maxEdgePixels: 1600, quality: 0.7 },
];

/** Types this will re-encode when it can see them. */
const OPTIMIZABLE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];

/** Extensions, for the case where the picker reports no MIME type at all. */
const OPTIMIZABLE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'heic', 'heif'];

/**
 * THE LIST THAT MUST NEVER BE RE-ENCODED, AND IT IS THE ONE THAT DECIDES.
 *
 * The first version asked "is this positively an image?" and optimized only then. On a real phone
 * that was the wrong question: `DocumentPicker`'s `mimeType` is optional, a name can arrive without
 * a usable extension, and when the answer came back "not sure" an actual photo was classified as a
 * non-image, skipped the optimizer entirely, and hit the plain 4 MB refusal. The person saw a
 * dead-end size error on a photo the app was built to shrink, and never saw "Preparing your photo".
 *
 * So the question is inverted. What is protected is enumerated -- a PDF, an HTML report export, a
 * text or archive format -- and everything else that is oversized is at least ATTEMPTED. The image
 * decoder is a better judge of whether something is an image than a metadata field the picker may
 * not have filled in, and if it cannot decode the file nothing was harmed: the attempt fails and the
 * caller falls back to the same size refusal it would have shown anyway.
 *
 * The protection is what has to be strict, and it is checked by BOTH type and extension so that a
 * missing MIME type can never expose a credit report to the encoder.
 */
const NEVER_OPTIMIZE_MIME_TYPES = [
  'application/pdf',
  'text/html',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const NEVER_OPTIMIZE_EXTENSIONS = ['pdf', 'html', 'htm', 'txt', 'csv', 'zip', 'doc', 'docx', 'rtf', 'xml', 'json'];

export type OptimizationPlan =
  /** Already small enough, or not something to touch. Send the bytes exactly as chosen. */
  | { action: 'UPLOAD_ORIGINAL'; reason: 'WITHIN_LIMIT' | 'NOT_AN_IMAGE' | 'SIZE_UNKNOWN' }
  /** An oversized image worth re-encoding. */
  | { action: 'OPTIMIZE'; steps: OptimizationStep[] };

function extensionOf(name: string): string {
  const parts = name.toLowerCase().trim().split('.');
  return parts.length > 1 ? (parts.pop() ?? '') : '';
}

/**
 * A document whose bytes are the evidence. Never re-encoded, whatever its size.
 *
 * Either signal is enough to protect it: a PDF with no MIME type is still a PDF, and a file claiming
 * `application/pdf` is protected even if somebody named it `.jpg`.
 */
export function isProtectedDocument(input: { mimeType: string | null; name: string }): boolean {
  const mime = (input.mimeType ?? '').toLowerCase().trim();
  if (mime && NEVER_OPTIMIZE_MIME_TYPES.includes(mime)) return true;
  return NEVER_OPTIMIZE_EXTENSIONS.includes(extensionOf(input.name));
}

/** Positively recognisable as a photo. Used for reporting, not for gating the attempt. */
export function isOptimizableImage(input: { mimeType: string | null; name: string }): boolean {
  const mime = (input.mimeType ?? '').toLowerCase().trim();
  if (mime) return OPTIMIZABLE_MIME_TYPES.includes(mime);
  return OPTIMIZABLE_EXTENSIONS.includes(extensionOf(input.name));
}

/**
 * What to do with this file, decided without touching it.
 *
 * Pure on purpose: every rule about what gets re-encoded is decidable from the file's type and size,
 * so it can be enumerated in a test rather than inferred from behaviour on a device.
 */
export function planImageOptimization(input: {
  mimeType: string | null;
  name: string;
  sizeBytes: number | null;
  /** The canonical maximum, passed in. This module defines no limit of its own. */
  maxBytes: number;
}): OptimizationPlan {
  // The only hard exclusion. A credit report never reaches the encoder.
  if (isProtectedDocument(input)) return { action: 'UPLOAD_ORIGINAL', reason: 'NOT_AN_IMAGE' };

  /*
   * An unmeasured file is not a large file. Some providers report no size, and re-encoding
   * everything just in case would degrade photos that were always going to fit.
   */
  if (typeof input.sizeBytes !== 'number') return { action: 'UPLOAD_ORIGINAL', reason: 'SIZE_UNKNOWN' };

  // Already fits. Re-encoding it would lose detail for nothing.
  if (input.sizeBytes <= input.maxBytes) return { action: 'UPLOAD_ORIGINAL', reason: 'WITHIN_LIMIT' };

  /*
   * Oversized and not protected: try. Whether the picker managed to label it does not decide this --
   * a photo with no MIME type is exactly the case that was failing.
   */
  return { action: 'OPTIMIZE', steps: OPTIMIZATION_LADDER };
}

export interface OptimizedImage {
  uri: string;
  name: string;
  mimeType: 'image/jpeg';
  sizeBytes: number;
}

export type OptimizationOutcome =
  | { state: 'optimized'; image: OptimizedImage }
  /** Nothing to do -- the caller uploads what it already had. */
  | { state: 'unchanged' }
  /** Tried the whole ladder and the floor still did not fit. */
  | { state: 'still_too_large' }
  /** The image could not be read or re-encoded at all. */
  | { state: 'failed' }
  /**
   * The encoder reported success and the file it named cannot be measured.
   *
   * Its own outcome because it is a different failure with a different remedy: nothing is wrong with
   * the photo, so telling somebody to retake it wastes their time -- and uploading a file we could
   * not stat is how a request dies in the native layer with no usable error at all.
   */
  | { state: 'unreadable_output' };

/** Reads the produced file's real size. Injected so the ladder can be tested without a filesystem. */
export type SizeReader = (uri: string) => Promise<number | null>;

/**
 * Runs the plan.
 *
 * ==============================  WHAT IS AND IS NOT CHANGED  ==============================
 *
 * The output is a NEW file in the app's cache. The photo in the person's library is never opened for
 * writing, never replaced and never deleted -- `manipulateAsync` reads and writes somewhere else
 * entirely. What gets uploaded is a copy.
 *
 * EXIF, INCLUDING GPS, DOES NOT SURVIVE. That is a consequence of re-encoding rather than a
 * separate scrubbing step: the manipulator decodes to a bitmap and writes fresh JPEG data, and the
 * original's metadata blocks are simply not part of what it writes. Worth stating plainly because it
 * is a real privacy improvement and because it is NOT something this code does explicitly -- so a
 * future change of library could quietly remove it.
 *
 * NO CROPPING, NO ROTATION, NO FILTERS. The only action is a proportional resize: `width` alone,
 * with the height left for the library to derive, which is what keeps the aspect ratio exact and the
 * document's edges inside the frame.
 */
export async function optimizeImageForUpload(input: {
  uri: string;
  name: string;
  plan: OptimizationPlan;
  maxBytes: number;
  readSize: SizeReader;
}): Promise<OptimizationOutcome> {
  if (input.plan.action !== 'OPTIMIZE') return { state: 'unchanged' };

  let lastFailure: 'still_too_large' | 'failed' | 'unreadable_output' = 'failed';

  for (const step of input.plan.steps) {
    let result: { uri: string };
    try {
      result = await manipulateAsync(
        input.uri,
        // Width only. Supplying both would let the library letterbox or stretch to fit.
        [{ resize: { width: step.maxEdgePixels } }],
        { compress: step.quality, format: SaveFormat.JPEG }
      );
    } catch {
      // Unreadable or unsupported on this platform. Nothing partial was produced.
      recordUploadDiagnostic({ step: 'optimize-step', detail: `encoder-threw-at-${step.maxEdgePixels}` });
      return { state: 'failed' };
    }

    const sizeBytes = await input.readSize(result.uri).catch(() => null);
    recordUploadDiagnostic({
      step: 'optimize-step',
      detail: `edge=${step.maxEdgePixels} q=${step.quality}`,
      sizeBytes: typeof sizeBytes === 'number' ? sizeBytes : undefined,
      uriScheme: uriScheme(result.uri),
    });

    /*
     * A size we cannot read is not a pass. Uploading it would put the 4 MB question back on the
     * platform, which answers it with a bare 413 -- the exact failure this exists to prevent.
     */
    if (typeof sizeBytes !== 'number') {
      lastFailure = 'unreadable_output';
      continue;
    }

    if (sizeBytes <= input.maxBytes) {
      recordUploadDiagnostic({
        step: 'optimized',
        sizeBytes,
        uriScheme: uriScheme(result.uri),
        extension: extensionOnly(withJpegExtension(input.name)),
        mimeType: 'image/jpeg',
      });
      return {
        state: 'optimized',
        image: {
          uri: result.uri,
          // The bytes are JPEG now, so the name and type must say so: the server checks that the
          // extension, the claimed type and the magic bytes all agree, and it is right to.
          name: withJpegExtension(input.name),
          mimeType: 'image/jpeg',
          sizeBytes,
        },
      };
    }

    lastFailure = 'still_too_large';
  }

  return { state: lastFailure };
}

/** Keeps the recognisable part of the name and tells the truth about the format. */
export function withJpegExtension(name: string): string {
  const trimmed = name.trim() || 'photo';
  const withoutExtension = trimmed.replace(/\.[A-Za-z0-9]{1,5}$/, '');
  return `${withoutExtension || 'photo'}.jpg`;
}

/** What to tell somebody whose photo could not be made to fit. Actionable, not technical. */
export function stillTooLargeMessage(label: string): string {
  return `This photo is too large even after optimizing. Take a new photo or choose a smaller one under ${label}.`;
}

/**
 * The real size of a file the manipulator just wrote.
 *
 * Kept out of `optimizeImageForUpload` so the ladder can be exercised without a filesystem, and so
 * a platform where the size cannot be read fails loudly here rather than silently passing an
 * unmeasured file to the uploader.
 */
export const readFileSize: SizeReader = async (uri) => {
  try {
    const { File } = await import('expo-file-system');
    const size = new File(uri).size;
    return typeof size === 'number' && size > 0 ? size : null;
  } catch {
    return null;
  }
};
