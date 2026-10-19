# Credit Card ABC

A free, no-login journey that teaches people to hold a credit card as a **tool, not free money**:
spend only what already exists, pay the full statement every cycle, and never pay riba.

Fully bilingual (English / বাংলা), with a switch in the header. Numbers, dates and money show in
Bangla digits in Bangla mode. Everything is UTF-8 (Unicode) by default: the page declares
`<meta charset="utf-8">`, JSON is always decoded as UTF-8, and Bangla uses Noto Sans Bengali with
system fallbacks (Nirmala UI, Kohinoor Bangla, Bangla Sangam MN).

The site never calls anyone "poor". It asks nine neutral questions about how money moves in a
person's life, then builds a personal learning map from JSON rules.

## Run

No build step and no dependencies. Serve the folder:

```sh
python3 -m http.server 8080   # then open http://localhost:8080
```

(Opening `index.html` directly from disk won't work, because browsers block `fetch` on `file://`.)

## How it fits together

```
index.html          shell
styles.css          design tokens (light + dark) and components
app.js              router, condition engine, lessons, simulators
data/assessment.json   questions → traits + flags → persona
data/map.json          regions, lesson nodes, verdicts, pledge, rate settings
data/ui.json           interface strings (including labels inside the pictures)
data/glossary.json     tap-to-explain words
figures.js             lesson pictures, built from HTML/CSS so labels translate
```

### The journey

Landing → 9 questions → result ("what we noticed" + the lesson plan) → lesson 1 → "lesson done,
up next" → lesson 2 → … → my rules. `#/learn` always opens the next unfinished lesson, so every
"continue" button in the app goes there. The lesson map (`#/map`) is for reviewing, not required.

### Tap-to-explain words

In any content text, `[[due]]` shows the glossary word (lower-case form mid-sentence, title form
right after `**`), and `[[due|custom text]]` shows your own wording. Tapping either opens the
plain-language meaning from `data/glossary.json`.

### Pictures

Give a `story` or `concept` step a `"figure": "<id>"`. Available: `flow`, `limitbars`, `calendar`,
`bill`, `mirror`, `doors`, `jar`, `rhythm`, `limitup`, `savefirst`, `dcc`, `points`, `stairs`,
`options`. Add new ones in `figures.js`.

### Text and languages

Every user-facing string is an object with one key per language:

```json
{ "en": "The mirror rule", "bn": "আয়নার নিয়ম" }
```

If a `bn` value is missing, the English one is shown. Interface strings in `ui.json` may use `{n}`-style
placeholders.

### Multi-select questions

Add `"multi": true` to a question. Every chosen option's `add` and `flags` are applied.

### The condition language

Every `when` (persona, node, step, verdict) uses the same small grammar:

```json
{ "all": [ ... ] }                 // every child true ({"all": []} = always)
{ "any": [ ... ] }                 // at least one child true
{ "not": { ... } }
{ "flag": "travels" }              // set by an answer's "flags"
{ "trait": "buffer", "lte": 1 }    // summed from answers' "add"; lt | lte | gt | gte | eq
{ "metric": "accuracy", "lt": 0.7 } // first-try quiz accuracy, or "completed"
```

Personas and verdicts use the **first** entry whose `when` passes, so order them from most specific to least.

### Adding a lesson

Add a node to `data/map.json` with a `region`, a `when`, and `steps`. Step types:
`story`, `concept`, `quiz`, `reflect`, `takeaway`, and `sim` (`cycle`, `minimum`, `mirror`).
Text supports `**bold**` and `*italic*`. Any step can also have its own `when`.

### Rates

`settings` in `map.json` holds the example APR, minimum-payment rule, late fee and cycle lengths
used by the simulators. Change them to match your market.

## Deploy (Cloudflare)

Served as static assets on Cloudflare Workers (`wrangler.jsonc`; `.assetsignore` keeps repo-only files out):

```sh
npx wrangler@4 deploy
```

## Principles

- No login, no analytics. Progress is kept only in the visitor's `localStorage`.
- Never frame the visitor by class. Talk about *cushion*, *rhythm*, *restraint* and *reach*.
- Never teach any path that involves paying interest. The only acceptable use is paying in full
  within the grace period. The site is honest that scholars differ, and points to riba-free
  alternatives (debit, prepaid, Shariah-based cards).
- Educational only. Not financial or religious advice.

## License

Code: MIT. Fonts: Inter and Noto Sans Bengali (SIL Open Font License) via Google Fonts.
