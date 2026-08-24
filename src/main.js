import { allGroups, meetingMeta, badge } from './data.js';
import { renderDetail }  from './views/detail.js';
import { renderMeeting } from './views/meeting.js';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const listPanel    = document.getElementById('listPanel');
const detailPanel  = document.getElementById('detailPanel');
const detailBody   = document.getElementById('detailBody');
const backBtn      = document.getElementById('backBtn');
const filtersBar   = document.getElementById('filtersBar');
const searchInput  = document.getElementById('searchInput');
const searchClear  = document.getElementById('searchClear');
const searchWrap   = searchInput.closest('.search-wrap');

// ── Navigation state ──────────────────────────────────────────────────────────
// Stack entries: { type: 'meeting'|'decision', meetingDate, decision? }
let navStack = [];

const currentView = () => navStack[navStack.length - 1] ?? null;
const isMobile    = () => window.innerWidth <= 640;

// ── Routing ───────────────────────────────────────────────────────────────────
// Hash routing (not paths) because GitHub Pages serves no rewrites: a real path
// would 404 on refresh or on a shared link. Each view gets a citable URL, and
// the whole nav stack rides along in history.state so back/forward restore the
// exact trail — including the in-app back button's label.

function hashFor(view) {
  if (!view) return '#/';
  return view.type === 'meeting'
    ? `#/m/${view.meetingDate}`
    : `#/d/${view.meetingDate}/${encodeURIComponent(view.decision.id)}`;
}

// Views hold a live decision object; history.state must stay serialisable.
const serializeStack = () =>
  navStack.map(v => ({ type: v.type, meetingDate: v.meetingDate, id: v.decision?.id }));

function hydrate(entry) {
  if (!entry) return null;
  if (entry.type === 'meeting') {
    return meetingMeta[entry.meetingDate]
      ? { type: 'meeting', meetingDate: entry.meetingDate }
      : null;
  }
  const group = allGroups().find(g => g.meeting === entry.meetingDate);
  const decision = group?.decisions.find(d => d.id === entry.id);
  return decision ? { type: 'decision', meetingDate: entry.meetingDate, decision } : null;
}

// A shared or refreshed URL has no history.state, so rebuild a stack from it.
function stackFromHash(hash) {
  const m = /^#\/m\/([^/]+)\/?$/.exec(hash);
  if (m) return [{ type: 'meeting', meetingDate: decodeURIComponent(m[1]) }];
  const d = /^#\/d\/([^/]+)\/([^/]+)\/?$/.exec(hash);
  if (d) return [{ type: 'decision', meetingDate: decodeURIComponent(d[1]), id: decodeURIComponent(d[2]) }];
  return [];
}

function applyStack(entries) {
  navStack = entries.map(hydrate).filter(Boolean);
  const view = currentView();
  if (view) {
    _paint(view);
  } else {
    detailBody.innerHTML = '<div class="detail-empty">Select a decision to view details.</div>';
  }
  renderList();
  syncPanels();
}

window.addEventListener('popstate', (e) => {
  applyStack(e.state?.stack ?? stackFromHash(location.hash));
  if (isMobile()) window.scrollTo(0, 0);
});

// ── Back button label ─────────────────────────────────────────────────────────
function updateBackBtn() {
  const prev = navStack[navStack.length - 2] ?? null;
  if (!prev) {
    backBtn.textContent = '← All decisions';
  } else if (prev.type === 'meeting') {
    const meta = meetingMeta[prev.meetingDate];
    backBtn.textContent = '← ' + (meta ? meta.name : prev.meetingDate);
  } else {
    backBtn.textContent = '← ' + prev.decision.id + ' ' + prev.decision.title;
  }
}

// ── Panel visibility ──────────────────────────────────────────────────────────
function syncPanels() {
  updateBackBtn();
  const hasView = navStack.length > 0;
  if (isMobile()) {
    listPanel.classList.toggle('mobile-hidden', hasView);
    detailPanel.classList.toggle('mobile-hidden', !hasView);
    filtersBar.classList.toggle('mobile-hidden', hasView);
  } else {
    listPanel.classList.remove('mobile-hidden');
    detailPanel.classList.remove('mobile-hidden');
    filtersBar.classList.remove('mobile-hidden');
  }
}

window.addEventListener('resize', syncPanels);

// ── Back button ───────────────────────────────────────────────────────────────
backBtn.addEventListener('click', () => {
  // Defer to real history so the browser's own back button stays in step.
  if ((history.state?.depth ?? 0) > 0) {
    history.back();
    return;
  }
  // Landed straight on a shared link — nothing of ours is behind, so go to the
  // list rather than navigating away from the site.
  history.pushState({ stack: [], depth: 0 }, '', '#/');
  applyStack([]);
  if (isMobile()) window.scrollTo(0, 0);
});

// ── Navigation ────────────────────────────────────────────────────────────────
function navigateTo(view) {
  navStack.push(view);
  history.pushState(
    { stack: serializeStack(), depth: (history.state?.depth ?? 0) + 1 },
    '',
    hashFor(view),
  );
  _paint(view);
  renderList();
  syncPanels();
  if (isMobile()) window.scrollTo(0, 0);
}

function _paint(view) {
  let node;
  if (view.type === 'meeting') {
    const groups = allGroups();
    const group  = groups.find(g => g.meeting === view.meetingDate);
    node = renderMeeting(view.meetingDate, group?.decisions ?? [], {
      onDecisionClick: (d, meetingDate) =>
        navigateTo({ type: 'decision', meetingDate, decision: d }),
    });
  } else {
    const group = allGroups().find(g => g.meeting === view.meetingDate);
    node = renderDetail(view.decision, view.meetingDate, {
      onMeetingClick: (meetingDate) =>
        navigateTo({ type: 'meeting', meetingDate }),
      onDecisionClick: (d, meetingDate) =>
        navigateTo({ type: 'decision', meetingDate, decision: d }),
      decisions: group?.decisions || [],
    });
  }
  detailBody.innerHTML = '';
  detailBody.appendChild(node);
}

// ── List rendering ────────────────────────────────────────────────────────────
function getSearchTokens() {
  const raw = searchInput.value.trim().toLowerCase();
  return raw.replace(/[-\W]+/g, ' ').trim().split(/\s+/).filter(Boolean);
}

function hayFor(d) {
  return ' ' + [d.id, d.title, d.mover, d.seconder, d.fullText, d.preamble]
    .filter(Boolean).join(' ').toLowerCase().replace(/[-\W]+/g, ' ') + ' ';
}

function filterDecisions(decisions, tokens, phraseMode) {
  return decisions.filter(d => {
    if (!tokens.length) return true;
    const hay = hayFor(d);
    if (phraseMode) return hay.includes(' ' + tokens.join(' '));
    // Whole-word AND matching; the last term may be a prefix while typing.
    return tokens.every((t, i) =>
      i === tokens.length - 1 ? hay.includes(' ' + t) : hay.includes(' ' + t + ' '));
  });
}

function activeKeyFor(view) {
  if (!view) return null;
  return view.type === 'meeting'
    ? 'm/' + view.meetingDate
    : 'd/' + view.meetingDate + '/' + view.decision.id;
}

function renderList() {
  listPanel.innerHTML = '';
  const groups = allGroups();
  const active = activeKeyFor(currentView());
  const tokens = getSearchTokens();
  // If the query appears anywhere as an exact consecutive phrase, show only
  // exact phrase matches; otherwise fall back to whole-word AND matching.
  const phraseMode = tokens.length > 1 &&
    groups.some(g => g.decisions.some(d => hayFor(d).includes(' ' + tokens.join(' '))));
  let anyResults = false;

  for (const { meeting, decisions } of groups) {
    const filtered = filterDecisions(decisions, tokens, phraseMode);
    if (!filtered.length) continue;
    anyResults = true;

    const meta       = meetingMeta[meeting];
    const meetingKey = 'm/' + meeting;

    const heading = document.createElement('div');
    heading.className = 'meeting-heading' + (active === meetingKey ? ' active' : '');
    heading.innerHTML = `<span class="meeting-heading-name">${meta ? meta.name : meeting}</span><span class="meeting-heading-arrow">›</span>`;
    heading.addEventListener('click', () => navigateTo({ type: 'meeting', meetingDate: meeting }));
    listPanel.appendChild(heading);

    for (const d of filtered) {
      const key = 'd/' + meeting + '/' + d.id;
      const row = document.createElement('div');
      row.className = 'decision-row' + (key === active ? ' active' : '');
      row.innerHTML = `
        <div class="row-id">${d.id}</div>
        <div class="row-body">
          <div class="row-title">${d.title}</div>
          ${d.bloc ? `<div class="row-meta">${badge('En bloc', 'badge-bloc')}</div>` : ''}
        </div>`;
      row.addEventListener('click', () =>
        navigateTo({ type: 'decision', meetingDate: meeting, decision: d }));
      listPanel.appendChild(row);
    }
  }

  if (!anyResults) {
    listPanel.innerHTML = '<div class="no-results">No decisions match your search.</div>';
  }
}

// ── Home link ─────────────────────────────────────────────────────────────────
// Handled here rather than left to the href so the nav stack and history stay
// in step with the URL.
document.getElementById('homeLink')?.addEventListener('click', (e) => {
  e.preventDefault();
  if (!navStack.length) return;
  history.pushState({ stack: [], depth: 0 }, '', '#/');
  applyStack([]);
  if (isMobile()) window.scrollTo(0, 0);
});

// ── Search ────────────────────────────────────────────────────────────────────
searchInput.addEventListener('input', () => {
  searchWrap.classList.toggle('has-value', searchInput.value.length > 0);
  renderList();
});
searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchWrap.classList.remove('has-value');
  searchInput.focus();
  renderList();
});

// ── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  const entries = stackFromHash(location.hash);
  // Anchor this entry so back/forward always have a base to return to.
  history.replaceState({ stack: entries, depth: 0 }, '', entries.length ? location.hash : '#/');
  applyStack(entries);
});
