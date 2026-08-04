# Wealth Review Generator — Audit Report

**Artifact:** `review-generator/Review_Generator.html` (single self-contained file, ~505 KB)
**Type:** Client-side browser application — no server, no backend, no database
**Scope of this audit:** architecture, feature coverage, data flows, checklist completeness vs the
original firm checklist, Word-output fidelity vs the MWS FINAL template, security/privacy posture,
known limitations, and verification performed.

---

## 1. Overview & architecture

The tool is a **single HTML file** that runs entirely in the browser. All client data stays on the
machine — nothing is transmitted to any server. It is built around one in-memory state object (`S`)
and a set of pure render functions; there is no framework.

- **~134 functions**, one global state object `S`, **14 checklist sections**, **182 checklist prompts**.
- **Four-stage workflow** (top tabs): ① Pre-Review Checklist → ② Generate Wealth Doc →
  ③ Review Meeting → ④ Post Review.
- **Rendering model:** structural changes re-render (`renderContent`); free-text inputs mutate state
  without re-rendering (preserves focus) — matching the existing codebase convention.

### Dependencies (loaded from CDN at runtime)
| Library | Purpose | Failure mode if offline |
|---|---|---|
| `docx` 8.5 | Word (.docx) generation | Export Word disabled until loaded |
| `xlsx` 0.18 | Read PTW / rebalance / legacy checklist | Those imports disabled |
| `pdf.js` 3.11 | Read platform PDF reports | PDF imports disabled |
| `mammoth` 1.6 | Read the prior review (.docx) | Last-review import disabled |
| `FileSaver` 2.0 | Download files | Downloads disabled |
| Google Fonts | Playfair Display / Nunito | Falls back to system fonts |

**Note:** the embedded cover/back artwork and all core UI/logic are inline, so the app renders and the
checklist/dashboard/previews all work with **no network**. Only import/export (which need the CDN
libraries) require connectivity.

### State model `S` (top-level keys)
`meta` (review + adviser + file-note/ROA + CRP + insuranceAdviser), `licensee`, `practice`,
`client`, `partner`, `lifestyle`, `nestegg`, `income`, `expenses`, `totalsOverride`, `foundations`,
`estate`, `goals`, `fiGoals`, `goalTracking`, `portfolios`, `assetAlloc`, `insurance`, `actionItems`,
`services`, `extraPlatforms`, `uploads`, `checklist{ answers, activeSection }`, `rebalance`,
`_snapshot` / `_fileNote` / `_roa` (transient, excluded from saved JSON).

---

## 2. Feature-by-feature audit

### ① Pre-Review Checklist
- **Data-driven schema** (`CHECKLIST_SCHEMA`): each section has `appliesWhen` (shown only if the client
  holds that account type), each item has a type (yes/no, currency, date, text, textarea, select),
  optional `perClient`, inline `followUps`, `routeNote`, `todo`/`todoWhen`, and computed panels.
- **Client 1 / Client 2 aware** — per-client questions render two labelled inputs; CRP captured for
  Client 1, Client 2 and Joint.
- **Sections (14):** Scope & Accounts, General, Compliance, Retail Super, Second (Held) Super, SMSF
  (full strategy checklist), MCMA, Investment/DR, Investment Bonds, Property, Loans, Insurance, Held
  Insurance, Adviser Fees.
- **Computed rules / flags:** SG expected-vs-actual (annualised) discrepancy flag, held-super partial-
  rollover $6k/$10k threshold, adviser-fee SOA/OSA/actual comparison.
- **Routing on Apply (`applyChecklistData`):** action-type answers → `actionItems` (de-duplicated);
  data answers → the matching wealth-doc section (beneficiaries → estate, contributions/SG → super
  notes, RSP/DCA → goal tracking, fees → adviser comments); CRP → `meta.crp` + adviser comments.
- **Presentation:** hybrid — jump-to section sidebar with per-section completion counts + Back/Next
  step flow. The tab is full-width (app nav + preview hidden here).

### ② Generate Wealth Doc
- **Imports (deterministic, in-browser):**
  - **Wired parsers:** HUB24, BT Panorama, Macquarie Cash (auto-detected per PDF); prior review
    (.docx via mammoth → details, assets, income, goals, goal-tracking, actions); PTW (.xlsm →
    Financial Independence figures); CARE rebalance (.xlsx).
  - **Stub slots (await a sample to wire):** Review Data Snapshot (Jotform), insurance CDM/renewal,
    property valuations, Netwealth/CFS/Mercer, etc. These accept a file and surface a "sample needed"
    state without silently failing.
  - Uploaded reports show as removable chips; per-page and global **Reset** are available.
- **Licensee/practice dropdown** (seeded with GPS Wealth) prefills ABN/AFSL/address/contacts.
- **Standard review to-do template** seeded into every new review.
- Sections: Imports, Cover & Details, Current Situation, Foundations & Estate, Goals, Goal Tracking,
  Portfolio Valuation, Asset Allocation (auto donut charts), Insurance, Actions & Services, Rebalance.

### ③ Review Meeting
- **Dashboard** (tiles: net position, open action items, tracked changes, rebalance status, rating)
  beside the live wealth-doc preview.
- **Live edit** — every figure/note editable; a **baseline snapshot** is locked on entry and
  `diffSnapshot()` tracks only in-meeting changes, which feed the file note & ROA.
- **Hide/unhide preview** toggle for presenting.

### ④ Post Review
- **Changes Made** (diff vs baseline), **File Note** (After Review Summary format), **ROA**
  (No-change / Rebalance variants) — each shown as a **live Word-style document preview** beside the
  editable text.
- **Copy review summary + to-dos** handoff (for the "Donna" email flow / bcc Xeppo).

### Word generation (`generateDocx`) — fidelity vs the MWS FINAL template
- Landscape A4, embedded cover + back artwork, Nunito body + ABC Arizona Flare headings, brand blue
  `#0C6AE1`, teal `#E3F2F4`, **navy bands `#0C2E3F`**.
- **Front-matter AR/compliance block** (Adviser + Insurance Specialist as Authorised Reps, CAR 441414
  of GPS Wealth, AFSL 254 544, ABN 66 153 751 832) + static "What does this document cover?" panel.
- **Footer:** "PAGE n" / "WEALTH REVIEW". **Foundations + Estate** combined into one table.
- Full section set matches the template order; rating icons use the template palette.

---

## 3. Checklist coverage vs the original firm checklist (`Pre_Checklist_.xlsx`)

**PreReview sheet (31 items): fully covered.** All original items map to the new schema; the following
were explicitly added during this work to close gaps: taxable/non-taxable super components, Review Data
Snapshot check, Implementation Handover folder (new SOA), Review Dates Checklist, activate
auto-rebalancing, and investment-account tax statements.

**SMSF Checklist sheet: fully covered.** The summary SMSF section was expanded into the complete SMSF
Strategy Checklist — Members, Trusteeship, Trust Deed, Investment Objectives, Centrelink, Estate
Planning, Audit, Asset Ownership, In-House/Related Party, Contribution Strategies, Pensions, SMSF
Insurance, Trustee Fees & Professional Advisers.

| Original category | Status in tool |
|---|---|
| ID, tasks, contributions, BT, RSP, links, snapshot, partial rollover, opt-in, EFDS, review dates, category, property, equity, portal, cash/rebalance, beneficiaries, fees, ongoing fees, performance report, MCMA, W-8BEN, tax statements, risk profile, IP quote, insurance, CARE/Winton, referrals, BT flag, Worksorted | ✅ Covered |
| Taxable / non-taxable components | ✅ Added |
| Full SMSF Strategy Checklist (13 sub-categories) | ✅ Added |

---

## 4. Security & privacy posture

- **All processing is client-side.** No network calls carry client data; uploaded documents are read
  in-browser only. There is **no AI/LLM** and no third-party data egress — chosen deliberately for
  client-financial-data privacy.
- Saved drafts are plain `.json` files the user controls; transient keys (`_snapshot`, `_fileNote`,
  `_roa`) are excluded from saved output.
- No secrets, tokens, or credentials are stored in the file.

---

## 5. Known limitations & risks

1. **Report parsers not yet wired** for several formats (Review Data Snapshot, contributions report,
   insurance CDM, MCMA statement, performance report, Cotality). These are stub slots pending one real
   sample each; until then those figures are entered/confirmed manually.
2. **Word/PDF export depends on CDN libraries** — in a locked-down/offline environment the Export Word
   and PDF-import features will not function until the libraries load.
3. **SG reconciliation** annualises FY-to-date on a whole-month basis and assumes a single SG rate;
   treat the flag as a prompt, not a precise figure.
4. **Legacy `.xlsx` checklist upload** routes actions/notes but does not repopulate the new
   questionnaire answers (the old format predates the schema).
5. **Cover/back artwork** is the compressed JPEG (visually identical to the template PNG) to keep the
   single-file size reasonable.
6. **Single-file size** (~505 KB) — emailing is fine; very old browsers may be slow to parse.

---

## 6. Verification performed

- **Headless browser (Chromium/Playwright):** every tab and every section rendered; checklist
  exercised for 1 and 2 clients across all account types; conditional sections, per-client fields,
  follow-ups, SG/rollover/fee computed panels, and routing on Apply all verified; **0 console errors**
  (only expected offline-CDN network errors).
- **JSON save/load** round-trips the new checklist model.
- **docx.js constructs** (Table-in-Footer, cover two-column shaded table, 5-column Foundations) packed
  successfully against the real `docx` package.
- **Syntax** validated with `node --check` after each change.

---

## 7. Recommendations / roadmap

- Wire the deterministic parsers as real samples are supplied (unlocks full auto-prefill).
- Optionally add a bring-your-own-key AI-assist layer (off by default) for free-form SOA reading, with
  a compliance review of data handling.
- Add the firm's additional licensee/practice entities to the `LICENSEES` list and advisers to
  `ADVISERS`.
- Consider a lightweight automated test harness (the Playwright drivers used here can be checked in).

---

*Prepared for My Wealth Solutions. This audit describes the tool as at the current branch head.*
