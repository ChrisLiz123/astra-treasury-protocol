import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const recordRelativePath = "reports/dex-liquidity-safe-payload-generation-approval/dex-liquidity-safe-payload-generation-approval-record.json";
const recordPath = path.join(root, recordRelativePath);

const requiredFiles = [
  "configs/dex-liquidity-safe-payload-generation-approval.config.json",
  "docs/dex-liquidity-safe-payload-generation-approval/DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATION_APPROVAL.md",
  "docs/dex-liquidity-safe-payload-generation-approval/DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATION_APPROVAL_CHECKLIST.md",
  "docs/dex-liquidity-safe-payload-generation-approval/DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATION_APPROVAL_BOUNDARIES.md",
  "docs/dex-liquidity-safe-payload-generation-approval/DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATION_APPROVAL_RUNBOOK.md",
  "scripts/record-dex-liquidity-safe-payload-generation-approval.mjs",
  "public-docs/dex-liquidity-mint-calldata-verification-status.json",
  "reports/dex-liquidity-mint-calldata-verification/dex-liquidity-mint-calldata-verification.json",
  "public-docs/dex-liquidity-mint-calldata-status.json",
  "reports/dex-liquidity-provision/payload/liquidity-mint-calldata.json",
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
  "public-docs/dex-liquidity-safe-payload-status.json",
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
    issue(file, "Missing required liquidity Safe payload generation approval file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden liquidity Safe payload/liquidity/public-trading artifact exists. Approval must not generate payload or add liquidity.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-safe-payload-generation-approval.config.json");
  const approvalRecordPresent = fs.existsSync(recordPath);

  const verificationStatus = readJson("public-docs/dex-liquidity-mint-calldata-verification-status.json");
  const verification = readJson("reports/dex-liquidity-mint-calldata-verification/dex-liquidity-mint-calldata-verification.json");
  const calldataStatus = readJson("public-docs/dex-liquidity-mint-calldata-status.json");
  const allowanceStatus = readJson("public-docs/dex-liquidity-token-approval-post-execution-allowances-status.json");
  const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.approvalPrepared !== true || config.approvalOnly !== true) {
    issue("config", "Config must be prepared and approval-only.");
  }

  if (config.liquiditySafePayloadGenerationApprovalRecorded !== approvalRecordPresent) {
    issue("config.liquiditySafePayloadGenerationApprovalRecorded", "Config approval flag must match record presence.");
  }

  if (config.liquiditySafePayloadGenerationApproved !== approvalRecordPresent) {
    issue("config.liquiditySafePayloadGenerationApproved", "Config approved flag must be true only after record exists.");
  }

  for (const key of [
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

  if (verificationStatus.status !== "DEX_LIQUIDITY_MINT_CALLDATA_VERIFIED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("verificationStatus.status", "Mint calldata verification must be complete.");
  }

  if (verificationStatus.summary?.liquidityMintCalldataVerified !== true || verificationStatus.summary?.calldataHashVerified !== true || verificationStatus.summary?.decodedMintParamsVerified !== true) {
    issue("verificationStatus.summary", "Mint calldata must be verified.");
  }

  if (verificationStatus.summary?.liquiditySafePayloadGenerated !== false || verificationStatus.summary?.liquidityAdded !== false) {
    issue("verificationStatus.summary.liquidityFlags", "Verification status must show no Safe payload and no liquidity.");
  }

  if (verification.status !== "DEX_LIQUIDITY_MINT_CALLDATA_VERIFIED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("verification.status", "Verification record must be complete.");
  }

  if (!isAddress(verification.liquiditySafeAddress) || !isAddress(verification.nonfungiblePositionManager)) {
    issue("verification.addresses", "Liquidity Safe and NonfungiblePositionManager must be valid.");
  }

  if (verification.liveChecks?.token0?.balanceCoversDesired !== true || verification.liveChecks?.token0?.allowanceCoversDesired !== true) {
    issue("verification.liveChecks.token0", "Token0 balance and allowance must cover desired amount.");
  }

  if (verification.liveChecks?.token1?.balanceCoversDesired !== true || verification.liveChecks?.token1?.allowanceCoversDesired !== true) {
    issue("verification.liveChecks.token1", "Token1 balance and allowance must cover desired amount.");
  }

  if (calldataStatus.status !== "DEX_LIQUIDITY_MINT_CALLDATA_GENERATED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("calldataStatus.status", "Calldata generation must be complete.");
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

  if (approvalRecordPresent) {
    const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));

    if (record.schema !== "astra-dex-liquidity-safe-payload-generation-approval-record-v0.1") {
      issue("record.schema", "Invalid approval record schema.");
    }

    if (record.status !== "DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATION_APPROVED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
      issue("record.status", "Unexpected approval record status.");
    }

    if (record.liquiditySafePayloadGenerationApproved !== true || record.liquiditySafePayloadGenerationApprovalRecorded !== true) {
      issue("record.approvalFlags", "Approval record must show generation approved/recorded.");
    }

    if (!isAddress(record.liquiditySafeAddress) || !isAddress(record.nonfungiblePositionManager)) {
      issue("record.addresses", "Record liquidity Safe and NonfungiblePositionManager must be valid.");
    }

    if (record.calldataHash !== verification.calldataHash || record.verificationHash !== verification.verificationHash) {
      issue("record.hashes", "Record calldata/verification hashes must match verification record.");
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
      if (record[key] !== false) {
        issue(`record.${key}`, `${key} must remain false.`);
      }
    }
  }
}

const result = {
  schema: "astra-dex-liquidity-safe-payload-generation-approval-validation-v0.1",
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
