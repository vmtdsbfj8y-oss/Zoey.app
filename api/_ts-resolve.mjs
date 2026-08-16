/**
 * Resolver hook: maps a relative `./x.js` specifier onto `./x.ts` when only the
 * TypeScript source exists.
 *
 * Why this is needed at all:
 *
 * Vercel compiles `api/*.ts` to `.js` but does NOT rewrite import specifiers.
 * So a specifier must be written the way it will look AFTER compilation --
 * `'./_lib/http.js'` -- which is also the standard TypeScript NodeNext
 * convention, and is what TypeScript itself expects (it resolves `./x.js` to
 * `x.ts` natively).
 *
 * Node's built-in type stripping does not do that mapping: running the dev
 * server directly, `./_lib/http.js` fails with ERR_MODULE_NOT_FOUND because
 * only `http.ts` is on disk. Using `.ts` specifiers instead fixes local dev and
 * breaks Vercel at runtime -- the two cannot be satisfied by one extension.
 *
 * This hook resolves that: source keeps the deploy-correct `.js` specifiers,
 * and locally we fall back to the `.ts` file when the `.js` is absent.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && specifier.endsWith('.js')) {
    const asTs = `${specifier.slice(0, -3)}.ts`;
    try {
      const candidate = await nextResolve(asTs, context);
      // Only take the .ts path when it is genuinely on disk, so a real compiled
      // .js build keeps winning if one is ever produced.
      if (candidate?.url?.startsWith('file:') && existsSync(fileURLToPath(candidate.url))) {
        return candidate;
      }
    } catch {
      // fall through to the original specifier
    }
  }

  return nextResolve(specifier, context);
}
