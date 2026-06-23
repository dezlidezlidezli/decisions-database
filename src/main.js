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

let activeId = null;

const isMobile = () => window.innerWidth <= 640;

function showDetail() {
  syncPanelVisibility();
  if (isMobile()) window.scrollTo(0, 0);
}

function showList() {
  syncPanelVisibility();
}

backBtn.addEventListener('click', () => {
  activeId = null;
  renderList();
  showList();
});

function allDecisionsByMeeting() {
  // Returns [ { meeting, decisions[] } ] sorted by meeting date desc
  const entries = [];
  for (const year of Object.keys(decisionsByMeeting).sort().reverse()) {
    for (const meeting of Object.keys(decisionsByMeeting[year]).sort().reverse()) {
        const sorted = [...decisionsByMeeting[year][meeting]].sort((a, b) => {
        const parts = id => id.split('-').pop().split('.').map(Number);
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
    const haystack = [d.id, d.title, d.summary, d.preamble, d.mover, d.seconder, d.fullText,
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

function renderList() {
  listPanel.innerHTML = '';
  const groups = allDecisionsByMeeting();
  let anyResults = false;

  for (const { meeting, decisions } of groups) {
    const filtered = filterDecisions(decisions);
    if (!filtered.length) continue;
    anyResults = true;

    const heading = document.createElement('div');
    heading.className = 'meeting-heading';
    const meta = meetingMeta[meeting];
    heading.textContent = meta ? `${meta.name} — ${meta.date}` : meeting;
    listPanel.appendChild(heading);

    for (const d of filtered) {
      const row = document.createElement('div');
      row.className = 'decision-row' + (d.id === activeId ? ' active' : '');
      row.dataset.id = d.id;
      row.innerHTML = `
        <div class="row-id">${d.id.split('-').pop()}</div>
        <div class="row-body">
          <div class="row-title">${d.title}</div>
          <div class="row-meta">
            ${badge(d.type, 'badge-type')}
            ${badge(d.status, d.status === 'Passed' ? 'badge-passed' : 'badge-failed')}
          </div>
        </div>`;
      row.addEventListener('click', () => {
        activeId = d.id;
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

function renderDetail(d, meetingDate) {
  const meta = meetingMeta[meetingDate] || {};

  // Preamble paragraphs
  const preambleText = d.preamble || '';
  const preambleHtml = preambleText.trim()
    ? preambleText.split('\n').map(p => p.trim() ? `<p>${p.trim()}</p>` : '').join('')
    : '';

  // Full text as numbered list
  const text = (d.fullText || '').trim();
  const points = text.split(/^\d+\.\s*/gm).filter(Boolean).map(s => s.trim());
  const listItems = (points.length > 1 ? points : text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean))
    .map(pt => `<li>${pt}</li>`).join('');

  // Meeting meta row
  const meetingLabel = meta.name ? `${meta.name}${meta.date ? ` — ${meta.date}` : ''}` : (meetingDate || '—');
  const minutesLink = meta.minutesUrl
    ? `<a href="${meta.minutesUrl}" target="_blank" rel="noopener" class="minutes-link">View minutes ↗</a>`
    : '';

  // Amendments
  const amendmentsHtml = (d.amendments || []).map(a => {
    const fullTextHtml = a.fullText
      ? `<div class="amendment-full-text">${a.fullText}</div>` : '';
    const movers = [a.mover, a.seconder].filter(Boolean).join(' / ');
    const moversHtml = movers
      ? `<div class="amendment-movers">${movers}</div>` : '';
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
          ${badge(d.status, d.status === 'Passed' ? 'badge-passed' : 'badge-failed')}
        </div>
      </div>

      <div class="detail-meta-grid">
        <div class="meta-item">
          <div class="meta-label">Meeting</div>
          <div class="meta-value">${meetingLabel}${minutesLink ? `<br>${minutesLink}` : ''}</div>
        </div>
        <div class="meta-item"><div class="meta-label">Mover</div><div class="meta-value">${d.mover || '—'}</div></div>
        <div class="meta-item"><div class="meta-label">Seconder</div><div class="meta-value">${d.seconder || '—'}</div></div>
        ${meta.location ? `<div class="meta-item"><div class="meta-label">Location</div><div class="meta-value">${meta.location}</div></div>` : ''}
        ${meta.duration ? `<div class="meta-item"><div class="meta-label">Duration</div><div class="meta-value">${meta.duration}</div></div>` : ''}
      </div>

      ${preambleHtml ? `
      <div class="detail-section">
        <div class="detail-section-title">Background</div>
        <div class="detail-preamble">${preambleHtml}</div>
      </div>` : ''}

      ${listItems ? `
      <div class="detail-section">
        <div class="detail-section-title">Action</div>
        <ol class="full-text-list">${listItems}</ol>
      </div>` : ''}

      ${amendmentsHtml ? `
      <div class="detail-section">
        <div class="detail-section-title">Amendments</div>
        <ul class="amendments-list">${amendmentsHtml}</ul>
      </div>` : ''}
    </div>`;
}

searchInput.addEventListener('input', renderList);
typeFilter.addEventListener('change', renderList);
statusFilter.addEventListener('change', renderList);

function syncPanelVisibility() {
  if (isMobile()) {
    if (activeId) {
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

// Disclaimer
(function () {
  const LS_KEY = 'disclaimerDismissed_v1';
  const modal  = document.getElementById('readOnlyDisclaimerModal');
  const textEl = document.getElementById('roDisclaimerText');
  const closeX = document.getElementById('roDisclaimerClose');
  const okBtn  = document.getElementById('roDisclaimerOk');

  const text = document.body.getAttribute('data-disclaimer') || '';
  if (!text) return;
  textEl.textContent = text;

  function open()  { modal.style.display = 'flex'; modal.setAttribute('aria-hidden', 'false'); }
  function close() { modal.style.display = 'none'; modal.setAttribute('aria-hidden', 'true'); }

  if (localStorage.getItem(LS_KEY) !== '1') open();

  closeX.addEventListener('click', close);
  okBtn.addEventListener('click', () => { localStorage.setItem(LS_KEY, '1'); close(); });
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.style.display === 'flex') close(); });
})();
