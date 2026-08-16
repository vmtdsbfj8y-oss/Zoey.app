/**
 * Entry point for `npm run api`.
 *
 * Registers the `.js` -> `.ts` resolver hook before loading the dev server, so
 * the handlers can use the same deploy-correct specifiers Vercel needs.
 */
import { register } from 'node:module';

register('./_ts-resolve.mjs', import.meta.url);

await import('./_dev-server.ts');
