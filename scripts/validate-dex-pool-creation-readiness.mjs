import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "configs/dex-pool-creation-readiness.config.json",
  "docs/dex-pool-creation-readiness/DEX_POOL_CREATION_READINESS.md",
  "docs/dex-pool-creation-readiness/DEX_POOL_CREATION_READINESS_CHECKLIST.md",
  "docs/dex-pool-creation-readiness/DEX_POOL_CREATION_BOUNDARIES.md",
  "docs/dex-pool-creation-readiness/DEX_POOL_CREATION_READINESS_RUNBOOK.md",
  "public-docs/dex-liquidity-source-safe-impact-status.json",
  "public-docs/dex-liquidity-parameter-approval-status.json",
  "public-docs/dex-liquidity-parameter-selection-status.json",
  "public-docs/dex-liquidity-parameter-finalization-status.json",
  "public-docs/dex-liquidity-parameters-status.json",
  "public-docs/dex-liquidity-path-status.json",
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

const forbiddenFiles = [
  "reports/dex-pool-creation/live/dex-pool-created.json",
  "reports/dex-pool-creation/live/pool-created.json",
  "reports/dex-pool-creation/payload/safe-payload.json",
  "reports/dex-pool-creation/payload/transaction.json",
  "public-docs/dex-pool-created-status.json"
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
    issue(file, "Missing required DEX pool creation readiness file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden pool-creation/payload artifact exists. Readiness gate must not create a pool or payload.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-pool-creation-readiness.config.json");
  const sourceSafeImpact = readJson("public-docs/dex-liquidity-source-safe-impact-status.json");
  const parameterApproval = readJson("public-docs/dex-liquidity-parameter-approval-status.json");
  const parameterSelection = readJson("public-docs/dex-liquidity-parameter-selection-status.json");
  const finalizationReview = readJson("public-docs/dex-liquidity-parameter-finalization-status.json");
  const parameterReview = readJson("public-docs/dex-liquidity-parameters-status.json");
  const dexPath = readJson("public-docs/dex-liquidity-path-status.json");
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

  if (config.network?.chainId !== 8453) {
    issue("network.chainId", "Expected Base Mainnet chain ID 8453.");
  }

  if (config.poolCreationReadinessPrepared !== true) {
    issue("poolCreationReadinessPrepared", "Pool creation readiness framework must be prepared.");
  }

  if (config.poolCreationReadinessOnly !== true) {
    issue("poolCreationReadinessOnly", "This gate must remain readiness-only.");
  }

  for (const key of [
    "poolCreationApproved",
    "poolCreated",
    "liquidityProvisionApproved",
    "liquidityAdded",
    "publicTradingApproved",
    "publicTradingLinkApproved",
    "buyPageActivationApproved",
    "safePayloadGenerationApproved",
    "safePayloadGenerated",
    "safeTransactionExecutionApproved",
    "safeTransactionExecuted",
    "treasuryFundingApproved",
    "treasuryFundsMoved",
    "fullLaunchApproved"
  ]) {
    if (config[key] !== false) {
      issue(key, `${key} must remain false.`);
    }
  }

  for (const [key, value] of Object.entries(config.requiredBeforePoolCreationApproval || {})) {
    if (value !== false) {
      issue(`requiredBeforePoolCreationApproval.${key}`, "Pool-creation approval prerequisite must remain false until separately completed.");
    }
  }

  for (const [key, value] of Object.entries(config.hardStops || {})) {
    if (value !== false) {
      issue(`hardStops.${key}`, "Hard stop must remain false.");
    }
  }

  if (sourceSafeImpact.status !== "DEX_LIQUIDITY_SOURCE_SAFE_IMPACT_APPROVED_NO_FUNDS_NO_SAFE_PAYLOAD") {
    issue("sourceSafeImpact.status", "DEX liquidity source/Safe-impact approval must be recorded.");
  }

  if (parameterApproval.status !== "DEX_LIQUIDITY_PARAMETERS_APPROVED_NO_POOL_NO_LIQUIDITY") {
    issue("parameterApproval.status", "DEX liquidity parameters must be approved.");
  }

  if (parameterSelection.status !== "DEX_LIQUIDITY_PARAMETER_SELECTION_IMPORTED_NOT_APPROVED" || parameterSelection.summary?.selectionValid !== true) {
    issue("parameterSelection.status", "Valid imported parameter selection is required.");
  }

  if (![
    "DEX_LIQUIDITY_PARAMETER_FINALIZATION_REVIEW_READY_NOT_APPROVED",
    "DEX_LIQUIDITY_PARAMETER_FINALIZATION_REVIEW_PARAMETERS_APPROVED_NO_POOL"
  ].includes(finalizationReview.status)) {
    issue("finalizationReview.status", `Unexpected finalization review status: ${finalizationReview.status}`);
  }

  if (parameterReview.status !== "DEX_LIQUIDITY_PARAMETER_REVIEW_READY_NOT_FINALIZED") {
    issue("parameterReview.status", "DEX liquidity parameter review must remain ready and not finalized.");
  }

  if (dexPath.status !== "DEX_LIQUIDITY_PATH_SELECTED_NOT_APPROVED") {
    issue("dexPath.status", "DEX liquidity path must remain selected but not approved.");
  }

  if (finalRelease.status !== "RESTRICTED_MODE_FINAL_RELEASE_READY_DECISION_RECORDED_ALL_DISABLED") {
    issue("finalRelease.status", "Restricted-mode final release must be ready.");
  }

  if (governanceDecision.governanceDecisionRecorded !== true || governanceDecision.fullLaunchApproved !== false) {
    issue("governanceDecision", "Governance decision must be recorded and must not approve full launch.");
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
  schema: "astra-dex-pool-creation-readiness-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
