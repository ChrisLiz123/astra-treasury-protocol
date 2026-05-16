import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const verificationRelativePath = "reports/dex-liquidity-token-approval-safe-payload-verification/dex-liquidity-token-approval-safe-payload-verification.json";
const payloadRelativePath = "reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json";
const transactionBuilderRelativePath = "reports/dex-liquidity-token-approval/payload/token-approval-safe-transaction-builder.json";

const requiredFiles = [
  "configs/dex-liquidity-token-approval-safe-payload-verification.config.json",
  "docs/dex-liquidity-token-approval-safe-payload-verification/DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_VERIFICATION.md",
  "docs/dex-liquidity-token-approval-safe-payload-verification/DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_VERIFICATION_CHECKLIST.md",
  "docs/dex-liquidity-token-approval-safe-payload-verification/DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_VERIFICATION_BOUNDARIES.md",
  "docs/dex-liquidity-token-approval-safe-payload-verification/DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_VERIFICATION_RUNBOOK.md",
  "scripts/verify-dex-liquidity-token-approval-safe-payload.mjs",
  verificationRelativePath,
  payloadRelativePath,
  transactionBuilderRelativePath,
  "public-docs/dex-liquidity-token-approval-safe-payload-status.json",
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
  "reports/dex-liquidity-token-approval/live/token-approval-executed.json",
  "reports/dex-liquidity-provision/payload/token-approval-safe-payload.json",
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
    issue(file, "Missing required token approval Safe payload verification file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden token-approval-live/liquidity/public-trading artifact exists. Verification must not execute approvals or add liquidity.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-token-approval-safe-payload-verification.config.json");
  const verification = readJson(verificationRelativePath);
  const payload = readJson(payloadRelativePath);
  const payloadStatus = readJson("public-docs/dex-liquidity-token-approval-safe-payload-status.json");
  const approvalStatus = readJson("public-docs/dex-liquidity-token-approval-payload-generation-approval-status.json");
  const recheckStatus = readJson("public-docs/dex-liquidity-token-approval-requirements-recheck-status.json");
  const postBalances = readJson("public-docs/dex-liquidity-funding-transfer-post-execution-balances-status.json");
  const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.verificationOnly !== true) {
    issue("config.verificationOnly", "Config must be verification-only.");
  }

  if (config.tokenApprovalSafePayloadVerified !== true) {
    issue("config.tokenApprovalSafePayloadVerified", "Config must show token approval payload verified.");
  }

  if (verification.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY") {
    issue("verification.status", `Unexpected verification status: ${verification.status}`);
  }

  if (verification.tokenApprovalSafePayloadVerified !== true || verification.tokenApprovalPayloadHashVerified !== true || verification.transactionBuilderJsonVerified !== true || verification.approvalCalldataVerified !== true) {
    issue("verification.flags", "Verification flags must be true.");
  }

  if (verification.payloadHashVerified !== true || verification.transactionBuilderHashVerified !== true) {
    issue("verification.hashes", "Payload and Transaction Builder hashes must verify.");
  }

  if (!isAddress(verification.liquiditySafeAddress) || !isAddress(verification.approvalSpender)) {
    issue("verification.addresses", "Liquidity Safe and approval spender must be valid.");
  }

  if (!Array.isArray(verification.transactionChecks) || verification.transactionChecks.length <= 0) {
    issue("verification.transactionChecks", "Transaction verification checks must be present.");
  }

  for (const check of verification.transactionChecks || []) {
    if (check.approvalSpenderMatches !== true) {
      issue(`verification.transactionChecks.${check.id}.approvalSpenderMatches`, "Approval spender must match.");
    }

    if (check.amountMatchesCalldata !== true) {
      issue(`verification.transactionChecks.${check.id}.amountMatchesCalldata`, "Decoded amount must match calldata.");
    }

    if (check.outerToIsToken !== true) {
      issue(`verification.transactionChecks.${check.id}.outerToIsToken`, "Outer To must be the token contract.");
    }

    if (check.transactionBuilderMatchesPayload !== true) {
      issue(`verification.transactionChecks.${check.id}.transactionBuilderMatchesPayload`, "Transaction Builder must match payload.");
    }

    if (check.dataHashVerified !== true) {
      issue(`verification.transactionChecks.${check.id}.dataHashVerified`, "Data hash must verify.");
    }

    if (check.allowanceStillUnexecuted !== true) {
      issue(`verification.transactionChecks.${check.id}.allowanceStillUnexecuted`, "Allowance must still reflect unexecuted approval state.");
    }

    if (check.tokenApprovalSafeTransactionSubmitted !== false || check.tokenApprovalExecuted !== false) {
      issue(`verification.transactionChecks.${check.id}.flags`, "Token approval submitted/executed flags must remain false.");
    }
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
    if (verification[key] !== false) {
      issue(`verification.${key}`, `${key} must remain false.`);
    }
  }

  if (payload.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY") {
    issue("payload.status", "Generated payload must have expected status.");
  }

  if (payloadStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY") {
    issue("payloadStatus.status", "Payload status must show generated/not submitted/no approvals executed.");
  }

  if (approvalStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_GENERATION_APPROVED_NO_PAYLOAD_NO_APPROVALS_EXECUTED") {
    issue("approvalStatus.status", "Payload generation approval must be recorded.");
  }

  if (recheckStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_RECHECK_COMPLETE_APPROVALS_REQUIRED_NO_APPROVALS_EXECUTED") {
    issue("recheckStatus.status", "Recheck must show approvals required.");
  }

  if (postBalances.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_POST_EXECUTION_BALANCES_VERIFIED_FUNDS_MOVED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("postBalances.status", "Post-execution balances must be verified.");
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
  schema: "astra-dex-liquidity-token-approval-safe-payload-verification-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  verificationFile: verificationRelativePath,
  payloadFile: payloadRelativePath,
  transactionBuilderFile: transactionBuilderRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
