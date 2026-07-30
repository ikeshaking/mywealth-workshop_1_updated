#!/usr/bin/env python3
"""Build the single-file Associate Allocations dashboard.

Reuses the workbook builder's migration of the legacy spreadsheet, then
injects the result into dashboard_template.html as embedded JSON. The output
is one self-contained .html file - no CDN, no fonts, no network calls - so it
opens from a local drive, a shared folder, or any static host.

Usage:
    python build_dashboard.py SOURCE.xlsx OUTPUT.html
"""

from __future__ import annotations

import datetime as dt
import json
import sys
from pathlib import Path

import build_workbook as B

HERE = Path(__file__).parent


def to_iso(value):
    if isinstance(value, dt.datetime):
        return value.date().isoformat()
    if isinstance(value, dt.date):
        return value.isoformat()
    return ""


def build_state(src: str) -> dict:
    raw, week_notes, leave, _hist25, _peer, _cancelled = B.parse_legacy(src)
    allocations = [B.normalise(a) for a in raw]

    leave_rows = []
    for (assoc, week), reason in leave.items():
        start = B.WEEK_ANCHOR + dt.timedelta(days=7 * (week - 1))
        leave_rows.append({
            "who": assoc,
            "from": start.isoformat(),
            "to": (start + dt.timedelta(days=4)).isoformat(),
            "reason": f"{reason} (from the 2026 tab, week {week})",
        })
    leave_rows.sort(key=lambda r: (r["who"], r["from"]))
    # Merge runs of consecutive weeks for the same person.
    merged: list[dict] = []
    for row in leave_rows:
        prev = merged[-1] if merged else None
        if (prev and prev["who"] == row["who"]
                and dt.date.fromisoformat(prev["to"]) + dt.timedelta(days=3)
                == dt.date.fromisoformat(row["from"])):
            prev["to"] = row["to"]
        else:
            merged.append(row)

    return {
        "meta": {
            "year": 2026,
            "anchor": B.WEEK_ANCHOR.isoformat(),
            "weeks": B.N_WEEK_ROWS,
            "source": Path(src).name,
        },
        "roster": [
            {"short": short, "full": full, "role": role, "active": active == "Y",
             "cap": cap, "rota": rota == "Y", "notes": notes}
            for short, full, role, active, cap, rota, notes in B.ROSTER
        ],
        "advisers": B.ADVISERS,
        "divisions": B.DIVISIONS,
        "clientTypes": B.CLIENT_TYPES,
        "progress": B.PROGRESS,
        "appt": B.APPT_STATUS,
        "reviewStatus": B.REVIEW_STATUS,
        "caps": [{"division": d, "soa": soa, "imp": imp}
                 for d, soa, imp in B.DIVISION_CAPS],
        "holidays": [{"date": d.isoformat(), "name": name, "region": region}
                     for d, name, region in B.HOLIDAYS],
        "leave": merged,
        "weekNotes": {str(k): v for k, v in week_notes.items()},
        "allocations": [
            {
                "id": i + 1,
                "week": a["week"],
                "client": a["client"],
                "assoc": a["assoc"],
                "type": a["type"],
                "division": a["division"],
                "adviser": a["adviser"],
                "soaDate": to_iso(a["soa_date"]),
                "appt": a["appt"],
                "progress": a["progress"],
                "notes": a["notes"],
                "link": "",
                "reviewOverride": "",
                "reviewStatus": "",
                "reviewedOn": "",
                "comments": "",
            }
            for i, a in enumerate(allocations)
        ],
    }


def main():
    src, out = sys.argv[1], sys.argv[2]
    state = build_state(src)
    template = (HERE / "dashboard_template.html").read_text()

    # `</` would close the host <script> element early; < is the same
    # character to JSON.parse and inert to the HTML parser.
    seed = json.dumps(state, separators=(",", ":")).replace("</", "<\\u002f")
    html = template.replace("__SEED__", seed)
    Path(out).write_text(html)

    print(f"allocations : {len(state['allocations'])}")
    print(f"roster      : {len(state['roster'])} "
          f"({sum(1 for p in state['roster'] if p['active'])} active, "
          f"{sum(1 for p in state['roster'] if p['active'] and p['rota'])} in rotation)")
    print(f"leave       : {len(state['leave'])}")
    print(f"holidays    : {len(state['holidays'])}")
    print(f"written     : {out} ({Path(out).stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
