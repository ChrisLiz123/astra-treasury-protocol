import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const reportRelativePath = "reports/dex-liquidity-funding-transfer-safe-pending-signatures/dex-liquidity-funding-transfer-safe-pending-signatures-monitoring.json";

const allowedStatuses = new Set([
  "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_PENDING_SIGNATURES_MONITORING_ACTIVE_NOT_EXECUTED_NO_FUNDS_MOVED",
  "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_PENDING_SIGNATURES_THRESHOLD_REACHED_NOT_EXECUTED_NO_FUNDS_MOVED"
]);

const requiredFiles = [
  "configs/dex-liquidity-funding-transfer-safe-pending-signatures.config.json",
  "docs/dex-liquidity-funding-transfer-safe-pending-signatures/DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_PENDING_SIGNATURES.md",
  "docs/dex-liquidity-funding-transfer-safe-pending-signatures/DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_PENDING_SIGNATURES_CHECKLIST.md",
  "docs/dex-liquidity-funding-transfer-safe-pending-signatures/DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_PENDING_SIGNATURES_BOUNDARIES.md",
  "docs/dex-liquidity-funding-transfer-safe-pending-signatures/DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_PENDING_SIGNATURES_RUNBOOK.md",
  "scripts/monitor-dex-liquidity-funding-transfer-safe-pending-signatures.mjs",
  reportRelativePath,
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
    issue(file, "Missing required pending signatures monitoring file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden funds-moved/liquidity/public-trading artifact exists. Monitoring must not execute, move funds, or add liquidity.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-funding-transfer-safe-pending-signatures.config.json");
  const report = readJson(reportRelativePath);
  const liveStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-submission-live-status.json");
  const liveRecord = readJson("reports/dex-liquidity-funding-transfer-safe-submission-live/dex-liquidity-funding-transfer-safe-submission-live-record.json");
  const payload = readJson("reports/dex-liquidity-treasury-funding/payload/funding-transfer-safe-payload.json");
  const postExecution = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.monitoringOnly !== true) {
    issue("config.monitoringOnly", "Config must be monitoring-only.");
  }

  if (!allowedStatuses.has(report.status)) {
    issue("report.status", `Unexpected monitoring status: ${report.status}`);
  }

  if (report.pendingSignatureMonitoringComplete !== true) {
    issue("report.pendingSignatureMonitoringComplete", "Pending signature monitoring must be complete.");
  }

  if (!isAddress(report.sourceSafeAddress) || !isAddress(report.destinationSafeAddress)) {
    issue("report.safeAddresses", "Source and destination Safe addresses must be valid.");
  }

  if (!isTxHash(report.safeTxHash)) {
    issue("report.safeTxHash", "Safe tx hash must be valid.");
  }

  if (!Number.isInteger(report.safeNonce) || report.safeNonce < 0) {
    issue("report.safeNonce", "Safe nonce must be valid.");
  }

  if (!Number.isInteger(report.safeTransactionService?.confirmationCount) || report.safeTransactionService.confirmationCount < 0) {
    issue("report.safeTransactionService.confirmationCount", "Confirmation count must be a non-negative integer.");
  }

  if (!Number.isInteger(report.safeTransactionService?.requiredThreshold) || report.safeTransactionService.requiredThreshold <= 0) {
    issue("report.safeTransactionService.requiredThreshold", "Required threshold must be a positive integer.");
  }

  if (!Number.isInteger(report.safeTransactionService?.missingConfirmationCount) || report.safeTransactionService.missingConfirmationCount < 0) {
    issue("report.safeTransactionService.missingConfirmationCount", "Missing confirmation count must be a non-negative integer.");
  }

  if (report.safeTransactionService?.isExecuted !== false) {
    issue("report.safeTransactionService.isExecuted", "Safe transaction must not be executed.");
  }

  for (const check of report.transactionChecks || []) {
    if (check.sourceBalanceCoversTransfer !== true) {
      issue(`report.transactionChecks.${check.id}.sourceBalanceCoversTransfer`, "Source balance must cover transfer.");
    }

    if (check.destinationBalanceUnchanged !== true) {
      issue(`report.transactionChecks.${check.id}.destinationBalanceUnchanged`, "Destination balance must remain unchanged before execution.");
    }

    if (check.fundingTransferExecuted !== false) {
      issue(`report.transactionChecks.${check.id}.fundingTransferExecuted`, "Funding transfer must remain not executed.");
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
    if (report[key] !== false) {
      issue(`report.${key}`, `${key} must remain false.`);
    }
  }

  if (report.safeTransactionSubmitted !== true || report.fundingTransferSubmitted !== true) {
    issue("report.submissionFlags", "Safe/funding transfer submission flags must remain true after proposal.");
  }

  if (liveStatus.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED_NO_FUNDS_MOVED") {
    issue("liveStatus.status", "Live submission evidence must be recorded.");
  }

  if (liveRecord.safeTxHash !== report.safeTxHash || Number(liveRecord.safeNonce) !== Number(report.safeNonce)) {
    issue("liveRecord.safeTxHash", "Live record safe tx hash/nonce must match monitoring report.");
  }

  if (payload.payloadHash !== report.payloadHash) {
    issue("payload.payloadHash", "Payload hash must match monitoring report.");
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
  schema: "astra-dex-liquidity-funding-transfer-safe-pending-signatures-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  reportFile: reportRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
