import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const recordRelativePath = "reports/dex-pool-creation-safe-execution-live/dex-pool-creation-safe-execution-live-record.json";
const poolRecordRelativePath = "reports/dex-pool-creation/live/dex-pool-created.json";

const requiredFiles = [
  "configs/dex-pool-creation-safe-execution-live.config.json",
  "docs/dex-pool-creation-safe-execution-live/DEX_POOL_CREATION_SAFE_EXECUTION_LIVE.md",
  "docs/dex-pool-creation-safe-execution-live/DEX_POOL_CREATION_SAFE_EXECUTION_LIVE_CHECKLIST.md",
  "docs/dex-pool-creation-safe-execution-live/DEX_POOL_CREATION_SAFE_EXECUTION_LIVE_BOUNDARIES.md",
  "docs/dex-pool-creation-safe-execution-live/DEX_POOL_CREATION_SAFE_EXECUTION_LIVE_RUNBOOK.md",
  "scripts/record-dex-pool-creation-safe-execution-live.mjs",
  recordRelativePath,
  poolRecordRelativePath,
  "public-docs/dex-pool-creation-safe-execution-approval-status.json",
  "public-docs/dex-pool-creation-safe-pending-signatures-status.json",
  "public-docs/dex-pool-creation-safe-submission-live-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/mainnet-execution-status.json"
];

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function isTxHash(value) {
  return /^0x[0-9a-fA-F]{64}$/.test(String(value || "").trim());
}

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || "").trim());
}

function isZeroAddress(value) {
  return String(value || "").toLowerCase() === "0x0000000000000000000000000000000000000000";
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required Safe execution live file.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-pool-creation-safe-execution-live.config.json");
  const record = readJson(recordRelativePath);
  const poolRecord = readJson(poolRecordRelativePath);
  const approval = readJson("public-docs/dex-pool-creation-safe-execution-approval-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.executionEvidenceOnly !== true) {
    issue("config.executionEvidenceOnly", "Execution live config must be evidence-only.");
  }

  if (record.status !== "DEX_POOL_CREATION_SAFE_EXECUTION_LIVE_RECORDED_POOL_CREATED_NO_LIQUIDITY") {
    issue("record.status", `Unexpected execution live status: ${record.status}`);
  }

  if (!isTxHash(record.executionTxHash)) {
    issue("record.executionTxHash", "Execution transaction hash must be valid.");
  }

  if (!isTxHash(record.safeTxHash)) {
    issue("record.safeTxHash", "Safe transaction hash must be valid.");
  }

  if (!isAddress(record.poolAddress) || isZeroAddress(record.poolAddress)) {
    issue("record.poolAddress", "Pool address must be a non-zero address.");
  }

  if (record.safeTransactionServiceExecutionConfirmed !== true) {
    issue("record.safeTransactionServiceExecutionConfirmed", "Safe Transaction Service execution confirmation must be true.");
  }

  if (record.receiptStatusSuccess !== true) {
    issue("record.receiptStatusSuccess", "Execution receipt status must be success.");
  }

  if (record.safeTransactionExecuted !== true || record.poolCreated !== true || record.poolAddressVerified !== true) {
    issue("record.execution", "Safe transaction executed, pool created, and pool address verified must all be true.");
  }

  for (const key of [
    "liquidityProvisionApproved",
    "liquidityAdded",
    "publicTradingApproved",
    "publicTradingLinkApproved",
    "buyPageActivated",
    "treasuryFundingApproved",
    "treasuryFundsMoved",
    "fullLaunchApproved"
  ]) {
    if (record[key] !== false) {
      issue(`record.${key}`, `${key} must remain false.`);
    }
  }

  if (poolRecord.status !== "DEX_POOL_CREATED_BY_SAFE_EXECUTION_NO_LIQUIDITY") {
    issue("poolRecord.status", "Unexpected pool-created record status.");
  }

  if (poolRecord.poolAddress !== record.poolAddress) {
    issue("poolRecord.poolAddress", "Pool record address must match execution record.");
  }

  if (approval.status !== "DEX_POOL_CREATION_SAFE_EXECUTION_APPROVED_NOT_EXECUTED") {
    issue("approval.status", "Execution approval evidence should remain recorded as pre-execution approval.");
  }

  if (fullLaunch.fullLaunchApproved !== false) {
    issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
  }

  if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
    issue("treasuryFunding", "Treasury funding must remain not approved and not executed.");
  }

  if (execution.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED") {
    issue("execution.mode", "Mainnet execution queue must remain disabled.");
  }
}

const result = {
  schema: "astra-dex-pool-creation-safe-execution-live-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  recordFile: recordRelativePath,
  poolRecordFile: poolRecordRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
