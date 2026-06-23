import { meetingMeta, badge, statusClass } from '../data.js';

export function renderMeeting(meetingDate, decisions, { onDecisionClick }) {
  const meta = meetingMeta[meetingDate] || {};

  const total     = decisions.length;
  const passed    = decisions.filter(d => d.status === 'Passed').length;
  const failed    = decisions.filter(d => d.status === 'Failed').length;
  const withdrawn = decisions.filter(d => d.status === 'Withdrawn').length;
  const statLine  = [
    `${passed} passed`,
    failed    ? `${failed} failed`    : null,
    withdrawn ? `${withdrawn} withdrawn` : null,
  ].filter(Boolean).join(', ');

  const el = document.createElement('div');
  el.className = 'detail-content';
  el.innerHTML = `
    <div class="detail-header">
      <div class="detail-id" style="text-transform:none;letter-spacing:0">Meeting</div>
      <div class="detail-title">${meta.name || meetingDate}</div>
    </div>

    <div class="detail-meta-grid" style="grid-template-columns:1fr 1fr 1fr">
      <div class="meta-item"><div class="meta-label">Date</div><div class="meta-value">${meta.date || '—'}</div></div>
      <div class="meta-item"><div class="meta-label">Location</div><div class="meta-value">${meta.location || '—'}</div></div>
      <div class="meta-item"><div class="meta-label">Duration</div><div class="meta-value">${meta.duration || '—'}</div></div>
    </div>

    ${meta.minutesUrl ? `
    <div class="detail-section" style="padding:.75rem 1.25rem">
      <a href="${meta.minutesUrl}" target="_blank" rel="noopener" class="minutes-link" style="font-size:.875rem">
        View official minutes ↗
      </a>
    </div>` : ''}

    <div class="detail-section">
      <div class="detail-section-title">Motions (${total} total — ${statLine})</div>
      <div class="meeting-motions-list">
        ${decisions.map(d => `
          <div class="meeting-motion-row js-motion-row" data-id="${d.id}" data-meeting="${meetingDate}">
            <span class="row-id" style="min-width:40px;font-size:.7rem;color:#999;font-weight:600">${d.id}</span>
            <span style="flex:1;font-size:.875rem;color:#333">${d.title}</span>
            ${badge(d.status, statusClass(d.status))}
          </div>`).join('')}
      </div>
    </div>`;

  el.querySelectorAll('.js-motion-row').forEach(row => {
    row.addEventListener('click', () => {
      const d = decisions.find(x => x.id === row.dataset.id);
      if (d) onDecisionClick(d, row.dataset.meeting);
    });
  });

  return el;
}
