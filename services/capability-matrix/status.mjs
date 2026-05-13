import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const reportDir = path.join(root, "reports", "capability-matrix");
const reportFile = path.join(reportDir, "capability-matrix-status.json");

const publicJsonFile = path.join(root, "public-docs", "capability-matrix-status.json");
const publicHtmlFile = path.join(root, "public-docs", "capability-matrix.html");

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

const config = readJson("configs/capability-matrix.config.json");
const launchControl = readJson("public-docs/launch-control-status.json");
const stabilization = readJson("public-docs/stabilization-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const treasurySafeTx = readJson("public-docs/treasury-safe-transaction-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

const capabilities = config.capabilities || {};
const activeIncidents = Number(incidents?.summary?.active || 0);
const responseRequired = Boolean(alerts?.responseRequired);

const allCapabilitiesDisabled = Object.values(capabilities).every((item) => item.enabled === false);
const allCapabilityApprovalsFalse = Object.values(capabilities).every((item) => item.approved === false);
const matrixSafe =
  config.capabilityMatrixFinalized === true &&
  config.capabilityMatrixFinalApproved === true &&
  config.finalApprovalScope === "disabled-state-matrix-only" &&
  config.doesNotApproveCapabilities === true &&
  allCapabilitiesDisabled &&
  allCapabilityApprovalsFalse &&
  fullLaunch.fullLaunchApproved === false &&
  treasuryFunding.treasuryFundingApproved === false &&
  treasuryFunding.treasuryFundingExecuted === false &&
  treasurySafeTx.safeTransactionPayloadGenerated === false &&
  treasurySafeTx.safeTransactionPrepared === false &&
  execution.mode === "MAINNET_EXECUTION_QUEUE_DISABLED";

const status = matrixSafe && monitor.status === "PASS" && activeIncidents === 0
  ? "CAPABILITY_MATRIX_FINALIZED_ALL_DISABLED"
  : "CAPABILITY_MATRIX_REVIEW_REQUIRED";

const report = {
  schema: "astra-capability-matrix-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  capabilityMatrixFinalized: Boolean(config.capabilityMatrixFinalized),
  capabilityMatrixFinalApproved: Boolean(config.capabilityMatrixFinalApproved),
  finalApprovalScope: config.finalApprovalScope,
  doesNotApproveCapabilities: Boolean(config.doesNotApproveCapabilities),
  allCapabilitiesDisabled,
  allCapabilityApprovalsFalse,
  publicStatement:
    "AstraTreasury capability matrix is finalized as all-disabled. No restricted capability is approved or enabled.",
  summary: {
    capabilityCount: Object.keys(capabilities).length,
    enabledCapabilityCount: Object.values(capabilities).filter((item) => item.enabled === true).length,
    approvedCapabilityCount: Object.values(capabilities).filter((item) => item.approved === true).length,
    activeIncidents,
    responseRequired,
    monitorStatus: monitor.status || "UNKNOWN"
  },
  capabilities,
  currentStatuses: {
    launchControl: launchControl.status || "UNKNOWN",
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

const capabilityRows = Object.entries(capabilities).map(([key, value]) => {
  return `<tr>
<td>${escapeHtml(value.label || key)}</td>
<td>${value.approved ? "Approved" : "Not approved"}</td>
<td>${value.enabled ? "Enabled" : "Disabled"}</td>
<td>${escapeHtml(humanize(value.finalStatus))}</td>
<td>${escapeHtml(value.activationPath || "")}</td>
</tr>`;
}).join("");

const statusRows = Object.entries(report.currentStatuses).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(humanize(value))}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Capability Matrix</title>
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
    <div class="badge">Finalized matrix · all capabilities disabled</div>
    <h1>Capability Matrix</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
  </section>

  <section class="card">
    <h2>Capabilities</h2>
    <table>
      <thead><tr><th>Capability</th><th>Approval</th><th>Enabled</th><th>Final status</th><th>Activation path</th></tr></thead>
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
      This finalizes the capability-state matrix only. It does not approve full launch, funding, public sale,
      staking/rewards, buybacks, execution queue activation, automation, autonomous execution, or Safe transaction activity.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/capability-matrix">/api/public/capability-matrix</a></p>
    <p><a href="/launch-control">Launch Control</a></p>
    <p><a href="/governance-decision-approval">Governance decision approval</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Capability Matrix");
console.log("===============================");
console.log(`Status: ${report.status}`);
console.log(`Capabilities: ${report.summary.capabilityCount}`);
console.log(`Approved: ${report.summary.approvedCapabilityCount}`);
console.log(`Enabled: ${report.summary.enabledCapabilityCount}`);
console.log(`Report: ${reportFile}`);
