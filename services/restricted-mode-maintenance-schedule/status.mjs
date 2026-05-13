import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const reportDir = path.join(root, "reports", "restricted-mode-maintenance-schedule");
const reportFile = path.join(reportDir, "restricted-mode-maintenance-schedule-status.json");

const publicJsonFile = path.join(root, "public-docs", "restricted-mode-maintenance-schedule-status.json");
const publicHtmlFile = path.join(root, "public-docs", "restricted-mode-maintenance-schedule.html");

fs.mkdirSync(reportDir, { recursive: true });

const maintenanceArtifactPaths = [
  "public-docs/restricted-mode-operations-handoff-status.json",
  "public-docs/restricted-mode-final-release-status.json",
  "public-docs/restricted-mode-release-candidate-status.json",
  "public-docs/restricted-mode-evidence-seal-status.json",
  "public-docs/restricted-mode-monitoring-baseline-status.json",
  "public-docs/restricted-mode-final-status.json",
  "public-docs/governance-decision-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/public-status-update-status.json",
  "public-docs/launch-control-status.json",
  "public-docs/mainnet-monitor-status.json",
  "public-docs/mainnet-alerts-status.json",
  "public-docs/incident-summary.json",
  "public-docs/mainnet-execution-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/treasury-safe-transaction-status.json",
  "public-docs/full-launch-status.json",
  "docs/restricted-mode-maintenance-schedule/RESTRICTED_MODE_MAINTENANCE_SCHEDULE.md",
  "docs/restricted-mode-maintenance-schedule/DAILY_MAINTENANCE_CHECKLIST.md",
  "docs/restricted-mode-maintenance-schedule/WEEKLY_MAINTENANCE_CHECKLIST.md",
  "docs/restricted-mode-maintenance-schedule/MONTHLY_MAINTENANCE_REVIEW.md",
  "docs/restricted-mode-maintenance-schedule/QUARTERLY_CONTROL_REVIEW.md",
  "docs/restricted-mode-maintenance-schedule/EVENT_DRIVEN_MAINTENANCE.md"
];

function readJson(relativePath, fallback = {}) {
  try {
    const full = path.join(root, relativePath);
    if (!fs.existsSync(full)) return fallback;
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch (error) {
    return { error: error.message };
  }
}

function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function sha256File(relativePath) {
  const full = path.join(root, relativePath);
  const buffer = fs.readFileSync(full);

  return {
    path: relativePath,
    bytes: buffer.length,
    sha256: sha256Buffer(buffer)
  };
}

function sha256Json(value) {
  return sha256Buffer(Buffer.from(JSON.stringify(value, null, 2) + "\n"));
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

const config = readJson("configs/restricted-mode-maintenance-schedule.config.json");
const handoff = readJson("public-docs/restricted-mode-operations-handoff-status.json");
const finalRelease = readJson("public-docs/restricted-mode-final-release-status.json");
const releaseCandidate = readJson("public-docs/restricted-mode-release-candidate-status.json");
const evidenceSeal = readJson("public-docs/restricted-mode-evidence-seal-status.json");
const monitoringBaseline = readJson("public-docs/restricted-mode-monitoring-baseline-status.json");
const finalStatus = readJson("public-docs/restricted-mode-final-status.json");
const governanceDecision = readJson("public-docs/governance-decision-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const publicStatusUpdate = readJson("public-docs/public-status-update-status.json");
const launchControl = readJson("public-docs/launch-control-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const treasurySafeTx = readJson("public-docs/treasury-safe-transaction-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

const activeIncidents = Number(incidents?.summary?.active || 0);
const responseRequired = Boolean(alerts?.responseRequired);

const checks = [];

check(checks, "Operations handoff ready", handoff.status === "RESTRICTED_MODE_OPERATIONS_HANDOFF_READY_DECISION_RECORDED_ALL_DISABLED", {
  status: handoff.status || "UNKNOWN"
});

check(checks, "Final release ready", finalRelease.status === "RESTRICTED_MODE_FINAL_RELEASE_READY_DECISION_RECORDED_ALL_DISABLED", {
  status: finalRelease.status || "UNKNOWN"
});

check(checks, "Release candidate ready", releaseCandidate.status === "RESTRICTED_MODE_RELEASE_CANDIDATE_READY_DECISION_RECORDED_ALL_DISABLED", {
  status: releaseCandidate.status || "UNKNOWN"
});

check(checks, "Evidence seal generated", evidenceSeal.status === "RESTRICTED_MODE_EVIDENCE_SEALED_DECISION_RECORDED_ALL_DISABLED", {
  status: evidenceSeal.status || "UNKNOWN"
});

check(checks, "Monitoring baseline established", monitoringBaseline.status === "RESTRICTED_MODE_MONITORING_BASELINE_ESTABLISHED_DECISION_RECORDED_ALL_DISABLED", {
  status: monitoringBaseline.status || "UNKNOWN"
});

check(checks, "Restricted-mode final status synced", finalStatus.status === "RESTRICTED_MODE_FINAL_STATUS_SYNCED_DECISION_RECORDED_ALL_DISABLED", {
  status: finalStatus.status || "UNKNOWN"
});

check(checks, "Governance decision recorded", governanceDecision.governanceDecisionRecorded === true, {
  governanceDecisionRecorded: governanceDecision.governanceDecisionRecorded
});

check(checks, "Capability Matrix all-disabled", capabilityMatrix.allCapabilitiesDisabled === true && capabilityMatrix.allCapabilityApprovalsFalse === true, {
  allCapabilitiesDisabled: capabilityMatrix.allCapabilitiesDisabled,
  allCapabilityApprovalsFalse: capabilityMatrix.allCapabilityApprovalsFalse
});

check(checks, "Public Status Update finalized", publicStatusUpdate.publicStatusUpdateFinalApproved === true, {
  publicStatusUpdateFinalApproved: publicStatusUpdate.publicStatusUpdateFinalApproved
});

check(checks, "Mainnet monitor passing", monitor.status === "PASS", {
  status: monitor.status || "UNKNOWN"
});

check(checks, "Alerts do not require response", responseRequired === false, {
  responseRequired
});

check(checks, "No active incidents", activeIncidents === 0, {
  activeIncidents
});

check(checks, "Execution queue disabled", execution.mode === "MAINNET_EXECUTION_QUEUE_DISABLED", {
  mode: execution.mode || "UNKNOWN"
});

check(checks, "Full launch not approved", fullLaunch.fullLaunchApproved === false && governanceDecision.fullLaunchApproved === false, {
  fullLaunchApproved: fullLaunch.fullLaunchApproved,
  governanceDecisionFullLaunchApproved: governanceDecision.fullLaunchApproved
});

check(checks, "Treasury funding not approved", treasuryFunding.treasuryFundingApproved === false, {
  treasuryFundingApproved: treasuryFunding.treasuryFundingApproved
});

check(checks, "Treasury funding not executed", treasuryFunding.treasuryFundingExecuted === false, {
  treasuryFundingExecuted: treasuryFunding.treasuryFundingExecuted
});

check(checks, "Safe payload not generated", treasurySafeTx.safeTransactionPayloadGenerated === false, {
  safeTransactionPayloadGenerated: treasurySafeTx.safeTransactionPayloadGenerated
});

check(checks, "Safe transaction not prepared", treasurySafeTx.safeTransactionPrepared === false, {
  safeTransactionPrepared: treasurySafeTx.safeTransactionPrepared
});

const missingArtifacts = maintenanceArtifactPaths.filter((artifactPath) => {
  return !fs.existsSync(path.join(root, artifactPath));
});

for (const artifactPath of missingArtifacts) {
  check(checks, `Maintenance artifact exists: ${artifactPath}`, false, { artifactPath });
}

const artifactHashes = maintenanceArtifactPaths
  .filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)))
  .map((artifactPath) => sha256File(artifactPath));

const maintenancePayload = {
  schema: "astra-restricted-mode-maintenance-schedule-payload-v0.1",
  currentApprovedMode: "restricted-mainnet-operation",
  maintenanceScope: "post-handoff-restricted-mode-all-disabled",
  artifactHashes
};

const maintenanceScheduleHash = sha256Json(maintenancePayload);
const failures = checks.filter((item) => !item.pass);

const status = failures.length === 0
  ? "RESTRICTED_MODE_MAINTENANCE_SCHEDULE_READY_DECISION_RECORDED_ALL_DISABLED"
  : "RESTRICTED_MODE_MAINTENANCE_SCHEDULE_REVIEW_REQUIRED";

const report = {
  schema: "astra-restricted-mode-maintenance-schedule-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  maintenanceScope: config.maintenanceScope || "post-handoff-restricted-mode-all-disabled",
  publicStatement:
    "AstraTreasury restricted-mode maintenance schedule is ready. Governance decision is recorded, final restricted-mode release is complete, and all restricted capabilities remain disabled and not approved.",
  summary: {
    artifactCount: artifactHashes.length,
    missingArtifactCount: missingArtifacts.length,
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
    activeIncidents,
    responseRequired,
    monitorStatus: monitor.status || "UNKNOWN"
  },
  maintenanceSchedule: {
    maintenanceScheduleHash,
    hashAlgorithm: "SHA-256",
    cadence: config.maintenanceCadence || {},
    artifactHashes
  },
  checks,
  failures,
  missingArtifacts,
  currentStatuses: {
    restrictedModeOperationsHandoff: handoff.status || "UNKNOWN",
    restrictedModeFinalRelease: finalRelease.status || "UNKNOWN",
    restrictedModeReleaseCandidate: releaseCandidate.status || "UNKNOWN",
    restrictedModeEvidenceSeal: evidenceSeal.status || "UNKNOWN",
    restrictedModeMonitoringBaseline: monitoringBaseline.status || "UNKNOWN",
    restrictedModeFinalStatus: finalStatus.status || "UNKNOWN",
    governanceDecision: governanceDecision.status || "UNKNOWN",
    capabilityMatrix: capabilityMatrix.status || "UNKNOWN",
    publicStatusUpdate: publicStatusUpdate.status || "UNKNOWN",
    launchControl: launchControl.status || "UNKNOWN",
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
    paperToOnchainAutomation: false,
    safeTransactionPayloadGeneration: false,
    safeTransactionExecution: false
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

const cadenceRows = Object.entries(report.maintenanceSchedule.cadence).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(Array.isArray(value) ? value.join("; ") : value)}</td></tr>`;
}).join("");

const artifactRows = artifactHashes.map((item) => {
  return `<tr><td>${escapeHtml(item.path)}</td><td>${escapeHtml(item.bytes)}</td><td><code>${escapeHtml(item.sha256)}</code></td></tr>`;
}).join("");

const checkRows = checks.map((item) => {
  return `<tr><td>${escapeHtml(item.name)}</td><td>${item.pass ? "PASS" : "FAIL"}</td><td><code>${escapeHtml(JSON.stringify(item.details))}</code></td></tr>`;
}).join("");

const statusRows = Object.entries(report.currentStatuses).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(humanize(value))}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Restricted-Mode Maintenance Schedule</title>
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
    <div class="badge">Maintenance schedule · restricted mode</div>
    <h1>Restricted-Mode Maintenance Schedule</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
    <p><strong>Maintenance schedule hash:</strong> <code>${escapeHtml(maintenanceScheduleHash)}</code></p>
  </section>

  <section class="card">
    <h2>Maintenance cadence</h2>
    <table>
      <thead><tr><th>Cadence</th><th>Actions</th></tr></thead>
      <tbody>${cadenceRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Maintenance artifacts</h2>
    <table>
      <thead><tr><th>Artifact</th><th>Bytes</th><th>SHA-256</th></tr></thead>
      <tbody>${artifactRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Checks</h2>
    <table>
      <thead><tr><th>Check</th><th>Status</th><th>Details</th></tr></thead>
      <tbody>${checkRows}</tbody>
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
      This maintenance schedule documents restricted-mode steady-state operations only.
      It does not approve launch, funding, public sale, staking/rewards, buybacks, execution,
      automation, autonomous execution, Safe payload generation, or Safe transaction execution.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/restricted-mode-maintenance-schedule">/api/public/restricted-mode-maintenance-schedule</a></p>
    <p><a href="/restricted-mode-operations-handoff">Restricted-Mode Operations Handoff</a></p>
    <p><a href="/restricted-mode-final-release">Restricted-Mode Final Release</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Restricted-Mode Maintenance Schedule");
console.log("==================================================");
console.log(`Status: ${report.status}`);
console.log(`Maintenance artifacts: ${report.summary.artifactCount}`);
console.log(`Maintenance schedule hash: ${maintenanceScheduleHash}`);
console.log(`Report: ${reportFile}`);

if (failures.length > 0) {
  console.table(failures.map((item) => ({
    name: item.name,
    details: JSON.stringify(item.details).slice(0, 240)
  })));
  process.exit(1);
}
