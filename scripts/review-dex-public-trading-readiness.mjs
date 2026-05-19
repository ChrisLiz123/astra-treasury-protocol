import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const reportDir = path.join(root, "reports", "dex-public-trading-readiness-review");
const readinessFile = path.join(reportDir, "dex-public-trading-readiness-review.json");
const configFile = path.join(root, "configs", "dex-public-trading-readiness-review.config.json");

const NPM_POSITIONS_SELECTOR = "0x99fbab88";

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

function encodeAddress(value) {
  return String(value).replace(/^0x/i, "").toLowerCase().padStart(64, "0");
}

function encodeUint256(value) {
  const n = BigInt(String(value));
  return n.toString(16).padStart(64, "0");
}

function decodeUint(value) {
  const clean = String(value || "").replace(/^0x/i, "").padStart(64, "0");
  return BigInt(`0x${clean}`);
}

function decodeUintWord(word) {
  return BigInt(`0x${String(word || "").replace(/^0x/i, "").padStart(64, "0")}`).toString();
}

function decodeIntWord(word) {
  const raw = BigInt(`0x${String(word || "").replace(/^0x/i, "").padStart(64, "0")}`);
  const max = 1n << 256n;
  const half = 1n << 255n;

  return raw >= half ? (raw - max).toString() : raw.toString();
}

function decodeAddressFromWord(word) {
  return `0x${String(word || "").replace(/^0x/i, "").padStart(64, "0").slice(-40)}`;
}

function isNonEmptyCode(value) {
  return typeof value === "string" && value !== "0x" && value.length > 2;
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

async function readTokenBalance(rpcUrl, tokenAddress, ownerAddress) {
  const result = await rpcCall(rpcUrl, "eth_call", [
    {to: tokenAddress, data: "0x70a08231" + encodeAddress(ownerAddress)},
    "latest"
  ]);

  return decodeUint(result).toString();
}

async function readPosition(rpcUrl, nftAddress, tokenId) {
  const data = NPM_POSITIONS_SELECTOR + encodeUint256(tokenId);
  const result = await rpcCall(rpcUrl, "eth_call", [
    {to: nftAddress, data},
    "latest"
  ]);

  const clean = String(result || "").replace(/^0x/i, "");

  if (clean.length < 64 * 12) {
    throw new Error(`Unexpected positions(${tokenId}) return length.`);
  }

  const word = (index) => clean.slice(index * 64, (index + 1) * 64);

  return {
    nonce: decodeUintWord(word(0)),
    operator: decodeAddressFromWord(word(1)),
    token0: decodeAddressFromWord(word(2)),
    token1: decodeAddressFromWord(word(3)),
    fee: decodeUintWord(word(4)),
    tickLower: decodeIntWord(word(5)),
    tickUpper: decodeIntWord(word(6)),
    liquidity: decodeUintWord(word(7)),
    feeGrowthInside0LastX128: decodeUintWord(word(8)),
    feeGrowthInside1LastX128: decodeUintWord(word(9)),
    tokensOwed0: decodeUintWord(word(10)),
    tokensOwed1: decodeUintWord(word(11))
  };
}

function requireStatus(name, value, expected) {
  if (value !== expected) {
    issue(name, `Expected ${expected}, got ${value || "UNKNOWN"}.`);
  }
}

fs.mkdirSync(reportDir, { recursive: true });

const postStatus = readJson("public-docs/dex-liquidity-post-execution-verification-status.json");
const postVerification = readJson("reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json");
const executionLiveStatus = readJson("public-docs/dex-liquidity-safe-execution-live-status.json");
const executionLive = readJson("reports/dex-liquidity-safe-execution-live/dex-liquidity-safe-execution-live-record.json");
const liquidityAdded = readJson("reports/dex-liquidity-provision/live/liquidity-added.json");
const positionMinted = readJson("reports/dex-liquidity-provision/live/position-minted.json");
const safePayload = readJson("reports/dex-liquidity-provision/payload/liquidity-safe-payload.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json", {});
const alerts = readJson("public-docs/mainnet-alerts-status.json", {});
const incidents = readJson("public-docs/incident-summary.json", {});

requireStatus("postStatus.status", postStatus.status, "DEX_LIQUIDITY_POST_EXECUTION_VERIFIED_LIQUIDITY_ADDED_POSITION_MINTED_NO_PUBLIC_TRADING");
requireStatus("postVerification.status", postVerification.status, "DEX_LIQUIDITY_POST_EXECUTION_VERIFIED_LIQUIDITY_ADDED_POSITION_MINTED_NO_PUBLIC_TRADING");
requireStatus("executionLiveStatus.status", executionLiveStatus.status, "DEX_LIQUIDITY_SAFE_EXECUTION_LIVE_RECORDED_LIQUIDITY_ADDED_POSITION_MINTED_NO_PUBLIC_TRADING");
requireStatus("executionLive.status", executionLive.status, "DEX_LIQUIDITY_SAFE_EXECUTION_LIVE_RECORDED_LIQUIDITY_ADDED_POSITION_MINTED_NO_PUBLIC_TRADING");

if (postVerification.liquidityPostExecutionVerified !== true || postVerification.liquidityAdded !== true || postVerification.positionMinted !== true) {
  issue("postVerification.flags", "Post-execution verification must show verified, liquidity added, and position minted.");
}

if (postVerification.publicTradingApproved !== false || postVerification.buyPageActivated !== false || postVerification.fullLaunchApproved !== false) {
  issue("postVerification.publicFlags", "Public trading, buy page, and full launch must remain false.");
}

if (executionLive.liquiditySafeTransactionExecuted !== true || executionLive.liquidityAdded !== true || executionLive.positionMinted !== true) {
  issue("executionLive.flags", "Execution live must show transaction executed, liquidity added, and position minted.");
}

if (!isAddress(postVerification.liquiditySafeAddress) || !isTxHash(postVerification.executionTxHash)) {
  issue("postVerification.identifiers", "Liquidity Safe address and execution tx hash must be valid.");
}

if (liquidityAdded.liquidityAdded !== true || positionMinted.positionMinted !== true) {
  issue("liveArtifacts.flags", "Liquidity-added and position-minted artifacts must be true.");
}

if (String(liquidityAdded.positionTokenId) !== String(postVerification.positionTokenId) || String(positionMinted.positionTokenId) !== String(postVerification.positionTokenId)) {
  issue("liveArtifacts.positionTokenId", "Live artifacts must match post-execution position token ID.");
}

if (liquidityAdded.executionTxHash !== postVerification.executionTxHash || positionMinted.executionTxHash !== postVerification.executionTxHash) {
  issue("liveArtifacts.executionTxHash", "Live artifacts must match post-execution execution tx hash.");
}

if (BigInt(String(postVerification.poolLiquidityLive || "0")) <= 0n) {
  issue("postVerification.poolLiquidityLive", "Pool liquidity must be greater than zero.");
}

if (BigInt(String(postVerification.positionDetails?.liquidity || "0")) <= 0n) {
  issue("postVerification.positionDetails.liquidity", "Position liquidity must be greater than zero.");
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
  issue("capabilityMatrix", "Capability approvals must remain false.");
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
  "public-docs/dex-public-trading-approval-status.json",
  "reports/dex-public-trading-approval/dex-public-trading-approval-record.json",
  "public-docs/dex-public-trading-live-status.json",
  "public-docs/dex-buy-page-activated-status.json",
  "public-docs/full-launch-approved-status.json"
];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden future public-trading/buy-page/full-launch artifact exists.");
  }
}

const rpcUrl =
  process.env.DEX_PUBLIC_TRADING_READINESS_REVIEW_RPC_URL ||
  process.env.DEX_LIQUIDITY_POST_EXECUTION_VERIFICATION_RPC_URL ||
  process.env.DEX_LIQUIDITY_SAFE_EXECUTION_LIVE_RPC_URL ||
  process.env.DEX_POST_EXECUTION_RPC_URL ||
  process.env.MAINNET_MONITOR_RPC_URL ||
  readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

if (!String(rpcUrl || "").startsWith("https://")) {
  issue("DEX_PUBLIC_TRADING_READINESS_REVIEW_RPC_URL", "RPC URL must be available and start with https://.");
}

let poolLiquidityLive = String(postVerification.poolLiquidityLive || "0");
let positionOwnerLive = postVerification.positionOwnerLive || "";
let positionDetailsLive = postVerification.positionDetails || {};
let safeCodePresent = false;
let npmCodePresent = false;
let token0BalanceRaw = "";
let token1BalanceRaw = "";

if (issues.length === 0) {
  try {
    const safeCode = await rpcCall(rpcUrl, "eth_getCode", [postVerification.liquiditySafeAddress, "latest"]);
    safeCodePresent = isNonEmptyCode(safeCode);

    if (!safeCodePresent) {
      issue("liquiditySafeAddress.code", "Liquidity Safe must have contract code.");
    }

    const npmCode = await rpcCall(rpcUrl, "eth_getCode", [safePayload.nonfungiblePositionManager, "latest"]);
    npmCodePresent = isNonEmptyCode(npmCode);

    if (!npmCodePresent) {
      issue("nonfungiblePositionManager.code", "NonfungiblePositionManager must have contract code.");
    }

    poolLiquidityLive = await readPoolLiquidity(rpcUrl, postVerification.poolAddress);

    if (BigInt(poolLiquidityLive) <= 0n) {
      issue("poolLiquidityLive", "Live pool liquidity must be greater than zero.");
    }

    positionOwnerLive = await readOwnerOf(rpcUrl, safePayload.nonfungiblePositionManager, postVerification.positionTokenId);

    if (!sameAddress(positionOwnerLive, postVerification.liquiditySafeAddress)) {
      issue("positionOwnerLive", "Position owner must be liquidity Safe.");
    }

    positionDetailsLive = await readPosition(rpcUrl, safePayload.nonfungiblePositionManager, postVerification.positionTokenId);

    if (BigInt(positionDetailsLive.liquidity || "0") <= 0n) {
      issue("positionDetailsLive.liquidity", "Position liquidity must be greater than zero.");
    }

    const mintParams = safePayload.mintParams || {};

    if (!sameAddress(positionDetailsLive.token0, mintParams.token0)) {
      issue("positionDetailsLive.token0", "Position token0 must match Safe payload.");
    }

    if (!sameAddress(positionDetailsLive.token1, mintParams.token1)) {
      issue("positionDetailsLive.token1", "Position token1 must match Safe payload.");
    }

    if (String(positionDetailsLive.fee) !== String(mintParams.fee)) {
      issue("positionDetailsLive.fee", "Position fee must match Safe payload.");
    }

    if (String(positionDetailsLive.tickLower) !== String(mintParams.tickLower)) {
      issue("positionDetailsLive.tickLower", "Position tickLower must match Safe payload.");
    }

    if (String(positionDetailsLive.tickUpper) !== String(mintParams.tickUpper)) {
      issue("positionDetailsLive.tickUpper", "Position tickUpper must match Safe payload.");
    }

    token0BalanceRaw = await readTokenBalance(rpcUrl, mintParams.token0, postVerification.liquiditySafeAddress);
    token1BalanceRaw = await readTokenBalance(rpcUrl, mintParams.token1, postVerification.liquiditySafeAddress);
  } catch (error) {
    issue("publicTradingReadinessReview", error.message);
  }
}

if (issues.length > 0) {
  const failed = {
    schema: "astra-dex-public-trading-readiness-review-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_PUBLIC_TRADING_READINESS_REVIEW_FAILED",
    issues
  };

  writeJson(readinessFile, failed);
  console.log(JSON.stringify(failed, null, 2));
  process.exit(1);
}

const reviewedAt = new Date().toISOString();

const readiness = {
  schema: "astra-dex-public-trading-readiness-review-v0.1",
  reviewedAt,
  status: "DEX_PUBLIC_TRADING_READINESS_REVIEW_COMPLETE_READY_FOR_PUBLIC_TRADING_APPROVAL_NO_BUY_PAGE_NO_FULL_LAUNCH",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  reviewOnly: true,
  liquiditySafeAddress: postVerification.liquiditySafeAddress,
  executionTxHash: postVerification.executionTxHash,
  poolAddress: postVerification.poolAddress,
  poolLiquidityLive,
  poolLiquidityVerifiedGreaterThanZero: true,
  nonfungiblePositionManager: safePayload.nonfungiblePositionManager,
  positionTokenId: String(postVerification.positionTokenId),
  positionOwnerLive,
  positionOwnerVerified: true,
  positionDetailsLive,
  tokenBalancesAtReadinessReview: {
    token0: {
      tokenAddress: safePayload.mintParams.token0,
      balanceRaw: token0BalanceRaw
    },
    token1: {
      tokenAddress: safePayload.mintParams.token1,
      balanceRaw: token1BalanceRaw
    }
  },
  readinessChecks: {
    liquidityPostExecutionVerified: true,
    liquiditySafeTransactionExecuted: true,
    liquidityAdded: true,
    positionMinted: true,
    poolLiquidityGreaterThanZero: true,
    positionOwnerIsLiquiditySafe: true,
    positionDetailsMatchPayload: true,
    safeCodePresent,
    npmCodePresent,
    publicTradingApprovedFalse: true,
    publicTradingLiveFalse: true,
    buyPageActivatedFalse: true,
    fullLaunchApprovedFalse: true,
    capabilityApprovalsFalse: true
  },
  publicTradingReadinessReviewComplete: true,
  readyForPublicTradingApproval: true,
  liquidityPostExecutionVerified: true,
  liquiditySafeTransactionExecuted: true,
  liquidityAdded: true,
  positionMinted: true,
  publicTradingApproved: false,
  publicTradingLinkApproved: false,
  publicTradingLive: false,
  buyPageActivated: false,
  buyPageActivationApproved: false,
  fullLaunchApproved: false,
  nextRecommendedMilestone: "DEX Public Trading Approval",
  requiredBeforePublicTradingApproval: {
    publicTradingReadinessReviewComplete: true,
    readyForPublicTradingApproval: true,
    liquidityPostExecutionVerified: true,
    liquiditySafeTransactionExecuted: true,
    liquidityAdded: true,
    positionMinted: true,
    poolLiquidityVerifiedGreaterThanZero: true,
    positionOwnerVerified: true,
    publicTradingApproved: false,
    publicTradingLive: false,
    buyPageActivated: false,
    fullLaunchApproved: false,
    publicTradingApprovalRecorded: false
  },
  safety: {
    reviewOnly: true,
    approvesPublicTrading: false,
    activatesBuyPage: false,
    approvesGlobalTreasuryFunding: false,
    approvesFullLaunch: false
  },
  recommendations: [
    "Proceed to a separate DEX Public Trading Approval milestone before publishing trading links.",
    "Do not activate the buy page until public trading approval and buy page activation approval are recorded.",
    "Keep full launch approval separate from public trading approval.",
    "Use the verified pool address, position token ID, and liquidity evidence in public trading approval materials."
  ],
  issues: []
};

readiness.readinessReviewHash = sha256Json(readiness);

writeJson(readinessFile, readiness);

const config = readJsonPath(configFile);

config.status = "dex-public-trading-readiness-review-complete-ready-for-public-trading-approval-no-buy-page-no-full-launch";
config.publicTradingReadinessReviewComplete = true;
config.readyForPublicTradingApproval = true;
config.liquidityPostExecutionVerified = true;
config.liquiditySafeTransactionExecuted = true;
config.liquidityAdded = true;
config.positionMinted = true;
config.publicTradingApproved = false;
config.publicTradingLinkApproved = false;
config.publicTradingLive = false;
config.buyPageActivated = false;
config.buyPageActivationApproved = false;
config.fullLaunchApproved = false;
config.completedPublicTradingReadinessReview = {
  reviewedAt,
  liquiditySafeAddress: readiness.liquiditySafeAddress,
  executionTxHash: readiness.executionTxHash,
  poolAddress: readiness.poolAddress,
  poolLiquidityLive: readiness.poolLiquidityLive,
  positionTokenId: readiness.positionTokenId,
  positionOwnerLive: readiness.positionOwnerLive,
  readinessReviewHash: readiness.readinessReviewHash,
  recordFile: "reports/dex-public-trading-readiness-review/dex-public-trading-readiness-review.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-public-trading-readiness-review-result-v0.1",
  checkedAt: reviewedAt,
  status: readiness.status,
  liquiditySafeAddress: readiness.liquiditySafeAddress,
  executionTxHash: readiness.executionTxHash,
  poolAddress: readiness.poolAddress,
  poolLiquidityLive: readiness.poolLiquidityLive,
  positionTokenId: readiness.positionTokenId,
  positionOwnerLive: readiness.positionOwnerLive,
  positionLiquidity: readiness.positionDetailsLive.liquidity,
  readyForPublicTradingApproval: true,
  publicTradingApproved: false,
  publicTradingLive: false,
  buyPageActivated: false,
  fullLaunchApproved: false
}, null, 2));
