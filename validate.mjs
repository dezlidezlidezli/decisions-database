import { readdirSync, readFileSync } from 'fs';
const base = '/Users/malakaiking/Documents/decisions-database/data/decisions/2026';
const load = p => JSON.parse(readFileSync(p, 'utf8').replace(/^export default /, '').replace(/;\s*$/, ''));
for (const mtg of readdirSync(base).filter(m => /^\d{4}-/.test(m))) {
  const meta = load(base + '/' + mtg + '/_meeting.js');
  console.log('=== ' + mtg + ': ' + meta.name + ' | ' + meta.date + ' | ' + (meta.minutesUrl || 'NO URL') + ' | ' + (meta.location || 'NO LOC') + ' | ' + (meta.duration || 'NO DURATION'));
  const blocs = {};
  for (const f of readdirSync(base + '/' + mtg).filter(f => f.endsWith('.js') && f !== '_meeting.js')) {
    const d = load(base + '/' + mtg + '/' + f);
    const missing = ['id','title','fullText','mover','seconder','status','minutesPage','type'].filter(k => !d[k]);
    if (missing.length) console.log('  ' + f + ' MISSING: ' + missing.join(','));
    if (d.bloc) { blocs[d.bloc] ||= []; blocs[d.bloc].push([d.id, d.mover, d.seconder, d.status].join('|')); }
    if (/Preamble [A-Z]/.test(d.fullText) || /Blocced motion\.?$/.test(d.fullText)) console.log('  ' + f + ' SUSPECT leftover text');
    (d.amendments || []).forEach((a, i) => { if (!a.mover) console.log('  ' + f + ' amendment ' + i + ' missing mover'); });
  }
  for (const [b, ms] of Object.entries(blocs)) {
    const sig = ms.map(m => m.split('|').slice(1).join('|'));
    if (new Set(sig).size > 1) console.log('  BLOC MISMATCH ' + b + ': ' + JSON.stringify(ms));
  }
}
console.log('validation done');
