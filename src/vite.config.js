// src/main.js

// 1. Build‑time “import everything”
const modules = import.meta.glob('../data/decisions/*/*/*.js', { eager: true });

// 2. Organize into { year: { meeting: [decisions…] } }
const decisionsByMeeting = {};

for (const path of Object.keys(modules)) {
  // path → "../data/decisions/2025/2025-02-26/7.1.js"
  const parts = path.split('/');
  const year    = parts[2];
  const meeting = parts[3];
  const decision = modules[path].default;

  decisionsByMeeting[year]     ??= {};
  decisionsByMeeting[year][meeting] ??= [];
  decisionsByMeeting[year][meeting].push(decision);
}

// 3. On page load, render today’s year
window.addEventListener('load', () => {
  const year      = new Date().getFullYear().toString();
  const container = document.getElementById('decisions');
  const meetings  = decisionsByMeeting[year] || {};

  for (const [meeting, decisions] of Object.entries(meetings)) {
    for (const d of decisions) {
      // your “make a card” logic; e.g.:
      const card = document.createElement('div');
      card.className = 'decision-card';
      card.innerHTML = `
        <h3>${d.id}: ${d.title}</h3>
        <p><strong>Mover:</strong> ${d.mover} &nbsp; <strong>Seconder:</strong> ${d.seconder}</p>
        <p>${d.fullText}</p>
      `;
      container.appendChild(card);
    }
  }
});
