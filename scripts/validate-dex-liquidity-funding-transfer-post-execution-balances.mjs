import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const reportRelativePath = "reports/dex-liquidity-funding-transfer-post-execution-balances/dex-liquidity-funding-transfer-post-execution-balances.json";

const requiredFiles = [
  "configs/dex-liquidity-funding-transfer-post-execution-balances.config.json",
  "docs/dex-liquidity-funding-transfer-post-execution-balances/DEX_LIQUIDITY_FUNDING_TRANSFER_POST_EXECUTION_BALANCES.md",
  "docs/dex-liquidity-funding-transfer-post-execution-balances/DEX_LIQUIDITY_FUNDING_TRANSFER_POST_EXECUTION_BALANCES_CHECKLIST.md",
  "docs/dex-liquidity-funding-transfer-post-execution-balances/DEX_LIQUIDITY_FUNDING_TRANSFER_POST_EXECUTION_BALANCES_BOUNDARIES.md",
  "docs/dex-liquidity-funding-transfer-post-execution-balances/DEX_LIQUIDITY_FUNDING_TRANSFER_POST_EXECUTION_BALANCES_RUNBOOK.md",
  "scripts/verify-dex-liquidity-funding-transfer-post-execution-balances.mjs",
  reportRelativePath,
  "public-docs/dex-liquidity-funding-transfer-safe-execution-live-status.json",
  "reports/dex-liquidity-funding-transfer-safe-execution-live/dex-liquidity-funding-transfer-safe-execution-live-record.json",
  "reports/dex-liquidity-treasury-funding/live/funds-moved.json",
  "reports/dex-liquidity-treasury-funding/payload/funding-transfer-safe-payload.json",
  "public-docs/dex-pool-creation-post-execution-verification-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/mainnet-execution-status.json"
];

const forbiddenFiles = [
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
    issue(file, "Missing required post-execution balance verification file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden liquidity/public-trading artifact exists. Post-execution balance verification must not add liquidity or enable trading.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-funding-transfer-post-execution-balances.config.json");
  const report = readJson(reportRelativePath);
  const executionLiveStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-execution-live-status.json");
  const executionLiveRecord = readJson("reports/dex-liquidity-funding-transfer-safe-execution-live/dex-liquidity-funding-transfer-safe-execution-live-record.json");
  const fundsMoved = readJson("reports/dex-liquidity-treasury-funding/live/funds-moved.json");
  const payload = readJson("reports/dex-liquidity-treasury-funding/payload/funding-transfer-safe-payload.json");
  const postExecution = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.verificationOnly !== true) {
    issue("config.verificationOnly", "Config must be verification-only.");
  }

  if (config.postExecutionBalanceVerificationComplete !== true) {
    issue("config.postExecutionBalanceVerificationComplete", "Config must show balance verification complete.");
  }

  if (report.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_POST_EXECUTION_BALANCES_VERIFIED_FUNDS_MOVED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("report.status", `Unexpected verification status: ${report.status}`);
  }

  if (!isAddress(report.sourceSafeAddress) || !isAddress(report.destinationSafeAddress)) {
    issue("report.safeAddresses", "Source/destination Safe addresses must be valid.");
  }

  if (!isTxHash(report.safeTxHash) || !isTxHash(report.executionTxHash)) {
    issue("report.txHashes", "Safe tx hash and execution tx hash must be valid.");
  }

  if (report.postExecutionBalanceVerificationComplete !== true || report.sourceBalancesMovedAsExpected !== true || report.destinationBalancesFunded !== true) {
    issue("report.balanceFlags", "Post-execution balance flags must be true.");
  }

  if (report.safeTransactionService?.isExecuted !== true || !isTxHash(report.safeTransactionService?.transactionHash || "")) {
    issue("report.safeTransactionService", "Safe Transaction Service must show executed with valid transaction hash.");
  }

  if (report.poolLiquidityVerifiedZero !== true || String(report.poolLiquidityCurrent || "") !== "0") {
    issue("report.poolLiquidity", "Pool liquidity must remain zero.");
  }

  for (const check of report.balanceVerificationChecks || []) {
    if (check.sourceStillAtExpectedAfter !== true) {
      issue(`report.balanceVerificationChecks.${check.id}.sourceStillAtExpectedAfter`, "Source balance must equal expected post-execution amount.");
    }

    if (check.destinationStillAtExpectedAfter !== true) {
      issue(`report.balanceVerificationChecks.${check.id}.destinationStillAtExpectedAfter`, "Destination balance must equal expected post-execution amount.");
    }

    if (check.destinationFundedAtLeastAmount !== true) {
      issue(`report.balanceVerificationChecks.${check.id}.destinationFundedAtLeastAmount`, "Destination must be funded at least by transferred amount.");
    }
  }

  for (const key of [
    "safeTransactionExecuted",
    "fundingTransferExecuted",
    "treasuryFundsMoved"
  ]) {
    if (report[key] !== true) {
      issue(`report.${key}`, `${key} must be true.`);
    }
  }

  for (const key of [
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

  if (executionLiveStatus.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_EXECUTION_LIVE_RECORDED_FUNDS_MOVED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("executionLiveStatus.status", "Execution live status must be recorded.");
  }

  if (executionLiveRecord.executionTxHash !== report.executionTxHash) {
    issue("executionLiveRecord.executionTxHash", "Execution live tx hash must match balance verification report.");
  }

  if (fundsMoved.executionTxHash !== report.executionTxHash) {
    issue("fundsMoved.executionTxHash", "Funds moved tx hash must match balance verification report.");
  }

  if (payload.payloadHash !== report.payloadHash) {
    issue("payload.payloadHash", "Payload hash must match report.");
  }

  if (postExecution.status !== "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("postExecution.status", "Pool post-execution verification must still be no-liquidity/no-public-trading.");
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
  schema: "astra-dex-liquidity-funding-transfer-post-execution-balances-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  reportFile: reportRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
