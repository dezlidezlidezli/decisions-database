import { meetingMeta, badge, statusClass, marked } from '../data.js';

export function renderDetail(d, meetingDate, { onMeetingClick }) {
  const meta = meetingMeta[meetingDate] || {};

  const preambleHtml     = d.preamble  ? marked.parse(d.preamble)  : '';
  const fullTextHtml     = d.fullText   ? marked.parse(d.fullText)   : '';

  const amendmentsHtml = (d.amendments || []).map(a => {
    const aFullText = a.fullText
      ? `<div class="amendment-full-text markdown-body">${marked.parse(a.fullText)}</div>` : '';
    const movers = [a.mover, a.seconder].filter(Boolean).join(' / ');
    return `
    <li class="amendment-item">
      <div class="amendment-main">
        <div class="amendment-top">
          <span class="badge ${a.friendly ? 'badge-friendly' : 'badge-unfriendly'}">${a.friendly ? 'Friendly' : 'Unfriendly'}</span>
          <span class="amendment-text">${a.text}</span>
          <span class="amendment-result ${a.passed ? 'passed' : 'failed'}">${a.passed ? '✓ Passed' : '✗ Failed'}</span>
        </div>
        ${aFullText}
        ${movers ? `<div class="amendment-movers">${movers}</div>` : ''}
      </div>
    </li>`;
  }).join('');

  const el = document.createElement('div');
  el.className = 'detail-content';
  el.innerHTML = `
    <div class="detail-header">
      <div class="detail-id">${d.id}</div>
      <div class="detail-title">${d.title}</div>
      <div class="detail-badges">
        ${badge(d.type, 'badge-type')}
        ${badge(d.status, statusClass(d.status))}
      </div>
    </div>

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

    ${preambleHtml ? `
    <div class="detail-section">
      <div class="detail-section-title">Background</div>
      <div class="markdown-body">${preambleHtml}</div>
    </div>` : ''}

    ${fullTextHtml ? `
    <div class="detail-section">
      <div class="detail-section-title">Action</div>
      <div class="markdown-body">${fullTextHtml}</div>
    </div>` : ''}

    ${amendmentsHtml ? `
    <div class="detail-section">
      <div class="detail-section-title">Amendments</div>
      <ul class="amendments-list">${amendmentsHtml}</ul>
    </div>` : ''}

    `;

  el.querySelector('.js-meeting-link')?.addEventListener('click', () => onMeetingClick(meetingDate));
  return el;
}
