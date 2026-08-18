import type { ApiRequest, ApiResponse } from '../_lib/http.js';
import { getMembershipFor } from '../_lib/membership.js';
import { requireOwner } from '../_lib/owner.js';
import { listUsers, storeFor } from '../_lib/store.js';

/**
 * Owner portal: the client list, with membership visible per row.
 *
 * Served as a page from the API rather than built into the Zoey app, because
 * the app must never carry owner credentials or the ability to enumerate other
 * clients. Open it with:
 *
 *   https://<deployment>/api/admin/portal?key=<ZOEY_ADMIN_SECRET>
 *
 * Every row shows ZOEY MEMBER or FREE MEMBER without opening the client, and
 * expanding a row shows the membership detail fields.
 */

const esc = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => (({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }) as Record<string, string>)[c]
  );

const date = (ms: number | null) =>
  typeof ms === 'number' ? new Date(ms).toISOString().slice(0, 10) : '—';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!requireOwner(req, res)) return;

  const users = await listUsers();
  const rows = await Promise.all(
    users.map(async (u) => {
      let name: string | null = null;
      try {
        const p = await storeFor(u.userId).getProfile();
        const parts = [p?.firstName, p?.lastName].filter(Boolean);
        name = parts.length ? parts.join(' ') : null;
      } catch {
        name = null;
      }
      return { ...u, name, membership: await getMembershipFor(u.userId) };
    })
  );
  rows.sort((a, b) => b.lastSeen - a.lastSeen);

  const members = rows.filter((r) => r.membership.status === 'active').length;

  const body = rows
    .map((r) => {
      const active = r.membership.status === 'active';
      return `<tr>
        <td>
          <div class="nm">${esc(r.name ?? 'Unnamed client')}</div>
          <div class="sub">${esc(r.email ?? r.userId)}</div>
        </td>
        <td><span class="badge ${active ? 'member' : 'free'}">${active ? 'ZOEY MEMBER ✓' : 'FREE MEMBER'}</span></td>
        <td class="sub">${esc(r.membership.provider ?? (active ? 'owner-set' : '—'))}</td>
        <td class="sub">${date(r.membership.startedAt)}</td>
        <td class="sub">${date(r.membership.activeUntil)}</td>
        <td class="sub mono">${esc(r.userId)}</td>
      </tr>`;
    })
    .join('');

  const html = `<!doctype html><meta charset="utf-8"><title>Zoey — Clients</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
 :root{color-scheme:dark}
 body{margin:0;background:#07030F;color:#F4EFFF;font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
 .wrap{max-width:1100px;margin:0 auto;padding:32px 20px 60px}
 h1{font-size:24px;margin:0 0 4px}
 .counts{color:#A99BCC;font-size:13px;margin-bottom:24px}
 .card{background:rgba(44,24,84,.32);border:1px solid rgba(168,85,247,.26);border-radius:18px;overflow:hidden}
 table{width:100%;border-collapse:collapse}
 th{text-align:left;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:rgba(244,239,255,.45);padding:14px 16px;border-bottom:1px solid rgba(168,85,247,.18);font-weight:600}
 td{padding:14px 16px;border-bottom:1px solid rgba(168,85,247,.12);vertical-align:top}
 tr:last-child td{border-bottom:none}
 .nm{font-weight:600}
 .sub{color:rgba(244,239,255,.5);font-size:12.5px}
 .mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px}
 .badge{display:inline-block;padding:5px 11px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.04em;white-space:nowrap}
 .badge.member{background:linear-gradient(135deg,#A855F7,#C77DF5);color:#fff;box-shadow:0 0 18px rgba(168,85,247,.5)}
 .badge.free{background:rgba(244,239,255,.08);color:rgba(244,239,255,.55);border:1px solid rgba(244,239,255,.14)}
 .empty{padding:40px 16px;text-align:center;color:rgba(244,239,255,.45)}
 .note{margin-top:20px;font-size:12.5px;color:rgba(244,239,255,.45);line-height:1.6}
 code{background:rgba(168,85,247,.14);padding:2px 6px;border-radius:6px;font-size:11.5px}
</style>
<div class="wrap">
  <h1>Zoey — Clients</h1>
  <div class="counts">${rows.length} total · ${members} Zoey Member${members === 1 ? '' : 's'} · ${rows.length - members} Free</div>
  <div class="card">
    ${
      rows.length
        ? `<table>
      <tr><th>Client</th><th>Membership</th><th>Provider</th><th>Started</th><th>Renews / ends</th><th>User ID</th></tr>
      ${body}
    </table>`
        : `<div class="empty">No clients yet. A client appears here the first time they make an authenticated request.</div>`
    }
  </div>
  <p class="note">
    Membership is server-owned. To set a client for testing before Apple StoreKit is connected:<br>
    <code>POST /api/admin/clients</code> with header <code>x-zoey-admin-secret</code> and body
    <code>{"userId":"…","status":"active"}</code>.<br>
    Owner-set members are recorded with source <code>owner-admin</code> and no provider, so they are never mistaken for real Apple subscriptions.
  </p>
</div>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Never cached or indexed -- this page lists clients.
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  // send() when available (raw HTML); json() would escape it into a string.
  const send = res.send;
  if (send) {
    res.status(200);
    send.call(res, html);
  } else {
    res.status(200).json(html);
  }
}
