/* MUFSAL - administrator pages (new design).
   One script for the four pages; <body data-page="home|delayed|licenses|support"> picks the behaviour.
   All data comes from the FastAPI backend (/api/admin/...). English + Arabic (reads <html lang>). */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const AR = document.documentElement.lang === 'ar';

  // ---------------------------------------------------------------- words (one place for every text)
  const TXT = {
    en: {
      s_delayed: 'Delayed requests', s_licenses: 'Pending license requests', s_complaints: 'General support',
      open: 'Open',
      doctor: 'Doctor', radiologist: 'Radiologist', patient: 'Patient',
      pending: 'Pending', handled: 'Handled', investigating: 'Investigating', resolved: 'Resolved', openst: 'Open',
      approved: 'Approved', rejected: 'Rejected',
      all_sources: 'All sources', all_status: 'All statuses', all_roles: 'All roles', all_decisions: 'All decisions', all_about: 'All topics',
      k_report: 'Something in a report', k_site: 'A problem with the site', k_other: 'Something else',
      search_case: 'Search case or doctor', search_name: 'Search name or SCFHS number', search_app: 'Search applicant', search_cmp: 'Search subject or name',
      from: 'From', to: 'To',
      c_pending: 'Pending requests', c_history: 'Decision history', c_accounts: 'Active accounts',
      case: 'Case', source: 'Source', doctor_l: 'Assigned doctor', submitted: 'Submitted', delay: 'Delay', status: 'Status',
      reassign: 'Reassign', view: 'View', approve: 'Approve', reject: 'Reject', del: 'Delete', respond: 'View & reply',
      applicant: 'Applicant', role: 'Role', scfhs: 'SCFHS file number', nid: 'National ID / iqama', email: 'Email',
      decision: 'Decision', reason: 'Reason', date: 'Date', name: 'Name', approved_on: 'Approved on',
      ticket: 'Ticket', requester: 'Requester', about: 'About', subject: 'Request',
      none_delayed: 'No delayed requests. Everything is on schedule.', none_pending: 'No pending requests. All requests have been reviewed.',
      none_match: 'No matching records.', none_acc: 'No matching accounts.', none_cmp: 'No support match these filters.',
      delayed_req: 'Delayed request', reported_by: 'Reported by', patient_l: 'Patient', what: 'What happened',
      mark: 'Mark as handled', new_doc: 'New doctor', cancel: 'Cancel', close: 'Close',
      reassign_t: id => `Reassign ${id}`, current: d => `Currently assigned to ${d}.`, not_assigned: 'Not assigned',
      reassigned_ok: (id, d) => `${id} reassigned to ${d}.`, handled_ok: 'Marked as handled.',
      approved_ok: n => `${n} approved. They can now log in.`, rejected_ok: n => `${n} rejected. The reason was saved.`,
      reject_t: n => `Reject ${n}`, reject_s: 'The applicant will see this reason and can submit a new request.', reject_r: 'Rejection reason', required: 'This field is required.',
      delete_t: n => `Delete ${n}?`, delete_s: 'This permanently removes the account and blocks future logins with these credentials.', delete_b: 'Delete account', deleted_ok: 'Account deleted.',
      your_reply: 'Your reply', send: 'Send reply', write_first: 'Write your reply first.', sent_ok: 'Reply sent. The support is now resolved.', status_ok: 'Status updated.', reply_hint: 'When you send the reply, the support becomes Resolved automatically.',
      admin: 'Admin', ev: { assigned: 'Assigned to', reassigned: 'Reassigned to', approved: 'Approved by' },
      reported_ev: (by, src) => `Delay reported by ${by} (${src}).`, handled_ev: 'Marked as handled.',
      net: 'Could not reach the server.', fail: 'Something went wrong: ', none_dash: '-', review: 'Review', see_all: 'See all', showing: (a, b) => `Showing ${a} of ${b}`,
      k_delayed_sub: n => n ? `${n} overdue (48h+)` : 'None overdue', k_lic_sub: t => t ? `Oldest waiting ${t}` : 'No one is waiting',
      k_cmp_sub: n => n ? `${n} being investigated` : 'None being investigated', k_acc_sub: (d, r) => `${d} doctors · ${r} radiologists`,
      attn_t: 'Needs your attention', attn_s: 'Oldest items first', attn_none: 'All clear. Nothing is waiting for you.',
      t_lic: 'License request', t_cmp: 'Support',
      act_t: 'Weekly activity', act_s: 'Last 8 weeks', leg_d: 'Delayed reports', leg_c: 'Support', leg_l: 'License decisions',
      act_none: 'No activity in the last 8 weeks.', wk: d => `Week of ${d}`,
      d_sub: 'By status and source', l_sub: 'Waiting and decided', c_sub: 'By status and topic',
      by_source: 'By source', by_role: 'Waiting, by role', by_topic: 'By topic', total: 'Total', view_all: 'View all',
      kp_d: 'Delayed requests', kp_l: 'Pending licenses', kp_c: 'Open support', h_l: 'License requests', h_c: 'Support',
      kb_report: 'In a report', kb_site: 'The site', kb_other: 'Other', unresolved: 'Unresolved'
    },
    ar: {
      s_delayed: 'الطلبات المتأخرة', s_licenses: 'طلبات التراخيص المعلّقة', s_complaints: 'طلبات الدعم',
      open: 'فتح',
      doctor: 'طبيب', radiologist: 'أخصائي أشعة', patient: 'مريض',
      pending: 'قيد الانتظار', handled: 'تمت المعالجة', investigating: 'قيد المتابعة', resolved: 'تم الحل', openst: 'مفتوحة',
      approved: 'مقبول', rejected: 'مرفوض',
      all_sources: 'كل المصادر', all_status: 'كل الحالات', all_roles: 'كل الأدوار', all_decisions: 'كل القرارات', all_about: 'كل المواضيع',
      k_report: 'شيء في أحد التقارير', k_site: 'مشكلة في الموقع', k_other: 'شيء آخر',
      search_case: 'ابحث برقم الحالة أو الطبيب', search_name: 'ابحث بالاسم أو رقم هيئة التخصصات', search_app: 'ابحث عن مقدّم الطلب', search_cmp: 'ابحث بالموضوع أو الاسم',
      from: 'من', to: 'إلى',
      c_pending: 'الطلبات المعلّقة', c_history: 'سجل القرارات', c_accounts: 'الحسابات النشطة',
      case: 'الحالة', source: 'المصدر', doctor_l: 'الطبيب المسؤول', submitted: 'تاريخ التقديم', delay: 'مدة التأخير', status: 'الحالة',
      reassign: 'إعادة إسناد', view: 'عرض', approve: 'قبول', reject: 'رفض', del: 'حذف', respond: 'عرض والرد',
      applicant: 'مقدّم الطلب', role: 'الدور', scfhs: 'رقم ملف هيئة التخصصات', nid: 'الهوية / الإقامة', email: 'البريد الإلكتروني',
      decision: 'القرار', reason: 'السبب', date: 'التاريخ', name: 'الاسم', approved_on: 'تاريخ القبول',
      ticket: 'الطلب', requester: 'مقدّم الطلب', about: 'الموضوع', subject: 'الطلب',
      none_delayed: 'لا توجد طلبات متأخرة. كل شيء في موعده.', none_pending: 'لا توجد طلبات معلّقة. تمت مراجعة كل الطلبات.',
      none_match: 'لا توجد سجلات مطابقة.', none_acc: 'لا توجد حسابات مطابقة.', none_cmp: 'لا توجد طلبات مطابقة لهذه التصفية.',
      delayed_req: 'طلب متأخر', reported_by: 'أبلغ عنه', patient_l: 'المريض', what: 'ماذا حدث',
      mark: 'تعليم كمعالَج', new_doc: 'الطبيب الجديد', cancel: 'إلغاء', close: 'إغلاق',
      reassign_t: id => `إعادة إسناد ${id}`, current: d => `مُسندة حاليًا إلى ${d}.`, not_assigned: 'غير مُسندة',
      reassigned_ok: (id, d) => `تمت إعادة إسناد ${id} إلى ${d}.`, handled_ok: 'تم تعليمها كمعالَجة.',
      approved_ok: n => `تم قبول ${n}. يمكنه الآن تسجيل الدخول.`, rejected_ok: n => `تم رفض ${n}. حُفظ السبب.`,
      reject_t: n => `رفض ${n}`, reject_s: 'سيرى مقدّم الطلب هذا السبب ويمكنه تقديم طلب جديد.', reject_r: 'سبب الرفض', required: 'هذا الحقل مطلوب.',
      delete_t: n => `حذف ${n}؟`, delete_s: 'سيُحذف الحساب نهائيًا ولن يتمكن من تسجيل الدخول بهذه البيانات.', delete_b: 'حذف الحساب', deleted_ok: 'تم حذف الحساب.',
      your_reply: 'ردّك', send: 'إرسال الرد', write_first: 'اكتب ردّك أولًا.', sent_ok: 'تم إرسال الرد. أصبح الطلب محلولاً.', status_ok: 'تم تحديث الحالة.', reply_hint: 'عند إرسال الرد يتحول الطلب تلقائيًا إلى «تم الحل».',
      admin: 'المشرف', ev: { assigned: 'أُسندت إلى', reassigned: 'أُعيد إسنادها إلى', approved: 'اعتمدها' },
      reported_ev: (by, src) => `أبلغ عن التأخير ${by} (${src}).`, handled_ev: 'تم تعليمها كمعالَجة.',
      net: 'تعذّر الوصول إلى الخادم.', fail: 'حدث خطأ: ', none_dash: '-', review: 'مراجعة', see_all: 'عرض الكل', showing: (a, b) => `عرض ${a} من ${b}`,
      k_delayed_sub: n => n ? `${n} تجاوزت 48 ساعة` : 'لا توجد طلبات تجاوزت المدة', k_lic_sub: t => t ? `الأقدم ينتظر ${t}` : 'لا أحد في الانتظار',
      k_cmp_sub: n => n ? `${n} قيد المتابعة` : 'لا توجد طلبات قيد المتابعة', k_acc_sub: (d, r) => `${d} أطباء · ${r} أخصائيو أشعة`,
      attn_t: 'يحتاج إلى انتباهك', attn_s: 'الأقدم أولًا', attn_none: 'كل شيء على ما يرام. لا شيء ينتظرك.',
      t_lic: 'طلب ترخيص', t_cmp: 'طلب دعم',
      act_t: 'النشاط الأسبوعي', act_s: 'آخر 8 أسابيع', leg_d: 'بلاغات التأخير', leg_c: 'طلبات الدعم', leg_l: 'قرارات التراخيص',
      act_none: 'لا يوجد نشاط في آخر 8 أسابيع.', wk: d => `أسبوع ${d}`,
      d_sub: 'حسب الحالة والمصدر', l_sub: 'المعلّقة والمقرَّرة', c_sub: 'حسب الحالة والموضوع',
      by_source: 'حسب المصدر', by_role: 'المعلّقة حسب الدور', by_topic: 'حسب الموضوع', total: 'الإجمالي', view_all: 'عرض الكل',
      kp_d: 'طلبات متأخرة', kp_l: 'تراخيص معلّقة', kp_c: 'طلبات مفتوحة', h_l: 'طلبات التراخيص', h_c: 'طلبات الدعم',
      kb_report: 'في تقرير', kb_site: 'الموقع', kb_other: 'أخرى', unresolved: 'غير محلولة'
    }
  }[AR ? 'ar' : 'en'];
  const T = TXT;

  const fmt = t => t ? new Date(t).toLocaleDateString(AR ? 'ar-SA-u-ca-gregory' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
  const H = 36e5, hrs = t => Math.max(0, Math.floor((Date.now() - t) / H));
  const dur = t => { const h = hrs(t), d = Math.floor(h / 24); return AR ? (h >= 24 ? `${d} يوم ${h % 24} س` : `${h} س`) : (h >= 24 ? `${d}d ${h % 24}h` : `${h}h`); };
  const ts = v => (v ? Date.parse(v) : 0);
  const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  // ---------------------------------------------------------------- status -> tag colour (same tags as the other pages)
  const DST = { pending: ['pending', 'tag-wait'], handled: ['handled', 'tag-done'] };
  const CST = { open: ['openst', 'tag-wait'], investigating: ['investigating', 'tag-info'], resolved: ['resolved', 'tag-done'] };
  const tag = (txt, cls) => `<span class="tag ${cls}">${esc(txt)}</span>`;
  const roleTag = r => tag(T[r] || r, 'tag-role');
  const kindOf = s => /report/i.test(s) ? 'report' : /site/i.test(s) ? 'site' : 'other';

  // ---------------------------------------------------------------- talking to the server
  function toast(m) { const t = $('#toast'); t.innerHTML = `<span>${esc(m)}</span>`; clearTimeout(toast.id); toast.id = setTimeout(() => { t.innerHTML = ''; }, 3500); }
  async function api(url, method = 'GET', body) {
    let res;
    try { res = await fetch(url, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined }); }
    catch (e) { toast(T.net); return null; }
    if (res.status === 401 || res.status === 403) { location.href = '/login'; return null; }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) { toast(T.fail + (data.error || res.status)); return null; }
    return data;
  }

  const DB = { delayed: [], pending: [], history: [], accounts: [], cmp: [], summary: { delayed: 0, licenses: 0, support: 0 } };
  const LOAD = {
    async summary() { const d = await api('/api/admin/summary'); if (d) DB.summary = d; },
    async delayed() {
      const d = await api('/api/admin/delayed'); if (!d) return;
      DB.delayed = d.delayed.map(r => {
        const log = r.log.map(e => ({ t: ts(e.created_at), txt: `${T.ev[e.event_type] || e.event_type} ${e.doctor_name || '-'}.` + (e.note ? ' ' + e.note : '') }));
        log.push({ t: ts(r.reported_at), txt: T.reported_ev(r.raised_by, T[r.source] || r.source) });
        if (r.handled_at) log.push({ t: ts(r.handled_at), txt: T.handled_ev });
        return { id: String(r.delay_request_id), no: '#' + r.case_id, src: r.source, dr: r.doctor_name || '', at: ts(r.submitted_at), rep: ts(r.reported_at), st: r.status, by: r.raised_by, pt: r.patient_name, log: log.sort((x, y) => x.t - y.t) };
      });
    },
    async pending() { const d = await api('/api/admin/requests'); if (d) DB.pending = d.requests.map(r => ({ id: String(r.user_id), name: r.full_name, role: r.role, scfhs: r.scfhs_number, nid: r.national_id, email: r.email, at: ts(r.created_at) })); },
    async history() { const d = await api('/api/admin/decisions'); if (d) DB.history = d.decisions.map(r => ({ name: r.applicant_name, role: r.applicant_role, d: r.decision, why: r.reason || '', at: ts(r.decided_at) })); },
    async accounts() { const d = await api('/api/admin/accounts'); if (d) DB.accounts = d.accounts.map(r => ({ id: String(r.user_id), name: r.full_name, role: r.role, scfhs: r.scfhs_number, at: ts(r.approved_at) })); },
    async support() { const d = await api('/api/admin/support'); if (d) DB.cmp = d.support.map(c => ({ id: String(c.request_id), no: '#' + c.request_id, who: c.requester_role, name: c.requester, sub: (c.body || '').slice(0, 70), kind: kindOf(c.body), body: c.body, st: c.status, at: ts(c.created_at), th: c.replies.map(m => ({ t: ts(m.created_at), txt: m.body })) })); }
  };
  const reload = (...names) => Promise.all(names.map(n => LOAD[n]())).then(() => draw());

  // ---------------------------------------------------------------- filters
  const PAGE = document.body.dataset.page || 'home';
  const QS = new URLSearchParams(location.search);
  const KEYS = { delayed: ['q', 'src', 's'], licenses: ['q', 'r', 'd', 'from', 'to'], support: ['q', 'w', 'k', 's'] }[PAGE] || [];
  const TAB = ['pending', 'history', 'accounts'].includes(QS.get('tab')) ? QS.get('tab') : location.hash === '#accounts' ? 'accounts' : 'pending';
  const S = { sub: PAGE === 'licenses' ? TAB : 'pending', f: Object.fromEntries(KEYS.filter(k => QS.get(k)).map(k => [k, QS.get(k)])) };
  const SVG = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5" stroke-linecap="round"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 18 18 6M6 6l12 12" stroke-linecap="round"/></svg>',
    go: '<svg class="go" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  const search = (f, ph) => `<label class="search">${SVG.search}<input data-f="${f}" type="search" placeholder="${esc(ph)}" aria-label="${esc(ph)}" value="${esc(S.f[f] || '')}"></label>`;
  const sel = (f, opts, all) => `<select data-f="${f}" aria-label="${esc(all)}"><option value="">${esc(all)}</option>${opts.map(([v, l]) => `<option value="${v}"${S.f[f] === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const date = (f, ph) => `<input data-f="${f}" type="date" aria-label="${esc(ph)}" title="${esc(ph)}" value="${esc(S.f[f] || '')}">`;
  const has = (txt, q) => !q || String(txt).toLowerCase().includes(q.toLowerCase());
  const ROLES2 = [['doctor', T.doctor], ['radiologist', T.radiologist]];
  const ROLES3 = [...ROLES2, ['patient', T.patient]];

  const BAR = {
    delayed: () => search('q', T.search_case) + sel('src', [['patient', T.patient], ['radiologist', T.radiologist]], T.all_sources) + sel('s', Object.entries(DST).map(([k, v]) => [k, T[v[0]]]), T.all_status),
    licenses: () => [['pending', T.c_pending], ['history', T.c_history], ['accounts', T.c_accounts]].map(([k, l]) => `<button type="button" class="chip${S.sub === k ? ' is-on' : ''}" data-act="sub" data-id="${k}">${l}</button>`).join('') + '<span class="gap"></span>' +
      (S.sub === 'pending' ? sel('r', ROLES2, T.all_roles) : '') +
      (S.sub === 'history' ? search('q', T.search_app) + sel('d', [['approved', T.approved], ['rejected', T.rejected]], T.all_decisions) + date('from', T.from) + date('to', T.to) : '') +
      (S.sub === 'accounts' ? search('q', T.search_name) + sel('r', ROLES2, T.all_roles) : ''),
    support: () => search('q', T.search_cmp) + sel('w', ROLES3, T.all_roles) + sel('k', [['report', T.k_report], ['site', T.k_site], ['other', T.k_other]], T.all_about) + sel('s', [['unresolved', T.unresolved], ...Object.entries(CST).map(([k, v]) => [k, T[v[0]]])], T.all_status)
  };

  // ---------------------------------------------------------------- rows
  const cell = (lbl, v, cls = '') => `<div class="cell ${cls}"><span class="lbl">${esc(lbl)}</span>${v.includes('class="tag') ? v : `<span class="val">${v}</span>`}</div>`;
  const who = (title, sub, avatar) => `<div class="who"><span class="avatar">${esc(avatar)}</span><div><strong>${esc(title)}</strong><p>${esc(sub)}</p></div></div>`;
  const btn = (act, id, label, cls) => `<button type="button" class="btn btn-sm ${cls}" data-act="${act}" data-id="${esc(id)}">${esc(label)}</button>`;
  const row = (cols, inner) => `<article class="card row a-row" style="--cols:${cols}">${inner}</article>`;
  const empty = m => `<div class="empty"><h3>${esc(m)}</h3></div>`;

  const RD = (r, acts) => row('minmax(0,1.3fr) minmax(0,1fr) minmax(0,1.2fr) minmax(0,1fr) 90px 110px 200px',
    who(`${T.case} ${r.no}`, r.pt || '', '#') +
    cell(T.source, roleTag(r.src), 'hide-sm') + cell(T.doctor_l, esc(r.dr || T.not_assigned), 'hide-sm') + cell(T.submitted, fmt(r.at), 'hide-sm') +
    cell(T.delay, tag(dur(r.at), r.st === 'handled' ? 'tag-role' : hrs(r.at) > 48 ? 'tag-bad' : 'tag-wait'), 'hide-sm') + cell(T.status, tag(T[DST[r.st][0]], DST[r.st][1])) + `<div class="acts">${acts}</div>`);
  const RL = (r, acts) => row('minmax(0,1.5fr) 110px minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) 270px',
    who(r.name, r.email, initials(r.name)) + cell(T.role, roleTag(r.role), 'hide-sm') + cell(T.scfhs, esc(r.scfhs), 'hide-sm') + cell(T.nid, esc(r.nid), 'hide-sm') + cell(T.submitted, fmt(r.at), 'hide-sm') + `<div class="acts">${acts}</div>`);
  const RC = (c, acts) => row('minmax(0,2fr) minmax(0,1.3fr) minmax(0,1.1fr) 120px minmax(0,1fr) 150px',
    who(c.sub, `${T.ticket} ${c.no}`, '!') + cell(T.requester, `${esc(c.name)}<br>${roleTag(c.who)}`, 'hide-sm') + cell(T.about, esc(T['k_' + c.kind]), 'hide-sm') + cell(T.status, tag(T[CST[c.st][0]], CST[c.st][1])) + cell(T.submitted, fmt(c.at), 'hide-sm') + `<div class="acts">${acts}</div>`);

  const OUT = {
    delayed() {
      const f = S.f, list = DB.delayed.filter(r => (!f.src || r.src === f.src) && (!f.s || r.st === f.s) && has(r.no + r.dr, f.q)).sort((a, b) => (a.st === 'handled') - (b.st === 'handled') || a.at - b.at);   // pending first (oldest on top), handled at the bottom
      return list.map(r => RD(r, (r.st === 'pending' ? btn('reas', r.id, T.reassign, 'btn-soft') : '') + btn('dview', r.id, T.view, 'btn-ghost'))).join('') || empty(T.none_delayed);
    },
    licenses() {
      const f = S.f;
      if (S.sub === 'pending') {
        return DB.pending.filter(r => !f.r || r.role === f.r).sort((a, b) => a.at - b.at).map(r => RL(r, btn('lview', r.id, T.view, 'btn-ghost') + btn('appr', r.id, T.approve, 'btn-primary') + btn('rej', r.id, T.reject, 'btn-danger'))).join('') || empty(T.none_pending);
      }
      if (S.sub === 'history') {
        return DB.history.filter(r => has(r.name, f.q) && (!f.d || r.d === f.d) && (!f.from || r.at >= new Date(f.from).getTime()) && (!f.to || r.at <= new Date(f.to).getTime() + 864e5 - 1)).sort((a, b) => b.at - a.at)
          .map(r => row('minmax(0,1.4fr) 110px 110px minmax(0,1.6fr) minmax(0,1fr)',
            who(r.name, '', initials(r.name)) + cell(T.role, roleTag(r.role), 'hide-sm') + cell(T.decision, tag(T[r.d], r.d === 'approved' ? 'tag-done' : 'tag-bad')) + cell(T.reason, esc(r.why || '-'), 'hide-sm') + cell(T.date, fmt(r.at), 'hide-sm'))).join('') || empty(T.none_match);
      }
      return DB.accounts.filter(r => has(r.name + r.scfhs, f.q) && (!f.r || r.role === f.r)).map(r => row('minmax(0,1.4fr) 110px minmax(0,1.2fr) minmax(0,1fr) 120px',
        who(r.name, '', initials(r.name)) + cell(T.role, roleTag(r.role), 'hide-sm') + cell(T.scfhs, esc(r.scfhs), 'hide-sm') + cell(T.approved_on, fmt(r.at), 'hide-sm') +
        `<div class="acts">${btn('del', r.id, T.del, 'btn-danger')}</div>`)).join('') || empty(T.none_acc);
    },
    support() {
      const f = S.f;
      return DB.cmp.filter(c => (!f.w || c.who === f.w) && (!f.k || c.kind === f.k) && (!f.s || (f.s === 'unresolved' ? c.st !== 'resolved' : c.st === f.s)) && has(c.sub + c.name, f.q)).sort((a, b) => b.at - a.at)
        .map(c => RC(c, btn('cview', c.id, T.respond, 'btn-soft'))).join('') || empty(T.none_cmp);
    }
  };

  // ---------------------------------------------------------------- dashboard: numbers, charts, what needs attention
  // Everything is worked out here from the same /api/admin data the other pages use. Every number, bar and
  // slice is a link: it opens the page it counts, already filtered (the pages read ?s=, ?k=, ?tab= ... from the address).
  const WEEK = 7 * 864e5;
  const PG = { delayed: '/admin-delayed-requests', licenses: '/admin-license-verification', support: '/admin-support' };
  const lnk = (base, q) => base + (q ? '?' + new URLSearchParams(q) : '');
  const sum = a => a.reduce((x, y) => x + y, 0);
  const ICO = {
    delayed: ['red', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" stroke-linecap="round"/>'],
    licenses: ['ok', '<path d="M12 3 4 6v6c0 4.4 3.4 8.3 8 9 4.6-.7 8-4.6 8-9V6l-8-3Z" stroke-linejoin="round"/><path d="m8.8 12.2 2.3 2.3 4.2-4.4" stroke-linecap="round" stroke-linejoin="round"/>'],
    support: ['amber', '<path d="M4 14v-2a8 8 0 0 1 16 0v2" stroke-linecap="round"/><rect x="2.5" y="12.5" width="4.5" height="7.5" rx="2.2"/><rect x="17" y="12.5" width="4.5" height="7.5" rx="2.2"/>'],
    accounts: ['', '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" stroke-linecap="round"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M18 14.9c1.8.7 3 2.4 3 5.1" stroke-linecap="round"/>']
  };
  const svgIco = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${ICO[k][1]}</svg>`;

  function donut(items, label) {
    const R = 46, C = 2 * Math.PI * R, live = items.filter(i => i.v), total = sum(items.map(i => i.v));
    let off = 0;
    const arcs = live.map(i => {
      const len = i.v / total * C, gap = live.length > 1 ? 3 : 0;
      const a = `<a href="${i.href}"><title>${esc(i.label)}: ${i.v}</title><circle cx="60" cy="60" r="${R}" fill="none" stroke="var(--${i.c})" stroke-width="16" stroke-dasharray="${Math.max(len - gap, 0.01)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"/></a>`;
      off += len; return a;
    }).join('');
    return `<svg class="donut" viewBox="0 0 120 120" role="img" aria-label="${esc(label)}: ${total}"><circle cx="60" cy="60" r="${R}" fill="none" stroke="var(--mint)" stroke-width="16"/>${arcs}<text x="60" y="60" text-anchor="middle" class="d-num">${total}</text><text x="60" y="76" text-anchor="middle" class="d-lbl">${esc(label)}</text></svg>`;
  }
  const legend = items => `<div class="lg-list">${items.map(i => `<a class="lg" href="${i.href}"><i style="background:var(--${i.c})"></i><span>${esc(i.label)}</span><b>${i.v}</b></a>`).join('')}</div>`;
  const hbars = items => { const mx = Math.max(1, ...items.map(i => i.v)); return `<div class="hbars">${items.map(i => `<a class="hb" href="${i.href}"><span class="hb-l">${esc(i.label)}</span><span class="hb-t"><span class="hb-f" style="width:${i.v / mx * 100}%;background:var(--${i.c})"></span></span><b>${i.v}</b></a>`).join('')}</div>`; };
  const dcard = (k, title, sub, body, href) => `<section class="card dash-card"><header class="dc-h"><span class="att-ico ${ICO[k][0]}">${svgIco(k)}</span><div><h2>${esc(title)}</h2><p>${esc(sub)}</p></div><a class="dc-go" href="${href}">${T.view_all} ${AR ? '&larr;' : '&rarr;'}</a></header>${body}</section>`;

  function weekly() {
    const d0 = new Date(); d0.setHours(0, 0, 0, 0); d0.setDate(d0.getDate() - ((d0.getDay() + 6) % 7));      // Monday of this week
    const s0 = d0.getTime() - 7 * WEEK, cols = Array.from({ length: 8 }, (_, i) => ({ t: s0 + i * WEEK, d: 0, c: 0, l: 0 }));
    const put = (t, k) => { const i = Math.floor((t - s0) / WEEK); if (t && i >= 0 && i < 8) cols[i][k]++; };
    DB.delayed.forEach(r => put(r.rep, 'd')); DB.cmp.forEach(c => put(c.at, 'c')); DB.history.forEach(r => put(r.at, 'l'));
    const mx = Math.max(1, ...cols.map(c => c.d + c.c + c.l));
    if (!cols.some(c => c.d + c.c + c.l)) return `<div class="empty small"><h3>${T.act_none}</h3></div>`;
    const short = t => new Date(t).toLocaleDateString(AR ? 'ar-SA-u-ca-gregory' : 'en-GB', { day: 'numeric', month: 'short' });
    const seg = (n, c, k, href) => n ? `<a href="${href}" style="flex:${n};background:var(--${c})"></a>` : '';
    const tt = k => sum(cols.map(c => c[k]));
    const head = `<div class="wk-sum"><a href="${PG.delayed}"><i style="background:var(--brand)"></i><span>${T.leg_d}</span><b>${tt('d')}</b></a><a href="${PG.support}"><i style="background:var(--amber)"></i><span>${T.leg_c}</span><b>${tt('c')}</b></a><a href="${lnk(PG.licenses, { tab: 'history' })}"><i style="background:var(--ink)"></i><span>${T.leg_l}</span><b>${tt('l')}</b></a></div>`;
    return head + `<div class="wk">${cols.map(c => {
      const tot = c.d + c.c + c.l;
      return `<div class="wk-col" title="${esc(`${T.wk(short(c.t))}: ${T.leg_d} ${c.d} · ${T.leg_c} ${c.c} · ${T.leg_l} ${c.l}`)}"><div class="wk-bar"><span class="wk-n">${tot || ''}</span><div class="wk-stack" style="height:${tot ? Math.max(6, tot / mx * 190) : 3}px">${seg(c.l, 'ink', 'l', PG.licenses + '?tab=history')}${seg(c.c, 'amber', 'c', PG.support)}${seg(c.d, 'brand', 'd', PG.delayed)}</div></div><span class="wk-x">${short(c.t)}</span></div>`;
    }).join('')}</div>`;
  }

  function attention() {
    const top = (arr, n) => arr.sort((a, b) => a.at - b.at).slice(0, n);
    const items = [
      ...top(DB.delayed.filter(r => r.st === 'pending').map(r => ({ k: 'delayed', id: r.id, at: r.at, title: `${T.case} ${r.no}`, sub: `${T.delayed_req} · ${r.dr || T.not_assigned}`, bad: hrs(r.at) > 48 })), 3),
      ...top(DB.pending.map(r => ({ k: 'licenses', id: r.id, at: r.at, title: r.name, sub: `${T.t_lic} · ${T[r.role] || r.role}` })), 3),
      ...top(DB.cmp.filter(c => c.st !== 'resolved').map(c => ({ k: 'support', id: c.id, at: c.at, title: c.sub, sub: `${T.t_cmp} · ${c.name}` })), 3)
    ].sort((a, b) => (b.bad || 0) - (a.bad || 0) || a.at - b.at).slice(0, 5);
    if (!items.length) return `<div class="empty small"><h3>${T.attn_none}</h3></div>`;
    return `<div class="att-list">${items.map(i => `<a class="att" href="${lnk(PG[i.k], { open: i.id })}"><span class="att-ico ${ICO[i.k][0]}">${svgIco(i.k)}</span><div><strong>${esc(i.title)}</strong><p>${esc(i.sub)}</p></div>${tag(dur(i.at), i.bad ? 'tag-bad' : 'tag-wait')}${SVG.go}</a>`).join('')}</div>`;
  }

  function drawHome() {
    const n = DB.summary, over = DB.delayed.filter(r => r.st === 'pending' && hrs(r.at) > 48).length;
    const oldest = DB.pending.length ? dur(Math.min(...DB.pending.map(r => r.at))) : '';
    const inv = DB.cmp.filter(c => c.st === 'investigating').length;
    const docs = DB.accounts.filter(a => a.role === 'doctor').length, rads = DB.accounts.length - docs;
    const kpi = [
      ['delayed', n.delayed, T.kp_d, T.k_delayed_sub(over), over ? 'bad' : '', lnk(PG.delayed, { s: 'pending' })],
      ['licenses', n.licenses, T.kp_l, T.k_lic_sub(oldest), '', PG.licenses],
      ['support', n.support, T.kp_c, T.k_cmp_sub(inv), '', lnk(PG.support, { s: 'unresolved' })],
      ['accounts', DB.accounts.length, T.c_accounts, T.k_acc_sub(docs, rads), '', lnk(PG.licenses, { tab: 'accounts' })]
    ];
    $('#stats').innerHTML = kpi.map(([k, v, l, sub, cls, href]) => `<a class="card stat" href="${href}"><span class="ico ${ICO[k][0]}">${svgIco(k)}</span><div><strong>${v}</strong><span>${esc(l)}</span><em class="${cls}">${esc(sub)}</em></div></a>`).join('');

    // delayed requests
    const dp = DB.delayed.filter(r => r.st === 'pending').length, dh = DB.delayed.length - dp;
    const bySrc = s => DB.delayed.filter(r => r.src === s).length;
    const dItems = [{ label: T.pending, v: dp, c: 'amber', href: lnk(PG.delayed, { s: 'pending' }) }, { label: T.handled, v: dh, c: 'ok', href: lnk(PG.delayed, { s: 'handled' }) }];
    // license requests
    const ap = DB.history.filter(r => r.d === 'approved').length, rj = DB.history.length - ap;
    const lItems = [{ label: T.pending, v: DB.pending.length, c: 'amber', href: PG.licenses }, { label: T.approved, v: ap, c: 'ok', href: lnk(PG.licenses, { tab: 'history', d: 'approved' }) }, { label: T.rejected, v: rj, c: 'red', href: lnk(PG.licenses, { tab: 'history', d: 'rejected' }) }];
    const pr = r => DB.pending.filter(x => x.role === r).length;
    // support
    const cs = s => DB.cmp.filter(c => c.st === s).length, ck = k => DB.cmp.filter(c => c.kind === k).length;
    const cItems = [{ label: T.openst, v: cs('open'), c: 'amber', href: lnk(PG.support, { s: 'open' }) }, { label: T.investigating, v: cs('investigating'), c: 'brand', href: lnk(PG.support, { s: 'investigating' }) }, { label: T.resolved, v: cs('resolved'), c: 'ok', href: lnk(PG.support, { s: 'resolved' }) }];

    const two = (items, label) => `<div class="dn">${donut(items, label)}${legend(items)}</div>`;
    $('#home').innerHTML =
      `<div class="dash-row two"><section class="card dash-card"><header class="dc-h"><div><h2>${T.attn_t}</h2><p>${T.attn_s}</p></div></header>${attention()}</section>
       <section class="card dash-card"><header class="dc-h"><div><h2>${T.act_t}</h2><p>${T.act_s}</p></div></header>${weekly()}</section></div>
       <div class="dash-row three">` +
      dcard('delayed', T.s_delayed, T.d_sub, two(dItems, T.total) + `<h3 class="dc-sub">${T.by_source}</h3>` + hbars([
        { label: T.patient, v: bySrc('patient'), c: 'brand', href: lnk(PG.delayed, { src: 'patient' }) }, { label: T.radiologist, v: bySrc('radiologist'), c: 'brand', href: lnk(PG.delayed, { src: 'radiologist' }) }]), PG.delayed) +
      dcard('licenses', T.h_l, T.l_sub, two(lItems, T.total) + `<h3 class="dc-sub">${T.by_role}</h3>` + hbars([
        { label: T.doctor, v: pr('doctor'), c: 'brand', href: lnk(PG.licenses, { r: 'doctor' }) }, { label: T.radiologist, v: pr('radiologist'), c: 'brand', href: lnk(PG.licenses, { r: 'radiologist' }) }]), PG.licenses) +
      dcard('support', T.h_c, T.c_sub, two(cItems, T.total) + `<h3 class="dc-sub">${T.by_topic}</h3>` + hbars([
        { label: T.kb_report, v: ck('report'), c: 'brand', href: lnk(PG.support, { k: 'report' }) }, { label: T.kb_site, v: ck('site'), c: 'brand', href: lnk(PG.support, { k: 'site' }) }, { label: T.kb_other, v: ck('other'), c: 'brand', href: lnk(PG.support, { k: 'other' }) }]), PG.support) +
      `</div>`;
  }

  function draw(full = true) {
    if (PAGE === 'home') { drawHome(); return; }
    if (full) $('#bar').innerHTML = BAR[PAGE]();
    $('#list').innerHTML = OUT[PAGE]();
  }

  // ---------------------------------------------------------------- dialog + panel
  const dlg = $('#dlg'), panel = $('#panel');
  function ask({ title, text = '', ok, danger, field, opts, req }, cb) {
    dlg.innerHTML = `<form method="dialog"><h3>${esc(title)}</h3><p class="sub">${esc(text)}</p>${field ? `<div class="field"><label>${esc(field)}</label>${opts ? `<select name="v">${opts.map(o => `<option>${esc(o)}</option>`).join('')}</select>` : '<textarea name="v" rows="3"></textarea>'}<p class="err" hidden>${T.required}</p></div>` : ''}<div class="dlg-actions"><button type="button" class="btn btn-ghost btn-sm" data-close>${T.cancel}</button><button class="btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}">${esc(ok)}</button></div></form>`;
    const f = $('form', dlg);
    f.onsubmit = e => { e.preventDefault(); const v = f.v ? f.v.value.trim() : ''; if (req && !v) { $('.err', dlg).hidden = false; return; } dlg.close(); cb(v); };
    $('[data-close]', dlg).onclick = () => dlg.close();
    dlg.showModal();
  }
  function openPanel(title, html) {
    panel.innerHTML = `<header><h2>${esc(title)}</h2><button type="button" class="x-btn" data-act="pclose" aria-label="${T.close}">${SVG.x}</button></header><div class="panel-body">${html}</div>`;
    if (!panel.open) panel.showModal();
  }
  const kv = o => `<dl class="kv">${Object.entries(o).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
  const by = (arr, id) => arr.find(x => x.id === id);

  async function decide(r, d, why = '') {
    const res = await api(`/api/admin/requests/${r.id}/${d === 'approved' ? 'approve' : 'reject'}`, 'POST', d === 'rejected' ? { reason: why } : {});
    if (!res) return;
    toast(d === 'approved' ? T.approved_ok(r.name) : T.rejected_ok(r.name));
    panel.open && panel.close(); reload('pending', 'history', 'accounts');
  }
  function openDelayed(id) {
    const r = by(DB.delayed, id);
    openPanel(`${T.delayed_req} ${r.no}`, kv({ [T.source]: T[r.src] || r.src, [T.reported_by]: r.by, [T.patient_l]: r.pt, [T.doctor_l]: r.dr || T.not_assigned, [T.submitted]: fmt(r.at), [T.delay]: dur(r.at), [T.status]: T[DST[r.st][0]] }) +
      `<h3 class="sub-h">${T.what}</h3>${[...r.log].reverse().map(m => `<div class="msg"><small>${fmt(m.t)}</small>${esc(m.txt)}</div>`).join('')}` +
      (r.st === 'pending' ? `<div class="panel-actions">${btn('dhandled', r.id, T.mark, 'btn-primary')}</div>` : ''));
  }
  async function openRequest(id) {
    const c = by(DB.cmp, id);
    if (c.st === 'open') {                 // opening the details is what moves a new support to "investigating"
      const r = await api(`/api/admin/support/${id}/seen`, 'POST', {});
      if (r) { c.st = r.status; draw(false); }
    }
    openPanel(`${T.ticket} ${c.no}`, kv({ [T.subject]: c.sub, [T.requester]: `${c.name} (${T[c.who] || c.who})`, [T.status]: T[CST[c.st][0]], [T.submitted]: fmt(c.at) }) +
      `<div class="msg">${esc(c.body)}</div>${c.th.map(m => `<div class="msg admin"><small>${T.admin} · ${fmt(m.t)}</small>${esc(m.txt)}</div>`).join('')}
      <div class="field"><label>${T.your_reply}</label><textarea id="c-txt" rows="4"></textarea><p class="err" hidden>${T.write_first}</p>${c.st === 'resolved' ? '' : `<p class="hint">${T.reply_hint}</p>`}</div>
      <div class="panel-actions">${btn('reply', c.id, T.send, 'btn-primary')}</div>`);
  }

  const A = {
    sub: id => { S.sub = id; S.f = {}; draw(); },
    pclose: () => panel.close(),
    reas: async id => {
      const r = by(DB.delayed, id), d = await api('/api/admin/doctors'); if (!d) return;
      const docs = d.doctors.filter(x => x.full_name !== r.dr);
      ask({ title: T.reassign_t(r.no), text: T.current(r.dr || T.not_assigned), ok: T.reassign, field: T.new_doc, opts: docs.map(x => x.full_name) }, async v => {
        const doc = docs.find(x => x.full_name === v); if (!doc) return;
        if (await api(`/api/admin/delayed/${id}/reassign`, 'POST', { doctor_id: doc.user_id })) { toast(T.reassigned_ok(r.no, v)); reload('delayed'); }
      });
    },
    dview: id => openDelayed(id),
    dhandled: async id => { if (await api(`/api/admin/delayed/${id}/handled`, 'POST', {})) { toast(T.handled_ok); await LOAD.delayed(); openDelayed(id); draw(false); } },
    lview: id => {
      const r = by(DB.pending, id);
      openPanel(r.name, kv({ [T.role]: T[r.role] || r.role, [T.scfhs]: r.scfhs, [T.nid]: r.nid, [T.email]: r.email, [T.submitted]: fmt(r.at) }) +
        `<div class="panel-actions">${btn('appr', id, T.approve, 'btn-primary')}${btn('rej', id, T.reject, 'btn-danger')}</div>`);
    },
    appr: id => decide(by(DB.pending, id), 'approved'),
    rej: id => { const r = by(DB.pending, id); ask({ title: T.reject_t(r.name), text: T.reject_s, ok: T.reject, danger: true, field: T.reject_r, req: true }, v => decide(r, 'rejected', v)); },
    del: id => { const r = by(DB.accounts, id); ask({ title: T.delete_t(r.name), text: T.delete_s, ok: T.delete_b, danger: true }, async () => { if (await api(`/api/admin/accounts/${id}`, 'DELETE')) { toast(T.deleted_ok); reload('accounts'); } }); },
    cview: openRequest,
    reply: async id => {
      const txt = $('#c-txt', panel).value.trim();
      if (!txt) { $('.err', panel).hidden = false; return; }
      if (await api(`/api/admin/support/${id}/respond`, 'POST', { reply: txt })) { toast(T.sent_ok); await LOAD.support(); openRequest(id); draw(false); }
    }
  };

  document.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b && A[b.dataset.act]) A[b.dataset.act](b.dataset.id); });
  document.addEventListener('input', e => { const f = e.target.dataset.f; if (f) { S.f[f] = e.target.value; draw(false); } });
  draw();
  reload(...({ home: ['summary', 'delayed', 'pending', 'support', 'history', 'accounts'], delayed: ['delayed'], licenses: ['pending', 'history', 'accounts'], support: ['support'] }[PAGE])).then(() => {
    // a dashboard link can point straight at one item: ?open=ID opens its panel
    const o = QS.get('open'), f = { delayed: 'dview', licenses: 'lview', support: 'cview' }[PAGE], list = { delayed: DB.delayed, licenses: DB.pending, support: DB.cmp }[PAGE];
    if (o && f && list.some(x => x.id === o)) { A[f](o); history.replaceState(null, '', location.pathname + location.hash); }
  });
})();
