import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const files = {
  config: "configs/full-launch-governance-decision.config.json",
  stabilization: "public-docs/stabilization-status.json",
  fullLaunch: "public-docs/full-launch-status.json",
  legalFullLaunch: "public-docs/legal-full-launch-status.json",
  treasuryFunding: "public-docs/treasury-funding-status.json",
  treasuryRisk: "public-docs/treasury-risk-status.json",
  treasurySource: "public-docs/treasury-source-status.json",
  treasurySafe: "public-docs/treasury-safe-status.json",
  treasuryTransactionDryRun: "public-docs/treasury-transaction-dry-run-status.json",
  treasuryDisclosure: "public-docs/treasury-disclosure-status.json",
  treasurySafeTransaction: "public-docs/treasury-safe-transaction-status.json",
  monitor: "public-docs/mainnet-monitor-status.json",
  alerts: "public-docs/mainnet-alerts-status.json",
  incidents: "public-docs/incident-summary.json",
  mainnetExecution: "public-docs/mainnet-execution-status.json"
};

const reportDir = path.join(root, "reports", "full-launch-governance");
const reportFile = path.join(reportDir, "full-launch-governance-decision-status.json");

const publicJsonFile = path.join(root, "public-docs", "full-launch-governance-status.json");
const publicHtmlFile = path.join(root, "public-docs", "full-launch-governance.html");

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
const legalFullLaunch = readJson(files.legalFullLaunch);
const treasuryFunding = readJson(files.treasuryFunding);
const treasuryRisk = readJson(files.treasuryRisk);
const treasurySource = readJson(files.treasurySource);
const treasurySafe = readJson(files.treasurySafe);
const treasuryTransactionDryRun = readJson(files.treasuryTransactionDryRun);
const treasuryDisclosure = readJson(files.treasuryDisclosure);
const treasurySafeTransaction = readJson(files.treasurySafeTransaction);
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

check(checks, "Governance decision package prepared", config.governanceDecisionPackagePrepared === true, {
  governanceDecisionPackagePrepared: config.governanceDecisionPackagePrepared
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

check(checks, "Governance approval not recorded", config.governanceFullLaunchApprovalRecorded === false, {
  governanceFullLaunchApprovalRecorded: config.governanceFullLaunchApprovalRecorded
});

check(checks, "Governance decision not recorded", config.governanceDecisionRecorded === false, {
  governanceDecisionRecorded: config.governanceDecisionRecorded
});

check(checks, "Legal full-launch not approved", legalFullLaunch.legalFullLaunchApproved === false, {
  legalFullLaunchApproved: legalFullLaunch.legalFullLaunchApproved
});

check(checks, "Treasury funding not approved", treasuryFunding.treasuryFundingApproved === false && config.treasuryFundingApproved === false, {
  publicTreasuryFundingApproved: treasuryFunding.treasuryFundingApproved,
  configTreasuryFundingApproved: config.treasuryFundingApproved
});

check(checks, "Treasury funding not executed", treasuryFunding.treasuryFundingExecuted === false && config.treasuryFundingExecuted === false, {
  publicTreasuryFundingExecuted: treasuryFunding.treasuryFundingExecuted,
  configTreasuryFundingExecuted: config.treasuryFundingExecuted
});

check(checks, "Treasury risk limits not approved", treasuryRisk.treasuryRiskLimitsApproved === false, {
  treasuryRiskLimitsApproved: treasuryRisk.treasuryRiskLimitsApproved
});

check(checks, "Funding source not approved", treasurySource.fundingSourceApproved === false, {
  fundingSourceApproved: treasurySource.fundingSourceApproved
});

check(checks, "Treasury Safe approval not recorded", treasurySafe.treasurySafeApprovalRecorded === false, {
  treasurySafeApprovalRecorded: treasurySafe.treasurySafeApprovalRecorded
});

check(checks, "Treasury transaction dry run passed not-authorized mode", treasuryTransactionDryRun.status === "TREASURY_FUNDING_TRANSACTION_DRY_RUN_PASS_NOT_AUTHORIZED", {
  status: treasuryTransactionDryRun.status || "UNKNOWN"
});

check(checks, "Treasury disclosure not final-approved", treasuryDisclosure.treasuryDisclosureFinalApproved === false, {
  treasuryDisclosureFinalApproved: treasuryDisclosure.treasuryDisclosureFinalApproved
});

check(checks, "Treasury Safe transaction payload not generated", treasurySafeTransaction.safeTransactionPayloadGenerated === false && config.safeTransactionPayloadGenerated === false, {
  publicSafeTransactionPayloadGenerated: treasurySafeTransaction.safeTransactionPayloadGenerated,
  configSafeTransactionPayloadGenerated: config.safeTransactionPayloadGenerated
});

check(checks, "Treasury Safe transaction not prepared", treasurySafeTransaction.safeTransactionPrepared === false && config.safeTransactionPrepared === false, {
  publicSafeTransactionPrepared: treasurySafeTransaction.safeTransactionPrepared,
  configSafeTransactionPrepared: config.safeTransactionPrepared
});

check(checks, "Treasury Safe transaction not executed", treasurySafeTransaction.safeTransactionExecuted === false && config.safeTransactionExecuted === false, {
  publicSafeTransactionExecuted: treasurySafeTransaction.safeTransactionExecuted,
  configSafeTransactionExecuted: config.safeTransactionExecuted
});

check(checks, "Mainnet execution queue disabled", mainnetExecution.mode === "MAINNET_EXECUTION_QUEUE_DISABLED", {
  mode: mainnetExecution.mode || "UNKNOWN"
});

for (const [key, value] of Object.entries(config.capabilityApprovals || {})) {
  check(checks, `Capability not approved: ${key}`, value === false, { value });
}

for (const [key, value] of Object.entries(config.governanceDecisionChecklist || {})) {
  check(checks, `Governance checklist pending: ${key}`, value === false, { value });
}

for (const [key, value] of Object.entries(config.hardStops || {})) {
  check(checks, `Hard stop remains false: ${key}`, value === false, { value });
}

const failures = checks.filter((item) => !item.pass);

const governanceStatus = {
  governanceDecisionPackagePrepared: Boolean(config.governanceDecisionPackagePrepared),
  governanceFullLaunchApprovalRequested: Boolean(config.governanceFullLaunchApprovalRequested),
  governanceFullLaunchApprovalRecorded: Boolean(config.governanceFullLaunchApprovalRecorded),
  governanceDecisionRecorded: Boolean(config.governanceDecisionRecorded),
  fullLaunchApproved: Boolean(config.fullLaunchApproved),
  publicDisclosuresFinalApproved: Boolean(config.publicDisclosuresFinalApproved),
  treasuryDisclosureFinalApproved: Boolean(config.treasuryDisclosureFinalApproved),
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
  ? "FULL_LAUNCH_GOVERNANCE_DECISION_PACKAGE_READY_NOT_APPROVED"
  : "FULL_LAUNCH_GOVERNANCE_DECISION_REVIEW_REQUIRED";

const report = {
  schema: "astra-full-launch-governance-decision-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  mode: "PLANNING_ONLY_GOVERNANCE_DECISION_NOT_RECORDED",
  currentApprovedMode: "restricted-mainnet-operation",
  governanceFullLaunchApprovalRecorded: false,
  governanceDecisionRecorded: false,
  fullLaunchApproved: false,
  network: {
    name: "Base Mainnet",
    chainId: 8453
  },
  publicStatement:
    "AstraTreasury full-launch governance decision package is ready for review. Full launch and restricted capabilities are not approved.",
  summary: {
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
    activeIncidents,
    responseRequired
  },
  clearances: config.operatorReportedClearances || {},
  governanceStatus,
  capabilityApprovals: config.capabilityApprovals || {},
  requiredBeforeGovernanceDecision: config.requiredBeforeGovernanceDecision || {},
  governanceDecisionChecklist: config.governanceDecisionChecklist || {},
  currentStatuses: {
    stabilization: stabilization.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    legalFullLaunch: legalFullLaunch.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
    treasuryRisk: treasuryRisk.status || "UNKNOWN",
    treasurySource: treasurySource.status || "UNKNOWN",
    treasurySafe: treasurySafe.status || "UNKNOWN",
    treasuryTransactionDryRun: treasuryTransactionDryRun.status || "UNKNOWN",
    treasuryDisclosure: treasuryDisclosure.status || "UNKNOWN",
    treasurySafeTransaction: treasurySafeTransaction.status || "UNKNOWN",
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
    "Full-launch governance vote or resolution",
    "Treasury funding authorization package",
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
    recordsGovernanceApproval: false
  }
};

writeJson(reportFile, report);

writeJson(publicJsonFile, {
  schema: "astra-public-full-launch-governance-decision-status-v0.1",
  generatedAt: report.generatedAt,
  status: report.status,
  mode: report.mode,
  currentApprovedMode: report.currentApprovedMode,
  governanceFullLaunchApprovalRecorded: report.governanceFullLaunchApprovalRecorded,
  governanceDecisionRecorded: report.governanceDecisionRecorded,
  fullLaunchApproved: report.fullLaunchApproved,
  network: report.network,
  publicStatement: report.publicStatement,
  summary: report.summary,
  governanceStatus: report.governanceStatus,
  capabilityApprovals: report.capabilityApprovals,
  requiredBeforeGovernanceDecision: report.requiredBeforeGovernanceDecision,
  governanceDecisionChecklist: report.governanceDecisionChecklist,
  currentStatuses: report.currentStatuses,
  restrictions: report.restrictions,
  nextPossibleMilestones: report.nextPossibleMilestones
});

const governanceRows = Object.entries(report.governanceStatus).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Complete / true" : "Pending / false"}</td></tr>`;
}).join("");

const capabilityRows = Object.entries(report.capabilityApprovals).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Approved" : "Not approved"}</td></tr>`;
}).join("");

const checklistRows = Object.entries(report.governanceDecisionChecklist).map(([key, value]) => {
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
  <title>AstraTreasury Full-Launch Governance Decision</title>
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
    <div class="badge">Planning only · governance approval not recorded</div>
    <h1>Full-Launch Governance Decision</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
  </section>

  <section class="card">
    <h2>Governance status</h2>
    <table>
      <thead><tr><th>Item</th><th>Status</th></tr></thead>
      <tbody>${governanceRows}</tbody>
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
    <h2>Governance decision checklist</h2>
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
      Full launch is not approved. No capability is approved. No treasury funding transaction is authorized.
      No Safe payload is generated or executed.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/full-launch-governance">/api/public/full-launch-governance</a></p>
    <p><a href="/full-launch">Full launch readiness</a></p>
    <p><a href="/treasury-safe-transaction">Treasury Safe transaction package</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Full-Launch Governance Decision");
console.log("=============================================");
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
