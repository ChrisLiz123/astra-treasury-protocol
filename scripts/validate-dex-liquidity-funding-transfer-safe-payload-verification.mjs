import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const verificationRelativePath = "reports/dex-liquidity-funding-transfer-safe-payload-verification/dex-liquidity-funding-transfer-safe-payload-verification.json";
const payloadRelativePath = "reports/dex-liquidity-treasury-funding/payload/funding-transfer-safe-payload.json";

const requiredFiles = [
  "configs/dex-liquidity-funding-transfer-safe-payload-verification.config.json",
  "docs/dex-liquidity-funding-transfer-safe-payload-verification/DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_PAYLOAD_VERIFICATION.md",
  "docs/dex-liquidity-funding-transfer-safe-payload-verification/DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_PAYLOAD_VERIFICATION_CHECKLIST.md",
  "docs/dex-liquidity-funding-transfer-safe-payload-verification/DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_PAYLOAD_VERIFICATION_BOUNDARIES.md",
  "docs/dex-liquidity-funding-transfer-safe-payload-verification/DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_PAYLOAD_VERIFICATION_RUNBOOK.md",
  "scripts/verify-dex-liquidity-funding-transfer-safe-payload.mjs",
  verificationRelativePath,
  payloadRelativePath,
  "public-docs/dex-liquidity-funding-transfer-safe-payload-status.json",
  "public-docs/dex-liquidity-funding-transfer-payload-generation-approval-status.json",
  "public-docs/dex-liquidity-funding-transfer-approval-status.json",
  "public-docs/dex-liquidity-funding-transfer-requirements-status.json",
  "reports/dex-liquidity-funding-transfer-requirements/dex-liquidity-funding-transfer-requirements-review.json",
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
  "reports/dex-liquidity-treasury-funding/live/funds-moved.json",
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
    issue(file, "Missing required funding-transfer Safe payload verification file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden live/liquidity/public-trading artifact exists. Verification must not move funds or add liquidity.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-funding-transfer-safe-payload-verification.config.json");
  const verification = readJson(verificationRelativePath);
  const payload = readJson(payloadRelativePath);

  const payloadStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-payload-status.json");
  const payloadApproval = readJson("public-docs/dex-liquidity-funding-transfer-payload-generation-approval-status.json");
  const transferApproval = readJson("public-docs/dex-liquidity-funding-transfer-approval-status.json");
  const requirementsStatus = readJson("public-docs/dex-liquidity-funding-transfer-requirements-status.json");
  const postExecution = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.verificationPrepared !== true || config.verificationOnly !== true) {
    issue("config", "Verification config must be prepared and verification-only.");
  }

  if (verification.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NO_FUNDS_MOVED") {
    issue("verification.status", `Unexpected verification status: ${verification.status}`);
  }

  if (verification.verificationOnly !== true) {
    issue("verification.verificationOnly", "Verification must be verification-only.");
  }

  if (verification.payloadHashVerified !== true || verification.flags?.payloadHashVerified !== true) {
    issue("verification.payloadHashVerified", "Payload hash must verify.");
  }

  if (!isAddress(verification.sourceSafeAddress) || isZeroAddress(verification.sourceSafeAddress)) {
    issue("verification.sourceSafeAddress", "Source Safe address must be valid.");
  }

  if (!isAddress(verification.destinationSafeAddress) || isZeroAddress(verification.destinationSafeAddress)) {
    issue("verification.destinationSafeAddress", "Destination Safe address must be valid.");
  }

  if (!Array.isArray(verification.transactionChecks) || verification.transactionChecks.length <= 0) {
    issue("verification.transactionChecks", "Transaction checks must be present.");
  }

  for (const item of verification.transactionChecks || []) {
    if (item.calldataVerified !== true) {
      issue(`verification.transactionChecks.${item.id}.calldataVerified`, "Calldata must verify.");
    }

    if (item.amountMatchesShortfall !== true) {
      issue(`verification.transactionChecks.${item.id}.amountMatchesShortfall`, "Amount must match approved shortfall.");
    }

    if (item.sourceBalanceCoversTransfer !== true) {
      issue(`verification.transactionChecks.${item.id}.sourceBalanceCoversTransfer`, "Source balance must cover transfer.");
    }

    if (item.destinationBalanceUnchanged !== true) {
      issue(`verification.transactionChecks.${item.id}.destinationBalanceUnchanged`, "Destination balance must remain unchanged.");
    }

    if (item.fundingTransferSubmitted !== false || item.fundingTransferExecuted !== false) {
      issue(`verification.transactionChecks.${item.id}.flags`, "Funding transfer submitted/executed flags must remain false.");
    }
  }

  for (const key of [
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
    if (verification.flags?.[key] !== false) {
      issue(`verification.flags.${key}`, `${key} must remain false.`);
    }
  }

  if (payload.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_FUNDS_MOVED") {
    issue("payload.status", "Generated payload must be present.");
  }

  if (payloadStatus.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_FUNDS_MOVED") {
    issue("payloadStatus.status", "Payload status must show generated/not submitted/no funds moved.");
  }

  if (payloadApproval.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_PAYLOAD_GENERATION_APPROVED_NO_PAYLOAD_NO_FUNDS_MOVED") {
    issue("payloadApproval.status", "Payload generation approval must be recorded.");
  }

  if (transferApproval.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_APPROVED_NO_PAYLOAD_NO_FUNDS_MOVED") {
    issue("transferApproval.status", "Funding transfer approval must be recorded.");
  }

  if (requirementsStatus.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_REQUIREMENTS_REVIEW_COMPLETE_NO_FUNDS_MOVED") {
    issue("requirementsStatus.status", "Funding transfer requirements review must be complete.");
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
  schema: "astra-dex-liquidity-funding-transfer-safe-payload-verification-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  verificationFile: verificationRelativePath,
  payloadFile: payloadRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
