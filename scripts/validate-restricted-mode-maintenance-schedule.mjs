import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "configs/restricted-mode-maintenance-schedule.config.json",
  "docs/restricted-mode-maintenance-schedule/RESTRICTED_MODE_MAINTENANCE_SCHEDULE.md",
  "docs/restricted-mode-maintenance-schedule/DAILY_MAINTENANCE_CHECKLIST.md",
  "docs/restricted-mode-maintenance-schedule/WEEKLY_MAINTENANCE_CHECKLIST.md",
  "docs/restricted-mode-maintenance-schedule/MONTHLY_MAINTENANCE_REVIEW.md",
  "docs/restricted-mode-maintenance-schedule/QUARTERLY_CONTROL_REVIEW.md",
  "docs/restricted-mode-maintenance-schedule/EVENT_DRIVEN_MAINTENANCE.md",
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

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required restricted-mode maintenance schedule file.");
  }
}

if (issues.length === 0) {
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
  const safeTx = readJson("public-docs/treasury-safe-transaction-status.json");
  const monitor = readJson("public-docs/mainnet-monitor-status.json");
  const alerts = readJson("public-docs/mainnet-alerts-status.json");
  const incidents = readJson("public-docs/incident-summary.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.maintenanceSchedulePrepared !== true) {
    issue("maintenanceSchedulePrepared", "Maintenance schedule config must be prepared.");
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
}

const result = {
  schema: "astra-restricted-mode-maintenance-schedule-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
