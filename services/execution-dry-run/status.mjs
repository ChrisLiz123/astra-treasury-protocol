import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const files = {
  config: "configs/execution-queue-dry-run-v2.config.json",
  stabilization: "public-docs/stabilization-status.json",
  fullLaunch: "public-docs/full-launch-status.json",
  legalFullLaunch: "public-docs/legal-full-launch-status.json",
  treasuryFunding: "public-docs/treasury-funding-status.json",
  restrictedOps: "public-docs/restricted-operations-status.json",
  mainnetExecution: "public-docs/mainnet-execution-status.json",
  monitor: "public-docs/mainnet-monitor-status.json",
  alerts: "public-docs/mainnet-alerts-status.json",
  incidents: "public-docs/incident-summary.json",
  trust: "public-docs/trust-status.json"
};

const reportDir = path.join(root, "reports", "execution-dry-run");
const reportFile = path.join(reportDir, "execution-queue-dry-run-v2-status.json");

const publicJsonFile = path.join(root, "public-docs", "execution-dry-run-status.json");
const publicHtmlFile = path.join(root, "public-docs", "execution-dry-run.html");

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
const restrictedOps = readJson(files.restrictedOps);
const mainnetExecution = readJson(files.mainnetExecution);
const monitor = readJson(files.monitor);
const alerts = readJson(files.alerts);
const incidents = readJson(files.incidents);
const trust = readJson(files.trust);

const queue = config.executionQueue || {};
const checks = [];

const activeIncidents = Number(incidents?.summary?.active || 0);
const responseRequired = Boolean(alerts?.responseRequired);

check(checks, "Restricted launch stabilized", stabilization.status === "RESTRICTED_LAUNCH_STABILIZED", {
  status: stabilization.status || "UNKNOWN"
});

check(checks, "Trust Center ready", trust.status === "TRUST_CENTER_READY", {
  status: trust.status || "UNKNOWN"
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

check(checks, "Restricted operations active", restrictedOps.mode === "MAINNET_RESTRICTED_OPERATION", {
  mode: restrictedOps.mode || "UNKNOWN"
});

check(checks, "Mainnet execution queue status disabled", mainnetExecution.mode === "MAINNET_EXECUTION_QUEUE_DISABLED", {
  mode: mainnetExecution.mode || "UNKNOWN"
});

check(checks, "Execution queue config disabled", queue.enabled === false && queue.mainnetExecutionQueueEnabled === false, {
  enabled: queue.enabled,
  mainnetExecutionQueueEnabled: queue.mainnetExecutionQueueEnabled
});

check(checks, "Paper-to-on-chain automation disabled", queue.paperToOnchainAutomationEnabled === false, {
  paperToOnchainAutomationEnabled: queue.paperToOnchainAutomationEnabled
});

check(checks, "Autonomous execution disabled", queue.autonomousExecutionEnabled === false, {
  autonomousExecutionEnabled: queue.autonomousExecutionEnabled
});

check(checks, "Manual approval required", queue.manualExecutionApprovalRequired === true, {
  manualExecutionApprovalRequired: queue.manualExecutionApprovalRequired
});

check(checks, "Governance Safe approval required", queue.governanceSafeApprovalRequired === true, {
  governanceSafeApprovalRequired: queue.governanceSafeApprovalRequired
});

check(checks, "Executor Safe review required", queue.executorSafeReviewRequired === true, {
  executorSafeReviewRequired: queue.executorSafeReviewRequired
});

const dryRunCases = [
  {
    id: "DRY-RUN-V2-001",
    title: "Queue-disabled execution attempt",
    expected: "BLOCKED",
    actual: queue.mainnetExecutionQueueEnabled === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "mainnetExecutionQueueEnabled is false"
  },
  {
    id: "DRY-RUN-V2-002",
    title: "Funding-dependent execution attempt",
    expected: "BLOCKED",
    actual: treasuryFunding.treasuryFundingApproved === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "real treasury funding is not approved"
  },
  {
    id: "DRY-RUN-V2-003",
    title: "Paper-to-on-chain automation attempt",
    expected: "BLOCKED",
    actual: queue.paperToOnchainAutomationEnabled === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "paper-to-on-chain automation is disabled"
  },
  {
    id: "DRY-RUN-V2-004",
    title: "Autonomous execution attempt",
    expected: "BLOCKED",
    actual: queue.autonomousExecutionEnabled === false ? "BLOCKED" : "NOT_BLOCKED",
    reason: "autonomous execution is disabled"
  },
  {
    id: "DRY-RUN-V2-005",
    title: "Execution without manual approvals",
    expected: "BLOCKED",
    actual: queue.manualExecutionApprovalRequired === true && queue.governanceSafeApprovalRequired === true ? "BLOCKED" : "NOT_BLOCKED",
    reason: "manual and Governance Safe approval are required"
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
  ? "EXECUTION_QUEUE_DRY_RUN_V2_PASS_DISABLED_MODE"
  : "EXECUTION_QUEUE_DRY_RUN_V2_REVIEW_REQUIRED";

const report = {
  schema: "astra-execution-queue-dry-run-v2-status",
  generatedAt: new Date().toISOString(),
  status,
  mode: "DRY_RUN_ONLY_DISABLED_MAINNET_QUEUE",
  network: {
    name: "Base Mainnet",
    chainId: 8453
  },
  publicStatement:
    "Execution Queue Dry Run v2 confirms that mainnet execution remains blocked in restricted mode. No transaction is sent, no funds are moved, and no execution capability is enabled.",
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
    restrictedOperations: restrictedOps.mode || "UNKNOWN",
    mainnetExecution: mainnetExecution.mode || "UNKNOWN",
    monitor: monitor.status || "UNKNOWN",
    alerts: alerts.status || "UNKNOWN",
    incidents: incidents.status || "UNKNOWN"
  },
  executionQueue: queue,
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
  schema: "astra-public-execution-queue-dry-run-v2-status",
  generatedAt: report.generatedAt,
  status: report.status,
  mode: report.mode,
  network: report.network,
  publicStatement: report.publicStatement,
  summary: report.summary,
  currentStatuses: report.currentStatuses,
  executionQueue: report.executionQueue,
  dryRunCases: report.dryRunCases,
  restrictions: report.restrictions,
  failures: report.failures
});

const statusRows = Object.entries(report.currentStatuses).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(humanize(value))}</td></tr>`;
}).join("");

const caseRows = dryRunCases.map((item) => {
  return `<tr><td>${escapeHtml(item.id)}</td><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.actual)}</td><td>${item.pass ? "PASS" : "FAIL"}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Execution Queue Dry Run v2</title>
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
    <div class="badge">Dry run only · execution disabled</div>
    <h1>Execution Queue Dry Run v2</h1>
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
    <h2>Dry-run cases</h2>
    <table>
      <thead><tr><th>ID</th><th>Case</th><th>Outcome</th><th>Status</th></tr></thead>
      <tbody>${caseRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Important</h2>
    <div class="notice">
      Passing this dry run does not activate the mainnet execution queue and does not authorize any execution transaction.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/execution-dry-run">/api/public/execution-dry-run</a></p>
    <p><a href="/mainnet-execution">Mainnet execution queue status</a></p>
    <p><a href="/treasury-funding">Treasury funding readiness</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Execution Queue Dry Run v2");
console.log("========================================");
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
