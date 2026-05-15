import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const recordRelativePath = "reports/dex-liquidity-funding-transfer-safe-submission-preparation/dex-liquidity-funding-transfer-safe-submission-preparation.json";

const requiredFiles = [
  "configs/dex-liquidity-funding-transfer-safe-submission-preparation.config.json",
  "docs/dex-liquidity-funding-transfer-safe-submission-preparation/DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMISSION_PREPARATION.md",
  "docs/dex-liquidity-funding-transfer-safe-submission-preparation/DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMISSION_PREPARATION_CHECKLIST.md",
  "docs/dex-liquidity-funding-transfer-safe-submission-preparation/DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMISSION_PREPARATION_BOUNDARIES.md",
  "docs/dex-liquidity-funding-transfer-safe-submission-preparation/DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMISSION_PREPARATION_RUNBOOK.md",
  "scripts/prepare-dex-liquidity-funding-transfer-safe-submission.mjs",
  recordRelativePath,
  "public-docs/dex-liquidity-funding-transfer-safe-submission-approval-status.json",
  "reports/dex-liquidity-funding-transfer-safe-submission-approval/dex-liquidity-funding-transfer-safe-submission-approval-record.json",
  "public-docs/dex-liquidity-funding-transfer-safe-payload-verification-status.json",
  "reports/dex-liquidity-treasury-funding/payload/funding-transfer-safe-payload.json",
  "public-docs/dex-pool-creation-post-execution-verification-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/mainnet-execution-status.json"
];

const forbiddenFiles = [
  "reports/dex-liquidity-funding-transfer-safe-submission-live/dex-liquidity-funding-transfer-safe-submission-live-record.json",
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

function isZeroAddress(value) {
  return String(value || "").toLowerCase() === "0x0000000000000000000000000000000000000000";
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required Safe submission preparation file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden live/submission/liquidity/public-trading artifact exists. Preparation must not submit, move funds, or add liquidity.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-funding-transfer-safe-submission-preparation.config.json");
  const record = readJson(recordRelativePath);
  const submissionApproval = readJson("public-docs/dex-liquidity-funding-transfer-safe-submission-approval-status.json");
  const payloadVerificationStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-payload-verification-status.json");
  const payload = readJson("reports/dex-liquidity-treasury-funding/payload/funding-transfer-safe-payload.json");
  const postExecution = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.preparationOnly !== true) {
    issue("config.preparationOnly", "Submission preparation config must be preparation-only.");
  }

  if (config.safeSubmissionPreparationComplete !== true) {
    issue("config.safeSubmissionPreparationComplete", "Config must show preparation complete.");
  }

  if (record.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_SUBMISSION_PREPARED_NOT_SUBMITTED_NO_FUNDS_MOVED") {
    issue("record.status", `Unexpected preparation status: ${record.status}`);
  }

  if (!isAddress(record.sourceSafeAddress) || isZeroAddress(record.sourceSafeAddress)) {
    issue("record.sourceSafeAddress", "Source Safe must be valid.");
  }

  if (!isAddress(record.destinationSafeAddress) || isZeroAddress(record.destinationSafeAddress)) {
    issue("record.destinationSafeAddress", "Destination Safe must be valid.");
  }

  if (!record.payloadHash || record.payloadHash !== payload.payloadHash) {
    issue("record.payloadHash", "Prepared payload hash must match payload file.");
  }

  if (!Array.isArray(record.preparedTransactions) || record.preparedTransactions.length <= 0) {
    issue("record.preparedTransactions", "Prepared transactions must be present.");
  }

  for (const tx of record.preparedTransactions || []) {
    if (!tx.transactionBuilderFields || !tx.transactionBuilderFields.to || !tx.transactionBuilderFields.data) {
      issue(`record.preparedTransactions.${tx.id}`, "Transaction Builder fields must be present.");
    }

    if (String(tx.value) !== "0") {
      issue(`record.preparedTransactions.${tx.id}.value`, "Prepared ERC-20 transfer value must be zero.");
    }

    if (tx.operation !== "CALL" || tx.operationValue !== 0) {
      issue(`record.preparedTransactions.${tx.id}.operation`, "Prepared operation must be CALL / 0.");
    }

    if (tx.fundingTransferSubmitted !== false || tx.fundingTransferExecuted !== false) {
      issue(`record.preparedTransactions.${tx.id}.flags`, "Prepared transaction submitted/executed flags must remain false.");
    }
  }

  for (const key of [
    "safeSubmissionDryRunComplete",
    "fundingTransferSubmitted",
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
    if (record.flags?.[key] !== false) {
      issue(`record.flags.${key}`, `${key} must remain false.`);
    }
  }

  if (submissionApproval.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_SUBMISSION_APPROVED_NOT_SUBMITTED_NO_FUNDS_MOVED") {
    issue("submissionApproval.status", "Safe submission approval must be recorded.");
  }

  if (payloadVerificationStatus.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NO_FUNDS_MOVED") {
    issue("payloadVerificationStatus.status", "Payload verification must be complete.");
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
  schema: "astra-dex-liquidity-funding-transfer-safe-submission-preparation-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  recordFile: recordRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
