import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const reportRelativePath = "reports/dex-liquidity-token-approval-requirements-recheck/dex-liquidity-token-approval-requirements-recheck.json";

const allowedStatuses = new Set([
  "DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_RECHECK_COMPLETE_APPROVALS_REQUIRED_NO_APPROVALS_EXECUTED",
  "DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_RECHECK_COMPLETE_NO_APPROVALS_REQUIRED_NO_APPROVALS_EXECUTED"
]);

const requiredFiles = [
  "configs/dex-liquidity-token-approval-requirements-recheck.config.json",
  "docs/dex-liquidity-token-approval-requirements-recheck/DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_RECHECK.md",
  "docs/dex-liquidity-token-approval-requirements-recheck/DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_RECHECK_CHECKLIST.md",
  "docs/dex-liquidity-token-approval-requirements-recheck/DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_RECHECK_BOUNDARIES.md",
  "docs/dex-liquidity-token-approval-requirements-recheck/DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_RECHECK_RUNBOOK.md",
  "scripts/recheck-dex-liquidity-token-approval-requirements.mjs",
  reportRelativePath,
  "public-docs/dex-liquidity-funding-transfer-post-execution-balances-status.json",
  "reports/dex-liquidity-funding-transfer-post-execution-balances/dex-liquidity-funding-transfer-post-execution-balances.json",
  "public-docs/dex-liquidity-funding-transfer-safe-execution-live-status.json",
  "reports/dex-liquidity-treasury-funding/live/funds-moved.json",
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
  "reports/dex-liquidity-token-approval/live/token-approval-executed.json",
  "reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json",
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

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required token approval requirements recheck file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden token approval/liquidity/public-trading artifact exists. Recheck must not generate or execute approvals.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-token-approval-requirements-recheck.config.json");
  const report = readJson(reportRelativePath);
  const postBalanceStatus = readJson("public-docs/dex-liquidity-funding-transfer-post-execution-balances-status.json");
  const executionLiveStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-execution-live-status.json");
  const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.recheckOnly !== true) {
    issue("config.recheckOnly", "Config must be recheck-only.");
  }

  if (!allowedStatuses.has(report.status)) {
    issue("report.status", `Unexpected recheck status: ${report.status}`);
  }

  if (report.tokenApprovalRequirementsRecheckComplete !== true) {
    issue("report.tokenApprovalRequirementsRecheckComplete", "Recheck must be complete.");
  }

  if (!isAddress(report.liquiditySafeAddress)) {
    issue("report.liquiditySafeAddress", "Liquidity Safe address must be valid.");
  }

  if (!isAddress(report.approvalSpender)) {
    issue("report.approvalSpender", "Approval spender must be valid.");
  }

  if (!Array.isArray(report.tokenApprovalRequirements) || report.tokenApprovalRequirements.length <= 0) {
    issue("report.tokenApprovalRequirements", "Token approval requirements must be present.");
  }

  if (report.allRequiredBalancesAvailable !== true) {
    issue("report.allRequiredBalancesAvailable", "All required balances must be available.");
  }

  for (const item of report.tokenApprovalRequirements || []) {
    if (!isAddress(item.tokenAddress)) {
      issue(`tokenApprovalRequirements.${item.symbol}.tokenAddress`, "Token address must be valid.");
    }

    if (!isAddress(item.ownerSafeAddress)) {
      issue(`tokenApprovalRequirements.${item.symbol}.ownerSafeAddress`, "Owner Safe address must be valid.");
    }

    if (!isAddress(item.spenderAddress)) {
      issue(`tokenApprovalRequirements.${item.symbol}.spenderAddress`, "Spender address must be valid.");
    }

    if (item.hasRequiredBalance !== true) {
      issue(`tokenApprovalRequirements.${item.symbol}.hasRequiredBalance`, "Token must have required balance.");
    }

    if (item.tokenApprovalPayloadGenerated !== false || item.tokenApprovalExecuted !== false) {
      issue(`tokenApprovalRequirements.${item.symbol}.flags`, "Token approval payload/execution flags must remain false.");
    }
  }

  for (const key of [
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

  if (report.fundingTransferExecuted !== true || report.treasuryFundsMoved !== true || report.destinationBalancesFunded !== true) {
    issue("report.fundingFlags", "Funding transfer must be executed and destination balances funded.");
  }

  if (postBalanceStatus.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_POST_EXECUTION_BALANCES_VERIFIED_FUNDS_MOVED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("postBalanceStatus.status", "Post-execution balances must be verified.");
  }

  if (executionLiveStatus.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_EXECUTION_LIVE_RECORDED_FUNDS_MOVED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("executionLiveStatus.status", "Funding transfer execution live status must be recorded.");
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
  schema: "astra-dex-liquidity-token-approval-requirements-recheck-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  reportFile: reportRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
