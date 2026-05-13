import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const files = {
  config: "configs/treasury-funding-transaction-dry-run.config.json",
  mainnet: "public-docs/mainnet-status.json",
  stabilization: "public-docs/stabilization-status.json",
  fullLaunch: "public-docs/full-launch-status.json",
  legalFullLaunch: "public-docs/legal-full-launch-status.json",
  treasuryFunding: "public-docs/treasury-funding-status.json",
  treasuryRisk: "public-docs/treasury-risk-status.json",
  treasurySource: "public-docs/treasury-source-status.json",
  treasurySafe: "public-docs/treasury-safe-status.json",
  disclosures: "public-docs/disclosures-status.json",
  monitor: "public-docs/mainnet-monitor-status.json",
  alerts: "public-docs/mainnet-alerts-status.json",
  incidents: "public-docs/incident-summary.json",
  mainnetExecution: "public-docs/mainnet-execution-status.json"
};

const reportDir = path.join(root, "reports", "treasury-transaction-dry-run");
const reportFile = path.join(reportDir, "treasury-funding-transaction-dry-run-status.json");

const publicJsonFile = path.join(root, "public-docs", "treasury-transaction-dry-run-status.json");
const publicHtmlFile = path.join(root, "public-docs", "treasury-transaction-dry-run.html");

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
const treasurySafe = readJson(files.treasurySafe);
const disclosures = readJson(files.disclosures);
const monitor = readJson(files.monitor);
const alerts = readJson(files.alerts);
const incidents = readJson(files.incidents);
const mainnetExecution = readJson(files.mainnetExecution);

const checks = [];

const activeIncidents = Number(incidents?.summary?.active || 0);
const responseRequired = Boolean(alerts?.responseRequired);
const riskLimits = treasuryRisk.effectiveLimits || {};

check(checks, "Dry run only", config.dryRunOnly === true, {
  dryRunOnly: config.dryRunOnly
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

check(checks, "Treasury funding transaction not authorized", treasuryFunding.treasuryFundingTransactionAuthorized === false && config.treasuryFundingTransactionAuthorized === false, {
  publicTreasuryFundingTransactionAuthorized: treasuryFunding.treasuryFundingTransactionAuthorized,
  configTreasuryFundingTransactionAuthorized: config.treasuryFundingTransactionAuthorized
});

check(checks, "Treasury funding not executed", treasuryFunding.treasuryFundingExecuted === false && config.treasuryFundingExecuted === false, {
  publicTreasuryFundingExecuted: treasuryFunding.treasuryFundingExecuted,
  configTreasuryFundingExecuted: config.treasuryFundingExecuted
});

check(checks, "Treasury risk limits not approved", treasuryRisk.treasuryRiskLimitsApproved === false && config.treasuryRiskLimitsApproved === false, {
  publicTreasuryRiskLimitsApproved: treasuryRisk.treasuryRiskLimitsApproved,
  configTreasuryRiskLimitsApproved: config.treasuryRiskLimitsApproved
});

check(checks, "Effective funding limits remain zero", Number(riskLimits.maximumInitialFundingUsd || 0) === 0 && Number(riskLimits.maximumSingleTransferUsd || 0) === 0 && Number(riskLimits.maximumDailyTransferUsd || 0) === 0, {
  maximumInitialFundingUsd: riskLimits.maximumInitialFundingUsd,
  maximumSingleTransferUsd: riskLimits.maximumSingleTransferUsd,
  maximumDailyTransferUsd: riskLimits.maximumDailyTransferUsd
});

check(checks, "Funding source not approved", treasurySource.fundingSourceApproved === false && config.fundingSourceApproved === false, {
  publicFundingSourceApproved: treasurySource.fundingSourceApproved,
  configFundingSourceApproved: config.fundingSourceApproved
});

check(checks, "Treasury Safe approval not recorded", treasurySafe.treasurySafeApprovalRecorded === false && config.treasurySafeApprovalRecorded === false, {
  publicTreasurySafeApprovalRecorded: treasurySafe.treasurySafeApprovalRecorded,
  configTreasurySafeApprovalRecorded: config.treasurySafeApprovalRecorded
});

check(checks, "Safe transaction not prepared", treasurySafe.treasurySafeTransactionPrepared === false && config.safeTransactionPrepared === false, {
  publicTreasurySafeTransactionPrepared: treasurySafe.treasurySafeTransactionPrepared,
  configSafeTransactionPrepared: config.safeTransactionPrepared
});

check(checks, "Safe transaction not submitted", treasurySafe.treasurySafeTransactionSubmitted === false && config.safeTransactionSubmitted === false, {
  publicTreasurySafeTransactionSubmitted: treasurySafe.treasurySafeTransactionSubmitted,
  configSafeTransactionSubmitted: config.safeTransactionSubmitted
});

check(checks, "Safe transaction not signed", config.safeTransactionSigned === false, {
  safeTransactionSigned: config.safeTransactionSigned
});

check(checks, "Safe transaction not executed", treasurySafe.treasurySafeTransactionExecuted === false && config.safeTransactionExecuted === false, {
  publicTreasurySafeTransactionExecuted: treasurySafe.treasurySafeTransactionExecuted,
  configSafeTransactionExecuted: config.safeTransactionExecuted
});

check(checks, "Public disclosures drafted, not final-approved", disclosures.status === "PUBLIC_DISCLOSURE_UPDATE_DRAFT_READY_NOT_APPROVED", {
  status: disclosures.status || "UNKNOWN"
});

check(checks, "Mainnet execution queue disabled", mainnetExecution.mode === "MAINNET_EXECUTION_QUEUE_DISABLED", {
  mode: mainnetExecution.mode || "UNKNOWN"
});

const plan = config.transactionPlan || {};

check(checks, "No calldata generated", plan.calldata === "not generated", {
  calldata: plan.calldata
});

check(checks, "No Safe payload generated", plan.safePayload === "not generated", {
  safePayload: plan.safePayload
});

check(checks, "No Safe transaction hash", !plan.safeTxHash, {
  safeTxHash: plan.safeTxHash
});

check(checks, "No execution transaction hash", !plan.executionTxHash, {
  executionTxHash: plan.executionTxHash
});

const dryRunCases = [
  {
    id: "TREASURY-TX-DRY-RUN-001",
    title: "Missing risk limits blocks transaction",
    expected: "BLOCKED",
    actual: treasuryRisk.treasuryRiskLimitsApproved === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "treasury risk limits are not approved"
  },
  {
    id: "TREASURY-TX-DRY-RUN-002",
    title: "Missing funding source blocks transaction",
    expected: "BLOCKED",
    actual: treasurySource.fundingSourceApproved === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "funding source is not approved"
  },
  {
    id: "TREASURY-TX-DRY-RUN-003",
    title: "Missing Treasury Safe approval blocks transaction",
    expected: "BLOCKED",
    actual: treasurySafe.treasurySafeApprovalRecorded === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "Treasury Safe approval is not recorded"
  },
  {
    id: "TREASURY-TX-DRY-RUN-004",
    title: "Missing disclosure approval blocks transaction",
    expected: "BLOCKED",
    actual: disclosures.publicDisclosuresApproved === false || disclosures.status === "PUBLIC_DISCLOSURE_UPDATE_DRAFT_READY_NOT_APPROVED" ? "BLOCKED" : "NOT_BLOCKED",
    reason: "public disclosures are drafted but not final-approved"
  },
  {
    id: "TREASURY-TX-DRY-RUN-005",
    title: "Zero effective funding limit blocks transaction",
    expected: "BLOCKED",
    actual: Number(riskLimits.maximumInitialFundingUsd || 0) === 0 ? "BLOCKED" : "NOT_BLOCKED",
    reason: "effective funding limits remain zero"
  },
  {
    id: "TREASURY-TX-DRY-RUN-006",
    title: "Safe payload generation attempt",
    expected: "BLOCKED",
    actual: config.safeTransactionPrepared === false && plan.safePayload === "not generated" ? "BLOCKED" : "NOT_BLOCKED",
    reason: "this dry run must not prepare a Safe payload"
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

const failures = checks.filter((item) => !item.pass);
const failedCases = dryRunCases.filter((item) => !item.pass);

const status = failures.length === 0
  ? "TREASURY_FUNDING_TRANSACTION_DRY_RUN_PASS_NOT_AUTHORIZED"
  : "TREASURY_FUNDING_TRANSACTION_DRY_RUN_REVIEW_REQUIRED";

const report = {
  schema: "astra-treasury-funding-transaction-dry-run-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  mode: "DRY_RUN_ONLY_NO_SAFE_TRANSACTION",
  currentApprovedMode: "restricted-mainnet-operation",
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
    "AstraTreasury treasury funding transaction dry run passed in not-authorized mode. No Safe transaction is prepared, submitted, signed, or executed, and no real treasury funding is authorized.",
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
  currentStatuses: {
    stabilization: stabilization.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    legalFullLaunch: legalFullLaunch.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
    treasuryRisk: treasuryRisk.status || "UNKNOWN",
    treasurySource: treasurySource.status || "UNKNOWN",
    treasurySafe: treasurySafe.status || "UNKNOWN",
    disclosures: disclosures.status || "UNKNOWN",
    monitor: monitor.status || "UNKNOWN",
    alerts: alerts.status || "UNKNOWN",
    incidents: incidents.status || "UNKNOWN",
    mainnetExecution: mainnetExecution.mode || "UNKNOWN"
  },
  safes: mainnet.safes || {},
  transactionPlan: config.transactionPlan || {},
  dryRunCases,
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
    "Treasury disclosure approval package",
    "Treasury Safe transaction package preparation",
    "Full-launch governance decision package"
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
    signsSafeTransaction: false
  }
};

writeJson(reportFile, report);

writeJson(publicJsonFile, {
  schema: "astra-public-treasury-funding-transaction-dry-run-status-v0.1",
  generatedAt: report.generatedAt,
  status: report.status,
  mode: report.mode,
  currentApprovedMode: report.currentApprovedMode,
  safeTransactionPrepared: report.safeTransactionPrepared,
  safeTransactionSubmitted: report.safeTransactionSubmitted,
  safeTransactionSigned: report.safeTransactionSigned,
  safeTransactionExecuted: report.safeTransactionExecuted,
  treasuryFundingTransactionAuthorized: report.treasuryFundingTransactionAuthorized,
  treasuryFundingExecuted: report.treasuryFundingExecuted,
  network: report.network,
  publicStatement: report.publicStatement,
  summary: report.summary,
  currentStatuses: report.currentStatuses,
  transactionPlan: report.transactionPlan,
  dryRunCases: report.dryRunCases,
  restrictions: report.restrictions,
  nextPossibleMilestones: report.nextPossibleMilestones
});

const statusRows = Object.entries(report.currentStatuses).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(humanize(value))}</td></tr>`;
}).join("");

const caseRows = dryRunCases.map((item) => {
  return `<tr><td>${escapeHtml(item.id)}</td><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.actual)}</td><td>${item.pass ? "PASS" : "FAIL"}</td></tr>`;
}).join("");

const planRows = Object.entries(report.transactionPlan).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td><code>${escapeHtml(value)}</code></td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Treasury Transaction Dry Run</title>
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
    <div class="badge">Dry run passed · no Safe transaction</div>
    <h1>Treasury Funding Transaction Dry Run</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
  </section>

  <section class="card">
    <h2>Dry-run cases</h2>
    <table>
      <thead><tr><th>ID</th><th>Case</th><th>Outcome</th><th>Status</th></tr></thead>
      <tbody>${caseRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Transaction plan</h2>
    <table>
      <thead><tr><th>Field</th><th>Value</th></tr></thead>
      <tbody>${planRows}</tbody>
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
      This dry run does not create, submit, sign, or execute a Safe transaction. No real treasury funding is approved or authorized.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/treasury-transaction-dry-run">/api/public/treasury-transaction-dry-run</a></p>
    <p><a href="/treasury-safe">Treasury Safe approval</a></p>
    <p><a href="/treasury-source">Treasury funding source review</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Treasury Funding Transaction Dry Run");
console.log("==================================================");
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
