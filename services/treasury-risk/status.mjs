import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const files = {
  config: "configs/treasury-risk-limits.config.json",
  stabilization: "public-docs/stabilization-status.json",
  fullLaunch: "public-docs/full-launch-status.json",
  legalFullLaunch: "public-docs/legal-full-launch-status.json",
  treasuryFunding: "public-docs/treasury-funding-status.json",
  executionDryRun: "public-docs/execution-dry-run-status.json",
  disclosures: "public-docs/disclosures-status.json",
  restrictedOps: "public-docs/restricted-operations-status.json",
  mainnetExecution: "public-docs/mainnet-execution-status.json",
  monitor: "public-docs/mainnet-monitor-status.json",
  alerts: "public-docs/mainnet-alerts-status.json",
  incidents: "public-docs/incident-summary.json"
};

const reportDir = path.join(root, "reports", "treasury-risk");
const reportFile = path.join(reportDir, "treasury-risk-limits-status.json");

const publicJsonFile = path.join(root, "public-docs", "treasury-risk-status.json");
const publicHtmlFile = path.join(root, "public-docs", "treasury-risk.html");

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
const executionDryRun = readJson(files.executionDryRun);
const disclosures = readJson(files.disclosures);
const restrictedOps = readJson(files.restrictedOps);
const mainnetExecution = readJson(files.mainnetExecution);
const monitor = readJson(files.monitor);
const alerts = readJson(files.alerts);
const incidents = readJson(files.incidents);

const checks = [];

const activeIncidents = Number(incidents?.summary?.active || 0);
const responseRequired = Boolean(alerts?.responseRequired);
const limits = config.effectiveLimits || {};

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

check(checks, "Treasury funding not approved", config.treasuryFundingApproved === false && treasuryFunding.treasuryFundingApproved === false, {
  configTreasuryFundingApproved: config.treasuryFundingApproved,
  publicTreasuryFundingApproved: treasuryFunding.treasuryFundingApproved
});

check(checks, "Treasury risk limits not active-approved", config.treasuryRiskLimitsApproved === false, {
  treasuryRiskLimitsApproved: config.treasuryRiskLimitsApproved
});

check(checks, "Effective initial funding limit is zero", Number(limits.maximumInitialFundingUsd) === 0, {
  maximumInitialFundingUsd: limits.maximumInitialFundingUsd
});

check(checks, "Effective single transfer limit is zero", Number(limits.maximumSingleTransferUsd) === 0, {
  maximumSingleTransferUsd: limits.maximumSingleTransferUsd
});

check(checks, "Effective daily transfer limit is zero", Number(limits.maximumDailyTransferUsd) === 0, {
  maximumDailyTransferUsd: limits.maximumDailyTransferUsd
});

check(checks, "No approved external treasury assets", Array.isArray(limits.approvedExternalTreasuryAssets) && limits.approvedExternalTreasuryAssets.length === 0, {
  approvedExternalTreasuryAssets: limits.approvedExternalTreasuryAssets || []
});

check(checks, "No approved funding destinations", Array.isArray(limits.approvedFundingDestinations) && limits.approvedFundingDestinations.length === 0, {
  approvedFundingDestinations: limits.approvedFundingDestinations || []
});

check(checks, "Mainnet execution queue disabled", mainnetExecution.mode === "MAINNET_EXECUTION_QUEUE_DISABLED" && limits.executionQueueEnabled === false, {
  mainnetExecutionMode: mainnetExecution.mode || "UNKNOWN",
  effectiveExecutionQueueEnabled: limits.executionQueueEnabled
});

check(checks, "Execution dry run v2 passed disabled mode", executionDryRun.status === "EXECUTION_QUEUE_DRY_RUN_V2_PASS_DISABLED_MODE", {
  status: executionDryRun.status || "UNKNOWN"
});

check(checks, "Public disclosures drafted", disclosures.status === "PUBLIC_DISCLOSURE_UPDATE_DRAFT_READY_NOT_APPROVED", {
  status: disclosures.status || "UNKNOWN"
});

const failures = checks.filter((item) => !item.pass);

const status = failures.length === 0
  ? "TREASURY_RISK_LIMITS_DRAFT_READY_NOT_APPROVED"
  : "TREASURY_RISK_LIMITS_REVIEW_REQUIRED";

const report = {
  schema: "astra-treasury-risk-limits-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  treasuryRiskLimitsApproved: false,
  treasuryFundingApproved: false,
  treasuryFundingTransactionAuthorized: false,
  treasuryFundingExecuted: false,
  network: {
    name: "Base Mainnet",
    chainId: 8453
  },
  publicStatement:
    "AstraTreasury treasury risk limits are drafted for review. Effective funding limits remain zero and no real treasury funding is approved.",
  summary: {
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
    activeIncidents,
    responseRequired
  },
  clearances: config.operatorReportedClearances || {},
  effectiveLimits: config.effectiveLimits || {},
  proposedLimits: config.proposedLimits || {},
  requiredControls: config.requiredControls || {},
  currentStatuses: {
    stabilization: stabilization.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    legalFullLaunch: legalFullLaunch.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
    executionDryRun: executionDryRun.status || "UNKNOWN",
    disclosures: disclosures.status || "UNKNOWN",
    restrictedOperations: restrictedOps.mode || "UNKNOWN",
    mainnetExecution: mainnetExecution.mode || "UNKNOWN",
    monitor: monitor.status || "UNKNOWN",
    alerts: alerts.status || "UNKNOWN",
    incidents: incidents.status || "UNKNOWN"
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
    "Treasury funding source review",
    "Treasury Safe approval package",
    "Treasury funding transaction dry run",
    "Treasury disclosure approval package"
  ],
  safety: {
    sendsTransactions: false,
    movesFunds: false,
    deploysContracts: false,
    enablesExecution: false,
    approvesPublicSale: false,
    approvesTreasuryFunding: false
  }
};

writeJson(reportFile, report);

writeJson(publicJsonFile, {
  schema: "astra-public-treasury-risk-limits-status-v0.1",
  generatedAt: report.generatedAt,
  status: report.status,
  currentApprovedMode: report.currentApprovedMode,
  treasuryRiskLimitsApproved: report.treasuryRiskLimitsApproved,
  treasuryFundingApproved: report.treasuryFundingApproved,
  treasuryFundingTransactionAuthorized: report.treasuryFundingTransactionAuthorized,
  treasuryFundingExecuted: report.treasuryFundingExecuted,
  network: report.network,
  publicStatement: report.publicStatement,
  summary: report.summary,
  effectiveLimits: report.effectiveLimits,
  proposedLimits: report.proposedLimits,
  requiredControls: report.requiredControls,
  currentStatuses: report.currentStatuses,
  restrictions: report.restrictions,
  nextPossibleMilestones: report.nextPossibleMilestones
});

const statusRows = Object.entries(report.currentStatuses).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(humanize(value))}</td></tr>`;
}).join("");

const limitRows = Object.entries(report.effectiveLimits).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td><code>${escapeHtml(Array.isArray(value) ? JSON.stringify(value) : value)}</code></td></tr>`;
}).join("");

const controlRows = Object.entries(report.requiredControls).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Required" : "Not required"}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Treasury Risk Limits</title>
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
    <div class="badge">Drafted for review · no funds authorized</div>
    <h1>Treasury Risk Limits</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
  </section>

  <section class="card">
    <h2>Effective limits</h2>
    <table>
      <thead><tr><th>Limit</th><th>Value</th></tr></thead>
      <tbody>${limitRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Required controls</h2>
    <table>
      <thead><tr><th>Control</th><th>Status</th></tr></thead>
      <tbody>${controlRows}</tbody>
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
      Effective treasury funding limits remain zero. No real treasury funding is approved, authorized, or executed.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/treasury-risk">/api/public/treasury-risk</a></p>
    <p><a href="/treasury-funding">Treasury funding readiness</a></p>
    <p><a href="/disclosures">Public disclosures</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Treasury Risk Limits");
console.log("==================================");
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
