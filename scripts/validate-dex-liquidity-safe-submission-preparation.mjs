import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const preparationRelativePath = "reports/dex-liquidity-safe-submission-preparation/dex-liquidity-safe-submission-preparation.json";

const requiredFiles = [
  "configs/dex-liquidity-safe-submission-preparation.config.json",
  "docs/dex-liquidity-safe-submission-preparation/DEX_LIQUIDITY_SAFE_SUBMISSION_PREPARATION.md",
  "docs/dex-liquidity-safe-submission-preparation/DEX_LIQUIDITY_SAFE_SUBMISSION_PREPARATION_CHECKLIST.md",
  "docs/dex-liquidity-safe-submission-preparation/DEX_LIQUIDITY_SAFE_SUBMISSION_PREPARATION_BOUNDARIES.md",
  "docs/dex-liquidity-safe-submission-preparation/DEX_LIQUIDITY_SAFE_SUBMISSION_PREPARATION_RUNBOOK.md",
  "scripts/prepare-dex-liquidity-safe-submission.mjs",
  preparationRelativePath,
  "public-docs/dex-liquidity-safe-submission-approval-status.json",
  "reports/dex-liquidity-safe-submission-approval/dex-liquidity-safe-submission-approval-record.json",
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

function sameAddress(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required liquidity Safe submission preparation file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden submission/live/liquidity/public-trading artifact exists. Submission preparation must not submit or add liquidity.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-safe-submission-preparation.config.json");
  const preparation = readJson(preparationRelativePath);
  const submissionApprovalStatus = readJson("public-docs/dex-liquidity-safe-submission-approval-status.json");
  const payloadVerificationStatus = readJson("public-docs/dex-liquidity-safe-payload-verification-status.json");
  const payloadVerification = readJson("reports/dex-liquidity-safe-payload-verification/dex-liquidity-safe-payload-verification.json");
  const safePayload = readJson("reports/dex-liquidity-provision/payload/liquidity-safe-payload.json");
  const transactionBuilder = readJson("reports/dex-liquidity-provision/payload/liquidity-safe-transaction-builder.json");
  const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.preparationOnly !== true) {
    issue("config.preparationOnly", "Config must be preparation-only.");
  }

  if (config.liquiditySafeSubmissionPreparationComplete !== true) {
    issue("config.liquiditySafeSubmissionPreparationComplete", "Config must show submission preparation complete.");
  }

  if (preparation.status !== "DEX_LIQUIDITY_SAFE_SUBMISSION_PREPARED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("preparation.status", `Unexpected preparation status: ${preparation.status}`);
  }

  if (preparation.liquiditySafeSubmissionPreparationComplete !== true || preparation.operatorSubmissionCommandReviewed !== true) {
    issue("preparation.preparationFlags", "Preparation and operator command review must be complete.");
  }

  if (!isAddress(preparation.liquiditySafeAddress) || !isAddress(preparation.safeAddress)) {
    issue("preparation.addresses", "Liquidity Safe and Safe address must be valid.");
  }

  if (!sameAddress(preparation.safeAddress, preparation.liquiditySafeAddress)) {
    issue("preparation.safeAddress", "safeAddress must equal liquiditySafeAddress.");
  }

  if (preparation.safePayloadHash !== safePayload.safePayloadHash) {
    issue("preparation.safePayloadHash", "Preparation Safe payload hash must match Safe payload.");
  }

  if (preparation.transactionBuilderHash !== transactionBuilder.transactionBuilderHash) {
    issue("preparation.transactionBuilderHash", "Preparation Transaction Builder hash must match builder.");
  }

  if (preparation.calldataHash !== payloadVerification.calldataHash) {
    issue("preparation.calldataHash", "Preparation calldata hash must match payload verification.");
  }

  if (!Array.isArray(preparation.preparedTransactions) || preparation.preparedTransactions.length !== 1) {
    issue("preparation.preparedTransactions", "Exactly one prepared transaction is expected.");
  }

  const preparedTx = preparation.preparedTransactions?.[0] || {};

  if (!isAddress(preparedTx.to) || !sameAddress(preparedTx.to, safePayload.nonfungiblePositionManager)) {
    issue("preparation.preparedTransactions.0.to", "Prepared transaction target must be NonfungiblePositionManager.");
  }

  if (String(preparedTx.value) !== "0" || preparedTx.operation !== "CALL") {
    issue("preparation.preparedTransactions.0.call", "Prepared transaction must be CALL with value 0.");
  }

  if (preparedTx.checks?.targetIsNonfungiblePositionManager !== true || preparedTx.checks?.valueIsZero !== true || preparedTx.checks?.operationIsCall !== true || preparedTx.checks?.dataStartsWithMintSelector !== true) {
    issue("preparation.preparedTransactions.0.checks", "Prepared transaction checks must pass.");
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
    if (preparation[key] !== false) {
      issue(`preparation.${key}`, `${key} must remain false.`);
    }
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
  schema: "astra-dex-liquidity-safe-submission-preparation-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  preparationFile: preparationRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
