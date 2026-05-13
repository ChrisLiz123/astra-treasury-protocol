import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const recordPath = path.join(root, "reports", "full-launch-governance-decision", "live", "governance-decision-record.json");

const requiredFiles = [
  "configs/governance-decision-live-recording.config.json",
  "docs/action-approvals/governance-decision-live-recording/GOVERNANCE_DECISION_RECORDING_LIVE_PACKAGE.md",
  "docs/action-approvals/governance-decision-live-recording/GOVERNANCE_DECISION_RECORDING_LIVE_RUNBOOK.md",
  "docs/action-approvals/governance-decision-live-recording/GOVERNANCE_DECISION_RECORDING_LIVE_BLOCKERS.md",
  "public-docs/governance-decision-live-precheck-status.json",
  "public-docs/governance-decision-approval-status.json",
  "public-docs/signed-governance-resolution-evidence-status.json",
  "public-docs/launch-control-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/public-status-update-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/treasury-safe-transaction-status.json",
  "public-docs/mainnet-monitor-status.json",
  "public-docs/mainnet-alerts-status.json",
  "public-docs/incident-summary.json",
  "public-docs/mainnet-execution-status.json",
  "reports/full-launch-governance-decision/live/governance-decision-record.json"
];

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required governance decision live recording file.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/governance-decision-live-recording.config.json");
  const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));
  const launchControl = readJson("public-docs/launch-control-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const publicStatusUpdate = readJson("public-docs/public-status-update-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const safeTx = readJson("public-docs/treasury-safe-transaction-status.json");
  const monitor = readJson("public-docs/mainnet-monitor-status.json");
  const alerts = readJson("public-docs/mainnet-alerts-status.json");
  const incidents = readJson("public-docs/incident-summary.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (record.schema !== "astra-governance-decision-record-v0.1") {
    issue("record.schema", "Invalid governance decision record schema.");
  }

  if (record.status !== "GOVERNANCE_DECISION_RECORDED_RESTRICTED_MODE_ALL_DISABLED") {
    issue("record.status", "Unexpected governance decision record status.");
  }

  if (record.governanceDecisionRecorded !== true) {
    issue("record.governanceDecisionRecorded", "Governance decision record must set governanceDecisionRecorded true.");
  }

  if (record.fullLaunchApproved !== false) {
    issue("record.fullLaunchApproved", "Governance decision must not approve full launch.");
  }

  if (!Array.isArray(record.approvedCapabilities) || record.approvedCapabilities.length !== 0) {
    issue("record.approvedCapabilities", "Governance decision must not approve capabilities.");
  }

  for (const key of [
    "treasuryFundingApproved",
    "treasuryFundingTransactionAuthorized",
    "treasuryFundingExecuted",
    "safeTransactionPayloadGenerated",
    "safeTransactionPrepared",
    "safeTransactionSubmitted",
    "safeTransactionSigned",
    "safeTransactionExecuted",
    "mainnetExecutionQueueEnabled"
  ]) {
    if (record[key] !== false) {
      issue(`record.${key}`, "Restricted state must remain false.");
    }
  }

  if (config.governanceDecisionRecorded !== true) {
    issue("config.governanceDecisionRecorded", "Config should reflect recorded governance decision.");
  }

  if (config.fullLaunchApproved !== false) {
    issue("config.fullLaunchApproved", "Config must keep full launch not approved.");
  }

  if (launchControl.additionalGenericPreparationRecommended !== false) {
    issue("launchControl.additionalGenericPreparationRecommended", "Generic preparation should remain stopped.");
  }

  if (capabilityMatrix.allCapabilitiesDisabled !== true || capabilityMatrix.allCapabilityApprovalsFalse !== true) {
    issue("capabilityMatrix", "Capability Matrix must remain all-disabled.");
  }

  if (publicStatusUpdate.publicStatusUpdateFinalApproved !== true) {
    issue("publicStatusUpdate.publicStatusUpdateFinalApproved", "Public status update must be finalized.");
  }

  if (fullLaunch.fullLaunchApproved !== false) {
    issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
  }

  if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
    issue("treasuryFunding", "Treasury funding must remain not approved and not executed.");
  }

  if (safeTx.safeTransactionPayloadGenerated !== false || safeTx.safeTransactionPrepared !== false) {
    issue("safeTx", "Safe payload and Safe transaction must remain not prepared.");
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
}

const result = {
  schema: "astra-governance-decision-live-recording-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  recordFile: "reports/full-launch-governance-decision/live/governance-decision-record.json",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
