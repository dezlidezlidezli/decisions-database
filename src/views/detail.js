import { meetingMeta, badge, marked } from '../data.js';

export function renderDetail(d, meetingDate, { onMeetingClick, onDecisionClick, decisions = [] }) {
  const meta = meetingMeta[meetingDate] || {};
  const blocSiblings = d.bloc ? decisions.filter(x => x.bloc === d.bloc && x.id !== d.id) : [];

  const fullTextHtml = d.fullText ? marked.parse(d.fullText) : '';
  const preambleHtml = d.preamble ? marked.parse(d.preamble) : '';

  const el = document.createElement('div');
  el.className = 'detail-content';
  el.innerHTML = `
    <div class="detail-header">
      <div class="detail-id">${d.id}</div>
      <div class="detail-title">${d.title}</div>
      ${blocSiblings.length ? `
      <div class="bloc-notice">
        Voted upon en bloc with ${blocSiblings.map(s => `<button class="bloc-link js-bloc-link" data-id="${s.id}">${s.id} ${s.title}</button>`).join(', ')}
      </div>` : ''}
    </div>

    ${d.contentWarning ? `
    <div class="content-warning" role="note">
      <span class="content-warning-label">Content warning</span>
      <span class="content-warning-text">${d.contentWarning}</span>
    </div>` : ''}

    <div class="detail-meta-grid">
      <div class="meta-item">
        <div class="meta-label">Meeting</div>
        <div class="meta-value"><button class="meeting-info-link js-meeting-link">${meta.name || meetingDate} ↗</button></div>
      </div>
      <div class="meta-item"><div class="meta-label">Mover</div><div class="meta-value">${d.mover || '—'}</div></div>
      <div class="meta-item"><div class="meta-label">Seconder</div><div class="meta-value">${d.seconder || '—'}</div></div>
      ${meta.minutesUrl && d.minutesPage ? `
      <div class="meta-item meta-item-full">
        <div class="meta-label">Source</div>
        <div class="meta-value">
          <a href="${meta.minutesUrl}#page=${d.minutesPage}" target="_blank" rel="noopener" class="minutes-page-link">
            View in official minutes — from p.${d.minutesPage} ↗
          </a>
        </div>
      </div>` : ''}
    </div>

    ${fullTextHtml ? `
    <div class="detail-section">
      <div class="detail-section-title">Resolution</div>
      <div class="markdown-body">${fullTextHtml}</div>
    </div>` : ''}

    ${preambleHtml ? `
    <details class="detail-section more-info">
      <summary class="detail-section-title">Preamble</summary>
      <div class="markdown-body">${preambleHtml}</div>
    </details>` : ''}

    `;

  el.querySelector('.js-meeting-link')?.addEventListener('click', () => onMeetingClick(meetingDate));
  el.querySelectorAll('.js-bloc-link').forEach(btn => {
    btn.addEventListener('click', () => {
      const sibling = decisions.find(x => x.id === btn.dataset.id);
      if (sibling) onDecisionClick(sibling, meetingDate);
    });
  });
  return el;
}
