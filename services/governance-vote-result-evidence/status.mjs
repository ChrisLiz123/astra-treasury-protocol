import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const evidenceRelativePath = "reports/governance-vote-result-evidence/import/governance-vote-result-evidence.json";
const evidencePath = path.join(root, evidenceRelativePath);

const reportDir = path.join(root, "reports", "governance-vote-result-evidence");
const reportFile = path.join(reportDir, "governance-vote-result-evidence-status.json");

const publicJsonFile = path.join(root, "public-docs", "governance-vote-result-evidence-status.json");
const publicHtmlFile = path.join(root, "public-docs", "governance-vote-result-evidence.html");

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

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

const config = readJson("configs/governance-vote-result-evidence-import.config.json");
const launchControl = readJson("public-docs/launch-control-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const publicStatusUpdate = readJson("public-docs/public-status-update-status.json");
const stabilization = readJson("public-docs/stabilization-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const governanceVote = readJson("public-docs/full-launch-governance-vote-status.json");
const decisionRecording = readJson("public-docs/full-launch-governance-decision-recording-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const treasurySafeTx = readJson("public-docs/treasury-safe-transaction-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

const activeIncidents = Number(incidents?.summary?.active || 0);
const responseRequired = Boolean(alerts?.responseRequired);

const evidenceFilePresent = fs.existsSync(evidencePath);
let evidence = null;
let evidenceParseError = "";
const validationIssues = [];

if (evidenceFilePresent) {
  try {
    evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
  } catch (error) {
    evidenceParseError = error.message;
    validationIssues.push(`Evidence file is not valid JSON: ${error.message}`);
  }
}

if (evidence) {
  if (evidence.schema !== "astra-governance-vote-result-evidence-v0.1") {
    validationIssues.push("Evidence schema is invalid.");
  }

  for (const key of [
    "voteTitle",
    "voteUrl",
    "voteMechanism",
    "openedAt",
    "closedAt",
    "result",
    "evidenceReference",
    "capabilityMatrixReference",
    "publicStatusReference"
  ]) {
    if (!isNonEmptyString(evidence[key])) {
      validationIssues.push(`Missing required evidence field: ${key}`);
    }
  }

  if (evidence.voteOpened !== true) {
    validationIssues.push("voteOpened must be true.");
  }

  if (evidence.voteCompleted !== true) {
    validationIssues.push("voteCompleted must be true.");
  }

  if (evidence.voteResultRecorded !== true) {
    validationIssues.push("voteResultRecorded must be true.");
  }

  if (!Array.isArray(evidence.approvedCapabilities)) {
    validationIssues.push("approvedCapabilities must be an array.");
  }

  const evidenceText = JSON.stringify(evidence).toLowerCase();
  for (const forbidden of ["private key", "seed phrase", "password", "secret", "mnemonic"]) {
    if (evidenceText.includes(forbidden)) {
      validationIssues.push(`Evidence appears to contain forbidden sensitive phrase: ${forbidden}`);
    }
  }
}

const voteResultImported = evidenceFilePresent && Boolean(evidence);
const voteResultValidated = voteResultImported && validationIssues.length === 0;
const voteResultRecorded = voteResultValidated && evidence.voteResultRecorded === true;
const voteOpened = voteResultValidated && evidence.voteOpened === true;
const voteCompleted = voteResultValidated && evidence.voteCompleted === true;

const capabilityApprovals = config.capabilityApprovals || {};
const capabilityApprovalCount = Object.values(capabilityApprovals).filter((value) => value === true).length;

const safe =
  config.evidenceImportFrameworkPrepared === true &&
  launchControl.additionalGenericPreparationRecommended === false &&
  capabilityMatrix.allCapabilitiesDisabled === true &&
  capabilityMatrix.allCapabilityApprovalsFalse === true &&
  publicStatusUpdate.publicStatusUpdateFinalApproved === true &&
  fullLaunch.fullLaunchApproved === false &&
  decisionRecording.governanceDecisionRecorded === false &&
  treasuryFunding.treasuryFundingApproved === false &&
  treasuryFunding.treasuryFundingExecuted === false &&
  treasurySafeTx.safeTransactionPayloadGenerated === false &&
  treasurySafeTx.safeTransactionPrepared === false &&
  execution.mode === "MAINNET_EXECUTION_QUEUE_DISABLED" &&
  capabilityApprovalCount === 0;

const status = !safe
  ? "GOVERNANCE_VOTE_RESULT_EVIDENCE_REVIEW_REQUIRED"
  : voteResultImported
    ? voteResultValidated
      ? "GOVERNANCE_VOTE_RESULT_EVIDENCE_IMPORTED_PENDING_REVIEW"
      : "GOVERNANCE_VOTE_RESULT_EVIDENCE_REVIEW_REQUIRED"
    : "GOVERNANCE_VOTE_RESULT_EVIDENCE_IMPORT_READY_NO_EVIDENCE";

const evidenceSummary = voteResultImported
  ? {
      voteTitle: evidence.voteTitle || "",
      voteUrl: evidence.voteUrl || "",
      voteMechanism: evidence.voteMechanism || "",
      openedAt: evidence.openedAt || "",
      closedAt: evidence.closedAt || "",
      voteOpened,
      voteCompleted,
      voteResultRecorded,
      result: evidence.result || "",
      resultSummary: evidence.resultSummary || "",
      approvedCapabilities: Array.isArray(evidence.approvedCapabilities) ? evidence.approvedCapabilities : [],
      disabledCapabilities: Array.isArray(evidence.disabledCapabilities) ? evidence.disabledCapabilities : [],
      evidenceReference: evidence.evidenceReference || "",
      capabilityMatrixReference: evidence.capabilityMatrixReference || "",
      publicStatusReference: evidence.publicStatusReference || ""
    }
  : {
      voteTitle: "not imported",
      voteUrl: "not imported",
      voteMechanism: "not imported",
      openedAt: "",
      closedAt: "",
      voteOpened: false,
      voteCompleted: false,
      voteResultRecorded: false,
      result: "not imported",
      resultSummary: "not imported",
      approvedCapabilities: [],
      disabledCapabilities: [],
      evidenceReference: "not imported",
      capabilityMatrixReference: "not imported",
      publicStatusReference: "not imported"
    };

const report = {
  schema: "astra-governance-vote-result-evidence-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  evidenceImportFrameworkPrepared: Boolean(config.evidenceImportFrameworkPrepared),
  expectedEvidenceFile: evidenceRelativePath,
  evidenceFilePresent,
  evidenceParseError,
  voteEvidenceImported: voteResultImported,
  voteResultImported,
  voteResultValidated,
  voteResultRecorded,
  voteOpened,
  voteCompleted,
  governanceDecisionRecorded: false,
  fullLaunchApproved: false,
  publicStatement:
    voteResultImported
      ? "AstraTreasury governance vote/result evidence has been imported for review. It does not record a governance decision or approve any capability."
      : "AstraTreasury governance vote/result evidence import path is ready. No vote/result evidence has been imported yet, so governance decision recording remains blocked.",
  summary: {
    validationIssues: validationIssues.length,
    activeIncidents,
    responseRequired,
    monitorStatus: monitor.status || "UNKNOWN",
    capabilityApprovalCount
  },
  evidenceSummary,
  validationIssues,
  capabilityApprovals,
  currentStatuses: {
    launchControl: launchControl.status || "UNKNOWN",
    capabilityMatrix: capabilityMatrix.status || "UNKNOWN",
    publicStatusUpdate: publicStatusUpdate.status || "UNKNOWN",
    stabilization: stabilization.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    governanceVote: governanceVote.status || "UNKNOWN",
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

const evidenceRows = Object.entries(evidenceSummary).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(Array.isArray(value) ? JSON.stringify(value) : value)}</td></tr>`;
}).join("");

const validationRows = validationIssues.length === 0
  ? '<tr><td>No validation issues.</td></tr>'
  : validationIssues.map((item) => `<tr><td>${escapeHtml(item)}</td></tr>`).join("");

const statusRows = Object.entries(report.currentStatuses).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(humanize(value))}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Governance Vote/Result Evidence</title>
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
    <div class="badge">Evidence import · no approval recorded</div>
    <h1>Governance Vote/Result Evidence</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
  </section>

  <section class="card">
    <h2>Evidence summary</h2>
    <table>
      <thead><tr><th>Field</th><th>Value</th></tr></thead>
      <tbody>${evidenceRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Validation</h2>
    <table>
      <thead><tr><th>Issue</th></tr></thead>
      <tbody>${validationRows}</tbody>
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
      Importing vote/result evidence does not record a governance decision and does not approve any capability.
      Evidence must be real, sanitized, and validated before it can satisfy the governance-decision path.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/governance-vote-result-evidence">/api/public/governance-vote-result-evidence</a></p>
    <p><a href="/governance-decision-approval">Governance decision approval</a></p>
    <p><a href="/public-status-update">Public Status Update</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Governance Vote/Result Evidence");
console.log("=============================================");
console.log(`Status: ${report.status}`);
console.log(`Evidence file present: ${report.evidenceFilePresent}`);
console.log(`Vote result imported: ${report.voteResultImported}`);
console.log(`Vote result validated: ${report.voteResultValidated}`);
console.log(`Report: ${reportFile}`);
