import { tr } from './i18n/runtime';
/**
 * WHERE A DOCUMENT COMES FROM, AND WHICH SLOTS MAY OFFER WHICH SOURCE.
 *
 * ==============================  WHY THIS EXISTS  ==============================
 *
 * Documents only ever opened the iOS Files picker. Everything built to make a phone photo of an ID
 * fit under the 4 MB ceiling -- the ladder, the optimizer, "Preparing your photo…" -- was
 * unreachable from the screen, because there was no way to arrive with a photo in the first place.
 * The only thing a person could realistically pick from Files was a PDF, which is correctly never
 * optimized, so the whole path sat behind a door with no handle.
 *
 * ==============================  WHY IT IS PER SLOT  ==============================
 *
 * A driver's licence is something you photograph. A credit report is something you export, and a
 * camera photo of one is a bad document -- unparseable, unreadable at the edges, and a poor
 * substitute for the file the bureau gave you. Offering "Take Photo" on that slot would be inviting
 * the failure. So the sources are a property of the slot, not of the app.
 */

export type UploadSource = 'camera' | 'library' | 'files';

/**
 * Slots whose evidence is a physical thing in front of you.
 *
 * Matched on the engine's own slot ids. An id this does not recognise gets the file-only treatment,
 * which is the safe direction: a new slot has to be added here deliberately before it starts
 * suggesting a camera.
 */
const PHOTOGRAPHABLE_SLOTS = new Set([
  'GOVERNMENT_ID',
  'SOCIAL_SECURITY_CARD',
  'PROOF_OF_ADDRESS',
  'SUPPORTING_EVIDENCE',
  /*
   * A police report is paper. It is handed across a counter or posted, and the realistic way a
   * person has one on a phone is by photographing it -- so this slot has to offer the camera or it
   * effectively cannot be filled.
   */
  'POLICE_REPORT',
]);

/**
 * Slots that are a file by nature. Never offered a camera.
 *
 * The credit report is the one that matters: it arrives as an IdentityIQ export, it is parsed rather
 * than looked at, and photographing it produces something the pipeline cannot read.
 */
const FILE_ONLY_SLOTS = new Set([
  'IDENTITYIQ_CREDIT_REPORT',
  'CREDIT_REPORT',
  /*
   * The FTC identity theft report is a PDF IdentityTheft.gov generates and emails. It is the
   * document 15 U.S.C. § 1681c-2 turns on, it is read rather than looked at, and a photograph of a
   * screen showing it is a worse copy of a file the person already has.
   */
  'FTC_IDENTITY_THEFT_REPORT',
]);

export function sourcesForSlot(slotId: string): UploadSource[] {
  const id = slotId.trim().toUpperCase();
  if (FILE_ONLY_SLOTS.has(id)) return ['files'];
  if (PHOTOGRAPHABLE_SLOTS.has(id)) return ['camera', 'library', 'files'];
  // Unrecognised: files only, until somebody decides otherwise on purpose.
  return ['files'];
}

export function slotOffersPhotos(slotId: string): boolean {
  return sourcesForSlot(slotId).includes('camera');
}

/** Resource key per source. Keys rather than words, so the sheet follows the reader's language. */
export const SOURCE_LABEL_KEYS: Record<UploadSource, string> = {
  camera: 'upload.sourceCamera',
  library: 'upload.sourceLibrary',
  files: 'upload.sourceFiles',
};

/**
 * The label each source shows. Plain words -- nobody is choosing an "asset provider".
 *
 * Resolved through the runtime mirror because the only caller is a native `Alert`, which is built
 * imperatively at the moment of the tap rather than rendered. A component must use `t()` instead.
 */
export function sourceLabel(source: UploadSource): string {
  return tr(SOURCE_LABEL_KEYS[source]);
}

/**
 * What to say when a permission was refused.
 *
 * Says what it was for and what still works, and does not ask again. A person who said no to the
 * camera has not lost the ability to send the document -- Choose File is still there -- and nagging
 * them about it would be the app arguing with a decision they already made.
 */
export function permissionDeniedMessage(source: 'camera' | 'library'): string {
  return source === 'camera'
    ? tr('upload.cameraDenied')
    : tr('upload.photosDenied');
}
