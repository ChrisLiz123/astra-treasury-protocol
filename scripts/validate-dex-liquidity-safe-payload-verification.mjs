import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const verificationRelativePath = "reports/dex-liquidity-safe-payload-verification/dex-liquidity-safe-payload-verification.json";
const safePayloadRelativePath = "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json";
const transactionBuilderRelativePath = "reports/dex-liquidity-provision/payload/liquidity-safe-transaction-builder.json";

const requiredFiles = [
  "configs/dex-liquidity-safe-payload-verification.config.json",
  "docs/dex-liquidity-safe-payload-verification/DEX_LIQUIDITY_SAFE_PAYLOAD_VERIFICATION.md",
  "docs/dex-liquidity-safe-payload-verification/DEX_LIQUIDITY_SAFE_PAYLOAD_VERIFICATION_CHECKLIST.md",
  "docs/dex-liquidity-safe-payload-verification/DEX_LIQUIDITY_SAFE_PAYLOAD_VERIFICATION_BOUNDARIES.md",
  "docs/dex-liquidity-safe-payload-verification/DEX_LIQUIDITY_SAFE_PAYLOAD_VERIFICATION_RUNBOOK.md",
  "scripts/verify-dex-liquidity-safe-payload.mjs",
  verificationRelativePath,
  safePayloadRelativePath,
  transactionBuilderRelativePath,
  "public-docs/dex-liquidity-safe-payload-status.json",
  "public-docs/dex-liquidity-safe-payload-generation-approval-status.json",
  "public-docs/dex-liquidity-mint-calldata-verification-status.json",
  "reports/dex-liquidity-mint-calldata-verification/dex-liquidity-mint-calldata-verification.json",
  "reports/dex-liquidity-provision/payload/liquidity-mint-calldata.json",
  "public-docs/dex-pool-creation-post-execution-verification-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/mainnet-execution-status.json"
];

const forbiddenFiles = [
  "reports/dex-liquidity-safe-submission-live/dex-liquidity-safe-submission-live-record.json",
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
    issue(file, "Missing required liquidity Safe payload verification file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden submission/live/liquidity/public-trading artifact exists. Payload verification must not submit or add liquidity.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-safe-payload-verification.config.json");
  const verification = readJson(verificationRelativePath);
  const payload = readJson(safePayloadRelativePath);
  const builder = readJson(transactionBuilderRelativePath);
  const payloadStatus = readJson("public-docs/dex-liquidity-safe-payload-status.json");
  const approvalStatus = readJson("public-docs/dex-liquidity-safe-payload-generation-approval-status.json");
  const calldataVerificationStatus = readJson("public-docs/dex-liquidity-mint-calldata-verification-status.json");
  const calldataVerification = readJson("reports/dex-liquidity-mint-calldata-verification/dex-liquidity-mint-calldata-verification.json");
  const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.verificationOnly !== true) {
    issue("config.verificationOnly", "Config must be verification-only.");
  }

  if (config.liquiditySafePayloadVerified !== true) {
    issue("config.liquiditySafePayloadVerified", "Config must show Safe payload verified.");
  }

  if (verification.status !== "DEX_LIQUIDITY_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("verification.status", `Unexpected verification status: ${verification.status}`);
  }

  if (verification.liquiditySafePayloadGenerated !== true || verification.liquiditySafePayloadVerified !== true) {
    issue("verification.payloadFlags", "Safe payload must be generated and verified.");
  }

  if (verification.safePayloadHashVerified !== true || verification.transactionBuilderHashVerified !== true || verification.transactionDataVerified !== true) {
    issue("verification.hashDataFlags", "Payload hash, builder hash, and transaction data must verify.");
  }

  if (!isAddress(verification.liquiditySafeAddress) || !isAddress(verification.nonfungiblePositionManager)) {
    issue("verification.addresses", "Liquidity Safe and NonfungiblePositionManager must be valid.");
  }

  if (verification.safePayloadHash !== payload.safePayloadHash) {
    issue("verification.safePayloadHash", "Verification Safe payload hash must match payload.");
  }

  if (verification.transactionBuilderHash !== builder.transactionBuilderHash) {
    issue("verification.transactionBuilderHash", "Verification Transaction Builder hash must match builder.");
  }

  if (verification.liveChecks?.safeCodePresent !== true || verification.liveChecks?.npmCodePresent !== true) {
    issue("verification.liveChecks.contractCode", "Safe and NPM contract code must be present.");
  }

  if (verification.liveChecks?.poolLiquidityVerifiedZero !== true || String(verification.liveChecks?.poolLiquidity || "") !== "0") {
    issue("verification.liveChecks.poolLiquidity", "Pool liquidity must be zero.");
  }

  if (verification.liveChecks?.token0?.balanceCoversDesired !== true || verification.liveChecks?.token0?.allowanceCoversDesired !== true) {
    issue("verification.liveChecks.token0", "Token0 balance and allowance must cover desired amount.");
  }

  if (verification.liveChecks?.token1?.balanceCoversDesired !== true || verification.liveChecks?.token1?.allowanceCoversDesired !== true) {
    issue("verification.liveChecks.token1", "Token1 balance and allowance must cover desired amount.");
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
    if (verification[key] !== false) {
      issue(`verification.${key}`, `${key} must remain false.`);
    }
  }

  if (payloadStatus.status !== "DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("payloadStatus.status", "Payload generation status must be complete.");
  }

  if (approvalStatus.status !== "DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATION_APPROVED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("approvalStatus.status", "Payload generation approval must be recorded.");
  }

  if (calldataVerificationStatus.status !== "DEX_LIQUIDITY_MINT_CALLDATA_VERIFIED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("calldataVerificationStatus.status", "Calldata verification must be complete.");
  }

  if (calldataVerification.liquidityMintCalldataVerified !== true) {
    issue("calldataVerification.liquidityMintCalldataVerified", "Calldata verification record must show verified.");
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
  schema: "astra-dex-liquidity-safe-payload-verification-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  verificationFile: verificationRelativePath,
  safePayloadFile: safePayloadRelativePath,
  transactionBuilderFile: transactionBuilderRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
