# SOA Generator (v190_36) — Full Architecture & Logic Analysis

**File analysed:** `SOA_Generator_v190_36.html` (~17,240 lines, 4.2MB single-file app)
**Date:** 2 July 2026

---

## 1. Executive verdict

The generator **substantially implements the intended design** — drag-and-drop of a FactFind
(Wealth Projector) JSON and an Advice Request JSON, standard wording seeded for every block, and
tailored recommendation / why / risks / alternatives wording triggered from the advice request —
and the wiring is live end-to-end, not aspirational.

However, it is **not yet safe for "all client scenarios"**. Four things stop that today:

1. **Import order can silently destroy the advice-request tailoring** (fact-find dropped after an
   advice request wipes retirement/fee/scope-out/TPD/MCMA state).
2. **Matching is exact-string, not keyword-based.** A strategy name that deviates by one character
   from the word-bank key silently degrades to raw free-text with *no* why/risks/alternatives.
3. **17 word-bank entries are unreachable** (categories `0 · Client framing & scope`,
   `11 · Entities`, `CARE · Investment Philosophy`) because the area→block map only covers areas 1–10.
4. **~20 word-bank entries and 3 strategy blocks are thin** — recommendation-only with empty
   why/risks/alternatives (notably smoker pre-assessment; cashflow and admin have no standard
   risks/alternatives at all; there is no maternity-leave entry on the cashflow side).

The prioritised amendment list is in §7.

---

## 2. Architecture map

```
DROP ZONE (#dropzone-smart, wired at 7113)
  └─ v145SmartDrop (4201)
       ├─ .json  → v200IsAdviceReq()? 'advicereqjson' : 'json' (4216-4220)
       ├─ .xlsx  → v141ReadXlsxCells → classify (default 'datacol')
       └─ .docx/.pdf/.txt → extractAnyText (JSZip / pdf.js) → v145ClassifyText (4118)
            (clearview, neos, commission, advicereq, wealthsolver, care, rr,
             aussuper, datacol, quote, unknown)
  └─ v145ShowSmartModal (4243) — adviser confirms type + person per file
  └─ v145ApplySmartMapping (4280) — 'json' applied first, then each importer

STATE
  F  = factfind/scalar state (client, partner, figures, fees, flags)     (1655+)
  B  = per-block {active, content:{recommendation,why,risks,alternatives,…}} (1656)
  BLOCK_DEFS = master ordered section list (1561-1643): front matter,
    strategy blocks (debt, property, investbond, investplan, super,
    supercontrib, insurance, cashflow, estate, admin), product blocks,
    replacement tables, prose/composite firm-wide sections, annexures.

WORDING LAYERS
  STRAT_LIB (1248-1340)      — standard per-strategy wording (seeded at resetState)
  PROSE_LIB (1342-1444)      — firm-wide prose (intro, remuneration, disclosures,
                               services agreement, ATP, PDS, APL, TFN, declaration)
  PRODUCT_CARD_DEFAULTS (10284-10310) — product recommendation/why/risks/alts + duty of disclosure
  REPLACEMENT_TEMPLATES (8749-8807)   — replacement product tables
  V200_WORD_BANK (16275)     — 143 tailored entries "Area::Strategy name"
                               {strat, why[], risks[], alts[], outcome, replace[]}

PIPELINES
  FactFind JSON  → importProjectorJSON (2884): client/partner, risk profiles,
    scope-in from *modelled* data (2984-3025) + GOAL_TO_BLOCK flags, scope-out
    signals, goals + standard goal leads/tails, figures/outcomes,
    injectFiguresIntoStrategies (3583) — fills $XXX in standard wording,
    loans/super/insurance rows, annexure data, summary rebuild.
  Advice Request JSON → v200ApplyAdviceRequest (17121): names/adviser/status,
    soaType → v97ApplySoaType (retirement/accumulation), strategies grouped via
    V200_AREA_TO_BLOCK → V200_WORD_BANK exact lookup → B[bid].content
    (recommendation/why/risks/alternatives/comments/altProducts/adminFees) +
    setBlockActive; then risk matrix, fee matrix → remuneration tables, products
    → platform stamping, CARE/Vanguard approach wording, standard debt/super
    overlays, gearing override (v194 re-run LAST), cashflow, scope-out,
    insurance benefits, budget notes → render().

RENDER  render() (6352) — includes render-time "safety nets" that MUTATE B
        (v200StripSeamless, $XXX backfill, TPD normalisation, CARE strips).
EXPORT  generateSOA() (7470, docx.js) — walks BLOCK_DEFS in order, skips inactive
        blocks, yellow-highlights auto-pulled values and unresolved placeholders
        (v186HighlightPlaceholders 6268 / apRuns 6296), TOC field refresh, saveAs.
```

Later `<script>` layers (v140 insurance ROA parity, v149 replacement auto-fill, v150 autosave,
v151 goal sync, v153 import queue + conflict checks, v154 undo/redo, v190 NEOS parser, v200 engine)
patch the main app through `window.*` late binding with `typeof` guards — mostly safe.

---

## 3. Verification against the intended design

| Design intent | Status | Evidence |
|---|---|---|
| Drag & drop FactFind JSON → client details + wealth projection + outcomes → standard wording | ✅ Works | `importProjectorJSON` (2884): scope-in from modelled data, outcomes (3265-3305) feed Summary-Outcomes and `$XXX` fills in strategy wording |
| Drag & drop Advice Request JSON → strategies + products → tailored + standard wording | ✅ Works (with caveats §4) | Detected at 4219 (`strategies[]` + `scopeIn[]`), applied via `v200ApplyAdviceRequest` (17121); also embedded-JSON path in Word/HTML advice requests (6690-6701) with keyword-parser fallback |
| Standard wording in ALL SOAs (disclosures, services agreement, fees, ATP, PDS, APL) | ✅ Present, always active | PROSE_LIB + default-active blocks (1699-1701) |
| New vs current client variants | ⚠️ Partial | Only 3 wording points vary (CS opener 2370-2381, risk-profile "remains appropriate" 11090-11119, fee lead-ins 2769-2778) and they hang off **two unsynchronised flags** (`F.csClientType` UI dropdown vs `F.isExistingClient` from the AR). The word bank's own new/existing openers are unreachable (§4.3) |
| Retirement vs accumulation variants | ⚠️ Partial | `v97ApplySoaType` (2231) swaps goals, scope, annexures; retirement pension wording is injected into the super block (5891-5896, 6200-6207) with unfilled `$XXX`; **no dedicated pension block**, no retirement variants of risks/alternatives/replacement tables |
| Standard wording per strategy | ⚠️ Mostly | STRAT_LIB covers all 10 blocks, but cashflow & admin have EMPTY risks/alternatives (1316-1317, 1325-1326) and estate has empty why/alternatives (1333, 1336) |
| Tailored wording per keyword (rec/why/risks/alts) | ⚠️ Works but exact-match only | 143 entries; lookup is `V200_WORD_BANK[s.area+'::'+s.name]` (17168) — byte-exact, incl. the `·` separator. Unknown names fall back to raw free text with no why/risks/alts (17179) and no warning |
| FHSSS trigger | ✅ Full entry | `6::First Home Super Saver Scheme (FHSSS)` — strat + why + 2 risks + alt |
| Maternity leave — insurance | ✅ Full entry | `7::Retain cover during workforce absence (maternity / parental leave)` |
| Maternity leave — cashflow | ❌ Missing | No cashflow-category entry mentions maternity/parental leave |
| Smoker rates | ⚠️ Thin | `7::Pre-assessment factors (smoker / health / pastimes)` is one sentence; why/risks/alts empty |
| Pay down loan / consolidate loans / debt recycling | ✅ Full | Debt category: cash/sale-proceeds paydown, inheritance paydown, car-loan & other-debt consolidation, Term Loan/debt recycling (GEARING, 6 why / 8 risks) — gearing additionally overridden by the firm's v194 wording, deliberately, at 17213 |
| Investment property / insurance / cashflow / super triggers | ✅ Broad | 7 property, 29 protection, 24 super, 18 contribution entries |

### Word-bank coverage snapshot (143 entries)

| Category | Entries | Thin (no why/risks/alts) |
|---|---|---|
| 0 · Client framing & scope | 5 | — (but **unreachable**, §4.3) |
| 1 · Debt Management | 15 | 3 |
| 2 · Investment Property | 7 | 0 |
| 3 · Investment Bond | 4 | 3 |
| 4 · Investment Plan | 14 | 5 |
| 5 · Personal Superannuation | 24 | 3 (2 have **empty strat**: consolidate accounts; retain DB fund) |
| 6 · Superannuation Contributions | 18 | 2 (Div 293/296 notes — acceptable) |
| 7 · Personal Protection | 29 | 5 |
| 8 · Cashflow & Budgeting | 8 | 5 |
| 9 · Estate Planning | 5 | 0 |
| 10 · Administration | 2 | 0 |
| 11 · Entities | 3 | — (**unreachable**) |
| CARE · Investment Philosophy | 9 | — (**unreachable**) |

`outcome` and `replace` fields exist on every entry but are **never read** by any code.

---

## 4. Critical defects (verified, ranked)

### 4.1 Fact-find import after an advice request silently destroys AR tailoring
`importProjectorJSON` → `resetState()` (2909). The preserve lists `_PRESERVE`/`_Fkeep`/`_Ffill`
(2903-2907) contain **none** of the v200 fields: `_arScopeOut`, `retirementSOA`, fee fields
(`upfrontFeeSuper/Mcma`, `ongoingFeeSuper/Mcma`, `commitmentFee`), `mcmaWeekly*`, `tpdOwnOcc`,
`recPlatform`, `investApproach`, `savingsBenefit`, `insuranceBenefit`, `debtEquityScoped`,
`superLumpSum`, `isExistingClient`, `superProdByPerson`, `_invEst`. Consequences:
- Line 3076's "advice request always wins regardless of import order" re-apply of scope-out **can
  never fire** — `F._arScopeOut` is already wiped.
- A retirement SOA silently becomes accumulation, and `v200StripSeamless` (called every render,
  6390) then **irreversibly deletes** the accumulation→pension wording from the preserved blocks.
- `injectFiguresIntoStrategies` (3609-3619) overwrites the AR's MCMA cashflow card with the
  no-MCMA variant because `F.mcmaWeekly` is now empty.
- `v200NormalizeInsuranceCovers` (17099, every render) flips preserved TPD rows back to
  Own-Occupation once `F.tpdOwnOcc` is wiped.
- Bonus: the different-client detector (2892-2896) treats "Rob" (from `ar.clients`) vs "Robert"
  (fact-find) as different clients → full clean import, discarding even preserved blocks.

Only the single smart-drop modal is safe (JSON ordered first, 4285). Sequential drops in the
"wrong" order — explicitly claimed as supported by the v157 comment (2885-2891) — are not.

### 4.2 Exact-string matching with silent free-text fallback
`V200_AREA_TO_BLOCK[s.area]` (17164) and `V200_WORD_BANK[s.area+'::'+s.name]` (17168) are
byte-exact. An area written `"1 - Debt Management"` instead of `"1 · Debt Management"` drops the
whole strategy group and its scope-in. A near-miss name loses all tailored why/risks/alternatives
and injects the raw builder note as the recommendation — with **no warning anywhere** (the smart
drop reports success; `v190ImportGaps` doesn't check for word-bank misses).

### 4.3 Unreachable word-bank categories (17 entries)
Areas `0 · Client framing & scope`, `11 · Entities (company/trust/SMSF)` and
`CARE · Investment Philosophy justification` are not in `V200_AREA_TO_BLOCK` (16276-16280), and
the bank is consulted only at 17168 — so the new/existing-client openers, "risk profile remains
appropriate", reference-by-incorporation, business scope-out, bucket company, family trust,
SMSF-as-entity and all 9 CARE-philosophy justifications **can never be emitted** via the JSON path.
Only fragments are approximated by ad-hoc handling of `ar.status`/`ar.clients` (17124-17131).

### 4.4 `v200ApplyScopeOut` clears the Military-Super DB exclusion
17081-17094 zeroes six scope-out flags including `so_militaryDB` and re-ticks only what the AR
mentions. The fact-find derives `so_militaryDB` from actual fund data (3072-3073, 3419) and its
boilerplate says the client is *required* to retain the DB portion (1483) — a compliance-mandatory
exclusion an AR can silently delete.

### 4.5 Import errors swallowed / misreported
`v145ApplySmartMapping` replaces `window.alert` and collects messages into `captured[]` (4282) —
which is **never displayed**. A quote that fails to parse is still listed as "applied". If the
final script block ever fails to parse (one bad character in the 148KB word-bank line kills it),
AR JSONs get classified as fact-finds and imported through `importProjectorJSON` — resetting the
SOA — with a success message (4319-4326).

### 4.6 Advice-request JSON via the paste box is mis-imported
`applyImportedJSON`/`importJSONText`/`importJSONFile` (4506-4543) never call `v200IsAdviceReq` —
an AR JSON pasted into the JSON box runs through `importProjectorJSON`, resets state, and produces
an empty-scoped SOA with no error. Only the smart-drop path re-checks (4324).

### 4.7 Partner risk profile dropped without a literal "couple"
`v200ApplyRisk` (16310) reads the second person's profile only when `/couple/i.test(ar.ctype)`.
A two-person `ar.risk` with `ctype:"Joint"` (or missing) silently drops the partner's profile.

### 4.8 Scope-out signals read before their inputs exist; `F.assets` never exists
`so_shares` tests `F.sharesValue` at 3053 but it's only set at 3164 — a real share portfolio never
triggers the "Existing Shares" exclusion (and `v180ResolveServices` 13737-13739 then wrongly
deletes the sell-down service line). `F.assets` is assigned nowhere, so the shares (3055),
international (3063), crypto (3068) and family-trust (2852) asset-scan branches are permanently
dead — those exclusions fire only from explicit Y/N flags.

### 4.9 Multi-placeholder templates can never fully fill
`v200Fill` (16292) replaces only the **first** `[…]` with `s.pick`. Entries like
"Retain, alter and/or cancel a mix of existing covers ([cover X]/[cover Y]/[cover Z])" always
export with literal bracketed placeholders (yellow-highlighted, but still manual work every time).

---

## 5. Secondary issues

- **Two unsynchronised new/existing-client flags** — `F.csClientType` (UI) vs `F.isExistingClient`
  (AR-parsed) are never linked; a manually-set "existing client" gets the review opener but
  new-client risk-profile wording.
- **No pension/retirement strategy block** — `ADVICE_AREAS` lists `pension` (1469) but no
  BLOCK_DEFS/STRAT_LIB entry exists; retirement rides on the super block with unfilled `$XXX`
  (5893-5894, 6204).
- **Compliance-sensitive hardcodes**: FSG "Part 1 Version 25.0 dated 1 Nov 2025" (1381); director
  names "Ben Budge/Guy Freeman" in Associations (1365); SG default `11.50` (2367 — SG is 12% from
  1 Jul 2025); commission rates 66%/22% (4048); referrals disclosure fixed at "no fees" (1369);
  licensee email `info@count.au` under GPS Wealth (1493); Hub24/Macquarie/Vanguard/CARE baked into
  standard wording (1297, 1314, 10292, 10305).
- **Insurance-commissions section is always active** (1700) even when insurance is out of scope.
- **Dead code**: `GOAL_LABELS` (2868-2882); word-bank `outcome`/`replace` fields; ~10 legacy drop
  zones bound but never rendered (7120-7140); discarded per-client import cards (5116-5141);
  `_v145JointTypes` inline fallback missing `advicereqjson` (4283).
- **Section reordering not persisted** — `v11MoveSection` mutates BLOCK_DEFS but autosave stores
  only `{F,B,page}` (15501-15503); reload reverts the adviser's ordering.
- **CDN dependency at export**: docx.js/FileSaver/xlsx load from CDN (lines 8-10); offline, import
  works but export fails permanently ("Document library still loading", 7472).
- **render() mutates content** (6354-6402) — preview isn't a pure function of state; undo
  snapshots capture post-mutation text.
- **Supercontrib merged card** renders only six fields — `altProducts`/`adminFees` added via the
  "+ Add" buttons show in neither preview nor export.

---

## 6. What is working well

- Live, end-to-end wiring: smart drop → classification → modal confirm → importers → state →
  preview → docx export, with the fact-find applied first when in one batch.
- Word bank is genuinely rich: 143 entries with distinct recommendation/why/risks/alternatives,
  per-person token expansion (`[Name]`/`[Fund]` per owner), single-vs-joint pronoun handling.
- Deliberate override hierarchy — advice request beats supporting docs (risk profile flag
  `_rpFromAdviceReq` 16303; approach mismatches flagged via `v190ImportGaps` instead of silently
  overridden; gearing wording authoritative via v194 re-run LAST 17213).
- Yellow highlighting of every auto-pulled value and unresolved placeholder, identical on screen
  and in the .docx (6247-6248) — a strong paraplanner-review safety net.
- Import serialisation queue, conflict checker, undo/redo, autosave, and the import-gaps summary
  are all real defensive layers.

---

## 7. Recommended amendments (priority order)

**P1 — must fix before relying on it for all client scenarios**
> **STATUS: implemented in `SOA_Generator_v190_37.html` (this repo).** All six P1 items below are
> done, plus two supporting fixes: the different-client detector now compares only the name
> components both sides have (an AR with just "Rob" no longer forces a clean import when the
> fact-find says "Rob Smith"), and the `csClientType`/`isExistingClient` flags are synced when the
> AR states client status. Verified with a 36-check headless-browser test driving the real import
> pipeline (advice request → tolerant matching → fact-find layering → paste box → legacy path).
1. Preserve advice-request state across fact-find imports: move all v200-written fields into one
   namespace (e.g. `F._ar = {…}`) and add it to `importProjectorJSON`'s preserve lists; make
   `v200StripSeamless` and the MCMA/TPD render-time normalisers non-destructive (recompute from
   flags, never rewrite stored text they can't restore).
2. Make word-bank matching tolerant + loud: normalise keys (trim, case-fold, collapse `·`/`-`,
   strip numbering) and add fuzzy/keyword aliases per entry; when a strategy misses the bank,
   surface it in the import-gaps report ("No tailored wording found for '<name>' — used free text").
3. Map areas 0/11/CARE in `V200_AREA_TO_BLOCK` (or handle them explicitly: openers → Introduction/
   Current Situation, entities → a new entities block, CARE philosophy → investment why).
4. Stop `v200ApplyScopeOut` clearing `so_militaryDB` (and any data-derived compliance exclusion) —
   only add exclusions from the AR, never remove derived ones.
5. Route the JSON paste box through `v200IsAdviceReq` like the smart drop does.
6. Show the captured importer warnings in the smart-drop summary; validate the type the user picked
   in the modal before applying (an AR without `strategies[]` should error, not no-op "success").

**P2 — needed for full scenario coverage**
7. Fill the ~20 recommendation-only word-bank entries (priority: smoker/pre-assessment factors,
   investment-bond retain/sell-down, the 5 thin cashflow entries, the 5 thin protection entries,
   and the two empty-strat super entries) with why/risks/alternatives.
8. Add the missing tailored entries: maternity/parental leave — **cashflow** (income drop,
   buffer, contribution continuation), plus any other cross-area life events you advise on
   (redundancy, career break, inheritance already partly covered).
9. Unify `F.csClientType` and `F.isExistingClient` into one flag driving all new/existing variants.
10. Build a proper pension/retirement-income strategy block (BLOCK_DEFS + STRAT_LIB + word-bank
    entries + replacement template) instead of bolt-on sentences in super with unfilled `$XXX`.
11. Add standard risks/alternatives for cashflow and admin, and why/alternatives for estate.
12. Fix `v200ApplyRisk` to accept joint/two-name risk matrices without the literal word "couple";
    fix `v200Fill` to replace all placeholders (accept `s.picks[]`).
13. Move `so_shares` derivation after the figures load; delete or implement the `F.assets` branches.

**P3 — robustness/maintenance**
14. Move compliance-sensitive hardcodes (FSG version, director names, SG rate, commission rates,
    referral statement, licensee details) into `DEFAULT_SETTINGS` so Admin edits them without a
    code change; add a "review by" date check.
15. Deactivate the insurance-commissions section when insurance is out of scope.
16. Inline docx.js + FileSaver like JSZip/pdf.js so export works offline.
17. Wire the word bank's `outcome` field into Summary-Outcomes (or delete `outcome`/`replace`);
    delete dead drop zones, `GOAL_LABELS`, and the discarded import-card builder.
18. Persist section order in the autosave snapshot.
19. Match clients on normalised names (nickname-tolerant) or an explicit client ID to avoid the
    "Rob vs Robert = different client" reset.
