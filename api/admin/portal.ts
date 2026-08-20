import type { ApiRequest, ApiResponse } from '../_lib/http.js';
import { getMembershipFor } from '../_lib/membership.js';
import { requireOwnerSession } from '../_lib/owner.js';
import { listUsers, persistenceBackend, storeFor } from '../_lib/store.js';

/**
 * Owner portal: the client list, with membership visible per row.
 *
 * Served as a page from the API rather than built into the Zoey app, because
 * the app must never carry owner credentials or the ability to enumerate other
 * clients.
 *
 * Reached by signing in at /api/admin/login. It used to be opened with the owner
 * secret in the query string, which put a long-lived credential in the address
 * bar, the platform's access log and the Referer of everything the page loaded.
 * That path is gone; this reads a session cookie and nothing else.
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
  // Human only. There is no machine path to the portal page and no credential read from a URL.
  if (!(await requireOwnerSession(req, res))) return;

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
        <td><button class="btn ${active ? 'on' : ''}" data-user="${esc(r.userId)}" data-status="${active ? 'active' : 'free'}">${active ? 'Revoke' : 'Grant membership'}</button></td>
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
 .btn{background:linear-gradient(135deg,#A855F7,#C77DF5);color:#fff;border:none;border-radius:999px;padding:7px 14px;font-size:11.5px;font-weight:700;letter-spacing:.03em;cursor:pointer;white-space:nowrap}
 .btn.on{background:rgba(244,239,255,.08);color:rgba(244,239,255,.62);border:1px solid rgba(244,239,255,.16)}
 .btn[disabled]{opacity:.55;cursor:default}
 .empty{padding:40px 16px;text-align:center;color:rgba(244,239,255,.45)}
 .note{margin-top:20px;font-size:12.5px;color:rgba(244,239,255,.45);line-height:1.6}
 code{background:rgba(168,85,247,.14);padding:2px 6px;border-radius:6px;font-size:11.5px}
</style>
<div class="wrap">
  <h1>Zoey — Clients</h1>
  <div class="counts">${rows.length} total · ${members} Zoey Member${members === 1 ? '' : 's'} · ${rows.length - members} Free · storage: <b>${esc(persistenceBackend)}</b></div>
  <div class="card">
    ${
      rows.length
        ? `<table>
      <tr><th>Client</th><th>Membership</th><th>Provider</th><th>Started</th><th>Renews / ends</th><th>User ID</th><th>Owner action</th></tr>
      ${body}
    </table>`
        : `<div class="empty">No clients yet. A client appears here the first time they make an authenticated request.</div>`
    }
  </div>
  <form method="POST" action="/api/admin/logout" style="margin:0 0 14px">
    <button type="submit" style="padding:7px 12px;border:0;border-radius:10px;background:rgba(255,255,255,.08);color:#EDE9F5;font-size:13px">Sign out</button>
  </form>
  <p class="note">
    Membership is server-owned. <b>Owner action</b> calls <code>POST /api/admin/clients</code>, which
    authenticates the same signed-in session that loaded this page.<br>
    A grant made here is recorded with source <code>owner-admin</code> and no provider, so it is never
    mistaken for a real Apple subscription, and it does not touch pricing or the paywall: a granted
    account passes the same <code>status === 'active'</code> check a paying member passes.
  </p>
</div>
<script>
/*
 * The only privileged thing on this page, and it now carries no credential at all.
 *
 * The session cookie is HttpOnly, so this script cannot read it and does not need to -- the browser
 * attaches it, the same-origin credentials mode says so explicitly, and the server re-checks it
 * along with the Origin. There is nothing here for a page-scraper or an extension to steal, which
 * was not true when the key sat in the URL this script read.
 */
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-user]');
  if (!btn) return;

  const next = btn.dataset.status === 'active' ? 'free' : 'active';
  if (next === 'free' && !confirm('Return this client to Free Member?')) return;

  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Working...';
  try {
    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: btn.dataset.user, status: next }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    location.reload();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = label;
    alert('Could not update membership. The server refused the change.');
  }
});
</script>`;

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
