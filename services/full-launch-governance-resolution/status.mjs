import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const files = {
  config: "configs/full-launch-governance-resolution.config.json",
  stabilization: "public-docs/stabilization-status.json",
  fullLaunch: "public-docs/full-launch-status.json",
  fullLaunchGovernance: "public-docs/full-launch-governance-status.json",
  fullLaunchGovernanceVote: "public-docs/full-launch-governance-vote-status.json",
  fullLaunchGovernanceVoteOpening: "public-docs/full-launch-governance-vote-opening-status.json",
  fullLaunchGovernanceVoteAuthorization: "public-docs/full-launch-governance-vote-authorization-status.json",
  fullLaunchGovernanceVoteOpeningExecution: "public-docs/full-launch-governance-vote-opening-execution-status.json",
  treasurySafeTransaction: "public-docs/treasury-safe-transaction-status.json",
  treasuryFunding: "public-docs/treasury-funding-status.json",
  monitor: "public-docs/mainnet-monitor-status.json",
  alerts: "public-docs/mainnet-alerts-status.json",
  incidents: "public-docs/incident-summary.json",
  mainnetExecution: "public-docs/mainnet-execution-status.json"
};

const reportDir = path.join(root, "reports", "full-launch-governance-resolution");
const reportFile = path.join(reportDir, "full-launch-governance-resolution-status.json");

const publicJsonFile = path.join(root, "public-docs", "full-launch-governance-resolution-status.json");
const publicHtmlFile = path.join(root, "public-docs", "full-launch-governance-resolution.html");

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
const treasurySafeTransaction = readJson(files.treasurySafeTransaction);
const treasuryFunding = readJson(files.treasuryFunding);
const monitor = readJson(files.monitor);
const alerts = readJson(files.alerts);
const incidents = readJson(files.incidents);
const mainnetExecution = readJson(files.mainnetExecution);

const checks = [];
const activeIncidents = Number(incidents?.summary?.active || 0);
const responseRequired = Boolean(alerts?.responseRequired);
const draftResolution = config.draftResolution || {};

check(checks, "Audit clearance recorded", config.operatorReportedClearances?.auditCleared === true, {
  auditCleared: config.operatorReportedClearances?.auditCleared
});

check(checks, "Legal clearance recorded", config.operatorReportedClearances?.legalCleared === true, {
  legalCleared: config.operatorReportedClearances?.legalCleared
});

check(checks, "Governance resolution package prepared", config.governanceResolutionPackagePrepared === true, {
  governanceResolutionPackagePrepared: config.governanceResolutionPackagePrepared
});

check(checks, "Draft resolution prepared", config.draftResolutionPrepared === true, {
  draftResolutionPrepared: config.draftResolutionPrepared
});

check(checks, "Signing evidence plan prepared", config.signingEvidencePlanPrepared === true, {
  signingEvidencePlanPrepared: config.signingEvidencePlanPrepared
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

check(checks, "Governance vote opening not authorized", fullLaunchGovernanceVoteOpening.governanceVoteOpeningAuthorized === false, {
  publicGovernanceVoteOpeningAuthorized: fullLaunchGovernanceVoteOpening.governanceVoteOpeningAuthorized
});

check(checks, "Governance vote not opened", fullLaunchGovernanceVote.governanceVoteOpened === false && config.governanceVoteOpened === false, {
  publicGovernanceVoteOpened: fullLaunchGovernanceVote.governanceVoteOpened,
  configGovernanceVoteOpened: config.governanceVoteOpened
});

check(checks, "Governance vote not completed", fullLaunchGovernanceVote.governanceVoteCompleted === false && config.governanceVoteCompleted === false, {
  publicGovernanceVoteCompleted: fullLaunchGovernanceVote.governanceVoteCompleted,
  configGovernanceVoteCompleted: config.governanceVoteCompleted
});

check(checks, "Governance decision not recorded", fullLaunchGovernanceVote.governanceDecisionRecorded === false && config.governanceDecisionRecorded === false, {
  publicGovernanceDecisionRecorded: fullLaunchGovernanceVote.governanceDecisionRecorded,
  configGovernanceDecisionRecorded: config.governanceDecisionRecorded
});

check(checks, "Governance vote opening execution did not open vote", fullLaunchGovernanceVoteOpeningExecution.governanceVoteOpened === false, {
  voteOpeningExecutionGovernanceVoteOpened: fullLaunchGovernanceVoteOpeningExecution.governanceVoteOpened
});

check(checks, "Resolution signing not authorized", config.resolutionSigningAuthorized === false, {
  resolutionSigningAuthorized: config.resolutionSigningAuthorized
});

check(checks, "Governance resolution not signed", config.governanceResolutionSigned === false, {
  governanceResolutionSigned: config.governanceResolutionSigned
});

check(checks, "Governance resolution not published", config.governanceResolutionPublished === false, {
  governanceResolutionPublished: config.governanceResolutionPublished
});

check(checks, "Draft resolution remains draft only", draftResolution.status === "draft only - not signed", {
  status: draftResolution.status
});

check(checks, "Draft resolution decision not approved", draftResolution.decision === "NOT APPROVED", {
  decision: draftResolution.decision
});

check(checks, "Draft resolution has no approved capabilities", Array.isArray(draftResolution.approvedCapabilities) && draftResolution.approvedCapabilities.length === 0, {
  approvedCapabilities: draftResolution.approvedCapabilities || []
});

check(checks, "Draft resolution has no hash", !draftResolution.resolutionHash, {
  resolutionHash: draftResolution.resolutionHash
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
    id: "RESOLUTION-SIGN-001",
    title: "Missing completed vote blocks resolution signing",
    expected: "BLOCKED",
    actual: config.governanceVoteCompleted === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "governance vote is not completed"
  },
  {
    id: "RESOLUTION-SIGN-002",
    title: "Missing vote result blocks resolution signing",
    expected: "BLOCKED",
    actual: config.governanceVoteResultRecorded === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "vote result is not recorded"
  },
  {
    id: "RESOLUTION-SIGN-003",
    title: "Missing signing authorization blocks signing",
    expected: "BLOCKED",
    actual: config.resolutionSigningAuthorized === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "resolution signing authorization is not recorded"
  },
  {
    id: "RESOLUTION-SIGN-004",
    title: "Missing final resolution text blocks signing",
    expected: "BLOCKED",
    actual: config.requiredBeforeResolutionSigning?.resolutionTextFinalApproved === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "resolution text is not final-approved"
  },
  {
    id: "RESOLUTION-SIGN-005",
    title: "Resolution signature attempt",
    expected: "BLOCKED",
    actual: config.governanceResolutionSigned === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "this package must not sign the resolution"
  },
  {
    id: "RESOLUTION-SIGN-006",
    title: "Governance decision record attempt",
    expected: "BLOCKED",
    actual: config.governanceDecisionRecorded === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "no signed resolution or vote result exists"
  },
  {
    id: "RESOLUTION-SIGN-007",
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

for (const [key, value] of Object.entries(config.resolutionSigningChecklist || {})) {
  check(checks, `Resolution signing checklist pending: ${key}`, value === false, { value });
}

for (const [key, value] of Object.entries(config.hardStops || {})) {
  check(checks, `Hard stop remains false: ${key}`, value === false, { value });
}

const failures = checks.filter((item) => !item.pass);
const failedCases = dryRunCases.filter((item) => !item.pass);

const resolutionStatus = {
  governanceResolutionPackagePrepared: Boolean(config.governanceResolutionPackagePrepared),
  draftResolutionPrepared: Boolean(config.draftResolutionPrepared),
  signingEvidencePlanPrepared: Boolean(config.signingEvidencePlanPrepared),
  resolutionSigningAuthorized: Boolean(config.resolutionSigningAuthorized),
  governanceResolutionPrepared: Boolean(config.governanceResolutionPrepared),
  governanceResolutionSigned: Boolean(config.governanceResolutionSigned),
  governanceResolutionPublished: Boolean(config.governanceResolutionPublished),
  governanceDecisionRecorded: Boolean(config.governanceDecisionRecorded),
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
  ? "FULL_LAUNCH_GOVERNANCE_RESOLUTION_PACKAGE_READY_NOT_SIGNED"
  : "FULL_LAUNCH_GOVERNANCE_RESOLUTION_REVIEW_REQUIRED";

const report = {
  schema: "astra-full-launch-governance-resolution-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  mode: "PLANNING_ONLY_RESOLUTION_NOT_SIGNED",
  currentApprovedMode: "restricted-mainnet-operation",
  governanceResolutionSigned: false,
  governanceDecisionRecorded: false,
  fullLaunchApproved: false,
  network: {
    name: "Base Mainnet",
    chainId: 8453
  },
  publicStatement:
    "AstraTreasury governance resolution signing package is ready for review. No resolution is signed, no governance decision is recorded, and full launch is not approved.",
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
  resolutionStatus,
  draftResolution: config.draftResolution || {},
  capabilityApprovals: config.capabilityApprovals || {},
  requiredBeforeResolutionSigning: config.requiredBeforeResolutionSigning || {},
  resolutionSigningChecklist: config.resolutionSigningChecklist || {},
  dryRunCases,
  currentStatuses: {
    stabilization: stabilization.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    fullLaunchGovernance: fullLaunchGovernance.status || "UNKNOWN",
    fullLaunchGovernanceVote: fullLaunchGovernanceVote.status || "UNKNOWN",
    fullLaunchGovernanceVoteOpening: fullLaunchGovernanceVoteOpening.status || "UNKNOWN",
    fullLaunchGovernanceVoteAuthorization: fullLaunchGovernanceVoteAuthorization.status || "UNKNOWN",
    fullLaunchGovernanceVoteOpeningExecution: fullLaunchGovernanceVoteOpeningExecution.status || "UNKNOWN",
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
    "Governance resolution signing authorization package",
    "Governance vote opening live package",
    "Capability-specific activation package"
  ],
  safety: {
    sendsTransactions: false,
    movesFunds: false,
    deploysContracts: false,
    enablesExecution: false,
    approvesPublicSale: false,
    approvesTreasuryFunding: false,
    preparesSafeTransaction: false,
    signsGovernanceResolution: false,
    recordsGovernanceDecision: false
  }
};

writeJson(reportFile, report);

writeJson(publicJsonFile, {
  schema: "astra-public-full-launch-governance-resolution-status-v0.1",
  generatedAt: report.generatedAt,
  status: report.status,
  mode: report.mode,
  currentApprovedMode: report.currentApprovedMode,
  governanceResolutionSigned: report.governanceResolutionSigned,
  governanceDecisionRecorded: report.governanceDecisionRecorded,
  fullLaunchApproved: report.fullLaunchApproved,
  network: report.network,
  publicStatement: report.publicStatement,
  summary: report.summary,
  resolutionStatus: report.resolutionStatus,
  draftResolution: report.draftResolution,
  capabilityApprovals: report.capabilityApprovals,
  requiredBeforeResolutionSigning: report.requiredBeforeResolutionSigning,
  resolutionSigningChecklist: report.resolutionSigningChecklist,
  dryRunCases: report.dryRunCases,
  currentStatuses: report.currentStatuses,
  restrictions: report.restrictions,
  nextPossibleMilestones: report.nextPossibleMilestones
});

const resolutionRows = Object.entries(report.resolutionStatus).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Complete / true" : "Pending / false"}</td></tr>`;
}).join("");

const draftRows = Object.entries(report.draftResolution).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(Array.isArray(value) ? JSON.stringify(value) : value)}</td></tr>`;
}).join("");

const caseRows = dryRunCases.map((item) => {
  return `<tr><td>${escapeHtml(item.id)}</td><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.actual)}</td><td>${item.pass ? "PASS" : "FAIL"}</td></tr>`;
}).join("");

const checklistRows = Object.entries(report.resolutionSigningChecklist).map(([key, value]) => {
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
  <title>AstraTreasury Governance Resolution Signing</title>
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
    <div class="badge">Draft only · resolution not signed</div>
    <h1>Governance Resolution Signing</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
  </section>

  <section class="card">
    <h2>Resolution status</h2>
    <table>
      <thead><tr><th>Item</th><th>Status</th></tr></thead>
      <tbody>${resolutionRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Draft resolution</h2>
    <table>
      <thead><tr><th>Field</th><th>Value</th></tr></thead>
      <tbody>${draftRows}</tbody>
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
    <h2>Signing checklist</h2>
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
      No governance resolution is signed. No governance decision is recorded.
      Full launch and restricted capabilities remain not approved.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/full-launch-governance-resolution">/api/public/full-launch-governance-resolution</a></p>
    <p><a href="/full-launch-governance-vote-opening-execution">Governance vote opening execution</a></p>
    <p><a href="/full-launch-governance-vote">Full-launch governance vote</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Governance Resolution Signing");
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
