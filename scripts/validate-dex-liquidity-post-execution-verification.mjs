import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const verificationRelativePath = "reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json";

const requiredFiles = [
  "configs/dex-liquidity-post-execution-verification.config.json",
  "docs/dex-liquidity-post-execution-verification/DEX_LIQUIDITY_POST_EXECUTION_VERIFICATION.md",
  "docs/dex-liquidity-post-execution-verification/DEX_LIQUIDITY_POST_EXECUTION_VERIFICATION_CHECKLIST.md",
  "docs/dex-liquidity-post-execution-verification/DEX_LIQUIDITY_POST_EXECUTION_VERIFICATION_BOUNDARIES.md",
  "docs/dex-liquidity-post-execution-verification/DEX_LIQUIDITY_POST_EXECUTION_VERIFICATION_RUNBOOK.md",
  "scripts/verify-dex-liquidity-post-execution.mjs",
  verificationRelativePath,
  "reports/dex-liquidity-safe-execution-live/dex-liquidity-safe-execution-live-record.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "reports/dex-liquidity-provision/live/liquidity-safe-executed.json",
  "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  "public-docs/dex-liquidity-safe-execution-live-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json"
];

const forbiddenFiles = [
  "public-docs/dex-public-trading-live-status.json",
  "public-docs/dex-buy-page-activated-status.json",
  "public-docs/full-launch-approved-status.json"
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

function isTxHash(value) {
  return /^0x[0-9a-fA-F]{64}$/.test(String(value || "").trim());
}

function sameAddress(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required DEX liquidity post-execution verification file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden public-trading/buy-page/full-launch artifact exists.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-post-execution-verification.config.json");
  const verification = readJson(verificationRelativePath);
  const executionLive = readJson("reports/dex-liquidity-safe-execution-live/dex-liquidity-safe-execution-live-record.json");
  const executionLiveStatus = readJson("public-docs/dex-liquidity-safe-execution-live-status.json");
  const liquidityAdded = readJson("reports/dex-liquidity-provision/live/liquidity-added.json");
  const positionMinted = readJson("reports/dex-liquidity-provision/live/position-minted.json");
  const safeExecuted = readJson("reports/dex-liquidity-provision/live/liquidity-safe-executed.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");

  if (config.verificationOnly !== true) {
    issue("config.verificationOnly", "Config must be verification-only.");
  }

  if (config.liquidityPostExecutionVerified !== true || config.liquidityAdded !== true || config.positionMinted !== true) {
    issue("config.flags", "Config must show post-execution verified, liquidity added, and position minted.");
  }

  if (verification.status !== "DEX_LIQUIDITY_POST_EXECUTION_VERIFIED_LIQUIDITY_ADDED_POSITION_MINTED_NO_PUBLIC_TRADING") {
    issue("verification.status", `Unexpected verification status: ${verification.status}`);
  }

  if (verification.liquidityPostExecutionVerified !== true || verification.liquiditySafeTransactionExecuted !== true || verification.liquidityAdded !== true || verification.positionMinted !== true) {
    issue("verification.flags", "Verification must show executed, liquidity added, and position minted.");
  }

  if (!isAddress(verification.liquiditySafeAddress) || !isTxHash(verification.executionTxHash)) {
    issue("verification.identifiers", "Liquidity Safe address and execution tx hash must be valid.");
  }

  if (verification.executionTxHash !== executionLive.executionTxHash) {
    issue("verification.executionTxHash", "Verification execution tx hash must match execution-live record.");
  }

  if (verification.poolAddress !== executionLive.poolAddress) {
    issue("verification.poolAddress", "Verification pool address must match execution-live record.");
  }

  if (BigInt(String(verification.poolLiquidityLive || "0")) <= 0n) {
    issue("verification.poolLiquidityLive", "Live pool liquidity must be greater than zero.");
  }

  if (!String(verification.positionTokenId || "").match(/^\d+$/)) {
    issue("verification.positionTokenId", "Position token ID must be recorded.");
  }

  if (!isAddress(verification.positionOwnerLive) || !sameAddress(verification.positionOwnerLive, verification.liquiditySafeAddress)) {
    issue("verification.positionOwnerLive", "Position owner must be the liquidity Safe.");
  }

  if (BigInt(String(verification.positionDetails?.liquidity || "0")) <= 0n) {
    issue("verification.positionDetails.liquidity", "Position liquidity must be greater than zero.");
  }

  if (verification.checks?.safeTransactionServiceExecuted !== true || verification.checks?.executionReceiptSucceeded !== true || verification.checks?.positionDetailsMatchPayload !== true) {
    issue("verification.checks", "Execution, receipt, and position detail checks must pass.");
  }

  if (verification.publicTradingApproved !== false || verification.buyPageActivated !== false || verification.fullLaunchApproved !== false) {
    issue("verification.publicFlags", "Public trading, buy page, and full launch must remain false.");
  }

  if (executionLiveStatus.status !== "DEX_LIQUIDITY_SAFE_EXECUTION_LIVE_RECORDED_LIQUIDITY_ADDED_POSITION_MINTED_NO_PUBLIC_TRADING") {
    issue("executionLiveStatus.status", "Execution live status must be complete.");
  }

  if (liquidityAdded.liquidityAdded !== true || positionMinted.positionMinted !== true || safeExecuted.liquiditySafeTransactionExecuted !== true) {
    issue("liveArtifacts.flags", "Live artifacts must show executed, liquidity added, and position minted.");
  }

  if (String(liquidityAdded.positionTokenId) !== String(verification.positionTokenId) || String(positionMinted.positionTokenId) !== String(verification.positionTokenId)) {
    issue("liveArtifacts.positionTokenId", "Live artifacts must match verification position token ID.");
  }

  if (liquidityAdded.executionTxHash !== verification.executionTxHash || positionMinted.executionTxHash !== verification.executionTxHash || safeExecuted.executionTxHash !== verification.executionTxHash) {
    issue("liveArtifacts.executionTxHash", "Live artifacts must match verification execution tx hash.");
  }

  if (fullLaunch.fullLaunchApproved !== false) {
    issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
  }

  if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
    issue("treasuryFunding", "Global treasury funding must remain not approved/executed.");
  }

  if (capabilityMatrix.allCapabilityApprovalsFalse !== true) {
    issue("capabilityMatrix", "Capability approvals must remain false.");
  }
}

const result = {
  schema: "astra-dex-liquidity-post-execution-verification-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  verificationFile: verificationRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
