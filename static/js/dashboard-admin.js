(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const H = 36e5, T0 = Date.now(), ago = h => T0 - h * H;
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
  const ST = { open: ['open', 'status-approved'], pending: ['pending review', 'status-review'], investigating: ['under investigation', 'pill-info'] };
  const CST = { open: ['open', 'status-review'], investigating: ['under investigation', 'pill-info'], resolved: ['resolved', 'status-approved'] };
  const ROLE = { doctor: 'doctor', radiologist: 'radiologist' };     // registration roles (as in the backlog)
  const WHO = { doctor: 'doctor', radiologist: 'radiologist', patient: 'patient' }; // complainant roles

  // TODO: Connect to backend API. Replace this mock object with fetch() calls (suggested endpoint above each list).
  const DB = {
    delayed: [ // GET /api/admin/requests/delayed  (log = what happened so far: GET /api/admin/requests/:id/activity)
      { id: 'C-240318', src: 'patient', dr: 'Dr. Reem Alharbi', at: ago(80), st: 'pending', log: [{ t: ago(79), txt: 'case submitted and assigned to Dr. Reem Alharbi.' }, { t: ago(30), txt: 'review is overdue. status set to pending review.' }] },
      { id: 'C-240322', src: 'radiologist', dr: 'Dr. Khalid Alzahrani', at: ago(52), st: 'open', log: [{ t: ago(51), txt: 'case submitted and assigned to Dr. Khalid Alzahrani.' }] },
      { id: 'C-240329', src: 'doctor', dr: 'Dr. Reem Alharbi', at: ago(30), st: 'pending', log: [{ t: ago(29), txt: 'case submitted and assigned to Dr. Reem Alharbi.' }] },
      { id: 'C-240331', src: 'radiologist', dr: 'Dr. Maha Alsaif', at: ago(27), st: 'investigating', log: [{ t: ago(26), txt: 'case submitted and assigned to Dr. Salma Alotaibi.' }, { t: ago(12), txt: 'reassigned from Dr. Salma Alotaibi to Dr. Maha Alsaif.' }, { t: ago(6), txt: 'status changed to under investigation. note: checking why the review stalled.' }] },
      { id: 'C-240340', src: 'patient', dr: 'Dr. Khalid Alzahrani', at: ago(25), st: 'open', log: [{ t: ago(24), txt: 'case submitted and assigned to Dr. Khalid Alzahrani.' }] }],
    pending: [ // GET /api/admin/registrations?status=pending
      { id: 'R-101', name: 'Dr. Haya Alotaibi', role: 'doctor', scfhs: '12-H-48213', nid: '1098765421', email: 'haya.o@example.com', at: ago(30), exp: '2027-03-01', st: 'pending' },
      { id: 'R-102', name: 'Sara Almutairi', role: 'radiologist', scfhs: '09-R-30177', nid: '2145678903', email: 'sara.m@example.com', at: ago(75), exp: '2026-12-15', st: 'pending' },
      { id: 'R-103', name: 'Dr. Omar Alqahtani', role: 'doctor', scfhs: '15-H-52090', nid: '1076543218', email: 'omar.q@example.com', at: ago(5), exp: '2028-01-20', st: 'pending' }],
    history: [ // GET /api/admin/registrations/history
      { name: 'Dr. Lina Alshehri', role: 'doctor', d: 'approved', why: '', at: ago(200) },
      { name: 'Fahad Aldosari', role: 'radiologist', d: 'rejected', why: 'SCFHS license number could not be verified.', at: ago(150) }],
    accounts: [ // GET /api/admin/accounts
      { id: 'A-1', name: 'Dr. Lina Alshehri', role: 'doctor', scfhs: '11-H-40021', at: ago(200) },
      { id: 'A-2', name: 'Dr. Reem Alharbi', role: 'doctor', scfhs: '10-H-39877', at: ago(900) },
      { id: 'A-3', name: 'Noura Alghamdi', role: 'radiologist', scfhs: '08-R-28811', at: ago(700) }],
    cmp: [ // GET /api/admin/complaints
      { id: 'T-501', who: 'patient', name: 'Sarah', sub: 'The report was hard to understand', body: 'I received my report but the severity explanation still has medical terms I do not understand.', urg: 'medium', st: 'open', at: ago(20), th: [] },
      { id: 'T-502', who: 'patient', name: 'Fahad', sub: 'Case status has not changed for days', body: 'My case is still under review after four days. Can someone check?', urg: 'high', st: 'investigating', at: ago(96), th: [{ t: ago(70), txt: 'We are checking with the assigned doctor.' }] },
      { id: 'T-503', who: 'doctor', name: 'Dr. Reem Alharbi', sub: 'Heatmap overlay is too faint', body: 'On some X-rays the heatmap is hard to see. Please review the contrast.', urg: 'low', st: 'open', at: ago(40), th: [] },
      { id: 'T-504', who: 'doctor', name: 'Dr. Khalid Alzahrani', sub: 'Priority list order looks wrong', body: 'A grade 4 case appeared below a grade 2 case in my queue.', urg: 'high', st: 'open', at: ago(8), th: [] },
      { id: 'T-505', who: 'radiologist', name: 'Noura Alghamdi', sub: 'Cannot link a case to a registered patient', body: 'The Health ID search says not found for a patient who is registered.', urg: 'high', st: 'investigating', at: ago(30), th: [] },
      { id: 'T-506', who: 'radiologist', name: 'Sara Almutairi', sub: 'Upload page is slow', body: 'Uploading takes more than a minute on the hospital network.', urg: 'medium', st: 'resolved', at: ago(300), th: [{ t: ago(280), txt: 'Fixed in the latest update. Thank you.' }] }]
  };

  const PAGE = document.body.dataset.page || 'home'; // home | delayed | licenses | complaints (one HTML page each)
  const S = { tab: PAGE, sub: PAGE === 'licenses' && location.hash === '#accounts' ? 'accounts' : 'pending', who: '', f: {} };
  const inp = (f, ph, type = 'text') => `<input data-f="${f}" type="${type}" placeholder="${ph}" aria-label="${ph}" value="${esc(S.f[f] || '')}">`;
  const sel = (f, list, all) => `<select data-f="${f}" aria-label="${all}"><option value="">${all}</option>${list.map(([v, l]) => `<option value="${v}"${S.f[f] === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
  const has = (txt, q) => !q || txt.toLowerCase().includes(q.toLowerCase());

  const BAR = {
    delayed: () => inp('q', 'search case or doctor') + sel('src', [['patient', 'patient'], ['doctor', 'doctor'], ['radiologist', 'radiologist']], 'all sources') + sel('s', Object.entries(ST).map(([k, v]) => [k, v[0]]), 'all statuses'),
    licenses: () => `<div class="seg">${[['pending', 'pending requests'], ['history', 'decision history'], ['accounts', 'active accounts']].map(([k, l]) => `<button type="button" data-act="sub" data-id="${k}" aria-pressed="${S.sub === k}">${l}</button>`).join('')}</div>` +
      (S.sub === 'pending' ? sel('r', Object.entries(ROLE), 'all roles') : '') +
      (S.sub === 'history' ? inp('q', 'search applicant') + sel('d', [['approved', 'approved'], ['rejected', 'rejected']], 'all decisions') + inp('from', 'from date', 'date') + inp('to', 'to date', 'date') : '') +
      (S.sub === 'accounts' ? inp('q', 'search name or SCFHS number') + sel('r', Object.entries(ROLE), 'all roles') : ''),
    complaints: () => inp('q', 'search subject or name') + sel('w', Object.entries(WHO), 'all roles') + sel('s', Object.entries(CST).map(([k, v]) => [k, v[0]]), 'all statuses')
  };

  const OUT = {
    delayed(lim) {
      const f = S.f, rows = DB.delayed.filter(r => (!f.src || r.src === f.src) && (!f.s || r.st === f.s) && has(r.id + r.dr, f.q)).sort((a, b) => a.at - b.at).slice(0, lim || 999).map(r => `<tr>
        <td>${idCell(r.id)}</td><td>${esc(r.src)}</td><td>${esc(r.dr)}</td><td>${dateCell(r.at)}</td>
        <td>${pill(dur(r.at), hrs(r.at) > 48 ? 'pill-bad' : 'status-review')}</td><td>${pill(...ST[r.st])}</td>
        <td><div class="actions-cell">${ib('reas', r.id, 'swap', 'reassign')}${ib('dview', r.id, 'eye', 'view details')}</div></td></tr>`).join('');
      return tbl(['case id', 'source', 'assigned doctor', 'submitted', 'delay', 'status', 'actions'], rows) || empty('no delayed requests. everything is on schedule.');
    },
    licenses(lim) {
      const f = S.f;
      if (S.sub === 'pending') {
        const rows = DB.pending.filter(r => !f.r || r.role === f.r).sort((a, b) => a.at - b.at).slice(0, lim || 999).map(r => `<tr><td>${idCell(r.name)}<small>${esc(r.email)}</small></td><td>${pill(ROLE[r.role], 'pill-mute')}</td><td>${esc(r.scfhs)}</td><td>${esc(r.nid)}</td><td>${dateCell(r.at)}</td>
          <td>${r.st === 'info' ? pill('more info requested', 'pill-info') : pill('pending', 'status-review')}</td>
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
        .map(c => `<tr><td>${idCell(c.id)}</td><td><strong>${esc(c.name)}</strong> ${pill(WHO[c.who], 'pill-mute')}</td><td>${esc(c.sub)}</td><td>${pill(...CST[c.st])}</td><td>${dateCell(c.at)}</td><td><div class="actions-cell">${ib('cview', c.id, 'eye', 'view and respond')}</div></td></tr>`).join('');
      return tbl(['ticket', 'complainant', 'subject', 'status', 'submitted', 'actions'], rows) || empty('no complaints match these filters.');
    }
  };

  function draw(full = true) {
    const n = { delayed: DB.delayed.length, licenses: DB.pending.length, complaints: DB.cmp.filter(c => c.st !== 'resolved').length };
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
  const doctors = () => [...new Set([...DB.delayed.map(r => r.dr), ...DB.accounts.filter(a => a.role === 'doctor').map(a => a.name)])];
  const by = (arr, id) => arr.find(x => x.id === id);

  function decide(r, d, why = '') { // TODO: POST /api/admin/registrations/:id/{approve|reject}  (approve also activates the account and notifies the applicant)
    DB.pending = DB.pending.filter(x => x.id !== r.id);
    DB.history.push({ name: r.name, role: r.role, d, why, at: Date.now() });
    if (d === 'approved') DB.accounts.push({ id: 'A-' + r.id, name: r.name, role: r.role, scfhs: r.scfhs, at: Date.now() });
    toast(d === 'approved' ? `${r.name} approved. they can now log in.` : `${r.name} rejected. the reason was saved.`);
    panel.open && panel.close(); draw();
  }
  function openDelayed(id) {
    const r = by(DB.delayed, id);
    openPanel(`${r.id} · delayed request`, kv({ source: r.src, 'assigned doctor': r.dr, submitted: fmt(r.at), delay: dur(r.at), status: ST[r.st][0] }) +
      `<h3>what happened</h3>${[...r.log].reverse().map(m => `<div class="msg"><small>${fmt(m.t)}</small>${esc(m.txt)}</div>`).join('')}
      <label>status<select id="d-st">${Object.entries(ST).map(([k, v]) => `<option value="${k}"${k === r.st ? ' selected' : ''}>${v[0]}</option>`).join('')}</select></label>
      <label>note (optional)<textarea id="d-note" rows="3"></textarea></label><small class="err" hidden>change the status or write a note first.</small>
      <div class="panel-actions"><button type="button" class="btn btn-primary" data-act="dsave" data-id="${r.id}">save update</button></div>`);
  }
  function openComplaint(id) {
    const c = by(DB.cmp, id);
    openPanel(`${c.id} · ${c.sub}`, kv({ complainant: `${c.name} (${WHO[c.who]})`, status: CST[c.st][0], submitted: fmt(c.at) }) +
      `<div class="msg">${esc(c.body)}</div>${c.th.map(m => `<div class="msg"><small>admin · ${fmt(m.t)}</small>${esc(m.txt)}</div>`).join('')}
      <label>status<select id="c-st">${Object.entries(CST).map(([k, v]) => `<option value="${k}"${k === c.st ? ' selected' : ''}>${v[0]}</option>`).join('')}</select></label>
      <label>your response<textarea id="c-txt" rows="4"></textarea></label><small class="err" hidden>write a response before sending.</small>
      <div class="panel-actions"><button type="button" class="btn btn-primary" data-act="reply" data-id="${c.id}">send response</button></div>`);
  }

  const A = {
    sub: id => { S.sub = id; S.f = {}; draw(); },
    pclose: () => panel.close(),
    reas: id => { const r = by(DB.delayed, id); ask({ title: `reassign ${id}`, text: `currently assigned to ${r.dr}.`, ok: 'reassign', field: 'new doctor', opts: doctors().filter(d => d !== r.dr) }, v => { r.log.push({ t: Date.now(), txt: `reassigned from ${r.dr} to ${v}.` }); r.dr = v; r.st = 'pending'; /* TODO: POST /api/admin/requests/:id/reassign */ toast(`${id} reassigned to ${v}`); draw(false); }); },
    dview: id => openDelayed(id),
    dsave: id => {
      const r = by(DB.delayed, id), st = $('#d-st', panel).value, note = $('#d-note', panel).value.trim();
      if (st === r.st && !note) { $('.err', panel).hidden = false; return; }
      if (st !== r.st) r.log.push({ t: Date.now(), txt: `status changed to ${ST[st][0]}.${note ? ' note: ' + note : ''}` }); else r.log.push({ t: Date.now(), txt: `note: ${note}` });
      r.st = st; /* TODO: PATCH /api/admin/requests/:id  { status, note } */
      toast('update saved'); openDelayed(id); draw(false);
    },
    lview: id => {
      const r = by(DB.pending, id);
      openPanel(r.name, kv({ role: ROLE[r.role], 'SCFHS file number': r.scfhs, 'issuing authority': 'SCFHS', 'national ID / iqama': r.nid, email: r.email, submitted: fmt(r.at), 'license expiry': r.exp }) +
        `<a class="doc-link" href="#" target="_blank" rel="noopener">${ic('doc')} license-${esc(r.scfhs)}.pdf</a><a class="doc-link" href="#" target="_blank" rel="noopener">${ic('doc')} national-id.pdf</a><!-- TODO: link to the uploaded files from the backend -->
        <div class="panel-actions"><button type="button" class="btn btn-primary" data-act="appr" data-id="${id}">approve</button><button type="button" class="btn btn-danger" data-act="rej" data-id="${id}">reject</button><button type="button" class="btn btn-ghost" data-act="info" data-id="${id}">request more info</button></div>`);
    },
    appr: id => decide(by(DB.pending, id), 'approved'),
    rej: id => { const r = by(DB.pending, id); ask({ title: `reject ${r.name}`, text: 'the applicant will see this reason and can submit a new request.', ok: 'reject', danger: true, field: 'rejection reason', req: true }, v => decide(r, 'rejected', v)); },
    info: id => { const r = by(DB.pending, id); ask({ title: 'request more information', text: `send a message to ${r.name}.`, ok: 'send request', field: 'message', req: true }, () => { r.st = 'info'; /* TODO: POST /api/admin/registrations/:id/request-info */ toast('request sent'); panel.open && panel.close(); draw(); }); },
    del: id => { const r = by(DB.accounts, id); ask({ title: `delete ${r.name}?`, text: 'this permanently removes the account, ends any active session, and blocks future logins with these credentials.', ok: 'delete account', danger: true }, () => { DB.accounts = DB.accounts.filter(x => x.id !== id); /* TODO: DELETE /api/admin/accounts/:id */ toast('account deleted and sessions revoked'); draw(); }); },
    cview: openComplaint,
    reply: id => {
      const c = by(DB.cmp, id), txt = $('#c-txt', panel).value.trim();
      if (!txt) { $('.err', panel).hidden = false; return; }
      c.th.push({ t: Date.now(), txt }); c.st = $('#c-st', panel).value; /* TODO: POST /api/admin/complaints/:id/respond */
      toast('response sent'); openComplaint(id); draw(false);
    }
  };

  document.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b && A[b.dataset.act]) A[b.dataset.act](b.dataset.id); });
  document.addEventListener('input', e => { const f = e.target.dataset.f; if (f) { S.f[f] = e.target.value; draw(false); } });
  window.AdminUI = { redraw: () => draw() };
  draw();
})();
