(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const H = 36e5;
  const fmt = t => new Date(t).toLocaleDateString(document.documentElement.lang === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const hrs = t => Math.floor((Date.now() - t) / H);
  const dur = t => { const h = hrs(t); return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h`; };

  const P = { // outline icons (same 24x24 / stroke-2 style as the rest of the site)
    doc: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    cal: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    swap: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
    eye: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
    ok: 'M5 13l4 4L19 7', no: 'M6 18L18 6M6 6l12 12', mail: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
  };
  const ic = n => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="${P[n]}"/></svg>`;
  const pill = (t, c) => `<span class="status-pill ${c}">${esc(t)}</span>`;
  const ib = (act, id, icon, label, cls = '') => `<button type="button" class="icon-btn ${cls}" data-act="${act}" data-id="${id}" title="${label}" aria-label="${label}">${ic(icon)}</button>`;
  const empty = m => `<p class="empty">${m}</p>`;
  const tbl = (h, rows) => rows ? `<div class="table-responsive"><table class="cases-table"><thead><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>` : '';
  const idCell = id => `<div class="case-id-cell"><div class="icon-box icon-box--sm">${ic('doc')}</div><strong>${esc(id)}</strong></div>`;
  const dateCell = t => `<div class="date-cell">${ic('cal')}<span>${fmt(t)}</span></div>`;
  const prio = p => `<span class="badge badge-${p}">${p[0].toUpperCase() + p.slice(1)}</span>`;
  const ST = { pending: ['pending', 'status-review'], handled: ['handled', 'status-approved'] }; // delayed requests: only these two statuses exist in the database
  const CST = { open: ['open', 'status-review'], investigating: ['under investigation', 'pill-info'], resolved: ['resolved', 'status-approved'] };
  const ROLE = { doctor: 'doctor', radiologist: 'radiologist' };     // registration roles (as in the backlog)
  const WHO = { doctor: 'doctor', radiologist: 'radiologist', patient: 'patient' }; // complainant roles

  // ---- data: everything comes from the FastAPI backend (backend/routes_admin.py and routes_auth.py) ----
  const DB = { delayed: [], pending: [], history: [], accounts: [], cmp: [], summary: { delayed: 0, licenses: 0, complaints: 0 } };
  const ts = v => (v ? Date.parse(v) : 0);

  async function api(url, method = 'GET', body) {
    let res;
    try {
      res = await fetch(url, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    } catch (e) { toast('could not reach the server.'); return null; }
    if (res.status === 401 || res.status === 403) { location.href = '/login'; return null; }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) { toast('something went wrong: ' + (data.error || res.status)); return null; }
    return data;
  }

  const EVENT = { assigned: 'assigned to', reassigned: 'reassigned to', approved: 'approved by' };
  const LOAD = {
    async summary() { const d = await api('/api/admin/summary'); if (d) DB.summary = d; },
    async delayed() {
      const d = await api('/api/admin/delayed'); if (!d) return;
      DB.delayed = d.delayed.map(r => {
        const log = r.log.map(e => ({ t: ts(e.created_at), txt: `${EVENT[e.event_type] || e.event_type} ${e.doctor_name || '-'}.` + (e.note ? ' ' + e.note : '') }));
        log.push({ t: ts(r.reported_at), txt: `delay reported by ${r.raised_by} (${r.source}).` });
        if (r.handled_at) log.push({ t: ts(r.handled_at), txt: 'marked as handled.' });
        return { id: String(r.delay_complaint_id), no: 'C-' + r.case_id, src: r.source, dr: r.doctor_name || 'not assigned', at: ts(r.submitted_at), st: r.status, by: r.raised_by, pt: r.patient_name, log: log.sort((x, y) => x.t - y.t) };
      });
    },
    async pending() {
      const d = await api('/api/admin/requests'); if (!d) return;
      DB.pending = d.requests.map(r => ({ id: String(r.user_id), name: r.full_name, role: r.role, scfhs: r.scfhs_number, nid: r.national_id, email: r.email, phone: r.phone, at: ts(r.created_at) }));
    },
    async history() {
      const d = await api('/api/admin/decisions'); if (!d) return;
      DB.history = d.decisions.map(r => ({ name: r.applicant_name, role: r.applicant_role, d: r.decision, why: r.reason || '', at: ts(r.decided_at) }));
    },
    async accounts() {
      const d = await api('/api/admin/accounts'); if (!d) return;
      DB.accounts = d.accounts.map(r => ({ id: String(r.user_id), name: r.full_name, role: r.role, scfhs: r.scfhs_number, at: ts(r.approved_at) }));
    },
    async complaints() {
      const d = await api('/api/admin/complaints'); if (!d) return;
      DB.cmp = d.complaints.map(c => ({ id: String(c.complaint_id), no: 'T-' + c.complaint_id, who: c.complainant_role, name: c.complainant, sub: c.subject, body: c.body, st: c.status, at: ts(c.created_at), th: c.replies.map(m => ({ t: ts(m.created_at), txt: m.body })) }));
    }
  };
  const reload = (...names) => Promise.all(names.map(n => LOAD[n]())).then(() => draw());

  const PAGE = document.body.dataset.page || 'home'; // home | delayed | licenses | complaints (one HTML page each)
  const S = { tab: PAGE, sub: PAGE === 'licenses' && location.hash === '#accounts' ? 'accounts' : 'pending', who: '', f: {} };
  const inp = (f, ph, type = 'text') => `<input data-f="${f}" type="${type}" placeholder="${ph}" aria-label="${ph}" value="${esc(S.f[f] || '')}">`;
  const sel = (f, list, all) => `<select data-f="${f}" aria-label="${all}"><option value="">${all}</option>${list.map(([v, l]) => `<option value="${v}"${S.f[f] === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
  const has = (txt, q) => !q || txt.toLowerCase().includes(q.toLowerCase());

  const BAR = {
    delayed: () => inp('q', 'search case or doctor') + sel('src', [['patient', 'patient'], ['radiologist', 'radiologist']], 'all sources') + sel('s', Object.entries(ST).map(([k, v]) => [k, v[0]]), 'all statuses'),
    licenses: () => `<div class="seg">${[['pending', 'pending requests'], ['history', 'decision history'], ['accounts', 'active accounts']].map(([k, l]) => `<button type="button" data-act="sub" data-id="${k}" aria-pressed="${S.sub === k}">${l}</button>`).join('')}</div>` +
      (S.sub === 'pending' ? sel('r', Object.entries(ROLE), 'all roles') : '') +
      (S.sub === 'history' ? inp('q', 'search applicant') + sel('d', [['approved', 'approved'], ['rejected', 'rejected']], 'all decisions') + inp('from', 'from date', 'date') + inp('to', 'to date', 'date') : '') +
      (S.sub === 'accounts' ? inp('q', 'search name or SCFHS number') + sel('r', Object.entries(ROLE), 'all roles') : ''),
    complaints: () => inp('q', 'search subject or name') + sel('w', Object.entries(WHO), 'all roles') + sel('s', Object.entries(CST).map(([k, v]) => [k, v[0]]), 'all statuses')
  };

  const OUT = {
    delayed(lim) {
      const f = S.f, rows = DB.delayed.filter(r => (!f.src || r.src === f.src) && (!f.s || r.st === f.s) && has(r.no + r.dr, f.q)).sort((a, b) => a.at - b.at).slice(0, lim || 999).map(r => `<tr>
        <td>${idCell(r.no)}</td><td>${esc(r.src)}</td><td>${esc(r.dr)}</td><td>${dateCell(r.at)}</td>
        <td>${pill(dur(r.at), hrs(r.at) > 48 ? 'pill-bad' : 'status-review')}</td><td>${pill(...ST[r.st])}</td>
        <td><div class="actions-cell">${ib('reas', r.id, 'swap', 'reassign')}${ib('dview', r.id, 'eye', 'view details')}</div></td></tr>`).join('');
      return tbl(['case id', 'source', 'assigned doctor', 'submitted', 'delay', 'status', 'actions'], rows) || empty('no delayed requests. everything is on schedule.');
    },
    licenses(lim) {
      const f = S.f;
      if (S.sub === 'pending') {
        const rows = DB.pending.filter(r => !f.r || r.role === f.r).sort((a, b) => a.at - b.at).slice(0, lim || 999).map(r => `<tr><td>${idCell(r.name)}<small>${esc(r.email)}</small></td><td>${pill(ROLE[r.role], 'pill-mute')}</td><td>${esc(r.scfhs)}</td><td>${esc(r.nid)}</td><td>${dateCell(r.at)}</td>
          <td>${pill('pending', 'status-review')}</td>
          <td><div class="actions-cell">${ib('lview', r.id, 'eye', 'view details')}${ib('appr', r.id, 'ok', 'approve', 'ok')}${ib('rej', r.id, 'no', 'reject', 'bad')}</div></td></tr>`).join('');
        return tbl(['applicant', 'role', 'SCFHS file number', 'national ID / iqama', 'submitted', 'status', 'actions'], rows) || empty('no pending requests. all requests have been reviewed.');
      }
      if (S.sub === 'history') {
        const rows = DB.history.filter(r => has(r.name, f.q) && (!f.d || r.d === f.d) && (!f.from || r.at >= new Date(f.from)) && (!f.to || r.at <= new Date(f.to).getTime() + 864e5 - 1)).sort((a, b) => b.at - a.at)
          .map(r => `<tr><td><strong>${esc(r.name)}</strong></td><td>${ROLE[r.role]}</td><td>${pill(r.d, r.d === 'approved' ? 'status-approved' : 'pill-bad')}</td><td>${esc(r.why || '-')}</td><td>${dateCell(r.at)}</td></tr>`).join('');
        return tbl(['applicant', 'role', 'decision', 'reason', 'date'], rows) || empty('no matching records.');
      }
      const rows = DB.accounts.filter(r => has(r.name + r.scfhs, f.q) && (!f.r || r.role === f.r)).map(r => `<tr><td><strong>${esc(r.name)}</strong></td><td>${ROLE[r.role]}</td><td>${esc(r.scfhs)}</td><td>${dateCell(r.at)}</td><td><div class="actions-cell">${ib('del', r.id, 'trash', 'delete account', 'bad')}</div></td></tr>`).join('');
      return tbl(['name', 'role', 'SCFHS file number', 'approval date', 'actions'], rows) || empty('no matching accounts.');
    },
    complaints(lim) {
      const f = S.f, rows = DB.cmp.filter(c => (!f.w || c.who === f.w) && (!f.s || c.st === f.s) && has(c.sub + c.name, f.q)).sort((a, b) => b.at - a.at).slice(0, lim || 999)
        .map(c => `<tr><td>${idCell(c.no)}</td><td><strong>${esc(c.name)}</strong> ${pill(WHO[c.who], 'pill-mute')}</td><td>${esc(c.sub)}</td><td>${pill(...CST[c.st])}</td><td>${dateCell(c.at)}</td><td><div class="actions-cell">${ib('cview', c.id, 'eye', 'view and respond')}</div></td></tr>`).join('');
      return tbl(['ticket', 'complainant', 'subject', 'status', 'submitted', 'actions'], rows) || empty('no complaints match these filters.');
    }
  };

  function draw(full = true) {
    const n = DB.summary;
    const ICO = { // same icon style as the doctor dashboard (heroicons outline)
      delayed: ['', 'M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z'],
      licenses: ['', 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z'],
      complaints: [' icon-box--warning', 'M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5']
    };
    const card = (k, num, l, tag, attrs) => `<${tag} class="card stat-card"${attrs}><div class="icon-box${ICO[k][0]}"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="${ICO[k][1]}"/></svg></div><div class="stat-info"><strong class="stat-number">${num}</strong><span class="stat-label">${l}</span></div></${tag}>`;
    if (PAGE === 'home') {
      $('#stats').innerHTML = [['delayed', 'delayed requests', 'admin-delayed-requests.html'], ['licenses', 'pending license requests', 'admin-license-verification.html'], ['complaints', 'general complaints', 'admin-complaints.html']].map(([k, l, href]) => card(k, n[k], l, 'a', ` href="${href}"`)).join('');
      return;
    }
    const p = $('#p-' + PAGE);
    if (full) $('.bar', p).innerHTML = BAR[PAGE]();
    $('.out', p).innerHTML = OUT[PAGE]();
  }

  const dlg = $('#dlg'), panel = $('#panel');
  function toast(m) { const t = $('#toast'); t.innerHTML = `<span>${esc(m)}</span>`; clearTimeout(toast.id); toast.id = setTimeout(() => t.innerHTML = '', 3500); }
  function ask({ title, text = '', ok = 'confirm', danger, field, opts, req }, cb) {
    dlg.innerHTML = `<form method="dialog"><h3>${esc(title)}</h3><p class="subtitle">${esc(text)}</p>${field ? `<label>${esc(field)}${opts ? `<select name="v">${opts.map(o => `<option>${esc(o)}</option>`).join('')}</select>` : '<textarea name="v" rows="3"></textarea>'}</label><small class="err" hidden>this field is required.</small>` : ''}<div class="dlg-actions"><button type="button" class="btn btn-ghost" data-close>cancel</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}">${ok}</button></div></form>`;
    const f = $('form', dlg);
    f.onsubmit = e => { e.preventDefault(); const v = f.v ? f.v.value.trim() : ''; if (req && !v) { $('.err', dlg).hidden = false; return; } dlg.close(); cb(v); };
    $('[data-close]', dlg).onclick = () => dlg.close();
    dlg.showModal();
  }
  function openPanel(title, html) {
    panel.innerHTML = `<header><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-act="pclose" aria-label="close">${ic('no')}</button></header><div class="panel-body">${html}</div>`;
    if (!panel.open) panel.showModal();
  }
  const kv = o => `<dl class="kv">${Object.entries(o).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
  let DOCTORS = []; // approved doctors, loaded when the reassign dialog opens
  const by = (arr, id) => arr.find(x => x.id === id);

  async function decide(r, d, why = '') {
    const res = await api(`/api/admin/requests/${r.id}/${d === 'approved' ? 'approve' : 'reject'}`, 'POST', d === 'rejected' ? { reason: why } : {});
    if (!res) return;
    toast(d === 'approved' ? `${r.name} approved. they can now log in.` : `${r.name} rejected. the reason was saved.`);
    panel.open && panel.close(); reload('pending', 'history', 'accounts');
  }
  function openDelayed(id) {
    const r = by(DB.delayed, id);
    openPanel(`${r.no} · delayed request`, kv({ source: r.src, 'reported by': r.by, patient: r.pt, 'assigned doctor': r.dr, submitted: fmt(r.at), delay: dur(r.at), status: ST[r.st][0] }) +
      `<h3>what happened</h3>${[...r.log].reverse().map(m => `<div class="msg"><small>${fmt(m.t)}</small>${esc(m.txt)}</div>`).join('')}
      ${r.st === 'pending' ? `<div class="panel-actions"><button type="button" class="btn btn-primary" data-act="dhandled" data-id="${r.id}">mark as handled</button></div>` : ''}`);
  }
  function openComplaint(id) {
    const c = by(DB.cmp, id);
    openPanel(`${c.id} · ${c.sub}`, kv({ complainant: `${c.name} (${WHO[c.who]})`, status: CST[c.st][0], submitted: fmt(c.at) }) +
      `<div class="msg">${esc(c.body)}</div>${c.th.map(m => `<div class="msg"><small>admin · ${fmt(m.t)}</small>${esc(m.txt)}</div>`).join('')}
      <label>status<select id="c-st">${Object.entries(CST).map(([k, v]) => `<option value="${k}"${k === c.st ? ' selected' : ''}>${v[0]}</option>`).join('')}</select></label>
      <label>your response<textarea id="c-txt" rows="4"></textarea></label><small class="err" hidden>write a response or change the status first.</small>
      <div class="panel-actions"><button type="button" class="btn btn-primary" data-act="reply" data-id="${c.id}">send response</button></div>`);
  }

  const A = {
    sub: id => { S.sub = id; S.f = {}; draw(); },
    pclose: () => panel.close(),
    reas: async id => {
      const r = by(DB.delayed, id), d = await api('/api/admin/doctors'); if (!d) return;
      DOCTORS = d.doctors.filter(x => x.full_name !== r.dr);
      ask({ title: `reassign ${r.no}`, text: `currently assigned to ${r.dr}.`, ok: 'reassign', field: 'new doctor', opts: DOCTORS.map(x => x.full_name) }, async v => {
        const doc = DOCTORS.find(x => x.full_name === v); if (!doc) return;
        if (await api(`/api/admin/delayed/${id}/reassign`, 'POST', { doctor_id: doc.user_id })) { toast(`${r.no} reassigned to ${v}.`); reload('delayed'); }
      });
    },
    dview: id => openDelayed(id),
    dhandled: async id => { if (await api(`/api/admin/delayed/${id}/handled`, 'POST', {})) { toast('marked as handled'); await LOAD.delayed(); openDelayed(id); draw(false); } },
    lview: id => {
      const r = by(DB.pending, id);
      openPanel(r.name, kv({ role: ROLE[r.role], 'SCFHS file number': r.scfhs, 'national ID / iqama': r.nid, email: r.email, phone: r.phone, submitted: fmt(r.at) }) +
        `<div class="panel-actions"><button type="button" class="btn btn-primary" data-act="appr" data-id="${id}">approve</button><button type="button" class="btn btn-danger" data-act="rej" data-id="${id}">reject</button></div>`);
    },
    appr: id => decide(by(DB.pending, id), 'approved'),
    rej: id => { const r = by(DB.pending, id); ask({ title: `reject ${r.name}`, text: 'the applicant will see this reason and can submit a new request.', ok: 'reject', danger: true, field: 'rejection reason', req: true }, v => decide(r, 'rejected', v)); },
    del: id => { const r = by(DB.accounts, id); ask({ title: `delete ${r.name}?`, text: 'this permanently removes the account and blocks future logins with these credentials.', ok: 'delete account', danger: true }, async () => { if (await api(`/api/admin/accounts/${id}`, 'DELETE')) { toast('account deleted'); reload('accounts'); } }); },
    cview: openComplaint,
    reply: async id => {
      const c = by(DB.cmp, id), txt = $('#c-txt', panel).value.trim(), st = $('#c-st', panel).value;
      if (!txt && st === c.st) { $('.err', panel).hidden = false; return; }
      if (await api(`/api/admin/complaints/${id}/respond`, 'POST', { status: st, reply: txt })) { toast(txt ? 'response sent' : 'status updated'); await LOAD.complaints(); openComplaint(id); draw(false); }
    }
  };

  document.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b && A[b.dataset.act]) A[b.dataset.act](b.dataset.id); });
  document.addEventListener('input', e => { const f = e.target.dataset.f; if (f) { S.f[f] = e.target.value; draw(false); } });
  window.AdminUI = { redraw: () => draw() };
  draw(); // empty tables while the data loads
  reload(...({ home: ['summary'], delayed: ['delayed'], licenses: ['pending', 'history', 'accounts'], complaints: ['complaints'] }[PAGE]));
})();
