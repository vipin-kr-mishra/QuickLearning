# QuickLearning

A fast, searchable reference of **C#**, **ASP.NET MVC** and **LINQ** interview questions with
interview-ready answers — built for a quick scan before an interview or during revision.

**Live:** https://vipin-kr-mishra.github.io/QuickLearning/

No build step, no dependencies, no npm. Clone it and double-click `index.html`, or serve the
folder over HTTP — both work identically.

---

## Contents

| Section | Questions |
| --- | ---: |
| C# — Basic | 32 |
| C# — Intermediate | 30 |
| C# — Advanced | 30 |
| ASP.NET MVC — Basic | 30 |
| ASP.NET MVC — Intermediate | 30 |
| ASP.NET MVC — Advanced | 30 |
| LINQ | 10 |
| **Total** | **192** |

Every answer follows the same shape: a one-line **In short** summary you could say out loud,
then the detail, with a C# snippet wherever code makes it clearer.

MVC answers target classic **ASP.NET MVC 5** — which is what these questions describe — and note
the **ASP.NET Core** equivalent wherever the two differ.

## Features

- **Search** everything — questions, summaries and answer bodies — with `Ctrl`+`K` or `/`
- **Deep links**: every question has its own URL, e.g. `#/csharp-basic/value-vs-reference-types`
- **Progress tracking** — star questions and tick them off as learned, with a progress ring per section
- **Flashcard mode** — answers hidden until you reveal them, plus shuffle and a random-question button
- **Filters** — All / Starred / To learn / Revisit
- **Dark and light themes**, following your system setting until you choose one
- **Print / PDF** — a clean print stylesheet, per section or the whole reference
- Syntax-highlighted, copyable code blocks
- Works offline and on mobile

Progress, stars and theme are saved in your browser's `localStorage` — they never leave your machine.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Ctrl`+`K` or `/` | Focus search |
| `J` / `K` | Next / previous question |
| `Enter` | Expand or collapse |
| `S` | Star the current question |
| `L` | Mark as learned |
| `F` | Flashcard mode |
| `T` | Light / dark theme |
| `R` | Random question |
| `H` | Home |
| `Esc` | Close / clear |
| `?` | Show all shortcuts |

## Adding a question

Open the relevant file in `data/` and add an object to its `questions` array:

```js
{
  id:   "unique-slug-within-this-file",   // becomes #/section/slug
  q:    "The question exactly as asked?",
  tldr: "One sentence you could say out loud in an interview.",
  tags: ["generics", "memory"],           // optional, first 3 are shown
  seeAlso: ["csharp-advanced/span-t"],    // optional cross-links
  a: [
    { p: "A paragraph. Supports `inline code` and **bold**." },
    { ul: ["bullet", "bullet"] },
    { code: `public class Foo { }`, lang: "csharp" },
    { note: "An aside.", kind: "tip" },   // "tip" or "warn"
    { table: { head: ["A", "B"], rows: [["1", "2"]] } }
  ]
}
```

Two authoring rules keep escaping from ever biting:

- Prose strings use **double quotes**, so they can contain `` `backticks` `` for inline code.
- `code` values use **template literals**, because C# contains no backticks. Inside one, never
  write a backslash or the sequence dollar-brace — JavaScript would interpret them.

### Adding a whole new topic

1. Create `data/<your-topic>.js`, copying the `QL.register({ ... })` header from an existing file.
2. Add a `<script src="data/<your-topic>.js"></script>` line to `index.html`, before `assets/js/app.js`.
3. Add the section id to a group in `QL.groups` in `data/manifest.js`.

`data/manifest.js` carries the same guide as a header comment, next to the code.

## Structure

```
index.html                  app shell and ordered script tags
assets/css/theme.css        design tokens, light + dark palettes
assets/css/layout.css       app shell, sidebar, topbar, responsive
assets/css/components.css   cards, chips, code blocks, modals
assets/css/print.css        print / PDF stylesheet
assets/js/store.js          QL namespace + localStorage state
assets/js/highlight.js      dependency-free syntax highlighter
assets/js/render.js         icons + answer-block renderer
assets/js/search.js         in-memory search index
assets/js/router.js         hash routing
assets/js/app.js            application controller
data/manifest.js            section groups + authoring guide
data/*.js                   the questions
```

Hash routing and relative asset paths are deliberate: the same files work unchanged from
`file://` and from a GitHub Pages project sub-path, with no server rewrite rules.
