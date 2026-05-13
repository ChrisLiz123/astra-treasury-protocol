import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requestDir = path.join(root, "reports", "capability-activation-intake", "requests");
const requestFile = path.join(requestDir, "capability-activation-request.json");

const confirm = process.env.CAPABILITY_REQUEST_IMPORT_CONFIRM || "";
const overwrite = process.env.OVERWRITE_CAPABILITY_REQUEST || "";

const requiredConfirm = "IMPORT_CAPABILITY_REQUEST_FOR_REVIEW_ONLY";

const values = {
  requestId: process.env.CAPABILITY_REQUEST_ID || "",
  requestedCapability: process.env.REQUESTED_CAPABILITY || "",
  requesterReference: process.env.REQUESTER_REFERENCE || "",
  authorityReference: process.env.AUTHORITY_REFERENCE || "",
  purpose: process.env.REQUEST_PURPOSE || "",
  scope: process.env.REQUEST_SCOPE || "",
  evidenceReference: process.env.EVIDENCE_REFERENCE || "",
  publicStatusPlan: process.env.PUBLIC_STATUS_PLAN || "",
  requestedAt: process.env.REQUESTED_AT || new Date().toISOString()
};

const booleans = {
  onchainImpact: process.env.ONCHAIN_IMPACT === "true",
  safeTransactionImpact: process.env.SAFE_TRANSACTION_IMPACT === "true",
  safePayloadGenerationRequested: false,
  executionQueueActivationRequested: false,
  fundsMovementRequested: false
};

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
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

function requireUsable(name, value) {
  if (isPlaceholder(value)) {
    issue(name, "Required value is missing or still a placeholder.");
  }

  if (looksSensitive(value)) {
    issue(name, "Value appears to contain sensitive material.");
  }
}

if (confirm !== requiredConfirm) {
  issue("CAPABILITY_REQUEST_IMPORT_CONFIRM", `Must equal ${requiredConfirm}.`);
}

const config = readJson("configs/capability-activation-intake.config.json");

if (!Array.isArray(config.allowedCapabilities) || !config.allowedCapabilities.includes(values.requestedCapability)) {
  issue("REQUESTED_CAPABILITY", `Must be one of: ${(config.allowedCapabilities || []).join(", ")}`);
}

for (const [key, value] of Object.entries(values)) {
  requireUsable(key, value);
}

if (!Number.isFinite(Date.parse(values.requestedAt))) {
  issue("REQUESTED_AT", "Must be a valid ISO timestamp.");
}

if (process.env.SAFE_PAYLOAD_GENERATION_REQUESTED === "true") {
  issue("SAFE_PAYLOAD_GENERATION_REQUESTED", "Must not be true at intake. Create a later action-specific path instead.");
}

if (process.env.EXECUTION_QUEUE_ACTIVATION_REQUESTED === "true") {
  issue("EXECUTION_QUEUE_ACTIVATION_REQUESTED", "Must not be true at intake. Create a later action-specific path instead.");
}

if (process.env.FUNDS_MOVEMENT_REQUESTED === "true") {
  issue("FUNDS_MOVEMENT_REQUESTED", "Must not be true at intake. Create a later action-specific path instead.");
}

if (fs.existsSync(requestFile) && overwrite !== "YES") {
  issue(
    "OVERWRITE_CAPABILITY_REQUEST",
    "Capability request file already exists. Set OVERWRITE_CAPABILITY_REQUEST=YES only if replacing it intentionally."
  );
}

const operatorChecklist = readJson("public-docs/restricted-mode-operator-checklist-status.json");
const maintenanceSchedule = readJson("public-docs/restricted-mode-maintenance-schedule-status.json");
const finalRelease = readJson("public-docs/restricted-mode-final-release-status.json");
const governanceDecision = readJson("public-docs/governance-decision-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const safeTx = readJson("public-docs/treasury-safe-transaction-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

if (operatorChecklist.status !== "RESTRICTED_MODE_OPERATOR_CHECKLIST_READY_DECISION_RECORDED_ALL_DISABLED") {
  issue("operatorChecklist.status", "Restricted-mode operator checklist must be ready.");
}

if (maintenanceSchedule.status !== "RESTRICTED_MODE_MAINTENANCE_SCHEDULE_READY_DECISION_RECORDED_ALL_DISABLED") {
  issue("maintenanceSchedule.status", "Restricted-mode maintenance schedule must be ready.");
}

if (finalRelease.status !== "RESTRICTED_MODE_FINAL_RELEASE_READY_DECISION_RECORDED_ALL_DISABLED") {
  issue("finalRelease.status", "Restricted-mode final release must be ready.");
}

if (governanceDecision.governanceDecisionRecorded !== true) {
  issue("governanceDecision.governanceDecisionRecorded", "Governance decision must be recorded.");
}

if (governanceDecision.fullLaunchApproved !== false) {
  issue("governanceDecision.fullLaunchApproved", "Governance decision must not approve full launch.");
}

if (capabilityMatrix.allCapabilitiesDisabled !== true || capabilityMatrix.allCapabilityApprovalsFalse !== true) {
  issue("capabilityMatrix", "Capability Matrix must remain all-disabled.");
}

if (fullLaunch.fullLaunchApproved !== false) {
  issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
}

if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
  issue("treasuryFunding", "Treasury funding must remain not approved and not executed.");
}

if (safeTx.safeTransactionPayloadGenerated !== false || safeTx.safeTransactionPrepared !== false) {
  issue("safeTx", "Safe payload must remain not generated and Safe transaction not prepared.");
}

if (monitor.status !== "PASS") {
  issue("monitor.status", `Mainnet monitor must be PASS, got ${monitor.status}.`);
}

if (alerts.responseRequired === true) {
  issue("alerts.responseRequired", "Alerts must not require response.");
}

if (Number(incidents?.summary?.active || 0) !== 0) {
  issue("incidents.summary.active", "Active incidents must be zero.");
}

if (execution.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED") {
  issue("execution.mode", "Mainnet execution queue must remain disabled.");
}

if (issues.length > 0) {
  console.log(JSON.stringify({
    schema: "astra-capability-request-import-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_CAPABILITY_REQUEST_NOT_IMPORTED",
    issues
  }, null, 2));
  process.exit(1);
}

const request = {
  schema: "astra-capability-activation-request-v0.1",
  requestId: values.requestId,
  requestedCapability: values.requestedCapability,
  requesterReference: values.requesterReference,
  authorityReference: values.authorityReference,
  purpose: values.purpose,
  scope: values.scope,
  evidenceReference: values.evidenceReference,
  publicStatusPlan: values.publicStatusPlan,
  onchainImpact: booleans.onchainImpact,
  safeTransactionImpact: booleans.safeTransactionImpact,
  safePayloadGenerationRequested: false,
  executionQueueActivationRequested: false,
  fundsMovementRequested: false,
  requestedAt: values.requestedAt,
  importedAt: new Date().toISOString(),
  importScope: "review-only-no-approval",
  safety: {
    approvesCapability: false,
    approvesFullLaunch: false,
    approvesTreasuryFunding: false,
    generatesSafePayload: false,
    enablesExecutionQueue: false,
    movesFunds: false
  }
};

fs.mkdirSync(requestDir, { recursive: true });
fs.writeFileSync(requestFile, JSON.stringify(request, null, 2) + "\n");

console.log(JSON.stringify({
  schema: "astra-capability-request-import-result-v0.1",
  checkedAt: request.importedAt,
  status: "CAPABILITY_REQUEST_IMPORTED_FOR_REVIEW_NO_APPROVAL",
  requestFile,
  requestedCapability: request.requestedCapability,
  approvesCapability: false,
  fullLaunchApproved: false,
  safePayloadGenerated: false,
  executionQueueEnabled: false
}, null, 2));
