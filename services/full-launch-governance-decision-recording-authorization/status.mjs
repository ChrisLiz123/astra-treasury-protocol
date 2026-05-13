import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const files = {
  config: "configs/full-launch-governance-decision-recording-authorization.config.json",
  stabilization: "public-docs/stabilization-status.json",
  fullLaunch: "public-docs/full-launch-status.json",
  fullLaunchGovernance: "public-docs/full-launch-governance-status.json",
  fullLaunchGovernanceVote: "public-docs/full-launch-governance-vote-status.json",
  fullLaunchGovernanceVoteOpening: "public-docs/full-launch-governance-vote-opening-status.json",
  fullLaunchGovernanceVoteAuthorization: "public-docs/full-launch-governance-vote-authorization-status.json",
  fullLaunchGovernanceVoteOpeningExecution: "public-docs/full-launch-governance-vote-opening-execution-status.json",
  fullLaunchGovernanceResolution: "public-docs/full-launch-governance-resolution-status.json",
  fullLaunchGovernanceResolutionAuthorization: "public-docs/full-launch-governance-resolution-authorization-status.json",
  fullLaunchGovernanceDecisionRecording: "public-docs/full-launch-governance-decision-recording-status.json",
  treasurySafeTransaction: "public-docs/treasury-safe-transaction-status.json",
  treasuryFunding: "public-docs/treasury-funding-status.json",
  monitor: "public-docs/mainnet-monitor-status.json",
  alerts: "public-docs/mainnet-alerts-status.json",
  incidents: "public-docs/incident-summary.json",
  mainnetExecution: "public-docs/mainnet-execution-status.json"
};

const reportDir = path.join(root, "reports", "full-launch-governance-decision-recording-authorization");
const reportFile = path.join(reportDir, "full-launch-governance-decision-recording-authorization-status.json");

const publicJsonFile = path.join(root, "public-docs", "full-launch-governance-decision-recording-authorization-status.json");
const publicHtmlFile = path.join(root, "public-docs", "full-launch-governance-decision-recording-authorization.html");

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
const fullLaunchGovernanceDecisionRecording = readJson(files.fullLaunchGovernanceDecisionRecording);
const treasurySafeTransaction = readJson(files.treasurySafeTransaction);
const treasuryFunding = readJson(files.treasuryFunding);
const monitor = readJson(files.monitor);
const alerts = readJson(files.alerts);
const incidents = readJson(files.incidents);
const mainnetExecution = readJson(files.mainnetExecution);

const checks = [];
const activeIncidents = Number(incidents?.summary?.active || 0);
const responseRequired = Boolean(alerts?.responseRequired);
const record = config.draftAuthorizationRecord || {};

check(checks, "Audit clearance recorded", config.operatorReportedClearances?.auditCleared === true, {
  auditCleared: config.operatorReportedClearances?.auditCleared
});

check(checks, "Legal clearance recorded", config.operatorReportedClearances?.legalCleared === true, {
  legalCleared: config.operatorReportedClearances?.legalCleared
});

check(checks, "Decision recording authorization package prepared", config.decisionRecordingAuthorizationPackagePrepared === true, {
  decisionRecordingAuthorizationPackagePrepared: config.decisionRecordingAuthorizationPackagePrepared
});

check(checks, "Authorization evidence plan prepared", config.authorizationEvidencePlanPrepared === true, {
  authorizationEvidencePlanPrepared: config.authorizationEvidencePlanPrepared
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

check(checks, "Governance vote result not recorded", config.governanceVoteResultRecorded === false, {
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

check(checks, "Governance decision not recorded", fullLaunchGovernanceDecisionRecording.governanceDecisionRecorded === false && config.governanceDecisionRecorded === false, {
  publicGovernanceDecisionRecorded: fullLaunchGovernanceDecisionRecording.governanceDecisionRecorded,
  configGovernanceDecisionRecorded: config.governanceDecisionRecorded
});

check(checks, "Decision recording authorization not requested", config.decisionRecordingAuthorizationRequested === false, {
  decisionRecordingAuthorizationRequested: config.decisionRecordingAuthorizationRequested
});

check(checks, "Decision recording authorization not recorded", config.decisionRecordingAuthorizationRecorded === false, {
  decisionRecordingAuthorizationRecorded: config.decisionRecordingAuthorizationRecorded
});

check(checks, "Decision recording not authorized", config.decisionRecordingAuthorized === false && config.governanceDecisionRecordingAuthorized === false, {
  decisionRecordingAuthorized: config.decisionRecordingAuthorized,
  governanceDecisionRecordingAuthorized: config.governanceDecisionRecordingAuthorized
});

check(checks, "Draft authorization record not authorized", record.decision === "NOT AUTHORIZED", {
  decision: record.decision
});

check(checks, "Draft authorization has no approved capabilities", Array.isArray(record.approvedCapabilities) && record.approvedCapabilities.length === 0, {
  approvedCapabilities: record.approvedCapabilities || []
});

check(checks, "Draft authorization has no authorization date", !record.authorizationDate, {
  authorizationDate: record.authorizationDate
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
    id: "DECISION-AUTH-001",
    title: "Missing vote result blocks authorization",
    expected: "BLOCKED",
    actual: config.governanceVoteResultRecorded === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "vote result is not recorded"
  },
  {
    id: "DECISION-AUTH-002",
    title: "Missing signed resolution blocks authorization",
    expected: "BLOCKED",
    actual: config.governanceResolutionSigned === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "governance resolution is not signed"
  },
  {
    id: "DECISION-AUTH-003",
    title: "Missing resolution signing authorization blocks authorization",
    expected: "BLOCKED",
    actual: config.resolutionSigningAuthorizationRecorded === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "resolution signing authorization is not recorded"
  },
  {
    id: "DECISION-AUTH-004",
    title: "Missing capability matrix blocks authorization",
    expected: "BLOCKED",
    actual: config.requiredBeforeDecisionRecordingAuthorization?.capabilityMatrixFinalApproved === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "capability matrix is not final-approved"
  },
  {
    id: "DECISION-AUTH-005",
    title: "Missing decision recorder blocks authorization",
    expected: "BLOCKED",
    actual: config.requiredBeforeDecisionRecordingAuthorization?.decisionRecorderAssigned === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "decision recorder is not assigned"
  },
  {
    id: "DECISION-AUTH-006",
    title: "Authorization recording attempt",
    expected: "BLOCKED",
    actual: config.decisionRecordingAuthorizationRecorded === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "this package must not record authorization"
  },
  {
    id: "DECISION-AUTH-007",
    title: "Governance decision record attempt",
    expected: "BLOCKED",
    actual: config.governanceDecisionRecorded === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "this package must not record a governance decision"
  },
  {
    id: "DECISION-AUTH-008",
    title: "Full launch approval attempt",
    expected: "BLOCKED",
    actual: config.fullLaunchApproved === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "this package must not approve full launch"
  },
  {
    id: "DECISION-AUTH-009",
    title: "Capability approval attempt",
    expected: "BLOCKED",
    actual: Object.values(config.capabilityApprovals || {}).every((value) => value === false) ? "BLOCKED" : "NOT_BLOCKED",
    reason: "this package must not approve any capability"
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

for (const [key, value] of Object.entries(config.authorizationChecklist || {})) {
  check(checks, `Authorization checklist pending: ${key}`, value === false, { value });
}

for (const [key, value] of Object.entries(config.hardStops || {})) {
  check(checks, `Hard stop remains false: ${key}`, value === false, { value });
}

const failures = checks.filter((item) => !item.pass);
const failedCases = dryRunCases.filter((item) => !item.pass);

const authorizationStatus = {
  decisionRecordingAuthorizationPackagePrepared: Boolean(config.decisionRecordingAuthorizationPackagePrepared),
  authorizationEvidencePlanPrepared: Boolean(config.authorizationEvidencePlanPrepared),
  decisionRecordingAuthorizationRequested: Boolean(config.decisionRecordingAuthorizationRequested),
  decisionRecordingAuthorizationRecorded: Boolean(config.decisionRecordingAuthorizationRecorded),
  decisionRecordingAuthorized: Boolean(config.decisionRecordingAuthorized),
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
  ? "FULL_LAUNCH_GOVERNANCE_DECISION_RECORDING_AUTHORIZATION_PACKAGE_READY_NOT_RECORDED"
  : "FULL_LAUNCH_GOVERNANCE_DECISION_RECORDING_AUTHORIZATION_REVIEW_REQUIRED";

const report = {
  schema: "astra-full-launch-governance-decision-recording-authorization-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  mode: "PLANNING_ONLY_DECISION_RECORDING_AUTHORIZATION_NOT_RECORDED",
  currentApprovedMode: "restricted-mainnet-operation",
  decisionRecordingAuthorizationRecorded: false,
  governanceDecisionRecorded: false,
  fullLaunchApproved: false,
  network: {
    name: "Base Mainnet",
    chainId: 8453
  },
  publicStatement:
    "AstraTreasury governance decision recording authorization package is ready for review. Decision recording is not authorized, no governance decision is recorded, and full launch is not approved.",
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
  authorizationStatus,
  draftAuthorizationRecord: config.draftAuthorizationRecord || {},
  capabilityApprovals: config.capabilityApprovals || {},
  requiredBeforeDecisionRecordingAuthorization: config.requiredBeforeDecisionRecordingAuthorization || {},
  authorizationChecklist: config.authorizationChecklist || {},
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
    fullLaunchGovernanceDecisionRecording: fullLaunchGovernanceDecisionRecording.status || "UNKNOWN",
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
    "Governance decision recording live package",
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
    authorizesDecisionRecording: false,
    recordsGovernanceDecision: false,
    approvesFullLaunch: false
  }
};

writeJson(reportFile, report);

writeJson(publicJsonFile, {
  schema: "astra-public-full-launch-governance-decision-recording-authorization-status-v0.1",
  generatedAt: report.generatedAt,
  status: report.status,
  mode: report.mode,
  currentApprovedMode: report.currentApprovedMode,
  decisionRecordingAuthorizationRecorded: report.decisionRecordingAuthorizationRecorded,
  governanceDecisionRecorded: report.governanceDecisionRecorded,
  fullLaunchApproved: report.fullLaunchApproved,
  network: report.network,
  publicStatement: report.publicStatement,
  summary: report.summary,
  authorizationStatus: report.authorizationStatus,
  draftAuthorizationRecord: report.draftAuthorizationRecord,
  capabilityApprovals: report.capabilityApprovals,
  requiredBeforeDecisionRecordingAuthorization: report.requiredBeforeDecisionRecordingAuthorization,
  authorizationChecklist: report.authorizationChecklist,
  dryRunCases: report.dryRunCases,
  currentStatuses: report.currentStatuses,
  restrictions: report.restrictions,
  nextPossibleMilestones: report.nextPossibleMilestones
});

const authorizationRows = Object.entries(report.authorizationStatus).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Complete / true" : "Pending / false"}</td></tr>`;
}).join("");

const recordRows = Object.entries(report.draftAuthorizationRecord).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(Array.isArray(value) ? JSON.stringify(value) : value)}</td></tr>`;
}).join("");

const caseRows = dryRunCases.map((item) => {
  return `<tr><td>${escapeHtml(item.id)}</td><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.actual)}</td><td>${item.pass ? "PASS" : "FAIL"}</td></tr>`;
}).join("");

const checklistRows = Object.entries(report.authorizationChecklist).map(([key, value]) => {
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
  <title>AstraTreasury Governance Decision Authorization</title>
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
    <div class="badge">Draft only · authorization not recorded</div>
    <h1>Governance Decision Authorization</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
  </section>

  <section class="card">
    <h2>Authorization status</h2>
    <table>
      <thead><tr><th>Item</th><th>Status</th></tr></thead>
      <tbody>${authorizationRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Draft authorization record</h2>
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
    <h2>Authorization checklist</h2>
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
      Decision-recording authorization is not recorded. No governance decision is recorded.
      Full launch and restricted capabilities remain not approved.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/full-launch-governance-decision-recording-authorization">/api/public/full-launch-governance-decision-recording-authorization</a></p>
    <p><a href="/full-launch-governance-decision-recording">Governance decision recording</a></p>
    <p><a href="/full-launch-governance-resolution-authorization">Governance resolution authorization</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Governance Decision Recording Authorization");
console.log("=========================================================");
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
