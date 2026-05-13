import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "configs/dex-liquidity-path-selection.config.json",
  "docs/dex-liquidity-path/DEX_LIQUIDITY_PATH_SELECTION.md",
  "docs/dex-liquidity-path/DEX_LIQUIDITY_PATH_BOUNDARIES.md",
  "docs/dex-liquidity-path/DEX_LIQUIDITY_PARAMETER_CHECKLIST.md",
  "docs/dex-liquidity-path/DEX_LIQUIDITY_RISK_NOTES.md",
  "public-docs/capability-request-review-status.json",
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

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required DEX/liquidity path selection file.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-path-selection.config.json");
  const requestReview = readJson("public-docs/capability-request-review-status.json");
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

  if (config.network?.chainId !== 8453) {
    issue("network.chainId", "Expected Base Mainnet chain ID 8453.");
  }

  if (config.selectedPublicPurchasePath?.id !== "dex-liquidity-pool-trading") {
    issue("selectedPublicPurchasePath.id", "Selected path must be dex-liquidity-pool-trading.");
  }

  if (config.pathSelectionRecorded !== true) {
    issue("pathSelectionRecorded", "DEX/liquidity path selection should be recorded.");
  }

  const mustRemainFalse = [
    "dexPathApproved",
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

  for (const [key, value] of Object.entries(config.capabilityBoundaries || {})) {
    if (value !== false) {
      issue(`capabilityBoundaries.${key}`, "Capability boundary must remain false.");
    }
  }

  for (const [key, value] of Object.entries(config.pendingDecisions || {})) {
    if (value !== false) {
      issue(`pendingDecisions.${key}`, "Pending DEX/liquidity decision must remain false until separately finalized.");
    }
  }

  if (![
    "CAPABILITY_REQUEST_REVIEW_GATE_READY_NO_ACTIVE_REQUEST",
    "CAPABILITY_REQUEST_REVIEW_READY_TO_OPEN_ACTION_PATH_NO_APPROVAL"
  ].includes(requestReview.status)) {
    issue("requestReview.status", `Unexpected capability request review status: ${requestReview.status}`);
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
  schema: "astra-dex-liquidity-path-selection-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
