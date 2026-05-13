import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const files = {
  config: "configs/full-launch-governance-vote-opening-execution.config.json",
  stabilization: "public-docs/stabilization-status.json",
  fullLaunch: "public-docs/full-launch-status.json",
  fullLaunchGovernance: "public-docs/full-launch-governance-status.json",
  fullLaunchGovernanceVote: "public-docs/full-launch-governance-vote-status.json",
  fullLaunchGovernanceVoteOpening: "public-docs/full-launch-governance-vote-opening-status.json",
  fullLaunchGovernanceVoteAuthorization: "public-docs/full-launch-governance-vote-authorization-status.json",
  treasurySafeTransaction: "public-docs/treasury-safe-transaction-status.json",
  treasuryFunding: "public-docs/treasury-funding-status.json",
  monitor: "public-docs/mainnet-monitor-status.json",
  alerts: "public-docs/mainnet-alerts-status.json",
  incidents: "public-docs/incident-summary.json",
  mainnetExecution: "public-docs/mainnet-execution-status.json"
};

const reportDir = path.join(root, "reports", "full-launch-governance-vote-opening-execution");
const reportFile = path.join(reportDir, "full-launch-governance-vote-opening-execution-status.json");

const publicJsonFile = path.join(root, "public-docs", "full-launch-governance-vote-opening-execution-status.json");
const publicHtmlFile = path.join(root, "public-docs", "full-launch-governance-vote-opening-execution.html");

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
const treasurySafeTransaction = readJson(files.treasurySafeTransaction);
const treasuryFunding = readJson(files.treasuryFunding);
const monitor = readJson(files.monitor);
const alerts = readJson(files.alerts);
const incidents = readJson(files.incidents);
const mainnetExecution = readJson(files.mainnetExecution);

const checks = [];
const activeIncidents = Number(incidents?.summary?.active || 0);
const responseRequired = Boolean(alerts?.responseRequired);

check(checks, "Audit clearance recorded", config.operatorReportedClearances?.auditCleared === true, {
  auditCleared: config.operatorReportedClearances?.auditCleared
});

check(checks, "Legal clearance recorded", config.operatorReportedClearances?.legalCleared === true, {
  legalCleared: config.operatorReportedClearances?.legalCleared
});

check(checks, "Vote opening execution package prepared", config.voteOpeningExecutionPackagePrepared === true, {
  voteOpeningExecutionPackagePrepared: config.voteOpeningExecutionPackagePrepared
});

check(checks, "Vote opening execution is dry-run only", config.voteOpeningExecutionDryRunOnly === true, {
  voteOpeningExecutionDryRunOnly: config.voteOpeningExecutionDryRunOnly
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

check(checks, "Vote authorization not recorded", fullLaunchGovernanceVoteAuthorization.governanceVoteAuthorizationRecorded === false && config.governanceVoteAuthorizationRecorded === false, {
  publicGovernanceVoteAuthorizationRecorded: fullLaunchGovernanceVoteAuthorization.governanceVoteAuthorizationRecorded,
  configGovernanceVoteAuthorizationRecorded: config.governanceVoteAuthorizationRecorded
});

check(checks, "Vote opening not authorized", fullLaunchGovernanceVoteOpening.governanceVoteOpeningAuthorized === false && config.governanceVoteOpeningAuthorized === false, {
  publicGovernanceVoteOpeningAuthorized: fullLaunchGovernanceVoteOpening.governanceVoteOpeningAuthorized,
  configGovernanceVoteOpeningAuthorized: config.governanceVoteOpeningAuthorized
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

check(checks, "Public vote notice not published", config.publicVoteNoticePublished === false, {
  publicVoteNoticePublished: config.publicVoteNoticePublished
});

check(checks, "Vote URL not created", config.voteUrlCreated === false && config.openingExecutionPlan?.voteUrl === "not created", {
  voteUrlCreated: config.voteUrlCreated,
  voteUrl: config.openingExecutionPlan?.voteUrl
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
    id: "VOTE-OPEN-EXEC-001",
    title: "Missing authorization blocks vote opening",
    expected: "BLOCKED",
    actual: config.governanceVoteAuthorizationRecorded === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "governance vote authorization is not recorded"
  },
  {
    id: "VOTE-OPEN-EXEC-002",
    title: "Missing final vote scope blocks vote opening",
    expected: "BLOCKED",
    actual: config.requiredBeforeActualVoteOpening?.voteScopeFinalApproved === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "vote scope is not final-approved"
  },
  {
    id: "VOTE-OPEN-EXEC-003",
    title: "Missing final notice blocks vote opening",
    expected: "BLOCKED",
    actual: config.requiredBeforeActualVoteOpening?.publicVoteNoticeFinalApproved === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "public vote notice is not final-approved"
  },
  {
    id: "VOTE-OPEN-EXEC-004",
    title: "Missing evidence plan blocks vote opening",
    expected: "BLOCKED",
    actual: config.requiredBeforeActualVoteOpening?.evidencePlanFinalApproved === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "evidence plan is not final-approved"
  },
  {
    id: "VOTE-OPEN-EXEC-005",
    title: "Vote URL creation attempt",
    expected: "BLOCKED",
    actual: config.voteUrlCreated === false && config.openingExecutionPlan?.voteUrl === "not created" ? "BLOCKED" : "NOT_BLOCKED",
    reason: "this package must not create a vote URL"
  },
  {
    id: "VOTE-OPEN-EXEC-006",
    title: "Public notice publication attempt",
    expected: "BLOCKED",
    actual: config.publicVoteNoticePublished === false && config.openingExecutionPlan?.publicNoticeUrl === "not published" ? "BLOCKED" : "NOT_BLOCKED",
    reason: "this package must not publish a vote notice"
  },
  {
    id: "VOTE-OPEN-EXEC-007",
    title: "Governance decision record attempt",
    expected: "BLOCKED",
    actual: config.governanceDecisionRecorded === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "no vote has been opened or completed"
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

for (const [key, value] of Object.entries(config.openingExecutionChecklist || {})) {
  check(checks, `Opening execution checklist pending: ${key}`, value === false, { value });
}

for (const [key, value] of Object.entries(config.hardStops || {})) {
  check(checks, `Hard stop remains false: ${key}`, value === false, { value });
}

const failures = checks.filter((item) => !item.pass);
const failedCases = dryRunCases.filter((item) => !item.pass);

const openingExecutionStatus = {
  voteOpeningExecutionPackagePrepared: Boolean(config.voteOpeningExecutionPackagePrepared),
  voteOpeningExecutionDryRunOnly: Boolean(config.voteOpeningExecutionDryRunOnly),
  governanceVoteAuthorizationRecorded: Boolean(config.governanceVoteAuthorizationRecorded),
  governanceVoteOpeningAuthorized: Boolean(config.governanceVoteOpeningAuthorized),
  governanceVoteOpened: Boolean(config.governanceVoteOpened),
  governanceVoteCompleted: Boolean(config.governanceVoteCompleted),
  governanceDecisionRecorded: Boolean(config.governanceDecisionRecorded),
  fullLaunchApproved: Boolean(config.fullLaunchApproved),
  publicVoteNoticePublished: Boolean(config.publicVoteNoticePublished),
  voteUrlCreated: Boolean(config.voteUrlCreated),
  voteEvidenceSnapshotCaptured: Boolean(config.voteEvidenceSnapshotCaptured),
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
  ? "FULL_LAUNCH_GOVERNANCE_VOTE_OPENING_EXECUTION_PACKAGE_READY_NO_VOTE_OPENED"
  : "FULL_LAUNCH_GOVERNANCE_VOTE_OPENING_EXECUTION_REVIEW_REQUIRED";

const report = {
  schema: "astra-full-launch-governance-vote-opening-execution-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  mode: "PLANNING_ONLY_NO_VOTE_OPENED",
  currentApprovedMode: "restricted-mainnet-operation",
  governanceVoteOpeningAuthorized: false,
  governanceVoteOpened: false,
  governanceDecisionRecorded: false,
  fullLaunchApproved: false,
  network: {
    name: "Base Mainnet",
    chainId: 8453
  },
  publicStatement:
    "AstraTreasury governance vote opening execution package is ready for review. Vote opening is not authorized, no vote is open, no governance decision is recorded, and full launch is not approved.",
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
  openingExecutionStatus,
  openingExecutionPlan: config.openingExecutionPlan || {},
  requiredBeforeActualVoteOpening: config.requiredBeforeActualVoteOpening || {},
  openingExecutionChecklist: config.openingExecutionChecklist || {},
  dryRunCases,
  capabilityApprovals: config.capabilityApprovals || {},
  currentStatuses: {
    stabilization: stabilization.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    fullLaunchGovernance: fullLaunchGovernance.status || "UNKNOWN",
    fullLaunchGovernanceVote: fullLaunchGovernanceVote.status || "UNKNOWN",
    fullLaunchGovernanceVoteOpening: fullLaunchGovernanceVoteOpening.status || "UNKNOWN",
    fullLaunchGovernanceVoteAuthorization: fullLaunchGovernanceVoteAuthorization.status || "UNKNOWN",
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
    "Governance vote opening authorization execution",
    "Governance vote opening live package",
    "Governance resolution signing package"
  ],
  safety: {
    sendsTransactions: false,
    movesFunds: false,
    deploysContracts: false,
    enablesExecution: false,
    approvesPublicSale: false,
    approvesTreasuryFunding: false,
    preparesSafeTransaction: false,
    opensGovernanceVote: false,
    recordsGovernanceDecision: false
  }
};

writeJson(reportFile, report);

writeJson(publicJsonFile, {
  schema: "astra-public-full-launch-governance-vote-opening-execution-status-v0.1",
  generatedAt: report.generatedAt,
  status: report.status,
  mode: report.mode,
  currentApprovedMode: report.currentApprovedMode,
  governanceVoteOpeningAuthorized: report.governanceVoteOpeningAuthorized,
  governanceVoteOpened: report.governanceVoteOpened,
  governanceDecisionRecorded: report.governanceDecisionRecorded,
  fullLaunchApproved: report.fullLaunchApproved,
  network: report.network,
  publicStatement: report.publicStatement,
  summary: report.summary,
  openingExecutionStatus: report.openingExecutionStatus,
  openingExecutionPlan: report.openingExecutionPlan,
  requiredBeforeActualVoteOpening: report.requiredBeforeActualVoteOpening,
  openingExecutionChecklist: report.openingExecutionChecklist,
  dryRunCases: report.dryRunCases,
  capabilityApprovals: report.capabilityApprovals,
  currentStatuses: report.currentStatuses,
  restrictions: report.restrictions,
  nextPossibleMilestones: report.nextPossibleMilestones
});

const executionRows = Object.entries(report.openingExecutionStatus).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Complete / true" : "Pending / false"}</td></tr>`;
}).join("");

const planRows = Object.entries(report.openingExecutionPlan).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const caseRows = dryRunCases.map((item) => {
  return `<tr><td>${escapeHtml(item.id)}</td><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.actual)}</td><td>${item.pass ? "PASS" : "FAIL"}</td></tr>`;
}).join("");

const checklistRows = Object.entries(report.openingExecutionChecklist).map(([key, value]) => {
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
  <title>AstraTreasury Governance Vote Opening Execution</title>
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
    <div class="badge">Dry run only · no vote opened</div>
    <h1>Governance Vote Opening Execution</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
  </section>

  <section class="card">
    <h2>Opening execution status</h2>
    <table>
      <thead><tr><th>Item</th><th>Status</th></tr></thead>
      <tbody>${executionRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Opening execution plan</h2>
    <table>
      <thead><tr><th>Field</th><th>Value</th></tr></thead>
      <tbody>${planRows}</tbody>
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
    <h2>Opening execution checklist</h2>
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
      Vote opening is not authorized. No vote URL is created. No public vote notice is published.
      No governance decision is recorded. Full launch and restricted capabilities remain not approved.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/full-launch-governance-vote-opening-execution">/api/public/full-launch-governance-vote-opening-execution</a></p>
    <p><a href="/full-launch-governance-vote-authorization">Governance vote authorization</a></p>
    <p><a href="/full-launch-governance-vote-opening">Governance vote opening</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Governance Vote Opening Execution");
console.log("===============================================");
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
