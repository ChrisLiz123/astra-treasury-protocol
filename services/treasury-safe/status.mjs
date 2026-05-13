import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const files = {
  config: "configs/treasury-safe-approval.config.json",
  mainnet: "public-docs/mainnet-status.json",
  stabilization: "public-docs/stabilization-status.json",
  fullLaunch: "public-docs/full-launch-status.json",
  legalFullLaunch: "public-docs/legal-full-launch-status.json",
  treasuryFunding: "public-docs/treasury-funding-status.json",
  treasuryRisk: "public-docs/treasury-risk-status.json",
  treasurySource: "public-docs/treasury-source-status.json",
  disclosures: "public-docs/disclosures-status.json",
  monitor: "public-docs/mainnet-monitor-status.json",
  alerts: "public-docs/mainnet-alerts-status.json",
  incidents: "public-docs/incident-summary.json",
  mainnetExecution: "public-docs/mainnet-execution-status.json"
};

const reportDir = path.join(root, "reports", "treasury-safe");
const reportFile = path.join(reportDir, "treasury-safe-approval-status.json");

const publicJsonFile = path.join(root, "public-docs", "treasury-safe-status.json");
const publicHtmlFile = path.join(root, "public-docs", "treasury-safe.html");

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
const mainnet = readJson(files.mainnet);
const stabilization = readJson(files.stabilization);
const fullLaunch = readJson(files.fullLaunch);
const legalFullLaunch = readJson(files.legalFullLaunch);
const treasuryFunding = readJson(files.treasuryFunding);
const treasuryRisk = readJson(files.treasuryRisk);
const treasurySource = readJson(files.treasurySource);
const disclosures = readJson(files.disclosures);
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

check(checks, "Full launch not approved", fullLaunch.fullLaunchApproved === false, {
  fullLaunchApproved: fullLaunch.fullLaunchApproved
});

check(checks, "Legal full launch not approved", legalFullLaunch.legalFullLaunchApproved === false, {
  legalFullLaunchApproved: legalFullLaunch.legalFullLaunchApproved
});

check(checks, "Treasury funding not approved", treasuryFunding.treasuryFundingApproved === false, {
  treasuryFundingApproved: treasuryFunding.treasuryFundingApproved
});

check(checks, "Treasury funding not executed", treasuryFunding.treasuryFundingExecuted === false, {
  treasuryFundingExecuted: treasuryFunding.treasuryFundingExecuted
});

check(checks, "Treasury risk limits not approved", treasuryRisk.treasuryRiskLimitsApproved === false, {
  treasuryRiskLimitsApproved: treasuryRisk.treasuryRiskLimitsApproved
});

check(checks, "Funding source not approved", treasurySource.fundingSourceApproved === false, {
  fundingSourceApproved: treasurySource.fundingSourceApproved
});

check(checks, "Mainnet execution queue disabled", mainnetExecution.mode === "MAINNET_EXECUTION_QUEUE_DISABLED", {
  mode: mainnetExecution.mode || "UNKNOWN"
});

check(checks, "Treasury Safe approval not recorded", config.treasurySafeApprovalRecorded === false, {
  treasurySafeApprovalRecorded: config.treasurySafeApprovalRecorded
});

check(checks, "Treasury Safe transaction not prepared", config.treasurySafeTransactionPrepared === false, {
  treasurySafeTransactionPrepared: config.treasurySafeTransactionPrepared
});

check(checks, "Treasury Safe transaction not submitted", config.treasurySafeTransactionSubmitted === false, {
  treasurySafeTransactionSubmitted: config.treasurySafeTransactionSubmitted
});

check(checks, "Treasury Safe transaction not executed", config.treasurySafeTransactionExecuted === false, {
  treasurySafeTransactionExecuted: config.treasurySafeTransactionExecuted
});

check(checks, "Disclosures drafted, not final-approved", disclosures.status === "PUBLIC_DISCLOSURE_UPDATE_DRAFT_READY_NOT_APPROVED", {
  status: disclosures.status || "UNKNOWN"
});

for (const [key, value] of Object.entries(config.hardStops || {})) {
  check(checks, `Hard stop remains false: ${key}`, value === false, { value });
}

const failures = checks.filter((item) => !item.pass);

const treasurySafeStatus = {
  treasurySafeApprovalRequested: Boolean(config.treasurySafeApprovalRequested),
  treasurySafeApprovalRecorded: Boolean(config.treasurySafeApprovalRecorded),
  treasurySafeTransactionPrepared: Boolean(config.treasurySafeTransactionPrepared),
  treasurySafeTransactionSubmitted: Boolean(config.treasurySafeTransactionSubmitted),
  treasurySafeTransactionExecuted: Boolean(config.treasurySafeTransactionExecuted),
  treasuryFundingApproved: Boolean(config.treasuryFundingApproved),
  treasuryFundingTransactionAuthorized: Boolean(config.treasuryFundingTransactionAuthorized),
  treasuryFundingExecuted: Boolean(config.treasuryFundingExecuted),
  fundingSourceApproved: Boolean(config.fundingSourceApproved),
  treasuryRiskLimitsApproved: Boolean(config.treasuryRiskLimitsApproved)
};

const status = failures.length === 0
  ? "TREASURY_SAFE_APPROVAL_TRACK_OPEN_NOT_APPROVED"
  : "TREASURY_SAFE_APPROVAL_REVIEW_REQUIRED";

const report = {
  schema: "astra-treasury-safe-approval-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  treasurySafeApprovalRecorded: false,
  treasurySafeTransactionPrepared: false,
  treasurySafeTransactionSubmitted: false,
  treasurySafeTransactionExecuted: false,
  treasuryFundingApproved: false,
  treasuryFundingTransactionAuthorized: false,
  treasuryFundingExecuted: false,
  network: {
    name: "Base Mainnet",
    chainId: 8453
  },
  publicStatement:
    "AstraTreasury Treasury Safe approval track is open for planning. No Treasury Safe approval is recorded, no Safe transaction is prepared, and no real treasury funding is authorized.",
  summary: {
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
    activeIncidents,
    responseRequired
  },
  clearances: config.operatorReportedClearances || {},
  treasurySafeStatus,
  requiredBeforeTreasurySafeApproval: config.requiredBeforeTreasurySafeApproval || {},
  safeApprovalChecklist: config.safeApprovalChecklist || {},
  currentStatuses: {
    stabilization: stabilization.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    legalFullLaunch: legalFullLaunch.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
    treasuryRisk: treasuryRisk.status || "UNKNOWN",
    treasurySource: treasurySource.status || "UNKNOWN",
    disclosures: disclosures.status || "UNKNOWN",
    monitor: monitor.status || "UNKNOWN",
    alerts: alerts.status || "UNKNOWN",
    incidents: incidents.status || "UNKNOWN",
    mainnetExecution: mainnetExecution.mode || "UNKNOWN"
  },
  safes: mainnet.safes || {},
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
    "Treasury funding transaction dry run",
    "Treasury disclosure approval package",
    "Treasury Safe transaction package preparation"
  ],
  safety: {
    sendsTransactions: false,
    movesFunds: false,
    deploysContracts: false,
    enablesExecution: false,
    approvesPublicSale: false,
    approvesTreasuryFunding: false,
    preparesSafeTransaction: false
  }
};

writeJson(reportFile, report);

writeJson(publicJsonFile, {
  schema: "astra-public-treasury-safe-approval-status-v0.1",
  generatedAt: report.generatedAt,
  status: report.status,
  currentApprovedMode: report.currentApprovedMode,
  treasurySafeApprovalRecorded: report.treasurySafeApprovalRecorded,
  treasurySafeTransactionPrepared: report.treasurySafeTransactionPrepared,
  treasurySafeTransactionSubmitted: report.treasurySafeTransactionSubmitted,
  treasurySafeTransactionExecuted: report.treasurySafeTransactionExecuted,
  treasuryFundingApproved: report.treasuryFundingApproved,
  treasuryFundingTransactionAuthorized: report.treasuryFundingTransactionAuthorized,
  treasuryFundingExecuted: report.treasuryFundingExecuted,
  network: report.network,
  publicStatement: report.publicStatement,
  summary: report.summary,
  treasurySafeStatus: report.treasurySafeStatus,
  requiredBeforeTreasurySafeApproval: report.requiredBeforeTreasurySafeApproval,
  safeApprovalChecklist: report.safeApprovalChecklist,
  currentStatuses: report.currentStatuses,
  safes: report.safes,
  restrictions: report.restrictions,
  nextPossibleMilestones: report.nextPossibleMilestones
});

const statusRows = Object.entries(report.currentStatuses).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(humanize(value))}</td></tr>`;
}).join("");

const safeRows = Object.entries(report.safes || {}).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td><code>${escapeHtml(value)}</code></td></tr>`;
}).join("");

const approvalRows = Object.entries(report.treasurySafeStatus).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Complete" : "Pending / not approved"}</td></tr>`;
}).join("");

const checklistRows = Object.entries(report.safeApprovalChecklist).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Complete" : "Pending"}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Treasury Safe Approval</title>
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

    code {
      color: var(--muted);
      overflow-wrap: anywhere;
      font-size: 12px;
    }

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
    <div class="badge">Planning only · Safe approval not recorded</div>
    <h1>Treasury Safe Approval</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
  </section>

  <section class="card">
    <h2>Safe addresses</h2>
    <table>
      <thead><tr><th>Safe</th><th>Address</th></tr></thead>
      <tbody>${safeRows || '<tr><td colspan="2">No Safe addresses found in public manifest.</td></tr>'}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Treasury Safe approval status</h2>
    <table>
      <thead><tr><th>Item</th><th>Status</th></tr></thead>
      <tbody>${approvalRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Safe-owner checklist</h2>
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
      No Treasury Safe approval is recorded. No Treasury Safe transaction is prepared, submitted, signed, or executed.
      No real treasury funding is approved or authorized.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/treasury-safe">/api/public/treasury-safe</a></p>
    <p><a href="/treasury-source">Treasury funding source review</a></p>
    <p><a href="/treasury-risk">Treasury risk limits</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Treasury Safe Approval");
console.log("====================================");
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
