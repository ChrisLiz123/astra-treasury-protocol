import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "configs", "public-status-update-finalization.config.json");

const requiredFiles = [
  "configs/public-status-update-finalization.config.json",
  "docs/public-status-update/PUBLIC_STATUS_UPDATE_FINALIZATION.md",
  "docs/public-status-update/FINAL_PUBLIC_STATUS_UPDATE.md",
  "docs/public-status-update/PUBLIC_STATUS_UPDATE_DECISION_RECORD.md",
  "docs/public-status-update/PUBLIC_STATUS_UPDATE_BLOCKERS.md",
  "public-docs/launch-control-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/governance-decision-status.json",
  "public-docs/stabilization-status.json",
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
    issue(file, "Missing required public status update file.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/public-status-update-finalization.config.json");
  const launchControl = readJson("public-docs/launch-control-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const governanceDecision = readJson("public-docs/governance-decision-status.json");
  const stabilization = readJson("public-docs/stabilization-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const safeTx = readJson("public-docs/treasury-safe-transaction-status.json");
  const monitor = readJson("public-docs/mainnet-monitor-status.json");
  const alerts = readJson("public-docs/mainnet-alerts-status.json");
  const incidents = readJson("public-docs/incident-summary.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.network?.chainId !== 8453) {
    issue("network.chainId", "Expected Base Mainnet chain ID 8453.");
  }

  if (config.publicStatusUpdateFinalized !== true) {
    issue("publicStatusUpdateFinalized", "Public status update should be finalized.");
  }

  if (config.publicStatusUpdateFinalApproved !== true) {
    issue("publicStatusUpdateFinalApproved", "Public status update should be final-approved for restricted-mode status.");
  }

  const allowedFinalApprovalScopes = new Set([
    "restricted-mode-no-capability-approval",
    "restricted-mode-decision-recorded-no-capability-approval"
  ]);

  if (!allowedFinalApprovalScopes.has(config.finalApprovalScope)) {
    issue("finalApprovalScope", "Final approval scope must be restricted-mode-no-capability-approval or restricted-mode-decision-recorded-no-capability-approval.");
  }

  if (config.doesNotApproveCapabilities !== true) {
    issue("doesNotApproveCapabilities", "Public status update must explicitly not approve capabilities.");
  }

  if (config.governanceDecisionRecorded !== true) {
    issue("governanceDecisionRecorded", "Governance decision should be recorded for final restricted-mode sync.");
  }

  if (governanceDecision.governanceDecisionRecorded !== true) {
    issue("governanceDecision.governanceDecisionRecorded", "Governance decision public status must show recorded.");
  }

  if (config.fullLaunchApproved !== false) {
    issue("fullLaunchApproved", "Full launch must remain not approved.");
  }

  for (const [key, value] of Object.entries(config.capabilityApprovals || {})) {
    if (value !== false) {
      issue(`capabilityApprovals.${key}`, "Capability approval must remain false.");
    }
  }

  if (launchControl.additionalGenericPreparationRecommended !== false) {
    issue("launchControl.additionalGenericPreparationRecommended", "Generic preparation should remain stopped.");
  }

  if (capabilityMatrix.capabilityMatrixFinalized !== true) {
    issue("capabilityMatrix.capabilityMatrixFinalized", "Capability matrix must be finalized.");
  }

  if (capabilityMatrix.allCapabilitiesDisabled !== true) {
    issue("capabilityMatrix.allCapabilitiesDisabled", "Capability matrix must keep all capabilities disabled.");
  }

  if (capabilityMatrix.allCapabilityApprovalsFalse !== true) {
    issue("capabilityMatrix.allCapabilityApprovalsFalse", "Capability matrix must keep all approvals false.");
  }

  if (stabilization.status !== "RESTRICTED_LAUNCH_STABILIZED") {
    issue("stabilization.status", `Expected RESTRICTED_LAUNCH_STABILIZED, got ${stabilization.status}`);
  }

  if (monitor.status !== "PASS") {
    issue("mainnetMonitor.status", `Expected PASS, got ${monitor.status}`);
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

  if (fullLaunch.fullLaunchApproved !== false) {
    issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
  }

  if (treasuryFunding.treasuryFundingApproved !== false) {
    issue("treasuryFundingApproved", "Treasury funding must remain not approved.");
  }

  if (treasuryFunding.treasuryFundingExecuted !== false) {
    issue("treasuryFundingExecuted", "Treasury funding must remain not executed.");
  }

  if (safeTx.safeTransactionPayloadGenerated !== false) {
    issue("safeTransactionPayloadGenerated", "Safe payload must remain not generated.");
  }

  if (safeTx.safeTransactionPrepared !== false) {
    issue("safeTransactionPrepared", "Safe transaction must remain not prepared.");
  }
}

const result = {
  schema: "astra-public-status-update-finalization-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
