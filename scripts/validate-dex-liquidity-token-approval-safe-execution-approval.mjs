import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const recordRelativePath = "reports/dex-liquidity-token-approval-safe-execution-approval/dex-liquidity-token-approval-safe-execution-approval-record.json";
const recordPath = path.join(root, recordRelativePath);

const requiredFiles = [
  "configs/dex-liquidity-token-approval-safe-execution-approval.config.json",
  "docs/dex-liquidity-token-approval-safe-execution-approval/DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_APPROVAL.md",
  "docs/dex-liquidity-token-approval-safe-execution-approval/DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_APPROVAL_CHECKLIST.md",
  "docs/dex-liquidity-token-approval-safe-execution-approval/DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_APPROVAL_BOUNDARIES.md",
  "docs/dex-liquidity-token-approval-safe-execution-approval/DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_APPROVAL_RUNBOOK.md",
  "scripts/record-dex-liquidity-token-approval-safe-execution-approval.mjs",
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
    issue(file, "Missing required token approval Safe execution approval file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden token-approval-executed/liquidity/public-trading artifact exists. Approval must not execute approvals.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-token-approval-safe-execution-approval.config.json");
  const approvalRecordPresent = fs.existsSync(recordPath);

  const pendingStatus = readJson("public-docs/dex-liquidity-token-approval-safe-pending-signatures-status.json");
  const pendingReport = readJson("reports/dex-liquidity-token-approval-safe-pending-signatures/dex-liquidity-token-approval-safe-pending-signatures-monitoring.json");
  const liveStatus = readJson("public-docs/dex-liquidity-token-approval-safe-submission-live-status.json");
  const liveRecord = readJson("reports/dex-liquidity-token-approval-safe-submission-live/dex-liquidity-token-approval-safe-submission-live-record.json");
  const payload = readJson("reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json");
  const verificationStatus = readJson("public-docs/dex-liquidity-token-approval-safe-payload-verification-status.json");
  const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.approvalPrepared !== true || config.approvalOnly !== true) {
    issue("config", "Execution approval config must be prepared and approval-only.");
  }

  if (config.tokenApprovalSafeExecutionApprovalRecorded !== approvalRecordPresent) {
    issue("config.tokenApprovalSafeExecutionApprovalRecorded", "Config approval flag must match record presence.");
  }

  if (config.tokenApprovalSafeExecutionApproved !== approvalRecordPresent) {
    issue("config.tokenApprovalSafeExecutionApproved", "Config approved flag must be true only after record exists.");
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
    "buyPageActivationApproved",
    "fullLaunchApproved"
  ]) {
    if (config[key] !== false) {
      issue(`config.${key}`, `${key} must remain false.`);
    }
  }

  if (pendingStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PENDING_SIGNATURES_THRESHOLD_REACHED_NOT_EXECUTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY") {
    issue("pendingStatus.status", "Pending signatures must show threshold reached and not executed.");
  }

  if (pendingStatus.summary?.thresholdReached !== true || Number(pendingStatus.summary?.missingConfirmationCount || 0) !== 0) {
    issue("pendingStatus.summary.threshold", "Threshold must be reached and missing confirmations must be zero.");
  }

  if (pendingReport.safeTransactionService?.thresholdReached !== true || pendingReport.safeTransactionService?.isExecuted !== false) {
    issue("pendingReport.safeTransactionService", "Safe Transaction Service must show threshold reached and not executed.");
  }

  if (liveStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY") {
    issue("liveStatus.status", "Live submission must be recorded.");
  }

  if (!isTxHash(liveRecord.safeTxHash) || liveRecord.safeTxHash !== pendingStatus.summary?.safeTxHash) {
    issue("liveRecord.safeTxHash", "Live Safe tx hash must match pending status.");
  }

  if (payload.payloadHash !== pendingReport.payloadHash) {
    issue("payload.payloadHash", "Payload hash must match pending signatures report.");
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

  if (approvalRecordPresent) {
    const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));

    if (record.schema !== "astra-dex-liquidity-token-approval-safe-execution-approval-record-v0.1") {
      issue("record.schema", "Invalid execution approval record schema.");
    }

    if (record.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_APPROVED_NOT_EXECUTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY") {
      issue("record.status", "Unexpected execution approval status.");
    }

    if (record.tokenApprovalSafeExecutionApproved !== true) {
      issue("record.tokenApprovalSafeExecutionApproved", "Execution approval flag must be true.");
    }

    if (!isAddress(record.liquiditySafeAddress) || !isAddress(record.approvalSpender)) {
      issue("record.addresses", "Liquidity Safe and approval spender must be valid.");
    }

    if (!isTxHash(record.safeTxHash) || record.safeTxHash !== liveRecord.safeTxHash) {
      issue("record.safeTxHash", "Execution approval Safe tx hash must match live record.");
    }

    if (record.thresholdReached !== true || record.serviceThresholdReached !== true) {
      issue("record.thresholdReached", "Threshold must be reached.");
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
  }
}

const result = {
  schema: "astra-dex-liquidity-token-approval-safe-execution-approval-validation-v0.1",
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
