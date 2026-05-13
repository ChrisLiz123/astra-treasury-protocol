import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "configs/restricted-mode-monitoring-baseline.config.json",
  "docs/restricted-mode-monitoring-baseline/RESTRICTED_MODE_MONITORING_BASELINE.md",
  "docs/restricted-mode-monitoring-baseline/RESTRICTED_MODE_MONITORING_BASELINE_CHECKLIST.md",
  "docs/restricted-mode-monitoring-baseline/RESTRICTED_MODE_MONITORING_BASELINE_RUNBOOK.md",
  "public-docs/governance-decision-status.json",
  "public-docs/restricted-mode-final-status.json",
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

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required monitoring baseline file.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/restricted-mode-monitoring-baseline.config.json");
  const governanceDecision = readJson("public-docs/governance-decision-status.json");
  const finalStatus = readJson("public-docs/restricted-mode-final-status.json");
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

  if (config.baselinePrepared !== true) {
    issue("baselinePrepared", "Monitoring baseline config must be prepared.");
  }

  if (governanceDecision.governanceDecisionRecorded !== true) {
    issue("governanceDecision.governanceDecisionRecorded", "Governance decision must be recorded.");
  }

  if (governanceDecision.fullLaunchApproved !== false) {
    issue("governanceDecision.fullLaunchApproved", "Governance decision must not approve full launch.");
  }

  if (finalStatus.status !== "RESTRICTED_MODE_FINAL_STATUS_SYNCED_DECISION_RECORDED_ALL_DISABLED") {
    issue("restrictedModeFinalStatus.status", `Expected RESTRICTED_MODE_FINAL_STATUS_SYNCED_DECISION_RECORDED_ALL_DISABLED, got ${finalStatus.status}`);
  }

  if (capabilityMatrix.allCapabilitiesDisabled !== true) {
    issue("capabilityMatrix.allCapabilitiesDisabled", "All capabilities must remain disabled.");
  }

  if (capabilityMatrix.allCapabilityApprovalsFalse !== true) {
    issue("capabilityMatrix.allCapabilityApprovalsFalse", "All capability approvals must remain false.");
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
}

const result = {
  schema: "astra-restricted-mode-monitoring-baseline-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
