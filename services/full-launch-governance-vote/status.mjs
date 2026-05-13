import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const files = {
  config: "configs/full-launch-governance-vote.config.json",
  stabilization: "public-docs/stabilization-status.json",
  fullLaunch: "public-docs/full-launch-status.json",
  fullLaunchGovernance: "public-docs/full-launch-governance-status.json",
  treasurySafeTransaction: "public-docs/treasury-safe-transaction-status.json",
  treasuryFunding: "public-docs/treasury-funding-status.json",
  monitor: "public-docs/mainnet-monitor-status.json",
  alerts: "public-docs/mainnet-alerts-status.json",
  incidents: "public-docs/incident-summary.json",
  mainnetExecution: "public-docs/mainnet-execution-status.json"
};

const reportDir = path.join(root, "reports", "full-launch-governance-vote");
const reportFile = path.join(reportDir, "full-launch-governance-vote-status.json");

const publicJsonFile = path.join(root, "public-docs", "full-launch-governance-vote-status.json");
const publicHtmlFile = path.join(root, "public-docs", "full-launch-governance-vote.html");

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

check(checks, "Governance vote package prepared", config.governanceVotePackagePrepared === true, {
  governanceVotePackagePrepared: config.governanceVotePackagePrepared
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

check(checks, "Governance full-launch approval not recorded", fullLaunchGovernance.governanceFullLaunchApprovalRecorded === false && config.governanceFullLaunchApprovalRecorded === false, {
  publicGovernanceFullLaunchApprovalRecorded: fullLaunchGovernance.governanceFullLaunchApprovalRecorded,
  configGovernanceFullLaunchApprovalRecorded: config.governanceFullLaunchApprovalRecorded
});

check(checks, "Governance vote not opened", config.governanceVoteOpened === false, {
  governanceVoteOpened: config.governanceVoteOpened
});

check(checks, "Governance vote not completed", config.governanceVoteCompleted === false, {
  governanceVoteCompleted: config.governanceVoteCompleted
});

check(checks, "Governance resolution not signed", config.governanceResolutionSigned === false, {
  governanceResolutionSigned: config.governanceResolutionSigned
});

check(checks, "Governance decision not recorded", config.governanceDecisionRecorded === false, {
  governanceDecisionRecorded: config.governanceDecisionRecorded
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

check(checks, "Safe transaction not executed", treasurySafeTransaction.safeTransactionExecuted === false && config.safeTransactionExecuted === false, {
  publicSafeTransactionExecuted: treasurySafeTransaction.safeTransactionExecuted,
  configSafeTransactionExecuted: config.safeTransactionExecuted
});

check(checks, "Mainnet execution queue disabled", mainnetExecution.mode === "MAINNET_EXECUTION_QUEUE_DISABLED", {
  mode: mainnetExecution.mode || "UNKNOWN"
});

for (const [key, value] of Object.entries(config.capabilityApprovals || {})) {
  check(checks, `Capability not approved: ${key}`, value === false, { value });
}

for (const [key, value] of Object.entries(config.voteChecklist || {})) {
  check(checks, `Vote checklist pending: ${key}`, value === false, { value });
}

for (const [key, value] of Object.entries(config.hardStops || {})) {
  check(checks, `Hard stop remains false: ${key}`, value === false, { value });
}

const failures = checks.filter((item) => !item.pass);

const voteStatus = {
  governanceVotePackagePrepared: Boolean(config.governanceVotePackagePrepared),
  governanceVoteOpened: Boolean(config.governanceVoteOpened),
  governanceVoteCompleted: Boolean(config.governanceVoteCompleted),
  governanceResolutionPrepared: Boolean(config.governanceResolutionPrepared),
  governanceResolutionSigned: Boolean(config.governanceResolutionSigned),
  governanceDecisionRecorded: Boolean(config.governanceDecisionRecorded),
  governanceFullLaunchApprovalRecorded: Boolean(config.governanceFullLaunchApprovalRecorded),
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
  ? "FULL_LAUNCH_GOVERNANCE_VOTE_PACKAGE_READY_NOT_OPENED"
  : "FULL_LAUNCH_GOVERNANCE_VOTE_REVIEW_REQUIRED";

const report = {
  schema: "astra-full-launch-governance-vote-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  mode: "PLANNING_ONLY_VOTE_NOT_OPENED",
  currentApprovedMode: "restricted-mainnet-operation",
  governanceVoteOpened: false,
  governanceVoteCompleted: false,
  governanceDecisionRecorded: false,
  fullLaunchApproved: false,
  network: {
    name: "Base Mainnet",
    chainId: 8453
  },
  publicStatement:
    "AstraTreasury full-launch governance vote package is ready for review. No vote is open, no governance decision is recorded, and full launch is not approved.",
  summary: {
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
    activeIncidents,
    responseRequired
  },
  clearances: config.operatorReportedClearances || {},
  voteStatus,
  capabilityApprovals: config.capabilityApprovals || {},
  requiredBeforeVoteOpening: config.requiredBeforeVoteOpening || {},
  voteChecklist: config.voteChecklist || {},
  proposedVoteScope: config.proposedVoteScope || {},
  currentStatuses: {
    stabilization: stabilization.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    fullLaunchGovernance: fullLaunchGovernance.status || "UNKNOWN",
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
    "Governance vote opening package",
    "Governance resolution signing package",
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
    opensGovernanceVote: false,
    recordsGovernanceDecision: false
  }
};

writeJson(reportFile, report);

writeJson(publicJsonFile, {
  schema: "astra-public-full-launch-governance-vote-status-v0.1",
  generatedAt: report.generatedAt,
  status: report.status,
  mode: report.mode,
  currentApprovedMode: report.currentApprovedMode,
  governanceVoteOpened: report.governanceVoteOpened,
  governanceVoteCompleted: report.governanceVoteCompleted,
  governanceDecisionRecorded: report.governanceDecisionRecorded,
  fullLaunchApproved: report.fullLaunchApproved,
  network: report.network,
  publicStatement: report.publicStatement,
  summary: report.summary,
  voteStatus: report.voteStatus,
  capabilityApprovals: report.capabilityApprovals,
  requiredBeforeVoteOpening: report.requiredBeforeVoteOpening,
  voteChecklist: report.voteChecklist,
  proposedVoteScope: report.proposedVoteScope,
  currentStatuses: report.currentStatuses,
  restrictions: report.restrictions,
  nextPossibleMilestones: report.nextPossibleMilestones
});

const voteRows = Object.entries(report.voteStatus).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Complete / true" : "Pending / false"}</td></tr>`;
}).join("");

const capabilityRows = Object.entries(report.capabilityApprovals).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Approved" : "Not approved"}</td></tr>`;
}).join("");

const scopeRows = Object.entries(report.proposedVoteScope).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const checklistRows = Object.entries(report.voteChecklist).map(([key, value]) => {
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
  <title>AstraTreasury Full-Launch Governance Vote</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #08111f;
      --surface: #0e1a2b;
      --border: rgba(148, 163, 184, 0.2);
      --text: #edf4fb;
      --muted: #9aaec4;
      --blue: #67a7ff;
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
      background: rgba(244,195,95,.08);
      border: 1px solid rgba(244,195,95,.22);
      color: var(--yellow);
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
    <div class="badge">Planning only · vote not opened</div>
    <h1>Full-Launch Governance Vote</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
  </section>

  <section class="card">
    <h2>Vote status</h2>
    <table>
      <thead><tr><th>Item</th><th>Status</th></tr></thead>
      <tbody>${voteRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Proposed vote scope</h2>
    <table>
      <thead><tr><th>Area</th><th>Scope</th></tr></thead>
      <tbody>${scopeRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Capability approvals</h2>
    <table>
      <thead><tr><th>Capability</th><th>Status</th></tr></thead>
      <tbody>${capabilityRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Vote checklist</h2>
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
      No vote is open. No governance decision is recorded. Full launch is not approved.
      No treasury funding transaction is authorized, and no Safe payload is generated.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/full-launch-governance-vote">/api/public/full-launch-governance-vote</a></p>
    <p><a href="/full-launch-governance">Full-launch governance decision</a></p>
    <p><a href="/full-launch">Full launch readiness</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Full-Launch Governance Vote");
console.log("=========================================");
console.log(`Status: ${report.status}`);
console.log(`Checks passed: ${report.summary.passed}/${report.summary.totalChecks}`);
console.log(`Report: ${reportFile}`);

if (failures.length > 0) {
  console.table(failures.map((item) => ({
    name: item.name,
    details: JSON.stringify(item.details).slice(0, 240)
  })));
  process.exit(1);
}
