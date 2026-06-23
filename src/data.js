import { marked } from 'marked';
marked.setOptions({ breaks: true });

const modules = import.meta.glob('../data/decisions/*/*/*.js', { eager: true });
const meetingModules = import.meta.glob('../data/decisions/*/*/_meeting.js', { eager: true });

// { "2025-02-26": { name, date, location, duration, minutesUrl } }
export const meetingMeta = {};
for (const [path, mod] of Object.entries(meetingModules)) {
  const meetingDate = path.split('/')[4];
  meetingMeta[meetingDate] = mod.default;
}

// { year: { meetingDate: [decisions] } }
const _byMeeting = {};
for (const [path, mod] of Object.entries(modules)) {
  if (path.includes('/_meeting.js')) continue;
  const parts = path.split('/');
  const year = parts[3];
  const meeting = parts[4];
  _byMeeting[year] ||= {};
  _byMeeting[year][meeting] ||= [];
  _byMeeting[year][meeting].push(mod.default);
}

// Returns [{ meeting, decisions[] }] sorted newest-first
export function allGroups() {
  const entries = [];
  for (const year of Object.keys(_byMeeting).sort().reverse()) {
    for (const meeting of Object.keys(_byMeeting[year]).sort().reverse()) {
      const sorted = [..._byMeeting[year][meeting]].sort((a, b) => {
        const p = id => id.split('.').map(Number);
        const [am, an] = p(a.id);
        const [bm, bn] = p(b.id);
        return am !== bm ? am - bm : an - bn;
      });
      entries.push({ meeting, decisions: sorted });
    }
  }
  return entries;
}

export function badge(text, cls) {
  return `<span class="badge ${cls}">${text}</span>`;
}

export function statusClass(status) {
  if (status === 'Passed')    return 'badge-passed';
  if (status === 'Withdrawn') return 'badge-withdrawn';
  return 'badge-failed';
}

export { marked };
