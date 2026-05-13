import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requestRelativePath = "reports/capability-activation-intake/requests/capability-activation-request.json";
const requestPath = path.join(root, requestRelativePath);

const requiredFiles = [
  "configs/capability-activation-intake.config.json",
  "docs/capability-activation-intake/CAPABILITY_ACTIVATION_INTAKE_GATE.md",
  "docs/capability-activation-intake/CAPABILITY_ACTIVATION_REQUEST_TEMPLATE.json",
  "docs/capability-activation-intake/CAPABILITY_ACTIVATION_INTAKE_CHECKLIST.md",
  "docs/capability-activation-intake/CAPABILITY_ACTIVATION_BOUNDARIES.md",
  "docs/capability-activation-intake/CAPABILITY_ACTIVATION_INTAKE_RUNBOOK.md",
  "public-docs/restricted-mode-operator-checklist-status.json",
  "public-docs/restricted-mode-maintenance-schedule-status.json",
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
    issue(file, "Missing required capability activation intake file.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/capability-activation-intake.config.json");
  const operatorChecklist = readJson("public-docs/restricted-mode-operator-checklist-status.json");
  const maintenanceSchedule = readJson("public-docs/restricted-mode-maintenance-schedule-status.json");
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
  const safeTx = readJson("public-docs/treasury-safe-transaction-status.json");
  const monitor = readJson("public-docs/mainnet-monitor-status.json");
  const alerts = readJson("public-docs/mainnet-alerts-status.json");
  const incidents = readJson("public-docs/incident-summary.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.intakeGatePrepared !== true) {
    issue("intakeGatePrepared", "Capability activation intake gate must be prepared.");
  }

  if (operatorChecklist.status !== "RESTRICTED_MODE_OPERATOR_CHECKLIST_READY_DECISION_RECORDED_ALL_DISABLED") {
    issue("operatorChecklist.status", `Expected RESTRICTED_MODE_OPERATOR_CHECKLIST_READY_DECISION_RECORDED_ALL_DISABLED, got ${operatorChecklist.status}`);
  }

  if (maintenanceSchedule.status !== "RESTRICTED_MODE_MAINTENANCE_SCHEDULE_READY_DECISION_RECORDED_ALL_DISABLED") {
    issue("maintenanceSchedule.status", `Expected RESTRICTED_MODE_MAINTENANCE_SCHEDULE_READY_DECISION_RECORDED_ALL_DISABLED, got ${maintenanceSchedule.status}`);
  }

  if (handoff.status !== "RESTRICTED_MODE_OPERATIONS_HANDOFF_READY_DECISION_RECORDED_ALL_DISABLED") {
    issue("handoff.status", `Expected RESTRICTED_MODE_OPERATIONS_HANDOFF_READY_DECISION_RECORDED_ALL_DISABLED, got ${handoff.status}`);
  }

  if (finalRelease.status !== "RESTRICTED_MODE_FINAL_RELEASE_READY_DECISION_RECORDED_ALL_DISABLED") {
    issue("finalRelease.status", `Expected RESTRICTED_MODE_FINAL_RELEASE_READY_DECISION_RECORDED_ALL_DISABLED, got ${finalRelease.status}`);
  }

  if (releaseCandidate.status !== "RESTRICTED_MODE_RELEASE_CANDIDATE_READY_DECISION_RECORDED_ALL_DISABLED") {
    issue("releaseCandidate.status", `Expected RESTRICTED_MODE_RELEASE_CANDIDATE_READY_DECISION_RECORDED_ALL_DISABLED, got ${releaseCandidate.status}`);
  }

  if (evidenceSeal.status !== "RESTRICTED_MODE_EVIDENCE_SEALED_DECISION_RECORDED_ALL_DISABLED") {
    issue("evidenceSeal.status", `Expected RESTRICTED_MODE_EVIDENCE_SEALED_DECISION_RECORDED_ALL_DISABLED, got ${evidenceSeal.status}`);
  }

  if (monitoringBaseline.status !== "RESTRICTED_MODE_MONITORING_BASELINE_ESTABLISHED_DECISION_RECORDED_ALL_DISABLED") {
    issue("monitoringBaseline.status", `Expected RESTRICTED_MODE_MONITORING_BASELINE_ESTABLISHED_DECISION_RECORDED_ALL_DISABLED, got ${monitoringBaseline.status}`);
  }

  if (finalStatus.status !== "RESTRICTED_MODE_FINAL_STATUS_SYNCED_DECISION_RECORDED_ALL_DISABLED") {
    issue("finalStatus.status", `Expected RESTRICTED_MODE_FINAL_STATUS_SYNCED_DECISION_RECORDED_ALL_DISABLED, got ${finalStatus.status}`);
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

  if (publicStatusUpdate.publicStatusUpdateFinalApproved !== true) {
    issue("publicStatusUpdate.publicStatusUpdateFinalApproved", "Public Status Update must be finalized.");
  }

  if (publicStatusUpdate.fullLaunchApproved !== false) {
    issue("publicStatusUpdate.fullLaunchApproved", "Public Status Update must not approve full launch.");
  }

  if (launchControl.additionalGenericPreparationRecommended !== false) {
    issue("launchControl.additionalGenericPreparationRecommended", "Launch Control must keep generic preparation stopped.");
  }

  if (fullLaunch.fullLaunchApproved !== false) {
    issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
  }

  if (treasuryFunding.treasuryFundingApproved !== false) {
    issue("treasuryFunding.treasuryFundingApproved", "Treasury funding must remain not approved.");
  }

  if (treasuryFunding.treasuryFundingExecuted !== false) {
    issue("treasuryFunding.treasuryFundingExecuted", "Treasury funding must remain not executed.");
  }

  if (safeTx.safeTransactionPayloadGenerated !== false) {
    issue("safeTx.safeTransactionPayloadGenerated", "Safe payload must remain not generated.");
  }

  if (safeTx.safeTransactionPrepared !== false) {
    issue("safeTx.safeTransactionPrepared", "Safe transaction must remain not prepared.");
  }

  if (monitor.status !== "PASS") {
    issue("mainnetMonitor.status", `Expected PASS, got ${monitor.status}.`);
  }

  if (alerts.responseRequired === true) {
    issue("alerts.responseRequired", "Alerts must not require response.");
  }

  if (Number(incidents?.summary?.active || 0) !== 0) {
    issue("incidents.summary.active", "Active incidents must be zero.");
  }

  if (execution.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED") {
    issue("mainnetExecution.mode", "Mainnet execution queue must remain disabled.");
  }

  if (fs.existsSync(requestPath)) {
    let request;

    try {
      request = JSON.parse(fs.readFileSync(requestPath, "utf8"));
    } catch (error) {
      issue(requestRelativePath, `Request file is not valid JSON: ${error.message}`);
    }

    if (request) {
      if (request.schema !== "astra-capability-activation-request-v0.1") {
        issue("request.schema", "Invalid capability activation request schema.");
      }

      const requiredStringFields = [
        "requestId",
        "requestedCapability",
        "requesterReference",
        "authorityReference",
        "purpose",
        "scope",
        "evidenceReference",
        "publicStatusPlan",
        "requestedAt"
      ];

      for (const key of requiredStringFields) {
        if (!usableString(request[key])) {
          issue(`request.${key}`, "Required request field is missing, placeholder, or sensitive.");
        }
      }

      if (!Array.isArray(config.allowedCapabilities) || !config.allowedCapabilities.includes(request.requestedCapability)) {
        issue("request.requestedCapability", "Requested capability is not in allowedCapabilities.");
      }

      for (const key of [
        "safePayloadGenerationRequested",
        "executionQueueActivationRequested",
        "fundsMovementRequested"
      ]) {
        if (request[key] !== false) {
          issue(`request.${key}`, "Intake request must not request immediate activation, payload generation, execution, or funds movement.");
        }
      }

      if (!Number.isFinite(Date.parse(request.requestedAt))) {
        issue("request.requestedAt", "requestedAt must be a valid ISO timestamp.");
      }
    }
  }
}

const result = {
  schema: "astra-capability-activation-intake-validation-v0.1",
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
