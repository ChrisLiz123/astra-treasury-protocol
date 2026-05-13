import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "configs", "capability-matrix.config.json");

const requiredFiles = [
  "configs/capability-matrix.config.json",
  "docs/capability-matrix/CAPABILITY_MATRIX.md",
  "docs/capability-matrix/CAPABILITY_ACTIVATION_RULES.md",
  "docs/capability-matrix/CAPABILITY_MATRIX_DECISION_RECORD.md",
  "docs/capability-matrix/CAPABILITY_MATRIX_BLOCKERS.md",
  "public-docs/launch-control-status.json",
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
    issue(file, "Missing required capability matrix file.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/capability-matrix.config.json");
  const launchControl = readJson("public-docs/launch-control-status.json");
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

  if (config.capabilityMatrixFinalized !== true) {
    issue("capabilityMatrixFinalized", "Capability matrix should be finalized.");
  }

  if (config.capabilityMatrixFinalApproved !== true) {
    issue("capabilityMatrixFinalApproved", "Capability matrix final approval should be true for the all-disabled matrix.");
  }

  if (config.finalApprovalScope !== "disabled-state-matrix-only") {
    issue("finalApprovalScope", "Final approval scope must be disabled-state-matrix-only.");
  }

  if (config.doesNotApproveCapabilities !== true) {
    issue("doesNotApproveCapabilities", "Matrix must explicitly not approve capabilities.");
  }

  if (config.allCapabilitiesDisabled !== true) {
    issue("allCapabilitiesDisabled", "All capabilities must be disabled.");
  }

  if (config.allCapabilityApprovalsFalse !== true) {
    issue("allCapabilityApprovalsFalse", "All capability approvals must be false.");
  }

  for (const [key, value] of Object.entries(config.capabilities || {})) {
    if (value.approved !== false) {
      issue(`capabilities.${key}.approved`, "Capability approval must remain false.");
    }

    if (value.enabled !== false) {
      issue(`capabilities.${key}.enabled`, "Capability enabled must remain false.");
    }

    if (value.finalStatus !== "DISABLED_NOT_APPROVED") {
      issue(`capabilities.${key}.finalStatus`, "Capability final status must be DISABLED_NOT_APPROVED.");
    }
  }

  if (launchControl.additionalGenericPreparationRecommended !== false) {
    issue("launchControl.additionalGenericPreparationRecommended", "Generic preparation should remain stopped.");
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
  schema: "astra-capability-matrix-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
