# Associate allocations workbook

`build_workbook.py` turns the hand-maintained `Associate_Allocations_*.xlsx`
into a formula-driven workbook. It is a one-shot migration tool: run it once
against the legacy file, then work in the generated workbook.

```bash
pip install openpyxl
python build_workbook.py Associate_Allocations_14.xlsx Associate_Allocations_Automated.xlsx
```

The generated file contains client names, so it is deliberately **not**
committed to this repository — only the builder is.

## What the legacy file did by hand

| Legacy tab | Hand work |
|---|---|
| `SOA Allocation 2026` | A block per week, typed by hand: week number, month, `27th - 31st` label, then one row per client file underneath. Week 36 onwards did not exist yet. |
| | `Client Type` doubled as a status column (`Meeting Cancelled`, `Reschedule`, `On Hold`). |
| | `SOA Date` held either a date or free text (`TBC`, `No Appt`, `No app`, `asap`, …) — 95 of 462 rows were text, so the column could not be sorted or filtered on date. |
| | Availability was recorded as filler rows (`On AL`, `Away this week`, `Not available`) that occupied an allocation slot. |
| | Nothing counted the load: no per-associate, per-division or per-week totals. The 2025 tab had a hand-typed `Count` column instead. |
| `Peer Review Allocations` | The round robin was typed ahead by hand, ~500 rows deep. Changing who is in the rotation meant retyping every remaining row, and nothing stopped an associate reviewing their own SOA. |
| Both | Names differed between tabs (`Ikesha` vs `Ikesha King`), and dropdown lists were hardcoded per column. |

## What the generated workbook does instead

- **Weeks** — every week of the year is generated from one anchor date
  (`Setup!B6`): week number, Monday/Friday, month, `27th - 31st` label, public
  holidays falling in the week, working days, allocated count, capacity,
  capacity lost to leave and spare capacity.
- **Allocations** — one flat row per client file, filterable and sortable.
  Week metadata, the per-associate count within the week, the peer reviewer and
  a `Checks` column are all derived.
- **Peer review round robin** — the *n*th SOA of the year goes to the *n*th
  name in the rotation *with the author removed*, so nobody reviews their own
  work and a skipped turn is not simply dumped on whoever follows a busy
  writer. Membership is one `Y`/`N` per person on `Setup`; an override column
  handles one-off swaps, and the `Peer Review` tab shows the count per reviewer
  so any drift is visible.
- **Checks** — flags on-leave allocations, over-capacity associates, missing
  adviser, duplicate client in a week, SOA dates before the week or more than
  90 days out, reviewer-is-author, and associates not on the roster.
- **Dashboard** — associate × week load matrix against each person's weekly
  number, plus year-to-date totals by associate, division and adviser.
- **Week View** — the familiar one-column-per-associate view of a single week,
  rebuilt from the register.
- **Setup** — roster, dropdown lists, division caps, public holidays and the
  leave register. The only tab that needs maintaining.

Everything the legacy file held is carried across: 2026 allocations into the
register, 2025 / peer review / RS-cancelled tabs as read-only history, week
banners onto the `Weeks` note column, and `On AL` / `Away` rows into the leave
register.

## Implementation notes

- Only pre-2007 worksheet functions are used (`COUNTIFS`, `SUMIF`,
  `SUMPRODUCT`, `INDEX`/`MATCH`, `IFERROR`, `TEXT`, `DATE`), so the workbook
  behaves the same in Excel desktop, Excel for the web and Google Sheets. No
  macros, no dynamic-array functions, no `_xlfn.` prefixes.
- Dropdowns and every cross-tab formula go through workbook-level defined
  names (`Associates`, `Reviewers`, `AllocWeek`, `WeekStart`, …), so ranges can
  grow without rewriting formulas.
- Helper columns (`Allocations` X:AB, `Weeks` P:V) are hidden and shaded; they
  hold the sequence number, the raw check string and the lookup keys that let
  the views work without array formulas.
- The register carries formulas to row 900 (~700 SOAs a year plus headroom).
  Dragging the last row down extends them.
- After changing the builder, re-run
  `python /root/.claude/skills/xlsx/scripts/recalc.py <output.xlsx> 540` to
  confirm every formula still evaluates cleanly.
