# ANUSA SRC Decisions Register

A searchable public register of motions passed by the ANUSA Student
Representative Council.

**Live:** https://dezlidezlidezli.github.io/decisions-database/

## Scope

The register records **motions the SRC passed**, in their amended form where
applicable. It deliberately does not include:

- unsuccessful motions (failed, lapsed, withdrawn);
- the amendment process, or debate;
- decisions of other ANUSA bodies — the Executive, General Meetings,
  Departments, Clubs Committee. It is therefore **not** a record of all ANUSA
  policy.

The official minutes are the authoritative record. Every entry links to the
page it came from, and the site says so in its disclaimer.

## Running it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build -> dist/
```

Node 20+ (CI pins 20). `dist/` is generated and not tracked.

## Layout

```
index.html                     page shell, all CSS
src/main.js                    routing, list rendering, search
src/data.js                    loads data/ via import.meta.glob
src/views/detail.js            single decision
src/views/meeting.js           meeting summary
data/decisions/<year>/<date>/  one file per motion, plus _meeting.js
tools/minutes-converter.html   minutes -> data files (open directly in a browser)
assets/anusa-logo.png          ANUSA wordmark, inlined at build time
```

## Data model

Each motion is one file, `data/decisions/<year>/<YYYY-MM-DD>/<id>.js`:

```js
export default {
  "id": "7.5",                  // as numbered in the minutes
  "title": "…",
  "contentWarning": "…",        // optional — see below
  "preamble": "…",              // markdown; may be "" if the motion has none
  "fullText": "…",              // markdown; the resolution AS PASSED
  "mover": "…",
  "seconder": "…",
  "minutesPage": 12,            // page in the linked PDF
  "type": "Motion",
  "status": "Passed",           // always Passed; the register holds nothing else
  "bloc": "bloc-7.3-7.4-7.5"    // optional — see below
};
```

And one `_meeting.js` per meeting:

```js
export default {
  "name": "SRC 4, 2026",
  "date": "2026-05-13",
  "location": "Marie Reay 5.02 and Zoom",
  "duration": "6:15 pm – 8:32 pm",
  "minutesUrl": "https://anusa.com.au/…/Minutes-ANUSA-SRC-4-2026-1-1.pdf"
};
```

Nothing needs registering — `src/data.js` globs the directory, and meetings sort
newest-first by folder date.

## Conventions

These are load-bearing. Breaking them produces output that looks fine locally
and is wrong in public.

**Record the text as passed.** Where an amendment altered a motion, store the
amended wording — not what was originally moved. The amendment itself is not
recorded.

**Content warnings go in `contentWarning`, never left inside the preamble.**
The preamble renders collapsed behind a disclosure, so a warning left in it
would sit behind a click. The field renders in a callout under the title.
Strip only the warning; definitional notes that happen to sit alongside it
(abbreviations, terminology definitions) belong in the preamble.

**Sub-points must be real nested markdown lists, indented in steps of four.**
Write every level as `1.` and let CSS supply the markers — level 1 renders
`1.`, level 2 `a.`, level 3 `i.`, level 4 `1.`, matching the minutes. Three-space
steps put a child on its parent's content column and nesting silently stops at
the third level.

```
1. Top-level action point
    1. renders as "a."
        1. renders as "i."
```

**`bloc` links motions voted upon together.** Give every member the same
string; the detail view lists the others automatically. Members share mover,
seconder and outcome.

**Transcribe verbatim.** Source typos stay (`wellbelling`, `responce`,
`Harrassment` in a title). Bare URLs stay full-length. The register must not
diverge from the minutes it links to.

## Adding a meeting

1. **Work from the `.docx` minutes, not the PDF.** The PDF text layer drops
   hyperlinks and flattens list nesting, and its paragraph detection has
   silently dropped whole paragraphs before.
2. Run `tools/minutes-converter.html` (open it directly in a browser — no build
   step), review every field it produces, and export. It exports passed motions
   only and never writes amendments.
3. Drop the files into `data/decisions/<year>/<date>/`.
4. Apply any amendments by hand so `fullText`/`preamble` read as passed, and
   check content warnings landed in `contentWarning`.
5. Verify against the source before pushing — see below.

The converter is a helper, not an authority. Everything it emits needs review.

## Verifying

Worth doing before anything goes public:

- every motion's text matches the `.docx`, paragraph for paragraph;
- amendments are applied, and applied to the preamble too where they said so;
- content warnings extracted;
- movers, seconders, page numbers, bloc groupings;
- `minutesUrl` resolves (200) and page numbers point at the right motions.

## Deployment

Push to `main`. GitHub Actions builds and publishes to Pages
(`.github/workflows/deploy.yml`). Pages serves with `cache-control: max-age=600`,
so a change can take ten minutes to appear — hard-refresh before concluding
something is broken.

The build inlines everything into a single `dist/index.html`, including the
logo, so the page has no external dependencies beyond Google Fonts.

## Routing

Hash-based (`#/m/<date>`, `#/d/<date>/<id>`) because Pages serves no rewrites —
a real path would 404 on refresh or on a shared link. Browser back/forward work,
and every decision has a citable URL:

```
https://dezlidezlidezli.github.io/decisions-database/#/d/2026-02-25/7.5
```

## Gotchas

- `.gitignore` carries a blanket `*.png` with a `!assets/*.png` exception. A new
  image outside `assets/` will be silently skipped — local builds inline it from
  disk and look correct while CI ships a broken reference.
- Two motions can share a title across meetings ("Dysfunction on Campus",
  "Clubs Affiliation"), so match on id, not title.
- SRC 4 numbers its motions `6.x`: that meeting put Motions on Notice under
  Item 6. Follow the minutes rather than normalising.
