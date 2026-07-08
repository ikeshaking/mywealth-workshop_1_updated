# SOA Toolchain — Retirement / Pension (TTR & Account‑Based Pension)

Three synced artifacts produce a My Wealth Solutions Statement of Advice:

| File | Role |
|------|------|
| `SOA_Words_MasterList.json` | **Source of truth** for all tailored wording (the "word bank"). |
| `SOA_Words_MasterList.docx` | Human‑readable mirror of the JSON (regenerated from it). |
| `Advice_Request_Builder.html` | Builds the advice‑request JSON; each tick maps to a word‑bank module. |
| `SOA_Generator_v192.html` | The SOA app. Holds a live copy of the word bank and the render engine. |

> **v192 is a merge of two independent edit streams** (see "Merge" below). Use `SOA_Generator_v192.html` — it is the only version that contains **both** the retirement‑projection engine and the TTR/ABP advice‑request engine.

## Governance / sync rules (unchanged)

- **Wording flows JSON → generator.** Edit `SOA_Words_MasterList.json`, keep the `.docx` mirror in step, then **drop the JSON onto the generator** (smart‑drop: a full masterlist `{meta, areas:[…]}` *replaces* the word bank; a flat `{"Area::Name":{…}}` fragment *merges*).
- **Never hand‑edit the generator's `V200_WORD_BANK`.** That caused the earlier drift.
- A Builder tick matches a module by `Area :: name` (`builderArea` + `trigger`); `triggerPhrases` are the free‑text fallback; `builderTick:true` links the tick.

## What changed for Retirement/Pension readiness

**Masterlist (wording — the safe side):**
- Enriched Area 5 · *Commence an Account‑Based Pension and draw an income* (its `outcomesLine` was empty): added the "how long your money will last / withdraw in perpetuity" outcome, plus fuller `why` (tax‑free over 60, Reserves/sequencing‑risk) and `risks` (mandatory minimum drawdowns, sequencing/longevity risk, estimates‑only). Trigger, tick, builderArea, triggerPhrases and figures unchanged.
- `.docx` regenerated from the JSON so the two stay in step.
- Every other retirement trigger (TTR, recontribution, seamless transfer, defer‑rebalance CGT, reversionary, Age Pension, bring‑forward NCC, downsizer, Area 4 draw‑income) already existed and is unchanged.

**Generator engine (`SOA_Generator_v191.html`) — gated on `F.retirementSOA`, never touches the word bank:**
- New `v191` helper: auto‑fills pension **income** (p.a./p.m.) and **starting balance** from existing state (`F.proj` + the retirement income‑draw goal); killing the `$XXX` placeholders. Falls back to a max‑10% TTR estimate; leaves `$XXX` when nothing is known.
- **Reaching Your Targets** (Retirement SOA): appends *Existing Benefits to Draw Income From*, *Desired Pension Withdraw income* and an *Average Return* assumption **alongside** the accumulation rows (BOTH).
- **Projected Outcomes** (Retirement SOA): keeps the Pathway‑to‑Wealth table **and appends** the "how long your money will last" longevity narrative — in both the on‑screen preview and the Word export.
- Accumulation SOAs are unaffected (rows/tail hidden).

The "How Long Projector" annexure remains a spreadsheet‑snapshot placeholder (as in the sample SOAs) — no in‑app longevity compute engine.

## Merge (v192)

`SOA_Generator_v192.html` is a clean 3‑way merge of two edit streams that were made against the same base (`v190_38r`) and touch **disjoint** code:

- **Retirement‑projection engine** (state + rendering, lines ~2045–13012): the `v191` figure auto‑fill, Reaching‑Your‑Targets income rows and Projected‑Outcomes longevity tail described above.
- **TTR/ABP advice‑request engine** (v200 engine, lines ~20277–21912): a tolerant word‑bank resolver (`v200BankResolve` / `_v200BankAreasFor`) that copes with a merged "Personal Superannuation & Contributions" builder area, `v200BlockForStrategy` routing, and **auto scope‑in of TTR/ABP** plus **auto‑adding the TTR review‑meeting goal** for an existing client on a retirement SOA. The matching standing‑rule module lives in the masterlist as *area 0 · "TTR goal — commence a TTR to supplement income"*.

The masterlist JSON now carries **both** changes (164 modules: the area‑0 TTR goal + the enriched ABP module) and the generator's word bank has been re‑synced to it (drop reports *1 added, 163 updated, 0 removed*). Verified with headless Chromium: both feature sets work; no page errors.

## Verifying a change

1. `python3 -c "import json;json.load(open('SOA_Words_MasterList.json'))"` — JSON valid.
2. Open `SOA_Generator_v191.html`, drop the JSON (smart‑drop) — expect "N updated" with 0 removed.
3. Pick **Retirement SOA**, enter a super balance + a retirement income‑draw goal → Reaching Your Targets gains the income rows and Projected Outcomes gains the longevity tail, both auto‑filled.
