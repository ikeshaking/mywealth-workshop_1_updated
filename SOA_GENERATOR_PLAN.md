# SOA Generator — Build Plan & To‑Do

A grounded review of the current tool (`SOA_Generator_v190.html`) and a phased plan to make it
work cleanly and accurately for **single, couple, and entity** clients across every strategy area,
driven by **advice‑request keywords** pulling from a maintainable **word bank**.

---

## 1. Where it stands today (verified)

**Solid:**
- **Client types:** single + couple (joint) fully supported — pronouns (`IWe`/`iwe`), names
  (`fullName`, `bothPref`, `pref`), per‑person super/insurance rows.
- **Strategy blocks (10):** debt, investment property, investment bond, investment plan, super,
  super contributions, insurance, cashflow, admin, estate — each with templated wording in
  `STRAT_LIB` (recommendation / why / risks / alternatives / details).
- **Keyword→tailored wording:** *only debt* has it (`DEBT_MODULES` + `v192*`/`v194*`). It's a proven
  pattern: a module = `{id, keyword regex, strat, outcome, risk[], alt[], gate}`, and it syncs
  **Summary‑Strategies + Summary‑Outcomes + the Advice section**, with gearing on/off and `{amt}`
  figure injection. This is the template to generalise.
- **Importers:** projector JSON (fact‑find), advice request, CARE doc, WealthSolver, Risk Researcher,
  ClearView/NEOS/insurer quotes, commission. Smart‑drop classifier routes each.
- **Platform/product:** Hub24 / Netwealth / CFS detection; CARE vs Vanguard heuristic
  (`v185InvestIsVanguard`); CARE tiers (Essentials / Full / Genuine Edge).
- **Risk profile:** read from advice request "Notes to Risk Profile" incl. bump notation and
  separate super vs investment profiles; also from CARE.
- **Fees:** advice + ongoing remuneration tables, tax‑adjusted (15% in super, MTR for cashflow).
- **Replacement tables:** structures exist for investment / super / insurance; auto‑fill from CARE +
  WealthSolver.

**Weak / missing / broken:**
- **Entity support is structurally incomplete.** `clientType` is one of `individual|joint|entity` —
  mutually exclusive. So **couple + entity (e.g. couple with an SMSF) breaks**: switching to entity
  loses the couple's names and partner rows. No ABN/ACN, no trustees/directors in core state (only a
  v15 patch, not persisted). No **ownership model** on assets/super/insurance (can't mark "held via
  SMSF / company / trust" vs personally). Insurance/super owner enums have no entity options.
- **Tailored‑wording engine only covers debt.** Every other scenario you named (inspecie transfer,
  sell‑to‑buy, upgrade home, convert home → IP, inheritance → pay down loan, …) has no trigger/word‑
  bank path.
- **Word bank is hardcoded** in the HTML (`STRAT_LIB`, `DEBT_MODULES`). Paraplanners can't maintain
  wording without editing code.
- **No fee‑differential calc.** The admin+management fee **increase/decrease between recommended and
  current super** is not computed — the replacement table has the cells but no differential figure.
- **Replacement implications** need verification for accuracy (CGT/exit costs, lost benefits, like‑
  for‑like notes) across investment/super/insurance.
- **Product delineation** (Vanguard vs CARE; *Vanguard Diversified* vs a specific Vanguard fund) relies
  on heuristics — needs a robust taxonomy.
- **No systematic verification harness** across entity types × strategy combinations.

---

## 2. The core idea — one engine, one word bank

Two architectural moves unlock almost everything you asked for:

### A. Generalise the debt‑module pattern into a universal **Strategy Module Engine**
A single engine (`v200`) that, for **any** strategy area, takes the advice‑request text and:
1. matches **modules** (keyword‑triggered tailored wording),
2. respects **scope gates** (e.g. gearing only if gearing scoped; deposit only if IP purchase scoped),
3. fills **figures** from the request/JSON (`{amt}`, loan limits, fee differentials),
4. **syncs** Summary‑Strategies + Summary‑Outcomes + the Advice section (recommendation / why /
   risks / alternatives), and
5. distinguishes **templated wording that always appears** from **tailored wording added on trigger**.

A module schema (superset of today's debt module):
```
{
  id, area,                       // 'property', 'invest', 'super', 'insurance', 'cashflow', 'debt'…
  triggers: [/regex/, …],         // advice-request keywords/synonyms
  gate,                           // optional scope condition (fn)
  strat, outcome,                 // Summary-Strategies + Summary-Outcomes lines
  why[], risk[], alt[],           // Advice-section bullets
  figures: [{token, extract}],    // {amt}, {limit}, {feeDiff}… pulled from request/JSON
  needs: ['table:loanLimit', …],  // tables/calcs this module requires
  variantOf,                      // product/platform variant (e.g. Vanguard vs CARE)
}
```
The debt modules migrate into this engine unchanged in behaviour (parity test), then property /
investment / super / insurance / cashflow get their own module sets.

### B. Externalise the **word bank**
Move all tailored wording out of the HTML into a single editable **word‑bank file** (JSON, or a
droppable "Word Bank" doc) that the tool loads. Benefits: paraplanners edit wording without touching
code, it's versionable, and the same bank drives preview + Word export. The engine is only as good as
this bank — so this is the highest‑leverage artefact you can give me.

---

## 3. Phased plan (with to‑do / verify lists)

### Phase 0 — Engine + word bank foundation
- [ ] Define the module schema + word‑bank format (above).
- [ ] Build `v200` engine: `matchModules(area, text)`, `activeModules(area)`, `buildAreaWording(area)`
      — generalising `v192MatchDebtModules` / `v194BuildDebtWording`.
- [ ] Migrate debt into the engine; **verify byte‑for‑byte parity** with current debt output.
- [ ] Load the word bank from an editable source; fall back to built‑in if absent.

### Phase 1 — Entity / ownership model
- [ ] Add an **ownership layer**: every asset/super/insurance/loan row carries `owner ∈ {client,
      partner, joint, entity:<id>}`.
- [ ] Support **multiple entities**: `F.entities=[{id,type,name,abn,members/trustees/directors}]`, so a
      couple can hold an SMSF *and* a company alongside personal assets.
- [ ] Make `clientType` orthogonal: persons (single/couple) + entities[]. Pronoun/name engine resolves
      the **subject per section** (e.g. "the trustees of the Fund", "you", "ABC Pty Ltd").
- [ ] Add entity fields (ABN/ACN, trustees/directors) to **core state**, UI, and JSON detection.
- [ ] **Verify** the five shapes: single; couple; entity‑only; couple + SMSF; single + company.

### Phase 2 — Strategy coverage (author the modules)  ← needs your word bank + sample SOAs
- [ ] **Property:** existing vs proposed; sell‑to‑buy; upgrade home; convert home → investment
      property; inspecie transfer; downsizer; etc.
- [ ] **Investment plan:** regular investment; debt recycling; lump‑sum; inheritance → invest /
      → pay down loan; gearing variants.
- [ ] **Super:** establish/rollover (full/partial/retain‑minimum); consolidation; inspecie transfer;
      pension/TTR; SMSF setup.
- [ ] **Super contributions:** concessional / salary sacrifice / non‑concessional / carry‑forward /
      bring‑forward / spouse / downsizer / contribution splitting.
- [ ] **Insurance:** new / increase / replace / takeover / inside‑super vs personal / cancel.
- [ ] **Cashflow & budgeting; estate planning.**
- [ ] Each module supplies recommendation, why/outcome, risks, alternatives, required figures/tables,
      and its scope gate. **Verify** each triggers correctly and is omitted when not scoped.

### Phase 3 — Calculations & tables
- [ ] **Fee differential (missing):** compute the increase/decrease in **admin + management fees**
      between recommended and current super/investment; feed the replacement table + a "fee comparison"
      line, after‑tax where relevant.
- [ ] **Loan limits:** done for the term loan; extend to refinance / equity‑release rows.
- [ ] **Replacement implications** (invest/super/insurance): verify CGT / exit costs / lost benefits /
      like‑for‑like notes fill accurately; partner/entity columns correct.
- [ ] **Auto‑populate** all product / cost / projection / allocation tables; verify **preview ↔ Word
      parity**.

### Phase 4 — Platform / product delineation
- [ ] Product taxonomy: **platform** (Hub24/Netwealth/CFS/BT) × **approach** (CARE vs Vanguard/index
      vs other) × **specific fund** (e.g. *Vanguard Diversified* vs a single Vanguard fund).
- [ ] Drive product tables + wording variants from the taxonomy (so "Vanguard instead of CARE" and
      "Vanguard Diversified instead of Vanguard" both render correctly).

### Phase 5 — Verification harness & compliance
- [ ] Build a **test matrix**: entity types × strategy combos × supporting docs, run headless‑browser
      fixtures with assertions.
- [ ] **Placeholder‑leak guard:** no `$XXX` / `[bracket]` / `XX` survives to export.
- [ ] **Completeness check:** every active strategy has recommendation + why + risks + alternatives.
- [ ] **Conflict detection:** advice request vs JSON (fees, risk profile, platform) — surface, don't
      silently pick.
- [ ] **Unmatched‑instruction flag:** if an advice‑request line matches no module, flag it for manual
      wording instead of dropping it.

---

## 4. Things worth considering (you may not have)

1. **Ownership/entity as a first‑class layer**, not a `clientType` flag — required for couple + SMSF,
   and for correct tax/contribution treatment.
2. **Externalise + version the word bank** so paraplanners maintain it; keep an audit trail of wording
   changes.
3. **Conflict detection** between advice request and JSON (fee mismatch, risk‑profile mismatch, platform
   mismatch) — already partially flagged; make it systematic.
4. **Unmatched‑instruction safety net** — never silently drop an instruction the engine didn't
   recognise; surface it.
5. **Compliance guards** at export: placeholder‑leak detection + per‑strategy completeness.
6. **Entity tax treatment** (SMSF 0/15%, company 25/30%, trust distributions) feeding fee‑after‑tax and
   contribution wording.
7. **CGT / exit‑cost / lost‑benefit** logic for replacement (not just fee cells).
8. **Per‑entity test fixtures** — a sample fact‑find JSON + advice request for each shape.
9. **Word‑export ↔ preview parity** testing (the docx highlight can't be binary‑tested in this sandbox).
10. **Regression snapshots** — as the word bank grows, snapshot key outputs so changes are intentional.

---

## 5. What I need from you

- **Yes — please send example MWS SOAs** with your full templated wording. Ideally 2–3 covering:
  (a) a **couple** with a broad strategy set, (b) an **entity / SMSF**, (c) one using **Vanguard**
  (so I can nail the Vanguard‑vs‑CARE and Vanguard‑Diversified‑vs‑Vanguard delineation).
- **The word bank** of tailored wording for the scenarios (recommendation / why‑outcome / risks /
  alternatives per scenario) — the single most valuable input.
- **Your advice‑request keyword conventions** (so triggers match how you actually write them), plus a
  few **sample advice requests** covering varied strategies.

---

## 6. Recommended first step

Build **Phase 0** (the engine + word‑bank format) and migrate **debt** onto it with a parity test.
That gives a clean, proven foundation; then each new strategy area is just data (modules) in the word
bank — fast to add and safe to verify. In parallel, I'll start **Phase 1** (the ownership/entity layer)
since it's the deepest structural change and everything else sits on top of it.
