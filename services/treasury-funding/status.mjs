import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const files = {
  config: "configs/treasury-funding-readiness.config.json",
  stabilization: "public-docs/stabilization-status.json",
  fullLaunch: "public-docs/full-launch-status.json",
  legalFullLaunch: "public-docs/legal-full-launch-status.json",
  restrictedOps: "public-docs/restricted-operations-status.json",
  execution: "public-docs/mainnet-execution-status.json",
  monitor: "public-docs/mainnet-monitor-status.json",
  alerts: "public-docs/mainnet-alerts-status.json",
  incidents: "public-docs/incident-summary.json",
  token: "public-docs/token-status.json"
};

const reportDir = path.join(root, "reports", "treasury-funding");
const reportFile = path.join(reportDir, "treasury-funding-readiness-status.json");

const publicJsonFile = path.join(root, "public-docs", "treasury-funding-status.json");
const publicHtmlFile = path.join(root, "public-docs", "treasury-funding.html");

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
const restrictedOps = readJson(files.restrictedOps);
const execution = readJson(files.execution);
const monitor = readJson(files.monitor);
const alerts = readJson(files.alerts);
const incidents = readJson(files.incidents);
const token = readJson(files.token);

const checks = [];

const activeIncidents = Number(incidents?.summary?.active || 0);
const responseRequired = Boolean(alerts?.responseRequired);

check(checks, "Restricted launch stabilized", stabilization.status === "RESTRICTED_LAUNCH_STABILIZED", {
  status: stabilization.status || "UNKNOWN"
});

check(checks, "Full launch not yet approved", fullLaunch.fullLaunchApproved === false, {
  fullLaunchApproved: fullLaunch.fullLaunchApproved
});

check(checks, "Legal full-launch not yet approved", legalFullLaunch.legalFullLaunchApproved === false, {
  legalFullLaunchApproved: legalFullLaunch.legalFullLaunchApproved
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

check(checks, "Restricted operations active", restrictedOps.mode === "MAINNET_RESTRICTED_OPERATION", {
  mode: restrictedOps.mode || "UNKNOWN"
});

check(checks, "Execution queue disabled", execution.mode === "MAINNET_EXECUTION_QUEUE_DISABLED", {
  mode: execution.mode || "UNKNOWN"
});

const falseGateKeys = [
  "treasuryFundingApproved",
  "treasuryFundingTransactionAuthorized",
  "treasuryFundingExecuted",
  "fundingSourceApproved",
  "treasurySafeApprovalRecorded",
  "riskLimitsApproved",
  "accountingReviewComplete",
  "legalReviewComplete",
  "publicDisclosureUpdated",
  "incidentResponseDrillCurrent"
];

for (const key of falseGateKeys) {
  check(checks, `Funding approval item pending: ${key}`, config[key] === false, {
    value: config[key]
  });
}

for (const [key, value] of Object.entries(config.hardStops || {})) {
  check(checks, `Hard stop remains false: ${key}`, value === false, {
    value
  });
}

const failures = checks.filter((item) => !item.pass);

const pendingFundingItems = falseGateKeys.filter((key) => config[key] !== true);

const status = failures.length === 0
  ? "TREASURY_FUNDING_READINESS_TRACK_OPEN_NOT_APPROVED"
  : "TREASURY_FUNDING_READINESS_REVIEW_REQUIRED";

const report = {
  schema: "astra-treasury-funding-readiness-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  treasuryFundingApproved: false,
  treasuryFundingTransactionAuthorized: false,
  treasuryFundingExecuted: false,
  network: {
    name: "Base Mainnet",
    chainId: 8453
  },
  publicStatement:
    "AstraTreasury treasury funding readiness track is open for planning. No real treasury funding is approved, authorized, or executed.",
  summary: {
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
    pendingFundingItems: pendingFundingItems.length,
    activeIncidents,
    responseRequired
  },
  currentStatuses: {
    stabilization: stabilization.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    legalFullLaunch: legalFullLaunch.status || "UNKNOWN",
    restrictedOperations: restrictedOps.mode || "UNKNOWN",
    executionQueue: execution.mode || "UNKNOWN",
    monitor: monitor.status || "UNKNOWN",
    alerts: alerts.status || "UNKNOWN",
    incidents: incidents.status || "UNKNOWN",
    token: token.status || "UNKNOWN"
  },
  fundingReadiness: Object.fromEntries(falseGateKeys.map((key) => [key, Boolean(config[key])])),
  pendingFundingItems,
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
    "Treasury risk limits approval",
    "Treasury Safe approval package",
    "Treasury funding transaction dry run",
    "Public disclosure update for treasury funding"
  ],
  safety: {
    sendsTransactions: false,
    movesFunds: false,
    enablesExecution: false,
    approvesPublicSale: false,
    approvesTreasuryFunding: false
  }
};

writeJson(reportFile, report);

writeJson(publicJsonFile, {
  schema: "astra-public-treasury-funding-readiness-status-v0.1",
  generatedAt: report.generatedAt,
  status: report.status,
  currentApprovedMode: report.currentApprovedMode,
  treasuryFundingApproved: report.treasuryFundingApproved,
  treasuryFundingTransactionAuthorized: report.treasuryFundingTransactionAuthorized,
  treasuryFundingExecuted: report.treasuryFundingExecuted,
  network: report.network,
  publicStatement: report.publicStatement,
  summary: report.summary,
  currentStatuses: report.currentStatuses,
  fundingReadiness: report.fundingReadiness,
  pendingFundingItems: report.pendingFundingItems,
  restrictions: report.restrictions,
  nextPossibleMilestones: report.nextPossibleMilestones
});

const readinessRows = Object.entries(report.fundingReadiness).map(([key, value]) => {
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
  <title>AstraTreasury Treasury Funding Readiness</title>
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
    <div class="badge">Planning only · no funds authorized</div>
    <h1>Treasury Funding Readiness</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
  </section>

  <section class="card">
    <h2>Current statuses</h2>
    <table>
      <thead><tr><th>Area</th><th>Status</th></tr></thead>
      <tbody>${statusRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Funding readiness items</h2>
    <table>
      <thead><tr><th>Item</th><th>Status</th></tr></thead>
      <tbody>${readinessRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Important</h2>
    <div class="notice">
      No real treasury funding is approved, authorized, or executed. This page is a planning gate only.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/treasury-funding">/api/public/treasury-funding</a></p>
    <p><a href="/full-launch">Full launch readiness</a></p>
    <p><a href="/legal-full-launch">Legal full-launch review</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Treasury Funding Readiness");
console.log("========================================");
console.log(`Status: ${report.status}`);
console.log(`Checks passed: ${report.summary.passed}/${report.summary.totalChecks}`);
console.log(`Pending funding items: ${pendingFundingItems.length}`);
console.log(`Report: ${reportFile}`);

if (failures.length > 0) {
  console.table(failures.map((item) => ({
    name: item.name,
    details: JSON.stringify(item.details).slice(0, 240)
  })));
  process.exit(1);
}
