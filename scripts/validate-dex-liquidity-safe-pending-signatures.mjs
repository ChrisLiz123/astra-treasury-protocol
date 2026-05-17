import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const monitoringRelativePath = "reports/dex-liquidity-safe-pending-signatures/dex-liquidity-safe-pending-signatures-monitoring.json";

const allowedStatuses = new Set([
  "DEX_LIQUIDITY_SAFE_PENDING_SIGNATURES_MONITORING_ACTIVE_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING",
  "DEX_LIQUIDITY_SAFE_PENDING_SIGNATURES_THRESHOLD_REACHED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING"
]);

const requiredFiles = [
  "configs/dex-liquidity-safe-pending-signatures.config.json",
  "docs/dex-liquidity-safe-pending-signatures/DEX_LIQUIDITY_SAFE_PENDING_SIGNATURES.md",
  "docs/dex-liquidity-safe-pending-signatures/DEX_LIQUIDITY_SAFE_PENDING_SIGNATURES_CHECKLIST.md",
  "docs/dex-liquidity-safe-pending-signatures/DEX_LIQUIDITY_SAFE_PENDING_SIGNATURES_BOUNDARIES.md",
  "docs/dex-liquidity-safe-pending-signatures/DEX_LIQUIDITY_SAFE_PENDING_SIGNATURES_RUNBOOK.md",
  "scripts/monitor-dex-liquidity-safe-pending-signatures.mjs",
  monitoringRelativePath,
  "public-docs/dex-liquidity-safe-submission-live-status.json",
  "reports/dex-liquidity-safe-submission-live/dex-liquidity-safe-submission-live-record.json",
  "public-docs/dex-liquidity-safe-submission-dry-run-status.json",
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
    issue(file, "Missing required liquidity Safe pending signatures file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden execution/liquidity/public-trading artifact exists. Pending-signature monitoring must not execute or add liquidity.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-safe-pending-signatures.config.json");
  const monitoring = readJson(monitoringRelativePath);
  const liveStatus = readJson("public-docs/dex-liquidity-safe-submission-live-status.json");
  const liveRecord = readJson("reports/dex-liquidity-safe-submission-live/dex-liquidity-safe-submission-live-record.json");
  const dryRunStatus = readJson("public-docs/dex-liquidity-safe-submission-dry-run-status.json");
  const payloadVerificationStatus = readJson("public-docs/dex-liquidity-safe-payload-verification-status.json");
  const safePayload = readJson("reports/dex-liquidity-provision/payload/liquidity-safe-payload.json");
  const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.monitoringOnly !== true) {
    issue("config.monitoringOnly", "Config must be monitoring-only.");
  }

  if (config.pendingSignatureMonitoringComplete !== true) {
    issue("config.pendingSignatureMonitoringComplete", "Config must show monitoring complete.");
  }

  if (!allowedStatuses.has(monitoring.status)) {
    issue("monitoring.status", `Unexpected monitoring status: ${monitoring.status}`);
  }

  if (monitoring.pendingSignatureMonitoringComplete !== true) {
    issue("monitoring.pendingSignatureMonitoringComplete", "Monitoring must be complete.");
  }

  if (!isAddress(monitoring.liquiditySafeAddress) || !isTxHash(monitoring.safeTxHash)) {
    issue("monitoring.identifiers", "Liquidity Safe address and Safe tx hash must be valid.");
  }

  if (monitoring.safeTxHash !== liveRecord.safeTxHash) {
    issue("monitoring.safeTxHash", "Monitoring Safe tx hash must match live submission.");
  }

  if (Number(monitoring.safeNonce) !== Number(liveRecord.safeNonce)) {
    issue("monitoring.safeNonce", "Monitoring Safe nonce must match live submission.");
  }

  if (monitoring.safePayloadHash !== safePayload.safePayloadHash) {
    issue("monitoring.safePayloadHash", "Monitoring Safe payload hash must match payload.");
  }

  if (monitoring.transactionBuilderHash !== safePayload.transactionBuilderHash) {
    issue("monitoring.transactionBuilderHash", "Monitoring Transaction Builder hash must match payload.");
  }

  if (Number(monitoring.requiredThreshold || 0) <= 0) {
    issue("monitoring.requiredThreshold", "Required threshold must be positive.");
  }

  if (Number(monitoring.confirmationCount || 0) < 0 || Number(monitoring.missingConfirmationCount || 0) < 0) {
    issue("monitoring.confirmationCounts", "Confirmation counts must be non-negative.");
  }

  if (monitoring.thresholdReached === true && Number(monitoring.missingConfirmationCount || 0) !== 0) {
    issue("monitoring.thresholdReached", "Threshold reached requires zero missing confirmations.");
  }

  if (monitoring.safeTransactionServicePending !== true || monitoring.safeTransactionService?.isExecuted !== false) {
    issue("monitoring.safeTransactionService", "Safe transaction must be pending/not executed.");
  }

  if (monitoring.safeTransactionExecuted !== false || monitoring.liquiditySafeTransactionExecuted !== false) {
    issue("monitoring.executionFlags", "Safe transaction must not be executed.");
  }

  if (monitoring.liveChecks?.safeCodePresent !== true || monitoring.liveChecks?.npmCodePresent !== true) {
    issue("monitoring.liveChecks.contractCode", "Safe and NPM code must be present.");
  }

  if (monitoring.liveChecks?.poolLiquidityVerifiedZero !== true || String(monitoring.liveChecks?.poolLiquidity || "") !== "0") {
    issue("monitoring.liveChecks.poolLiquidity", "Pool liquidity must remain zero.");
  }

  if (monitoring.liveChecks?.token0?.balanceCoversDesired !== true || monitoring.liveChecks?.token0?.allowanceCoversDesired !== true) {
    issue("monitoring.liveChecks.token0", "Token0 balance and allowance must cover desired amount.");
  }

  if (monitoring.liveChecks?.token1?.balanceCoversDesired !== true || monitoring.liveChecks?.token1?.allowanceCoversDesired !== true) {
    issue("monitoring.liveChecks.token1", "Token1 balance and allowance must cover desired amount.");
  }

  for (const key of [
    "liquidityAdded",
    "positionMinted",
    "publicTradingApproved",
    "publicTradingLinkApproved",
    "buyPageActivated",
    "fullLaunchApproved"
  ]) {
    if (monitoring[key] !== false) {
      issue(`monitoring.${key}`, `${key} must remain false.`);
    }
  }

  if (liveStatus.status !== "DEX_LIQUIDITY_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("liveStatus.status", "Submission live must be recorded.");
  }

  if (dryRunStatus.status !== "DEX_LIQUIDITY_SAFE_SUBMISSION_DRY_RUN_COMPLETE_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("dryRunStatus.status", "Submission dry run must be complete.");
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
  schema: "astra-dex-liquidity-safe-pending-signatures-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  monitoringFile: monitoringRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
