import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const evidenceRelativePath = "reports/signed-governance-resolution-evidence/import/signed-governance-resolution-evidence.json";
const evidencePath = path.join(root, evidenceRelativePath);

const reportDir = path.join(root, "reports", "signed-governance-resolution-evidence");
const reportFile = path.join(reportDir, "signed-governance-resolution-evidence-status.json");

const publicJsonFile = path.join(root, "public-docs", "signed-governance-resolution-evidence-status.json");
const publicHtmlFile = path.join(root, "public-docs", "signed-governance-resolution-evidence.html");

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

function isPlaceholderEvidenceValue(value) {
  const normalized = String(value ?? "").trim().toLowerCase();

  return (
    normalized === "tbd" ||
    normalized.includes("tbd") ||
    normalized === "todo" ||
    normalized.includes("todo") ||
    normalized === "not imported" ||
    normalized === "yyyy-mm-ddthh:mm:ssz" ||
    normalized.includes("placeholder") ||
    normalized.includes("paste_")
  );
}

function isUsableEvidenceString(value) {
  return isNonEmptyString(value) && !isPlaceholderEvidenceValue(value);
}

const config = readJson("configs/signed-governance-resolution-evidence-import.config.json");
const governanceProcessMode = config.governanceProcessMode || "vote-or-resolution";
const launchControl = readJson("public-docs/launch-control-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const publicStatusUpdate = readJson("public-docs/public-status-update-status.json");
const voteResultEvidence = readJson("public-docs/governance-vote-result-evidence-status.json");
const stabilization = readJson("public-docs/stabilization-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const governanceResolution = readJson("public-docs/full-launch-governance-resolution-status.json");
const resolutionAuthorization = readJson("public-docs/full-launch-governance-resolution-authorization-status.json");
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
  if (evidence.schema !== "astra-signed-governance-resolution-evidence-v0.1") {
    validationIssues.push("Evidence schema is invalid.");
  }

  const requiredEvidenceFields = [
    "resolutionTitle",
    "resolutionReference",
    "resolutionHash",
    "signedAt",
    "resolutionSigningAuthorizationReference",
    "capabilityMatrixReference",
    "publicStatusReference",
    "evidenceReference"
  ];

  if (governanceProcessMode === "resolution-only") {
    requiredEvidenceFields.push("governanceProcessReference");
  } else {
    requiredEvidenceFields.push("voteResultReference");
  }

  for (const key of requiredEvidenceFields) {
    if (!isUsableEvidenceString(evidence[key])) {
      validationIssues.push(`Missing, empty, or placeholder evidence field: ${key}`);
    }
  }

  if (governanceProcessMode === "resolution-only" && evidence.governanceProcessMode !== "resolution-only") {
    validationIssues.push("Evidence must set governanceProcessMode to resolution-only.");
  }

  if (evidence.governanceResolutionSigned !== true) {
    validationIssues.push("governanceResolutionSigned must be true.");
  }

  if (evidence.resolutionSigningAuthorizationRecorded !== true) {
    validationIssues.push("resolutionSigningAuthorizationRecorded must be true.");
  }

  if (!Array.isArray(evidence.approvedCapabilities)) {
    validationIssues.push("approvedCapabilities must be an array.");
  } else if (evidence.approvedCapabilities.length !== 0) {
    validationIssues.push("approvedCapabilities must be empty for this all-disabled restricted-mode path.");
  }

  if (!Array.isArray(evidence.disabledCapabilities)) {
    validationIssues.push("disabledCapabilities must be an array.");
  }

  const evidenceText = JSON.stringify(evidence).toLowerCase();
  for (const forbidden of ["private key", "seed phrase", "password", "secret", "mnemonic"]) {
    if (evidenceText.includes(forbidden)) {
      validationIssues.push(`Evidence appears to contain forbidden sensitive phrase: ${forbidden}`);
    }
  }
}

const signedResolutionEvidenceImported = evidenceFilePresent && Boolean(evidence);
const signedResolutionValidated = signedResolutionEvidenceImported && validationIssues.length === 0;
const signedGovernanceResolutionExists = signedResolutionValidated && evidence.governanceResolutionSigned === true;
const resolutionSigningAuthorizationRecorded = signedResolutionValidated && evidence.resolutionSigningAuthorizationRecorded === true;

const capabilityApprovals = config.capabilityApprovals || {};
const capabilityApprovalCount = Object.values(capabilityApprovals).filter((value) => value === true).length;

const safe =
  config.evidenceImportFrameworkPrepared === true &&
  launchControl.additionalGenericPreparationRecommended === false &&
  capabilityMatrix.allCapabilitiesDisabled === true &&
  capabilityMatrix.allCapabilityApprovalsFalse === true &&
  publicStatusUpdate.publicStatusUpdateFinalApproved === true &&
  fullLaunch.fullLaunchApproved === false &&
  governanceResolution.governanceResolutionSigned === false &&
  resolutionAuthorization.resolutionSigningAuthorizationRecorded === false &&
  decisionRecording.governanceDecisionRecorded === false &&
  treasuryFunding.treasuryFundingApproved === false &&
  treasuryFunding.treasuryFundingExecuted === false &&
  treasurySafeTx.safeTransactionPayloadGenerated === false &&
  treasurySafeTx.safeTransactionPrepared === false &&
  execution.mode === "MAINNET_EXECUTION_QUEUE_DISABLED" &&
  capabilityApprovalCount === 0;

const status = !safe
  ? "SIGNED_GOVERNANCE_RESOLUTION_EVIDENCE_REVIEW_REQUIRED"
  : signedResolutionEvidenceImported
    ? signedResolutionValidated
      ? "SIGNED_GOVERNANCE_RESOLUTION_EVIDENCE_IMPORTED_PENDING_REVIEW"
      : "SIGNED_GOVERNANCE_RESOLUTION_EVIDENCE_REVIEW_REQUIRED"
    : "SIGNED_GOVERNANCE_RESOLUTION_EVIDENCE_IMPORT_READY_NO_EVIDENCE";

const evidenceSummary = signedResolutionEvidenceImported
  ? {
      governanceProcessMode: evidence.governanceProcessMode || governanceProcessMode,
      governanceProcessReference: evidence.governanceProcessReference || "",
      resolutionTitle: evidence.resolutionTitle || "",
      resolutionReference: evidence.resolutionReference || "",
      resolutionHash: evidence.resolutionHash || "",
      signedAt: evidence.signedAt || "",
      governanceResolutionSigned: signedGovernanceResolutionExists,
      resolutionSigningAuthorizationRecorded,
      resolutionSigningAuthorizationReference: evidence.resolutionSigningAuthorizationReference || "",
      voteResultReference: evidence.voteResultReference || "",
      approvedCapabilities: Array.isArray(evidence.approvedCapabilities) ? evidence.approvedCapabilities : [],
      disabledCapabilities: Array.isArray(evidence.disabledCapabilities) ? evidence.disabledCapabilities : [],
      capabilityMatrixReference: evidence.capabilityMatrixReference || "",
      publicStatusReference: evidence.publicStatusReference || "",
      evidenceReference: evidence.evidenceReference || ""
    }
  : {
      governanceProcessMode,
      governanceProcessReference: "not imported",
      resolutionTitle: "not imported",
      resolutionReference: "not imported",
      resolutionHash: "not imported",
      signedAt: "",
      governanceResolutionSigned: false,
      resolutionSigningAuthorizationRecorded: false,
      resolutionSigningAuthorizationReference: "not imported",
      voteResultReference: "not imported",
      approvedCapabilities: [],
      disabledCapabilities: [],
      capabilityMatrixReference: "not imported",
      publicStatusReference: "not imported",
      evidenceReference: "not imported"
    };

const report = {
  schema: "astra-signed-governance-resolution-evidence-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  evidenceImportFrameworkPrepared: Boolean(config.evidenceImportFrameworkPrepared),
  expectedEvidenceFile: evidenceRelativePath,
  evidenceFilePresent,
  evidenceParseError,
  signedResolutionEvidenceImported,
  signedResolutionValidated,
  signedGovernanceResolutionExists,
  resolutionSigningAuthorizationRecorded,
  governanceResolutionSigned: false,
  governanceDecisionRecorded: false,
  fullLaunchApproved: false,
  publicStatement:
    signedResolutionEvidenceImported
      ? "AstraTreasury signed governance resolution evidence has been imported for review. It does not record a governance decision or approve any capability."
      : "AstraTreasury signed governance resolution evidence import path is ready. No signed-resolution evidence has been imported yet, so governance decision recording remains blocked.",
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
    voteResultEvidence: voteResultEvidence.status || "UNKNOWN",
    stabilization: stabilization.status || "UNKNOWN",
    fullLaunch: fullLaunch.status || "UNKNOWN",
    governanceResolution: governanceResolution.status || "UNKNOWN",
    resolutionAuthorization: resolutionAuthorization.status || "UNKNOWN",
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
  <title>AstraTreasury Signed Resolution Evidence</title>
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
    <div class="badge">Evidence import · no decision recorded</div>
    <h1>Signed Governance Resolution Evidence</h1>
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
      Importing signed-resolution evidence does not record a governance decision and does not approve any capability.
      Evidence must be real, sanitized, and validated before it can satisfy the governance-decision path.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/signed-governance-resolution-evidence">/api/public/signed-governance-resolution-evidence</a></p>
    <p><a href="/governance-vote-result-evidence">Governance vote/result evidence</a></p>
    <p><a href="/governance-decision-approval">Governance decision approval</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Signed Governance Resolution Evidence");
console.log("===================================================");
console.log(`Status: ${report.status}`);
console.log(`Evidence file present: ${report.evidenceFilePresent}`);
console.log(`Signed resolution imported: ${report.signedResolutionEvidenceImported}`);
console.log(`Signed resolution validated: ${report.signedResolutionValidated}`);
console.log(`Report: ${reportFile}`);
