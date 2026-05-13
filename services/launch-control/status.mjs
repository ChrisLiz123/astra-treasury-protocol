import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const reportDir = path.join(root, "reports", "launch-control");
const reportFile = path.join(reportDir, "launch-control-status.json");

const publicJsonFile = path.join(root, "public-docs", "launch-control-status.json");
const publicHtmlFile = path.join(root, "public-docs", "launch-control.html");

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

const config = readJson("configs/launch-control.config.json");
const stabilization = readJson("public-docs/stabilization-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const governance = readJson("public-docs/full-launch-governance-status.json");
const decisionAuth = readJson("public-docs/full-launch-governance-decision-recording-authorization-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const treasurySafeTx = readJson("public-docs/treasury-safe-transaction-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

const activeIncidents = Number(incidents?.summary?.active || 0);
const responseRequired = Boolean(alerts?.responseRequired);

const requiredVsOptional = [
  ["Audit and legal clearance", "Recorded per operator confirmation", "Complete"],
  ["Restricted launch stabilization", stabilization.status || "UNKNOWN", "Required"],
  ["Mainnet monitor", monitor.status || "UNKNOWN", "Required"],
  ["Incident status", activeIncidents === 0 ? "No active incidents" : "Active incidents present", "Required"],
  ["Governance decision", decisionAuth.governanceDecisionRecorded === true ? "Recorded" : "Not recorded", "Required only before activation"],
  ["Treasury funding approval", treasuryFunding.treasuryFundingApproved === true ? "Approved" : "Not approved", "Required only before funding"],
  ["Safe transaction payload", treasurySafeTx.safeTransactionPayloadGenerated === true ? "Generated" : "Not generated", "Required only before Safe execution"],
  ["More generic prep pages", "Not recommended", "Optional / stop here"]
];

const capabilityStates = {
  fullLaunchApproved: Boolean(fullLaunch.fullLaunchApproved),
  governanceDecisionRecorded: Boolean(decisionAuth.governanceDecisionRecorded),
  publicTokenSaleApproved: false,
  realTreasuryFundingApproved: Boolean(treasuryFunding.treasuryFundingApproved),
  treasuryFundingExecuted: Boolean(treasuryFunding.treasuryFundingExecuted),
  safeTransactionPayloadGenerated: Boolean(treasurySafeTx.safeTransactionPayloadGenerated),
  safeTransactionPrepared: Boolean(treasurySafeTx.safeTransactionPrepared),
  mainnetExecutionQueueEnabled: execution.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED",
  stakingOrRewardsApproved: false,
  buybackProgramApproved: false,
  paperToOnchainAutomationApproved: false,
  autonomousExecutionApproved: false
};

const unsafe = Object.entries(capabilityStates)
  .filter(([key, value]) => value === true && key !== "governanceDecisionRecorded")
  .map(([key]) => key);

const status = unsafe.length === 0 && monitor.status === "PASS" && activeIncidents === 0
  ? "LAUNCH_CONTROL_READY_RESTRICTED_MODE"
  : "LAUNCH_CONTROL_REVIEW_REQUIRED";

const report = {
  schema: "astra-launch-control-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  genericPreparationComplete: true,
  additionalGenericPreparationRecommended: false,
  publicStatement:
    "AstraTreasury generic launch preparation is complete. Further work should be capability-specific or governance-action-specific. Full launch and restricted capabilities remain not approved.",
  summary: {
    auditCleared: true,
    legalCleared: true,
    activeIncidents,
    responseRequired,
    monitorStatus: monitor.status || "UNKNOWN",
    restrictedLaunchStatus: stabilization.status || "UNKNOWN",
    unsafeEnabledItems: unsafe
  },
  requiredVsOptional,
  capabilityStates,
  nextRecommendedActions: [
    "Stop creating generic preparation packages.",
    "Choose one specific action path.",
    "Use explicit approval before enabling any capability.",
    "Keep all public status pages synced through evidence archive."
  ],
  specificActionPaths: [
    "Governance decision recording live path",
    "Treasury funding authorization path",
    "Safe transaction payload path",
    "Execution queue activation path",
    "Public sale path",
    "Staking/rewards path",
    "Buyback path"
  ],
  currentStatuses: {
    stabilization: stabilization.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    governance: governance.status || "UNKNOWN",
    decisionAuthorization: decisionAuth.status || "UNKNOWN",
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
    recordsGovernanceDecision: false,
    approvesFullLaunch: false
  }
};

writeJson(reportFile, report);
writeJson(publicJsonFile, report);

const requiredRows = requiredVsOptional.map(([area, state, type]) => {
  return `<tr><td>${escapeHtml(area)}</td><td>${escapeHtml(state)}</td><td>${escapeHtml(type)}</td></tr>`;
}).join("");

const capabilityRows = Object.entries(capabilityStates).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Enabled / approved" : "Disabled / not approved"}</td></tr>`;
}).join("");

const pathRows = report.specificActionPaths.map((item) => {
  return `<tr><td>${escapeHtml(item)}</td><td>Use only when pursuing this exact action.</td></tr>`;
}).join("");

const statusRows = Object.entries(report.currentStatuses).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(humanize(value))}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Launch Control</title>
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
    <div class="badge">Restricted mode · generic prep complete</div>
    <h1>Launch Control</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
  </section>

  <section class="card">
    <h2>Required vs optional</h2>
    <table>
      <thead><tr><th>Area</th><th>Status</th><th>Meaning</th></tr></thead>
      <tbody>${requiredRows}</tbody>
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
    <h2>Specific action paths</h2>
    <table>
      <thead><tr><th>Path</th><th>Use</th></tr></thead>
      <tbody>${pathRows}</tbody>
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
    <h2>Decision</h2>
    <div class="notice">
      More generic preparation is not necessary. The next work should be tied to one exact action:
      governance decision recording, treasury funding authorization, Safe payload generation, execution activation,
      public sale, staking/rewards, or buyback approval.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/launch-control">/api/public/launch-control</a></p>
    <p><a href="/trust">Trust Center</a></p>
    <p><a href="/full-launch">Full launch readiness</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Launch Control");
console.log("============================");
console.log(`Status: ${report.status}`);
console.log("Generic preparation complete: true");
console.log("Additional generic preparation recommended: false");
console.log(`Report: ${reportFile}`);
