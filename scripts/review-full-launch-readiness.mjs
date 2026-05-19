import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const reportDir = path.join(root, "reports", "full-launch-readiness-review");
const reviewFile = path.join(reportDir, "full-launch-readiness-review.json");
const configFile = path.join(root, "configs", "full-launch-readiness-review.config.json");

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

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || "").trim());
}

function isTxHash(value) {
  return /^0x[0-9a-fA-F]{64}$/.test(String(value || "").trim());
}

function sameAddress(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

function isHttpUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
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

const buyActivationStatus = readJson("public-docs/dex-buy-page-activation-live-status.json");
const buyActivation = readJson("reports/dex-buy-page-activation-live/dex-buy-page-activation-live-record.json");
const buyPageActivatedPublic = readJson("public-docs/dex-buy-page-activated-status.json");
const publicTradingLivePublic = readJson("public-docs/dex-public-trading-live-status.json");
const buyPageActivated = readJson("reports/dex-buy-page/live/buy-page-activated.json");
const publicTradingLive = readJson("reports/dex-public-trading/live/public-trading-live.json");
const buyActivationApprovalStatus = readJson("public-docs/dex-buy-page-activation-approval-status.json");
const buyActivationApproval = readJson("reports/dex-buy-page-activation-approval/dex-buy-page-activation-approval-record.json");
const linkApprovalStatus = readJson("public-docs/dex-public-trading-link-approval-status.json");
const linkApproval = readJson("reports/dex-public-trading-link-approval/dex-public-trading-link-approval-record.json");
const tradingApprovalStatus = readJson("public-docs/dex-public-trading-approval-status.json");
const tradingApproval = readJson("reports/dex-public-trading-approval/dex-public-trading-approval-record.json");
const postStatus = readJson("public-docs/dex-liquidity-post-execution-verification-status.json");
const postVerification = readJson("reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json");
const liquidityAdded = readJson("reports/dex-liquidity-provision/live/liquidity-added.json");
const positionMinted = readJson("reports/dex-liquidity-provision/live/position-minted.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json", {});
const alerts = readJson("public-docs/mainnet-alerts-status.json", {});
const incidents = readJson("public-docs/incident-summary.json", {});

requireStatus("buyActivationStatus.status", buyActivationStatus.status, "DEX_BUY_PAGE_ACTIVATION_LIVE_RECORDED_BUY_PAGE_ACTIVATED_PUBLIC_TRADING_LIVE_FULL_LAUNCH_NOT_APPROVED");
requireStatus("buyActivation.status", buyActivation.status, "DEX_BUY_PAGE_ACTIVATION_LIVE_RECORDED_BUY_PAGE_ACTIVATED_PUBLIC_TRADING_LIVE_FULL_LAUNCH_NOT_APPROVED");
requireStatus("buyPageActivated.status", buyPageActivated.status, "DEX_BUY_PAGE_ACTIVATED_PUBLIC_TRADING_LIVE_FULL_LAUNCH_NOT_APPROVED");
requireStatus("publicTradingLive.status", publicTradingLive.status, "DEX_PUBLIC_TRADING_LIVE_BUY_PAGE_ACTIVATED_FULL_LAUNCH_NOT_APPROVED");
requireStatus("buyActivationApprovalStatus.status", buyActivationApprovalStatus.status, "DEX_BUY_PAGE_ACTIVATION_APPROVED_PUBLIC_TRADING_LINK_APPROVED_BUY_PAGE_NOT_ACTIVATED_FULL_LAUNCH_NOT_APPROVED");
requireStatus("buyActivationApproval.status", buyActivationApproval.status, "DEX_BUY_PAGE_ACTIVATION_APPROVED_PUBLIC_TRADING_LINK_APPROVED_BUY_PAGE_NOT_ACTIVATED_FULL_LAUNCH_NOT_APPROVED");
requireStatus("linkApprovalStatus.status", linkApprovalStatus.status, "DEX_PUBLIC_TRADING_LINK_APPROVED_PUBLIC_TRADING_APPROVED_BUY_PAGE_NOT_ACTIVATED_FULL_LAUNCH_NOT_APPROVED");
requireStatus("linkApproval.status", linkApproval.status, "DEX_PUBLIC_TRADING_LINK_APPROVED_PUBLIC_TRADING_APPROVED_BUY_PAGE_NOT_ACTIVATED_FULL_LAUNCH_NOT_APPROVED");
requireStatus("tradingApprovalStatus.status", tradingApprovalStatus.status, "DEX_PUBLIC_TRADING_APPROVED_LIQUIDITY_VERIFIED_BUY_PAGE_NOT_ACTIVATED_FULL_LAUNCH_NOT_APPROVED");
requireStatus("tradingApproval.status", tradingApproval.status, "DEX_PUBLIC_TRADING_APPROVED_LIQUIDITY_VERIFIED_BUY_PAGE_NOT_ACTIVATED_FULL_LAUNCH_NOT_APPROVED");
requireStatus("postStatus.status", postStatus.status, "DEX_LIQUIDITY_POST_EXECUTION_VERIFIED_LIQUIDITY_ADDED_POSITION_MINTED_NO_PUBLIC_TRADING");
requireStatus("postVerification.status", postVerification.status, "DEX_LIQUIDITY_POST_EXECUTION_VERIFIED_LIQUIDITY_ADDED_POSITION_MINTED_NO_PUBLIC_TRADING");
requireStatus("liquidityAdded.status", liquidityAdded.status, "DEX_LIQUIDITY_ADDED_POSITION_MINTED_NO_PUBLIC_TRADING");
requireStatus("positionMinted.status", positionMinted.status, "DEX_LIQUIDITY_POSITION_MINTED_NO_PUBLIC_TRADING");

if (buyActivation.buyPageActivated !== true || buyActivation.publicTradingLive !== true) {
  issue("buyActivation.flags", "Buy page activation live must show buy page activated and public trading live.");
}

if (buyActivationApproval.buyPageActivationApproved !== true) {
  issue("buyActivationApproval.buyPageActivationApproved", "Buy page activation approval must be true.");
}

if (linkApproval.publicTradingLinkApproved !== true || tradingApproval.publicTradingApproved !== true) {
  issue("publicTradingApprovals", "Public trading and public trading link must be approved.");
}

if (!isHttpUrl(buyActivation.buyPageUrl) || !isHttpUrl(buyActivation.tradingLinkUrl)) {
  issue("buyActivation.urls", "Buy page URL and trading link URL must be valid.");
}

if (!fs.existsSync(path.join(root, "public-docs/buy.html"))) {
  issue("public-docs/buy.html", "Buy page HTML must exist.");
}

if (buyPageActivatedPublic.summary?.buyPageActivated !== true || publicTradingLivePublic.summary?.publicTradingLive !== true) {
  issue("publicLiveStatuses", "Public buy-page/public-trading live statuses must show active/live.");
}

if (postVerification.liquidityPostExecutionVerified !== true || postVerification.liquidityAdded !== true || postVerification.positionMinted !== true) {
  issue("postVerification.flags", "Post-execution verification must show verified, liquidity added, and position minted.");
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

if (fullLaunch.fullLaunchApproved !== false) {
  issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
}

if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
  issue("treasuryFunding", "Global treasury funding must remain not approved/executed.");
}

if (capabilityMatrix.allCapabilityApprovalsFalse !== true) {
  issue("capabilityMatrix", "Capability approvals must remain false before full launch.");
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

const forbiddenFiles = [
  "public-docs/full-launch-approved-status.json",
  "public-docs/full-launch-live-status.json"
];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden full-launch artifact exists.");
  }
}

const rpcUrl =
  process.env.FULL_LAUNCH_READINESS_REVIEW_RPC_URL ||
  process.env.DEX_BUY_PAGE_ACTIVATION_LIVE_RPC_URL ||
  process.env.DEX_LIQUIDITY_POST_EXECUTION_VERIFICATION_RPC_URL ||
  process.env.MAINNET_MONITOR_RPC_URL ||
  readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

if (!String(rpcUrl || "").startsWith("https://")) {
  issue("FULL_LAUNCH_READINESS_REVIEW_RPC_URL", "RPC URL must be available and start with https://.");
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
    issue("fullLaunchReadinessLiveChecks", error.message);
  }
}

if (issues.length > 0) {
  const failed = {
    schema: "astra-full-launch-readiness-review-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_FULL_LAUNCH_READINESS_REVIEW_FAILED",
    issues
  };

  writeJson(reviewFile, failed);
  console.log(JSON.stringify(failed, null, 2));
  process.exit(1);
}

const reviewedAt = new Date().toISOString();

const review = {
  schema: "astra-full-launch-readiness-review-v0.1",
  reviewedAt,
  status: "FULL_LAUNCH_READINESS_REVIEW_COMPLETE_BUY_PAGE_ACTIVE_PUBLIC_TRADING_LIVE_FULL_LAUNCH_NOT_APPROVED",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  reviewOnly: true,
  buyPageUrl: buyActivation.buyPageUrl,
  tradingLinkUrl: buyActivation.tradingLinkUrl,
  liquiditySafeAddress: postVerification.liquiditySafeAddress,
  executionTxHash: postVerification.executionTxHash,
  poolAddress: postVerification.poolAddress,
  poolLiquidityLive,
  positionTokenId: String(postVerification.positionTokenId),
  positionOwnerLive,
  readinessChecks: {
    buyPageActivationLiveRecorded: true,
    buyPageActivated: true,
    publicTradingLive: true,
    publicTradingApproved: true,
    publicTradingLinkApproved: true,
    dexLiquidityPostExecutionVerified: true,
    liquiditySafeTransactionExecuted: true,
    liquidityAdded: true,
    positionMinted: true,
    poolLiquidityVerifiedGreaterThanZero: true,
    positionOwnerVerified: true,
    buyPageRouteAvailable: true,
    globalTreasuryFundingApproved: false,
    globalTreasuryFundingExecuted: false,
    fullLaunchStillNotApproved: true
  },
  readinessNotes: [
    "DEX buy page is active.",
    "Public trading is live through the approved trading link.",
    "DEX liquidity and position are verified.",
    "Full launch is still not approved.",
    "Global treasury funding remains not approved/executed.",
    "A separate full launch approval milestone is required."
  ],
  fullLaunchReadinessReviewComplete: true,
  readyForFullLaunchApproval: true,
  buyPageActivated: true,
  publicTradingLive: true,
  publicTradingApproved: true,
  publicTradingLinkApproved: true,
  dexLiquidityPostExecutionVerified: true,
  liquiditySafeTransactionExecuted: true,
  liquidityAdded: true,
  positionMinted: true,
  treasuryFundingApproved: false,
  treasuryFundingExecuted: false,
  fullLaunchApproved: false,
  requiredBeforeFullLaunchApproval: {
    fullLaunchReadinessReviewComplete: true,
    readyForFullLaunchApproval: true,
    buyPageActivated: true,
    publicTradingLive: true,
    publicTradingApproved: true,
    publicTradingLinkApproved: true,
    dexLiquidityPostExecutionVerified: true,
    liquiditySafeTransactionExecuted: true,
    liquidityAdded: true,
    positionMinted: true,
    poolLiquidityVerifiedGreaterThanZero: true,
    positionOwnerVerified: true,
    buyPageRouteAvailable: true,
    globalTreasuryFundingApproved: false,
    globalTreasuryFundingExecuted: false,
    fullLaunchApproved: false,
    fullLaunchApprovalRecorded: false,
    publicStatusUpdatePrepared: false
  },
  safety: {
    reviewOnly: true,
    approvesGlobalTreasuryFunding: false,
    approvesFullLaunch: false
  },
  issues: []
};

review.reviewHash = sha256Json(review);

writeJson(reviewFile, review);

const config = readJsonPath(configFile);

config.status = "full-launch-readiness-review-complete-buy-page-active-public-trading-live-full-launch-not-approved";
config.fullLaunchReadinessReviewComplete = true;
config.readyForFullLaunchApproval = true;
config.buyPageActivated = true;
config.publicTradingLive = true;
config.publicTradingApproved = true;
config.publicTradingLinkApproved = true;
config.dexLiquidityPostExecutionVerified = true;
config.liquiditySafeTransactionExecuted = true;
config.liquidityAdded = true;
config.positionMinted = true;
config.treasuryFundingApproved = false;
config.treasuryFundingExecuted = false;
config.fullLaunchApproved = false;
config.reviewedFullLaunchReadiness = {
  reviewedAt,
  buyPageUrl: review.buyPageUrl,
  tradingLinkUrl: review.tradingLinkUrl,
  liquiditySafeAddress: review.liquiditySafeAddress,
  executionTxHash: review.executionTxHash,
  poolAddress: review.poolAddress,
  poolLiquidityLive: review.poolLiquidityLive,
  positionTokenId: review.positionTokenId,
  reviewHash: review.reviewHash,
  recordFile: "reports/full-launch-readiness-review/full-launch-readiness-review.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-full-launch-readiness-review-result-v0.1",
  checkedAt: reviewedAt,
  status: review.status,
  buyPageUrl: review.buyPageUrl,
  tradingLinkUrl: review.tradingLinkUrl,
  poolAddress: review.poolAddress,
  poolLiquidityLive: review.poolLiquidityLive,
  positionTokenId: review.positionTokenId,
  fullLaunchReadinessReviewComplete: true,
  readyForFullLaunchApproval: true,
  buyPageActivated: true,
  publicTradingLive: true,
  fullLaunchApproved: false
}, null, 2));
