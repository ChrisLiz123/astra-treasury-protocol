import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const recordRelativePath = "reports/dex-liquidity-safe-execution-approval/dex-liquidity-safe-execution-approval-record.json";
const recordPath = path.join(root, recordRelativePath);

const requiredFiles = [
  "configs/dex-liquidity-safe-execution-approval.config.json",
  "docs/dex-liquidity-safe-execution-approval/DEX_LIQUIDITY_SAFE_EXECUTION_APPROVAL.md",
  "docs/dex-liquidity-safe-execution-approval/DEX_LIQUIDITY_SAFE_EXECUTION_APPROVAL_CHECKLIST.md",
  "docs/dex-liquidity-safe-execution-approval/DEX_LIQUIDITY_SAFE_EXECUTION_APPROVAL_BOUNDARIES.md",
  "docs/dex-liquidity-safe-execution-approval/DEX_LIQUIDITY_SAFE_EXECUTION_APPROVAL_RUNBOOK.md",
  "scripts/record-dex-liquidity-safe-execution-approval.mjs",
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
    issue(file, "Missing required liquidity Safe execution approval file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden execution/liquidity/public-trading artifact exists. Execution approval must not execute or add liquidity.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-safe-execution-approval.config.json");
  const approvalRecordPresent = fs.existsSync(recordPath);

  const pendingStatus = readJson("public-docs/dex-liquidity-safe-pending-signatures-status.json");
  const pending = readJson("reports/dex-liquidity-safe-pending-signatures/dex-liquidity-safe-pending-signatures-monitoring.json");
  const liveStatus = readJson("public-docs/dex-liquidity-safe-submission-live-status.json");
  const liveRecord = readJson("reports/dex-liquidity-safe-submission-live/dex-liquidity-safe-submission-live-record.json");
  const payloadVerificationStatus = readJson("public-docs/dex-liquidity-safe-payload-verification-status.json");
  const safePayload = readJson("reports/dex-liquidity-provision/payload/liquidity-safe-payload.json");
  const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.approvalPrepared !== true || config.approvalOnly !== true) {
    issue("config", "Config must be prepared and approval-only.");
  }

  if (config.liquiditySafeExecutionApprovalRecorded !== approvalRecordPresent) {
    issue("config.liquiditySafeExecutionApprovalRecorded", "Config approval flag must match record presence.");
  }

  if (config.liquiditySafeExecutionApproved !== approvalRecordPresent) {
    issue("config.liquiditySafeExecutionApproved", "Config approved flag must be true only after record exists.");
  }

  for (const key of [
    "liquiditySafeTransactionExecuted",
    "liquidityAdded",
    "positionMinted",
    "publicTradingApproved",
    "publicTradingLinkApproved",
    "buyPageActivationApproved",
    "fullLaunchApproved"
  ]) {
    if (config[key] !== false) {
      issue(`config.${key}`, `${key} must remain false.`);
    }
  }

  if (pendingStatus.status !== "DEX_LIQUIDITY_SAFE_PENDING_SIGNATURES_THRESHOLD_REACHED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("pendingStatus.status", "Pending signatures must show threshold reached.");
  }

  if (pending.thresholdReached !== true || Number(pending.missingConfirmationCount || 0) !== 0) {
    issue("pending.threshold", "Pending monitoring must show threshold reached with zero missing confirmations.");
  }

  if (pending.safeTransactionExecuted !== false || pending.liquiditySafeTransactionExecuted !== false || pending.liquidityAdded !== false) {
    issue("pending.executionFlags", "Pending monitoring must show not executed and no liquidity.");
  }

  if (liveStatus.status !== "DEX_LIQUIDITY_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("liveStatus.status", "Submission live must be recorded.");
  }

  if (!isTxHash(liveRecord.safeTxHash) || !isAddress(liveRecord.liquiditySafeAddress)) {
    issue("liveRecord.identifiers", "Live submission Safe tx hash and liquidity Safe address must be valid.");
  }

  if (liveRecord.safePayloadHash !== safePayload.safePayloadHash) {
    issue("liveRecord.safePayloadHash", "Live submission Safe payload hash must match payload.");
  }

  if (payloadVerificationStatus.status !== "DEX_LIQUIDITY_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("payloadVerificationStatus.status", "Safe payload verification must be complete.");
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

  if (approvalRecordPresent) {
    const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));

    if (record.schema !== "astra-dex-liquidity-safe-execution-approval-record-v0.1") {
      issue("record.schema", "Invalid execution approval record schema.");
    }

    if (record.status !== "DEX_LIQUIDITY_SAFE_EXECUTION_APPROVED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
      issue("record.status", "Unexpected execution approval record status.");
    }

    if (record.liquiditySafeExecutionApproved !== true || record.liquiditySafeExecutionApprovalRecorded !== true) {
      issue("record.approvalFlags", "Execution approval record must show approved/recorded.");
    }

    if (!isAddress(record.liquiditySafeAddress) || !isTxHash(record.safeTxHash)) {
      issue("record.identifiers", "Record liquidity Safe address and Safe tx hash must be valid.");
    }

    if (record.safeTxHash !== pending.safeTxHash || Number(record.safeNonce) !== Number(pending.safeNonce)) {
      issue("record.safeTx", "Record Safe tx hash and nonce must match pending monitoring.");
    }

    if (record.safePayloadHash !== safePayload.safePayloadHash) {
      issue("record.safePayloadHash", "Record Safe payload hash must match payload.");
    }

    if (record.thresholdReached !== true || Number(record.missingConfirmationCount || 0) !== 0) {
      issue("record.threshold", "Execution approval requires threshold reached and zero missing confirmations.");
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
      if (record[key] !== false) {
        issue(`record.${key}`, `${key} must remain false.`);
      }
    }
  }
}

const result = {
  schema: "astra-dex-liquidity-safe-execution-approval-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  recordFile: recordRelativePath,
  approvalRecordPresent: fs.existsSync(recordPath),
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
