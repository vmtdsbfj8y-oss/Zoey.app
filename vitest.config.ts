import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

/**
 * A test runner for the app, which had none.
 *
 * The engine has had one throughout and the app has not, so every guarantee on this side has been
 * verified by typecheck and inspection. That was a real gap: the upload-size work shipped a second
 * copy of a message that only live probing caught.
 *
 * Node environment on purpose. Native modules are mocked per-test rather than emulated -- the value
 * here is in the decisions the app makes, not in re-testing Expo.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': resolve(__dirname, '.') },
  },
});
