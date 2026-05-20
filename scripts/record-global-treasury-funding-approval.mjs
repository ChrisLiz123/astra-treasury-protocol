import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const confirm = process.env.GLOBAL_TREASURY_FUNDING_APPROVAL_CONFIRM || "";
const approver = process.env.GLOBAL_TREASURY_FUNDING_APPROVER || "";
const approvalReference = process.env.GLOBAL_TREASURY_FUNDING_APPROVAL_REFERENCE || "";
const overwrite = process.env.OVERWRITE_GLOBAL_TREASURY_FUNDING_APPROVAL || "";

const requiredConfirm = "APPROVE_GLOBAL_TREASURY_FUNDING_ONLY_NOT_PAYLOAD_OR_EXECUTION";

const recordDir = path.join(root, "reports", "global-treasury-funding-approval");
const recordFile = path.join(recordDir, "global-treasury-funding-approval-record.json");
const approvalEvidenceFile = path.join(root, "reports", "global-treasury-funding", "approval", "global-treasury-funding-approved.json");
const configFile = path.join(root, "configs", "global-treasury-funding-approval.config.json");
const treasuryFundingStatusFile = path.join(root, "public-docs", "treasury-funding-status.json");
const fullLaunchStatusFile = path.join(root, "public-docs", "full-launch-status.json");

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

function sameAddress(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

function isPlaceholder(value) {
  const normalized = String(value || "").trim().toLowerCase();

  return (
    normalized.length === 0 ||
    normalized === "tbd" ||
    normalized.includes("tbd") ||
    normalized.includes("todo") ||
    normalized.includes("placeholder") ||
    normalized.includes("replace_with") ||
    normalized.includes("paste_") ||
    normalized === "yyyy-mm-ddthh:mm:ssz"
  );
}

function looksSensitive(value) {
  const normalized = String(value || "").toLowerCase();

  return (
    normalized.includes("private key") ||
    normalized.includes("seed phrase") ||
    normalized.includes("mnemonic") ||
    normalized.includes("password") ||
    normalized.includes("secret")
  );
}

function requireUsable(name, value) {
  if (isPlaceholder(value)) {
    issue(name, "Required value is missing or still a placeholder.");
  }

  if (looksSensitive(value)) {
    issue(name, "Value appears to contain sensitive material.");
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

if (confirm !== requiredConfirm) {
  issue("GLOBAL_TREASURY_FUNDING_APPROVAL_CONFIRM", `Must equal ${requiredConfirm}.`);
}

requireUsable("GLOBAL_TREASURY_FUNDING_APPROVER", approver);
requireUsable("GLOBAL_TREASURY_FUNDING_APPROVAL_REFERENCE", approvalReference);

if (fs.existsSync(recordFile) && overwrite !== "YES") {
  issue(
    "OVERWRITE_GLOBAL_TREASURY_FUNDING_APPROVAL",
    "Global treasury funding approval record already exists. Set OVERWRITE_GLOBAL_TREASURY_FUNDING_APPROVAL=YES only if replacing intentionally."
  );
}

const reviewStatus = readJson("public-docs/global-treasury-funding-approval-review-status.json");
const review = readJson("reports/global-treasury-funding-approval-review/global-treasury-funding-approval-review.json");
const fullLaunchLiveStatus = readJson("public-docs/full-launch-live-status.json");
const fullLaunchLive = readJson("reports/full-launch-live/full-launch-live-record.json");
const fullLaunchStatus = readJson("public-docs/full-launch-status.json");
const postVerification = readJson("reports/dex-liquidity-post-execution-verification/dex-liquidity-post-execution-verification.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json", {});
const monitor = readJson("public-docs/mainnet-monitor-status.json", {});
const alerts = readJson("public-docs/mainnet-alerts-status.json", {});
const incidents = readJson("public-docs/incident-summary.json", {});

requireStatus("reviewStatus.status", reviewStatus.status, "GLOBAL_TREASURY_FUNDING_APPROVAL_REVIEW_COMPLETE_FULL_LAUNCH_LIVE_TREASURY_FUNDING_NOT_APPROVED");
requireStatus("review.status", review.status, "GLOBAL_TREASURY_FUNDING_APPROVAL_REVIEW_COMPLETE_FULL_LAUNCH_LIVE_TREASURY_FUNDING_NOT_APPROVED");
requireStatus("fullLaunchLiveStatus.status", fullLaunchLiveStatus.status, "FULL_LAUNCH_LIVE_PUBLIC_FINALIZATION_RECORDED_BUY_PAGE_ACTIVE_PUBLIC_TRADING_LIVE_TREASURY_FUNDING_NOT_APPROVED");
requireStatus("fullLaunchLive.status", fullLaunchLive.status, "FULL_LAUNCH_LIVE_PUBLIC_FINALIZATION_RECORDED_BUY_PAGE_ACTIVE_PUBLIC_TRADING_LIVE_TREASURY_FUNDING_NOT_APPROVED");

if (review.globalTreasuryFundingApprovalReviewComplete !== true || review.readyForGlobalTreasuryFundingApproval !== true) {
  issue("review.flags", "Global treasury funding approval review must be complete and ready for approval.");
}

if (fullLaunchLive.fullLaunchLive !== true || fullLaunchLive.fullLaunchApproved !== true) {
  issue("fullLaunchLive.flags", "Full launch must be live and approved.");
}

if (postVerification.liquidityPostExecutionVerified !== true || postVerification.liquidityAdded !== true || postVerification.positionMinted !== true) {
  issue("postVerification.flags", "Liquidity post-execution verification must be complete.");
}

if (!isAddress(postVerification.liquiditySafeAddress) || !isTxHash(postVerification.executionTxHash)) {
  issue("postVerification.identifiers", "Liquidity Safe and execution tx hash must be valid.");
}

if (BigInt(String(postVerification.poolLiquidityLive || "0")) <= 0n) {
  issue("postVerification.poolLiquidityLive", "Pool liquidity must be greater than zero.");
}

if (!sameAddress(postVerification.positionOwnerLive, postVerification.liquiditySafeAddress)) {
  issue("postVerification.positionOwnerLive", "Position owner must be liquidity Safe.");
}

const fundingApprovedBefore = boolValue(
  treasuryFunding.treasuryFundingApproved,
  treasuryFunding.summary?.treasuryFundingApproved,
  treasuryFunding.globalTreasuryFundingApproved,
  treasuryFunding.summary?.globalTreasuryFundingApproved,
  fullLaunchStatus.treasuryFundingApproved
);

const fundingExecutedBefore = boolValue(
  treasuryFunding.treasuryFundingExecuted,
  treasuryFunding.summary?.treasuryFundingExecuted,
  treasuryFunding.globalTreasuryFundingExecuted,
  treasuryFunding.summary?.globalTreasuryFundingExecuted,
  fullLaunchStatus.treasuryFundingExecuted
);

if (fundingApprovedBefore !== false) {
  issue("treasuryFundingApproved", "Global treasury funding must not already be approved before recording this approval.");
}

if (fundingExecutedBefore !== false) {
  issue("treasuryFundingExecuted", "Global treasury funding must not be executed before approval.");
}

const forbiddenFiles = [
  "reports/global-treasury-funding/payload/global-treasury-funding-safe-payload.json",
  "reports/global-treasury-funding/live/global-treasury-funding-executed.json",
  "reports/treasury-funding/live/treasury-funding-executed.json",
  "reports/treasury-funding/live/funds-moved.json",
  "public-docs/global-treasury-funding-live-status.json",
  "public-docs/treasury-funding-executed-status.json"
];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden funding payload/execution/fund-movement artifact exists.");
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
  process.env.GLOBAL_TREASURY_FUNDING_APPROVAL_RPC_URL ||
  process.env.GLOBAL_TREASURY_FUNDING_APPROVAL_REVIEW_RPC_URL ||
  process.env.FULL_LAUNCH_LIVE_RPC_URL ||
  process.env.DEX_LIQUIDITY_POST_EXECUTION_VERIFICATION_RPC_URL ||
  process.env.MAINNET_MONITOR_RPC_URL ||
  readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

if (!String(rpcUrl || "").startsWith("https://")) {
  issue("GLOBAL_TREASURY_FUNDING_APPROVAL_RPC_URL", "RPC URL must be available and start with https://.");
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
    issue("globalTreasuryFundingApprovalLiveChecks", error.message);
  }
}

if (issues.length > 0) {
  console.log(JSON.stringify({
    schema: "astra-global-treasury-funding-approval-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_GLOBAL_TREASURY_FUNDING_NOT_APPROVED",
    issues
  }, null, 2));
  process.exit(1);
}

fs.mkdirSync(recordDir, { recursive: true });

const recordedAt = new Date().toISOString();

const record = {
  schema: "astra-global-treasury-funding-approval-record-v0.1",
  recordedAt,
  status: "GLOBAL_TREASURY_FUNDING_APPROVED_FULL_LAUNCH_LIVE_NO_PAYLOAD_NO_FUNDS_MOVED",
  approvalScope: "global-treasury-funding-approval-only-not-payload-not-execution-not-fund-movement",
  approver,
  approvalReference,
  fullLaunchLive: true,
  fullLaunchApproved: true,
  launchPageUrl: fullLaunchLive.launchPageUrl,
  buyPageUrl: fullLaunchLive.buyPageUrl,
  tradingLinkUrl: fullLaunchLive.tradingLinkUrl,
  buyPageActivated: true,
  publicTradingLive: true,
  liquiditySafeAddress: postVerification.liquiditySafeAddress,
  executionTxHash: postVerification.executionTxHash,
  poolAddress: postVerification.poolAddress,
  poolLiquidityLive,
  positionTokenId: String(postVerification.positionTokenId),
  positionOwnerLive,
  approvalPrerequisites: {
    globalTreasuryFundingApprovalReviewComplete: true,
    readyForGlobalTreasuryFundingApproval: true,
    fullLaunchLive: true,
    fullLaunchApproved: true,
    buyPageActivated: true,
    publicTradingLive: true,
    dexLiquidityPostExecutionVerified: true,
    liquidityAdded: true,
    positionMinted: true,
    treasuryFundingApprovedBeforeRecording: false,
    treasuryFundingExecutedBeforeRecording: false,
    fundsMovedBeforeRecording: false
  },
  globalTreasuryFundingApprovalRecorded: true,
  globalTreasuryFundingApproved: true,
  treasuryFundingApproved: true,
  treasuryFundingExecuted: false,
  fundingPayloadGenerated: false,
  fundsMoved: false,
  requiredBeforeGlobalTreasuryFundingRequirementsReview: {
    globalTreasuryFundingApprovalRecorded: true,
    globalTreasuryFundingApproved: true,
    fullLaunchLive: true,
    fullLaunchApproved: true,
    buyPageActivated: true,
    publicTradingLive: true,
    dexLiquidityPostExecutionVerified: true,
    liquidityAdded: true,
    positionMinted: true,
    fundingPayloadGenerated: false,
    treasuryFundingExecuted: false,
    fundsMoved: false
  },
  safety: {
    approvalOnly: true,
    generatesFundingPayload: false,
    submitsSafeTransaction: false,
    executesGlobalTreasuryFunding: false,
    movesFunds: false
  }
};

record.approvalHash = sha256Json(record);

writeJson(recordFile, record);

writeJson(approvalEvidenceFile, {
  schema: "astra-global-treasury-funding-approved-v0.1",
  recordedAt,
  status: "GLOBAL_TREASURY_FUNDING_APPROVED_NOT_EXECUTED_FUNDS_NOT_MOVED",
  globalTreasuryFundingApprovalRecorded: true,
  globalTreasuryFundingApproved: true,
  treasuryFundingApproved: true,
  treasuryFundingExecuted: false,
  fundingPayloadGenerated: false,
  fundsMoved: false,
  approvalHash: record.approvalHash
});

writeJson(treasuryFundingStatusFile, {
  schema: "astra-treasury-funding-status-v0.1",
  generatedAt: recordedAt,
  status: "GLOBAL_TREASURY_FUNDING_APPROVED_NOT_EXECUTED_FUNDS_NOT_MOVED",
  treasuryFundingApproved: true,
  treasuryFundingExecuted: false,
  globalTreasuryFundingApproved: true,
  globalTreasuryFundingExecuted: false,
  fundingPayloadGenerated: false,
  fundsMoved: false,
  summary: {
    treasuryFundingApproved: true,
    treasuryFundingExecuted: false,
    globalTreasuryFundingApproved: true,
    globalTreasuryFundingExecuted: false,
    fundingPayloadGenerated: false,
    fundsMoved: false
  },
  approvalHash: record.approvalHash,
  approvalRecordFile: "reports/global-treasury-funding-approval/global-treasury-funding-approval-record.json"
});

writeJson(fullLaunchStatusFile, {
  schema: "astra-full-launch-status-v0.1",
  generatedAt: recordedAt,
  status: "FULL_LAUNCH_LIVE_GLOBAL_TREASURY_FUNDING_APPROVED_NOT_EXECUTED",
  fullLaunchApproved: true,
  fullLaunchApprovalRecorded: true,
  fullLaunchLive: true,
  fullLaunchLiveRecorded: true,
  buyPageActivated: true,
  publicTradingLive: true,
  publicTradingApproved: true,
  publicTradingLinkApproved: true,
  buyPageUrl: record.buyPageUrl,
  launchPageUrl: record.launchPageUrl,
  tradingLinkUrl: record.tradingLinkUrl,
  liquiditySafeAddress: record.liquiditySafeAddress,
  poolAddress: record.poolAddress,
  poolLiquidityLive: record.poolLiquidityLive,
  positionTokenId: record.positionTokenId,
  treasuryFundingApproved: true,
  treasuryFundingExecuted: false,
  fundingPayloadGenerated: false,
  fundsMoved: false,
  treasuryFundingApprovalHash: record.approvalHash
});

const config = readJsonPath(configFile);

config.status = "global-treasury-funding-approved-full-launch-live-no-payload-no-funds-moved";
config.globalTreasuryFundingApprovalRecorded = true;
config.globalTreasuryFundingApproved = true;
config.treasuryFundingApproved = true;
config.treasuryFundingExecuted = false;
config.fundingPayloadGenerated = false;
config.fundsMoved = false;
config.approvedGlobalTreasuryFunding = {
  recordedAt,
  approver,
  approvalReference,
  fullLaunchLive: true,
  launchPageUrl: record.launchPageUrl,
  buyPageUrl: record.buyPageUrl,
  liquiditySafeAddress: record.liquiditySafeAddress,
  executionTxHash: record.executionTxHash,
  poolAddress: record.poolAddress,
  poolLiquidityLive: record.poolLiquidityLive,
  positionTokenId: record.positionTokenId,
  approvalHash: record.approvalHash,
  recordFile: "reports/global-treasury-funding-approval/global-treasury-funding-approval-record.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-global-treasury-funding-approval-result-v0.1",
  checkedAt: recordedAt,
  status: record.status,
  fullLaunchLive: true,
  launchPageUrl: record.launchPageUrl,
  buyPageUrl: record.buyPageUrl,
  poolAddress: record.poolAddress,
  poolLiquidityLive: record.poolLiquidityLive,
  positionTokenId: record.positionTokenId,
  globalTreasuryFundingApprovalRecorded: true,
  globalTreasuryFundingApproved: true,
  treasuryFundingApproved: true,
  treasuryFundingExecuted: false,
  fundingPayloadGenerated: false,
  fundsMoved: false
}, null, 2));
