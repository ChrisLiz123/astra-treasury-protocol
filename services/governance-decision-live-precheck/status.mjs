import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const reportDir = path.join(root, "reports", "governance-decision-live-precheck");
const reportFile = path.join(reportDir, "governance-decision-live-precheck-status.json");

const publicJsonFile = path.join(root, "public-docs", "governance-decision-live-precheck-status.json");
const publicHtmlFile = path.join(root, "public-docs", "governance-decision-live-precheck.html");

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

const config = readJson("configs/governance-decision-live-precheck.config.json");
const launchControl = readJson("public-docs/launch-control-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const publicStatusUpdate = readJson("public-docs/public-status-update-status.json");
const actionApproval = readJson("public-docs/governance-decision-approval-status.json");
const voteEvidence = readJson("public-docs/governance-vote-result-evidence-status.json");
const signedResolutionEvidence = readJson("public-docs/signed-governance-resolution-evidence-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const decisionRecording = readJson("public-docs/full-launch-governance-decision-recording-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const treasurySafeTx = readJson("public-docs/treasury-safe-transaction-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

const activeIncidents = Number(incidents?.summary?.active || 0);
const resolutionOnlyMode = config.governanceProcessMode === "resolution-only";
const responseRequired = Boolean(alerts?.responseRequired);

const prerequisites = {
  launchControlReady: launchControl.status === "LAUNCH_CONTROL_READY_RESTRICTED_MODE",
  capabilityMatrixFinalized:
    capabilityMatrix.capabilityMatrixFinalized === true &&
    capabilityMatrix.allCapabilitiesDisabled === true &&
    capabilityMatrix.allCapabilityApprovalsFalse === true,
  publicStatusUpdateFinalized:
    publicStatusUpdate.publicStatusUpdateFinalApproved === true &&
    publicStatusUpdate.doesNotApproveCapabilities === true &&
    publicStatusUpdate.fullLaunchApproved === false,
  voteResultEvidenceImportedAndValidated:
    resolutionOnlyMode
      ? true
      : (
          voteEvidence.voteResultImported === true &&
          voteEvidence.voteResultValidated === true &&
          voteEvidence.voteResultRecorded === true
        ),
  signedResolutionEvidenceImportedAndValidated:
    signedResolutionEvidence.signedResolutionEvidenceImported === true &&
    signedResolutionEvidence.signedResolutionValidated === true &&
    signedResolutionEvidence.signedGovernanceResolutionExists === true &&
    signedResolutionEvidence.resolutionSigningAuthorizationRecorded === true,
  actionSpecificApprovalRecorded: actionApproval.actionSpecificApprovalRecorded === true,
  governanceDecisionNotAlreadyRecorded: decisionRecording.governanceDecisionRecorded === false,
  fullLaunchNotAlreadyApproved: fullLaunch.fullLaunchApproved === false,
  treasuryFundingNotApproved: treasuryFunding.treasuryFundingApproved === false,
  safePayloadNotGenerated: treasurySafeTx.safeTransactionPayloadGenerated === false,
  safeTransactionNotPrepared: treasurySafeTx.safeTransactionPrepared === false,
  mainnetMonitorPassing: monitor.status === "PASS",
  activeIncidentsZero: activeIncidents === 0,
  alertsDoNotRequireResponse: responseRequired === false,
  mainnetExecutionQueueDisabled: execution.mode === "MAINNET_EXECUTION_QUEUE_DISABLED"
};

const blockers = Object.entries(prerequisites)
  .filter(([, value]) => value !== true)
  .map(([key]) => key);

const unsafe =
  fullLaunch.fullLaunchApproved === true ||
  decisionRecording.governanceDecisionRecorded === true ||
  treasuryFunding.treasuryFundingApproved === true ||
  treasuryFunding.treasuryFundingExecuted === true ||
  treasurySafeTx.safeTransactionPayloadGenerated === true ||
  treasurySafeTx.safeTransactionPrepared === true ||
  execution.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED";

const readyToRecordGovernanceDecision = blockers.length === 0 && unsafe === false;

const status = unsafe
  ? "GOVERNANCE_DECISION_RECORDING_LIVE_PRECHECK_REVIEW_REQUIRED"
  : readyToRecordGovernanceDecision
    ? "GOVERNANCE_DECISION_RECORDING_LIVE_PRECHECK_READY_TO_RECORD"
    : "GOVERNANCE_DECISION_RECORDING_LIVE_PRECHECK_BLOCKED_PENDING_EVIDENCE_OR_APPROVAL";

const report = {
  schema: "astra-governance-decision-live-precheck-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  selectedAction: config.selectedAction || {},
  governanceProcessMode: config.governanceProcessMode || "vote-or-resolution",
  precheckOnly: true,
  livePrecheckFrameworkPrepared: Boolean(config.livePrecheckFrameworkPrepared),
  readyToRecordGovernanceDecision,
  governanceDecisionRecorded: false,
  fullLaunchApproved: false,
  publicStatement:
    readyToRecordGovernanceDecision
      ? "AstraTreasury governance decision recording live precheck is ready. This precheck does not record the governance decision."
      : "AstraTreasury governance decision recording live precheck is blocked until required evidence and final approvals are present. No governance decision is recorded.",
  summary: {
    totalPrerequisites: Object.keys(prerequisites).length,
    passedPrerequisites: Object.values(prerequisites).filter((value) => value === true).length,
    blockerCount: blockers.length,
    activeIncidents,
    responseRequired,
    monitorStatus: monitor.status || "UNKNOWN"
  },
  prerequisites,
  blockers,
  currentStatuses: {
    launchControl: launchControl.status || "UNKNOWN",
    capabilityMatrix: capabilityMatrix.status || "UNKNOWN",
    publicStatusUpdate: publicStatusUpdate.status || "UNKNOWN",
    actionApproval: actionApproval.status || "UNKNOWN",
    voteResultEvidence: voteEvidence.status || "UNKNOWN",
    signedResolutionEvidence: signedResolutionEvidence.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    decisionRecording: decisionRecording.status || "UNKNOWN",
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

const prerequisiteRows = Object.entries(prerequisites).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "PASS" : "BLOCKED"}</td></tr>`;
}).join("");

const blockerRows = blockers.length === 0
  ? '<tr><td>No blockers.</td></tr>'
  : blockers.map((item) => `<tr><td>${escapeHtml(item)}</td></tr>`).join("");

const statusRows = Object.entries(report.currentStatuses).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(humanize(value))}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Governance Decision Live Precheck</title>
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
    <div class="badge">Live precheck · no decision recorded</div>
    <h1>Governance Decision Live Precheck</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
  </section>

  <section class="card">
    <h2>Prerequisites</h2>
    <table>
      <thead><tr><th>Prerequisite</th><th>Status</th></tr></thead>
      <tbody>${prerequisiteRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Blockers</h2>
    <table>
      <thead><tr><th>Blocker</th></tr></thead>
      <tbody>${blockerRows}</tbody>
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
      This is a precheck only. It does not record a governance decision, approve full launch,
      approve any capability, generate a Safe payload, or execute a transaction.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/governance-decision-live-precheck">/api/public/governance-decision-live-precheck</a></p>
    <p><a href="/governance-decision-approval">Governance decision approval</a></p>
    <p><a href="/signed-governance-resolution-evidence">Signed resolution evidence</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Governance Decision Recording Live Precheck");
console.log("=========================================================");
console.log(`Status: ${report.status}`);
console.log(`Ready to record governance decision: ${report.readyToRecordGovernanceDecision}`);
console.log(`Prerequisites passed: ${report.summary.passedPrerequisites}/${report.summary.totalPrerequisites}`);
console.log(`Blockers: ${report.summary.blockerCount}`);
console.log(`Report: ${reportFile}`);
