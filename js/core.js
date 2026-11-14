/* Core: data layer, session, UI shell, popups. Shared by every page. */
(function () {
  'use strict';
  const C = window.PORTAL;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- icons (inline SVG, no external requests) ---------- */
  const I = {
    home: '<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    out: '<path d="M12 19V5m0 0-6 6m6-6 6 6"/>',
    in: '<path d="M12 5v14m0 0 6-6m-6 6-6-6"/>',
    pct: '<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
    bank: '<path d="M3 10 12 4l9 6M5 10v8m4-8v8m6-8v8m4-8v8M3 21h18"/>',
    logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
    shield: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/><path d="m9 12 2 2 4-4"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    x: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>',
    wrench: '<path d="M14.7 6.3a4 4 0 0 0-5 5L4 17l3 3 5.7-5.7a4 4 0 0 0 5-5l-2.4 2.4-2.6-.4-.4-2.6z"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>'
  };
  const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || ''}</svg>`;

  /* ---------- CSV ---------- */
  function parseCSV(text) {
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (ch !== '\r') cur += ch;
    }
    if (cur.length || row.length) { row.push(cur); rows.push(row); }
    return rows.map(r => r.map(c => c.trim())).filter(r => r.some(c => c !== ''));
  }

  /* ---------- storage (everything personal stays on this device) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { } }
  };
  const session = () => store.get('ap.session', null);

  /* ---------- data (original sources) ---------- */
  const sheetURL = key => `https://docs.google.com/spreadsheets/d/${C.SRC[key].sheet}/gviz/tq?tqx=out:csv${C.SRC[key].tab ? '&sheet=' + encodeURIComponent(C.SRC[key].tab) : ''}&_=${Date.now()}`;
  const norm = h => String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  // Returns [{ <normalizedHeader>: v, c0: v, c1: v … }] — match by header name, fall back to original column position.
  async function readTab(key) {
    let res;
    try { res = await fetch(sheetURL(key), { cache: 'no-store', referrerPolicy: 'no-referrer' }); } catch (e) { throw new Error('NETWORK'); }
    if (!res.ok) throw new Error('NOT_SHARED');
    const text = await res.text();
    if (/^\s*<(!doctype|html)/i.test(text)) throw new Error('NOT_SHARED');
    const rows = parseCSV(text); if (rows.length < 2) return [];
    const head = rows[0].map(norm);
    return rows.slice(1).map(r => { const o = {}; r.forEach((v, i) => { o['c' + i] = v; }); head.forEach((h, i) => { if (h && o[h] === undefined) o[h] = r[i] === undefined ? '' : r[i]; }); return o; });
  }
  const pick = (o, ...keys) => { for (const k of keys) if (o[k] !== undefined && o[k] !== '') return o[k]; return ''; };
  const num = v => { const n = parseFloat(String(v).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; };
  const lc = v => String(v || '').trim().toLowerCase();
  const mine = (agent, user) => lc(agent) === lc(user) || lc(agent) === 'all';

  // Short-lived local overlay so a change shows instantly while the sheet catches up (10 min)
  const overrides = { get: () => store.get('ap.ov', {}), set: o => store.set('ap.ov', o) };
  function applyOv(kind, tx) {
    const o = overrides.get()[kind + ':' + tx.id];
    return o && Date.now() - o.ts < 600000 ? Object.assign({}, tx, o.v) : tx;
  }

  const Data = {
    async users() {
      return (await readTab('users')).map(o => ({
        username: pick(o, 'username', 'user', 'login', 'c0').trim(), password: pick(o, 'password', 'pass', 'c1').trim(),
        logo: pick(o, 'logo', 'c2'), fullName: pick(o, 'fullname', 'name', 'c3'), status: pick(o, 'status', 'c4'),
        message: pick(o, 'message', 'notice', 'c5'), agentType: pick(o, 'agenttype')
      })).filter(u => u.username);
    },
    async withdrawals(user) {
      return (await readTab('withdrawals')).map(o => applyOv('w', {
        id: pick(o, 'transactionnumber', 'c0').trim(), kind: 'Withdrawal', method: pick(o, 'method', 'c1'), account: pick(o, 'accountnumber', 'account', 'c2'),
        userId: pick(o, 'userid', 'c3'), amount: pick(o, 'amount', 'c4'), currency: pick(o, 'currency', 'c5'), agent: pick(o, 'agent', 'c6'),
        status: pick(o, 'status', 'c7') || 'Pending', trxId: pick(o, 'trxid', 'c8'), date: pick(o, 'date')
      })).filter(t => t.id && mine(t.agent, user));
    },
    async deposits(user) {
      return (await readTab('deposits')).map(o => applyOv('d', {
        id: pick(o, 'transactionnumber', 'c0').trim(), kind: 'Deposit', trxId: pick(o, 'trxid', 'c1'), method: pick(o, 'method', 'c2'), userId: pick(o, 'userid', 'c3'),
        amount: pick(o, 'amount', 'c4'), status: pick(o, 'status', 'c5') || 'Pending', agent: pick(o, 'agent', 'c6'), reason: pick(o, 'reason', 'c7'),
        currency: pick(o, 'currency') || 'N/A', date: pick(o, 'date')
      })).filter(t => t.id && mine(t.agent, user));
    },
    // Bank accounts are assigned per agent by the administrator (read-only here)
    async banks(user) {
      const yes = v => ['yes', 'y', 'true', '1', 'default', 'primary'].includes(lc(v));
      return (await readTab('banks')).map((o, i) => ({
        id: 'b' + i, username: pick(o, 'username', 'user', 'agent'), bank: pick(o, 'bankname', 'bank', 'wallet', 'name'),
        title: pick(o, 'accounttitle', 'accountholder', 'holder', 'title'), number: pick(o, 'accountnumber', 'number', 'iban', 'address'),
        type: pick(o, 'type') || 'Bank', currency: pick(o, 'currency'), def: yes(pick(o, 'default', 'isdefault', 'primary'))
      })).filter(b => b.bank && b.number && mine(b.username, user));
    },
    async maintenance(user) {
      for (const o of await readTab('maintenance')) {
        if (lc(pick(o, 'status', 'c1')) !== 'on') continue;
        const who = lc(pick(o, 'username', 'user', 'c0'));
        if (who === 'all' || who === lc(user)) return pick(o, 'notice', 'message', 'c2') || 'We are performing scheduled maintenance. Please check back shortly.';
      }
      return null;
    },
    async security(user) {
      for (const o of await readTab('security')) {
        if (lc(pick(o, 'username', 'user')) === lc(user) && lc(pick(o, 'status')) === 'pending') {
          const amtKeys = Object.keys(o).filter(k => k.startsWith('amo') || k.includes('amount') || k.includes('amound'));
          return { method: pick(o, 'method') || 'USDT', amount: pick(o, 'amount', 'amound', ...amtKeys, 'c2'), address: pick(o, 'usdtaddress', 'address', 'usdt'), qr: pick(o, 'qrlogo', 'qr'), agentType: pick(o, 'agenttype', 'type') };
        }
      }
      return null;
    },
    // Writes to the sheet through its API (same as the original). Returns {ok}.
    async save(kind, tx, patch) {
      const src = C.SRC[kind === 'w' ? 'withdrawals' : 'deposits'];
      const col = { status: 'Status', trxId: 'TRX ID', reason: 'Reason' }, data = {};
      Object.keys(patch).forEach(k => { if (col[k] && !(kind === 'w' && k === 'reason')) data[col[k]] = patch[k]; });
      try {
        const res = await fetch(`https://sheetdb.io/api/v1/${src.api}/Transaction%20Number/${encodeURIComponent(tx.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ data }) });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || j.error || j.updated === 0) return { ok: false };
      } catch (e) { return { ok: false }; }
      const ov = overrides.get(); ov[kind + ':' + tx.id] = { ts: Date.now(), v: Object.assign((ov[kind + ':' + tx.id] || { v: {} }).v, patch) }; overrides.set(ov);
      return { ok: true };
    }
  };

  /* ---------- UI helpers ---------- */
  let toastT;
  function toast(msg, type = 'info') {
    let el = $('#toast'); if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
    el.className = 'toast ' + type; el.textContent = msg; requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 3800);
  }
  async function copy(text, btn) {
    try { await navigator.clipboard.writeText(text); } catch (e) {
      const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
    }
    if (btn) { const o = btn.innerHTML; btn.innerHTML = icon('check') + 'Copied'; btn.classList.add('ok'); setTimeout(() => { btn.innerHTML = o; btn.classList.remove('ok'); }, 1600); }
    else toast('Copied', 'success');
  }
  const badge = s => `<span class="badge ${esc(lc(s))}">${esc(s)}</span>`;
  const money = (n, cur) => (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (cur ? ' ' + esc(cur) : '');
  const fdate = d => { const t = new Date(d); return d && !isNaN(t) ? t.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; };

  function sheet({ title, bodyHTML, actionsHTML = '', onClose }) {
    const wrap = document.createElement('div'); wrap.className = 'overlay';
    wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="sheet-grab"></div>
      <header class="sheet-head"><h2>${title}</h2><button class="icon-btn" data-x aria-label="Close">${icon('close')}</button></header>
      <div class="sheet-body">${bodyHTML}</div>${actionsHTML ? `<footer class="sheet-foot">${actionsHTML}</footer>` : ''}</div>`;
    document.body.appendChild(wrap); document.body.classList.add('lock');
    requestAnimationFrame(() => wrap.classList.add('open'));
    const close = () => { wrap.classList.remove('open'); document.body.classList.remove('lock'); setTimeout(() => wrap.remove(), 250); onClose && onClose(); };
    wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('[data-x]')) close(); });
    const onKey = e => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);
    wrap.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => copy(b.dataset.copy, b)));
    return { el: wrap, close };
  }
  const row = (label, value, copyVal) => `<div class="kv"><span>${esc(label)}</span><b>${value}${copyVal ? `<button class="chip" data-copy="${esc(copyVal)}">${icon('copy')}Copy</button>` : ''}</b></div>`;

  /* ---------- logo ---------- */
  const LOGO=C.LOGO;
  const logoImg=()=>`<img class="logo" src="${LOGO}" alt="${esc(C.name)}" referrerpolicy="no-referrer" onerror="this.outerHTML='<div class=&quot;mark&quot;>A</div>'">`;

  /* ---------- shell ---------- */
  const NAV = [['dashboard.html', 'Overview', 'home'], ['withdrawal.html', 'Withdrawals', 'out'], ['deposit.html', 'Deposits', 'in'], ['commission.html', 'Commission', 'pct'], ['banks.html', 'Bank Accounts', 'bank']];
  function shell(active, title, subtitle) {
    const u = session(); const root = $('#app');
    const initials = (u.fullName || u.username || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const avatar = u.logo ? `<img src="${esc(u.logo)}" alt="" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${esc(initials)}'}))">` : `<span>${esc(initials)}</span>`;
    const nav = NAV.map(([h, l, i]) => `<a href="${h}" class="nav-item ${h === active ? 'active' : ''}">${icon(i)}<span>${l}</span></a>`).join('');
    root.innerHTML = `
      <div class="scrim" id="scrim"></div>
      <aside class="sidebar" id="sidebar">
        <div class="brand">${logoImg()}</div>
        <nav>${nav}</nav>
        <div class="side-foot">
          <div class="me"><div class="avatar">${avatar}</div><div><b>${esc(u.fullName || u.username)}</b><small>${esc(u.agentType || 'Agent')}</small></div></div>
          <button class="nav-item" id="logout">${icon('logout')}<span>Sign Out</span></button>
        </div>
      </aside>
      <main class="main">
        <header class="topbar"><button class="icon-btn menu" id="menuBtn" aria-label="Menu">${icon('menu')}</button><div><h1>${esc(title)}</h1><p>${esc(subtitle || '')}</p></div></header>
        <section id="page"></section>
      </main>`;
    $('#menuBtn').onclick = () => document.body.classList.toggle('nav-open');
    $('#scrim').onclick = () => document.body.classList.remove('nav-open');
    $('#logout').onclick = logout;
    return $('#page');
  }
  function logout() { store.del('ap.session'); sessionStorage.clear(); location.replace('index.html'); }

  /* ---------- guard / polling ---------- */
  async function verify() {
    const u = session(); if (!u) return;
    try {
      const me = (await Data.users()).find(x => lc(x.username) === lc(u.username));
      if (!me) { store.del('ap.session'); sessionStorage.setItem('ap.msg', 'This account is no longer available.'); location.replace('index.html'); return; }
      if (lc(me.status) !== 'active') { store.del('ap.session'); sessionStorage.setItem('ap.msg', me.message || `Your account is ${me.status}.`); location.replace('index.html'); }
    } catch (e) { /* offline: keep working */ }
  }

  async function checkMaintenance() {
    const u = session(); let msg = null; try { msg = await Data.maintenance(u.username); } catch (e) { return; }
    let ov = $('#maint');
    if (!msg) { ov && ov.remove(); document.body.classList.remove('lock'); return; }
    if (ov) { $('p', ov).textContent = msg; return; }
    ov = document.createElement('div'); ov.id = 'maint'; ov.className = 'overlay open maint';
    ov.innerHTML = `<div class="dialog"><div class="dialog-ic">${icon('wrench')}</div><button class="icon-btn" id="mX" style="float:right" aria-label="Close">${icon('close')}</button><h2 style="clear:both">Service Temporarily Unavailable</h2><p></p><button class="btn ghost" id="mOut">Sign Out</button></div>`;
    $('p', ov).textContent = msg; document.body.appendChild(ov); document.body.classList.add('lock'); $('#mOut').onclick = logout;
    $('#mX').onclick = e => { e.stopPropagation(); ov.style.display = 'none'; document.body.classList.remove('lock'); };
    document.addEventListener('click', e => { const o = $('#maint'); if (o && o.style.display === 'none' && !e.target.closest('#logout')) { o.style.display = 'flex'; document.body.classList.add('lock'); } });
  }

  async function securityPopup() {
    const u = session(); if ($('#secSheet')) return;
    let p; try { p = await Data.security(u.username); } catch (e) { return; }
    if (!p) return;
    const submitted = store.get('ap.secSubmitted.' + u.username, false);
    const s = sheet({
      title: 'Security Deposit',
      bodyHTML: `<div id="secSheet" class="sec">
        <div class="sec-hero">${icon('shield')}<div><small>${esc(p.agentType || 'Agent')} · ${esc(p.method)}</small><div class="sec-amt">${esc(num(p.amount) ? num(p.amount).toLocaleString('en-US') : p.amount)} <span>USDT</span></div></div></div>
        ${p.qr ? `<div class="qr"><img src="${esc(p.qr)}" alt="Payment QR code" referrerpolicy="no-referrer"></div>` : ''}
        <label class="lbl">Wallet address</label>
        <div class="addr"><code>${esc(p.address)}</code><button class="chip" data-copy="${esc(p.address)}">${icon('copy')}Copy</button></div>
        <p class="note">This is a refundable security deposit — not an investment. It protects against loss and you earn commission on it according to your agent type.</p>
        <div class="verify" id="verify" ${submitted ? '' : 'hidden'}>${icon('check')}<div><b>Payment received</b><span>It will be auto-verified and confirmed shortly.</span></div></div></div>`,
      actionsHTML: submitted ? `<button class="btn primary" disabled>Auto-verifying…</button>` : `<button class="btn primary" id="paidBtn">I’ve Sent the Payment</button><button class="btn ghost" data-x>Later</button>`
    });
    const b = $('#paidBtn', s.el);
    if (b) b.onclick = () => { store.set('ap.secSubmitted.' + u.username, true); b.textContent = 'Auto-verifying…'; b.disabled = true; $('#verify', s.el).hidden = false; toast('Payment will be auto-verified and confirmed.', 'success'); };
  }

  /* ---------- boot ---------- */
  function boot(opts) {
    if (!session()) { location.replace('index.html'); return null; }
    const page = shell(opts.active, opts.title, opts.subtitle);
    verify(); checkMaintenance(); securityPopup();
    setInterval(() => { verify(); checkMaintenance(); }, C.POLL_MS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { verify(); checkMaintenance(); securityPopup(); } });
    return page;
  }

  window.AP = { $, esc, icon, store, session, Data, toast, copy, badge, money, fdate, sheet, row, boot, logout, lc, num, parseCSV, norm };
})();
