import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const reportDir = path.join(root, "reports", "dex-liquidity-post-execution-verification");
const verificationFile = path.join(reportDir, "dex-liquidity-post-execution-verification.json");
const configFile = path.join(root, "configs", "dex-liquidity-post-execution-verification.config.json");

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const ZERO_TOPIC = "0x" + "0".repeat(64);
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

function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
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

async function fetchJson(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "User-Agent": "astra-treasury-protocol-dex-liquidity-post-execution-verification/0.1"
    }
  });

  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }

  return response.json();
}

async function readPoolLiquidity(rpcUrl, poolAddress) {
  const result = await rpcCall(rpcUrl, "eth_call", [
    {to: poolAddress, data: "0x1a686502"},
    "latest"
  ]);

  return decodeUint(result).toString();
}

async function readTokenBalance(rpcUrl, tokenAddress, ownerAddress) {
  const result = await rpcCall(rpcUrl, "eth_call", [
    {to: tokenAddress, data: "0x70a08231" + encodeAddress(ownerAddress)},
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

const executionLiveStatus = readJson("public-docs/dex-liquidity-safe-execution-live-status.json");
const executionLive = readJson("reports/dex-liquidity-safe-execution-live/dex-liquidity-safe-execution-live-record.json");
const liquidityAdded = readJson("reports/dex-liquidity-provision/live/liquidity-added.json");
const positionMinted = readJson("reports/dex-liquidity-provision/live/position-minted.json");
const safeExecuted = readJson("reports/dex-liquidity-provision/live/liquidity-safe-executed.json");
const safePayload = readJson("reports/dex-liquidity-provision/payload/liquidity-safe-payload.json");
const executionPreparationStatus = readJson("public-docs/dex-liquidity-safe-execution-preparation-status.json");
const executionApprovalStatus = readJson("public-docs/dex-liquidity-safe-execution-approval-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json", {});
const alerts = readJson("public-docs/mainnet-alerts-status.json", {});
const incidents = readJson("public-docs/incident-summary.json", {});

requireStatus("executionLiveStatus.status", executionLiveStatus.status, "DEX_LIQUIDITY_SAFE_EXECUTION_LIVE_RECORDED_LIQUIDITY_ADDED_POSITION_MINTED_NO_PUBLIC_TRADING");
requireStatus("executionLive.status", executionLive.status, "DEX_LIQUIDITY_SAFE_EXECUTION_LIVE_RECORDED_LIQUIDITY_ADDED_POSITION_MINTED_NO_PUBLIC_TRADING");
requireStatus("liquidityAdded.status", liquidityAdded.status, "DEX_LIQUIDITY_ADDED_POSITION_MINTED_NO_PUBLIC_TRADING");
requireStatus("positionMinted.status", positionMinted.status, "DEX_LIQUIDITY_POSITION_MINTED_NO_PUBLIC_TRADING");
requireStatus("safeExecuted.status", safeExecuted.status, "DEX_LIQUIDITY_SAFE_TRANSACTION_EXECUTED_LIQUIDITY_ADDED_NO_PUBLIC_TRADING");

if (executionLiveStatus.summary?.liquiditySafeTransactionExecuted !== true || executionLiveStatus.summary?.liquidityAdded !== true || executionLiveStatus.summary?.positionMinted !== true) {
  issue("executionLiveStatus.summary", "Execution live status must show executed, liquidity added, and position minted.");
}

if (!isAddress(executionLive.liquiditySafeAddress) || !isTxHash(executionLive.safeTxHash) || !isTxHash(executionLive.executionTxHash)) {
  issue("executionLive.identifiers", "Liquidity Safe address, Safe tx hash, and execution tx hash must be valid.");
}

if (executionLive.executionReceipt?.status !== "0x1") {
  issue("executionLive.executionReceipt.status", "Execution receipt must have status 0x1.");
}

if (executionLive.liquiditySafeTransactionExecuted !== true || executionLive.liquidityAdded !== true || executionLive.positionMinted !== true) {
  issue("executionLive.executionFlags", "Execution live record must show executed, liquidity added, and position minted.");
}

if (executionLive.publicTradingApproved !== false || executionLive.buyPageActivated !== false || executionLive.fullLaunchApproved !== false) {
  issue("executionLive.publicFlags", "Public trading, buy page, and full launch must remain false.");
}

if (liquidityAdded.liquidityAdded !== true || positionMinted.positionMinted !== true || safeExecuted.liquiditySafeTransactionExecuted !== true) {
  issue("liveArtifacts.flags", "Live artifacts must show Safe executed, liquidity added, and position minted.");
}

if (liquidityAdded.executionTxHash !== executionLive.executionTxHash || positionMinted.executionTxHash !== executionLive.executionTxHash || safeExecuted.executionTxHash !== executionLive.executionTxHash) {
  issue("liveArtifacts.executionTxHash", "Live artifacts must share execution tx hash.");
}

if (String(liquidityAdded.positionTokenId) !== String(executionLive.positionTokenId) || String(positionMinted.positionTokenId) !== String(executionLive.positionTokenId)) {
  issue("liveArtifacts.positionTokenId", "Live artifacts must share position token ID.");
}

if (executionLive.safePayloadHash !== safePayload.safePayloadHash) {
  issue("executionLive.safePayloadHash", "Execution live Safe payload hash must match current Safe payload.");
}

if (executionLive.transactionBuilderHash !== safePayload.transactionBuilderHash) {
  issue("executionLive.transactionBuilderHash", "Execution live Transaction Builder hash must match current Safe payload.");
}

if (executionPreparationStatus.status !== "DEX_LIQUIDITY_SAFE_EXECUTION_PREPARED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
  issue("executionPreparationStatus.status", "Historical execution preparation status must be present.");
}

if (executionApprovalStatus.status !== "DEX_LIQUIDITY_SAFE_EXECUTION_APPROVED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
  issue("executionApprovalStatus.status", "Historical execution approval status must be present.");
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
  "public-docs/dex-public-trading-live-status.json",
  "public-docs/dex-buy-page-activated-status.json",
  "public-docs/full-launch-approved-status.json"
];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden public-trading/buy-page/full-launch artifact exists.");
  }
}

const txServiceBaseUrl = (
  process.env.DEX_LIQUIDITY_SAFE_TX_SERVICE_BASE_URL ||
  "https://safe-transaction-base.safe.global/api"
).replace(/\/+$/, "");

const rpcUrl =
  process.env.DEX_LIQUIDITY_POST_EXECUTION_VERIFICATION_RPC_URL ||
  process.env.DEX_LIQUIDITY_SAFE_EXECUTION_LIVE_RPC_URL ||
  process.env.DEX_POST_EXECUTION_RPC_URL ||
  process.env.MAINNET_MONITOR_RPC_URL ||
  readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

if (!String(rpcUrl || "").startsWith("https://")) {
  issue("DEX_LIQUIDITY_POST_EXECUTION_VERIFICATION_RPC_URL", "RPC URL must be available and start with https://.");
}

let safeTransaction = {};
let receipt = {};
let poolLiquidityLive = "";
let ownerOfPosition = "";
let positionDetails = {};
let token0BalanceRaw = "";
let token1BalanceRaw = "";
let safeCodePresent = false;
let npmCodePresent = false;
let transferMintLogCount = 0;

if (issues.length === 0) {
  try {
    safeTransaction = await fetchJson(`${txServiceBaseUrl}/v1/multisig-transactions/${executionLive.safeTxHash}/`);

    if (safeTransaction.isExecuted !== true) {
      issue("safeTransaction.isExecuted", "Safe Transaction Service must show executed.");
    }

    if (!isTxHash(safeTransaction.transactionHash) || String(safeTransaction.transactionHash).toLowerCase() !== String(executionLive.executionTxHash).toLowerCase()) {
      issue("safeTransaction.transactionHash", "Safe Transaction Service execution tx hash must match execution live record.");
    }

    const payloadTx = safePayload.transactions?.[0] || {};

    if (!sameAddress(safeTransaction.safe, executionLive.liquiditySafeAddress)) {
      issue("safeTransaction.safe", "Safe Transaction Service safe must match liquidity Safe.");
    }

    if (!sameAddress(safeTransaction.to, payloadTx.to)) {
      issue("safeTransaction.to", "Safe Transaction Service target must match Safe payload.");
    }

    if (String(safeTransaction.value ?? "0") !== String(payloadTx.value ?? "0")) {
      issue("safeTransaction.value", "Safe Transaction Service value must match Safe payload.");
    }

    if (String(safeTransaction.data || "").toLowerCase() !== String(payloadTx.data || "").toLowerCase()) {
      issue("safeTransaction.data", "Safe Transaction Service calldata must match Safe payload.");
    }

    receipt = await rpcCall(rpcUrl, "eth_getTransactionReceipt", [executionLive.executionTxHash]);

    if (!receipt) {
      issue("executionReceipt", "Execution transaction receipt not found.");
    } else {
      if (receipt.status !== "0x1") {
        issue("executionReceipt.status", "Execution receipt must be 0x1.");
      }

      if (!sameAddress(receipt.to, executionLive.liquiditySafeAddress)) {
        issue("executionReceipt.to", "Execution receipt target must be liquidity Safe.");
      }

      const recipientTopic = "0x" + encodeAddress(executionLive.liquiditySafeAddress);

      transferMintLogCount = (receipt.logs || [])
        .filter((log) => sameAddress(log.address, safePayload.nonfungiblePositionManager))
        .filter((log) => Array.isArray(log.topics) && log.topics.length >= 4)
        .filter((log) => String(log.topics[0]).toLowerCase() === TRANSFER_TOPIC)
        .filter((log) => String(log.topics[1]).toLowerCase() === ZERO_TOPIC)
        .filter((log) => String(log.topics[2]).toLowerCase() === recipientTopic.toLowerCase())
        .filter((log) => decodeUint(log.topics[3]).toString() === String(executionLive.positionTokenId))
        .length;

      if (transferMintLogCount <= 0) {
        issue("executionReceipt.positionMintLog", "Execution receipt must include the position mint Transfer log to liquidity Safe.");
      }
    }

    const safeCode = await rpcCall(rpcUrl, "eth_getCode", [executionLive.liquiditySafeAddress, "latest"]);
    safeCodePresent = isNonEmptyCode(safeCode);

    if (!safeCodePresent) {
      issue("liquiditySafeAddress.code", "Liquidity Safe must have contract code.");
    }

    const npmCode = await rpcCall(rpcUrl, "eth_getCode", [safePayload.nonfungiblePositionManager, "latest"]);
    npmCodePresent = isNonEmptyCode(npmCode);

    if (!npmCodePresent) {
      issue("nonfungiblePositionManager.code", "NonfungiblePositionManager must have contract code.");
    }

    poolLiquidityLive = await readPoolLiquidity(rpcUrl, executionLive.poolAddress);

    if (BigInt(poolLiquidityLive) <= 0n) {
      issue("poolLiquidityLive", "Live pool liquidity must be greater than zero.");
    }

    ownerOfPosition = await readOwnerOf(rpcUrl, safePayload.nonfungiblePositionManager, executionLive.positionTokenId);

    if (!sameAddress(ownerOfPosition, executionLive.liquiditySafeAddress)) {
      issue("ownerOfPosition", "Position owner must be the liquidity Safe.");
    }

    positionDetails = await readPosition(rpcUrl, safePayload.nonfungiblePositionManager, executionLive.positionTokenId);

    if (BigInt(positionDetails.liquidity || "0") <= 0n) {
      issue("positionDetails.liquidity", "Position liquidity must be greater than zero.");
    }

    const mintParams = safePayload.mintParams || {};

    if (!sameAddress(positionDetails.token0, mintParams.token0)) {
      issue("positionDetails.token0", "Position token0 must match Safe payload.");
    }

    if (!sameAddress(positionDetails.token1, mintParams.token1)) {
      issue("positionDetails.token1", "Position token1 must match Safe payload.");
    }

    if (String(positionDetails.fee) !== String(mintParams.fee)) {
      issue("positionDetails.fee", "Position fee must match Safe payload.");
    }

    if (String(positionDetails.tickLower) !== String(mintParams.tickLower)) {
      issue("positionDetails.tickLower", "Position tickLower must match Safe payload.");
    }

    if (String(positionDetails.tickUpper) !== String(mintParams.tickUpper)) {
      issue("positionDetails.tickUpper", "Position tickUpper must match Safe payload.");
    }

    token0BalanceRaw = await readTokenBalance(rpcUrl, mintParams.token0, executionLive.liquiditySafeAddress);
    token1BalanceRaw = await readTokenBalance(rpcUrl, mintParams.token1, executionLive.liquiditySafeAddress);
  } catch (error) {
    issue("postExecutionVerification", error.message);
  }
}

if (issues.length > 0) {
  const failed = {
    schema: "astra-dex-liquidity-post-execution-verification-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_LIQUIDITY_POST_EXECUTION_VERIFICATION_FAILED",
    issues
  };

  writeJson(verificationFile, failed);
  console.log(JSON.stringify(failed, null, 2));
  process.exit(1);
}

const verifiedAt = new Date().toISOString();

const verification = {
  schema: "astra-dex-liquidity-post-execution-verification-v0.1",
  verifiedAt,
  status: "DEX_LIQUIDITY_POST_EXECUTION_VERIFIED_LIQUIDITY_ADDED_POSITION_MINTED_NO_PUBLIC_TRADING",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  verificationOnly: true,
  liquiditySafeAddress: executionLive.liquiditySafeAddress,
  safeTxHash: executionLive.safeTxHash,
  safeNonce: executionLive.safeNonce,
  executionTxHash: executionLive.executionTxHash,
  safePayloadHash: executionLive.safePayloadHash,
  transactionBuilderHash: executionLive.transactionBuilderHash,
  calldataHash: executionLive.calldataHash,
  poolAddress: executionLive.poolAddress,
  poolLiquidityRecordedAfterExecution: executionLive.poolLiquidityAfter,
  poolLiquidityLive,
  poolLiquidityVerifiedGreaterThanZero: true,
  nonfungiblePositionManager: safePayload.nonfungiblePositionManager,
  positionTokenId: String(executionLive.positionTokenId),
  positionOwnerRecorded: executionLive.positionOwner,
  positionOwnerLive: ownerOfPosition,
  positionOwnerVerified: true,
  positionDetails,
  transferMintLogCount,
  executionReceipt: {
    transactionHash: executionLive.executionTxHash,
    status: receipt.status,
    blockNumber: receipt.blockNumber,
    to: receipt.to,
    from: receipt.from,
    logCount: Array.isArray(receipt.logs) ? receipt.logs.length : 0
  },
  safeTransactionService: {
    safe: safeTransaction.safe,
    nonce: safeTransaction.nonce,
    to: safeTransaction.to,
    value: String(safeTransaction.value ?? ""),
    isExecuted: safeTransaction.isExecuted,
    transactionHash: safeTransaction.transactionHash || null,
    executionDate: safeTransaction.executionDate || null,
    submissionDate: safeTransaction.submissionDate || null,
    modified: safeTransaction.modified || null
  },
  tokenBalancesAfterVerification: {
    token0: {
      tokenAddress: safePayload.mintParams.token0,
      balanceRaw: token0BalanceRaw
    },
    token1: {
      tokenAddress: safePayload.mintParams.token1,
      balanceRaw: token1BalanceRaw
    }
  },
  checks: {
    safeTransactionServiceExecuted: true,
    executionReceiptSucceeded: true,
    safePayloadHashMatches: true,
    transactionBuilderHashMatches: true,
    poolLiquidityGreaterThanZero: true,
    positionMintTransferLogFound: true,
    positionOwnerIsLiquiditySafe: true,
    positionLiquidityGreaterThanZero: true,
    positionDetailsMatchPayload: true,
    safeCodePresent,
    npmCodePresent,
    publicTradingStillOff: true,
    fullLaunchStillOff: true
  },
  liquidityPostExecutionVerified: true,
  liquiditySafeExecutionLiveRecorded: true,
  liquiditySafeTransactionExecuted: true,
  liquidityAdded: true,
  positionMinted: true,
  publicTradingApproved: false,
  publicTradingLinkApproved: false,
  buyPageActivated: false,
  fullLaunchApproved: false,
  requiredBeforePublicTradingApprovalReview: {
    liquidityPostExecutionVerified: true,
    liquiditySafeTransactionExecuted: true,
    liquidityAdded: true,
    positionMinted: true,
    positionOwnerVerified: true,
    poolLiquidityVerifiedGreaterThanZero: true,
    publicTradingApproved: false,
    buyPageActivated: false,
    fullLaunchApproved: false,
    publicStatusUpdatePrepared: false
  },
  safety: {
    verificationOnly: true,
    approvesPublicTrading: false,
    activatesBuyPage: false,
    approvesGlobalTreasuryFunding: false,
    approvesFullLaunch: false
  },
  issues: []
};

verification.verificationHash = sha256Json(verification);

writeJson(verificationFile, verification);

const config = readJsonPath(configFile);

config.status = "dex-liquidity-post-execution-verified-liquidity-added-position-minted-no-public-trading";
config.liquidityPostExecutionVerified = true;
config.liquiditySafeExecutionLiveRecorded = true;
config.liquiditySafeTransactionExecuted = true;
config.liquidityAdded = true;
config.positionMinted = true;
config.publicTradingApproved = false;
config.publicTradingLinkApproved = false;
config.buyPageActivated = false;
config.buyPageActivationApproved = false;
config.fullLaunchApproved = false;
config.verifiedPostExecutionLiquidity = {
  verifiedAt,
  liquiditySafeAddress: verification.liquiditySafeAddress,
  executionTxHash: verification.executionTxHash,
  poolAddress: verification.poolAddress,
  poolLiquidityLive: verification.poolLiquidityLive,
  positionTokenId: verification.positionTokenId,
  positionOwnerLive: verification.positionOwnerLive,
  verificationHash: verification.verificationHash,
  recordFile: "reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-post-execution-verification-result-v0.1",
  checkedAt: verifiedAt,
  status: verification.status,
  liquiditySafeAddress: verification.liquiditySafeAddress,
  executionTxHash: verification.executionTxHash,
  poolAddress: verification.poolAddress,
  poolLiquidityLive: verification.poolLiquidityLive,
  positionTokenId: verification.positionTokenId,
  positionOwnerLive: verification.positionOwnerLive,
  positionLiquidity: verification.positionDetails.liquidity,
  liquidityPostExecutionVerified: true,
  liquiditySafeTransactionExecuted: true,
  liquidityAdded: true,
  positionMinted: true,
  publicTradingApproved: false,
  buyPageActivated: false,
  fullLaunchApproved: false
}, null, 2));
