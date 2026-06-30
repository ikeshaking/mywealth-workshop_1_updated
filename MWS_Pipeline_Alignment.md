# MWS Pipeline Alignment — Advice Request → Word Bank → SOA Generator → MWS Template

Status: **141 word-bank scenarios, 141/141 (100%) carry a trigger.** Area names are identical across the advice request, the word bank and the SOA generator's section toggles, and map 1:1 to the MWS SOA template's 'Our Advice' sub-sections.

| Advice-Request area | Word-Bank area | SOA-Generator section | MWS SOA Template section |
|---|---|---|---|
| 1 · Debt Management | Debt Management | Debt Management | Our Advice ▸ Debt Management Strategy |
| 2 · Investment Property | Investment Property | Investment Property | Our Advice ▸ Investment Property Strategy |
| 3 · Investment Bond | Investment Bond | Investment Bond Strategies + Product | Our Advice ▸ Investment Bond Strategies / Product |
| 4 · Investment Plan | Investment Plan | Investment Plan Strategies + Product | Our Advice ▸ Investment Plan Strategies / Product |
| 5 · Personal Superannuation | Personal Superannuation | Personal Superannuation (Superannuation Strategies) | Our Advice ▸ Superannuation Strategies / Products |
| 6 · Superannuation Contributions | Superannuation Contributions | Superannuation Contributions | Our Advice ▸ Superannuation Strategies |
| 7 · Personal Protection | Personal Protection | Personal Protection | Our Advice ▸ Insurance Strategies / Products |
| 8 · Cashflow Management & Budgeting | Cashflow Management & Budgeting | Cashflow Management & Budgeting | Our Advice ▸ Cashflow Recommendations |
| (assumed) Estate | Estate Planning | Estate Planning Strategies | Our Advice ▸ Estate Planning Strategies |
| (assumed) Administration | Administration Recommendations | Administration Recommendations | Our Advice ▸ Administration Recommendations |
| ownership layer | Entities (company/trust/SMSF) | subject framing | Subject framing throughout |
| product CARE pick | CARE Investment Philosophy | fires CARE wording | Summary-Outcomes · Alternatives · Replacement Implications |

## What syncs today (data contracts aligned)
- **Scope** — the advice request's scope-in area toggles and scope-out list use the same names as the generator's section toggles and the template's scope list, so they drive each other 1:1.
- **Triggers → tailored wording** — every tickable strategy is a real word-bank trigger; on trigger the word bank supplies the recommendation / why / outcome / risks / alternatives (and CARE replacement wording) for that section.
- **Products** — platform/product (super, investment, bond) and insurer/cover/action map to the template's Product sub-sections and Replacement Implications.
- **Fees** — the fee matrix maps to the template's Remuneration section.

## The one piece still to wire (the engine)
The advice-request JSON and the externalised word bank (`MWS_WordBank.json`) are the **inputs**. The SOA generator already contains all the matching sections, but it does **not yet read the advice-request JSON or the external word bank** — it currently fills wording from its own built-in library. To make "drop the advice request → the SOA auto-builds from the template with the triggered tailored wording, products and scope" real, the generator needs a small **loader/engine (v200)** that:
1. imports the advice-request JSON,
2. sets scope-in/out from it,
3. for each ticked trigger, pulls the word-bank scenario's wording into the matching template section (replacing `$XXX`/`[brackets]`),
4. fills the product, fee and risk tables from the structured fields.

This is the Phase-0 build. Everything it needs is now aligned and ready.

