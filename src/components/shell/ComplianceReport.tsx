"use client";

import content from "@/lib/py/contentIndex.json";

/* ------------------------------------------------------------------ *
 * Content index typing
 * ------------------------------------------------------------------ */

type ContentModule = { id: string; title: string };
type ContentMilestone = { key: string; title: string };
type ContentQuarter = {
  id: string;
  number: number;
  title: string;
  modules?: ContentModule[];
  milestones?: ContentMilestone[];
};
type ContentCompetencyItem = { key: string; label: string };
type ContentCompetencyGroup = { label: string; items?: ContentCompetencyItem[] };
type ContentIndex = {
  quarters?: ContentQuarter[];
  competencies?: ContentCompetencyGroup[];
};

const CONTENT = content as unknown as ContentIndex;
const QUARTERS: ContentQuarter[] = CONTENT.quarters ?? [];
const COMPETENCIES: ContentCompetencyGroup[] = CONTENT.competencies ?? [];

/* ------------------------------------------------------------------ *
 * Program requirements (regulatory minimums)
 * ------------------------------------------------------------------ */

const MIN_WORK_HOURS = 1500;
const MIN_STRUCTURED_HOURS = 100;
const MIN_TOTAL_HOURS = 1600;

/** Quarter keys used by the hours ledger (Q5/Q6 are the extension quarters). */
const HOUR_QUARTERS = ["q1", "q2", "q3", "q4", "q5", "q6"] as const;
/** Quarters that carry a formal competency assessment. */
const COMPETENCY_QUARTERS = ["q1", "q2", "q3", "q4"] as const;

const AUDIT_ROW_CAP = 250;
const DASH = "—";

/* ------------------------------------------------------------------ *
 * Narrow, defensive readers over the opaque state object
 * ------------------------------------------------------------------ */

type Dict = Record<string, unknown>;

function asDict(value: unknown): Dict {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Dict)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value).trim();
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function asBool(value: unknown): boolean {
  return value === true || value === "true" || value === 1;
}

/** Render a value, falling back to an em-dash when empty/missing. */
function show(value: unknown): string {
  const text = asText(value);
  return text === "" ? DASH : text;
}

function yesNo(value: unknown): string {
  return asBool(value) ? "Yes" : "No";
}

function formatDate(value: unknown): string {
  const raw = asText(value);
  if (raw === "") return DASH;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: unknown): string {
  const raw = asText(value);
  if (raw === "") return DASH;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return `${parsed.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}, ${parsed.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function formatHours(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return rounded.toLocaleString("en-AU", { maximumFractionDigits: 1 });
}

/* ------------------------------------------------------------------ *
 * Styles — everything scoped under .pyrep so nothing leaks
 * ------------------------------------------------------------------ */

const CSS = `
.pyrep {
  background: #ffffff;
  color: #16242e;
  font-family: 'Nunito Sans', Nunito, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  line-height: 1.5;
  max-width: 1040px;
  margin: 0 auto;
  padding: 28px 32px 56px;
  box-sizing: border-box;
}
.pyrep * { box-sizing: border-box; }
.pyrep h1, .pyrep h2, .pyrep h3, .pyrep h4 {
  font-family: Georgia, 'Times New Roman', serif;
  color: #0C2E3F;
  margin: 0;
  font-weight: 700;
}
.pyrep h1 { font-size: 26px; letter-spacing: -0.01em; }
.pyrep h2 { font-size: 18px; }
.pyrep h3 { font-size: 15px; }
.pyrep h4 { font-size: 13px; }
.pyrep p { margin: 0; }

.pyrep-header {
  border-top: 4px solid #0C2E3F;
  border-bottom: 1px solid #d4dde7;
  padding: 18px 0 20px;
  margin-bottom: 26px;
}
.pyrep-eyebrow {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: #5b7285;
  font-weight: 700;
  margin-bottom: 8px;
}
.pyrep-subject {
  font-size: 15px;
  color: #0C2E3F;
  margin-top: 6px;
  font-weight: 600;
}
.pyrep-metagrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px 24px;
  margin-top: 18px;
}
.pyrep-meta-label {
  font-size: 9.5px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #5b7285;
  font-weight: 700;
}
.pyrep-meta-value { font-size: 13px; color: #16242e; }

.pyrep-section { margin-top: 30px; page-break-before: auto; }
.pyrep-section-head {
  border-bottom: 2px solid #0C2E3F;
  padding-bottom: 6px;
  margin-bottom: 14px;
}
.pyrep-note {
  font-size: 11px;
  color: #5b7285;
  margin-top: 8px;
}
.pyrep-muted { color: #7b8d9b; font-style: italic; font-size: 12px; margin: 6px 0 2px; }

.pyrep table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #d4dde7;
  margin-top: 8px;
}
.pyrep caption {
  caption-side: top;
  text-align: left;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 700;
  color: #0C2E3F;
  padding: 10px 0 4px;
}
.pyrep th {
  text-align: left;
  background: #eef3f8;
  color: #0C2E3F;
  font-size: 9.5px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  padding: 9px 12px;
  border-bottom: 1px solid #d4dde7;
  vertical-align: bottom;
}
.pyrep td {
  padding: 9px 12px;
  font-size: 12px;
  border-bottom: 1px solid #e6edf4;
  vertical-align: top;
}
.pyrep tbody tr:last-child td { border-bottom: none; }
.pyrep .pyrep-num { text-align: right; white-space: nowrap; }
.pyrep .pyrep-center { text-align: center; }
.pyrep .pyrep-nowrap { white-space: nowrap; }
.pyrep .pyrep-total td {
  border-top: 2px solid #0C2E3F;
  font-weight: 700;
  background: #f6f9fc;
}
.pyrep .pyrep-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  white-space: nowrap;
}

.pyrep-quarter {
  margin-top: 24px;
  padding-top: 14px;
  border-top: 1px solid #d4dde7;
}
.pyrep-quarter-title { display: flex; align-items: baseline; gap: 10px; }
.pyrep-badge {
  display: inline-block;
  background: #0C2E3F;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 3px 9px;
  border-radius: 3px;
  font-family: 'Nunito Sans', Nunito, sans-serif;
}

.pyrep-signatures {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
  margin-top: 18px;
}
.pyrep-sigbox {
  border: 1px solid #d4dde7;
  padding: 16px 18px 20px;
}
.pyrep-sigrole {
  font-size: 9.5px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 700;
  color: #5b7285;
  margin-bottom: 12px;
}
.pyrep-sigline { margin-top: 20px; }
.pyrep-sigrule {
  border-bottom: 1px solid #16242e;
  height: 26px;
}
.pyrep-siglabel {
  font-size: 9.5px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #5b7285;
  font-weight: 700;
  padding-top: 5px;
}
.pyrep-declaration {
  font-size: 12px;
  line-height: 1.65;
  border-left: 3px solid #0C2E3F;
  padding: 4px 0 4px 14px;
  margin-top: 6px;
}
.pyrep-footer {
  margin-top: 34px;
  padding-top: 12px;
  border-top: 1px solid #d4dde7;
  font-size: 10.5px;
  color: #5b7285;
}

/* On-screen mobile only. The document is laid out for A4, so on a phone we let
   each table scroll inside itself rather than pushing the whole page sideways.
   Scoped to screen so printed output is completely unaffected. */
@media screen and (max-width: 760px) {
  .pyrep { padding: 14px; max-width: 100%; overflow-wrap: break-word; }
  .pyrep table {
    display: block;
    max-width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .pyrep th, .pyrep td { white-space: normal; }
}

@media print {
  .pyrep {
    max-width: none;
    padding: 0;
    font-size: 11px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .pyrep * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  @page { margin: 14mm; }
  .pyrep tr { page-break-inside: avoid; break-inside: avoid; }
  .pyrep thead { display: table-header-group; }
  .pyrep tfoot { display: table-footer-group; }
  .pyrep h1, .pyrep h2, .pyrep h3, .pyrep h4 { page-break-after: avoid; break-after: avoid; }
  .pyrep-section { page-break-before: auto; }
  .pyrep-section-break { page-break-before: always; break-before: page; }
  .pyrep-quarter { page-break-inside: avoid; break-inside: avoid; }
  .pyrep-sigbox { page-break-inside: avoid; break-inside: avoid; }
  .pyrep-signatures { page-break-inside: avoid; break-inside: avoid; }
  .pyrep td, .pyrep th { padding: 6px 8px; }
}
`;

/* ------------------------------------------------------------------ *
 * Small presentational helpers
 * ------------------------------------------------------------------ */

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="pyrep-meta-label">{label}</div>
      <div className="pyrep-meta-value">{value}</div>
    </div>
  );
}

function SectionHeading({ index, title }: { index: string; title: string }) {
  return (
    <div className="pyrep-section-head">
      <div className="pyrep-eyebrow">Section {index}</div>
      <h2>{title}</h2>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */

export function ComplianceReport({
  state,
  candidateName,
  supervisorName,
  generatedAt,
}: {
  state: Record<string, unknown>;
  candidateName: string;
  supervisorName: string;
  generatedAt: string;
}) {
  const safeState = asDict(state);
  const profile = asDict(safeState.profile);
  const hours = asDict(safeState.hours);
  const milestones = asDict(safeState.milestones);
  const modulesDone = asDict(safeState.modulesDone);
  const signoffState = asDict(safeState.signoffState);
  const competencyScores = asDict(safeState.competencyScores);
  const auditLog = asArray(safeState.auditLog);

  const displayCandidate =
    asText(candidateName) || asText(profile.candidateName) || DASH;
  const displaySupervisor =
    asText(supervisorName) || asText(profile.supervisorName) || DASH;

  /* ---- hours ---- */
  const hourRows = HOUR_QUARTERS.map((key, i) => {
    const entry = asDict(hours[key]);
    const work = asNumber(entry.work);
    const structured = asNumber(entry.structured);
    return { key, label: `Q${i + 1}`, work, structured, total: work + structured };
  });
  const totalWork = hourRows.reduce((sum, r) => sum + r.work, 0);
  const totalStructured = hourRows.reduce((sum, r) => sum + r.structured, 0);
  const grandTotal = totalWork + totalStructured;

  const complianceRows = [
    {
      label: "Work (professional practice) hours",
      required: MIN_WORK_HOURS,
      actual: totalWork,
      requirement: `Minimum ${MIN_WORK_HOURS.toLocaleString("en-AU")} hours`,
    },
    {
      label: "Structured training hours",
      required: MIN_STRUCTURED_HOURS,
      actual: totalStructured,
      requirement: `Minimum ${MIN_STRUCTURED_HOURS.toLocaleString("en-AU")} hours`,
    },
    {
      label: "Total Professional Year hours",
      required: MIN_TOTAL_HOURS,
      actual: grandTotal,
      requirement: `${MIN_TOTAL_HOURS.toLocaleString("en-AU")} hours`,
    },
  ];

  /* ---- statutory gates ---- */
  const statutoryRows = [
    {
      label: "ASIC Financial Adviser Exam passed",
      met: asBool(profile.examPassed),
      evidenceLabel: "Date passed",
      evidence: formatDate(profile.examDate),
    },
    {
      label: "Approved qualification (degree) verified",
      met: asBool(profile.degreeVerified),
      evidenceLabel: "Institution",
      evidence: show(profile.degreeInstitution),
    },
    {
      label: "Financial Advisers Register updated — provisional relevant provider",
      met: asBool(profile.farUpdatedProvisional),
      evidenceLabel: "Recorded on FAR",
      evidence: asBool(profile.farUpdatedProvisional) ? "Yes" : DASH,
    },
    {
      label: "Financial Advisers Register updated — full relevant provider",
      met: asBool(profile.farUpdatedFullProvider),
      evidenceLabel: "Recorded on FAR",
      evidence: asBool(profile.farUpdatedFullProvider) ? "Yes" : DASH,
    },
    {
      label: "Final Professional Year certificate issued",
      met: asBool(profile.finalCertificateIssued),
      evidenceLabel: "Date issued",
      evidence: formatDate(profile.finalCertificateDate),
    },
  ];

  /* ---- audit ---- */
  const auditTotal = auditLog.length;
  const auditRows = auditLog.slice(0, AUDIT_ROW_CAP).map((entry, i) => {
    const row = asDict(entry);
    return {
      id: asText(row.id) || `audit-${i}`,
      ts: formatDateTime(row.ts),
      actor: show(row.actor),
      cat: show(row.cat),
      action: show(row.action),
      detail: show(row.detail),
    };
  });
  const auditTruncated = auditTotal > AUDIT_ROW_CAP;

  const quarterStarts: Array<[string, unknown]> = [
    ["Q1 start", profile.q1Start],
    ["Q2 start", profile.q2Start],
    ["Q3 start", profile.q3Start],
    ["Q4 start", profile.q4Start],
  ];

  return (
    <div className="pyrep">
      <style>{CSS}</style>

      {/* ---------------------------------------------------------- 1. Header */}
      <header className="pyrep-header">
        <div className="pyrep-eyebrow">MyWealth Solutions · Licensee compliance record</div>
        <h1>Professional Year {DASH} Record of Completion</h1>
        <p className="pyrep-subject">
          {displayCandidate}
          {asText(profile.year) ? ` · Program year ${asText(profile.year)}` : ""}
        </p>

        <div className="pyrep-metagrid">
          <MetaItem label="Candidate" value={displayCandidate} />
          <MetaItem label="Supervisor" value={displaySupervisor} />
          <MetaItem label="Supervisor FAR number" value={show(profile.supervisorFar)} />
          <MetaItem label="Licensee" value={show(profile.licensee)} />
          <MetaItem label="AFSL" value={show(profile.afsl)} />
          <MetaItem label="Program year" value={show(profile.year)} />
          <MetaItem label="Start date" value={formatDate(profile.startDate)} />
          <MetaItem label="Completion target" value={formatDate(profile.completionTarget)} />
          <MetaItem
            label="Current quarter"
            value={
              asNumber(profile.currentQuarter) > 0
                ? `Q${asNumber(profile.currentQuarter)}`
                : DASH
            }
          />
          {quarterStarts.map(([label, value]) => (
            <MetaItem key={label} label={label} value={formatDate(value)} />
          ))}
        </div>

        <p className="pyrep-note">Generated {formatDateTime(generatedAt)}</p>
      </header>

      {/* ------------------------------------------ 2. Statutory requirements */}
      <section className="pyrep-section">
        <SectionHeading index="1" title="Statutory requirements" />
        <table>
          <caption>Mandatory gates under the Corporations Act professional standards</caption>
          <thead>
            <tr>
              <th scope="col">Requirement</th>
              <th scope="col" className="pyrep-center">Met</th>
              <th scope="col">Evidence</th>
              <th scope="col">Detail</th>
            </tr>
          </thead>
          <tbody>
            {statutoryRows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td className="pyrep-center pyrep-nowrap">
                  <strong>{row.met ? "Yes" : "No"}</strong>
                </td>
                <td className="pyrep-nowrap">{row.evidenceLabel}</td>
                <td>{row.evidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="pyrep-note">
          &ldquo;Met&rdquo; is recorded as Yes/No in text so the record remains unambiguous
          when printed in black and white.
        </p>
      </section>

      {/* ------------------------------------------------- 3. Hours summary */}
      <section className="pyrep-section">
        <SectionHeading index="2" title="Hours summary" />
        <table>
          <caption>Recorded hours by quarter</caption>
          <thead>
            <tr>
              <th scope="col">Quarter</th>
              <th scope="col" className="pyrep-num">Work hours</th>
              <th scope="col" className="pyrep-num">Structured training hours</th>
              <th scope="col" className="pyrep-num">Quarter total</th>
            </tr>
          </thead>
          <tbody>
            {hourRows.map((row) => (
              <tr key={row.key}>
                <td>{row.label}</td>
                <td className="pyrep-num">{formatHours(row.work)}</td>
                <td className="pyrep-num">{formatHours(row.structured)}</td>
                <td className="pyrep-num">{formatHours(row.total)}</td>
              </tr>
            ))}
            <tr className="pyrep-total">
              <td>Total</td>
              <td className="pyrep-num">{formatHours(totalWork)}</td>
              <td className="pyrep-num">{formatHours(totalStructured)}</td>
              <td className="pyrep-num">{formatHours(grandTotal)}</td>
            </tr>
          </tbody>
        </table>

        <table>
          <caption>Compliance against program requirements</caption>
          <thead>
            <tr>
              <th scope="col">Measure</th>
              <th scope="col">Requirement</th>
              <th scope="col" className="pyrep-num">Required</th>
              <th scope="col" className="pyrep-num">Actual</th>
              <th scope="col" className="pyrep-num">Variance</th>
              <th scope="col" className="pyrep-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {complianceRows.map((row) => {
              const met = row.actual >= row.required;
              const variance = row.actual - row.required;
              return (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{row.requirement}</td>
                  <td className="pyrep-num">{formatHours(row.required)}</td>
                  <td className="pyrep-num">{formatHours(row.actual)}</td>
                  <td className="pyrep-num">
                    {variance >= 0 ? `+${formatHours(variance)}` : formatHours(variance)}
                  </td>
                  <td className="pyrep-center pyrep-nowrap">
                    <strong>{met ? "Met" : "Not met"}</strong>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* ------------------------------------------------ 4. Quarter detail */}
      <section className="pyrep-section pyrep-section-break">
        <SectionHeading index="3" title="Quarter detail" />
        {QUARTERS.length === 0 ? (
          <p className="pyrep-muted">None recorded</p>
        ) : (
          QUARTERS.map((quarter) => {
            const qMilestones = quarter.milestones ?? [];
            const qModules = quarter.modules ?? [];
            return (
              <div className="pyrep-quarter" key={quarter.id}>
                <div className="pyrep-quarter-title">
                  <span className="pyrep-badge">Q{quarter.number}</span>
                  <h3>{quarter.title}</h3>
                </div>

                {qMilestones.length === 0 ? (
                  <>
                    <h4 style={{ marginTop: 12 }}>Milestones</h4>
                    <p className="pyrep-muted">None recorded</p>
                  </>
                ) : (
                  <table>
                    <caption>Milestones</caption>
                    <thead>
                      <tr>
                        <th scope="col">Milestone</th>
                        <th scope="col" className="pyrep-center">Complete</th>
                        <th scope="col">Evidence / proof</th>
                        <th scope="col" className="pyrep-nowrap">Proof date</th>
                        <th scope="col">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {qMilestones.map((milestone) => {
                        const record = asDict(milestones[milestone.key]);
                        return (
                          <tr key={milestone.key}>
                            <td>{milestone.title}</td>
                            <td className="pyrep-center pyrep-nowrap">
                              {yesNo(record.done)}
                            </td>
                            <td>{show(record.proof)}</td>
                            <td className="pyrep-nowrap">{formatDate(record.proofDate)}</td>
                            <td>{show(record.note)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {qModules.length === 0 ? (
                  <>
                    <h4 style={{ marginTop: 12 }}>Training modules</h4>
                    <p className="pyrep-muted">None recorded</p>
                  </>
                ) : (
                  <table>
                    <caption>Training modules</caption>
                    <thead>
                      <tr>
                        <th scope="col">Module</th>
                        <th scope="col" className="pyrep-center">Completed</th>
                        <th scope="col" className="pyrep-num">Hours</th>
                        <th scope="col">Assessment result</th>
                        <th scope="col" className="pyrep-center">Signed off</th>
                        <th scope="col">Signed by</th>
                        <th scope="col" className="pyrep-nowrap">Signed at</th>
                      </tr>
                    </thead>
                    <tbody>
                      {qModules.map((module) => {
                        const record = asDict(modulesDone[module.id]);
                        const assessment = asDict(record.assessment);
                        const signoff = asDict(signoffState[module.id]);
                        const resultText = asText(assessment.result);
                        const hasAssessment =
                          resultText !== "" ||
                          asText(assessment.format) !== "" ||
                          asText(assessment.date) !== "" ||
                          asBool(assessment.passed);
                        const assessmentCell = !hasAssessment
                          ? DASH
                          : resultText !== ""
                            ? `${resultText}${asBool(assessment.passed) ? " (Passed)" : ""}`
                            : asBool(assessment.passed)
                              ? "Passed"
                              : "Not passed";
                        const signedBy =
                          asText(signoff.signedBy) || asText(signoff.name);
                        const signedAt =
                          asText(signoff.signedAt) || asText(signoff.date);
                        return (
                          <tr key={module.id}>
                            <td>{module.title}</td>
                            <td className="pyrep-center pyrep-nowrap">{yesNo(record.done)}</td>
                            <td className="pyrep-num">{formatHours(asNumber(record.hours))}</td>
                            <td>{assessmentCell}</td>
                            <td className="pyrep-center pyrep-nowrap">{yesNo(signoff.signed)}</td>
                            <td>{show(signedBy)}</td>
                            <td className="pyrep-nowrap">{formatDate(signedAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })
        )}
      </section>

      {/* ------------------------------------------ 5. Competency assessment */}
      <section className="pyrep-section pyrep-section-break">
        <SectionHeading index="4" title="Competency assessment" />
        <p className="pyrep-note">
          Each cell shows the candidate self-rating and the supervisor rating as
          <strong> candidate / supervisor</strong> on a 1{DASH}5 scale, where 1 = no
          demonstrated capability and 5 = consistently competent without supervision.
          An em-dash ({DASH}) means no rating was recorded for that quarter.
        </p>
        {COMPETENCIES.length === 0 ? (
          <p className="pyrep-muted">None recorded</p>
        ) : (
          COMPETENCIES.map((domain, domainIndex) => {
            const items = domain.items ?? [];
            return (
              <div key={`${domain.label}-${domainIndex}`}>
                {items.length === 0 ? (
                  <>
                    <h4 style={{ marginTop: 16 }}>{domain.label}</h4>
                    <p className="pyrep-muted">None recorded</p>
                  </>
                ) : (
                  <table>
                    <caption>{domain.label}</caption>
                    <thead>
                      <tr>
                        <th scope="col">Competency</th>
                        {COMPETENCY_QUARTERS.map((q, i) => (
                          <th scope="col" className="pyrep-center" key={q}>
                            Q{i + 1}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.key}>
                          <td>{item.label}</td>
                          {COMPETENCY_QUARTERS.map((q) => {
                            const scores = asDict(asDict(competencyScores[q])[item.key]);
                            const candidate = asNumber(scores.candidate);
                            const supervisor = asNumber(scores.supervisor);
                            const cell =
                              candidate === 0 && supervisor === 0
                                ? DASH
                                : `${candidate === 0 ? DASH : candidate}/${
                                    supervisor === 0 ? DASH : supervisor
                                  }`;
                            return (
                              <td className="pyrep-center pyrep-nowrap" key={q}>
                                {cell}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })
        )}
      </section>

      {/* --------------------------------------------------- 6. Audit trail */}
      <section className="pyrep-section pyrep-section-break">
        <SectionHeading index="5" title="Audit trail" />
        {auditRows.length === 0 ? (
          <p className="pyrep-muted">None recorded</p>
        ) : (
          <>
            {auditTruncated ? (
              <p className="pyrep-note">
                Showing most recent {AUDIT_ROW_CAP} of {auditTotal} entries.
              </p>
            ) : (
              <p className="pyrep-note">{auditTotal} entries, newest first.</p>
            )}
            <table>
              <caption>Recorded changes to this Professional Year record</caption>
              <thead>
                <tr>
                  <th scope="col" className="pyrep-nowrap">Timestamp</th>
                  <th scope="col">Actor</th>
                  <th scope="col">Category</th>
                  <th scope="col">Action</th>
                  <th scope="col">Detail</th>
                </tr>
              </thead>
              <tbody>
                {auditRows.map((row, i) => (
                  <tr key={`${row.id}-${i}`}>
                    <td className="pyrep-mono">{row.ts}</td>
                    <td>{row.actor}</td>
                    <td>{row.cat}</td>
                    <td>{row.action}</td>
                    <td>{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      {/* ------------------------------------- 7. Declaration & signatures */}
      <section className="pyrep-section">
        <SectionHeading index="6" title="Declaration" />
        <p className="pyrep-declaration">
          We declare that this document is a true and complete account of the Professional
          Year undertaken by {displayCandidate} under the supervision of {displaySupervisor}
          {asText(profile.licensee) ? ` on behalf of ${asText(profile.licensee)}` : ""}
          {asText(profile.afsl) ? ` (AFSL ${asText(profile.afsl)})` : ""}, and that the
          hours, milestones, training, assessments and competency ratings recorded above
          accurately reflect the work performed and supervised.
        </p>

        <div className="pyrep-signatures">
          {[
            { role: "Supervisor", name: displaySupervisor },
            { role: "Candidate", name: displayCandidate },
          ].map((box) => (
            <div className="pyrep-sigbox" key={box.role}>
              <div className="pyrep-sigrole">{box.role}</div>
              <div className="pyrep-sigline">
                <div className="pyrep-sigrule" />
                <div className="pyrep-siglabel">
                  Printed name{box.name && box.name !== DASH ? ` — ${box.name}` : ""}
                </div>
              </div>
              <div className="pyrep-sigline">
                <div className="pyrep-sigrule" />
                <div className="pyrep-siglabel">Signature</div>
              </div>
              <div className="pyrep-sigline">
                <div className="pyrep-sigrule" />
                <div className="pyrep-siglabel">Date</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="pyrep-footer">
        Professional Year {DASH} Record of Completion for {displayCandidate}
        {asText(profile.licensee) ? ` · ${asText(profile.licensee)}` : ""} · Generated{" "}
        {formatDateTime(generatedAt)}
      </footer>
    </div>
  );
}

export default ComplianceReport;
