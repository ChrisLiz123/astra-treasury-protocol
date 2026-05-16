import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const recordRelativePath = "reports/dex-liquidity-token-approval-safe-submission-live/dex-liquidity-token-approval-safe-submission-live-record.json";

const requiredFiles = [
  "configs/dex-liquidity-token-approval-safe-submission-live.config.json",
  "docs/dex-liquidity-token-approval-safe-submission-live/DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_LIVE.md",
  "docs/dex-liquidity-token-approval-safe-submission-live/DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_LIVE_CHECKLIST.md",
  "docs/dex-liquidity-token-approval-safe-submission-live/DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_LIVE_BOUNDARIES.md",
  "docs/dex-liquidity-token-approval-safe-submission-live/DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_LIVE_RUNBOOK.md",
  "scripts/record-dex-liquidity-token-approval-safe-submission-live.mjs",
  recordRelativePath,
  "public-docs/dex-liquidity-token-approval-safe-submission-dry-run-status.json",
  "reports/dex-liquidity-token-approval-safe-submission-dry-run/dex-liquidity-token-approval-safe-submission-dry-run.json",
  "public-docs/dex-liquidity-token-approval-safe-submission-preparation-status.json",
  "public-docs/dex-liquidity-token-approval-safe-submission-approval-status.json",
  "public-docs/dex-liquidity-token-approval-safe-payload-verification-status.json",
  "reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json",
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
    issue(file, "Missing required token approval Safe submission live file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden token-approval-executed/liquidity/public-trading artifact exists. Submission live must not execute approvals.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-token-approval-safe-submission-live.config.json");
  const record = readJson(recordRelativePath);
  const dryRunStatus = readJson("public-docs/dex-liquidity-token-approval-safe-submission-dry-run-status.json");
  const preparationStatus = readJson("public-docs/dex-liquidity-token-approval-safe-submission-preparation-status.json");
  const submissionApprovalStatus = readJson("public-docs/dex-liquidity-token-approval-safe-submission-approval-status.json");
  const verificationStatus = readJson("public-docs/dex-liquidity-token-approval-safe-payload-verification-status.json");
  const payload = readJson("reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json");
  const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.submissionLiveEvidenceOnly !== true) {
    issue("config.submissionLiveEvidenceOnly", "Config must be submission-live evidence only.");
  }

  if (record.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY") {
    issue("record.status", `Unexpected live submission status: ${record.status}`);
  }

  if (!isAddress(record.liquiditySafeAddress) || !isAddress(record.approvalSpender)) {
    issue("record.addresses", "Liquidity Safe and approval spender must be valid.");
  }

  if (!isTxHash(record.safeTxHash)) {
    issue("record.safeTxHash", "Safe tx hash must be valid.");
  }

  if (!Number.isInteger(record.safeNonce) || record.safeNonce < 0) {
    issue("record.safeNonce", "Safe nonce must be a non-negative integer.");
  }

  if (record.payloadHash !== payload.payloadHash) {
    issue("record.payloadHash", "Submission record payload hash must match payload.");
  }

  if (record.tokenApprovalSafeSubmissionLiveRecorded !== true || record.tokenApprovalSafeTransactionSubmitted !== true) {
    issue("record.submissionFlags", "Record must show Safe transaction submitted/proposed.");
  }

  if (record.serviceExecutionConfirmedFalse !== true || record.safeTransactionService?.isExecuted !== false) {
    issue("record.safeTransactionService.isExecuted", "Safe Transaction Service must show not executed.");
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
    if (record[key] !== false) {
      issue(`record.${key}`, `${key} must remain false.`);
    }
  }

  if (dryRunStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_DRY_RUN_COMPLETE_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY") {
    issue("dryRunStatus.status", "Submission dry run must be complete.");
  }

  if (preparationStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_PREPARED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY") {
    issue("preparationStatus.status", "Submission preparation must be complete.");
  }

  if (submissionApprovalStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_APPROVED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY") {
    issue("submissionApprovalStatus.status", "Submission approval must be recorded.");
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
  schema: "astra-dex-liquidity-token-approval-safe-submission-live-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  recordFile: recordRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
