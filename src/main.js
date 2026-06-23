import { marked } from 'marked';

marked.setOptions({ breaks: true });

const modules = import.meta.glob('../data/decisions/*/*/*.js', { eager: true });
const meetingModules = import.meta.glob('../data/decisions/*/*/_meeting.js', { eager: true });

// Build meetingMeta: { "2025-02-26": { name, date, location, duration, minutesUrl } }
const meetingMeta = {};
for (const [path, mod] of Object.entries(meetingModules)) {
  const parts = path.split('/');
  const meetingDate = parts[4];
  meetingMeta[meetingDate] = mod.default;
}

// Build { year: { meeting: [decisions] } } — skip _meeting.js files
const decisionsByMeeting = {};
for (const path of Object.keys(modules)) {
  if (path.includes('/_meeting.js')) continue;
  const parts = path.split('/');
  const year = parts[3];
  const meeting = parts[4];
  const decision = modules[path].default;
  decisionsByMeeting[year] ||= {};
  decisionsByMeeting[year][meeting] ||= [];
  decisionsByMeeting[year][meeting].push(decision);
}

const listPanel    = document.getElementById('listPanel');
const detailPanel  = document.getElementById('detailPanel');
const searchInput  = document.getElementById('searchInput');
const typeFilter   = document.getElementById('typeFilter');
const statusFilter = document.getElementById('statusFilter');
const backBtn      = document.getElementById('backBtn');
const detailBody   = document.getElementById('detailBody');

// activeKey: null | "m/DATE" (meeting view) | "d/DATE/ID" (decision view)
let activeKey = null;

const isMobile = () => window.innerWidth <= 640;

function showDetail() {
  syncPanelVisibility();
  if (isMobile()) window.scrollTo(0, 0);
}

backBtn.addEventListener('click', () => {
  activeKey = null;
  detailBody.innerHTML = '<div class="detail-empty">Select a decision to view details</div>';
  renderList();
  syncPanelVisibility();
});

function allDecisionsByMeeting() {
  const entries = [];
  for (const year of Object.keys(decisionsByMeeting).sort().reverse()) {
    for (const meeting of Object.keys(decisionsByMeeting[year]).sort().reverse()) {
      const sorted = [...decisionsByMeeting[year][meeting]].sort((a, b) => {
        const parts = id => id.split('.').map(Number);
        const [am, an] = parts(a.id);
        const [bm, bn] = parts(b.id);
        return am !== bm ? am - bm : an - bn;
      });
      entries.push({ meeting, decisions: sorted });
    }
  }
  return entries;
}

function filterDecisions(decisions) {
  const raw = searchInput.value.trim().toLowerCase();
  const tokens = raw.replace(/[-\W]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const typeVal   = typeFilter.value;
  const statusVal = statusFilter.value;

  return decisions.filter(d => {
    const haystack = [d.id, d.title, d.preamble, d.mover, d.seconder, d.fullText,
      ...(d.amendments || []).map(a => a.text)]
      .filter(Boolean).join(' ').toLowerCase().replace(/[-\W]+/g, ' ');
    return tokens.every(t => haystack.includes(t))
      && (!typeVal   || d.type   === typeVal)
      && (!statusVal || d.status === statusVal);
  });
}

function badge(text, cls) {
  return `<span class="badge ${cls}">${text}</span>`;
}

function statusBadgeClass(status) {
  if (status === 'Passed')    return 'badge-passed';
  if (status === 'Withdrawn') return 'badge-withdrawn';
  return 'badge-failed';
}

function renderList() {
  listPanel.innerHTML = '';
  const groups = allDecisionsByMeeting();
  let anyResults = false;

  for (const { meeting, decisions } of groups) {
    const filtered = filterDecisions(decisions);
    if (!filtered.length) continue;
    anyResults = true;

    const meta = meetingMeta[meeting];
    const meetingKey = 'm/' + meeting;

    const heading = document.createElement('div');
    heading.className = 'meeting-heading' + (activeKey === meetingKey ? ' active' : '');
    heading.innerHTML = `<span class="meeting-heading-name">${meta ? meta.name : meeting}</span><span class="meeting-heading-arrow">›</span>`;
    heading.addEventListener('click', () => {
      activeKey = meetingKey;
      renderList();
      renderMeetingDetail(meeting);
      showDetail();
    });
    listPanel.appendChild(heading);

    for (const d of filtered) {
      const key = 'd/' + meeting + '/' + d.id;
      const row = document.createElement('div');
      row.className = 'decision-row' + (key === activeKey ? ' active' : '');
      row.innerHTML = `
        <div class="row-id">${d.id}</div>
        <div class="row-body">
          <div class="row-title">${d.title}</div>
          <div class="row-meta">
            ${badge(d.type, 'badge-type')}
            ${badge(d.status, statusBadgeClass(d.status))}
          </div>
        </div>`;
      row.addEventListener('click', () => {
        activeKey = key;
        renderList();
        renderDetail(d, meeting);
        showDetail();
      });
      listPanel.appendChild(row);
    }
  }

  if (!anyResults) {
    listPanel.innerHTML = '<div class="no-results">No decisions match your filters.</div>';
  }
}

function renderMeetingDetail(meetingDate) {
  const meta = meetingMeta[meetingDate] || {};
  const decisions = allDecisionsByMeeting().find(g => g.meeting === meetingDate)?.decisions || [];

  const statsTotal = decisions.length;
  const statsPassed = decisions.filter(d => d.status === 'Passed').length;
  const statsFailed = decisions.filter(d => d.status === 'Failed').length;
  const statsWithdrawn = decisions.filter(d => d.status === 'Withdrawn').length;

  const motionRows = decisions.map(d => `
    <div class="meeting-motion-row" data-key="d/${meetingDate}/${d.id}">
      <span class="row-id" style="min-width:40px;font-size:.7rem;color:#999;font-weight:600">${d.id}</span>
      <span style="flex:1;font-size:.875rem;color:#333">${d.title}</span>
      ${badge(d.status, statusBadgeClass(d.status))}
    </div>`).join('');

  detailBody.innerHTML = `
    <div class="detail-content">
      <div class="detail-header">
        <div class="detail-id" style="text-transform:none;letter-spacing:0">Meeting</div>
        <div class="detail-title">${meta.name || meetingDate}</div>
      </div>

      <div class="detail-meta-grid" style="grid-template-columns:1fr 1fr 1fr">
        <div class="meta-item">
          <div class="meta-label">Date</div>
          <div class="meta-value">${meta.date || '—'}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Location</div>
          <div class="meta-value">${meta.location || '—'}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Duration</div>
          <div class="meta-value">${meta.duration || '—'}</div>
        </div>
      </div>

      ${meta.minutesUrl ? `
      <div class="detail-section" style="padding:.75rem 1.25rem">
        <a href="${meta.minutesUrl}" target="_blank" rel="noopener" class="minutes-link" style="font-size:.875rem">
          View official minutes ↗
        </a>
      </div>` : ''}

      <div class="detail-section">
        <div class="detail-section-title">Motions (${statsTotal} total — ${statsPassed} passed, ${statsFailed} failed${statsWithdrawn ? `, ${statsWithdrawn} withdrawn` : ''})</div>
        <div class="meeting-motions-list">${motionRows}</div>
      </div>
    </div>`;

  // Wire up motion rows to open their detail
  detailBody.querySelectorAll('.meeting-motion-row').forEach(row => {
    row.addEventListener('click', () => {
      const key = row.dataset.key;
      const [, date, id] = key.split('/');
      const allGroups = allDecisionsByMeeting();
      const group = allGroups.find(g => g.meeting === date);
      const d = group?.decisions.find(x => x.id === id);
      if (!d) return;
      activeKey = key;
      renderList();
      renderDetail(d, date);
    });
  });
}

function renderDetail(d, meetingDate) {
  const meta = meetingMeta[meetingDate] || {};

  const preambleHtml     = d.preamble  ? marked.parse(d.preamble)  : '';
  const fullTextHtmlContent = d.fullText ? marked.parse(d.fullText) : '';

  const meetingInfoBtn = `<button class="meeting-info-link" data-meeting="${meetingDate}">${meta.name || meetingDate} ↗</button>`;

  const amendmentsHtml = (d.amendments || []).map(a => {
    const fullTextHtml = a.fullText
      ? `<div class="amendment-full-text markdown-body">${marked.parse(a.fullText)}</div>` : '';
    const movers = [a.mover, a.seconder].filter(Boolean).join(' / ');
    const moversHtml = movers ? `<div class="amendment-movers">${movers}</div>` : '';
    return `
    <li class="amendment-item">
      <div class="amendment-main">
        <div class="amendment-top">
          <span class="badge ${a.friendly ? 'badge-friendly' : 'badge-unfriendly'}">${a.friendly ? 'Friendly' : 'Unfriendly'}</span>
          <span class="amendment-text">${a.text}</span>
          <span class="amendment-result ${a.passed ? 'passed' : 'failed'}">${a.passed ? '✓ Passed' : '✗ Failed'}</span>
        </div>
        ${fullTextHtml}
        ${moversHtml}
      </div>
    </li>`;
  }).join('');

  detailBody.innerHTML = `
    <div class="detail-content">
      <div class="detail-header">
        <div class="detail-id">${d.id}</div>
        <div class="detail-title">${d.title}</div>
        <div class="detail-badges">
          ${badge(d.type, 'badge-type')}
          ${badge(d.status, statusBadgeClass(d.status))}
        </div>
      </div>

      <div class="detail-meta-grid">
        <div class="meta-item">
          <div class="meta-label">Meeting</div>
          <div class="meta-value">${meetingInfoBtn}</div>
        </div>
        <div class="meta-item"><div class="meta-label">Mover</div><div class="meta-value">${d.mover || '—'}</div></div>
        <div class="meta-item"><div class="meta-label">Seconder</div><div class="meta-value">${d.seconder || '—'}</div></div>
      </div>

      ${preambleHtml ? `
      <div class="detail-section">
        <div class="detail-section-title">Background</div>
        <div class="markdown-body">${preambleHtml}</div>
      </div>` : ''}

      ${fullTextHtmlContent ? `
      <div class="detail-section">
        <div class="detail-section-title">Action</div>
        <div class="markdown-body">${fullTextHtmlContent}</div>
      </div>` : ''}

      ${amendmentsHtml ? `
      <div class="detail-section">
        <div class="detail-section-title">Amendments</div>
        <ul class="amendments-list">${amendmentsHtml}</ul>
      </div>` : ''}
    </div>`;

  detailBody.querySelectorAll('.meeting-info-link').forEach(btn => {
    btn.addEventListener('click', () => {
      const date = btn.dataset.meeting;
      activeKey = 'm/' + date;
      renderList();
      renderMeetingDetail(date);
    });
  });
}

searchInput.addEventListener('input', renderList);
typeFilter.addEventListener('change', renderList);
statusFilter.addEventListener('change', renderList);

function syncPanelVisibility() {
  if (isMobile()) {
    if (activeKey) {
      listPanel.classList.add('mobile-hidden');
      detailPanel.classList.remove('mobile-hidden');
    } else {
      listPanel.classList.remove('mobile-hidden');
      detailPanel.classList.add('mobile-hidden');
    }
  } else {
    listPanel.classList.remove('mobile-hidden');
    detailPanel.classList.remove('mobile-hidden');
  }
}

window.addEventListener('resize', syncPanelVisibility);

window.addEventListener('load', () => {
  syncPanelVisibility();
  renderList();
});
