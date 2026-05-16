import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const recordRelativePath = "reports/dex-liquidity-token-approval-safe-submission-preparation/dex-liquidity-token-approval-safe-submission-preparation.json";

const requiredFiles = [
  "configs/dex-liquidity-token-approval-safe-submission-preparation.config.json",
  "docs/dex-liquidity-token-approval-safe-submission-preparation/DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_PREPARATION.md",
  "docs/dex-liquidity-token-approval-safe-submission-preparation/DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_PREPARATION_CHECKLIST.md",
  "docs/dex-liquidity-token-approval-safe-submission-preparation/DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_PREPARATION_BOUNDARIES.md",
  "docs/dex-liquidity-token-approval-safe-submission-preparation/DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_PREPARATION_RUNBOOK.md",
  "scripts/prepare-dex-liquidity-token-approval-safe-submission.mjs",
  recordRelativePath,
  "public-docs/dex-liquidity-token-approval-safe-submission-approval-status.json",
  "reports/dex-liquidity-token-approval-safe-submission-approval/dex-liquidity-token-approval-safe-submission-approval-record.json",
  "public-docs/dex-liquidity-token-approval-safe-payload-verification-status.json",
  "reports/dex-liquidity-token-approval-safe-payload-verification/dex-liquidity-token-approval-safe-payload-verification.json",
  "reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json",
  "reports/dex-liquidity-token-approval/payload/token-approval-safe-transaction-builder.json",
  "public-docs/dex-pool-creation-post-execution-verification-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/mainnet-execution-status.json"
];

const forbiddenFiles = [
  "reports/dex-liquidity-token-approval-safe-submission-live/dex-liquidity-token-approval-safe-submission-live-record.json",
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

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required token approval Safe submission preparation file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden submission-live/token-approval-executed/liquidity/public-trading artifact exists. Preparation must not submit or execute approvals.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-token-approval-safe-submission-preparation.config.json");
  const record = readJson(recordRelativePath);
  const submissionApprovalStatus = readJson("public-docs/dex-liquidity-token-approval-safe-submission-approval-status.json");
  const verificationStatus = readJson("public-docs/dex-liquidity-token-approval-safe-payload-verification-status.json");
  const payload = readJson("reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json");
  const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.preparationOnly !== true) {
    issue("config.preparationOnly", "Config must be preparation-only.");
  }

  if (config.tokenApprovalSafeSubmissionPreparationComplete !== true) {
    issue("config.tokenApprovalSafeSubmissionPreparationComplete", "Config must show preparation complete.");
  }

  if (record.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_PREPARED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY") {
    issue("record.status", `Unexpected preparation status: ${record.status}`);
  }

  if (record.tokenApprovalSafeSubmissionPreparationComplete !== undefined && record.tokenApprovalSafeSubmissionPreparationComplete !== true) {
    issue("record.tokenApprovalSafeSubmissionPreparationComplete", "Record should show preparation complete.");
  }

  if (!isAddress(record.liquiditySafeAddress) || !isAddress(record.approvalSpender)) {
    issue("record.addresses", "Liquidity Safe and approval spender must be valid.");
  }

  if (record.payloadHash !== payload.payloadHash) {
    issue("record.payloadHash", "Preparation payload hash must match generated payload.");
  }

  if (!Array.isArray(record.preparedTransactions) || record.preparedTransactions.length !== payload.transactions.length) {
    issue("record.preparedTransactions", "Prepared transactions must match payload transaction count.");
  }

  for (const tx of record.preparedTransactions || []) {
    if (!isAddress(tx.to) || !isAddress(tx.tokenAddress)) {
      issue(`record.preparedTransactions.${tx.id}.to`, "Transaction target/token must be valid.");
    }

    if (String(tx.value) !== "0") {
      issue(`record.preparedTransactions.${tx.id}.value`, "Approval transaction value must be zero.");
    }

    if (tx.operation !== "CALL" || tx.operationValue !== 0) {
      issue(`record.preparedTransactions.${tx.id}.operation`, "Operation must be CALL / 0.");
    }

    if (!String(tx.data || "").startsWith("0x095ea7b3")) {
      issue(`record.preparedTransactions.${tx.id}.data`, "Approval calldata must use approve selector.");
    }

    if (tx.allowanceStillUnexecuted !== true) {
      issue(`record.preparedTransactions.${tx.id}.allowanceStillUnexecuted`, "Allowance must still reflect unexecuted state.");
    }

    if (tx.tokenApprovalSafeTransactionSubmitted !== false || tx.tokenApprovalExecuted !== false) {
      issue(`record.preparedTransactions.${tx.id}.flags`, "Submitted/executed flags must remain false.");
    }
  }

  for (const key of [
    "tokenApprovalSafeSubmissionDryRunComplete",
    "tokenApprovalSafeTransactionSubmitted",
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
    if (record.flags?.[key] !== false) {
      issue(`record.flags.${key}`, `${key} must remain false.`);
    }
  }

  if (submissionApprovalStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_APPROVED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY") {
    issue("submissionApprovalStatus.status", "Submission approval must be recorded.");
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
}

const result = {
  schema: "astra-dex-liquidity-token-approval-safe-submission-preparation-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  recordFile: recordRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
