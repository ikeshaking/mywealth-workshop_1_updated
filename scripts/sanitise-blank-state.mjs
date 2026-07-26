/**
 * The PY tracker's embedded state was captured from a real working copy, so the
 * "blank" template arrived carrying the last author's data: audit history,
 * reflections, assessment records and even an edit-password hash. Seeding new
 * candidates from that would copy one person's record into everybody's.
 *
 * This script strips everything candidate-specific while KEEPING the licensee's
 * content configuration (wording overrides, milestone classifications, custom
 * content), which is deliberate program setup rather than someone's progress.
 *
 *   node scripts/sanitise-blank-state.mjs
 */
import fs from "node:fs";

const PATH = "src/lib/py/blankState.json";
const s = JSON.parse(fs.readFileSync(PATH, "utf8"));
const before = JSON.stringify(s).length;

// --- Personal / progress data: cleared ---
s.auditLog = [];
s.logbook = [];
s.soaLog = [];
s.taskLog = [];
s.dilemmas = [];
s.devActions = [];
s.customResources = [];
s.workshopNotes = {};
s.quarterReadiness = {};
s.supervisorChecks = {};
s.openModules = {};

s.reflections = { q1: {}, q2: {}, q3: {}, q4: {}, q5: {}, q6: {}, final: "" };
s.reflectionMeta = { q1: {}, q2: {}, q3: {}, q4: {}, q5: {}, q6: {} };
s.holdingBack = { initial: "", q1: "", q2: "", q3: "", q4: "" };
s.supervisorSignoffs = {
  technical: "", clientCare: "", regulatory: "", ethics: "", finalCertificate: "",
  q1Notes: "", q2Notes: "", q3Notes: "", q4Notes: "",
};

// Credentials must never ship inside a template.
s.editPasswordHash = "";
s.signoffPasswordHash = "";
s.signoffLocked = false;

for (const k of Object.keys(s.milestones ?? {})) {
  s.milestones[k] = { done: false, note: "", proof: "", proofDate: "" };
}
for (const k of Object.keys(s.modulesDone ?? {})) {
  s.modulesDone[k] = {
    done: false, hours: 0, notes: "",
    assessment: { format: "", result: "", attempt: 1, assessor: "", date: "", passed: false, remediation: "", reassessment: "" },
  };
}
for (const k of Object.keys(s.signoffState ?? {})) {
  s.signoffState[k] = { ticks: {}, name: "", date: "", signed: false, signedBy: "", signedAt: "" };
}
for (const k of Object.keys(s.moduleChecks ?? {})) s.moduleChecks[k] = {};
for (const q of Object.keys(s.competencyScores ?? {})) {
  for (const k of Object.keys(s.competencyScores[q] ?? {})) {
    s.competencyScores[q][k] = { candidate: 0, supervisor: 0 };
  }
}
for (const q of Object.keys(s.hours ?? {})) s.hours[q] = { work: 0, structured: 0 };

// Profile: keep the licensee details, clear the person.
const keepLicensee = s.profile?.licensee ?? "";
const keepAfsl = s.profile?.afsl ?? "";
const keepYear = s.profile?.year ?? String(new Date().getFullYear());
s.profile = {
  candidateName: "", supervisorName: "", supervisorFar: "",
  licensee: keepLicensee, afsl: keepAfsl, pyPortalUrl: "",
  startDate: "", year: keepYear, currentQuarter: 1,
  q1Start: "", q2Start: "", q3Start: "", q4Start: "", completionTarget: "",
  examPassed: false, examDate: "",
  degreeVerified: false, degreeInstitution: "",
  farUpdatedProvisional: false, farUpdatedFullProvider: false,
  finalCertificateIssued: false, finalCertificateDate: "",
};

s.ui = { theme: "light", role: "candidate", compQuarter: "q1" };

// --- KEPT deliberately: licensee content configuration, not personal data ---
//   contentOverrides, milestoneKindOverride, moduleTagOverride,
//   customModules, customItems, customSections

fs.writeFileSync(PATH, JSON.stringify(s, null, 2) + "\n");

const kept = {
  contentOverrides: Object.keys(s.contentOverrides ?? {}).length,
  milestoneKindOverride: Object.keys(s.milestoneKindOverride ?? {}).length,
  customItems: Object.keys(s.customItems ?? {}).length,
};
console.log(`sanitised ${PATH} (${before} -> ${JSON.stringify(s).length} bytes)`);
console.log("kept licensee config:", JSON.stringify(kept));
