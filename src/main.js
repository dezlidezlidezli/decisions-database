// src/main.js

// 1. Glob‑import all decision modules at build time
const modules = import.meta.glob('../data/decisions/*/*/*.js', { eager: true });
console.log('🔍 Found module files:', Object.keys(modules));

// 2. Build your decisionsByMeeting lookup
const decisionsByMeeting = {};

for (const path of Object.keys(modules)) {
  // Option A:
  const parts   = path.split('/');
  const year    = parts[3];
  const meeting = parts[4];

  // Option B:
  // const trimmed = path.replace(/^\.\.\/data\/decisions\//, '');
  // const [year, meeting] = trimmed.split('/');

  const decision = modules[path].default;
  decisionsByMeeting[year]       ??= {};
  decisionsByMeeting[year][meeting] ??= [];
  decisionsByMeeting[year][meeting].push(decision);
}

console.log('📦 decisionsByMeeting:', decisionsByMeeting);

window.addEventListener('load', () => {
  console.log('✅ window.load fired');

  const year = new Date().getFullYear().toString();
  console.log('📅 Current year:', year);

  const meetings = decisionsByMeeting[year];
  console.log('📋 Meetings this year:', meetings);

  // Make sure this matches the id in your index.html
  const container = document.getElementById('cardsContainer');
  console.log('📌 cardsContainer element:', container);

  if (!container) {
    console.error('❌ No #cardsContainer found in DOM – check your index.html!');
    return;
  }

  // If there's nothing to render, log and bail
  if (!meetings) {
    console.warn(`⚠️ No meetings found for year ${year}`);
    return;
  }

  // Render each decision
  for (const [meeting, decisions] of Object.entries(meetings)) {
    console.log(`👉 Rendering meeting ${meeting}`, decisions);
    for (const d of decisions) {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h3>${d.id}: ${d.title}</h3>
        <p><strong>Mover:</strong> ${d.mover} &nbsp; <strong>Seconder:</strong> ${d.seconder}</p>
        <p>${d.fullText}</p>
      `;
      container.appendChild(card);
    }
  }
});
