# Advice Document Generators

The combined ROA & Advice Doc Generator (`ROA_Generator_v8.a_5_5.html`) has been split into
four dedicated, single-purpose generators. Each is a standalone HTML file — open it in a
browser, no install needed.

| File | Produces |
|------|----------|
| `ROA_Generator.html` | Record of Advice (ROA) — compliant, detailed |
| `Strategy_Paper_Generator.html` | Strategy Paper — high-level strategy discussion, modelling & portfolio papers |
| `NAA_Generator.html` | No Advice Acknowledgement (NAA) — execution-only instruction |
| `NWF_Generator.html` | Next Wealth Focus (NWF) — alternative future scenario alongside the SOA |

Each generator only produces its own document type — the document-type tabs from the combined
tool have been removed. Open the matching file for the document you need.

## How-to guide (SOP)

Every generator has a **📘 How to** tab in the top navigation with a full standard operating
procedure: purpose & scope, before-you-start checklist, detailed step-by-step procedure,
pre-export review checklist, saving/JSON workflow, file-naming conventions, Admin setup and
troubleshooting.

## Important — always download a JSON copy

Before closing the page, click **💾 Save JSON** (in the top bar, and on the Preview page).
This downloads a `.json` working file containing everything entered so far, which can be
re-opened later with **📂 Load JSON** (or by dragging the file onto the page) to keep working.

**The JSON file is named exactly the same as the exported Word document — it just ends in
`.json`** (e.g. `260722;Smith;J;Super-ROA;220726.docx` ↔ `260722;Smith;J;Super-ROA;220726.json`,
or `NAA_Jane_Citizen_2026-07-22.docx` ↔ `NAA_Jane_Citizen_2026-07-22.json`). Save it in the
client's folder next to the Word file.

The in-browser auto-draft is a convenience only (it lives on one device and can be lost);
the JSON file is the reliable copy. A saved JSON records which generator made it — loading
it into the wrong generator shows a message pointing to the right one.

## Notes for maintainers

- All four files are built from the same engine (the original v8.a.5.5 code base) with the
  document type fixed per file (`FIXED_DOC_TYPE`), so shared fixes can be re-applied to each.
- Auto-draft localStorage keys are per generator (`roa_draft_v1`, `roa_draft_v1_strategy`,
  `roa_draft_v1_naa`, `roa_draft_v1_nwf`) so the four tools don't overwrite each other's
  drafts when hosted on the same domain.
- Admin settings (advisers, licensee details, default dates) work the same in every file
  and can still be exported/imported as `roa_settings.json`.
- The Admin **Suggested Wording** editor is scoped per generator: the ROA build lists only
  ROA scenarios, the Strategy build edits Strategy Paper titles/intros/sections
  (`SETTINGS.strategyWordingOverrides`), the NAA build edits the transaction-type templates
  with tokens like `{amt}`/`{acct}` (`SETTINGS.naaWordingOverrides`), and the NWF build edits
  the scenario titles/intros with a `{names}` token (`SETTINGS.nwfWordingOverrides`).
  Overrides ride along with exported settings files and apply when a document is seeded.
