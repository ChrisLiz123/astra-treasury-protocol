import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const recordRelativePath = "reports/dex-liquidity-funding-transfer-safe-execution-preparation/dex-liquidity-funding-transfer-safe-execution-preparation.json";

const requiredFiles = [
  "configs/dex-liquidity-funding-transfer-safe-execution-preparation.config.json",
  "docs/dex-liquidity-funding-transfer-safe-execution-preparation/DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_EXECUTION_PREPARATION.md",
  "docs/dex-liquidity-funding-transfer-safe-execution-preparation/DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_EXECUTION_PREPARATION_CHECKLIST.md",
  "docs/dex-liquidity-funding-transfer-safe-execution-preparation/DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_EXECUTION_PREPARATION_BOUNDARIES.md",
  "docs/dex-liquidity-funding-transfer-safe-execution-preparation/DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_EXECUTION_PREPARATION_RUNBOOK.md",
  "scripts/prepare-dex-liquidity-funding-transfer-safe-execution.mjs",
  recordRelativePath,
  "public-docs/dex-liquidity-funding-transfer-safe-execution-approval-status.json",
  "reports/dex-liquidity-funding-transfer-safe-execution-approval/dex-liquidity-funding-transfer-safe-execution-approval-record.json",
  "public-docs/dex-liquidity-funding-transfer-safe-pending-signatures-status.json",
  "reports/dex-liquidity-funding-transfer-safe-pending-signatures/dex-liquidity-funding-transfer-safe-pending-signatures-monitoring.json",
  "public-docs/dex-liquidity-funding-transfer-safe-submission-live-status.json",
  "reports/dex-liquidity-funding-transfer-safe-submission-live/dex-liquidity-funding-transfer-safe-submission-live-record.json",
  "reports/dex-liquidity-treasury-funding/payload/funding-transfer-safe-payload.json",
  "public-docs/dex-pool-creation-post-execution-verification-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/mainnet-execution-status.json"
];

const forbiddenFiles = [
  "reports/dex-liquidity-treasury-funding/live/funds-moved.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  "reports/dex-liquidity-provision/payload/token-approval-safe-payload.json",
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
    issue(file, "Missing required Safe execution preparation file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden funds-moved/liquidity/public-trading artifact exists. Execution preparation must not execute, move funds, or add liquidity.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-funding-transfer-safe-execution-preparation.config.json");
  const record = readJson(recordRelativePath);
  const approvalStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-execution-approval-status.json");
  const pendingStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-pending-signatures-status.json");
  const liveStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-submission-live-status.json");
  const payload = readJson("reports/dex-liquidity-treasury-funding/payload/funding-transfer-safe-payload.json");
  const postExecution = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.preparationOnly !== true) {
    issue("config.preparationOnly", "Execution preparation config must be preparation-only.");
  }

  if (config.safeExecutionPreparationComplete !== true) {
    issue("config.safeExecutionPreparationComplete", "Config must show execution preparation complete.");
  }

  if (record.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_EXECUTION_PREPARED_NOT_EXECUTED_NO_FUNDS_MOVED") {
    issue("record.status", `Unexpected execution preparation status: ${record.status}`);
  }

  if (record.safeExecutionPreparationComplete !== true || record.operatorExecutionCommandReviewed !== true) {
    issue("record.preparationFlags", "Preparation and operator command review must be complete.");
  }

  if (!isAddress(record.sourceSafeAddress) || !isAddress(record.destinationSafeAddress)) {
    issue("record.safeAddresses", "Source/destination Safe addresses must be valid.");
  }

  if (!isTxHash(record.safeTxHash)) {
    issue("record.safeTxHash", "Safe tx hash must be valid.");
  }

  if (!Number.isInteger(record.safeNonce) || record.safeNonce < 0) {
    issue("record.safeNonce", "Safe nonce must be valid.");
  }

  if (!record.payloadHash || record.payloadHash !== payload.payloadHash) {
    issue("record.payloadHash", "Preparation payload hash must match payload.");
  }

  if (record.serviceThresholdReached !== true || record.serviceExecutionConfirmedFalse !== true) {
    issue("record.safeTransactionService", "Safe Transaction Service must show threshold reached and not executed.");
  }

  for (const check of record.executionReadinessChecks || []) {
    if (check.sourceBalanceCoversTransfer !== true) {
      issue(`record.executionReadinessChecks.${check.id}.sourceBalanceCoversTransfer`, "Source balance must cover transfer.");
    }

    if (check.destinationBalanceUnchanged !== true) {
      issue(`record.executionReadinessChecks.${check.id}.destinationBalanceUnchanged`, "Destination balance must remain unchanged before execution.");
    }

    if (check.fundingTransferExecuted !== false) {
      issue(`record.executionReadinessChecks.${check.id}.fundingTransferExecuted`, "Funding transfer must remain not executed.");
    }
  }

  for (const key of [
    "safeTransactionExecuted",
    "fundingTransferExecuted",
    "treasuryFundsMoved",
    "globalTreasuryFundingApproved",
    "globalTreasuryFundingExecuted",
    "tokenApprovalPayloadGenerated",
    "tokenApprovalExecuted",
    "liquidityMintCalldataGenerated",
    "liquiditySafePayloadGenerated",
    "liquiditySafeTransactionSubmitted",
    "liquiditySafeTransactionExecuted",
    "liquidityAdded",
    "positionMinted",
    "publicTradingApproved",
    "publicTradingLinkApproved",
    "buyPageActivated",
    "fullLaunchApproved"
  ]) {
    if (record.flags?.[key] !== false) {
      issue(`record.flags.${key}`, `${key} must remain false.`);
    }
  }

  if (approvalStatus.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_EXECUTION_APPROVED_NOT_EXECUTED_NO_FUNDS_MOVED") {
    issue("approvalStatus.status", "Execution approval must be recorded.");
  }

  if (pendingStatus.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_PENDING_SIGNATURES_THRESHOLD_REACHED_NOT_EXECUTED_NO_FUNDS_MOVED") {
    issue("pendingStatus.status", "Pending signatures must show threshold reached and not executed.");
  }

  if (liveStatus.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED_NO_FUNDS_MOVED") {
    issue("liveStatus.status", "Live submission record must be present.");
  }

  if (postExecution.status !== "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("postExecution.status", "Post-execution pool verification must be complete.");
  }

  if (postExecution.summary?.liquidityVerifiedZero !== true || String(postExecution.summary?.poolLiquidity || "") !== "0") {
    issue("postExecution.summary.poolLiquidity", "Pool liquidity must remain zero.");
  }

  if (fullLaunch.fullLaunchApproved !== false) {
    issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
  }

  if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
    issue("treasuryFunding", "Global treasury funding must remain not approved and not executed.");
  }

  if (capabilityMatrix.allCapabilitiesDisabled !== true || capabilityMatrix.allCapabilityApprovalsFalse !== true) {
    issue("capabilityMatrix", "Capability Matrix must remain all-disabled.");
  }

  if (execution.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED") {
    issue("execution.mode", "Mainnet execution queue must remain disabled.");
  }
}

const result = {
  schema: "astra-dex-liquidity-funding-transfer-safe-execution-preparation-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  recordFile: recordRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
