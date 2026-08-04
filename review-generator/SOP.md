# Wealth Review Generator — Standard Operating Procedure (SOP)

**Tool:** `review-generator/Review_Generator.html`
**Audience:** Review Support Officers (RSO) and Advisers
**Purpose:** produce a client Wealth Review, run the meeting, and generate the file note / ROA — with
all client data kept on your machine (nothing is uploaded anywhere).

> Open the file in a normal browser tab (Chrome/Edge). If Export Word / uploads do nothing, you are
> viewing it inside a preview pane — save the `.html` and open it in a real browser tab.

---

## The four stages (top tabs)
**① Pre-Review Checklist → ② Generate Wealth Doc → ③ Review Meeting → ④ Post Review**

Work left to right. The left sidebar shows the sections of the active stage with a green ✓ when a
section has data; the top shows "X/Y sections complete".

---

## Stage ① — Pre-Review Checklist (RSO, before the meeting)

1. **Scope & Accounts** — set the number of clients (1 or 2), enter the client name(s), pick the
   adviser, and tick every account/product type the client holds. Only the relevant sections then
   appear.
2. **Work through each section** (General, Compliance, Retail/Held Super, SMSF, MCMA, Investment,
   Investment Bonds, Property, Loans, Insurance, Held Insurance, Adviser Fees). Use **Next**/**Back**
   or jump from the sidebar. Answer the prompts (Yes/No, amounts, dates, notes); follow-up questions
   appear when relevant.
   - **Per-client questions** show a field for each client.
   - **Computed flags** appear automatically — e.g. an SG shortfall, a partial-rollover threshold, or a
     fee discrepancy.
3. When done, click **Apply & generate wealth doc →**. This routes your answers into the wealth doc:
   action-type answers become **to-do items**, and data answers feed the matching section
   (beneficiaries → estate, contributions → super notes, etc.).

*(You can also upload a completed legacy `.xlsx` checklist — it will add to-dos and notes, but won't
repopulate the questionnaire.)*

---

## Stage ② — Generate Wealth Doc (RSO)

1. **Inputs & Imports (section 1–3):**
   - **Start:** load a saved `.json` draft, start a new blank client, or roll a client forward to a new
     review year. **Reset** clears everything.
   - **Last review = base:** drop last year's Wealth Review (`.docx`) — it pulls details, assets,
     income, goals, goal tracking and actions through as the base.
   - **This year's figures = overrides:** drop the current **platform PDFs** (HUB24 / BT Panorama /
     Macquarie auto-detect and route themselves), the **PTW** (`.xlsm`), and supporting docs. Uploaded
     files show as chips — click ✕ to remove one.
2. **Cover & Details:** confirm client/partner details; pick the **licensee/practice** from the
   dropdown (prefills ABN/AFSL/address); set adviser + insurance specialist, review type and date.
3. **Work through the sections** (Current Situation, Foundations & Estate, Goals, Goal Tracking,
   Portfolio, Asset Allocation, Insurance, Actions & Services, Rebalance). The **Actions** section
   carries the checklist to-dos plus a one-click **standard review to-do** set.
4. **Rebalance (draft):** upload the **CARE rebalance document** (`.docx` — the "Appendix to RoA"
   Word export). It reads the account banner, risk profile, the Current → Proposed → Change trades, the
   Recommended Implications variation table, the whole Investment Fees disclosure, the transactional
   costs and the indicative holdings — everything the rebalance ROA quotes. The CARE rebalance
   spreadsheet (`.xlsx`) still works but carries the trades only. Export from CARE as **Word, not PDF**:
   a PDF loses the table structure the reader relies on.
5. Use the **live preview** on the right (toggle with the **Preview** button) to see the Word document
   as you build it; **Export Word** downloads the `.docx`.

---

## Stage ③ — Review Meeting (Adviser, live with the client)

1. Open the **Dashboard** — net position, open action items, tracked changes, rebalance status, rating,
   beside the live document preview (use **Hide / show preview** as needed; **Present preview** for
   full screen).
2. **Edit live** — update assets/liabilities, notes, figures on any page during the meeting. A baseline
   is locked when you enter this tab, so only your in-meeting changes are tracked.
3. Everything you change flows automatically into the file note and ROA in the next stage.

---

## Stage ④ — Post Review (RSO/Adviser, after the meeting)

1. **Changes Made** — review the tracked changes since the baseline.
2. **Review File Note** — auto-drafted in the firm's After-Review-Summary format; edit on the left and
   watch the **live document preview** on the right. **Word** downloads it; **Copy** copies the text.
3. **Review ROA** — choose the type this review needs (or leave it on **Auto**, which follows what was
   imported), edit any wording, and download as Word (adds the branded header) or copy:

   | Type | When | What it produces |
   | --- | --- | --- |
   | **No change** | allocations still in line with the agreed risk profile | records that no rebalance is required and stops there |
   | **Rebalance** | switching back to the agreed asset allocation | Portfolio Rebalance + Recommended Implications + Investment Fees tables, straight from the CARE document |
   | **Partial rollover + rebalance** | part of an external fund is coming across | as above, with the partial rollover named in the action items |
   | **Full rollover + rebalance** | the external fund is being closed into the platform account | the Section 1–5 template: prior-advice table, recommended allocation table, transaction-cost disclosure and a signed acknowledgement |

   Works for a **CARE** account and an **index / Vanguard** menu alike — a CARE account gets the full
   Hub24 fee disclosure, an index account gets the transactional-cost table. The `[[TBL:…]]` markers in
   the editable text are where the real tables go; leave them in place and they render in the preview
   and in Word.
4. **Copy review summary + to-dos** — use this to paste the summary/actions into the client email flow
   (Donna) and bcc Xeppo for file-noting.
5. **Save draft** (`.json`) if you need to resume later.

---

## Good practice
- Save a draft before a big change or before **Reset**.
- Complete the checklist first — it does most of the data-routing for you.
- Confirm all three CRPs (Client 1, Client 2, Joint) are recorded.
- Treat computed flags (SG, rollover, fees) as prompts to check, not final figures.
- Client data never leaves the browser; drafts are files you control.

## Troubleshooting
- **Export Word / uploads do nothing** → open the saved `.html` in a real browser tab (not a preview
  pane); ensure you have internet the first time (the Word/PDF engines load from a CDN).
- **A report didn't auto-fill** → that format isn't wired yet; enter the figures manually and send a
  sample so it can be added.
- **Preview looks empty** → add the client in Cover & Details / import a report; the preview reflects
  the current data.
