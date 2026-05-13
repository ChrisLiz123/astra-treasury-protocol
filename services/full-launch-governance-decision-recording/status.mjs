import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const files = {
  config: "configs/full-launch-governance-decision-recording.config.json",
  stabilization: "public-docs/stabilization-status.json",
  fullLaunch: "public-docs/full-launch-status.json",
  fullLaunchGovernance: "public-docs/full-launch-governance-status.json",
  fullLaunchGovernanceVote: "public-docs/full-launch-governance-vote-status.json",
  fullLaunchGovernanceVoteOpening: "public-docs/full-launch-governance-vote-opening-status.json",
  fullLaunchGovernanceVoteAuthorization: "public-docs/full-launch-governance-vote-authorization-status.json",
  fullLaunchGovernanceVoteOpeningExecution: "public-docs/full-launch-governance-vote-opening-execution-status.json",
  fullLaunchGovernanceResolution: "public-docs/full-launch-governance-resolution-status.json",
  fullLaunchGovernanceResolutionAuthorization: "public-docs/full-launch-governance-resolution-authorization-status.json",
  treasurySafeTransaction: "public-docs/treasury-safe-transaction-status.json",
  treasuryFunding: "public-docs/treasury-funding-status.json",
  monitor: "public-docs/mainnet-monitor-status.json",
  alerts: "public-docs/mainnet-alerts-status.json",
  incidents: "public-docs/incident-summary.json",
  mainnetExecution: "public-docs/mainnet-execution-status.json"
};

const reportDir = path.join(root, "reports", "full-launch-governance-decision-recording");
const reportFile = path.join(reportDir, "full-launch-governance-decision-recording-status.json");

const publicJsonFile = path.join(root, "public-docs", "full-launch-governance-decision-recording-status.json");
const publicHtmlFile = path.join(root, "public-docs", "full-launch-governance-decision-recording.html");

fs.mkdirSync(reportDir, { recursive: true });
fs.mkdirSync(path.dirname(publicJsonFile), { recursive: true });

function readJson(relativePath, fallback = {}) {
  const full = path.join(root, relativePath);

  try {
    if (!fs.existsSync(full)) return fallback;
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch (error) {
    return { error: error.message };
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  }[ch]));
}

function humanize(value) {
  return String(value || "UNKNOWN")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function check(checks, name, pass, details = {}) {
  checks.push({ name, pass: Boolean(pass), details });
}

const config = readJson(files.config);
const stabilization = readJson(files.stabilization);
const fullLaunch = readJson(files.fullLaunch);
const fullLaunchGovernance = readJson(files.fullLaunchGovernance);
const fullLaunchGovernanceVote = readJson(files.fullLaunchGovernanceVote);
const fullLaunchGovernanceVoteOpening = readJson(files.fullLaunchGovernanceVoteOpening);
const fullLaunchGovernanceVoteAuthorization = readJson(files.fullLaunchGovernanceVoteAuthorization);
const fullLaunchGovernanceVoteOpeningExecution = readJson(files.fullLaunchGovernanceVoteOpeningExecution);
const fullLaunchGovernanceResolution = readJson(files.fullLaunchGovernanceResolution);
const fullLaunchGovernanceResolutionAuthorization = readJson(files.fullLaunchGovernanceResolutionAuthorization);
const treasurySafeTransaction = readJson(files.treasurySafeTransaction);
const treasuryFunding = readJson(files.treasuryFunding);
const monitor = readJson(files.monitor);
const alerts = readJson(files.alerts);
const incidents = readJson(files.incidents);
const mainnetExecution = readJson(files.mainnetExecution);

const checks = [];
const activeIncidents = Number(incidents?.summary?.active || 0);
const responseRequired = Boolean(alerts?.responseRequired);
const record = config.draftDecisionRecord || {};

check(checks, "Audit clearance recorded", config.operatorReportedClearances?.auditCleared === true, {
  auditCleared: config.operatorReportedClearances?.auditCleared
});

check(checks, "Legal clearance recorded", config.operatorReportedClearances?.legalCleared === true, {
  legalCleared: config.operatorReportedClearances?.legalCleared
});

check(checks, "Governance decision recording package prepared", config.governanceDecisionRecordingPackagePrepared === true, {
  governanceDecisionRecordingPackagePrepared: config.governanceDecisionRecordingPackagePrepared
});

check(checks, "Decision evidence plan prepared", config.decisionEvidencePlanPrepared === true, {
  decisionEvidencePlanPrepared: config.decisionEvidencePlanPrepared
});

check(checks, "Restricted launch stabilized", stabilization.status === "RESTRICTED_LAUNCH_STABILIZED", {
  status: stabilization.status || "UNKNOWN"
});

check(checks, "Mainnet monitor passing", monitor.status === "PASS", {
  status: monitor.status || "UNKNOWN"
});

check(checks, "Alerts do not require response", responseRequired === false, {
  alertStatus: alerts.status || "UNKNOWN",
  responseRequired
});

check(checks, "No active incidents", activeIncidents === 0, {
  activeIncidents
});

check(checks, "Full launch not approved", fullLaunch.fullLaunchApproved === false && config.fullLaunchApproved === false, {
  publicFullLaunchApproved: fullLaunch.fullLaunchApproved,
  configFullLaunchApproved: config.fullLaunchApproved
});

check(checks, "Governance approval not recorded", fullLaunchGovernance.governanceFullLaunchApprovalRecorded === false && config.governanceFullLaunchApprovalRecorded === false, {
  publicGovernanceFullLaunchApprovalRecorded: fullLaunchGovernance.governanceFullLaunchApprovalRecorded,
  configGovernanceFullLaunchApprovalRecorded: config.governanceFullLaunchApprovalRecorded
});

check(checks, "Governance vote authorization not recorded", fullLaunchGovernanceVoteAuthorization.governanceVoteAuthorizationRecorded === false && config.governanceVoteAuthorizationRecorded === false, {
  publicGovernanceVoteAuthorizationRecorded: fullLaunchGovernanceVoteAuthorization.governanceVoteAuthorizationRecorded,
  configGovernanceVoteAuthorizationRecorded: config.governanceVoteAuthorizationRecorded
});

check(checks, "Governance vote not opened", fullLaunchGovernanceVote.governanceVoteOpened === false && config.governanceVoteOpened === false, {
  publicGovernanceVoteOpened: fullLaunchGovernanceVote.governanceVoteOpened,
  configGovernanceVoteOpened: config.governanceVoteOpened
});

check(checks, "Governance vote not completed", fullLaunchGovernanceVote.governanceVoteCompleted === false && config.governanceVoteCompleted === false, {
  publicGovernanceVoteCompleted: fullLaunchGovernanceVote.governanceVoteCompleted,
  configGovernanceVoteCompleted: config.governanceVoteCompleted
});

check(checks, "Vote result not recorded", config.governanceVoteResultRecorded === false, {
  governanceVoteResultRecorded: config.governanceVoteResultRecorded
});

check(checks, "Resolution signing authorization not recorded", fullLaunchGovernanceResolutionAuthorization.resolutionSigningAuthorizationRecorded === false && config.resolutionSigningAuthorizationRecorded === false, {
  publicResolutionSigningAuthorizationRecorded: fullLaunchGovernanceResolutionAuthorization.resolutionSigningAuthorizationRecorded,
  configResolutionSigningAuthorizationRecorded: config.resolutionSigningAuthorizationRecorded
});

check(checks, "Governance resolution not signed", fullLaunchGovernanceResolution.governanceResolutionSigned === false && config.governanceResolutionSigned === false, {
  publicGovernanceResolutionSigned: fullLaunchGovernanceResolution.governanceResolutionSigned,
  configGovernanceResolutionSigned: config.governanceResolutionSigned
});

check(checks, "Governance decision not recorded", fullLaunchGovernanceVote.governanceDecisionRecorded === false && config.governanceDecisionRecorded === false, {
  publicGovernanceDecisionRecorded: fullLaunchGovernanceVote.governanceDecisionRecorded,
  configGovernanceDecisionRecorded: config.governanceDecisionRecorded
});

check(checks, "Governance decision not published", config.governanceDecisionPublished === false, {
  governanceDecisionPublished: config.governanceDecisionPublished
});

check(checks, "Draft decision is not recorded", record.decision === "NOT RECORDED", {
  decision: record.decision
});

check(checks, "Draft decision has no approved capabilities", Array.isArray(record.approvedCapabilities) && record.approvedCapabilities.length === 0, {
  approvedCapabilities: record.approvedCapabilities || []
});

check(checks, "Draft decision has no decision date", !record.decisionDate, {
  decisionDate: record.decisionDate
});

check(checks, "Treasury funding not approved", treasuryFunding.treasuryFundingApproved === false && config.treasuryFundingApproved === false, {
  publicTreasuryFundingApproved: treasuryFunding.treasuryFundingApproved,
  configTreasuryFundingApproved: config.treasuryFundingApproved
});

check(checks, "Treasury funding not executed", treasuryFunding.treasuryFundingExecuted === false && config.treasuryFundingExecuted === false, {
  publicTreasuryFundingExecuted: treasuryFunding.treasuryFundingExecuted,
  configTreasuryFundingExecuted: config.treasuryFundingExecuted
});

check(checks, "Safe payload not generated", treasurySafeTransaction.safeTransactionPayloadGenerated === false && config.safeTransactionPayloadGenerated === false, {
  publicSafeTransactionPayloadGenerated: treasurySafeTransaction.safeTransactionPayloadGenerated,
  configSafeTransactionPayloadGenerated: config.safeTransactionPayloadGenerated
});

check(checks, "Safe transaction not prepared", treasurySafeTransaction.safeTransactionPrepared === false && config.safeTransactionPrepared === false, {
  publicSafeTransactionPrepared: treasurySafeTransaction.safeTransactionPrepared,
  configSafeTransactionPrepared: config.safeTransactionPrepared
});

check(checks, "Mainnet execution queue disabled", mainnetExecution.mode === "MAINNET_EXECUTION_QUEUE_DISABLED", {
  mode: mainnetExecution.mode || "UNKNOWN"
});

const dryRunCases = [
  {
    id: "DECISION-RECORD-001",
    title: "Missing vote result blocks decision recording",
    expected: "BLOCKED",
    actual: config.governanceVoteResultRecorded === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "vote result is not recorded"
  },
  {
    id: "DECISION-RECORD-002",
    title: "Missing signed resolution blocks decision recording",
    expected: "BLOCKED",
    actual: config.governanceResolutionSigned === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "governance resolution is not signed"
  },
  {
    id: "DECISION-RECORD-003",
    title: "Missing decision-recording authorization blocks decision recording",
    expected: "BLOCKED",
    actual: config.governanceDecisionRecordingAuthorized === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "final decision-recording authorization is not recorded"
  },
  {
    id: "DECISION-RECORD-004",
    title: "Missing capability matrix blocks decision recording",
    expected: "BLOCKED",
    actual: config.requiredBeforeDecisionRecording?.capabilityMatrixFinalApproved === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "capability matrix is not final-approved"
  },
  {
    id: "DECISION-RECORD-005",
    title: "Governance decision recording attempt",
    expected: "BLOCKED",
    actual: config.governanceDecisionRecorded === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "this package must not record a decision"
  },
  {
    id: "DECISION-RECORD-006",
    title: "Full launch approval attempt",
    expected: "BLOCKED",
    actual: config.fullLaunchApproved === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "this package must not approve full launch"
  },
  {
    id: "DECISION-RECORD-007",
    title: "Capability approval attempt",
    expected: "BLOCKED",
    actual: Object.values(config.capabilityApprovals || {}).every((value) => value === false) ? "BLOCKED" : "NOT_BLOCKED",
    reason: "this package must not approve any capability"
  },
  {
    id: "DECISION-RECORD-008",
    title: "Public final status publication attempt",
    expected: "BLOCKED",
    actual: config.governanceDecisionPublished === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "this package must not publish final approval status"
  }
].map((item) => ({
  ...item,
  pass: item.expected === item.actual
}));

for (const item of dryRunCases) {
  check(checks, `${item.id}: ${item.title}`, item.pass, {
    expected: item.expected,
    actual: item.actual,
    reason: item.reason
  });
}

for (const [key, value] of Object.entries(config.capabilityApprovals || {})) {
  check(checks, `Capability not approved: ${key}`, value === false, { value });
}

for (const [key, value] of Object.entries(config.decisionRecordingChecklist || {})) {
  check(checks, `Decision recording checklist pending: ${key}`, value === false, { value });
}

for (const [key, value] of Object.entries(config.hardStops || {})) {
  check(checks, `Hard stop remains false: ${key}`, value === false, { value });
}

const failures = checks.filter((item) => !item.pass);
const failedCases = dryRunCases.filter((item) => !item.pass);

const decisionRecordingStatus = {
  governanceDecisionRecordingPackagePrepared: Boolean(config.governanceDecisionRecordingPackagePrepared),
  decisionEvidencePlanPrepared: Boolean(config.decisionEvidencePlanPrepared),
  governanceDecisionRecordingAuthorized: Boolean(config.governanceDecisionRecordingAuthorized),
  governanceDecisionRecorded: Boolean(config.governanceDecisionRecorded),
  governanceDecisionPublished: Boolean(config.governanceDecisionPublished),
  governanceResolutionSigned: Boolean(config.governanceResolutionSigned),
  resolutionSigningAuthorizationRecorded: Boolean(config.resolutionSigningAuthorizationRecorded),
  governanceFullLaunchApprovalRecorded: Boolean(config.governanceFullLaunchApprovalRecorded),
  governanceVoteAuthorizationRecorded: Boolean(config.governanceVoteAuthorizationRecorded),
  governanceVoteOpened: Boolean(config.governanceVoteOpened),
  governanceVoteCompleted: Boolean(config.governanceVoteCompleted),
  governanceVoteResultRecorded: Boolean(config.governanceVoteResultRecorded),
  fullLaunchApproved: Boolean(config.fullLaunchApproved),
  treasuryFundingApproved: Boolean(config.treasuryFundingApproved),
  treasuryFundingTransactionAuthorized: Boolean(config.treasuryFundingTransactionAuthorized),
  treasuryFundingExecuted: Boolean(config.treasuryFundingExecuted),
  safeTransactionPayloadGenerated: Boolean(config.safeTransactionPayloadGenerated),
  safeTransactionPrepared: Boolean(config.safeTransactionPrepared),
  safeTransactionSubmitted: Boolean(config.safeTransactionSubmitted),
  safeTransactionSigned: Boolean(config.safeTransactionSigned),
  safeTransactionExecuted: Boolean(config.safeTransactionExecuted)
};

const status = failures.length === 0
  ? "FULL_LAUNCH_GOVERNANCE_DECISION_RECORDING_PACKAGE_READY_NOT_RECORDED"
  : "FULL_LAUNCH_GOVERNANCE_DECISION_RECORDING_REVIEW_REQUIRED";

const report = {
  schema: "astra-full-launch-governance-decision-recording-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  mode: "PLANNING_ONLY_DECISION_NOT_RECORDED",
  currentApprovedMode: "restricted-mainnet-operation",
  governanceDecisionRecorded: false,
  fullLaunchApproved: false,
  network: {
    name: "Base Mainnet",
    chainId: 8453
  },
  publicStatement:
    "AstraTreasury governance decision recording package is ready for review. No governance decision is recorded, full launch is not approved, and no restricted capability is approved.",
  summary: {
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
    dryRunCases: dryRunCases.length,
    dryRunCasesPassed: dryRunCases.filter((item) => item.pass).length,
    failedCases: failedCases.length,
    activeIncidents,
    responseRequired
  },
  clearances: config.operatorReportedClearances || {},
  decisionRecordingStatus,
  draftDecisionRecord: config.draftDecisionRecord || {},
  capabilityApprovals: config.capabilityApprovals || {},
  requiredBeforeDecisionRecording: config.requiredBeforeDecisionRecording || {},
  decisionRecordingChecklist: config.decisionRecordingChecklist || {},
  dryRunCases,
  currentStatuses: {
    stabilization: stabilization.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    fullLaunchGovernance: fullLaunchGovernance.status || "UNKNOWN",
    fullLaunchGovernanceVote: fullLaunchGovernanceVote.status || "UNKNOWN",
    fullLaunchGovernanceVoteOpening: fullLaunchGovernanceVoteOpening.status || "UNKNOWN",
    fullLaunchGovernanceVoteAuthorization: fullLaunchGovernanceVoteAuthorization.status || "UNKNOWN",
    fullLaunchGovernanceVoteOpeningExecution: fullLaunchGovernanceVoteOpeningExecution.status || "UNKNOWN",
    fullLaunchGovernanceResolution: fullLaunchGovernanceResolution.status || "UNKNOWN",
    fullLaunchGovernanceResolutionAuthorization: fullLaunchGovernanceResolutionAuthorization.status || "UNKNOWN",
    treasurySafeTransaction: treasurySafeTransaction.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
    monitor: monitor.status || "UNKNOWN",
    alerts: alerts.status || "UNKNOWN",
    incidents: incidents.status || "UNKNOWN",
    mainnetExecution: mainnetExecution.mode || "UNKNOWN"
  },
  checks,
  failures,
  restrictions: {
    publicTokenSale: false,
    realTreasuryFunding: false,
    stakingOrRewards: false,
    buybackProgram: false,
    autonomousExecution: false,
    mainnetExecutionQueue: false,
    paperToOnchainAutomation: false
  },
  nextPossibleMilestones: [
    "Governance decision recording authorization package",
    "Capability-specific activation package",
    "Full-launch final status package"
  ],
  safety: {
    sendsTransactions: false,
    movesFunds: false,
    deploysContracts: false,
    enablesExecution: false,
    approvesPublicSale: false,
    approvesTreasuryFunding: false,
    preparesSafeTransaction: false,
    recordsGovernanceDecision: false,
    approvesFullLaunch: false
  }
};

writeJson(reportFile, report);

writeJson(publicJsonFile, {
  schema: "astra-public-full-launch-governance-decision-recording-status-v0.1",
  generatedAt: report.generatedAt,
  status: report.status,
  mode: report.mode,
  currentApprovedMode: report.currentApprovedMode,
  governanceDecisionRecorded: report.governanceDecisionRecorded,
  fullLaunchApproved: report.fullLaunchApproved,
  network: report.network,
  publicStatement: report.publicStatement,
  summary: report.summary,
  decisionRecordingStatus: report.decisionRecordingStatus,
  draftDecisionRecord: report.draftDecisionRecord,
  capabilityApprovals: report.capabilityApprovals,
  requiredBeforeDecisionRecording: report.requiredBeforeDecisionRecording,
  decisionRecordingChecklist: report.decisionRecordingChecklist,
  dryRunCases: report.dryRunCases,
  currentStatuses: report.currentStatuses,
  restrictions: report.restrictions,
  nextPossibleMilestones: report.nextPossibleMilestones
});

const decisionRows = Object.entries(report.decisionRecordingStatus).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Complete / true" : "Pending / false"}</td></tr>`;
}).join("");

const recordRows = Object.entries(report.draftDecisionRecord).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(Array.isArray(value) ? JSON.stringify(value) : value)}</td></tr>`;
}).join("");

const caseRows = dryRunCases.map((item) => {
  return `<tr><td>${escapeHtml(item.id)}</td><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.actual)}</td><td>${item.pass ? "PASS" : "FAIL"}</td></tr>`;
}).join("");

const checklistRows = Object.entries(report.decisionRecordingChecklist).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Complete" : "Pending"}</td></tr>`;
}).join("");

const statusRows = Object.entries(report.currentStatuses).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(humanize(value))}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Governance Decision Recording</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #08111f;
      --surface: #0e1a2b;
      --border: rgba(148, 163, 184, 0.2);
      --text: #edf4fb;
      --muted: #9aaec4;
      --blue: #67a7ff;
      --green: #41d49b;
      --yellow: #f4c35f;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    body { margin: 0; background: linear-gradient(180deg, #07101d, var(--bg)); color: var(--text); }
    a { color: var(--blue); text-decoration: none; }

    main {
      width: min(1120px, calc(100% - 40px));
      margin: 0 auto;
      padding: 44px 0 72px;
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 28px;
      box-shadow: 0 22px 70px rgba(0,0,0,.28);
      margin-bottom: 18px;
    }

    h1 { margin: 0 0 10px; font-size: 42px; letter-spacing: -1.2px; }
    h2 { margin: 0 0 14px; font-size: 24px; }
    p { color: var(--muted); line-height: 1.65; }

    .badge {
      display: inline-flex;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(65,212,155,.10);
      border: 1px solid rgba(65,212,155,.22);
      color: var(--green);
      font-weight: 850;
      margin-bottom: 16px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--border);
      border-radius: 18px;
      overflow: hidden;
    }

    th, td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
      text-align: left;
      vertical-align: top;
    }

    th {
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .08em;
      background: rgba(255,255,255,.03);
    }

    tr:last-child td { border-bottom: 0; }

    .notice {
      padding: 16px;
      border-radius: 16px;
      background: rgba(244,195,95,.08);
      border: 1px solid rgba(244,195,95,.22);
      color: #f7d99a;
      line-height: 1.6;
    }
  </style>
</head>
<body>
<main>
  <section class="card">
    <div class="badge">Draft only · decision not recorded</div>
    <h1>Governance Decision Recording</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
  </section>

  <section class="card">
    <h2>Decision recording status</h2>
    <table>
      <thead><tr><th>Item</th><th>Status</th></tr></thead>
      <tbody>${decisionRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Draft decision record</h2>
    <table>
      <thead><tr><th>Field</th><th>Value</th></tr></thead>
      <tbody>${recordRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Dry-run cases</h2>
    <table>
      <thead><tr><th>ID</th><th>Case</th><th>Outcome</th><th>Status</th></tr></thead>
      <tbody>${caseRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Decision recording checklist</h2>
    <table>
      <thead><tr><th>Item</th><th>Status</th></tr></thead>
      <tbody>${checklistRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Current statuses</h2>
    <table>
      <thead><tr><th>Area</th><th>Status</th></tr></thead>
      <tbody>${statusRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Important</h2>
    <div class="notice">
      No governance decision is recorded. Full launch is not approved.
      No restricted capability is approved, and no treasury funding transaction is authorized.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/full-launch-governance-decision-recording">/api/public/full-launch-governance-decision-recording</a></p>
    <p><a href="/full-launch-governance-resolution-authorization">Governance resolution authorization</a></p>
    <p><a href="/full-launch-governance-resolution">Governance resolution signing</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Governance Decision Recording");
console.log("===========================================");
console.log(`Status: ${report.status}`);
console.log(`Checks passed: ${report.summary.passed}/${report.summary.totalChecks}`);
console.log(`Dry-run cases passed: ${report.summary.dryRunCasesPassed}/${report.summary.dryRunCases}`);
console.log(`Report: ${reportFile}`);

if (failures.length > 0) {
  console.table(failures.map((item) => ({
    name: item.name,
    details: JSON.stringify(item.details).slice(0, 240)
  })));
  process.exit(1);
}
