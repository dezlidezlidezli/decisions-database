import { allGroups, meetingMeta, badge, statusClass } from './data.js';
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
const typeFilter   = document.getElementById('typeFilter');
const statusFilter = document.getElementById('statusFilter');

// ── Navigation state ──────────────────────────────────────────────────────────
// Stack entries: { type: 'meeting'|'decision', meetingDate, decision? }
let navStack = [];

const currentView = () => navStack[navStack.length - 1] ?? null;
const isMobile    = () => window.innerWidth <= 640;

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
// Pop the stack: if something remains below, re-render that view; else show list.
backBtn.addEventListener('click', () => {
  navStack.pop();
  const prev = currentView();
  if (prev) {
    _paint(prev);
    renderList();
  } else {
    detailBody.innerHTML = '<div class="detail-empty">Select a decision to view details</div>';
    renderList();
  }
  syncPanels();
  if (isMobile()) window.scrollTo(0, 0);
});

// ── Navigation ────────────────────────────────────────────────────────────────
function navigateTo(view) {
  navStack.push(view);
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
function filterDecisions(decisions) {
  const raw    = searchInput.value.trim().toLowerCase();
  const tokens = raw.replace(/[-\W]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const typeVal    = typeFilter.value;
  const statusVal  = statusFilter.value;

  return decisions.filter(d => {
    if (typeVal   && d.type   !== typeVal)   return false;
    if (statusVal && d.status !== statusVal) return false;
    if (!tokens.length) return true;
    const hay = ' ' + [d.id, d.title, d.preamble, d.mover, d.seconder, d.fullText,
      ...(d.amendments || []).map(a => a.text)]
      .filter(Boolean).join(' ').toLowerCase().replace(/[-\W]+/g, ' ') + ' ';
    // Whole-word match for each term; the last term may be a prefix
    // (so results narrow sensibly while typing).
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
  let anyResults = false;

  for (const { meeting, decisions } of groups) {
    const filtered = filterDecisions(decisions);
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
          <div class="row-meta">
            ${badge(d.type, 'badge-type')}
            ${badge(d.status, statusClass(d.status))}
            ${d.bloc ? badge('En bloc', 'badge-bloc') : ''}
          </div>
        </div>`;
      row.addEventListener('click', () =>
        navigateTo({ type: 'decision', meetingDate: meeting, decision: d }));
      listPanel.appendChild(row);
    }
  }

  if (!anyResults) {
    listPanel.innerHTML = '<div class="no-results">No decisions match your filters.</div>';
  }
}

// ── Filters ───────────────────────────────────────────────────────────────────
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
typeFilter.addEventListener('change',   renderList);
statusFilter.addEventListener('change', renderList);

// ── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  syncPanels();
  renderList();
});
