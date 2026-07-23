import { meetingMeta, badge, statusClass, marked } from '../data.js';

export function renderDetail(d, meetingDate, { onMeetingClick, onDecisionClick, decisions = [] }) {
  const meta = meetingMeta[meetingDate] || {};
  const blocSiblings = d.bloc ? decisions.filter(x => x.bloc === d.bloc && x.id !== d.id) : [];

  const preambleHtml         = d.preamble         ? marked.parse(d.preamble)         : '';
  const fullTextHtml         = d.fullText         ? marked.parse(d.fullText)         : '';
  const originalTextHtml     = d.originalText     ? marked.parse(d.originalText)     : '';
  const originalPreambleHtml = d.originalPreamble ? marked.parse(d.originalPreamble) : '';

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
      ${blocSiblings.length ? `
      <div class="bloc-notice">
        Voted en bloc with ${blocSiblings.map(s => `<button class="bloc-link js-bloc-link" data-id="${s.id}">${s.id} ${s.title}</button>`).join(', ')}
      </div>` : ''}
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
      <div class="detail-section-title">${d.originalPreamble ? 'Background as amended' : 'Background'}</div>
      <div class="markdown-body">${preambleHtml}</div>
    </div>` : ''}

    ${fullTextHtml ? `
    <div class="detail-section">
      <div class="detail-section-title">${d.originalText ? 'Proposal as amended' : 'Proposal'}</div>
      <div class="markdown-body">${fullTextHtml}</div>
    </div>` : ''}

    ${(originalPreambleHtml || originalTextHtml || amendmentsHtml) ? `
    <details class="detail-section more-info">
      <summary class="detail-section-title">More info: original proposal &amp; amendments</summary>
      ${originalPreambleHtml ? `
      <div class="more-info-sub">
        <div class="detail-section-title">Background as originally moved</div>
        <div class="markdown-body">${originalPreambleHtml}</div>
      </div>` : ''}
      ${originalTextHtml ? `
      <div class="more-info-sub">
        <div class="detail-section-title">Proposal as originally moved</div>
        <div class="markdown-body">${originalTextHtml}</div>
      </div>` : ''}
      ${amendmentsHtml ? `
      <div class="more-info-sub">
        <div class="detail-section-title">Amendments</div>
        <ul class="amendments-list">${amendmentsHtml}</ul>
      </div>` : ''}
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
