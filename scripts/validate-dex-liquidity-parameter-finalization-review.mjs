import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "configs/dex-liquidity-parameter-finalization-review.config.json",
  "docs/dex-liquidity-parameter-finalization/DEX_LIQUIDITY_PARAMETER_FINALIZATION_REVIEW.md",
  "docs/dex-liquidity-parameter-finalization/DEX_PARAMETER_FINALIZATION_REVIEW_CHECKLIST.md",
  "docs/dex-liquidity-parameter-finalization/DEX_PARAMETER_FINALIZATION_BOUNDARIES.md",
  "docs/dex-liquidity-parameter-finalization/DEX_PARAMETER_FINALIZATION_RUNBOOK.md",
  "public-docs/dex-liquidity-parameter-selection-status.json",
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

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required DEX parameter finalization review file.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-parameter-finalization-review.config.json");
  const selection = readJson("public-docs/dex-liquidity-parameter-selection-status.json");
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

  if (config.finalizationReviewPrepared !== true) {
    issue("finalizationReviewPrepared", "Finalization review must be prepared.");
  }

  if (config.finalizationReviewOnly !== true) {
    issue("finalizationReviewOnly", "Finalization review must remain review-only.");
  }

  const mustRemainFalse = [
    "parameterSelectionApproved",
    "parametersFinalized",
    "dexLiquidityPathApproved",
    "liquidityPoolCreationApproved",
    "liquidityProvisionApproved",
    "publicTradingApproved",
    "publicTradingLinkApproved",
    "buyPageActivationApproved",
    "safePayloadGenerationApproved",
    "safeTransactionExecutionApproved",
    "treasuryFundingApproved",
    "fullLaunchApproved"
  ];

  for (const key of mustRemainFalse) {
    if (config[key] !== false) {
      issue(key, `${key} must remain false.`);
    }
  }

  for (const [key, value] of Object.entries(config.requiredBeforeParameterApproval || {})) {
    if (value !== false) {
      issue(`requiredBeforeParameterApproval.${key}`, "Approval prerequisite must remain false until completed.");
    }
  }

  for (const [key, value] of Object.entries(config.hardStops || {})) {
    if (value !== false) {
      issue(`hardStops.${key}`, "Hard stop must remain false.");
    }
  }

  if (![
    "DEX_LIQUIDITY_PARAMETER_SELECTION_IMPORT_READY_NO_SELECTION",
    "DEX_LIQUIDITY_PARAMETER_SELECTION_IMPORTED_NOT_APPROVED"
  ].includes(selection.status)) {
    issue("selection.status", `Unexpected DEX parameter selection status: ${selection.status}`);
  }

  if (selection.status === "DEX_LIQUIDITY_PARAMETER_SELECTION_IMPORTED_NOT_APPROVED") {
    if (selection.summary?.selectionValid !== true) {
      issue("selection.summary.selectionValid", "Imported parameter selection must be valid.");
    }
  }

  if (parameterReview.status !== "DEX_LIQUIDITY_PARAMETER_REVIEW_READY_NOT_FINALIZED") {
    issue("parameterReview.status", `Expected DEX_LIQUIDITY_PARAMETER_REVIEW_READY_NOT_FINALIZED, got ${parameterReview.status}`);
  }

  if (dexPath.status !== "DEX_LIQUIDITY_PATH_SELECTED_NOT_APPROVED") {
    issue("dexPath.status", `Expected DEX_LIQUIDITY_PATH_SELECTED_NOT_APPROVED, got ${dexPath.status}`);
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
  schema: "astra-dex-liquidity-parameter-finalization-review-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
