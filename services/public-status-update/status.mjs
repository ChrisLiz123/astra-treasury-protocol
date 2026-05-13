import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const reportDir = path.join(root, "reports", "public-status-update");
const reportFile = path.join(reportDir, "public-status-update-finalization-status.json");

const publicJsonFile = path.join(root, "public-docs", "public-status-update-status.json");
const publicHtmlFile = path.join(root, "public-docs", "public-status-update.html");

fs.mkdirSync(reportDir, { recursive: true });

function readJson(relativePath, fallback = {}) {
  try {
    const full = path.join(root, relativePath);
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

const config = readJson("configs/public-status-update-finalization.config.json");
const launchControl = readJson("public-docs/launch-control-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const stabilization = readJson("public-docs/stabilization-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const treasurySafeTx = readJson("public-docs/treasury-safe-transaction-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

const activeIncidents = Number(incidents?.summary?.active || 0);
const responseRequired = Boolean(alerts?.responseRequired);

const safe =
  config.publicStatusUpdateFinalized === true &&
  config.publicStatusUpdateFinalApproved === true &&
  config.finalApprovalScope === "restricted-mode-no-capability-approval" &&
  config.doesNotApproveCapabilities === true &&
  config.governanceDecisionRecorded === false &&
  config.fullLaunchApproved === false &&
  capabilityMatrix.allCapabilitiesDisabled === true &&
  capabilityMatrix.allCapabilityApprovalsFalse === true &&
  fullLaunch.fullLaunchApproved === false &&
  treasuryFunding.treasuryFundingApproved === false &&
  treasuryFunding.treasuryFundingExecuted === false &&
  treasurySafeTx.safeTransactionPayloadGenerated === false &&
  treasurySafeTx.safeTransactionPrepared === false &&
  execution.mode === "MAINNET_EXECUTION_QUEUE_DISABLED";

const status = safe && monitor.status === "PASS" && activeIncidents === 0
  ? "PUBLIC_STATUS_UPDATE_FINALIZED_RESTRICTED_MODE"
  : "PUBLIC_STATUS_UPDATE_REVIEW_REQUIRED";

const capabilityApprovals = config.capabilityApprovals || {};

const report = {
  schema: "astra-public-status-update-finalization-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicStatusUpdateFinalized: Boolean(config.publicStatusUpdateFinalized),
  publicStatusUpdateFinalApproved: Boolean(config.publicStatusUpdateFinalApproved),
  finalApprovalScope: config.finalApprovalScope,
  doesNotApproveCapabilities: Boolean(config.doesNotApproveCapabilities),
  governanceDecisionRecorded: false,
  fullLaunchApproved: false,
  finalPublicStatusUpdate: config.finalPublicStatusUpdate || {},
  publicStatement:
    "AstraTreasury public status update is finalized for restricted-mode / all-disabled status. No governance decision is recorded, full launch is not approved, and no restricted capability is approved.",
  summary: {
    activeIncidents,
    responseRequired,
    monitorStatus: monitor.status || "UNKNOWN",
    capabilityApprovalCount: Object.values(capabilityApprovals).filter((value) => value === true).length
  },
  capabilityApprovals,
  currentStatuses: {
    launchControl: launchControl.status || "UNKNOWN",
    capabilityMatrix: capabilityMatrix.status || "UNKNOWN",
    stabilization: stabilization.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
    treasurySafeTransaction: treasurySafeTx.status || "UNKNOWN",
    monitor: monitor.status || "UNKNOWN",
    alerts: alerts.status || "UNKNOWN",
    incidents: incidents.status || "UNKNOWN",
    mainnetExecution: execution.mode || "UNKNOWN"
  },
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
    approvesTreasuryFunding: false,
    preparesSafeTransaction: false,
    recordsGovernanceDecision: false,
    approvesFullLaunch: false
  }
};

writeJson(reportFile, report);
writeJson(publicJsonFile, report);

const update = report.finalPublicStatusUpdate || {};

const updateRows = Object.entries(update).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const capabilityRows = Object.entries(capabilityApprovals).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Approved" : "Not approved"}</td></tr>`;
}).join("");

const statusRows = Object.entries(report.currentStatuses).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(humanize(value))}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Public Status Update</title>
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
    <div class="badge">Finalized · restricted mode</div>
    <h1>Public Status Update</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
  </section>

  <section class="card">
    <h2>Final public status language</h2>
    <table>
      <thead><tr><th>Field</th><th>Language</th></tr></thead>
      <tbody>${updateRows}</tbody>
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
    <h2>Current statuses</h2>
    <table>
      <thead><tr><th>Area</th><th>Status</th></tr></thead>
      <tbody>${statusRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Important</h2>
    <div class="notice">
      This status update is finalized for restricted-mode / all-disabled posture only.
      It does not approve full launch, funding, public sale, staking/rewards, buybacks, execution, automation, autonomous execution, or Safe transaction activity.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/public-status-update">/api/public/public-status-update</a></p>
    <p><a href="/capability-matrix">Capability Matrix</a></p>
    <p><a href="/governance-decision-approval">Governance decision approval</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Public Status Update Finalization");
console.log("===============================================");
console.log(`Status: ${report.status}`);
console.log(`Final approved: ${report.publicStatusUpdateFinalApproved}`);
console.log(`Capability approvals: ${report.summary.capabilityApprovalCount}`);
console.log(`Report: ${reportFile}`);
