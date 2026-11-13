/* ==========================================================
   MUFSAL - Doctor case review pages (review-case.html, view-report.html)
   Uses only the shared tokens from vars.css. Logical properties (inline-start/end)
   are used so the layout flips automatically in Arabic (RTL).
   ========================================================== */

.review-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-lg) var(--spacing-md) 48px;
}

.page-head { margin-bottom: var(--spacing-lg); }
.page-head h1 { font-size: var(--font-size-h1); font-weight: var(--font-bold); margin: 0 0 4px; }
.page-head p  { margin: 0; color: var(--medium-grey); }

.back-link {
  display: inline-flex; align-items: center; gap: 6px;
  color: var(--medium-blue); text-decoration: none;
  font-weight: var(--font-medium); margin-bottom: var(--spacing-md);
}
.back-link:hover { text-decoration: underline; }
html[dir="rtl"] .back-link svg, html[lang="ar"] .back-link svg { transform: scaleX(-1); }

/* ---------- Cards ---------- */
.card {
  background: var(--white);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  border: var(--border-sm) solid var(--light-gray);
}
.card h2 {
  font-size: 18px; font-weight: var(--font-semibold);
  margin: 0 0 var(--spacing-md);
  display: flex; align-items: center; gap: var(--spacing-sm);
}
.card h2 .icon-box { height: 32px; width: 32px; }
.card h2 .icon-box svg { width: 18px; height: 18px; }

/* ---------- Badges ---------- */
.badge {
  display: inline-block; padding: 2px 12px; border-radius: 999px;
  font-size: 14px; font-weight: var(--font-semibold); white-space: nowrap;
}
.badge-high   { background: var(--pale-red);    color: var(--dark-red); }
.badge-medium { background: var(--cream);       color: #7a5a00; }
.badge-low    { background: var(--light-green); color: var(--dark-green); }
.badge-pending  { background: var(--cream);       color: #7a5a00; }
.badge-approved { background: var(--light-green); color: var(--dark-green); }
.badge-source   { background: var(--pale-blue);   color: var(--medium-blue); }

/* ---------- Buttons ---------- */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px 20px; border-radius: var(--radius-sm);
  font: inherit; font-weight: var(--font-semibold); cursor: pointer;
  border: var(--border-sm) solid transparent; text-decoration: none;
}
.btn-primary { background: var(--medium-blue); color: var(--white); }
.btn-primary:hover { filter: brightness(0.92); }
.btn-outline { background: var(--white); color: var(--medium-blue); border-color: var(--medium-blue); }
.btn-outline:hover { background: var(--pale-blue); }
.btn-ghost { background: transparent; color: var(--navy-blue); border-color: var(--light-gray); }
.btn-ghost:hover { background: var(--light-gray); }
.btn:disabled { opacity: .5; cursor: not-allowed; filter: none; }
.btn:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible {
  outline: var(--border) solid var(--medium-blue); outline-offset: 2px;
}

/* ================= LIST PAGE ================= */
.toolbar {
  display: flex; flex-wrap: wrap; gap: var(--spacing-md);
  align-items: center; justify-content: space-between; margin-bottom: var(--spacing-md);
}
.chips { display: flex; flex-wrap: wrap; gap: var(--spacing-sm); }
.chip {
  padding: 6px 16px; border-radius: 999px; cursor: pointer; font: inherit;
  background: var(--white); color: var(--navy-blue);
  border: var(--border-sm) solid var(--light-gray);
}
.chip[aria-pressed="true"] { background: var(--medium-blue); color: var(--white); border-color: var(--medium-blue); }
.search {
  min-width: 240px; padding: 9px 14px; border-radius: var(--radius-sm);
  border: var(--border-sm) solid var(--light-gray); font: inherit; background: var(--white);
}

.cases-table { width: 100%; border-collapse: collapse; }
.cases-table th {
  text-align: start; font-size: 14px; font-weight: var(--font-semibold);
  color: var(--medium-grey); padding: 12px 16px;
  border-bottom: var(--border-sm) solid var(--light-gray);
}
.cases-table td { padding: 16px; border-bottom: var(--border-sm) solid var(--light-gray); vertical-align: middle; }
.cases-table tbody tr:last-child td { border-bottom: 0; }
.cases-table tbody tr:hover { background: var(--pale-blue); }
.patient-name { font-weight: var(--font-semibold); }
.table-card { padding: 0; overflow: hidden; }

.empty-state { text-align: center; padding: 64px var(--spacing-lg); color: var(--medium-grey); }
.empty-state .icon-box { height: 56px; width: 56px; margin-bottom: var(--spacing-md); }
.empty-state .icon-box svg { width: 28px; height: 28px; }
.empty-state p { margin: 0; font-size: 18px; color: var(--navy-blue); }

/* ================= DETAIL PAGE ================= */
.case-title { display: flex; flex-wrap: wrap; gap: var(--spacing-md); align-items: center; justify-content: space-between; }
.case-title .meta { display: flex; flex-wrap: wrap; gap: var(--spacing-sm); align-items: center; }

.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-lg); margin-top: var(--spacing-lg); }
.stack { display: flex; flex-direction: column; gap: var(--spacing-lg); }

/* X-ray viewer */
.xray-box {
  position: relative; background: var(--dark-gray); border-radius: var(--radius-md);
  aspect-ratio: 4 / 3; overflow: hidden; display: flex; align-items: center; justify-content: center;
}
.xray-box img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
.xray-box .heat { opacity: 0; transition: opacity .2s; mix-blend-mode: screen; }
.xray-box.show-heat .heat { opacity: .75; }
.xray-placeholder { color: var(--medium-grey); font-size: 14px; text-align: center; padding: var(--spacing-md); }
.viewer-controls { display: flex; align-items: center; justify-content: space-between; margin-top: var(--spacing-md); gap: var(--spacing-md); flex-wrap: wrap; }
.switch { display: inline-flex; align-items: center; gap: 10px; cursor: pointer; font-weight: var(--font-medium); }
.switch input { width: 18px; height: 18px; accent-color: var(--medium-blue); }
.hint { font-size: 14px; color: var(--medium-grey); margin: var(--spacing-sm) 0 0; }

/* AI result */
.grade-row { display: flex; align-items: center; gap: var(--spacing-md); margin-bottom: var(--spacing-md); }
.grade-circle {
  width: 84px; height: 84px; border-radius: 50%; flex-shrink: 0;
  background: var(--pale-blue); color: var(--medium-blue);
  display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.1;
}
.grade-circle small { font-size: 12px; font-weight: var(--font-medium); }
.grade-circle strong { font-size: 34px; font-weight: var(--font-bold); }
.grade-circle.edited { background: var(--cream); color: #7a5a00; }
.grade-name { font-size: 20px; font-weight: var(--font-semibold); margin: 0; }
.grade-desc { margin: 2px 0 0; color: var(--medium-grey); font-size: 15px; }
.edited-note { margin: var(--spacing-sm) 0 0; font-size: 14px; color: #7a5a00; background: var(--cream); border-radius: var(--radius-sm); padding: 6px 12px; }

.kv { display: flex; justify-content: space-between; gap: var(--spacing-md); padding: 10px 0; border-bottom: var(--border-sm) solid var(--light-gray); }
.kv:last-child { border-bottom: 0; }
.kv dt { color: var(--medium-grey); }
.kv dd { margin: 0; font-weight: var(--font-semibold); text-align: end; }
dl.kv-list { margin: 0; }

.prob-list { margin: var(--spacing-md) 0 0; padding: 0; list-style: none; display: grid; gap: 8px; }
.prob { display: grid; grid-template-columns: 56px 1fr 52px; gap: 10px; align-items: center; font-size: 14px; }
.prob .bar { height: 10px; background: var(--light-gray); border-radius: 999px; overflow: hidden; }
.prob .bar i { display: block; height: 100%; background: var(--medium-grey); border-radius: 999px; }
.prob.top .bar i { background: var(--medium-blue); }
.prob .pct { text-align: end; font-variant-numeric: tabular-nums; }

.edit-box { margin-top: var(--spacing-md); padding: var(--spacing-md); background: var(--pale-blue); border-radius: var(--radius-sm); }
.edit-box label { display: block; font-weight: var(--font-medium); margin-bottom: 6px; }
.edit-actions { display: flex; gap: var(--spacing-sm); margin-top: var(--spacing-md); flex-wrap: wrap; }
.field {
  width: 100%; padding: 10px 14px; font: inherit; color: var(--navy-blue);
  border: var(--border-sm) solid var(--medium-grey); border-radius: var(--radius-sm); background: var(--white);
  box-sizing: border-box;
}
.field.small { width: 120px; }
textarea.field { min-height: 130px; resize: vertical; }
.field.invalid { border-color: var(--orange); }
.error-msg { color: var(--dark-red); background: var(--pale-red); border-radius: var(--radius-sm); padding: 6px 12px; margin-top: 8px; font-size: 14px; }

/* Medical history */
.history-block + .history-block { margin-top: var(--spacing-md); }
.history-block h3 { font-size: 15px; font-weight: var(--font-semibold); color: var(--medium-grey); margin: 0 0 6px; }
.history-block p { margin: 0; }
.qa { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
.qa li { display: flex; justify-content: space-between; gap: var(--spacing-md); background: var(--pale-blue); border-radius: var(--radius-sm); padding: 8px 12px; }
.qa li span:first-child { flex: 1; }
.qa li span:last-child { max-width: 55%; font-weight: var(--font-semibold); text-align: end; }
.muted { color: var(--medium-grey); }

/* Decision */
.decision { margin-top: var(--spacing-lg); }
.decision-foot { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-md); flex-wrap: wrap; margin-top: var(--spacing-md); }
.success-banner { background: var(--light-green); color: var(--dark-green); border-radius: var(--radius-sm); padding: 12px 16px; margin-bottom: var(--spacing-md); font-weight: var(--font-medium); }
.disclaimer { margin-top: var(--spacing-lg); font-size: 14px; color: var(--medium-grey); text-align: center; }

.hidden { display: none !important; }

/* ---------- Responsive ---------- */
@media (max-width: 900px) {
  .grid-2 { grid-template-columns: 1fr; }
  .cases-table thead { display: none; }
  .cases-table, .cases-table tbody, .cases-table tr, .cases-table td { display: block; width: 100%; box-sizing: border-box; }
  .cases-table tr { padding: var(--spacing-sm) 0; border-bottom: var(--border-sm) solid var(--light-gray); }
  .cases-table td { border: 0; padding: 6px 16px; display: flex; justify-content: space-between; gap: 12px; }
  .cases-table td::before { content: attr(data-label); color: var(--medium-grey); }
  .search { min-width: 0; width: 100%; }
}

.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
