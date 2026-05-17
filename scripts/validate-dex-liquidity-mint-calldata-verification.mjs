import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const verificationRelativePath = "reports/dex-liquidity-mint-calldata-verification/dex-liquidity-mint-calldata-verification.json";
const calldataRelativePath = "reports/dex-liquidity-provision/payload/liquidity-mint-calldata.json";

const requiredFiles = [
  "configs/dex-liquidity-mint-calldata-verification.config.json",
  "docs/dex-liquidity-mint-calldata-verification/DEX_LIQUIDITY_MINT_CALLDATA_VERIFICATION.md",
  "docs/dex-liquidity-mint-calldata-verification/DEX_LIQUIDITY_MINT_CALLDATA_VERIFICATION_CHECKLIST.md",
  "docs/dex-liquidity-mint-calldata-verification/DEX_LIQUIDITY_MINT_CALLDATA_VERIFICATION_BOUNDARIES.md",
  "docs/dex-liquidity-mint-calldata-verification/DEX_LIQUIDITY_MINT_CALLDATA_VERIFICATION_RUNBOOK.md",
  "scripts/verify-dex-liquidity-mint-calldata.mjs",
  verificationRelativePath,
  calldataRelativePath,
  "public-docs/dex-liquidity-mint-calldata-status.json",
  "public-docs/dex-liquidity-mint-calldata-generation-approval-status.json",
  "public-docs/dex-liquidity-token-approval-post-execution-allowances-status.json",
  "public-docs/dex-pool-creation-post-execution-verification-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/mainnet-execution-status.json"
];

const forbiddenFiles = [
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
    issue(file, "Missing required liquidity mint calldata verification file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden liquidity/public-trading artifact exists. Calldata verification must not add liquidity or enable trading.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-mint-calldata-verification.config.json");
  const verification = readJson(verificationRelativePath);
  const calldata = readJson(calldataRelativePath);
  const calldataStatus = readJson("public-docs/dex-liquidity-mint-calldata-status.json");
  const approvalStatus = readJson("public-docs/dex-liquidity-mint-calldata-generation-approval-status.json");
  const allowanceStatus = readJson("public-docs/dex-liquidity-token-approval-post-execution-allowances-status.json");
  const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.verificationOnly !== true) {
    issue("config.verificationOnly", "Config must be verification-only.");
  }

  if (config.liquidityMintCalldataVerified !== true) {
    issue("config.liquidityMintCalldataVerified", "Config must show calldata verified.");
  }

  if (verification.status !== "DEX_LIQUIDITY_MINT_CALLDATA_VERIFIED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("verification.status", `Unexpected verification status: ${verification.status}`);
  }

  if (verification.liquidityMintCalldataGenerated !== true || verification.liquidityMintCalldataVerified !== true) {
    issue("verification.calldataFlags", "Calldata must be generated and verified.");
  }

  if (verification.calldataHashVerified !== true || verification.calldataArtifactHashVerified !== true || verification.decodedMintParamsVerified !== true) {
    issue("verification.hashDecodeFlags", "Calldata hash, artifact hash, and decoded params must verify.");
  }

  if (!isAddress(verification.liquiditySafeAddress) || !isAddress(verification.nonfungiblePositionManager)) {
    issue("verification.addresses", "Liquidity Safe and NonfungiblePositionManager must be valid.");
  }

  if (verification.calldataHash !== calldata.calldataHash) {
    issue("verification.calldataHash", "Verification calldata hash must match calldata artifact.");
  }

  if (verification.liveChecks?.nftManagerCodePresent !== true) {
    issue("verification.liveChecks.nftManagerCodePresent", "NonfungiblePositionManager code must be present.");
  }

  if (verification.liveChecks?.poolLiquidityVerifiedZero !== true || String(verification.liveChecks?.poolLiquidity || "") !== "0") {
    issue("verification.liveChecks.poolLiquidity", "Live pool liquidity must be zero.");
  }

  if (verification.liveChecks?.token0?.balanceCoversDesired !== true || verification.liveChecks?.token0?.allowanceCoversDesired !== true) {
    issue("verification.liveChecks.token0", "Token0 balance and allowance must cover desired amount.");
  }

  if (verification.liveChecks?.token1?.balanceCoversDesired !== true || verification.liveChecks?.token1?.allowanceCoversDesired !== true) {
    issue("verification.liveChecks.token1", "Token1 balance and allowance must cover desired amount.");
  }

  for (const key of [
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

  if (calldataStatus.status !== "DEX_LIQUIDITY_MINT_CALLDATA_GENERATED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("calldataStatus.status", "Calldata generation status must be complete.");
  }

  if (approvalStatus.status !== "DEX_LIQUIDITY_MINT_CALLDATA_GENERATION_APPROVED_NO_CALLDATA_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("approvalStatus.status", "Calldata generation approval must be recorded.");
  }

  if (allowanceStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_POST_EXECUTION_ALLOWANCES_VERIFIED_APPROVALS_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("allowanceStatus.status", "Post-execution allowances must be verified.");
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
  schema: "astra-dex-liquidity-mint-calldata-verification-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  verificationFile: verificationRelativePath,
  calldataFile: calldataRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
