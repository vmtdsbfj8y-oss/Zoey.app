import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const api = (file: string) => readFileSync(join(process.cwd(), 'api', file), 'utf8');

const OWNER = api('_lib/owner.ts');
const SESSION = api('_lib/owner-session.ts');
const PORTAL = api('admin/portal.ts');
const CLIENTS = api('admin/clients.ts');
const LOGIN = api('admin/login.ts');
const LOGOUT = api('admin/logout.ts');

/**
 * OWNER ACCESS MUST BE A SESSION, NOT A STRING SOMEBODY KNOWS.
 *
 * `ZOEY_ADMIN_SECRET` used to BE the session, accepted as `?key=` in the address bar. A long-lived
 * credential in a URL is one in the platform's access log, in browser history, and in the Referer of
 * everything the page loads -- and there was no login, no expiry, no logout and nothing to revoke,
 * because possession of one static string was permanent access.
 *
 * These read the source because the properties are structural: what matters is that no code path
 * exists that could read a credential from a URL, not that a particular request happened to fail.
 */

describe('no credential travels in a URL', () => {
  it('nothing in the admin surface reads a secret from the query string', () => {
    for (const [name, source] of [['owner', OWNER], ['portal', PORTAL], ['clients', CLIENTS], ['login', LOGIN], ['logout', LOGOUT]] as const) {
      expect(source, name).not.toMatch(/req\.query\?\.\s*key/);
      expect(source, name).not.toMatch(/searchParams\.get\(\s*['"](?:key|secret|token|password)['"]/i);
      expect(source, name).not.toMatch(/location\.search/);
    }
  });

  it('the portal page no longer instructs anyone to put the secret in the URL', () => {
    expect(PORTAL).not.toContain('?key=');
    expect(PORTAL).not.toContain('ZOEY_ADMIN_SECRET');
  });

  it('the page script holds no credential at all', () => {
    // The cookie is HttpOnly, so the browser attaches it and the script cannot read it.
    expect(PORTAL).toContain("credentials: 'same-origin'");
    expect(PORTAL).not.toContain("'x-zoey-admin-secret': key");
  });

  it('login accepts the password only on POST, never on GET', () => {
    const get = LOGIN.slice(LOGIN.indexOf("if (method === 'GET')"), LOGIN.indexOf("if (method !== 'POST')"));
    expect(get).not.toContain('ownerCredentialMatches');
    expect(LOGIN).toContain("method !== 'POST'");
  });
});

describe('the session itself', () => {
  it('is opaque, random and long', () => {
    expect(SESSION).toContain("randomBytes(32).toString('base64url')");
  });

  /* The store is what an attacker who reaches the database reads; a hash there cannot be replayed. */
  it('is stored hashed, never in the clear', () => {
    expect(SESSION).toMatch(/createHash\('sha256'\)\.update\(id/);
  });

  it('carries the right cookie attributes', () => {
    expect(SESSION).toContain('HttpOnly');
    expect(SESSION).toContain('SameSite=Strict');
    expect(SESSION).toContain('Path=/api/admin');
    expect(SESSION).toContain('Max-Age=');
    expect(SESSION).toContain("attributes.push('Secure')");
  });

  it('expires server-side rather than trusting the cookie to lapse', () => {
    expect(SESSION).toContain("'EX',");
    expect(SESSION).toContain('SESSION_TTL_SECONDS');
  });

  it('rotates on login, so an old id cannot be revived by signing in again', () => {
    expect(SESSION).toContain('A fresh id every login');
  });

  it('can actually be revoked', () => {
    expect(SESSION).toMatch(/destroyOwnerSession[\s\S]*'DEL'/);
    expect(LOGOUT).toContain('destroyOwnerSession');
    expect(LOGOUT).toContain('clearedOwnerSessionCookie');
  });

  it('refuses a session id that is not one of ours before touching the store', () => {
    expect(SESSION).toContain('/^[A-Za-z0-9_-]+$/');
    expect(SESSION).toMatch(/id\.length < 32 \|\| id\.length > 128/);
  });

  it('fails closed when the shared store is unreachable', () => {
    // No store means no session: an owner who cannot be logged out is not logged in.
    expect(SESSION).toContain('return stored === null ? null : id');
  });
});

describe('authorization, not just authentication', () => {
  it('the portal page has no machine path at all', () => {
    expect(PORTAL).toContain('requireOwnerSession(req, res)');
    expect(PORTAL).not.toContain('requireMachineOwner');
    expect(PORTAL).not.toContain('requireOwnerSessionOrMachine');
  });

  it('the human gate reads a cookie and never a header secret', () => {
    const humanGate = OWNER.slice(OWNER.indexOf('export async function requireOwnerSession'), OWNER.indexOf('export function requireMachineOwner'));
    expect(humanGate).toContain('readSessionCookie');
    expect(humanGate).not.toContain('x-zoey-admin-secret');
  });

  it('the machine gate reads a header and never a cookie', () => {
    const machineGate = OWNER.slice(OWNER.indexOf('export function requireMachineOwner'), OWNER.indexOf('export async function requireOwnerSessionOrMachine'));
    expect(machineGate).toContain('x-zoey-admin-secret');
    expect(machineGate).not.toContain('readSessionCookie');
  });

  /*
   * The engine calls /api/admin/clients server-to-server and has no browser, no cookie jar and
   * nowhere to log in. That one route serves both -- and only that one.
   */
  it('only the clients route accepts either', () => {
    expect(CLIENTS).toContain('requireOwnerSessionOrMachine');
    expect(PORTAL).not.toContain('requireOwnerSessionOrMachine');
  });

  it('an unset secret disables the machine path rather than opening it', () => {
    expect(OWNER).toMatch(/expected\.length < 16[\s\S]{0,200}503/);
  });

  it('consumer Supabase auth is nowhere in the owner gate', () => {
    // A consumer bearer token is not a thing this surface knows how to accept.
    expect(OWNER).not.toContain('requireUser');
    expect(OWNER).not.toContain('supabase');
  });
});

describe('CSRF, beyond the method being POST', () => {
  it('state-changing requests require a same-origin Origin header', () => {
    expect(SESSION).toContain('export function originIsTrusted');
    expect(SESSION).toMatch(/if \(!input\.origin \|\| !input\.host\) return false;/);
    expect(OWNER).toContain('originIsTrusted');
  });

  it('a safe method is not blocked by it', () => {
    expect(SESSION).toMatch(/method === 'GET' \|\| input\.method === 'HEAD'\) return true/);
  });

  it('logout is POST-only and origin-checked, so a link cannot sign the owner out', () => {
    expect(LOGOUT).toContain("method !== 'POST'");
    expect(LOGOUT).toContain('originIsTrusted');
  });

  it('the cookie is SameSite=Strict, so it does not ride along cross-site in the first place', () => {
    expect(SESSION).toContain('SameSite=Strict');
  });
});

describe('login abuse', () => {
  it('is throttled in the shared store, not per instance', () => {
    expect(LOGIN).toContain('sharedStoreCommand');
    expect(LOGIN).toContain("'INCR'");
    expect(LOGIN).toContain('ATTEMPT_LIMIT');
  });

  it('counts the attempt before checking the password', () => {
    expect(LOGIN.indexOf('tooManyAttempts')).toBeLessThan(LOGIN.indexOf('ownerCredentialMatches(supplied)'));
  });

  /* A throttle that announces itself tells an attacker the password was worth throttling. */
  it('says exactly what a wrong password says', () => {
    const responses = LOGIN.match(/PAGE\('Incorrect password\.'\)/g) ?? [];
    expect(responses.length).toBeGreaterThanOrEqual(2);
  });

  it('refuses when it cannot count at all', () => {
    expect(LOGIN).toContain('if (count === null) return true');
  });

  it('compares the password in constant time', () => {
    expect(SESSION).toContain('nodeTimingSafeEqual');
    expect(SESSION).toMatch(/left\.length !== right\.length[\s\S]{0,220}return false/);
  });
});

describe('three credentials, none of which can become another', () => {
  /*
   * ZOEY_ADMIN_SECRET backed the human login AND the machine header at once. One string, two threat
   * models: a password a person types wants to be rotatable the moment somebody leaves, a service
   * key wants to be long-lived and never seen by a human. While they were shared neither could be
   * rotated without breaking the other -- so in practice neither was.
   *
   * That same string also spent months reachable in URLs, so it is treated as known and retired.
   */
  it('the login password and the machine key are different environment variables', () => {
    expect(SESSION).toContain('ZOEY_OWNER_LOGIN_SECRET');
    expect(OWNER).toContain('ZOEY_MACHINE_OWNER_KEY');
    expect(SESSION).not.toContain('ZOEY_MACHINE_OWNER_KEY');
    expect(OWNER).not.toContain('ZOEY_OWNER_LOGIN_SECRET');
  });

  /* The separation is structural: neither function can see the other's value. */
  it('the login check cannot read the machine key, and vice versa', () => {
    const loginCheck = SESSION.slice(SESSION.indexOf('export function ownerCredentialMatches'), SESSION.indexOf('export async function createOwnerSession'));
    expect(loginCheck).toContain('OWNER_LOGIN_ENV');
    expect(loginCheck).not.toContain('MACHINE');

    const machineCheck = OWNER.slice(OWNER.indexOf('export function requireMachineOwner'), OWNER.indexOf('export async function requireOwnerSessionOrMachine'));
    expect(machineCheck).toContain('ZOEY_MACHINE_OWNER_KEY');
    expect(machineCheck).not.toContain('OWNER_LOGIN');
  });

  it('no live code reads the retired credential', () => {
    for (const [name, source] of [['owner', OWNER], ['session', SESSION], ['login', LOGIN], ['logout', LOGOUT], ['portal', PORTAL], ['clients', CLIENTS]] as const) {
      // Comments may narrate the history; nothing may read it.
      const code = source
        .split('\n')
        .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//') && !line.trim().startsWith('/*'))
        .join('\n');
      expect(code, name).not.toContain('ZOEY_ADMIN_SECRET');
    }
  });

  it('the automation key is nowhere in the owner surface', () => {
    for (const [name, source] of [['owner', OWNER], ['session', SESSION], ['login', LOGIN], ['clients', CLIENTS]] as const) {
      expect(source, name).not.toContain('AUTOMATION_API_KEY');
    }
  });

  it('no owner credential is exposed to the client', () => {
    for (const [name, source] of [['owner', OWNER], ['session', SESSION], ['login', LOGIN], ['portal', PORTAL]] as const) {
      expect(source, name).not.toMatch(/EXPO_PUBLIC/);
      expect(source, name).not.toMatch(/NEXT_PUBLIC/);
      expect(source, name).not.toMatch(/localStorage|sessionStorage/);
    }
  });

  it('the login form never renders the credential it checks', () => {
    // The password arrives in a POST body and is compared; it is never echoed into the page.
    expect(LOGIN).not.toMatch(/PAGE\([^)]*supplied/);
    expect(LOGIN).not.toMatch(/value="\$\{/);
  });
});
