import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const reportDir = path.join(root, "reports", "dex-liquidity-safe-pending-signatures");
const monitoringFile = path.join(reportDir, "dex-liquidity-safe-pending-signatures-monitoring.json");
const configFile = path.join(root, "configs", "dex-liquidity-safe-pending-signatures.config.json");

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readJsonPath(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
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

function isNonEmptyCode(value) {
  return typeof value === "string" && value !== "0x" && value.length > 2;
}

function encodeAddress(value) {
  return String(value).replace(/^0x/i, "").toLowerCase().padStart(64, "0");
}

function decodeUint(value) {
  const clean = String(value || "").replace(/^0x/i, "").padStart(64, "0");
  return BigInt(`0x${clean}`);
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

async function readTokenBalance(rpcUrl, tokenAddress, ownerAddress) {
  const result = await rpcCall(rpcUrl, "eth_call", [
    {to: tokenAddress, data: "0x70a08231" + encodeAddress(ownerAddress)},
    "latest"
  ]);

  return decodeUint(result).toString();
}

async function readTokenAllowance(rpcUrl, tokenAddress, ownerAddress, spenderAddress) {
  const result = await rpcCall(rpcUrl, "eth_call", [
    {to: tokenAddress, data: "0xdd62ed3e" + encodeAddress(ownerAddress) + encodeAddress(spenderAddress)},
    "latest"
  ]);

  return decodeUint(result).toString();
}

async function readPoolLiquidity(rpcUrl, poolAddress) {
  const result = await rpcCall(rpcUrl, "eth_call", [
    {to: poolAddress, data: "0x1a686502"},
    "latest"
  ]);

  return decodeUint(result).toString();
}

async function fetchJson(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "User-Agent": "astra-treasury-protocol-dex-liquidity-safe-pending-signatures/0.1"
    }
  });

  if (!response.ok) {
    throw new Error(`GET ${url} returned HTTP ${response.status}`);
  }

  return response.json();
}

function requireStatus(name, value, expected) {
  if (value !== expected) {
    issue(name, `Expected ${expected}, got ${value || "UNKNOWN"}.`);
  }
}

fs.mkdirSync(reportDir, { recursive: true });

const liveStatus = readJson("public-docs/dex-liquidity-safe-submission-live-status.json");
const liveRecord = readJson("reports/dex-liquidity-safe-submission-live/dex-liquidity-safe-submission-live-record.json");
const dryRunStatus = readJson("public-docs/dex-liquidity-safe-submission-dry-run-status.json");
const dryRun = readJson("reports/dex-liquidity-safe-submission-dry-run/dex-liquidity-safe-submission-dry-run.json");
const preparationStatus = readJson("public-docs/dex-liquidity-safe-submission-preparation-status.json");
const submissionApprovalStatus = readJson("public-docs/dex-liquidity-safe-submission-approval-status.json");
const payloadVerificationStatus = readJson("public-docs/dex-liquidity-safe-payload-verification-status.json");
const payloadVerification = readJson("reports/dex-liquidity-safe-payload-verification/dex-liquidity-safe-payload-verification.json");
const safePayload = readJson("reports/dex-liquidity-provision/payload/liquidity-safe-payload.json");
const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

requireStatus("liveStatus.status", liveStatus.status, "DEX_LIQUIDITY_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("liveRecord.status", liveRecord.status, "DEX_LIQUIDITY_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("dryRunStatus.status", dryRunStatus.status, "DEX_LIQUIDITY_SAFE_SUBMISSION_DRY_RUN_COMPLETE_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("dryRun.status", dryRun.status, "DEX_LIQUIDITY_SAFE_SUBMISSION_DRY_RUN_COMPLETE_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("preparationStatus.status", preparationStatus.status, "DEX_LIQUIDITY_SAFE_SUBMISSION_PREPARED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("submissionApprovalStatus.status", submissionApprovalStatus.status, "DEX_LIQUIDITY_SAFE_SUBMISSION_APPROVED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("payloadVerificationStatus.status", payloadVerificationStatus.status, "DEX_LIQUIDITY_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("payloadVerification.status", payloadVerification.status, "DEX_LIQUIDITY_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("safePayload.status", safePayload.status, "DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("poolStatus.status", poolStatus.status, "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING");

if (liveStatus.summary?.liquiditySafeTransactionSubmitted !== true || liveStatus.summary?.liquiditySafeTransactionExecuted !== false) {
  issue("liveStatus.summary", "Live submission must show submitted and not executed.");
}

if (!isTxHash(liveRecord.safeTxHash)) {
  issue("liveRecord.safeTxHash", "Live submission Safe tx hash must be valid.");
}

if (!Number.isInteger(liveRecord.safeNonce) || liveRecord.safeNonce < 0) {
  issue("liveRecord.safeNonce", "Live submission Safe nonce must be valid.");
}

if (!isAddress(liveRecord.liquiditySafeAddress)) {
  issue("liveRecord.liquiditySafeAddress", "Liquidity Safe address must be valid.");
}

if (liveRecord.safePayloadHash !== safePayload.safePayloadHash || liveRecord.safePayloadHash !== payloadVerification.safePayloadHash) {
  issue("liveRecord.safePayloadHash", "Safe payload hash must match live record, payload, and verification.");
}

if (liveRecord.transactionBuilderHash !== safePayload.transactionBuilderHash) {
  issue("liveRecord.transactionBuilderHash", "Transaction Builder hash must match Safe payload.");
}

if (liveRecord.calldataHash !== payloadVerification.calldataHash) {
  issue("liveRecord.calldataHash", "Calldata hash must match payload verification.");
}

if (payloadVerification.liveChecks?.token0?.balanceCoversDesired !== true || payloadVerification.liveChecks?.token0?.allowanceCoversDesired !== true) {
  issue("payloadVerification.liveChecks.token0", "Token0 balance and allowance must cover desired amount.");
}

if (payloadVerification.liveChecks?.token1?.balanceCoversDesired !== true || payloadVerification.liveChecks?.token1?.allowanceCoversDesired !== true) {
  issue("payloadVerification.liveChecks.token1", "Token1 balance and allowance must cover desired amount.");
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

if (monitor.status !== "PASS") {
  issue("monitor.status", `Expected PASS, got ${monitor.status}.`);
}

if (alerts.responseRequired === true) {
  issue("alerts.responseRequired", "Alerts must not require response.");
}

if (Number(incidents?.summary?.active || 0) !== 0) {
  issue("incidents.summary.active", "Active incidents must be zero.");
}

if (execution.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED") {
  issue("execution.mode", "Mainnet execution queue must remain disabled.");
}

const forbiddenFiles = [
  "reports/dex-liquidity-safe-execution-live/dex-liquidity-safe-execution-live-record.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "public-docs/dex-liquidity-safe-execution-live-status.json",
  "public-docs/dex-liquidity-added-status.json",
  "public-docs/dex-public-trading-live-status.json"
];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden execution/liquidity/public-trading artifact exists. Pending-signature monitoring must not execute or add liquidity.");
  }
}

const txServiceBaseUrl = (
  process.env.DEX_LIQUIDITY_SAFE_TX_SERVICE_BASE_URL ||
  "https://safe-transaction-base.safe.global/api"
).replace(/\/+$/, "");

const rpcUrl =
  process.env.DEX_LIQUIDITY_SAFE_PENDING_SIGNATURES_RPC_URL ||
  process.env.DEX_LIQUIDITY_SAFE_SUBMISSION_DRY_RUN_RPC_URL ||
  process.env.DEX_LIQUIDITY_SAFE_PAYLOAD_VERIFICATION_RPC_URL ||
  process.env.DEX_POST_EXECUTION_RPC_URL ||
  process.env.MAINNET_MONITOR_RPC_URL ||
  readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

if (!String(rpcUrl || "").startsWith("https://")) {
  issue("DEX_LIQUIDITY_SAFE_PENDING_SIGNATURES_RPC_URL", "RPC URL must be available and start with https://.");
}

let safeInfo = {};
let safeTransaction = {};
let safeOwners = [];
let safeThreshold = 0;
let confirmationCount = 0;
let requiredThreshold = 0;
let missingConfirmationCount = 0;
let thresholdReached = false;
let confirmationOwners = [];
let safeTransactionExecuted = false;
let safeTransactionServicePending = false;
let livePoolLiquidity = String(poolStatus.summary?.poolLiquidity || "0");
let safeCodePresent = false;
let npmCodePresent = false;
let liveBalance0Raw = "";
let liveBalance1Raw = "";
let liveAllowance0Raw = "";
let liveAllowance1Raw = "";

if (issues.length === 0) {
  try {
    safeInfo = await fetchJson(`${txServiceBaseUrl}/v1/safes/${liveRecord.liquiditySafeAddress}/`);
    safeOwners = Array.isArray(safeInfo.owners) ? safeInfo.owners : [];
    safeThreshold = Number(safeInfo.threshold || 0);

    if (safeThreshold <= 0 || safeOwners.length <= 0) {
      issue("safeInfo", "Liquidity Safe must have owners and positive threshold.");
    }

    safeTransaction = await fetchJson(`${txServiceBaseUrl}/v1/multisig-transactions/${liveRecord.safeTxHash}/`);

    if (!sameAddress(safeTransaction.safe, liveRecord.liquiditySafeAddress)) {
      issue("safeTransaction.safe", "Safe Transaction Service safe does not match liquidity Safe.");
    }

    if (Number(safeTransaction.nonce) !== Number(liveRecord.safeNonce)) {
      issue("safeTransaction.nonce", "Safe Transaction Service nonce does not match live record.");
    }

    const tx = safePayload.transactions?.[0] || {};

    if (!sameAddress(safeTransaction.to, tx.to)) {
      issue("safeTransaction.to", "Safe Transaction Service target does not match verified payload.");
    }

    if (String(safeTransaction.value ?? "0") !== String(tx.value ?? "0")) {
      issue("safeTransaction.value", "Safe Transaction Service value does not match verified payload.");
    }

    if (String(safeTransaction.data || "").toLowerCase() !== String(tx.data || "").toLowerCase()) {
      issue("safeTransaction.data", "Safe Transaction Service data does not match verified payload.");
    }

    safeTransactionExecuted = safeTransaction.isExecuted === true;
    safeTransactionServicePending = safeTransaction.isExecuted === false;

    if (safeTransactionExecuted) {
      issue("safeTransaction.isExecuted", "Liquidity Safe transaction must not be executed during pending-signature monitoring.");
    }

    if (safeTransaction.transactionHash) {
      issue("safeTransaction.transactionHash", "On-chain execution transaction hash must be empty/null before execution.");
    }

    confirmationCount = Array.isArray(safeTransaction.confirmations) ? safeTransaction.confirmations.length : 0;
    confirmationOwners = Array.isArray(safeTransaction.confirmations)
      ? safeTransaction.confirmations.map((item) => item.owner || item.ownerAddress || "").filter(Boolean)
      : [];

    requiredThreshold = Number(
      safeTransaction.confirmationsRequired ||
      safeTransaction.confirmations_required ||
      liveRecord.requiredThreshold ||
      safeThreshold ||
      0
    );

    if (requiredThreshold <= 0) {
      issue("requiredThreshold", "Required Safe threshold must be positive.");
    }

    missingConfirmationCount = Math.max(0, requiredThreshold - confirmationCount);
    thresholdReached = requiredThreshold > 0 && confirmationCount >= requiredThreshold;

    const safeCode = await rpcCall(rpcUrl, "eth_getCode", [liveRecord.liquiditySafeAddress, "latest"]);
    safeCodePresent = isNonEmptyCode(safeCode);

    if (!safeCodePresent) {
      issue("liquiditySafeAddress.code", "Liquidity Safe address must have contract code.");
    }

    const npmCode = await rpcCall(rpcUrl, "eth_getCode", [safePayload.nonfungiblePositionManager, "latest"]);
    npmCodePresent = isNonEmptyCode(npmCode);

    if (!npmCodePresent) {
      issue("nonfungiblePositionManager.code", "NonfungiblePositionManager must have contract code.");
    }

    if (isAddress(safePayload.poolAddress)) {
      livePoolLiquidity = await readPoolLiquidity(rpcUrl, safePayload.poolAddress);
    }

    if (livePoolLiquidity !== "0") {
      issue("poolLiquidity", `Live pool liquidity is ${livePoolLiquidity}; expected 0.`);
    }

    const mintParams = safePayload.mintParams || {};

    liveBalance0Raw = await readTokenBalance(rpcUrl, mintParams.token0, liveRecord.liquiditySafeAddress);
    liveBalance1Raw = await readTokenBalance(rpcUrl, mintParams.token1, liveRecord.liquiditySafeAddress);
    liveAllowance0Raw = await readTokenAllowance(rpcUrl, mintParams.token0, liveRecord.liquiditySafeAddress, safePayload.nonfungiblePositionManager);
    liveAllowance1Raw = await readTokenAllowance(rpcUrl, mintParams.token1, liveRecord.liquiditySafeAddress, safePayload.nonfungiblePositionManager);

    if (BigInt(liveBalance0Raw) < BigInt(mintParams.amount0Desired)) {
      issue("liveBalances.token0", `Token0 balance ${liveBalance0Raw} is below amount0Desired ${mintParams.amount0Desired}.`);
    }

    if (BigInt(liveBalance1Raw) < BigInt(mintParams.amount1Desired)) {
      issue("liveBalances.token1", `Token1 balance ${liveBalance1Raw} is below amount1Desired ${mintParams.amount1Desired}.`);
    }

    if (BigInt(liveAllowance0Raw) < BigInt(mintParams.amount0Desired)) {
      issue("liveAllowances.token0", `Token0 allowance ${liveAllowance0Raw} is below amount0Desired ${mintParams.amount0Desired}.`);
    }

    if (BigInt(liveAllowance1Raw) < BigInt(mintParams.amount1Desired)) {
      issue("liveAllowances.token1", `Token1 allowance ${liveAllowance1Raw} is below amount1Desired ${mintParams.amount1Desired}.`);
    }
  } catch (error) {
    issue("pendingSignatureMonitoring", error.message);
  }
}

if (issues.length > 0) {
  const failed = {
    schema: "astra-dex-liquidity-safe-pending-signatures-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_LIQUIDITY_SAFE_PENDING_SIGNATURES_MONITORING_FAILED",
    issues
  };

  writeJson(monitoringFile, failed);
  console.log(JSON.stringify(failed, null, 2));
  process.exit(1);
}

const checkedAt = new Date().toISOString();

const status = thresholdReached
  ? "DEX_LIQUIDITY_SAFE_PENDING_SIGNATURES_THRESHOLD_REACHED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING"
  : "DEX_LIQUIDITY_SAFE_PENDING_SIGNATURES_MONITORING_ACTIVE_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING";

const monitoring = {
  schema: "astra-dex-liquidity-safe-pending-signatures-monitoring-v0.1",
  checkedAt,
  status,
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  monitoringOnly: true,
  txServiceBaseUrl,
  liquiditySafeAddress: liveRecord.liquiditySafeAddress,
  safeTxHash: liveRecord.safeTxHash,
  safeNonce: liveRecord.safeNonce,
  safeTransactionUrl: liveRecord.safeTransactionUrl,
  safePayloadHash: liveRecord.safePayloadHash,
  transactionBuilderHash: liveRecord.transactionBuilderHash,
  calldataHash: liveRecord.calldataHash,
  submissionFingerprint: liveRecord.submissionFingerprint,
  safeInfo: {
    owners: safeOwners,
    threshold: safeThreshold,
    nonce: safeInfo.nonce ?? null
  },
  safeTransactionService: {
    safe: safeTransaction.safe,
    nonce: safeTransaction.nonce,
    to: safeTransaction.to,
    value: String(safeTransaction.value ?? ""),
    isExecuted: safeTransaction.isExecuted,
    transactionHash: safeTransaction.transactionHash || null,
    submissionDate: safeTransaction.submissionDate || null,
    modified: safeTransaction.modified || null
  },
  confirmationCount,
  requiredThreshold,
  missingConfirmationCount,
  thresholdReached,
  confirmationOwners,
  safeTransactionServicePending,
  safeTransactionExecuted: false,
  liveChecks: {
    safeCodePresent,
    npmCodePresent,
    poolLiquidity: livePoolLiquidity,
    poolLiquidityVerifiedZero: livePoolLiquidity === "0",
    token0: {
      tokenAddress: safePayload.mintParams.token0,
      desiredRaw: safePayload.mintParams.amount0Desired,
      minRaw: safePayload.mintParams.amount0Min,
      liveBalanceRaw: liveBalance0Raw,
      liveAllowanceRaw: liveAllowance0Raw,
      balanceCoversDesired: BigInt(liveBalance0Raw) >= BigInt(safePayload.mintParams.amount0Desired),
      allowanceCoversDesired: BigInt(liveAllowance0Raw) >= BigInt(safePayload.mintParams.amount0Desired)
    },
    token1: {
      tokenAddress: safePayload.mintParams.token1,
      desiredRaw: safePayload.mintParams.amount1Desired,
      minRaw: safePayload.mintParams.amount1Min,
      liveBalanceRaw: liveBalance1Raw,
      liveAllowanceRaw: liveAllowance1Raw,
      balanceCoversDesired: BigInt(liveBalance1Raw) >= BigInt(safePayload.mintParams.amount1Desired),
      allowanceCoversDesired: BigInt(liveAllowance1Raw) >= BigInt(safePayload.mintParams.amount1Desired)
    }
  },
  pendingSignatureMonitoringComplete: true,
  liquiditySafeSubmissionLiveRecorded: true,
  liquiditySafeTransactionSubmitted: true,
  liquiditySafeTransactionExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  publicTradingLinkApproved: false,
  buyPageActivated: false,
  fullLaunchApproved: false,
  requiredBeforeLiquiditySafeExecutionApproval: {
    pendingSignatureMonitoringComplete: true,
    liquiditySafeTransactionSubmitted: true,
    thresholdReached,
    missingConfirmationCount,
    liquiditySafeTransactionExecuted: false,
    liquidityAdded: false,
    positionMinted: false,
    publicStatusUpdatePrepared: false
  },
  safety: {
    monitoringOnly: true,
    executesLiquiditySafeTransaction: false,
    addsLiquidity: false,
    mintsPositionOnchain: false,
    activatesBuyPage: false,
    approvesPublicTrading: false,
    approvesFullLaunch: false
  },
  issues: []
};

monitoring.monitoringHash = sha256Json(monitoring);

writeJson(monitoringFile, monitoring);

const config = readJsonPath(configFile);

config.status = thresholdReached
  ? "liquidity-safe-pending-signatures-threshold-reached-not-executed-no-liquidity-no-public-trading"
  : "liquidity-safe-pending-signatures-monitoring-active-not-executed-no-liquidity-no-public-trading";
config.pendingSignatureMonitoringComplete = true;
config.liquiditySafeTransactionSubmitted = true;
config.liquiditySafeTransactionExecuted = false;
config.thresholdReached = thresholdReached;
config.confirmationCount = confirmationCount;
config.requiredThreshold = requiredThreshold;
config.missingConfirmationCount = missingConfirmationCount;
config.liquidityAdded = false;
config.positionMinted = false;
config.publicTradingApproved = false;
config.publicTradingLinkApproved = false;
config.buyPageActivationApproved = false;
config.fullLaunchApproved = false;
config.monitoredLiquiditySafePendingSignatures = {
  checkedAt,
  liquiditySafeAddress: monitoring.liquiditySafeAddress,
  safeTxHash: monitoring.safeTxHash,
  safeNonce: monitoring.safeNonce,
  confirmationCount,
  requiredThreshold,
  missingConfirmationCount,
  thresholdReached,
  monitoringHash: monitoring.monitoringHash,
  recordFile: "reports/dex-liquidity-safe-pending-signatures/dex-liquidity-safe-pending-signatures-monitoring.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-safe-pending-signatures-result-v0.1",
  checkedAt,
  status,
  liquiditySafeAddress: monitoring.liquiditySafeAddress,
  safeTxHash: monitoring.safeTxHash,
  safeNonce: monitoring.safeNonce,
  confirmationCount,
  requiredThreshold,
  missingConfirmationCount,
  thresholdReached,
  safeTransactionExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  fullLaunchApproved: false
}, null, 2));
