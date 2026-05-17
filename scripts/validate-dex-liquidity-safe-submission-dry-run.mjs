import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const dryRunRelativePath = "reports/dex-liquidity-safe-submission-dry-run/dex-liquidity-safe-submission-dry-run.json";

const requiredFiles = [
  "configs/dex-liquidity-safe-submission-dry-run.config.json",
  "docs/dex-liquidity-safe-submission-dry-run/DEX_LIQUIDITY_SAFE_SUBMISSION_DRY_RUN.md",
  "docs/dex-liquidity-safe-submission-dry-run/DEX_LIQUIDITY_SAFE_SUBMISSION_DRY_RUN_CHECKLIST.md",
  "docs/dex-liquidity-safe-submission-dry-run/DEX_LIQUIDITY_SAFE_SUBMISSION_DRY_RUN_BOUNDARIES.md",
  "docs/dex-liquidity-safe-submission-dry-run/DEX_LIQUIDITY_SAFE_SUBMISSION_DRY_RUN_RUNBOOK.md",
  "scripts/dry-run-dex-liquidity-safe-submission.mjs",
  dryRunRelativePath,
  "public-docs/dex-liquidity-safe-submission-preparation-status.json",
  "reports/dex-liquidity-safe-submission-preparation/dex-liquidity-safe-submission-preparation.json",
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
  "reports/dex-liquidity-safe-submission-live/dex-liquidity-safe-submission-live-record.json",
  "reports/dex-liquidity-safe-pending-signatures/dex-liquidity-safe-pending-signatures-monitoring.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "public-docs/dex-liquidity-safe-submission-live-status.json",
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
    issue(file, "Missing required liquidity Safe submission dry-run file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden submission/live/liquidity/public-trading artifact exists. Dry run must not submit or add liquidity.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-safe-submission-dry-run.config.json");
  const dryRun = readJson(dryRunRelativePath);
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

  if (config.dryRunOnly !== true) {
    issue("config.dryRunOnly", "Config must be dry-run only.");
  }

  if (config.liquiditySafeSubmissionDryRunComplete !== true) {
    issue("config.liquiditySafeSubmissionDryRunComplete", "Config must show dry run complete.");
  }

  if (dryRun.status !== "DEX_LIQUIDITY_SAFE_SUBMISSION_DRY_RUN_COMPLETE_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("dryRun.status", `Unexpected dry-run status: ${dryRun.status}`);
  }

  if (dryRun.liquiditySafeSubmissionDryRunComplete !== true) {
    issue("dryRun.liquiditySafeSubmissionDryRunComplete", "Dry run must be complete.");
  }

  if (dryRun.safeTransactionServiceReachable !== true || dryRun.liquiditySafeExists !== true) {
    issue("dryRun.safe", "Safe Transaction Service must be reachable and liquidity Safe must exist.");
  }

  if (!isAddress(dryRun.liquiditySafeAddress)) {
    issue("dryRun.liquiditySafeAddress", "Liquidity Safe address must be valid.");
  }

  if (!dryRun.safeInfo || Number(dryRun.safeInfo.threshold || 0) <= 0 || !Array.isArray(dryRun.safeInfo.owners) || dryRun.safeInfo.owners.length <= 0) {
    issue("dryRun.safeInfo", "Safe info must include owners and positive threshold.");
  }

  if (dryRun.noDuplicatePendingSafeTransaction !== true || Number(dryRun.matchingPendingTransactionCount || 0) !== 0) {
    issue("dryRun.matchingPendingTransactions", "There must be no matching pending Safe transaction before live submission.");
  }

  if (dryRun.safePayloadHash !== safePayload.safePayloadHash) {
    issue("dryRun.safePayloadHash", "Dry run Safe payload hash must match Safe payload.");
  }

  if (dryRun.transactionBuilderHash !== safePayload.transactionBuilderHash) {
    issue("dryRun.transactionBuilderHash", "Dry run Transaction Builder hash must match Safe payload.");
  }

  if (dryRun.calldataHash !== payloadVerification.calldataHash) {
    issue("dryRun.calldataHash", "Dry run calldata hash must match payload verification.");
  }

  if (dryRun.liveChecks?.safeCodePresent !== true || dryRun.liveChecks?.npmCodePresent !== true) {
    issue("dryRun.liveChecks.contractCode", "Safe and NPM contract code must be present.");
  }

  if (dryRun.liveChecks?.poolLiquidityVerifiedZero !== true || String(dryRun.liveChecks?.poolLiquidity || "") !== "0") {
    issue("dryRun.liveChecks.poolLiquidity", "Pool liquidity must be zero.");
  }

  if (dryRun.liveChecks?.token0?.balanceCoversDesired !== true || dryRun.liveChecks?.token0?.allowanceCoversDesired !== true) {
    issue("dryRun.liveChecks.token0", "Token0 balance and allowance must cover desired amount.");
  }

  if (dryRun.liveChecks?.token1?.balanceCoversDesired !== true || dryRun.liveChecks?.token1?.allowanceCoversDesired !== true) {
    issue("dryRun.liveChecks.token1", "Token1 balance and allowance must cover desired amount.");
  }

  for (const key of [
    "liquiditySafeTransactionSubmitted",
    "liquiditySafeTransactionExecuted",
    "liquidityAdded",
    "positionMinted",
    "publicTradingApproved",
    "publicTradingLinkApproved",
    "buyPageActivated",
    "fullLaunchApproved"
  ]) {
    if (dryRun[key] !== false) {
      issue(`dryRun.${key}`, `${key} must remain false.`);
    }
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
  schema: "astra-dex-liquidity-safe-submission-dry-run-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  dryRunFile: dryRunRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
