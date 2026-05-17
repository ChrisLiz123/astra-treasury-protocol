import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const recordRelativePath = "reports/dex-liquidity-safe-submission-live/dex-liquidity-safe-submission-live-record.json";

const requiredFiles = [
  "configs/dex-liquidity-safe-submission-live.config.json",
  "docs/dex-liquidity-safe-submission-live/DEX_LIQUIDITY_SAFE_SUBMISSION_LIVE.md",
  "docs/dex-liquidity-safe-submission-live/DEX_LIQUIDITY_SAFE_SUBMISSION_LIVE_CHECKLIST.md",
  "docs/dex-liquidity-safe-submission-live/DEX_LIQUIDITY_SAFE_SUBMISSION_LIVE_BOUNDARIES.md",
  "docs/dex-liquidity-safe-submission-live/DEX_LIQUIDITY_SAFE_SUBMISSION_LIVE_RUNBOOK.md",
  "scripts/record-dex-liquidity-safe-submission-live.mjs",
  recordRelativePath,
  "public-docs/dex-liquidity-safe-submission-dry-run-status.json",
  "reports/dex-liquidity-safe-submission-dry-run/dex-liquidity-safe-submission-dry-run.json",
  "public-docs/dex-liquidity-safe-submission-preparation-status.json",
  "public-docs/dex-liquidity-safe-submission-approval-status.json",
  "public-docs/dex-liquidity-safe-payload-verification-status.json",
  "reports/dex-liquidity-safe-payload-verification/dex-liquidity-safe-payload-verification.json",
  "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  "reports/dex-liquidity-provision/payload/liquidity-safe-transaction-builder.json",
  "public-docs/dex-pool-creation-post-execution-verification-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/mainnet-execution-status.json"
];

const forbiddenFiles = [
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

function sameAddress(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required liquidity Safe submission live file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden liquidity/public-trading artifact exists. Submission live must not add liquidity or enable trading.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-safe-submission-live.config.json");
  const record = readJson(recordRelativePath);
  const dryRunStatus = readJson("public-docs/dex-liquidity-safe-submission-dry-run-status.json");
  const dryRun = readJson("reports/dex-liquidity-safe-submission-dry-run/dex-liquidity-safe-submission-dry-run.json");
  const preparationStatus = readJson("public-docs/dex-liquidity-safe-submission-preparation-status.json");
  const submissionApprovalStatus = readJson("public-docs/dex-liquidity-safe-submission-approval-status.json");
  const payloadVerificationStatus = readJson("public-docs/dex-liquidity-safe-payload-verification-status.json");
  const payloadVerification = readJson("reports/dex-liquidity-safe-payload-verification/dex-liquidity-safe-payload-verification.json");
  const safePayload = readJson("reports/dex-liquidity-provision/payload/liquidity-safe-payload.json");
  const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.submissionLiveEvidenceOnly !== true) {
    issue("config.submissionLiveEvidenceOnly", "Config must be submission-live evidence only.");
  }

  if (config.liquiditySafeSubmissionLiveRecorded !== true || config.liquiditySafeTransactionSubmitted !== true) {
    issue("config.submissionFlags", "Config must show submission live recorded and submitted.");
  }

  if (record.status !== "DEX_LIQUIDITY_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("record.status", `Unexpected record status: ${record.status}`);
  }

  if (!isAddress(record.liquiditySafeAddress) || !isAddress(record.safeAddress)) {
    issue("record.addresses", "Record liquidity Safe and Safe address must be valid.");
  }

  if (!isTxHash(record.safeTxHash)) {
    issue("record.safeTxHash", "Safe tx hash must be valid.");
  }

  if (!Number.isInteger(record.safeNonce) || record.safeNonce < 0) {
    issue("record.safeNonce", "Safe nonce must be a non-negative integer.");
  }

  if (record.safePayloadHash !== safePayload.safePayloadHash) {
    issue("record.safePayloadHash", "Record Safe payload hash must match Safe payload.");
  }

  if (record.transactionBuilderHash !== safePayload.transactionBuilderHash) {
    issue("record.transactionBuilderHash", "Record Transaction Builder hash must match Safe payload.");
  }

  if (record.calldataHash !== payloadVerification.calldataHash) {
    issue("record.calldataHash", "Record calldata hash must match payload verification.");
  }

  if (record.submissionFingerprint !== dryRun.submissionFingerprint) {
    issue("record.submissionFingerprint", "Record submission fingerprint must match dry run.");
  }

  if (record.liquiditySafeSubmissionLiveRecorded !== true || record.liquiditySafeTransactionSubmitted !== true) {
    issue("record.submissionFlags", "Submission must be recorded and submitted.");
  }

  if (record.safeTransactionServicePending !== true || record.safeTransactionService?.isExecuted !== false) {
    issue("record.safeTransactionService", "Safe Transaction Service must show pending/not executed.");
  }

  if (!sameAddress(record.safeTransactionService?.safe, record.liquiditySafeAddress)) {
    issue("record.safeTransactionService.safe", "Safe Transaction Service safe must match record.");
  }

  const tx = safePayload.transactions?.[0] || {};

  if (!sameAddress(record.safeTransactionService?.to, tx.to)) {
    issue("record.safeTransactionService.to", "Safe Transaction Service target must match payload transaction.");
  }

  if (record.liquiditySafeTransactionExecuted !== false || record.liquidityAdded !== false || record.positionMinted !== false || record.publicTradingApproved !== false || record.fullLaunchApproved !== false) {
    issue("record.restrictions", "Execution, liquidity, position, public trading, and full launch must remain false.");
  }

  if (dryRunStatus.status !== "DEX_LIQUIDITY_SAFE_SUBMISSION_DRY_RUN_COMPLETE_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("dryRunStatus.status", "Dry run must be complete.");
  }

  if (preparationStatus.status !== "DEX_LIQUIDITY_SAFE_SUBMISSION_PREPARED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("preparationStatus.status", "Submission preparation must be complete.");
  }

  if (submissionApprovalStatus.status !== "DEX_LIQUIDITY_SAFE_SUBMISSION_APPROVED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("submissionApprovalStatus.status", "Submission approval must be recorded.");
  }

  if (payloadVerificationStatus.status !== "DEX_LIQUIDITY_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("payloadVerificationStatus.status", "Safe payload verification must be complete.");
  }

  if (payloadVerification.liquiditySafePayloadVerified !== true) {
    issue("payloadVerification.liquiditySafePayloadVerified", "Payload verification record must show verified.");
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
  schema: "astra-dex-liquidity-safe-submission-live-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  recordFile: recordRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
