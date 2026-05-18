import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const preparationRelativePath = "reports/dex-liquidity-safe-execution-preparation/dex-liquidity-safe-execution-preparation.json";

const requiredFiles = [
  "configs/dex-liquidity-safe-execution-preparation.config.json",
  "docs/dex-liquidity-safe-execution-preparation/DEX_LIQUIDITY_SAFE_EXECUTION_PREPARATION.md",
  "docs/dex-liquidity-safe-execution-preparation/DEX_LIQUIDITY_SAFE_EXECUTION_PREPARATION_CHECKLIST.md",
  "docs/dex-liquidity-safe-execution-preparation/DEX_LIQUIDITY_SAFE_EXECUTION_PREPARATION_BOUNDARIES.md",
  "docs/dex-liquidity-safe-execution-preparation/DEX_LIQUIDITY_SAFE_EXECUTION_PREPARATION_RUNBOOK.md",
  "scripts/prepare-dex-liquidity-safe-execution.mjs",
  preparationRelativePath,
  "public-docs/dex-liquidity-safe-execution-approval-status.json",
  "reports/dex-liquidity-safe-execution-approval/dex-liquidity-safe-execution-approval-record.json",
  "public-docs/dex-liquidity-safe-pending-signatures-status.json",
  "reports/dex-liquidity-safe-pending-signatures/dex-liquidity-safe-pending-signatures-monitoring.json",
  "public-docs/dex-liquidity-safe-submission-live-status.json",
  "reports/dex-liquidity-safe-submission-live/dex-liquidity-safe-submission-live-record.json",
  "public-docs/dex-liquidity-safe-payload-verification-status.json",
  "reports/dex-liquidity-safe-payload-verification/dex-liquidity-safe-payload-verification.json",
  "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  "public-docs/dex-pool-creation-post-execution-verification-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/mainnet-execution-status.json"
];

const forbiddenFiles = [
  "reports/dex-liquidity-safe-execution-live/dex-liquidity-safe-execution-live-record.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "public-docs/dex-liquidity-safe-execution-live-status.json",
  "public-docs/dex-liquidity-added-status.json",
  "public-docs/dex-public-trading-live-status.json"
];

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || "").trim());
}

function isTxHash(value) {
  return /^0x[0-9a-fA-F]{64}$/.test(String(value || "").trim());
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required liquidity Safe execution preparation file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden execution/liquidity/public-trading artifact exists. Execution preparation must not execute or add liquidity.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-safe-execution-preparation.config.json");
  const preparation = readJson(preparationRelativePath);
  const executionApprovalStatus = readJson("public-docs/dex-liquidity-safe-execution-approval-status.json");
  const executionApproval = readJson("reports/dex-liquidity-safe-execution-approval/dex-liquidity-safe-execution-approval-record.json");
  const pendingStatus = readJson("public-docs/dex-liquidity-safe-pending-signatures-status.json");
  const pending = readJson("reports/dex-liquidity-safe-pending-signatures/dex-liquidity-safe-pending-signatures-monitoring.json");
  const liveStatus = readJson("public-docs/dex-liquidity-safe-submission-live-status.json");
  const safePayload = readJson("reports/dex-liquidity-provision/payload/liquidity-safe-payload.json");
  const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.preparationOnly !== true) {
    issue("config.preparationOnly", "Config must be preparation-only.");
  }

  if (config.liquiditySafeExecutionPreparationComplete !== true) {
    issue("config.liquiditySafeExecutionPreparationComplete", "Config must show execution preparation complete.");
  }

  if (preparation.status !== "DEX_LIQUIDITY_SAFE_EXECUTION_PREPARED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("preparation.status", `Unexpected preparation status: ${preparation.status}`);
  }

  if (preparation.liquiditySafeExecutionPreparationComplete !== true || preparation.operatorExecutionCommandReviewed !== true) {
    issue("preparation.preparationFlags", "Execution preparation and operator command review must be complete.");
  }

  if (!isAddress(preparation.liquiditySafeAddress) || !isAddress(preparation.safeAddress) || !isTxHash(preparation.safeTxHash)) {
    issue("preparation.identifiers", "Liquidity Safe, Safe address, and Safe tx hash must be valid.");
  }

  if (!Number.isInteger(preparation.safeNonce) || preparation.safeNonce < 0) {
    issue("preparation.safeNonce", "Safe nonce must be valid.");
  }

  if (preparation.safePayloadHash !== safePayload.safePayloadHash) {
    issue("preparation.safePayloadHash", "Preparation Safe payload hash must match payload.");
  }

  if (preparation.safeTxHash !== pending.safeTxHash || Number(preparation.safeNonce) !== Number(pending.safeNonce)) {
    issue("preparation.safeTx", "Preparation Safe tx hash and nonce must match pending monitoring.");
  }

  if (preparation.thresholdReached !== true || Number(preparation.missingConfirmationCount || 0) !== 0) {
    issue("preparation.threshold", "Preparation requires threshold reached and zero missing confirmations.");
  }

  if (preparation.safeTransactionService?.isExecuted !== false || preparation.liquiditySafeTransactionExecuted !== false) {
    issue("preparation.executionFlags", "Safe transaction must remain not executed.");
  }

  if (preparation.liveChecks?.safeCodePresent !== true || preparation.liveChecks?.npmCodePresent !== true) {
    issue("preparation.liveChecks.contractCode", "Safe and NPM code must be present.");
  }

  if (preparation.liveChecks?.poolLiquidityVerifiedZero !== true || String(preparation.liveChecks?.poolLiquidity || "") !== "0") {
    issue("preparation.liveChecks.poolLiquidity", "Pool liquidity must remain zero.");
  }

  if (preparation.liveChecks?.token0?.balanceCoversDesired !== true || preparation.liveChecks?.token0?.allowanceCoversDesired !== true) {
    issue("preparation.liveChecks.token0", "Token0 balance and allowance must cover desired amount.");
  }

  if (preparation.liveChecks?.token1?.balanceCoversDesired !== true || preparation.liveChecks?.token1?.allowanceCoversDesired !== true) {
    issue("preparation.liveChecks.token1", "Token1 balance and allowance must cover desired amount.");
  }

  for (const key of [
    "liquiditySafeTransactionExecuted",
    "liquidityAdded",
    "positionMinted",
    "publicTradingApproved",
    "publicTradingLinkApproved",
    "buyPageActivated",
    "fullLaunchApproved"
  ]) {
    if (preparation[key] !== false) {
      issue(`preparation.${key}`, `${key} must remain false.`);
    }
  }

  if (executionApprovalStatus.status !== "DEX_LIQUIDITY_SAFE_EXECUTION_APPROVED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("executionApprovalStatus.status", "Execution approval must be recorded.");
  }

  if (executionApproval.liquiditySafeExecutionApproved !== true) {
    issue("executionApproval.liquiditySafeExecutionApproved", "Execution approval must be true.");
  }

  if (pendingStatus.status !== "DEX_LIQUIDITY_SAFE_PENDING_SIGNATURES_THRESHOLD_REACHED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("pendingStatus.status", "Pending signatures must show threshold reached.");
  }

  if (pending.thresholdReached !== true || Number(pending.missingConfirmationCount || 0) !== 0) {
    issue("pending.threshold", "Pending signatures must show threshold reached and zero missing confirmations.");
  }

  if (liveStatus.status !== "DEX_LIQUIDITY_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("liveStatus.status", "Submission live must be recorded.");
  }

  if (poolStatus.status !== "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("poolStatus.status", "Pool must remain no-liquidity/no-public-trading.");
  }

  if (poolStatus.summary?.liquidityVerifiedZero !== true || String(poolStatus.summary?.poolLiquidity || "") !== "0") {
    issue("poolStatus.summary.poolLiquidity", "Pool liquidity must remain zero.");
  }

  if (fullLaunch.fullLaunchApproved !== false) {
    issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
  }

  if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
    issue("treasuryFunding", "Global treasury funding must remain not approved/executed.");
  }

  if (capabilityMatrix.allCapabilitiesDisabled !== true || capabilityMatrix.allCapabilityApprovalsFalse !== true) {
    issue("capabilityMatrix", "Capability Matrix must remain all-disabled.");
  }

  if (execution.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED") {
    issue("execution.mode", "Mainnet execution queue must remain disabled.");
  }
}

const result = {
  schema: "astra-dex-liquidity-safe-execution-preparation-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  preparationFile: preparationRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
