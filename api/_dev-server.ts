/**
 * Local host for the same handlers Vercel deploys. Run with `npm run api`.
 *
 * Exists so the API is runnable without a Vercel account or project link.
 * Node 24 strips TypeScript natively, so this runs with no build step and no
 * dev dependency -- which is also why every file under `api/` sticks to
 * erasable syntax (no enums, no parameter properties) and imports with explicit
 * `.ts` extensions.
 *
 * Routing here mirrors Vercel's file convention by hand: `api/goals/[goalId]`
 * becomes a path segment captured into `query.jobId`.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import type { ApiRequest, ApiResponse } from './_lib/http.js';
import { usingPersistentStore } from './_lib/store.js';
import accountDelete from './account/delete.js';
import adminClients from './admin/clients.js';
import adminPortal from './admin/portal.js';
import goalById from './goals/[goalId].js';
import goalsIndex from './goals/index.js';
import profile from './profile.js';
import scores from './scores.js';
import subscription from './subscription.js';

type Handler = (req: ApiRequest, res: ApiResponse) => Promise<void> | void;

const PORT = Number(process.env.PORT ?? 3000);

function route(pathname: string): { handler: Handler; params: Record<string, string> } | null {
  if (pathname === '/api/account/delete') return { handler: accountDelete, params: {} };
  if (pathname === '/api/profile') return { handler: profile, params: {} };
  if (pathname === '/api/subscription') return { handler: subscription, params: {} };
  if (pathname === '/api/scores') return { handler: scores, params: {} };
  // /api/chat was removed: chat is served by the engine at /api/mobile/chat.
  if (pathname === '/api/goals') return { handler: goalsIndex, params: {} };
  if (pathname === '/api/admin/clients') return { handler: adminClients, params: {} };
  if (pathname === '/api/admin/portal') return { handler: adminPortal, params: {} };

  const goal = /^\/api\/goals\/([^/]+)$/.exec(pathname);
  if (goal) return { handler: goalById, params: { goalId: decodeURIComponent(goal[1]) } };

  return null;
}

function readRawBody(req: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const matched = route(url.pathname);

  if (!matched) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `No route for ${url.pathname}` }));
    return;
  }

  const query: Record<string, string | string[] | undefined> = { ...matched.params };
  url.searchParams.forEach((value, key) => (query[key] = value));

  const apiReq: ApiRequest = {
    method: req.method,
    url: req.url,
    query,
    headers: Object.fromEntries(Object.entries(req.headers).map(([key, value]) => [key, value])),
    // PATCH carries a body too -- profile and goal edits both use it.
    body:
      req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT'
        ? await readRawBody(req)
        : undefined,
  };

  let statusCode = 200;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  const apiRes: ApiResponse = {
    status(code) {
      statusCode = code;
      return apiRes;
    },
    setHeader(name, value) {
      headers[name] = value;
    },
    json(body) {
      res.writeHead(statusCode, headers);
      res.end(body === null ? '' : JSON.stringify(body));
    },
    send(body) {
      res.writeHead(statusCode, headers);
      res.end(body);
    },
  };

  try {
    await matched.handler(apiReq, apiRes);
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal error' }));
  }
});

server.listen(PORT, () => {
  console.log(`Zoey API on http://localhost:${PORT}`);
  console.log(
    usingPersistentStore
      ? 'Store: Upstash/Vercel KV'
      : 'Store: in-memory (set KV_REST_API_URL + KV_REST_API_TOKEN to persist)'
  );
  console.log(`Point the app at it:  EXPO_PUBLIC_ZOEY_API_URL=http://<your-lan-ip>:${PORT}`);
});
