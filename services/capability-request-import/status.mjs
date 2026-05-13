import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const requestRelativePath = "reports/capability-activation-intake/requests/capability-activation-request.json";
const requestPath = path.join(root, requestRelativePath);

const reportDir = path.join(root, "reports", "capability-request-import");
const reportFile = path.join(reportDir, "capability-request-import-status.json");

const publicJsonFile = path.join(root, "public-docs", "capability-request-import-status.json");
const publicHtmlFile = path.join(root, "public-docs", "capability-request-import.html");

fs.mkdirSync(reportDir, { recursive: true });

const requestImportArtifactPaths = [
  "configs/capability-request-import.config.json",
  "configs/capability-activation-intake.config.json",
  "docs/capability-request-import/CAPABILITY_REQUEST_IMPORT_TEMPLATE.md",
  "docs/capability-request-import/CAPABILITY_REQUEST_IMPORT_RUNBOOK.md",
  "docs/capability-request-import/CAPABILITY_REQUEST_FIELDS.md",
  "docs/capability-request-import/CAPABILITY_REQUEST_IMPORT_BOUNDARIES.md",
  "scripts/import-capability-activation-request.mjs",
  "public-docs/capability-activation-intake-status.json",
  "public-docs/restricted-mode-operator-checklist-status.json",
  "public-docs/restricted-mode-maintenance-schedule-status.json",
  "public-docs/restricted-mode-final-release-status.json",
  "public-docs/governance-decision-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/treasury-safe-transaction-status.json",
  "public-docs/mainnet-monitor-status.json",
  "public-docs/mainnet-alerts-status.json",
  "public-docs/incident-summary.json",
  "public-docs/mainnet-execution-status.json"
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

function isPlaceholder(value) {
  const normalized = String(value || "").trim().toLowerCase();

  return (
    normalized.length === 0 ||
    normalized === "tbd" ||
    normalized.includes("tbd") ||
    normalized.includes("todo") ||
    normalized.includes("placeholder") ||
    normalized.includes("replace_with") ||
    normalized.includes("paste_") ||
    normalized === "yyyy-mm-ddthh:mm:ssz"
  );
}

function looksSensitive(value) {
  const normalized = String(value || "").toLowerCase();

  return (
    normalized.includes("private key") ||
    normalized.includes("seed phrase") ||
    normalized.includes("mnemonic") ||
    normalized.includes("password") ||
    normalized.includes("secret")
  );
}

function usableString(value) {
  return typeof value === "string" && !isPlaceholder(value) && !looksSensitive(value);
}

const config = readJson("configs/capability-request-import.config.json");
const intake = readJson("public-docs/capability-activation-intake-status.json");
const operatorChecklist = readJson("public-docs/restricted-mode-operator-checklist-status.json");
const maintenanceSchedule = readJson("public-docs/restricted-mode-maintenance-schedule-status.json");
const finalRelease = readJson("public-docs/restricted-mode-final-release-status.json");
const governanceDecision = readJson("public-docs/governance-decision-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
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

check(checks, "Request import template prepared", config.requestImportTemplatePrepared === true, {
  requestImportTemplatePrepared: config.requestImportTemplatePrepared
});

check(checks, "Request importer prepared", config.requestImporterPrepared === true, {
  requestImporterPrepared: config.requestImporterPrepared
});

check(checks, "Capability intake gate healthy", [
  "CAPABILITY_ACTIVATION_INTAKE_GATE_READY_NO_ACTIVE_REQUEST",
  "CAPABILITY_ACTIVATION_INTAKE_REQUEST_IMPORTED_PENDING_REVIEW"
].includes(intake.status), {
  status: intake.status || "UNKNOWN"
});

check(checks, "Operator checklist ready", operatorChecklist.status === "RESTRICTED_MODE_OPERATOR_CHECKLIST_READY_DECISION_RECORDED_ALL_DISABLED", {
  status: operatorChecklist.status || "UNKNOWN"
});

check(checks, "Maintenance schedule ready", maintenanceSchedule.status === "RESTRICTED_MODE_MAINTENANCE_SCHEDULE_READY_DECISION_RECORDED_ALL_DISABLED", {
  status: maintenanceSchedule.status || "UNKNOWN"
});

check(checks, "Final release ready", finalRelease.status === "RESTRICTED_MODE_FINAL_RELEASE_READY_DECISION_RECORDED_ALL_DISABLED", {
  status: finalRelease.status || "UNKNOWN"
});

check(checks, "Governance decision recorded", governanceDecision.governanceDecisionRecorded === true, {
  governanceDecisionRecorded: governanceDecision.governanceDecisionRecorded
});

check(checks, "Capability Matrix all-disabled", capabilityMatrix.allCapabilitiesDisabled === true && capabilityMatrix.allCapabilityApprovalsFalse === true, {
  allCapabilitiesDisabled: capabilityMatrix.allCapabilitiesDisabled,
  allCapabilityApprovalsFalse: capabilityMatrix.allCapabilityApprovalsFalse
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

let request = null;
let requestValid = false;
let requestParseError = "";
let requestIssues = [];

if (fs.existsSync(requestPath)) {
  try {
    request = JSON.parse(fs.readFileSync(requestPath, "utf8"));
  } catch (error) {
    requestParseError = error.message;
    requestIssues.push(`Request file is not valid JSON: ${error.message}`);
  }

  if (request) {
    if (request.schema !== "astra-capability-activation-request-v0.1") {
      requestIssues.push("Invalid request schema.");
    }

    for (const key of [
      "requestId",
      "requestedCapability",
      "requesterReference",
      "authorityReference",
      "purpose",
      "scope",
      "evidenceReference",
      "publicStatusPlan",
      "requestedAt"
    ]) {
      if (!usableString(request[key])) {
        requestIssues.push(`Missing, placeholder, or sensitive field: ${key}`);
      }
    }

    if (!Array.isArray(config.allowedCapabilities) || !config.allowedCapabilities.includes(request.requestedCapability)) {
      requestIssues.push("Requested capability is not allowed.");
    }

    for (const key of [
      "safePayloadGenerationRequested",
      "executionQueueActivationRequested",
      "fundsMovementRequested"
    ]) {
      if (request[key] !== false) {
        requestIssues.push(`${key} must be false for import.`);
      }
    }

    if (!Number.isFinite(Date.parse(request.requestedAt))) {
      requestIssues.push("requestedAt must be a valid ISO timestamp.");
    }
  }

  requestValid = requestIssues.length === 0 && Boolean(request);
}

check(checks, "Active request valid if present", !fs.existsSync(requestPath) || requestValid, {
  requestFilePresent: fs.existsSync(requestPath),
  requestIssues
});

const missingArtifacts = requestImportArtifactPaths.filter((artifactPath) => {
  return !fs.existsSync(path.join(root, artifactPath));
});

for (const artifactPath of missingArtifacts) {
  check(checks, `Request import artifact exists: ${artifactPath}`, false, { artifactPath });
}

const artifactHashes = requestImportArtifactPaths
  .filter((artifactPath) => fs.existsSync(path.join(root, artifactPath)))
  .map((artifactPath) => sha256File(artifactPath));

if (fs.existsSync(requestPath)) {
  artifactHashes.push(sha256File(requestRelativePath));
}

const requestImportPayload = {
  schema: "astra-capability-request-import-payload-v0.1",
  currentApprovedMode: "restricted-mainnet-operation",
  requestImportScope: "future-capability-request-import-for-review-only",
  requestFilePresent: fs.existsSync(requestPath),
  requestValid,
  artifactHashes
};

const requestImportHash = sha256Json(requestImportPayload);
const failures = checks.filter((item) => !item.pass);

const status = failures.length > 0
  ? "CAPABILITY_REQUEST_IMPORT_REVIEW_REQUIRED"
  : requestValid
    ? "CAPABILITY_REQUEST_IMPORTED_FOR_REVIEW_NO_APPROVAL"
    : "CAPABILITY_REQUEST_IMPORT_TEMPLATE_READY_NO_ACTIVE_REQUEST";

const requestSummary = request
  ? {
      requestId: request.requestId || "",
      requestedCapability: request.requestedCapability || "",
      requesterReference: request.requesterReference || "",
      authorityReference: request.authorityReference || "",
      purpose: request.purpose || "",
      scope: request.scope || "",
      evidenceReference: request.evidenceReference || "",
      publicStatusPlan: request.publicStatusPlan || "",
      onchainImpact: Boolean(request.onchainImpact),
      safeTransactionImpact: Boolean(request.safeTransactionImpact),
      safePayloadGenerationRequested: Boolean(request.safePayloadGenerationRequested),
      executionQueueActivationRequested: Boolean(request.executionQueueActivationRequested),
      fundsMovementRequested: Boolean(request.fundsMovementRequested),
      requestedAt: request.requestedAt || ""
    }
  : {
      requestId: "no active request",
      requestedCapability: "none",
      requesterReference: "none",
      authorityReference: "none",
      purpose: "none",
      scope: "none",
      evidenceReference: "none",
      publicStatusPlan: "none",
      onchainImpact: false,
      safeTransactionImpact: false,
      safePayloadGenerationRequested: false,
      executionQueueActivationRequested: false,
      fundsMovementRequested: false,
      requestedAt: ""
    };

const report = {
  schema: "astra-capability-request-import-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  requestImportScope: config.requestImportScope || "future-capability-request-import-for-review-only",
  publicStatement:
    requestValid
      ? "AstraTreasury capability request has been imported for review only. Import does not approve activation or generate any Safe payload."
      : "AstraTreasury capability request import template is ready. No active request is imported, and all restricted capabilities remain disabled and not approved.",
  summary: {
    requestFilePresent: fs.existsSync(requestPath),
    requestValid,
    requestIssueCount: requestIssues.length,
    artifactCount: artifactHashes.length,
    missingArtifactCount: missingArtifacts.length,
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
    activeIncidents,
    responseRequired,
    monitorStatus: monitor.status || "UNKNOWN"
  },
  requestImport: {
    requestImportHash,
    hashAlgorithm: "SHA-256",
    allowedCapabilities: config.allowedCapabilities || [],
    requestFile: requestRelativePath,
    requestSummary,
    requestIssues,
    requestParseError,
    artifactHashes
  },
  checks,
  failures,
  missingArtifacts,
  currentStatuses: {
    capabilityActivationIntake: intake.status || "UNKNOWN",
    restrictedModeOperatorChecklist: operatorChecklist.status || "UNKNOWN",
    restrictedModeMaintenanceSchedule: maintenanceSchedule.status || "UNKNOWN",
    restrictedModeFinalRelease: finalRelease.status || "UNKNOWN",
    governanceDecision: governanceDecision.status || "UNKNOWN",
    capabilityMatrix: capabilityMatrix.status || "UNKNOWN",
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

const allowedRows = (config.allowedCapabilities || []).map((item) => {
  return `<tr><td>${escapeHtml(item)}</td><td>Import for review only. Separate approval required.</td></tr>`;
}).join("");

const requestRows = Object.entries(requestSummary).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
}).join("");

const issueRows = requestIssues.length === 0
  ? '<tr><td>No request issues.</td></tr>'
  : requestIssues.map((item) => `<tr><td>${escapeHtml(item)}</td></tr>`).join("");

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
  <title>AstraTreasury Capability Request Import</title>
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
    <div class="badge">Request import · no capability approved</div>
    <h1>Capability Request Import</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
    <p><strong>Request import hash:</strong> <code>${escapeHtml(requestImportHash)}</code></p>
  </section>

  <section class="card">
    <h2>Allowed request capabilities</h2>
    <table>
      <thead><tr><th>Capability</th><th>Boundary</th></tr></thead>
      <tbody>${allowedRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Request summary</h2>
    <table>
      <thead><tr><th>Field</th><th>Value</th></tr></thead>
      <tbody>${requestRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Request issues</h2>
    <table>
      <thead><tr><th>Issue</th></tr></thead>
      <tbody>${issueRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Request import artifacts</h2>
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
      Request import is for review only. It does not approve launch, funding, public sale,
      staking/rewards, buybacks, execution, automation, autonomous execution, Safe payload generation,
      or Safe transaction execution.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/capability-request-import">/api/public/capability-request-import</a></p>
    <p><a href="/capability-activation-intake">Capability Activation Intake</a></p>
    <p><a href="/restricted-mode-operator-checklist">Restricted-Mode Operator Checklist</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Capability Request Import");
console.log("=======================================");
console.log(`Status: ${report.status}`);
console.log(`Request file present: ${report.summary.requestFilePresent}`);
console.log(`Request valid: ${report.summary.requestValid}`);
console.log(`Request import hash: ${requestImportHash}`);
console.log(`Report: ${reportFile}`);

if (failures.length > 0) {
  console.table(failures.map((item) => ({
    name: item.name,
    details: JSON.stringify(item.details).slice(0, 240)
  })));
  process.exit(1);
}
