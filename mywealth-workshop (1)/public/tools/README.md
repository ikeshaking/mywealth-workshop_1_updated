# Associate tool HTML files

Drop self-contained associate tools (ROA Generator, calculators, etc.) in this
folder as standalone `.html` files, then link to them from the Associate Tools
page (`app/associate-tools/page.jsx`).

## Why the files live here (and why the ROA Generator broke when published)

These tools are single-file HTML apps built around **inline `onclick` handlers
that call globally-scoped JavaScript functions** (e.g.
`onclick="page='picker';render()"`). That works only when the browser runs the
script as a plain global `<script>`.

The website is a **Next.js** app. In dev (`next dev`) nothing is minified, so
the tool works. When you **Publish**, Next runs a production build that
**bundles and minifies** the JavaScript — it renames the global functions
(`render` → `r`) and moves them out of global scope, but the `onclick="..."`
text inside the HTML is left untouched. Result: the first `render()` still runs
(you see the landing page), but every button/nav/theme click points at a
function name that no longer exists and fails silently. The page loads but is
completely unclickable.

## The rule

Files in Next's `public/` folder are served **byte-for-byte, unbundled,
unminified** — identical in dev and production. So:

- **DO** put each tool here and link to it with a plain URL, e.g.
  `<a href="/tools/roa-generator.html">ROA Generator</a>`
  (or open it in an `<iframe src="/tools/roa-generator.html">`).
- **DON'T** import the HTML into a React/`.jsx` component.
- **DON'T** paste its contents into a page or use `dangerouslySetInnerHTML`.
- **DON'T** copy just the `<script>` body into a component.

Any of the "don't"s puts the tool's JavaScript back through the Next.js build
and reintroduces the exact bug above.

## Replit note

If you edit a tool, replace the file here and re-publish. The published site
serves this folder statically, so what you test in dev is exactly what ships.
