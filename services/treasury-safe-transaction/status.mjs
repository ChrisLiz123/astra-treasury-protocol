import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const files = {
  config: "configs/treasury-safe-transaction-package.config.json",
  mainnet: "public-docs/mainnet-status.json",
  stabilization: "public-docs/stabilization-status.json",
  treasuryDisclosure: "public-docs/treasury-disclosure-status.json",
  treasuryTransactionDryRun: "public-docs/treasury-transaction-dry-run-status.json",
  treasurySafe: "public-docs/treasury-safe-status.json",
  treasurySource: "public-docs/treasury-source-status.json",
  treasuryRisk: "public-docs/treasury-risk-status.json",
  treasuryFunding: "public-docs/treasury-funding-status.json",
  monitor: "public-docs/mainnet-monitor-status.json",
  alerts: "public-docs/mainnet-alerts-status.json",
  incidents: "public-docs/incident-summary.json",
  mainnetExecution: "public-docs/mainnet-execution-status.json"
};

const reportDir = path.join(root, "reports", "treasury-safe-transaction");
const reportFile = path.join(reportDir, "treasury-safe-transaction-package-status.json");

const publicJsonFile = path.join(root, "public-docs", "treasury-safe-transaction-status.json");
const publicHtmlFile = path.join(root, "public-docs", "treasury-safe-transaction.html");

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
const treasuryDisclosure = readJson(files.treasuryDisclosure);
const treasuryTransactionDryRun = readJson(files.treasuryTransactionDryRun);
const treasurySafe = readJson(files.treasurySafe);
const treasurySource = readJson(files.treasurySource);
const treasuryRisk = readJson(files.treasuryRisk);
const treasuryFunding = readJson(files.treasuryFunding);
const monitor = readJson(files.monitor);
const alerts = readJson(files.alerts);
const incidents = readJson(files.incidents);
const mainnetExecution = readJson(files.mainnetExecution);

const checks = [];

const activeIncidents = Number(incidents?.summary?.active || 0);
const responseRequired = Boolean(alerts?.responseRequired);
const template = config.transactionTemplate || {};

check(checks, "Audit clearance recorded", config.operatorReportedClearances?.auditCleared === true, {
  auditCleared: config.operatorReportedClearances?.auditCleared
});

check(checks, "Legal clearance recorded", config.operatorReportedClearances?.legalCleared === true, {
  legalCleared: config.operatorReportedClearances?.legalCleared
});

check(checks, "Transaction package scaffold prepared", config.transactionPackageScaffoldPrepared === true, {
  transactionPackageScaffoldPrepared: config.transactionPackageScaffoldPrepared
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

check(checks, "Treasury disclosure not final-approved", treasuryDisclosure.treasuryDisclosureFinalApproved === false, {
  treasuryDisclosureFinalApproved: treasuryDisclosure.treasuryDisclosureFinalApproved
});

check(checks, "Treasury transaction dry run passed not-authorized mode", treasuryTransactionDryRun.status === "TREASURY_FUNDING_TRANSACTION_DRY_RUN_PASS_NOT_AUTHORIZED", {
  status: treasuryTransactionDryRun.status || "UNKNOWN"
});

check(checks, "Treasury Safe approval not recorded", treasurySafe.treasurySafeApprovalRecorded === false, {
  treasurySafeApprovalRecorded: treasurySafe.treasurySafeApprovalRecorded
});

check(checks, "Treasury Safe transaction not prepared", treasurySafe.treasurySafeTransactionPrepared === false && config.safeTransactionPrepared === false, {
  publicTreasurySafeTransactionPrepared: treasurySafe.treasurySafeTransactionPrepared,
  configSafeTransactionPrepared: config.safeTransactionPrepared
});

check(checks, "Treasury Safe transaction not submitted", treasurySafe.treasurySafeTransactionSubmitted === false && config.safeTransactionSubmitted === false, {
  publicTreasurySafeTransactionSubmitted: treasurySafe.treasurySafeTransactionSubmitted,
  configSafeTransactionSubmitted: config.safeTransactionSubmitted
});

check(checks, "Treasury Safe transaction not signed", config.safeTransactionSigned === false, {
  safeTransactionSigned: config.safeTransactionSigned
});

check(checks, "Treasury Safe transaction not executed", treasurySafe.treasurySafeTransactionExecuted === false && config.safeTransactionExecuted === false, {
  publicTreasurySafeTransactionExecuted: treasurySafe.treasurySafeTransactionExecuted,
  configSafeTransactionExecuted: config.safeTransactionExecuted
});

check(checks, "Funding source not approved", treasurySource.fundingSourceApproved === false && config.fundingSourceApproved === false, {
  publicFundingSourceApproved: treasurySource.fundingSourceApproved,
  configFundingSourceApproved: config.fundingSourceApproved
});

check(checks, "Treasury risk limits not approved", treasuryRisk.treasuryRiskLimitsApproved === false && config.treasuryRiskLimitsApproved === false, {
  publicTreasuryRiskLimitsApproved: treasuryRisk.treasuryRiskLimitsApproved,
  configTreasuryRiskLimitsApproved: config.treasuryRiskLimitsApproved
});

check(checks, "Treasury funding not approved", treasuryFunding.treasuryFundingApproved === false && config.treasuryFundingApproved === false, {
  publicTreasuryFundingApproved: treasuryFunding.treasuryFundingApproved,
  configTreasuryFundingApproved: config.treasuryFundingApproved
});

check(checks, "Treasury funding transaction not authorized", treasuryFunding.treasuryFundingTransactionAuthorized === false && config.treasuryFundingTransactionAuthorized === false, {
  publicTreasuryFundingTransactionAuthorized: treasuryFunding.treasuryFundingTransactionAuthorized,
  configTreasuryFundingTransactionAuthorized: config.treasuryFundingTransactionAuthorized
});

check(checks, "Treasury funding not executed", treasuryFunding.treasuryFundingExecuted === false && config.treasuryFundingExecuted === false, {
  publicTreasuryFundingExecuted: treasuryFunding.treasuryFundingExecuted,
  configTreasuryFundingExecuted: config.treasuryFundingExecuted
});

check(checks, "Mainnet execution queue disabled", mainnetExecution.mode === "MAINNET_EXECUTION_QUEUE_DISABLED", {
  mode: mainnetExecution.mode || "UNKNOWN"
});

check(checks, "No calldata generated", template.calldata === "not generated", {
  calldata: template.calldata
});

check(checks, "No Safe payload generated", template.safePayload === "not generated" && config.safeTransactionPayloadGenerated === false, {
  safePayload: template.safePayload,
  safeTransactionPayloadGenerated: config.safeTransactionPayloadGenerated
});

check(checks, "No Safe transaction hash", !template.safeTxHash, {
  safeTxHash: template.safeTxHash
});

check(checks, "No execution transaction hash", !template.executionTxHash, {
  executionTxHash: template.executionTxHash
});

for (const [key, value] of Object.entries(config.payloadPreparationRules || {})) {
  check(checks, `Payload preparation safety rule active: ${key}`, value === true, { value });
}

for (const [key, value] of Object.entries(config.hardStops || {})) {
  check(checks, `Hard stop remains false: ${key}`, value === false, { value });
}

const failures = checks.filter((item) => !item.pass);

const packageStatus = {
  transactionPackageScaffoldPrepared: Boolean(config.transactionPackageScaffoldPrepared),
  safeTransactionPayloadGenerated: Boolean(config.safeTransactionPayloadGenerated),
  safeTransactionPrepared: Boolean(config.safeTransactionPrepared),
  safeTransactionSubmitted: Boolean(config.safeTransactionSubmitted),
  safeTransactionSigned: Boolean(config.safeTransactionSigned),
  safeTransactionExecuted: Boolean(config.safeTransactionExecuted),
  treasuryFundingTransactionAuthorized: Boolean(config.treasuryFundingTransactionAuthorized),
  treasuryFundingExecuted: Boolean(config.treasuryFundingExecuted),
  treasurySafeApprovalRecorded: Boolean(config.treasurySafeApprovalRecorded),
  treasuryDisclosureFinalApproved: Boolean(config.treasuryDisclosureFinalApproved),
  treasuryRiskLimitsApproved: Boolean(config.treasuryRiskLimitsApproved),
  fundingSourceApproved: Boolean(config.fundingSourceApproved),
  treasuryFundingApproved: Boolean(config.treasuryFundingApproved)
};

const status = failures.length === 0
  ? "TREASURY_SAFE_TRANSACTION_PACKAGE_SCAFFOLD_READY_NO_PAYLOAD"
  : "TREASURY_SAFE_TRANSACTION_PACKAGE_REVIEW_REQUIRED";

const report = {
  schema: "astra-treasury-safe-transaction-package-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  mode: "PLANNING_ONLY_NO_SAFE_PAYLOAD",
  currentApprovedMode: "restricted-mainnet-operation",
  safeTransactionPayloadGenerated: false,
  safeTransactionPrepared: false,
  safeTransactionSubmitted: false,
  safeTransactionSigned: false,
  safeTransactionExecuted: false,
  treasuryFundingTransactionAuthorized: false,
  treasuryFundingExecuted: false,
  network: {
    name: "Base Mainnet",
    chainId: 8453
  },
  publicStatement:
    "AstraTreasury Treasury Safe transaction package scaffold is prepared for review. No Safe payload is generated, no Safe transaction is prepared, and no treasury funding is authorized.",
  summary: {
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
    activeIncidents,
    responseRequired
  },
  clearances: config.operatorReportedClearances || {},
  packageStatus,
  requiredBeforePayloadGeneration: config.requiredBeforePayloadGeneration || {},
  payloadPreparationRules: config.payloadPreparationRules || {},
  transactionTemplate: config.transactionTemplate || {},
  currentStatuses: {
    stabilization: stabilization.status || "UNKNOWN",
    treasuryDisclosure: treasuryDisclosure.status || "UNKNOWN",
    treasuryTransactionDryRun: treasuryTransactionDryRun.status || "UNKNOWN",
    treasurySafe: treasurySafe.status || "UNKNOWN",
    treasurySource: treasurySource.status || "UNKNOWN",
    treasuryRisk: treasuryRisk.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
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
    "Full-launch governance decision package",
    "Treasury funding authorization package",
    "Treasury Safe transaction payload generation package"
  ],
  safety: {
    sendsTransactions: false,
    movesFunds: false,
    deploysContracts: false,
    enablesExecution: false,
    approvesPublicSale: false,
    approvesTreasuryFunding: false,
    preparesSafeTransaction: false,
    submitsSafeTransaction: false,
    signsSafeTransaction: false,
    generatesSafePayload: false
  }
};

writeJson(reportFile, report);

writeJson(publicJsonFile, {
  schema: "astra-public-treasury-safe-transaction-package-status-v0.1",
  generatedAt: report.generatedAt,
  status: report.status,
  mode: report.mode,
  currentApprovedMode: report.currentApprovedMode,
  safeTransactionPayloadGenerated: report.safeTransactionPayloadGenerated,
  safeTransactionPrepared: report.safeTransactionPrepared,
  safeTransactionSubmitted: report.safeTransactionSubmitted,
  safeTransactionSigned: report.safeTransactionSigned,
  safeTransactionExecuted: report.safeTransactionExecuted,
  treasuryFundingTransactionAuthorized: report.treasuryFundingTransactionAuthorized,
  treasuryFundingExecuted: report.treasuryFundingExecuted,
  network: report.network,
  publicStatement: report.publicStatement,
  summary: report.summary,
  packageStatus: report.packageStatus,
  requiredBeforePayloadGeneration: report.requiredBeforePayloadGeneration,
  payloadPreparationRules: report.payloadPreparationRules,
  transactionTemplate: report.transactionTemplate,
  currentStatuses: report.currentStatuses,
  safes: report.safes,
  restrictions: report.restrictions,
  nextPossibleMilestones: report.nextPossibleMilestones
});

const packageRows = Object.entries(report.packageStatus).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Complete / true" : "Not prepared / false"}</td></tr>`;
}).join("");

const requirementRows = Object.entries(report.requiredBeforePayloadGeneration).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Satisfied" : "Pending approval"}</td></tr>`;
}).join("");

const templateRows = Object.entries(report.transactionTemplate).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td><code>${escapeHtml(value)}</code></td></tr>`;
}).join("");

const statusRows = Object.entries(report.currentStatuses).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(humanize(value))}</td></tr>`;
}).join("");

const safeRows = Object.entries(report.safes || {}).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td><code>${escapeHtml(value)}</code></td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Treasury Safe Transaction Package</title>
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
    <div class="badge">Planning only · no Safe payload</div>
    <h1>Treasury Safe Transaction Package</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
  </section>

  <section class="card">
    <h2>Package status</h2>
    <table>
      <thead><tr><th>Item</th><th>Status</th></tr></thead>
      <tbody>${packageRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Requirements before payload generation</h2>
    <table>
      <thead><tr><th>Requirement</th><th>Status</th></tr></thead>
      <tbody>${requirementRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Transaction template</h2>
    <table>
      <thead><tr><th>Field</th><th>Value</th></tr></thead>
      <tbody>${templateRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Safe addresses</h2>
    <table>
      <thead><tr><th>Safe</th><th>Address</th></tr></thead>
      <tbody>${safeRows || '<tr><td colspan="2">No Safe addresses found in public manifest.</td></tr>'}</tbody>
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
      No Safe payload is generated. No Safe transaction is prepared, submitted, signed, or executed.
      No treasury funding transaction is authorized.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/treasury-safe-transaction">/api/public/treasury-safe-transaction</a></p>
    <p><a href="/treasury-disclosure">Treasury Disclosure approval</a></p>
    <p><a href="/treasury-transaction-dry-run">Treasury transaction dry run</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Treasury Safe Transaction Package");
console.log("===============================================");
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
