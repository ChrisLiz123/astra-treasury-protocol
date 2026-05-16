import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const recordRelativePath = "reports/dex-liquidity-token-approval-safe-execution-preparation/dex-liquidity-token-approval-safe-execution-preparation.json";

const requiredFiles = [
  "configs/dex-liquidity-token-approval-safe-execution-preparation.config.json",
  "docs/dex-liquidity-token-approval-safe-execution-preparation/DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_PREPARATION.md",
  "docs/dex-liquidity-token-approval-safe-execution-preparation/DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_PREPARATION_CHECKLIST.md",
  "docs/dex-liquidity-token-approval-safe-execution-preparation/DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_PREPARATION_BOUNDARIES.md",
  "docs/dex-liquidity-token-approval-safe-execution-preparation/DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_PREPARATION_RUNBOOK.md",
  "scripts/prepare-dex-liquidity-token-approval-safe-execution.mjs",
  recordRelativePath,
  "public-docs/dex-liquidity-token-approval-safe-execution-approval-status.json",
  "reports/dex-liquidity-token-approval-safe-execution-approval/dex-liquidity-token-approval-safe-execution-approval-record.json",
  "public-docs/dex-liquidity-token-approval-safe-pending-signatures-status.json",
  "reports/dex-liquidity-token-approval-safe-pending-signatures/dex-liquidity-token-approval-safe-pending-signatures-monitoring.json",
  "public-docs/dex-liquidity-token-approval-safe-submission-live-status.json",
  "reports/dex-liquidity-token-approval-safe-submission-live/dex-liquidity-token-approval-safe-submission-live-record.json",
  "reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json",
  "public-docs/dex-liquidity-token-approval-safe-payload-verification-status.json",
  "public-docs/dex-pool-creation-post-execution-verification-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/mainnet-execution-status.json"
];

const forbiddenFiles = [
  "reports/dex-liquidity-token-approval/live/token-approval-executed.json",
  "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
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
    issue(file, "Missing required token approval Safe execution preparation file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden token-approval-executed/liquidity/public-trading artifact exists. Execution preparation must not execute approvals or add liquidity.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-token-approval-safe-execution-preparation.config.json");
  const record = readJson(recordRelativePath);
  const approvalStatus = readJson("public-docs/dex-liquidity-token-approval-safe-execution-approval-status.json");
  const pendingStatus = readJson("public-docs/dex-liquidity-token-approval-safe-pending-signatures-status.json");
  const liveStatus = readJson("public-docs/dex-liquidity-token-approval-safe-submission-live-status.json");
  const payload = readJson("reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json");
  const verificationStatus = readJson("public-docs/dex-liquidity-token-approval-safe-payload-verification-status.json");
  const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.preparationOnly !== true) {
    issue("config.preparationOnly", "Config must be preparation-only.");
  }

  if (config.tokenApprovalSafeExecutionPreparationComplete !== true) {
    issue("config.tokenApprovalSafeExecutionPreparationComplete", "Config must show execution preparation complete.");
  }

  if (record.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_PREPARED_NOT_EXECUTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY") {
    issue("record.status", `Unexpected execution preparation status: ${record.status}`);
  }

  if (record.tokenApprovalSafeExecutionPreparationComplete !== true || record.operatorExecutionCommandReviewed !== true) {
    issue("record.preparationFlags", "Preparation and operator command review must be complete.");
  }

  if (!isAddress(record.liquiditySafeAddress) || !isAddress(record.approvalSpender)) {
    issue("record.addresses", "Liquidity Safe and approval spender must be valid.");
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

  if (!Array.isArray(record.executionReadinessChecks) || record.executionReadinessChecks.length <= 0) {
    issue("record.executionReadinessChecks", "Execution readiness checks must be present.");
  }

  for (const check of record.executionReadinessChecks || []) {
    if (check.allowanceStillUnexecuted !== true) {
      issue(`record.executionReadinessChecks.${check.id}.allowanceStillUnexecuted`, "Allowance must remain unexecuted.");
    }

    if (check.balanceCoversFinalApproval !== true) {
      issue(`record.executionReadinessChecks.${check.id}.balanceCoversFinalApproval`, "Balance must cover final approval.");
    }

    if (check.tokenApprovalSafeTransactionExecuted !== false || check.tokenApprovalExecuted !== false) {
      issue(`record.executionReadinessChecks.${check.id}.flags`, "Token approval executed flags must remain false.");
    }
  }

  for (const key of [
    "tokenApprovalSafeTransactionExecuted",
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

  if (approvalStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_APPROVED_NOT_EXECUTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY") {
    issue("approvalStatus.status", "Execution approval must be recorded.");
  }

  if (pendingStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PENDING_SIGNATURES_THRESHOLD_REACHED_NOT_EXECUTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY") {
    issue("pendingStatus.status", "Pending signatures must show threshold reached and not executed.");
  }

  if (liveStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY") {
    issue("liveStatus.status", "Live submission record must be present.");
  }

  if (verificationStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY") {
    issue("verificationStatus.status", "Payload verification must be complete.");
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
  schema: "astra-dex-liquidity-token-approval-safe-execution-preparation-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  recordFile: recordRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
