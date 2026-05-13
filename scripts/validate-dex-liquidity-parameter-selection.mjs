import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const selectionRelativePath = "reports/dex-liquidity-parameter-selection/import/dex-liquidity-parameter-selection.json";
const selectionPath = path.join(root, selectionRelativePath);

const requiredFiles = [
  "configs/dex-liquidity-parameter-selection-import.config.json",
  "docs/dex-liquidity-parameter-selection/DEX_LIQUIDITY_PARAMETER_SELECTION_IMPORT.md",
  "docs/dex-liquidity-parameter-selection/DEX_PARAMETER_SELECTION_FIELDS.md",
  "docs/dex-liquidity-parameter-selection/DEX_PARAMETER_SELECTION_IMPORT_RUNBOOK.md",
  "docs/dex-liquidity-parameter-selection/DEX_PARAMETER_SELECTION_BOUNDARIES.md",
  "docs/dex-liquidity-parameter-selection/DEX_PARAMETER_SELECTION_TEMPLATE.json",
  "scripts/import-dex-liquidity-parameter-selection.mjs",
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

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || "").trim());
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required DEX liquidity parameter selection file.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-parameter-selection-import.config.json");
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

  if (config.selectionImportPrepared !== true) {
    issue("selectionImportPrepared", "Selection import must be prepared.");
  }

  if (config.selectionImportOnly !== true) {
    issue("selectionImportOnly", "Selection import must remain import-only.");
  }

  for (const key of [
    "parametersSelected",
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
  ]) {
    if (config[key] !== false) {
      issue(key, `${key} must remain false in config.`);
    }
  }

  for (const [key, value] of Object.entries(config.hardStops || {})) {
    if (value !== false) {
      issue(`hardStops.${key}`, "Hard stop must remain false.");
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

  if (fs.existsSync(selectionPath)) {
    const selection = JSON.parse(fs.readFileSync(selectionPath, "utf8"));

    if (selection.schema !== "astra-dex-liquidity-parameter-selection-v0.1") {
      issue("selection.schema", "Invalid DEX parameter selection schema.");
    }

    for (const key of config.requiredSelectionFields || []) {
      if (!usableString(selection[key])) {
        issue(`selection.${key}`, "Required selection field is missing, placeholder, or sensitive.");
      }
    }

    if (!Array.isArray(config.allowedPairs) || !config.allowedPairs.includes(selection.tokenPair)) {
      issue("selection.tokenPair", "Selected pair is not allowed.");
    }

    if (!Array.isArray(config.allowedPoolVersions) || !config.allowedPoolVersions.includes(selection.poolVersion)) {
      issue("selection.poolVersion", "Selected pool version is not allowed.");
    }

    if (!isAddress(selection.astraTokenAddress)) {
      issue("selection.astraTokenAddress", "ASTRA token address must be a 0x address with 40 hex characters.");
    }

    if (!isAddress(selection.counterAssetAddress)) {
      issue("selection.counterAssetAddress", "Counter asset address must be a 0x address with 40 hex characters.");
    }

    for (const key of [
      "approvesPoolCreation",
      "approvesLiquidityProvision",
      "approvesPublicTrading",
      "generatesSafePayload",
      "movesFunds",
      "activatesBuyPage"
    ]) {
      if (selection[key] !== false) {
        issue(`selection.${key}`, "Selection import must not approve activation, liquidity, trading, Safe payload, funds movement, or buy page.");
      }
    }

    if (!Number.isFinite(Date.parse(selection.selectedAt))) {
      issue("selection.selectedAt", "selectedAt must be a valid ISO timestamp.");
    }
  }
}

const result = {
  schema: "astra-dex-liquidity-parameter-selection-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  selectionFile: selectionRelativePath,
  selectionFilePresent: fs.existsSync(selectionPath),
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
