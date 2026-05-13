import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requestRelativePath = "reports/capability-activation-intake/requests/capability-activation-request.json";
const requestPath = path.join(root, requestRelativePath);

const requiredFiles = [
  "configs/capability-request-review.config.json",
  "configs/capability-request-import.config.json",
  "configs/capability-activation-intake.config.json",
  "docs/capability-request-review/CAPABILITY_REQUEST_REVIEW_GATE.md",
  "docs/capability-request-review/CAPABILITY_REQUEST_REVIEW_CHECKLIST.md",
  "docs/capability-request-review/CAPABILITY_REQUEST_REVIEW_BOUNDARIES.md",
  "docs/capability-request-review/CAPABILITY_REQUEST_REVIEW_RUNBOOK.md",
  "public-docs/capability-request-import-status.json",
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

function usableString(value) {
  return typeof value === "string" && !isPlaceholder(value) && !looksSensitive(value);
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required capability request review file.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/capability-request-review.config.json");
  const requestImport = readJson("public-docs/capability-request-import-status.json");
  const intake = readJson("public-docs/capability-activation-intake-status.json");
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

  if (config.requestReviewGatePrepared !== true) {
    issue("requestReviewGatePrepared", "Capability request review gate must be prepared.");
  }

  if (![
    "CAPABILITY_REQUEST_IMPORT_TEMPLATE_READY_NO_ACTIVE_REQUEST",
    "CAPABILITY_REQUEST_IMPORTED_FOR_REVIEW_NO_APPROVAL"
  ].includes(requestImport.status)) {
    issue("requestImport.status", `Unexpected capability request import status: ${requestImport.status}`);
  }

  if (![
    "CAPABILITY_ACTIVATION_INTAKE_GATE_READY_NO_ACTIVE_REQUEST",
    "CAPABILITY_ACTIVATION_INTAKE_REQUEST_IMPORTED_PENDING_REVIEW"
  ].includes(intake.status)) {
    issue("intake.status", `Unexpected capability intake status: ${intake.status}`);
  }

  if (operatorChecklist.status !== "RESTRICTED_MODE_OPERATOR_CHECKLIST_READY_DECISION_RECORDED_ALL_DISABLED") {
    issue("operatorChecklist.status", "Operator checklist must be ready.");
  }

  if (maintenanceSchedule.status !== "RESTRICTED_MODE_MAINTENANCE_SCHEDULE_READY_DECISION_RECORDED_ALL_DISABLED") {
    issue("maintenanceSchedule.status", "Maintenance schedule must be ready.");
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
    issue("capabilityMatrix", "Capability Matrix must remain all-disabled and all approvals false.");
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
    issue("monitor.status", `Expected PASS, got ${monitor.status}.`);
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

  if (fs.existsSync(requestPath)) {
    const request = JSON.parse(fs.readFileSync(requestPath, "utf8"));

    if (request.schema !== "astra-capability-activation-request-v0.1") {
      issue("request.schema", "Invalid request schema.");
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
        issue(`request.${key}`, "Request field is missing, placeholder, or sensitive.");
      }
    }

    if (!Array.isArray(config.allowedCapabilities) || !config.allowedCapabilities.includes(request.requestedCapability)) {
      issue("request.requestedCapability", "Requested capability is not allowed.");
    }

    for (const key of [
      "safePayloadGenerationRequested",
      "executionQueueActivationRequested",
      "fundsMovementRequested"
    ]) {
      if (request[key] !== false) {
        issue(`request.${key}`, "Review gate must not allow immediate activation, payload generation, execution, or funds movement.");
      }
    }
  }
}

const result = {
  schema: "astra-capability-request-review-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  requestFile: requestRelativePath,
  requestFilePresent: fs.existsSync(requestPath),
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
