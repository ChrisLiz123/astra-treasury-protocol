import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const recordRelativePath = "reports/dex-liquidity-token-approval-safe-submission-approval/dex-liquidity-token-approval-safe-submission-approval-record.json";
const recordPath = path.join(root, recordRelativePath);

const requiredFiles = [
  "configs/dex-liquidity-token-approval-safe-submission-approval.config.json",
  "docs/dex-liquidity-token-approval-safe-submission-approval/DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_APPROVAL.md",
  "docs/dex-liquidity-token-approval-safe-submission-approval/DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_APPROVAL_CHECKLIST.md",
  "docs/dex-liquidity-token-approval-safe-submission-approval/DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_APPROVAL_BOUNDARIES.md",
  "docs/dex-liquidity-token-approval-safe-submission-approval/DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_APPROVAL_RUNBOOK.md",
  "scripts/record-dex-liquidity-token-approval-safe-submission-approval.mjs",
  "public-docs/dex-liquidity-token-approval-safe-payload-verification-status.json",
  "reports/dex-liquidity-token-approval-safe-payload-verification/dex-liquidity-token-approval-safe-payload-verification.json",
  "public-docs/dex-liquidity-token-approval-safe-payload-status.json",
  "reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json",
  "reports/dex-liquidity-token-approval/payload/token-approval-safe-transaction-builder.json",
  "public-docs/dex-liquidity-token-approval-payload-generation-approval-status.json",
  "public-docs/dex-liquidity-token-approval-requirements-recheck-status.json",
  "public-docs/dex-liquidity-funding-transfer-post-execution-balances-status.json",
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
    issue(file, "Missing required token approval Safe submission approval file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden submission-live/token-approval-executed/liquidity/public-trading artifact exists. Approval must not submit or execute approvals.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-token-approval-safe-submission-approval.config.json");
  const approvalRecordPresent = fs.existsSync(recordPath);

  const verificationStatus = readJson("public-docs/dex-liquidity-token-approval-safe-payload-verification-status.json");
  const verification = readJson("reports/dex-liquidity-token-approval-safe-payload-verification/dex-liquidity-token-approval-safe-payload-verification.json");
  const payloadStatus = readJson("public-docs/dex-liquidity-token-approval-safe-payload-status.json");
  const payload = readJson("reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json");
  const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.approvalPrepared !== true || config.approvalOnly !== true) {
    issue("config", "Token approval Safe submission approval config must be prepared and approval-only.");
  }

  if (config.tokenApprovalSafeSubmissionApprovalRecorded !== approvalRecordPresent) {
    issue("config.tokenApprovalSafeSubmissionApprovalRecorded", "Config approval flag must match record presence.");
  }

  if (config.tokenApprovalSafeSubmissionApproved !== approvalRecordPresent) {
    issue("config.tokenApprovalSafeSubmissionApproved", "Config approved flag must be true only after record exists.");
  }

  for (const key of [
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
    "buyPageActivationApproved",
    "fullLaunchApproved"
  ]) {
    if (config[key] !== false) {
      issue(`config.${key}`, `${key} must remain false.`);
    }
  }

  if (verificationStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY") {
    issue("verificationStatus.status", "Token approval Safe payload verification must be complete.");
  }

  if (verificationStatus.summary?.tokenApprovalSafePayloadVerified !== true || verificationStatus.summary?.tokenApprovalPayloadHashVerified !== true || verificationStatus.summary?.transactionBuilderHashVerified !== true || verificationStatus.summary?.approvalCalldataVerified !== true) {
    issue("verificationStatus.summary", "Verification summary flags must all be true.");
  }

  if (verificationStatus.summary?.tokenApprovalSafeTransactionSubmitted !== false || verificationStatus.summary?.tokenApprovalExecuted !== false || verificationStatus.summary?.liquidityAdded !== false) {
    issue("verificationStatus.summary.flags", "Verification must show not submitted, no approval execution, and no liquidity.");
  }

  if (verification.payloadHashVerified !== true || verification.transactionBuilderHashVerified !== true) {
    issue("verification.hashes", "Verification hashes must pass.");
  }

  if (payloadStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY") {
    issue("payloadStatus.status", "Token approval payload must be generated.");
  }

  if (payload.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY") {
    issue("payload.status", "Payload file must be generated.");
  }

  if (!isAddress(payload.liquiditySafeAddress) || !isAddress(payload.approvalSpender)) {
    issue("payload.addresses", "Payload liquidity Safe and approval spender must be valid.");
  }

  if (!payload.payloadHash || payload.payloadHash !== verificationStatus.summary?.payloadHash) {
    issue("payload.payloadHash", "Payload hash must match verification status.");
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

  if (approvalRecordPresent) {
    const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));

    if (record.schema !== "astra-dex-liquidity-token-approval-safe-submission-approval-record-v0.1") {
      issue("record.schema", "Invalid token approval Safe submission approval record schema.");
    }

    if (record.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_APPROVED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY") {
      issue("record.status", "Unexpected approval record status.");
    }

    if (record.tokenApprovalSafeSubmissionApproved !== true) {
      issue("record.tokenApprovalSafeSubmissionApproved", "Submission approval must be true after recording.");
    }

    if (!isAddress(record.liquiditySafeAddress) || !isAddress(record.approvalSpender)) {
      issue("record.addresses", "Record liquidity Safe and approval spender must be valid.");
    }

    if (!record.payloadHash || record.payloadHash !== payload.payloadHash) {
      issue("record.payloadHash", "Record payload hash must match payload.");
    }

    for (const key of [
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
      if (record[key] !== false) {
        issue(`record.${key}`, `${key} must remain false.`);
      }
    }
  }
}

const result = {
  schema: "astra-dex-liquidity-token-approval-safe-submission-approval-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  recordFile: recordRelativePath,
  approvalRecordPresent: fs.existsSync(recordPath),
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
