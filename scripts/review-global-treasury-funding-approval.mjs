import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const reportDir = path.join(root, "reports", "global-treasury-funding-approval-review");
const reviewFile = path.join(reportDir, "global-treasury-funding-approval-review.json");
const configFile = path.join(root, "configs", "global-treasury-funding-approval-review.config.json");

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

function readJson(relativePath, fallback = undefined) {
  const full = path.join(root, relativePath);

  if (!fs.existsSync(full)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required file: ${relativePath}`);
  }

  return JSON.parse(fs.readFileSync(full, "utf8"));
}

function readJsonPath(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function sha256Json(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value, null, 2) + "\n").digest("hex");
}

function readRuntimeEnvValue(key) {
  const runtimeFile = path.join(root, ".runtime", "mainnet-monitor.env");

  if (!fs.existsSync(runtimeFile)) return "";

  for (const line of fs.readFileSync(runtimeFile, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [rawKey, ...rest] = trimmed.split("=");
    if (rawKey.trim() === key) return rest.join("=").trim().replace(/^["']|["']$/g, "");
  }

  return "";
}

function boolValue(...values) {
  for (const value of values) {
    if (typeof value === "boolean") return value;
    if (String(value).toLowerCase() === "true") return true;
    if (String(value).toLowerCase() === "false") return false;
  }
  return undefined;
}

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || "").trim());
}

function isTxHash(value) {
  return /^0x[0-9a-fA-F]{64}$/.test(String(value || "").trim());
}

function isHttpUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function sameAddress(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

function encodeUint256(value) {
  const n = BigInt(String(value));
  return n.toString(16).padStart(64, "0");
}

function decodeUint(value) {
  const clean = String(value || "").replace(/^0x/i, "").padStart(64, "0");
  return BigInt(`0x${clean}`);
}

function decodeAddressFromWord(word) {
  return `0x${String(word || "").replace(/^0x/i, "").padStart(64, "0").slice(-40)}`;
}

async function rpcCall(rpcUrl, method, params) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({jsonrpc: "2.0", id: 1, method, params})
  });

  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);

  const body = await response.json();

  if (body.error) throw new Error(body.error.message || JSON.stringify(body.error));

  return body.result;
}

async function readPoolLiquidity(rpcUrl, poolAddress) {
  const result = await rpcCall(rpcUrl, "eth_call", [
    {to: poolAddress, data: "0x1a686502"},
    "latest"
  ]);

  return decodeUint(result).toString();
}

async function readOwnerOf(rpcUrl, nftAddress, tokenId) {
  const data = "0x6352211e" + encodeUint256(tokenId);
  const result = await rpcCall(rpcUrl, "eth_call", [
    {to: nftAddress, data},
    "latest"
  ]);

  return decodeAddressFromWord(result);
}

function requireStatus(name, value, expected) {
  if (value !== expected) {
    issue(name, `Expected ${expected}, got ${value || "UNKNOWN"}.`);
  }
}

fs.mkdirSync(reportDir, { recursive: true });

const fullLaunchLiveStatus = readJson("public-docs/full-launch-live-status.json");
const fullLaunchLive = readJson("reports/full-launch-live/full-launch-live-record.json");
const fullLaunchLiveEvidence = readJson("reports/full-launch/live/full-launch-live.json");
const fullLaunchStatus = readJson("public-docs/full-launch-status.json");
const fullLaunchApprovalStatus = readJson("public-docs/full-launch-approval-status.json");
const fullLaunchApproval = readJson("reports/full-launch-approval/full-launch-approval-record.json");
const buyActivationStatus = readJson("public-docs/dex-buy-page-activation-live-status.json");
const buyActivation = readJson("reports/dex-buy-page-activation-live/dex-buy-page-activation-live-record.json");
const publicTradingLiveStatus = readJson("public-docs/dex-public-trading-live-status.json");
const publicTradingLive = readJson("reports/dex-public-trading/live/public-trading-live.json");
const postStatus = readJson("public-docs/dex-liquidity-post-execution-verification-status.json");
const postVerification = readJson("reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json");
const liquidityAdded = readJson("reports/dex-liquidity-provision/live/liquidity-added.json");
const positionMinted = readJson("reports/dex-liquidity-provision/live/position-minted.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json", {});
const monitor = readJson("public-docs/mainnet-monitor-status.json", {});
const alerts = readJson("public-docs/mainnet-alerts-status.json", {});
const incidents = readJson("public-docs/incident-summary.json", {});

requireStatus("fullLaunchLiveStatus.status", fullLaunchLiveStatus.status, "FULL_LAUNCH_LIVE_PUBLIC_FINALIZATION_RECORDED_BUY_PAGE_ACTIVE_PUBLIC_TRADING_LIVE_TREASURY_FUNDING_NOT_APPROVED");
requireStatus("fullLaunchLive.status", fullLaunchLive.status, "FULL_LAUNCH_LIVE_PUBLIC_FINALIZATION_RECORDED_BUY_PAGE_ACTIVE_PUBLIC_TRADING_LIVE_TREASURY_FUNDING_NOT_APPROVED");
requireStatus("fullLaunchLiveEvidence.status", fullLaunchLiveEvidence.status, "FULL_LAUNCH_LIVE_BUY_PAGE_ACTIVE_PUBLIC_TRADING_LIVE_TREASURY_FUNDING_NOT_APPROVED");
requireStatus("fullLaunchStatus.status", fullLaunchStatus.status, "FULL_LAUNCH_LIVE_BUY_PAGE_ACTIVE_PUBLIC_TRADING_LIVE_TREASURY_FUNDING_NOT_APPROVED");
requireStatus("fullLaunchApprovalStatus.status", fullLaunchApprovalStatus.status, "FULL_LAUNCH_APPROVED_BUY_PAGE_ACTIVE_PUBLIC_TRADING_LIVE_TREASURY_FUNDING_NOT_APPROVED");
requireStatus("fullLaunchApproval.status", fullLaunchApproval.status, "FULL_LAUNCH_APPROVED_BUY_PAGE_ACTIVE_PUBLIC_TRADING_LIVE_TREASURY_FUNDING_NOT_APPROVED");
requireStatus("buyActivationStatus.status", buyActivationStatus.status, "DEX_BUY_PAGE_ACTIVATION_LIVE_RECORDED_BUY_PAGE_ACTIVATED_PUBLIC_TRADING_LIVE_FULL_LAUNCH_NOT_APPROVED");
requireStatus("buyActivation.status", buyActivation.status, "DEX_BUY_PAGE_ACTIVATION_LIVE_RECORDED_BUY_PAGE_ACTIVATED_PUBLIC_TRADING_LIVE_FULL_LAUNCH_NOT_APPROVED");
requireStatus("publicTradingLiveStatus.status", publicTradingLiveStatus.status, "DEX_PUBLIC_TRADING_LIVE_BUY_PAGE_ACTIVATED_FULL_LAUNCH_NOT_APPROVED");
requireStatus("publicTradingLive.status", publicTradingLive.status, "DEX_PUBLIC_TRADING_LIVE_BUY_PAGE_ACTIVATED_FULL_LAUNCH_NOT_APPROVED");
requireStatus("postStatus.status", postStatus.status, "DEX_LIQUIDITY_POST_EXECUTION_VERIFIED_LIQUIDITY_ADDED_POSITION_MINTED_NO_PUBLIC_TRADING");
requireStatus("postVerification.status", postVerification.status, "DEX_LIQUIDITY_POST_EXECUTION_VERIFIED_LIQUIDITY_ADDED_POSITION_MINTED_NO_PUBLIC_TRADING");
requireStatus("liquidityAdded.status", liquidityAdded.status, "DEX_LIQUIDITY_ADDED_POSITION_MINTED_NO_PUBLIC_TRADING");
requireStatus("positionMinted.status", positionMinted.status, "DEX_LIQUIDITY_POSITION_MINTED_NO_PUBLIC_TRADING");

if (fullLaunchLive.fullLaunchLive !== true || fullLaunchLive.fullLaunchApproved !== true) {
  issue("fullLaunchLive.flags", "Full launch must be approved and live.");
}

if (fullLaunchStatus.fullLaunchLive !== true || fullLaunchStatus.fullLaunchApproved !== true) {
  issue("fullLaunchStatus.flags", "Public full launch status must show approved and live.");
}

if (buyActivation.buyPageActivated !== true || publicTradingLive.publicTradingLive !== true) {
  issue("publicLive.flags", "Buy page and public trading must be live.");
}

if (!isHttpUrl(fullLaunchLive.launchPageUrl) || !isHttpUrl(fullLaunchLive.buyPageUrl) || !isHttpUrl(fullLaunchLive.tradingLinkUrl)) {
  issue("fullLaunchLive.urls", "Launch, buy, and trading links must be valid.");
}

if (!fs.existsSync(path.join(root, "public-docs", "launch.html"))) {
  issue("public-docs/launch.html", "Launch page HTML must exist.");
}

if (!fs.existsSync(path.join(root, "public-docs", "buy.html"))) {
  issue("public-docs/buy.html", "Buy page HTML must exist.");
}

if (postVerification.liquidityPostExecutionVerified !== true || postVerification.liquidityAdded !== true || postVerification.positionMinted !== true) {
  issue("postVerification.flags", "Post-execution liquidity verification must be complete.");
}

if (!isAddress(postVerification.liquiditySafeAddress) || !isTxHash(postVerification.executionTxHash)) {
  issue("postVerification.identifiers", "Liquidity Safe address and execution tx hash must be valid.");
}

if (BigInt(String(postVerification.poolLiquidityLive || "0")) <= 0n) {
  issue("postVerification.poolLiquidityLive", "Pool liquidity must be greater than zero.");
}

if (!sameAddress(postVerification.positionOwnerLive, postVerification.liquiditySafeAddress)) {
  issue("postVerification.positionOwnerLive", "Position owner must be liquidity Safe.");
}

const treasuryFundingApproved = boolValue(
  treasuryFunding.treasuryFundingApproved,
  treasuryFunding.summary?.treasuryFundingApproved,
  treasuryFunding.globalTreasuryFundingApproved,
  treasuryFunding.summary?.globalTreasuryFundingApproved,
  fullLaunchStatus.treasuryFundingApproved
);

const treasuryFundingExecuted = boolValue(
  treasuryFunding.treasuryFundingExecuted,
  treasuryFunding.summary?.treasuryFundingExecuted,
  treasuryFunding.globalTreasuryFundingExecuted,
  treasuryFunding.summary?.globalTreasuryFundingExecuted,
  fullLaunchStatus.treasuryFundingExecuted
);

if (treasuryFundingApproved !== false) {
  issue("treasuryFundingApproved", "Global treasury funding must remain not approved.");
}

if (treasuryFundingExecuted !== false) {
  issue("treasuryFundingExecuted", "Global treasury funding must remain not executed.");
}

const forbiddenFiles = [
  "reports/global-treasury-funding-approval/global-treasury-funding-approval-record.json",
  "public-docs/global-treasury-funding-approval-status.json",
  "reports/global-treasury-funding-live/global-treasury-funding-live-record.json",
  "public-docs/global-treasury-funding-live-status.json",
  "reports/treasury-funding/live/treasury-funding-executed.json",
  "public-docs/treasury-funding-executed-status.json"
];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden global treasury funding approval/execution artifact exists.");
  }
}

if (monitor.status && monitor.status !== "PASS") {
  issue("monitor.status", `Expected PASS if monitor status is present, got ${monitor.status}.`);
}

if (alerts.responseRequired === true) {
  issue("alerts.responseRequired", "Alerts must not require response.");
}

if (Number(incidents?.summary?.active || 0) !== 0) {
  issue("incidents.summary.active", "Active incidents must be zero.");
}

const rpcUrl =
  process.env.GLOBAL_TREASURY_FUNDING_APPROVAL_REVIEW_RPC_URL ||
  process.env.FULL_LAUNCH_LIVE_RPC_URL ||
  process.env.DEX_LIQUIDITY_POST_EXECUTION_VERIFICATION_RPC_URL ||
  process.env.MAINNET_MONITOR_RPC_URL ||
  readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

if (!String(rpcUrl || "").startsWith("https://")) {
  issue("GLOBAL_TREASURY_FUNDING_APPROVAL_REVIEW_RPC_URL", "RPC URL must be available and start with https://.");
}

let poolLiquidityLive = postVerification.poolLiquidityLive;
let positionOwnerLive = postVerification.positionOwnerLive;

if (issues.length === 0) {
  try {
    poolLiquidityLive = await readPoolLiquidity(rpcUrl, postVerification.poolAddress);

    if (BigInt(String(poolLiquidityLive || "0")) <= 0n) {
      issue("poolLiquidityLive", "Live pool liquidity must remain greater than zero.");
    }

    positionOwnerLive = await readOwnerOf(rpcUrl, postVerification.nonfungiblePositionManager, postVerification.positionTokenId);

    if (!sameAddress(positionOwnerLive, postVerification.liquiditySafeAddress)) {
      issue("positionOwnerLive", "Position owner must remain liquidity Safe.");
    }
  } catch (error) {
    issue("globalTreasuryFundingApprovalReviewLiveChecks", error.message);
  }
}

if (issues.length > 0) {
  const failed = {
    schema: "astra-global-treasury-funding-approval-review-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_GLOBAL_TREASURY_FUNDING_APPROVAL_REVIEW_FAILED",
    issues
  };

  writeJson(reviewFile, failed);
  console.log(JSON.stringify(failed, null, 2));
  process.exit(1);
}

const reviewedAt = new Date().toISOString();

const review = {
  schema: "astra-global-treasury-funding-approval-review-v0.1",
  reviewedAt,
  status: "GLOBAL_TREASURY_FUNDING_APPROVAL_REVIEW_COMPLETE_FULL_LAUNCH_LIVE_TREASURY_FUNDING_NOT_APPROVED",
  reviewOnly: true,
  fullLaunchLive: true,
  fullLaunchApproved: true,
  launchPageUrl: fullLaunchLive.launchPageUrl,
  buyPageUrl: fullLaunchLive.buyPageUrl,
  tradingLinkUrl: fullLaunchLive.tradingLinkUrl,
  buyPageActivated: true,
  publicTradingLive: true,
  publicTradingApproved: true,
  publicTradingLinkApproved: true,
  liquiditySafeAddress: postVerification.liquiditySafeAddress,
  executionTxHash: postVerification.executionTxHash,
  poolAddress: postVerification.poolAddress,
  poolLiquidityLive,
  positionTokenId: String(postVerification.positionTokenId),
  positionOwnerLive,
  dexLiquidityPostExecutionVerified: true,
  liquiditySafeTransactionExecuted: true,
  liquidityAdded: true,
  positionMinted: true,
  treasuryFundingApproved: false,
  treasuryFundingExecuted: false,
  fundsMoved: false,
  readinessChecks: {
    fullLaunchLiveRecorded: true,
    fullLaunchApproved: true,
    buyPageActivated: true,
    publicTradingLive: true,
    dexLiquidityPostExecutionVerified: true,
    liquidityAdded: true,
    positionMinted: true,
    poolLiquidityGreaterThanZero: true,
    positionOwnerVerified: true,
    treasuryFundingStillNotApproved: true,
    treasuryFundingStillNotExecuted: true,
    fundsStillNotMoved: true
  },
  readinessNotes: [
    "Full launch is live and public finalization is recorded.",
    "Buy page is active and public trading is live.",
    "DEX liquidity and position evidence are verified.",
    "Global treasury funding remains not approved.",
    "Global treasury funding remains not executed.",
    "A separate global treasury funding approval milestone is required before funding payloads or transfers."
  ],
  globalTreasuryFundingApprovalReviewComplete: true,
  readyForGlobalTreasuryFundingApproval: true,
  requiredBeforeGlobalTreasuryFundingApproval: {
    globalTreasuryFundingApprovalReviewComplete: true,
    readyForGlobalTreasuryFundingApproval: true,
    fullLaunchLive: true,
    fullLaunchApproved: true,
    buyPageActivated: true,
    publicTradingLive: true,
    dexLiquidityPostExecutionVerified: true,
    liquidityAdded: true,
    positionMinted: true,
    treasuryFundingApproved: false,
    treasuryFundingExecuted: false,
    globalTreasuryFundingApprovalRecorded: false,
    fundingPayloadGenerated: false,
    fundsMoved: false
  },
  safety: {
    reviewOnly: true,
    approvesGlobalTreasuryFunding: false,
    executesGlobalTreasuryFunding: false,
    generatesFundingPayload: false,
    movesFunds: false
  },
  issues: []
};

review.reviewHash = sha256Json(review);

writeJson(reviewFile, review);

const config = readJsonPath(configFile);

config.status = "global-treasury-funding-approval-review-complete-full-launch-live-treasury-funding-not-approved";
config.globalTreasuryFundingApprovalReviewComplete = true;
config.readyForGlobalTreasuryFundingApproval = true;
config.fullLaunchLive = true;
config.fullLaunchApproved = true;
config.buyPageActivated = true;
config.publicTradingLive = true;
config.treasuryFundingApproved = false;
config.treasuryFundingExecuted = false;
config.reviewedGlobalTreasuryFundingApproval = {
  reviewedAt,
  launchPageUrl: review.launchPageUrl,
  buyPageUrl: review.buyPageUrl,
  liquiditySafeAddress: review.liquiditySafeAddress,
  executionTxHash: review.executionTxHash,
  poolAddress: review.poolAddress,
  poolLiquidityLive: review.poolLiquidityLive,
  positionTokenId: review.positionTokenId,
  reviewHash: review.reviewHash,
  recordFile: "reports/global-treasury-funding-approval-review/global-treasury-funding-approval-review.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-global-treasury-funding-approval-review-result-v0.1",
  checkedAt: reviewedAt,
  status: review.status,
  fullLaunchLive: true,
  buyPageActivated: true,
  publicTradingLive: true,
  poolAddress: review.poolAddress,
  poolLiquidityLive: review.poolLiquidityLive,
  positionTokenId: review.positionTokenId,
  treasuryFundingApproved: false,
  treasuryFundingExecuted: false,
  readyForGlobalTreasuryFundingApproval: true
}, null, 2));
