import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const recordPath = path.join(root, "reports", "full-launch-governance-decision", "live", "governance-decision-record.json");
const reportDir = path.join(root, "reports", "full-launch-governance-decision", "live");
const reportFile = path.join(reportDir, "governance-decision-live-status.json");

const publicJsonFile = path.join(root, "public-docs", "governance-decision-status.json");
const publicHtmlFile = path.join(root, "public-docs", "governance-decision.html");

fs.mkdirSync(reportDir, { recursive: true });

function readJsonPath(filePath, fallback = {}) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return { error: error.message };
  }
}

function readJson(relativePath, fallback = {}) {
  return readJsonPath(path.join(root, relativePath), fallback);
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

const record = readJsonPath(recordPath, null);
const fullLaunch = readJson("public-docs/full-launch-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const publicStatusUpdate = readJson("public-docs/public-status-update-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const treasurySafeTx = readJson("public-docs/treasury-safe-transaction-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

const recorded = Boolean(record && record.governanceDecisionRecorded === true);
const status = recorded
  ? "GOVERNANCE_DECISION_RECORDED_RESTRICTED_MODE_ALL_DISABLED"
  : "GOVERNANCE_DECISION_NOT_RECORDED";

const report = {
  schema: "astra-public-governance-decision-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  governanceDecisionRecorded: recorded,
  fullLaunchApproved: false,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatement: recorded
    ? "AstraTreasury governance decision is recorded for restricted Base Mainnet operation with all restricted capabilities disabled and not approved."
    : "AstraTreasury governance decision has not been recorded yet.",
  decision: recorded
    ? {
        decisionId: record.decisionId,
        recordedAt: record.recordedAt,
        decisionRecorder: record.decisionRecorder,
        decisionScope: record.decisionScope,
        governanceProcessMode: record.governanceProcessMode,
        resolutionReference: record.resolutionReference,
        resolutionHash: record.resolutionHash,
        approvedCapabilities: record.approvedCapabilities,
        disabledCapabilities: record.disabledCapabilities
      }
    : {},
  capabilityStates: {
    fullLaunchApproved: false,
    publicTokenSaleApproved: false,
    realTreasuryFundingApproved: false,
    stakingOrRewardsApproved: false,
    buybackProgramApproved: false,
    mainnetExecutionQueueApproved: false,
    paperToOnchainAutomationApproved: false,
    autonomousExecutionApproved: false,
    safeTransactionPayloadGenerated: false,
    safeTransactionExecutionApproved: false
  },
  currentStatuses: {
    fullLaunch: fullLaunch.status || "UNKNOWN",
    capabilityMatrix: capabilityMatrix.status || "UNKNOWN",
    publicStatusUpdate: publicStatusUpdate.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
    treasurySafeTransaction: treasurySafeTx.status || "UNKNOWN",
    monitor: monitor.status || "UNKNOWN",
    alerts: alerts.status || "UNKNOWN",
    incidents: incidents.status || "UNKNOWN",
    mainnetExecution: execution.mode || "UNKNOWN"
  },
  safety: {
    sendsTransactions: false,
    movesFunds: false,
    deploysContracts: false,
    enablesExecution: false,
    approvesPublicSale: false,
    approvesTreasuryFunding: false,
    preparesSafeTransaction: false,
    approvesFullLaunch: false
  }
};

writeJson(reportFile, report);
writeJson(publicJsonFile, report);

const decisionRows = Object.entries(report.decision || {}).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(Array.isArray(value) ? JSON.stringify(value) : value)}</td></tr>`;
}).join("");

const capabilityRows = Object.entries(report.capabilityStates).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Approved / enabled" : "Not approved / disabled"}</td></tr>`;
}).join("");

const statusRows = Object.entries(report.currentStatuses).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(humanize(value))}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Governance Decision</title>
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
    <div class="badge">${recorded ? "Governance decision recorded" : "Decision not recorded"}</div>
    <h1>Governance Decision</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
  </section>

  <section class="card">
    <h2>Decision</h2>
    <table>
      <thead><tr><th>Field</th><th>Value</th></tr></thead>
      <tbody>${decisionRows || '<tr><td colspan="2">No decision recorded.</td></tr>'}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Capability states</h2>
    <table>
      <thead><tr><th>Capability</th><th>Status</th></tr></thead>
      <tbody>${capabilityRows}</tbody>
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
      This governance decision records restricted-mode / all-disabled status only.
      It does not approve full launch, treasury funding, public sale, staking/rewards, buybacks,
      execution queue activation, automation, autonomous execution, Safe payload generation, or Safe transaction execution.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/governance-decision">/api/public/governance-decision</a></p>
    <p><a href="/capability-matrix">Capability Matrix</a></p>
    <p><a href="/public-status-update">Public Status Update</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Governance Decision");
console.log("=================================");
console.log(`Status: ${report.status}`);
console.log(`Governance decision recorded: ${report.governanceDecisionRecorded}`);
console.log(`Full launch approved: ${report.fullLaunchApproved}`);
console.log(`Report: ${reportFile}`);
