import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const verificationRelativePath = "reports/dex-pool-creation-post-execution-verification/dex-pool-creation-post-execution-verification.json";

const requiredFiles = [
  "configs/dex-pool-creation-post-execution-verification.config.json",
  "docs/dex-pool-creation-post-execution-verification/DEX_POOL_CREATION_POST_EXECUTION_VERIFICATION.md",
  "docs/dex-pool-creation-post-execution-verification/DEX_POOL_CREATION_POST_EXECUTION_CHECKLIST.md",
  "docs/dex-pool-creation-post-execution-verification/DEX_POOL_CREATION_POST_EXECUTION_BOUNDARIES.md",
  "docs/dex-pool-creation-post-execution-verification/DEX_POOL_CREATION_POST_EXECUTION_RUNBOOK.md",
  "scripts/verify-dex-pool-creation-post-execution.mjs",
  verificationRelativePath,
  "reports/dex-pool-creation-safe-execution-live/dex-pool-creation-safe-execution-live-record.json",
  "reports/dex-pool-creation/live/dex-pool-created.json",
  "public-docs/dex-pool-creation-safe-execution-live-status.json",
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

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || "").trim());
}

function isZeroAddress(value) {
  return String(value || "").toLowerCase() === "0x0000000000000000000000000000000000000000";
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required post-execution pool verification file.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-pool-creation-post-execution-verification.config.json");
  const verification = readJson(verificationRelativePath);
  const executionLive = readJson("public-docs/dex-pool-creation-safe-execution-live-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.verificationPrepared !== true || config.verificationOnly !== true) {
    issue("config", "Post-execution verification must be prepared and verification-only.");
  }

  if (verification.status !== "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("verification.status", `Unexpected verification status: ${verification.status}`);
  }

  const pv = verification.poolVerification || {};

  if (!isAddress(pv.recordedPoolAddress) || isZeroAddress(pv.recordedPoolAddress)) {
    issue("poolVerification.recordedPoolAddress", "Recorded pool address must be non-zero.");
  }

  if (pv.factoryGetPoolMatchesRecorded !== true) {
    issue("poolVerification.factoryGetPoolMatchesRecorded", "Factory getPool must match recorded pool.");
  }

  if (pv.poolCodePresent !== true) {
    issue("poolVerification.poolCodePresent", "Pool contract code must be present.");
  }

  if (pv.token0Verified !== true || pv.token1Verified !== true || pv.feeVerified !== true) {
    issue("poolVerification.metadata", "Pool token0/token1/fee metadata must verify.");
  }

  if (pv.slot0Initialized !== true) {
    issue("poolVerification.slot0Initialized", "Pool slot0 must be initialized.");
  }

  if (pv.slot0SqrtMatchesReviewed !== true) {
    issue("poolVerification.slot0SqrtMatchesReviewed", "Pool sqrtPriceX96 must match reviewed value.");
  }

  if (pv.liquidityVerifiedZero !== true || String(pv.poolLiquidity) !== "0") {
    issue("poolVerification.poolLiquidity", "Pool liquidity must be zero.");
  }

  for (const key of [
    "liquidityProvisionApproved",
    "liquidityAdded",
    "fundsMoved",
    "publicTradingApproved",
    "publicTradingLinkApproved",
    "buyPageActivated",
    "treasuryFundingApproved",
    "fullLaunchApproved"
  ]) {
    if (verification.flags?.[key] !== false) {
      issue(`verification.flags.${key}`, `${key} must remain false.`);
    }
  }

  if (executionLive.status !== "DEX_POOL_CREATION_SAFE_EXECUTION_LIVE_RECORDED_POOL_CREATED_NO_LIQUIDITY") {
    issue("executionLive.status", "Safe execution live must be recorded.");
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
  schema: "astra-dex-pool-creation-post-execution-verification-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  verificationFile: verificationRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
