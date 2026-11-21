/* MUFSAL - administrator pages (new design).
   One script for the five pages; <body data-page="home|delayed|licenses|accounts|support"> picks the behaviour.
   All data comes from the FastAPI backend (/api/admin/...). English + Arabic (reads <html lang>). */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const AR = document.documentElement.lang === 'ar';

  // ---------------------------------------------------------------- words (one place for every text)
  const TXT = {
    en: {
      s_delayed: 'Delayed reports', s_licenses: 'Pending license requests', s_complaints: 'Support',
      open: 'Open',
      doctor: 'Doctor', radiologist: 'Radiologist', patient: 'Patient',
      pending: 'Pending', handled: 'Handled', resolved: 'Resolved', closed: 'Closed',
      approved: 'Approved', rejected: 'Rejected',
      all_sources: 'All sources', all_status: 'All statuses', all_roles: 'All roles', all_decisions: 'All decisions', all_types: 'All types',
      search_case: 'Search case or doctor', search_name: 'Search name or SCFHS number', search_app: 'Search applicant', search_cmp: 'Search message or name',
      from: 'From', to: 'To',
      c_pending: 'Pending requests', c_history: 'Decision history', c_accounts: 'Active accounts',
      case: 'Case', source: 'Source', doctor_l: 'Assigned doctor', submitted: 'Submitted', delay: 'Delay', status: 'Status',
      reassign: 'Reassign', view: 'View', approve: 'Approve', reject: 'Reject', del: 'Close account', respond: 'View & answer',
      applicant: 'Applicant', role: 'Role', scfhs: 'SCFHS no.', nid: 'National ID', email: 'Email',
      decision: 'Decision', reason: 'Reason', date: 'Date', name: 'Name', approved_on: 'Approved on',
      ticket: 'Message', complainant: 'From', type: 'Type', k_reg: 'New registration', k_ren: 'License renewal',
      lic_expiry: 'License expires', new_date: 'New license date', expired_on: 'Expired', lic_expired: 'License expired',
      none_delayed: 'No delayed reports. Everything is on schedule.', none_pending: 'No pending requests. All requests have been reviewed.',
      none_match: 'No matching records.', none_acc: 'No matching accounts.', none_cmp: 'No support messages match these filters.', none_del: 'No account deletion requests.',
      delayed_req: 'Delayed report', reported_by: 'Reported by', patient_l: 'Patient', what: 'What happened',
      mark: 'Mark as handled', new_doc: 'New doctor', new_doc_hint: 'Doctors are listed with their open cases; the one with the fewest is first.', cancel: 'Cancel', close: 'Close',
      reassign_t: id => `Reassign ${id}`, current: d => `Currently assigned to ${d}.`, not_assigned: 'Not assigned',
      reassigned_ok: (id, d) => `${id} reassigned to ${d}.`, handled_ok: 'Marked as handled.',
      approved_ok: (n, k) => k === 'renewal' ? `${n}'s license renewal approved. The account works again.` : `${n} approved. They can now log in.`,
      rejected_ok: (n, k) => k === 'renewal' ? `${n}'s renewal rejected. The old date stands.` : `${n} rejected. The reason was saved.`,
      reject_t: n => `Reject ${n}`, reject_s: 'The applicant will see this reason.', reject_r: 'Rejection reason', required: 'This field is required.',
      delete_t: n => `Close ${n}'s account?`, delete_s: 'The account is closed and can no longer sign in. Nothing is deleted: reports and X-rays stay. A doctor\'s open cases move automatically to the doctor with the fewest cases.', delete_b: 'Close account',
      deleted_ok: n => n ? `Account closed. ${n} case(s) moved to other doctors.` : 'Account closed.',
      x_appr_t: n => `Approve and close ${n}'s account?`, x_appr_b: 'Approve & close', x_dec: 'Decline', x_dec_t: n => `Keep ${n}'s account?`, x_dec_s: 'The request is cancelled and the account works again.', x_dec_b: 'Keep account', x_dec_ok: 'Request declined. The account is open again.',
      requested: 'Requested', closed_on: 'Closed on', open_cases: 'Open cases', x_view: 'Deletion request',
      err: { no_doctor_available: 'No other doctor can take this doctor\'s cases, so the account was not closed.', date_expired: 'The new license date has already passed, so it cannot be approved.', reason_required: 'A reason is required.' },
      your_reply: 'Your answer', send: 'Send answer', write_first: 'Write your answer first.', sent_ok: 'Answer sent. The message is now resolved.', reply_hint: 'When you send the answer, the message becomes Resolved automatically.',
      admin: 'Admin', ev: { assigned: 'Assigned to', reassigned: 'Reassigned to', approved: 'Approved by' },
      reported_ev: (by, src) => `Delay reported by ${by} (${src}).`, handled_ev: 'Marked as handled.',
      net: 'Could not reach the server.', fail: 'Something went wrong: ', none_dash: '-', review: 'Review', see_all: 'See all', showing: (a, b) => `Showing ${a} of ${b}`,
      k_delayed_sub: n => n ? `${n} overdue (48h+)` : 'None overdue', k_lic_sub: (t, r) => r ? `${r} renewal · ${t}` : (t ? `Oldest waiting ${t}` : 'No one is waiting'),
      k_cmp_sub: t => t ? `Oldest waiting ${t}` : 'Nothing waiting', k_del_sub: t => t ? `Oldest waiting ${t}` : 'No one is waiting',
      attn_t: 'Urgent', attn_s: 'Oldest first · scroll for more', attn_none: 'All clear. Nothing is waiting for you.',
      t_lic: 'License request', t_ren: 'License renewal', t_cmp: 'Support', t_del: 'Account deletion',
      act_t: 'Weekly activity', act_s: 'Last 8 weeks', leg_d: 'Delayed reports', leg_c: 'Support', leg_l: 'License decisions',
      act_none: 'No activity in the last 8 weeks.', wk: d => `Week of ${d}`,
      d_sub: 'By status and source', l_sub: 'Waiting and decided', c_sub: 'Pending and resolved', x_sub: 'Waiting and closed',
      by_source: 'By source', by_type: 'Waiting, by type', by_sender: 'By sender', by_role: 'Waiting, by role', total: 'Total', view_all: 'View all',
      kp_d: 'Delayed reports', kp_l: 'Pending licenses', kp_c: 'Pending support', kp_x: 'Deletion requests', h_l: 'License requests', h_c: 'Support', h_x: 'Account deletion requests',
      unresolved: 'Pending'
    },
    ar: {
      s_delayed: 'التقارير المتأخرة', s_licenses: 'طلبات التراخيص المعلّقة', s_complaints: 'الدعم',
      open: 'فتح',
      doctor: 'طبيب', radiologist: 'أخصائي أشعة', patient: 'مريض',
      pending: 'قيد الانتظار', handled: 'تمت المعالجة', resolved: 'تم الحل', closed: 'مغلق',
      approved: 'مقبول', rejected: 'مرفوض',
      all_sources: 'كل المصادر', all_status: 'كل الحالات', all_roles: 'كل الأدوار', all_decisions: 'كل القرارات', all_types: 'كل الأنواع',
      search_case: 'ابحث برقم الحالة أو الطبيب', search_name: 'ابحث بالاسم أو رقم هيئة التخصصات', search_app: 'ابحث عن مقدّم الطلب', search_cmp: 'ابحث في الرسالة أو الاسم',
      from: 'من', to: 'إلى',
      c_pending: 'الطلبات المعلّقة', c_history: 'سجل القرارات', c_accounts: 'الحسابات النشطة',
      case: 'الحالة', source: 'المصدر', doctor_l: 'الطبيب المسؤول', submitted: 'تاريخ التقديم', delay: 'مدة التأخير', status: 'الحالة',
      reassign: 'إعادة إسناد', view: 'عرض', approve: 'قبول', reject: 'رفض', del: 'إغلاق الحساب', respond: 'عرض والرد',
      applicant: 'مقدّم الطلب', role: 'الدور', scfhs: 'رقم الهيئة', nid: 'الهوية', email: 'البريد الإلكتروني',
      decision: 'القرار', reason: 'السبب', date: 'التاريخ', name: 'الاسم', approved_on: 'تاريخ القبول',
      ticket: 'الرسالة', complainant: 'المرسل', type: 'النوع', k_reg: 'تسجيل جديد', k_ren: 'تجديد رخصة',
      lic_expiry: 'تنتهي الرخصة', new_date: 'تاريخ الرخصة الجديد', expired_on: 'انتهت', lic_expired: 'الرخصة منتهية',
      none_delayed: 'لا توجد تقارير متأخرة. كل شيء في موعده.', none_pending: 'لا توجد طلبات معلّقة. تمت مراجعة كل الطلبات.',
      none_match: 'لا توجد سجلات مطابقة.', none_acc: 'لا توجد حسابات مطابقة.', none_cmp: 'لا توجد رسائل دعم مطابقة لهذه التصفية.', none_del: 'لا توجد طلبات حذف حساب.',
      delayed_req: 'تقرير متأخر', reported_by: 'أبلغ عنه', patient_l: 'المريض', what: 'ماذا حدث',
      mark: 'تعليم كمعالَج', new_doc: 'الطبيب الجديد', new_doc_hint: 'الأطباء مرتّبون حسب عدد حالاتهم المفتوحة؛ الأقل أولًا.', cancel: 'إلغاء', close: 'إغلاق',
      reassign_t: id => `إعادة إسناد ${id}`, current: d => `مُسندة حاليًا إلى ${d}.`, not_assigned: 'غير مُسندة',
      reassigned_ok: (id, d) => `تمت إعادة إسناد ${id} إلى ${d}.`, handled_ok: 'تم تعليمها كمعالَجة.',
      approved_ok: (n, k) => k === 'renewal' ? `تم قبول تجديد رخصة ${n}. الحساب يعمل من جديد.` : `تم قبول ${n}. يمكنه الآن تسجيل الدخول.`,
      rejected_ok: (n, k) => k === 'renewal' ? `تم رفض تجديد ${n}. يبقى التاريخ القديم.` : `تم رفض ${n}. حُفظ السبب.`,
      reject_t: n => `رفض ${n}`, reject_s: 'سيرى مقدّم الطلب هذا السبب.', reject_r: 'سبب الرفض', required: 'هذا الحقل مطلوب.',
      delete_t: n => `إغلاق حساب ${n}؟`, delete_s: 'يُغلق الحساب ولا يستطيع الدخول بعدها. لا يُحذف شيء: التقارير والأشعة تبقى. وحالات الطبيب المفتوحة تنتقل تلقائيًا إلى الطبيب الأقل حالات.', delete_b: 'إغلاق الحساب',
      deleted_ok: n => n ? `تم إغلاق الحساب. انتقلت ${n} حالة إلى أطباء آخرين.` : 'تم إغلاق الحساب.',
      x_appr_t: n => `الموافقة على إغلاق حساب ${n}؟`, x_appr_b: 'موافقة وإغلاق', x_dec: 'رفض', x_dec_t: n => `إبقاء حساب ${n}؟`, x_dec_s: 'يُلغى الطلب ويعود الحساب يعمل.', x_dec_b: 'إبقاء الحساب', x_dec_ok: 'تم رفض الطلب. الحساب مفتوح من جديد.',
      requested: 'تاريخ الطلب', closed_on: 'تاريخ الإغلاق', open_cases: 'الحالات المفتوحة', x_view: 'طلب حذف حساب',
      err: { no_doctor_available: 'لا يوجد طبيب آخر يستلم حالات هذا الطبيب، لذلك لم يُغلق الحساب.', date_expired: 'تاريخ الرخصة الجديد منتهي، فلا يمكن قبوله.', reason_required: 'السبب مطلوب.' },
      your_reply: 'ردّك', send: 'إرسال الرد', write_first: 'اكتب ردّك أولًا.', sent_ok: 'تم إرسال الرد. أصبحت الرسالة «تم الحل».', reply_hint: 'عند إرسال الرد تتحول الرسالة تلقائيًا إلى «تم الحل».',
      admin: 'المشرف', ev: { assigned: 'أُسندت إلى', reassigned: 'أُعيد إسنادها إلى', approved: 'اعتمدها' },
      reported_ev: (by, src) => `أبلغ عن التأخير ${by} (${src}).`, handled_ev: 'تم تعليمها كمعالَجة.',
      net: 'تعذّر الوصول إلى الخادم.', fail: 'حدث خطأ: ', none_dash: '-', review: 'مراجعة', see_all: 'عرض الكل', showing: (a, b) => `عرض ${a} من ${b}`,
      k_delayed_sub: n => n ? `${n} تجاوزت 48 ساعة` : 'لا توجد تقارير تجاوزت المدة', k_lic_sub: (t, r) => r ? `${r} تجديد · ${t}` : (t ? `الأقدم ينتظر ${t}` : 'لا أحد في الانتظار'),
      k_cmp_sub: t => t ? `الأقدم ينتظر ${t}` : 'لا شيء ينتظر', k_del_sub: t => t ? `الأقدم ينتظر ${t}` : 'لا أحد في الانتظار',
      attn_t: 'عاجل', attn_s: 'الأقدم أولًا · مرّر لرؤية المزيد', attn_none: 'كل شيء على ما يرام. لا شيء ينتظرك.',
      t_lic: 'طلب ترخيص', t_ren: 'تجديد رخصة', t_cmp: 'دعم', t_del: 'حذف حساب',
      act_t: 'النشاط الأسبوعي', act_s: 'آخر 8 أسابيع', leg_d: 'التقارير المتأخرة', leg_c: 'الدعم', leg_l: 'قرارات التراخيص',
      act_none: 'لا يوجد نشاط في آخر 8 أسابيع.', wk: d => `أسبوع ${d}`,
      d_sub: 'حسب الحالة والمصدر', l_sub: 'المعلّقة والمقرَّرة', c_sub: 'المعلّقة والمحلولة', x_sub: 'المعلّقة والمغلقة',
      by_source: 'حسب المصدر', by_type: 'المعلّقة حسب النوع', by_sender: 'حسب المرسل', by_role: 'المعلّقة حسب الدور', total: 'الإجمالي', view_all: 'عرض الكل',
      kp_d: 'تقارير متأخرة', kp_l: 'تراخيص معلّقة', kp_c: 'دعم معلّق', kp_x: 'طلبات حذف', h_l: 'طلبات التراخيص', h_c: 'الدعم', h_x: 'طلبات حذف الحساب',
      unresolved: 'معلّقة'
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
  const CST = { pending: ['pending', 'tag-wait'], resolved: ['resolved', 'tag-done'] };      // a support message is pending or resolved, nothing else
  const XST = { pending: ['pending', 'tag-wait'], closed: ['closed', 'tag-done'] };
  const KIND = { registration: ['k_reg', 'tag-info'], renewal: ['k_ren', 'tag-bad'] };
  const tag = (txt, cls) => `<span class="tag ${cls}">${esc(txt)}</span>`;
  const roleTag = r => tag(T[r] || r, 'tag-role');

  // ---------------------------------------------------------------- talking to the server
  function toast(m) { const t = $('#toast'); t.innerHTML = `<span>${esc(m)}</span>`; clearTimeout(toast.id); toast.id = setTimeout(() => { t.innerHTML = ''; }, 3500); }
  async function api(url, method = 'GET', body) {
    let res;
    try { res = await fetch(url, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined }); }
    catch (e) { toast(T.net); return null; }
    if (res.status === 401 || res.status === 403) { location.href = '/login'; return null; }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) { toast(T.err[data.error] || T.fail + (data.error || res.status)); return null; }
    return data;
  }

  const DB = { delayed: [], pending: [], history: [], accounts: [], cmp: [], dels: [], summary: { delayed: 0, licenses: 0, deletions: 0, support: 0 } };
  const LOAD = {
    async summary() { const d = await api('/api/admin/summary'); if (d) DB.summary = d; },
    async delayed() {
      const d = await api('/api/admin/delayed'); if (!d) return;
      DB.delayed = d.delayed.map(r => {
        const log = r.log.map(e => ({ t: ts(e.created_at), txt: `${T.ev[e.event_type] || e.event_type} ${e.doctor_name || '-'}.` + (e.note ? ' ' + e.note : '') }));
        log.push({ t: ts(r.reported_at), txt: T.reported_ev(r.raised_by, T[r.source] || r.source) });
        if (r.handled_at) log.push({ t: ts(r.handled_at), txt: T.handled_ev });
        return { id: String(r.delay_complaint_id), no: '#' + r.case_id, src: r.source, dr: r.doctor_name || '', at: ts(r.submitted_at), rep: ts(r.reported_at), st: r.status, by: r.raised_by, pt: r.patient_name, log: log.sort((x, y) => x.t - y.t) };
      });
    },
    async pending() { const d = await api('/api/admin/license-requests'); if (d) DB.pending = d.requests.map(r => ({ id: String(r.user_id), name: r.full_name, role: r.role, scfhs: r.scfhs_number, nid: r.national_id, email: r.email, kind: r.kind, at: ts(r.since), exp: r.license_expiry, next: r.pending_license_expiry })); },
    async history() { const d = await api('/api/admin/decisions'); if (d) DB.history = d.decisions.map(r => ({ name: r.applicant_name, role: r.applicant_role, kind: r.kind || 'registration', d: r.decision, why: r.reason || '', at: ts(r.decided_at) })); },
    async accounts() { const d = await api('/api/admin/accounts'); if (d) DB.accounts = d.accounts.map(r => ({ id: String(r.user_id), name: r.full_name, role: r.role, scfhs: r.scfhs_number, expired: r.expired, at: ts(r.approved_at) })); },
    async deletions() { const d = await api('/api/admin/deletion-requests'); if (d) DB.dels = d.requests.map(r => ({ id: String(r.user_id), name: r.full_name, role: r.role, email: r.email, scfhs: r.scfhs_number, st: r.status, cases: r.open_cases, at: ts(r.requested_at), closed: ts(r.closed_at) })); },
    async support() { const d = await api('/api/admin/support'); if (d) DB.cmp = d.support.map(c => ({ id: String(c.request_id), no: '#' + c.request_id, who: c.requester_role, name: c.requester, body: c.body, st: c.status === 'resolved' ? 'resolved' : 'pending', at: ts(c.created_at), th: c.replies.map(m => ({ t: ts(m.created_at), txt: m.body })) })); }
  };
  const reload = (...names) => Promise.all(names.map(n => LOAD[n]())).then(() => draw());

  // ---------------------------------------------------------------- filters
  const PAGE = document.body.dataset.page || 'home';
  const QS = new URLSearchParams(location.search);
  const KEYS = { delayed: ['q', 'src', 's'], licenses: ['q', 'r', 'd', 'k', 'from', 'to'], accounts: ['q', 'r', 's'], support: ['q', 'w', 's'] }[PAGE] || [];
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
  const KINDS = [['registration', T.k_reg], ['renewal', T.k_ren]];

  const BAR = {
    delayed: () => search('q', T.search_case) + sel('src', [['patient', T.patient], ['radiologist', T.radiologist]], T.all_sources) + sel('s', Object.entries(DST).map(([k, v]) => [k, T[v[0]]]), T.all_status),
    licenses: () => [['pending', T.c_pending], ['history', T.c_history], ['accounts', T.c_accounts]].map(([k, l]) => `<button type="button" class="chip${S.sub === k ? ' is-on' : ''}" data-act="sub" data-id="${k}">${l}</button>`).join('') + '<span class="gap"></span>' +
      (S.sub === 'pending' ? sel('r', ROLES2, T.all_roles) + sel('k', KINDS, T.all_types) : '') +
      (S.sub === 'history' ? search('q', T.search_app) + sel('k', KINDS, T.all_types) + sel('d', [['approved', T.approved], ['rejected', T.rejected]], T.all_decisions) + date('from', T.from) + date('to', T.to) : '') +
      (S.sub === 'accounts' ? search('q', T.search_name) + sel('r', ROLES2, T.all_roles) : ''),
    accounts: () => search('q', T.search_name) + sel('r', ROLES2, T.all_roles) + sel('s', Object.entries(XST).map(([k, v]) => [k, T[v[0]]]), T.all_status),
    support: () => search('q', T.search_cmp) + sel('w', ROLES3, T.all_roles) + sel('s', Object.entries(CST).map(([k, v]) => [k, T[v[0]]]), T.all_status)
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
  const kindTag = k => tag(T[KIND[k][0]], KIND[k][1]);
  const RL = (r, acts) => row('minmax(190px,1.6fr) 105px 145px 120px 120px auto',
    who(r.name, r.email, initials(r.name)) + cell(T.role, roleTag(r.role), 'hide-sm') + cell(T.type, kindTag(r.kind)) + cell(T.scfhs, esc(r.scfhs), 'hide-sm') +
    (r.kind === 'renewal' ? cell(T.expired_on, fmt(r.at), 'hide-sm') : cell(T.submitted, fmt(r.at), 'hide-sm')) + `<div class="acts">${acts}</div>`);
  const RC = (c, acts) => row('minmax(0,3.2fr) minmax(0,1.2fr) 110px 110px 120px 150px',
    who(snip(c.body), `${T.ticket} ${c.no}`, '?') + cell(T.complainant, esc(c.name), 'hide-sm') + cell(T.role, roleTag(c.who), 'hide-sm') + cell(T.status, tag(T[CST[c.st][0]], CST[c.st][1])) + cell(T.submitted, fmt(c.at), 'hide-sm') + `<div class="acts">${acts}</div>`);
  const RX = (r, acts) => row('minmax(0,1.5fr) 120px 110px minmax(0,1fr) 120px 270px',
    who(r.name, r.email, initials(r.name)) + cell(T.role, roleTag(r.role), 'hide-sm') + cell(T.open_cases, r.role === 'doctor' ? String(r.cases) : '-', 'hide-sm') + cell(T.requested, fmt(r.at), 'hide-sm') + cell(T.status, tag(T[XST[r.st][0]], XST[r.st][1])) + `<div class="acts">${acts}</div>`);
  const snip = t => { const x = String(t || '').replace(/\s+/g, ' ').trim(); return x.length > 70 ? x.slice(0, 70) + '…' : x; };

  const OUT = {
    delayed() {
      const f = S.f, list = DB.delayed.filter(r => (!f.src || r.src === f.src) && (!f.s || r.st === f.s) && has(r.no + r.dr, f.q)).sort((a, b) => (a.st === 'handled') - (b.st === 'handled') || a.at - b.at);   // pending first (oldest on top), handled at the bottom
      return list.map(r => RD(r, (r.st === 'pending' ? btn('reas', r.id, T.reassign, 'btn-soft') : '') + btn('dview', r.id, T.view, 'btn-ghost'))).join('') || empty(T.none_delayed);
    },
    licenses() {
      const f = S.f;
      if (S.sub === 'pending') {
        return DB.pending.filter(r => (!f.r || r.role === f.r) && (!f.k || r.kind === f.k)).sort((a, b) => a.at - b.at).map(r => RL(r, btn('lview', r.id, T.view, 'btn-ghost') + btn('appr', r.id, T.approve, 'btn-primary') + btn('rej', r.id, T.reject, 'btn-danger'))).join('') || empty(T.none_pending);
      }
      if (S.sub === 'history') {
        return DB.history.filter(r => has(r.name, f.q) && (!f.k || r.kind === f.k) && (!f.d || r.d === f.d) && (!f.from || r.at >= new Date(f.from).getTime()) && (!f.to || r.at <= new Date(f.to).getTime() + 864e5 - 1)).sort((a, b) => b.at - a.at)
          .map(r => row('minmax(0,1.4fr) 100px 140px 110px minmax(0,1.4fr) minmax(0,1fr)',
            who(r.name, '', initials(r.name)) + cell(T.role, roleTag(r.role), 'hide-sm') + cell(T.type, kindTag(r.kind), 'hide-sm') + cell(T.decision, tag(T[r.d], r.d === 'approved' ? 'tag-done' : 'tag-bad')) + cell(T.reason, esc(r.why || '-'), 'hide-sm') + cell(T.date, fmt(r.at), 'hide-sm'))).join('') || empty(T.none_match);
      }
      return DB.accounts.filter(r => has(r.name + r.scfhs, f.q) && (!f.r || r.role === f.r)).map(r => row('minmax(0,1.4fr) 110px minmax(0,1.2fr) minmax(0,1fr) 120px',
        who(r.name, r.expired ? T.lic_expired : '', initials(r.name)) + cell(T.role, roleTag(r.role), 'hide-sm') + cell(T.scfhs, esc(r.scfhs), 'hide-sm') + cell(T.approved_on, fmt(r.at), 'hide-sm') +
        `<div class="acts">${btn('del', r.id, T.del, 'btn-danger')}</div>`)).join('') || empty(T.none_acc);
    },
    accounts() {
      const f = S.f;
      return DB.dels.filter(r => (!f.r || r.role === f.r) && (!f.s || r.st === f.s) && has(r.name + r.scfhs, f.q)).sort((a, b) => (a.st === 'closed') - (b.st === 'closed') || (a.st === 'closed' ? b.closed - a.closed : a.at - b.at))
        .map(r => RX(r, btn('xview', r.id, T.view, 'btn-ghost') + (r.st === 'pending' ? btn('xappr', r.id, T.approve, 'btn-primary') + btn('xdec', r.id, T.x_dec, 'btn-danger') : ''))).join('') || empty(T.none_del);
    },
    support() {
      const f = S.f;      // waiting messages first (the one that arrived first on top), answered ones after them (newest first)
      return DB.cmp.filter(c => (!f.w || c.who === f.w) && (!f.s || c.st === f.s) && has(c.body + c.name, f.q)).sort((a, b) => (a.st === 'resolved') - (b.st === 'resolved') || (a.st === 'resolved' ? b.at - a.at : a.at - b.at))
        .map(c => RC(c, btn('cview', c.id, T.respond, c.st === 'resolved' ? 'btn-ghost' : 'btn-soft'))).join('') || empty(T.none_cmp);
    }
  };

  // ---------------------------------------------------------------- dashboard: numbers, charts, what needs attention
  // Everything is worked out here from the same /api/admin data the other pages use. Every number, bar and
  // slice is a link: it opens the page it counts, already filtered (the pages read ?s=, ?k=, ?tab= ... from the address).
  const WEEK = 7 * 864e5;
  const PG = { delayed: '/admin-delayed-reports', licenses: '/admin-license-verification', deletions: '/admin-account-requests', support: '/admin-support' };
  const lnk = (base, q) => base + (q ? '?' + new URLSearchParams(q) : '');
  const sum = a => a.reduce((x, y) => x + y, 0);
  const ICO = {
    delayed: ['red', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" stroke-linecap="round"/>'],
    licenses: ['ok', '<path d="M12 3 4 6v6c0 4.4 3.4 8.3 8 9 4.6-.7 8-4.6 8-9V6l-8-3Z" stroke-linejoin="round"/><path d="m8.8 12.2 2.3 2.3 4.2-4.4" stroke-linecap="round" stroke-linejoin="round"/>'],
    support: ['amber', '<path d="M4 14v-2a8 8 0 0 1 16 0v2" stroke-linecap="round"/><rect x="2.5" y="12.5" width="4.5" height="7.5" rx="2.2"/><rect x="17" y="12.5" width="4.5" height="7.5" rx="2.2"/>'],
    deletions: ['', '<circle cx="10" cy="8" r="4"/><path d="M2.5 21a7.5 7.5 0 0 1 15 0" stroke-linecap="round"/><path d="m16.5 9.5 5 5m0-5-5 5" stroke-linecap="round"/>'],
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
      return `<div class="wk-col" title="${esc(`${T.wk(short(c.t))}: ${T.leg_d} ${c.d} · ${T.leg_c} ${c.c} · ${T.leg_l} ${c.l}`)}"><div class="wk-bar"><span class="wk-n">${tot || ''}</span><div class="wk-stack" style="height:${tot ? Math.max(6, tot / mx * 250) : 3}px">${seg(c.l, 'ink', 'l', PG.licenses + '?tab=history')}${seg(c.c, 'amber', 'c', PG.support)}${seg(c.d, 'brand', 'd', PG.delayed)}</div></div><span class="wk-x">${short(c.t)}</span></div>`;
    }).join('')}</div>`;
  }

  // The "Urgent" box: everything that is waiting, the most overdue first. When there are many items the list
  // scrolls inside the same card (the card keeps its size).
  function attention() {
    const items = [
      ...DB.delayed.filter(r => r.st === 'pending').map(r => ({ k: 'delayed', id: r.id, at: r.at, title: `${T.case} ${r.no}`, sub: `${T.delayed_req} · ${r.dr || T.not_assigned}`, bad: hrs(r.at) > 48 })),
      ...DB.pending.map(r => ({ k: 'licenses', id: r.id, at: r.at, title: r.name, sub: `${r.kind === 'renewal' ? T.t_ren : T.t_lic} · ${T[r.role] || r.role}`, bad: r.kind === 'renewal' })),
      ...DB.dels.filter(r => r.st === 'pending').map(r => ({ k: 'deletions', id: r.id, at: r.at, title: r.name, sub: `${T.t_del} · ${T[r.role] || r.role}` })),
      ...DB.cmp.filter(c => c.st === 'pending').map(c => ({ k: 'support', id: c.id, at: c.at, title: snip(c.body), sub: `${T.t_cmp} · ${c.name}` }))
    ].sort((a, b) => (b.bad || 0) - (a.bad || 0) || a.at - b.at);
    if (!items.length) return `<div class="empty small"><h3>${T.attn_none}</h3></div>`;
    return `<div class="att-list">${items.map(i => `<a class="att" href="${lnk(PG[i.k], { open: i.id })}"><span class="att-ico ${ICO[i.k][0]}">${svgIco(i.k)}</span><div><strong>${esc(i.title)}</strong><p>${esc(i.sub)}</p></div>${tag(dur(i.at), i.bad ? 'tag-bad' : 'tag-wait')}${SVG.go}</a>`).join('')}</div>`;
  }

  function drawHome() {
    const n = DB.summary, over = DB.delayed.filter(r => r.st === 'pending' && hrs(r.at) > 48).length;
    const oldest = a => a.length ? dur(Math.min(...a.map(r => r.at))) : '';
    const ren = DB.pending.filter(r => r.kind === 'renewal').length;
    const dwait = DB.dels.filter(r => r.st === 'pending'), cwait = DB.cmp.filter(c => c.st === 'pending');
    const kpi = [
      ['delayed', n.delayed, T.kp_d, T.k_delayed_sub(over), over ? 'bad' : '', lnk(PG.delayed, { s: 'pending' })],
      ['licenses', n.licenses, T.kp_l, T.k_lic_sub(oldest(DB.pending), ren), '', PG.licenses],
      ['deletions', n.deletions, T.kp_x, T.k_del_sub(oldest(dwait)), '', lnk(PG.deletions, { s: 'pending' })],
      ['support', n.support, T.kp_c, T.k_cmp_sub(oldest(cwait)), '', lnk(PG.support, { s: 'pending' })]
    ];
    $('#stats').innerHTML = kpi.map(([k, v, l, sub, cls, href]) => `<a class="card stat" href="${href}"><span class="ico ${ICO[k][0]}">${svgIco(k)}</span><div><strong>${v}</strong><span>${esc(l)}</span></div></a>`).join('');

    // delayed reports
    const dp = DB.delayed.filter(r => r.st === 'pending').length, dh = DB.delayed.length - dp;
    const bySrc = s => DB.delayed.filter(r => r.src === s).length;
    const dItems = [{ label: T.pending, v: dp, c: 'amber', href: lnk(PG.delayed, { s: 'pending' }) }, { label: T.handled, v: dh, c: 'ok', href: lnk(PG.delayed, { s: 'handled' }) }];
    // license requests (registration + renewal)
    const ap = DB.history.filter(r => r.d === 'approved').length, rj = DB.history.length - ap;
    const lItems = [{ label: T.pending, v: DB.pending.length, c: 'amber', href: PG.licenses }, { label: T.approved, v: ap, c: 'ok', href: lnk(PG.licenses, { tab: 'history', d: 'approved' }) }, { label: T.rejected, v: rj, c: 'red', href: lnk(PG.licenses, { tab: 'history', d: 'rejected' }) }];
    const pk = k => DB.pending.filter(x => x.kind === k).length;
    // account deletion requests
    const xp = dwait.length, xc = DB.dels.length - xp;
    const xItems = [{ label: T.pending, v: xp, c: 'amber', href: lnk(PG.deletions, { s: 'pending' }) }, { label: T.closed, v: xc, c: 'ok', href: lnk(PG.deletions, { s: 'closed' }) }];
    const xr = r => dwait.filter(x => x.role === r).length;
    // support
    const cs = s => DB.cmp.filter(c => c.st === s).length, cw = r => DB.cmp.filter(c => c.who === r).length;
    const cItems = [{ label: T.pending, v: cs('pending'), c: 'amber', href: lnk(PG.support, { s: 'pending' }) }, { label: T.resolved, v: cs('resolved'), c: 'ok', href: lnk(PG.support, { s: 'resolved' }) }];

    const two = (items, label) => `<div class="dn">${donut(items, label)}${legend(items)}</div>`;
    $('#home').innerHTML =
      `<div class="dash-row two"><section class="card dash-card"><header class="dc-h"><div><h2>${T.attn_t}</h2><p>${T.attn_s}</p></div></header>${attention()}</section>
       <section class="card dash-card"><header class="dc-h"><div><h2>${T.act_t}</h2><p>${T.act_s}</p></div></header>${weekly()}</section></div>
       <div class="dash-row pair">` +
      dcard('delayed', T.s_delayed, T.d_sub, two(dItems, T.total) + `<h3 class="dc-sub">${T.by_source}</h3>` + hbars([
        { label: T.patient, v: bySrc('patient'), c: 'brand', href: lnk(PG.delayed, { src: 'patient' }) }, { label: T.radiologist, v: bySrc('radiologist'), c: 'brand', href: lnk(PG.delayed, { src: 'radiologist' }) }]), PG.delayed) +
      dcard('licenses', T.h_l, T.l_sub, two(lItems, T.total) + `<h3 class="dc-sub">${T.by_type}</h3>` + hbars([
        { label: T.k_reg, v: pk('registration'), c: 'brand', href: lnk(PG.licenses, { k: 'registration' }) }, { label: T.k_ren, v: pk('renewal'), c: 'brand', href: lnk(PG.licenses, { k: 'renewal' }) }]), PG.licenses) +
      dcard('deletions', T.h_x, T.x_sub, two(xItems, T.total) + `<h3 class="dc-sub">${T.by_role}</h3>` + hbars([
        { label: T.doctor, v: xr('doctor'), c: 'brand', href: lnk(PG.deletions, { s: 'pending', r: 'doctor' }) }, { label: T.radiologist, v: xr('radiologist'), c: 'brand', href: lnk(PG.deletions, { s: 'pending', r: 'radiologist' }) }]), PG.deletions) +
      dcard('support', T.h_c, T.c_sub, two(cItems, T.total) + `<h3 class="dc-sub">${T.by_sender}</h3>` + hbars([
        { label: T.patient, v: cw('patient'), c: 'brand', href: lnk(PG.support, { w: 'patient' }) }, { label: T.doctor, v: cw('doctor'), c: 'brand', href: lnk(PG.support, { w: 'doctor' }) }, { label: T.radiologist, v: cw('radiologist'), c: 'brand', href: lnk(PG.support, { w: 'radiologist' }) }]), PG.support) +
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
    const res = await api(`/api/admin/license-requests/${r.id}/${d === 'approved' ? 'approve' : 'reject'}`, 'POST', d === 'rejected' ? { reason: why } : {});
    if (!res) return;
    toast(d === 'approved' ? T.approved_ok(r.name, r.kind) : T.rejected_ok(r.name, r.kind));
    panel.open && panel.close(); reload('pending', 'history', 'accounts');
  }
  function openDelayed(id) {
    const r = by(DB.delayed, id);
    openPanel(`${T.delayed_req} ${r.no}`, kv({ [T.source]: T[r.src] || r.src, [T.reported_by]: r.by, [T.patient_l]: r.pt, [T.doctor_l]: r.dr || T.not_assigned, [T.submitted]: fmt(r.at), [T.delay]: dur(r.at), [T.status]: T[DST[r.st][0]] }) +
      `<h3 class="sub-h">${T.what}</h3>${[...r.log].reverse().map(m => `<div class="msg"><small>${fmt(m.t)}</small>${esc(m.txt)}</div>`).join('')}` +
      (r.st === 'pending' ? `<div class="panel-actions">${btn('dhandled', r.id, T.mark, 'btn-primary')}</div>` : ''));
  }
  function openComplaint(id) {
    const c = by(DB.cmp, id);
    openPanel(`${T.ticket} ${c.no}`, kv({ [T.complainant]: `${c.name} (${T[c.who] || c.who})`, [T.status]: T[CST[c.st][0]], [T.submitted]: fmt(c.at) }) +
      `<div class="msg">${esc(c.body)}</div>${c.th.map(m => `<div class="msg admin"><small>${T.admin} · ${fmt(m.t)}</small>${esc(m.txt)}</div>`).join('')}
      <div class="field"><label>${T.your_reply}</label><textarea id="c-txt" rows="4"></textarea><p class="err" hidden>${T.write_first}</p>${c.st === 'resolved' ? '' : `<p class="hint">${T.reply_hint}</p>`}</div>
      <div class="panel-actions">${btn('reply', c.id, T.send, 'btn-primary')}</div>`);
  }
  function openDeletion(id) {
    const r = by(DB.dels, id);
    openPanel(`${T.x_view}`, kv({ [T.name]: r.name, [T.role]: T[r.role] || r.role, [T.scfhs]: r.scfhs, [T.email]: r.email, [T.requested]: fmt(r.at), [T.status]: T[XST[r.st][0]], ...(r.role === 'doctor' ? { [T.open_cases]: String(r.cases) } : {}), ...(r.st === 'closed' ? { [T.closed_on]: fmt(r.closed) } : {}) }) +
      (r.st === 'pending' ? `<div class="panel-actions">${btn('xappr', r.id, T.approve, 'btn-primary')}${btn('xdec', r.id, T.x_dec, 'btn-danger')}</div>` : ''));
  }

  const A = {
    sub: id => { S.sub = id; S.f = {}; draw(); },
    pclose: () => panel.close(),
    reas: async id => {
      const r = by(DB.delayed, id), d = await api('/api/admin/doctors'); if (!d) return;
      const docs = d.doctors.filter(x => x.full_name !== r.dr), lbl = x => `${x.full_name} (${x.open_cases})`;    // the list comes fewest-cases first, so the best choice is already selected
      ask({ title: T.reassign_t(r.no), text: T.current(r.dr || T.not_assigned) + ' ' + T.new_doc_hint, ok: T.reassign, field: T.new_doc, opts: docs.map(lbl) }, async v => {
        const doc = docs.find(x => lbl(x) === v); if (!doc) return;
        if (await api(`/api/admin/delayed/${id}/reassign`, 'POST', { doctor_id: doc.user_id })) { toast(T.reassigned_ok(r.no, doc.full_name)); reload('delayed'); }
      });
    },
    dview: id => openDelayed(id),
    dhandled: async id => { if (await api(`/api/admin/delayed/${id}/handled`, 'POST', {})) { toast(T.handled_ok); await LOAD.delayed(); openDelayed(id); draw(false); } },
    lview: id => {
      const r = by(DB.pending, id);
      openPanel(r.name, kv({ [T.type]: T[KIND[r.kind][0]], [T.role]: T[r.role] || r.role, [T.scfhs]: r.scfhs, [T.nid]: r.nid, [T.email]: r.email, ...(r.kind === 'renewal' ? { [T.expired_on]: fmt(r.at), [T.new_date]: fmt(r.next) } : { [T.submitted]: fmt(r.at) }) }) +
        `<div class="panel-actions">${btn('appr', id, T.approve, 'btn-primary')}${btn('rej', id, T.reject, 'btn-danger')}</div>`);
    },
    appr: id => decide(by(DB.pending, id), 'approved'),
    rej: id => { const r = by(DB.pending, id); ask({ title: T.reject_t(r.name), text: T.reject_s, ok: T.reject, danger: true, field: T.reject_r, req: true }, v => decide(r, 'rejected', v)); },
    del: id => { const r = by(DB.accounts, id); ask({ title: T.delete_t(r.name), text: T.delete_s, ok: T.delete_b, danger: true }, async () => { const d = await api(`/api/admin/accounts/${id}`, 'DELETE'); if (d) { toast(T.deleted_ok(d.moved)); reload('accounts'); } }); },
    xview: openDeletion,
    xappr: id => { const r = by(DB.dels, id); ask({ title: T.x_appr_t(r.name), text: T.delete_s, ok: T.x_appr_b, danger: true }, async () => { const d = await api(`/api/admin/deletion-requests/${id}/approve`, 'POST', {}); if (d) { toast(T.deleted_ok(d.moved)); panel.open && panel.close(); reload('deletions'); } }); },
    xdec: id => { const r = by(DB.dels, id); ask({ title: T.x_dec_t(r.name), text: T.x_dec_s, ok: T.x_dec_b }, async () => { if (await api(`/api/admin/deletion-requests/${id}/decline`, 'POST', {})) { toast(T.x_dec_ok); panel.open && panel.close(); reload('deletions'); } }); },
    cview: openComplaint,
    reply: async id => {
      const txt = $('#c-txt', panel).value.trim();
      if (!txt) { $('.err', panel).hidden = false; return; }
      if (await api(`/api/admin/support/${id}/respond`, 'POST', { reply: txt })) { toast(T.sent_ok); await LOAD.support(); openComplaint(id); draw(false); }
    }
  };

  // a click on the dimmed area outside the white box closes the side panel / the question box
  [dlg, panel].forEach(d => d.addEventListener('click', e => {
    if (e.target !== d) return;
    const r = d.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
  }));
  document.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b && A[b.dataset.act]) A[b.dataset.act](b.dataset.id); });
  document.addEventListener('input', e => { const f = e.target.dataset.f; if (f) { S.f[f] = e.target.value; draw(false); } });
  draw();
  reload(...({ home: ['summary', 'delayed', 'pending', 'support', 'history', 'accounts', 'deletions'], delayed: ['delayed'], licenses: ['pending', 'history', 'accounts'], accounts: ['deletions'], support: ['support'] }[PAGE])).then(() => {
    // a dashboard link can point straight at one item: ?open=ID opens its panel
    const o = QS.get('open'), f = { delayed: 'dview', licenses: 'lview', accounts: 'xview', support: 'cview' }[PAGE], list = { delayed: DB.delayed, licenses: DB.pending, accounts: DB.dels, support: DB.cmp }[PAGE];
    if (o && f && list.some(x => x.id === o)) { A[f](o); history.replaceState(null, '', location.pathname + location.hash); }
  });
})();
