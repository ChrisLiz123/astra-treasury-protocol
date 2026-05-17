import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const reportRelativePath = "reports/dex-liquidity-token-approval-post-execution-allowances/dex-liquidity-token-approval-post-execution-allowances.json";

const requiredFiles = [
  "configs/dex-liquidity-token-approval-post-execution-allowances.config.json",
  "docs/dex-liquidity-token-approval-post-execution-allowances/DEX_LIQUIDITY_TOKEN_APPROVAL_POST_EXECUTION_ALLOWANCES.md",
  "docs/dex-liquidity-token-approval-post-execution-allowances/DEX_LIQUIDITY_TOKEN_APPROVAL_POST_EXECUTION_ALLOWANCES_CHECKLIST.md",
  "docs/dex-liquidity-token-approval-post-execution-allowances/DEX_LIQUIDITY_TOKEN_APPROVAL_POST_EXECUTION_ALLOWANCES_BOUNDARIES.md",
  "docs/dex-liquidity-token-approval-post-execution-allowances/DEX_LIQUIDITY_TOKEN_APPROVAL_POST_EXECUTION_ALLOWANCES_RUNBOOK.md",
  "scripts/verify-dex-liquidity-token-approval-post-execution-allowances.mjs",
  reportRelativePath,
  "public-docs/dex-liquidity-token-approval-safe-execution-live-status.json",
  "reports/dex-liquidity-token-approval-safe-execution-live/dex-liquidity-token-approval-safe-execution-live-record.json",
  "reports/dex-liquidity-token-approval/live/token-approval-executed.json",
  "reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json",
  "public-docs/dex-pool-creation-post-execution-verification-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/mainnet-execution-status.json"
];

const forbiddenFiles = [
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
    issue(file, "Missing required token approval post-execution allowance verification file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden liquidity/public-trading artifact exists. Allowance verification must not add liquidity or enable trading.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-token-approval-post-execution-allowances.config.json");
  const report = readJson(reportRelativePath);
  const executionLiveStatus = readJson("public-docs/dex-liquidity-token-approval-safe-execution-live-status.json");
  const executionLiveRecord = readJson("reports/dex-liquidity-token-approval-safe-execution-live/dex-liquidity-token-approval-safe-execution-live-record.json");
  const tokenApprovalExecuted = readJson("reports/dex-liquidity-token-approval/live/token-approval-executed.json");
  const payload = readJson("reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json");
  const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.verificationOnly !== true) {
    issue("config.verificationOnly", "Config must be verification-only.");
  }

  if (config.tokenApprovalPostExecutionAllowanceVerificationComplete !== true) {
    issue("config.tokenApprovalPostExecutionAllowanceVerificationComplete", "Config must show allowance verification complete.");
  }

  if (report.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_POST_EXECUTION_ALLOWANCES_VERIFIED_APPROVALS_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("report.status", `Unexpected report status: ${report.status}`);
  }

  if (!isAddress(report.liquiditySafeAddress) || !isAddress(report.approvalSpender)) {
    issue("report.addresses", "Liquidity Safe and approval spender must be valid.");
  }

  if (!isTxHash(report.safeTxHash) || !isTxHash(report.executionTxHash)) {
    issue("report.txHashes", "Safe tx hash and execution tx hash must be valid.");
  }

  if (report.tokenApprovalPostExecutionAllowanceVerificationComplete !== true) {
    issue("report.tokenApprovalPostExecutionAllowanceVerificationComplete", "Allowance verification must be complete.");
  }

  if (report.allRequiredAllowancesAvailable !== true || report.allRequiredBalancesAvailable !== true) {
    issue("report.allowanceBalanceFlags", "Required allowances and balances must be available.");
  }

  if (report.poolLiquidityVerifiedZero !== true || String(report.poolLiquidityCurrent || "") !== "0") {
    issue("report.poolLiquidity", "Pool liquidity must remain zero.");
  }

  if (!Array.isArray(report.allowanceVerificationChecks) || report.allowanceVerificationChecks.length <= 0) {
    issue("report.allowanceVerificationChecks", "Allowance verification checks must be present.");
  }

  for (const check of report.allowanceVerificationChecks || []) {
    if (check.allowanceEqualsExpected !== true) {
      issue(`report.allowanceVerificationChecks.${check.symbol}.allowanceEqualsExpected`, "Allowance must equal expected amount.");
    }

    if (check.allowanceMeetsOrExceedsExpected !== true) {
      issue(`report.allowanceVerificationChecks.${check.symbol}.allowanceMeetsOrExceedsExpected`, "Allowance must meet or exceed expected amount.");
    }

    if (check.balanceCoversExpected !== true) {
      issue(`report.allowanceVerificationChecks.${check.symbol}.balanceCoversExpected`, "Balance must cover expected amount.");
    }

    if (check.tokenApprovalExecuted !== true || check.allowanceVerificationPassed !== true) {
      issue(`report.allowanceVerificationChecks.${check.symbol}.flags`, "Token approval and allowance verification flags must be true.");
    }
  }

  for (const key of [
    "tokenApprovalSafeTransactionExecuted",
    "tokenApprovalExecuted"
  ]) {
    if (report[key] !== true) {
      issue(`report.${key}`, `${key} must be true.`);
    }
  }

  for (const key of [
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

  if (executionLiveStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_EXECUTION_LIVE_RECORDED_APPROVALS_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("executionLiveStatus.status", "Execution live status must be recorded.");
  }

  if (executionLiveRecord.executionTxHash !== report.executionTxHash) {
    issue("executionLiveRecord.executionTxHash", "Execution live tx hash must match report.");
  }

  if (tokenApprovalExecuted.executionTxHash !== report.executionTxHash) {
    issue("tokenApprovalExecuted.executionTxHash", "Token approval executed tx hash must match report.");
  }

  if (payload.payloadHash !== report.payloadHash) {
    issue("payload.payloadHash", "Payload hash must match report.");
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
  schema: "astra-dex-liquidity-token-approval-post-execution-allowances-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  reportFile: reportRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
