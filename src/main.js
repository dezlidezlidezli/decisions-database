const modules = import.meta.glob('../data/decisions/*/*/*.js', { eager: true });

// Build { year: { meeting: [decisions] } }
const decisionsByMeeting = {};
for (const path of Object.keys(modules)) {
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

let activeId = null;

function allDecisionsByMeeting() {
  // Returns [ { meeting, decisions[] } ] sorted by meeting date desc
  const entries = [];
  for (const year of Object.keys(decisionsByMeeting).sort().reverse()) {
    for (const meeting of Object.keys(decisionsByMeeting[year]).sort().reverse()) {
      entries.push({ meeting, decisions: decisionsByMeeting[year][meeting] });
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
    heading.textContent = meeting;
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
        renderDetail(d);
      });
      listPanel.appendChild(row);
    }
  }

  if (!anyResults) {
    listPanel.innerHTML = '<div class="no-results">No decisions match your filters.</div>';
  }
}

function renderDetail(d) {
  // Preamble/summary paragraphs
  const preambleText = d.preamble || d.summary || '';
  const preambleHtml = preambleText.trim()
    ? preambleText.split('\n').map(p => p.trim() ? `<p>${p.trim()}</p>` : '').join('')
    : '';

  // Full text as numbered list
  const text = (d.fullText || '').trim();
  const points = text.split(/^\d+\.\s*/gm).filter(Boolean).map(s => s.trim());
  const listItems = (points.length > 1 ? points : text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean))
    .map(pt => `<li>${pt}</li>`).join('');

  // Amendments
  const amendmentsHtml = (d.amendments || []).map(a => `
    <li class="amendment-item">
      <span class="badge ${a.friendly ? 'badge-friendly' : 'badge-unfriendly'}">${a.friendly ? 'Friendly' : 'Unfriendly'}</span>
      <span class="amendment-text">${a.text}</span>
      <span class="amendment-result ${a.passed ? 'passed' : 'failed'}">${a.passed ? '✓ Passed' : '✗ Failed'}</span>
    </li>`).join('');

  detailPanel.innerHTML = `
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
        <div class="meta-item"><div class="meta-label">Meeting</div><div class="meta-value">${d.meeting}</div></div>
        <div class="meta-item"><div class="meta-label">Mover</div><div class="meta-value">${d.mover || '—'}</div></div>
        <div class="meta-item"><div class="meta-label">Seconder</div><div class="meta-value">${d.seconder || '—'}</div></div>
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

window.addEventListener('load', renderList);

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
