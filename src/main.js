// src/main.js

// 1. Glob‑import all decision modules at build time
const modules = import.meta.glob('../data/decisions/*/*/*.js', { eager: true });
console.log('🔍 decision files found:', Object.keys(modules));

// 2. Build decisionsByMeeting: { [year]: { [meeting]: [decisions…] } }
const decisionsByMeeting = {};
for (const path of Object.keys(modules)) {
  const parts    = path.split('/');     // ["..","data","decisions","2025","2025-02-26","7.1.js"]
  const year     = parts[3];            // "2025"
  const meeting  = parts[4];            // "2025-02-26"
  const decision = modules[path].default;

  decisionsByMeeting[year]        ||= {};
  decisionsByMeeting[year][meeting] ||= [];
  decisionsByMeeting[year][meeting].push(decision);
}
console.log('📦 decisionsByMeeting:', decisionsByMeeting);

// 3. Grab UI elements
const cardsContainer   = document.getElementById('cardsContainer');
const searchInput      = document.getElementById('searchInput');
const typeFilter       = document.getElementById('typeFilter');
const statusFilter     = document.getElementById('statusFilter');
const detailModal      = document.getElementById('detailModal');
const modalClose       = document.getElementById('modalClose');
const detailTitle      = document.getElementById('detailTitle');
const detailSummary    = document.getElementById('detailSummary');
const detailMover      = document.getElementById('detailMover');
const detailSeconder   = document.getElementById('detailSeconder');
const detailType       = document.getElementById('detailType');
const detailStatus     = document.getElementById('detailStatus');
const detailMeeting    = document.getElementById('detailMeeting');
const detailFullText   = document.getElementById('detailFullText');
const detailAmendments = document.getElementById('detailAmendmentsList');

// 4. Render + Search + Filter
function renderCards() {
  const rawQuery = searchInput.value.trim().toLowerCase();
  const normalizedQuery = rawQuery.replace(/[-\W]+/g, ' ').trim();
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

  const typeVal   = typeFilter.value;
  const statusVal = statusFilter.value;

  cardsContainer.innerHTML = '';
  const allDecisions = Object.values(decisionsByMeeting)
    .flatMap(meetingsByYear => Object.values(meetingsByYear).flat());

  allDecisions
    .filter(d => {
      // build a haystack of all fields
      const haystack = [
        d.id, d.title, d.summary, d.preamble,
        d.mover, d.seconder, d.type, d.status,
        d.fullText,
        ...(d.amendments || []).map(a => a.text)
      ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .replace(/[-\W]+/g, ' ')
      .trim();

      const tokensMatch = tokens.every(tok => haystack.includes(tok));
      const typeMatch   = !typeVal   || d.type   === typeVal;
      const statusMatch = !statusVal || d.status === statusVal;

      return tokensMatch && typeMatch && statusMatch;
    })
    .forEach(d => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h3>${d.id}: ${d.title}</h3>
        ${d.summary ? `<p>${d.summary}</p>` : ''}
        <p class="card-meta">
          <strong>${d.type}</strong> |
          Status: <span class="${d.status.toLowerCase()}">${d.status}</span>
        </p>
      `;
      card.addEventListener('click', () => openDetail(d));
      cardsContainer.appendChild(card);
    });
}

// 5. Detail modal logic (with proper numbering of fullText)
function openDetail(d) {
    document.body.style.overflow = 'hidden';
  detailModal.style.display = 'flex';
  // 1. Populate the header fields
  detailTitle.textContent    = `${d.id}: ${d.title}`;
const summaryText = d.preamble || d.summary || '';
if (typeof summaryText === 'string' && summaryText.trim().length > 0) {
  const paragraphs = summaryText.split('\n');
  detailSummary.innerHTML = paragraphs
    .map(p => `<p>${p.trim()}</p>`)
    .join('');
} else {
  detailSummary.innerHTML = '<p><em>No summary available.</em></p>';
}
  detailMover.textContent    = d.mover;
  detailSeconder.textContent = d.seconder;
  detailType.textContent     = d.type;
  detailStatus.textContent   = d.status;
  detailMeeting.textContent  = d.meeting;

  // 2. Build and render a numbered list for fullText
  const container = document.getElementById('detailFullText');
  container.innerHTML = '';

  // Normalize the text
  const text = d.fullText.trim();

  // Split either on “1.”, “2.” etc., or double‑newlines
  const points = text
   .split(/^\d+\.\s*/gm)    // ^ = start of line, m = multiline
    .filter(Boolean)
    .map(s => s.trim());

  // If that gave you just one big chunk, fall back to paragraphs
  if (points.length === 1) {
    Object.assign(
      points,
      text
        .split(/\n{2,}/)
        .map(s => s.trim())
        .filter(Boolean)
    );
  }

  // Now render them as an <ol>
  const ol = document.createElement('ol');
  points.forEach(pt => {
    const li = document.createElement('li');
    li.textContent = pt;
    ol.appendChild(li);
  });
  container.appendChild(ol);

  // 3. Render amendments (status + badge)
detailAmendments.innerHTML = '';
(d.amendments || []).forEach(a => {
  const li = document.createElement('li');
  // Friendly/unfriendly badge on the left
  const typeBadge = document.createElement('span');
  typeBadge.className   = `amendment-type ${a.friendly ? 'friendly' : 'unfriendly'}`;
  typeBadge.textContent = a.friendly ? 'Friendly' : 'Unfriendly';
  li.appendChild(typeBadge);

  // amendment text
  li.append(document.createTextNode(a.text));

  // ✓/✗ status on the right
  const statusSpan = document.createElement('span');
  statusSpan.className   = `amendment-status ${a.passed ? 'passed' : 'failed'}`;
  statusSpan.textContent = a.passed ? '✓' : '✗';
  li.appendChild(statusSpan);

  detailAmendments.appendChild(li);
});

// 3a. Show or hide the Amendments heading entirely
const amendmentsLi = detailAmendments.parentElement; 
if (d.amendments && d.amendments.length > 0) {
  amendmentsLi.style.display = '';    // visible
} else {
  amendmentsLi.style.display = 'none'; // hide the whole <li><strong>Amendments:</strong>…
}

  // 4. Show the modal
  detailModal.style.display = 'flex';
}

function closeDetail() {
  detailModal.style.display = 'none';
  document.body.style.overflow = '';
}

// 6. Event wiring
modalClose.addEventListener('click', closeDetail);
window.addEventListener('click', e => { 
  if (e.target === detailModal) closeDetail();
});
searchInput.addEventListener('input', renderCards);
typeFilter.addEventListener('change', renderCards);
statusFilter.addEventListener('change', renderCards);

// 7. Initial render
window.addEventListener('load', renderCards);

// === Read-only Disclaimer Popup ===
(function () {
  const LS_KEY = 'disclaimerDismissed_v1';
  const modal = document.getElementById('readOnlyDisclaimerModal');
  const textEl = document.getElementById('roDisclaimerText');
  const closeX = document.getElementById('roDisclaimerClose');
  const okBtn  = document.getElementById('roDisclaimerOk');

  function openModal() {
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    okBtn.focus({ preventScroll: false });
  }
  function closeModal() {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }

  function initReadOnlyDisclaimer() {
    const text = document.body.getAttribute('data-disclaimer') || '';
    if (!text) return; // no disclaimer set in code
    textEl.textContent = text;

    const dismissed = localStorage.getItem(LS_KEY) === '1';
    if (!dismissed) openModal();

    // Close handlers
    closeX.addEventListener('click', closeModal);
    okBtn.addEventListener('click', () => {
      localStorage.setItem(LS_KEY, '1'); // persist user dismissal
      closeModal();
    });

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // ESC to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.style.display === 'flex') {
        closeModal();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReadOnlyDisclaimer);
  } else {
    initReadOnlyDisclaimer();
  }
})();