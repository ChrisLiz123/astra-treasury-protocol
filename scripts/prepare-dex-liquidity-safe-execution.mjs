import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const reportDir = path.join(root, "reports", "dex-liquidity-safe-execution-preparation");
const preparationFile = path.join(reportDir, "dex-liquidity-safe-execution-preparation.json");
const configFile = path.join(root, "configs", "dex-liquidity-safe-execution-preparation.config.json");

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
      "User-Agent": "astra-treasury-protocol-dex-liquidity-safe-execution-preparation/0.1"
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

const executionApprovalStatus = readJson("public-docs/dex-liquidity-safe-execution-approval-status.json");
const executionApproval = readJson("reports/dex-liquidity-safe-execution-approval/dex-liquidity-safe-execution-approval-record.json");
const pendingStatus = readJson("public-docs/dex-liquidity-safe-pending-signatures-status.json");
const pending = readJson("reports/dex-liquidity-safe-pending-signatures/dex-liquidity-safe-pending-signatures-monitoring.json");
const liveStatus = readJson("public-docs/dex-liquidity-safe-submission-live-status.json");
const liveRecord = readJson("reports/dex-liquidity-safe-submission-live/dex-liquidity-safe-submission-live-record.json");
const payloadVerificationStatus = readJson("public-docs/dex-liquidity-safe-payload-verification-status.json");
const payloadVerification = readJson("reports/dex-liquidity-safe-payload-verification/dex-liquidity-safe-payload-verification.json");
const safePayload = readJson("reports/dex-liquidity-provision/payload/liquidity-safe-payload.json");
const transactionBuilder = readJson("reports/dex-liquidity-provision/payload/liquidity-safe-transaction-builder.json");
const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

requireStatus("executionApprovalStatus.status", executionApprovalStatus.status, "DEX_LIQUIDITY_SAFE_EXECUTION_APPROVED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("executionApproval.status", executionApproval.status, "DEX_LIQUIDITY_SAFE_EXECUTION_APPROVED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("pendingStatus.status", pendingStatus.status, "DEX_LIQUIDITY_SAFE_PENDING_SIGNATURES_THRESHOLD_REACHED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("pending.status", pending.status, "DEX_LIQUIDITY_SAFE_PENDING_SIGNATURES_THRESHOLD_REACHED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("liveStatus.status", liveStatus.status, "DEX_LIQUIDITY_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("liveRecord.status", liveRecord.status, "DEX_LIQUIDITY_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("payloadVerificationStatus.status", payloadVerificationStatus.status, "DEX_LIQUIDITY_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("payloadVerification.status", payloadVerification.status, "DEX_LIQUIDITY_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("safePayload.status", safePayload.status, "DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("poolStatus.status", poolStatus.status, "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING");

if (executionApproval.liquiditySafeExecutionApproved !== true || executionApproval.liquiditySafeExecutionApprovalRecorded !== true) {
  issue("executionApproval.approvalFlags", "Execution approval must be recorded and approved.");
}

if (executionApproval.thresholdReached !== true || Number(executionApproval.missingConfirmationCount || 0) !== 0) {
  issue("executionApproval.threshold", "Execution approval must show threshold reached and zero missing confirmations.");
}

if (pending.thresholdReached !== true || Number(pending.missingConfirmationCount || 0) !== 0) {
  issue("pending.threshold", "Pending signatures must show threshold reached and zero missing confirmations.");
}

if (pending.safeTransactionExecuted !== false || pending.liquiditySafeTransactionExecuted !== false || pending.liquidityAdded !== false) {
  issue("pending.executionFlags", "Pending monitoring must show not executed and no liquidity.");
}

if (!isTxHash(liveRecord.safeTxHash)) {
  issue("liveRecord.safeTxHash", "Safe tx hash must be valid.");
}

if (!Number.isInteger(liveRecord.safeNonce) || liveRecord.safeNonce < 0) {
  issue("liveRecord.safeNonce", "Safe nonce must be valid.");
}

if (!isAddress(liveRecord.liquiditySafeAddress)) {
  issue("liveRecord.liquiditySafeAddress", "Liquidity Safe address must be valid.");
}

if (liveRecord.safeTxHash !== pending.safeTxHash || liveRecord.safeTxHash !== executionApproval.safeTxHash) {
  issue("safeTxHash", "Safe tx hash must match live record, pending monitoring, and execution approval.");
}

if (Number(liveRecord.safeNonce) !== Number(pending.safeNonce) || Number(liveRecord.safeNonce) !== Number(executionApproval.safeNonce)) {
  issue("safeNonce", "Safe nonce must match live record, pending monitoring, and execution approval.");
}

if (liveRecord.safePayloadHash !== safePayload.safePayloadHash || pending.safePayloadHash !== safePayload.safePayloadHash || executionApproval.safePayloadHash !== safePayload.safePayloadHash) {
  issue("safePayloadHash", "Safe payload hash must match all records.");
}

if (liveRecord.transactionBuilderHash !== safePayload.transactionBuilderHash || safePayload.transactionBuilderHash !== transactionBuilder.transactionBuilderHash) {
  issue("transactionBuilderHash", "Transaction Builder hash must match records and builder file.");
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
    issue(file, "Forbidden execution/liquidity/public-trading artifact exists. Execution preparation must not execute or add liquidity.");
  }
}

const txServiceBaseUrl = (
  process.env.DEX_LIQUIDITY_SAFE_TX_SERVICE_BASE_URL ||
  "https://safe-transaction-base.safe.global/api"
).replace(/\/+$/, "");

const rpcUrl =
  process.env.DEX_LIQUIDITY_SAFE_EXECUTION_PREPARATION_RPC_URL ||
  process.env.DEX_LIQUIDITY_SAFE_EXECUTION_APPROVAL_RPC_URL ||
  process.env.DEX_LIQUIDITY_SAFE_PENDING_SIGNATURES_RPC_URL ||
  process.env.DEX_POST_EXECUTION_RPC_URL ||
  process.env.MAINNET_MONITOR_RPC_URL ||
  readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

if (!String(rpcUrl || "").startsWith("https://")) {
  issue("DEX_LIQUIDITY_SAFE_EXECUTION_PREPARATION_RPC_URL", "RPC URL must be available and start with https://.");
}

let safeInfo = {};
let safeTransaction = {};
let safeOwners = [];
let safeThreshold = Number(executionApproval.requiredThreshold || pending.requiredThreshold || 0);
let confirmationCount = Number(executionApproval.confirmationCount || pending.confirmationCount || 0);
let requiredThreshold = Number(executionApproval.requiredThreshold || pending.requiredThreshold || 0);
let missingConfirmationCount = Number(executionApproval.missingConfirmationCount || pending.missingConfirmationCount || 0);
let thresholdReached = executionApproval.thresholdReached === true && pending.thresholdReached === true;
let confirmationOwners = Array.isArray(executionApproval.confirmationOwners) ? executionApproval.confirmationOwners : [];
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
    safeThreshold = Number(safeInfo.threshold || safeThreshold || 0);

    safeTransaction = await fetchJson(`${txServiceBaseUrl}/v1/multisig-transactions/${liveRecord.safeTxHash}/`);

    const tx = safePayload.transactions?.[0] || {};

    if (!sameAddress(safeTransaction.safe, liveRecord.liquiditySafeAddress)) {
      issue("safeTransaction.safe", "Safe Transaction Service safe does not match liquidity Safe.");
    }

    if (Number(safeTransaction.nonce) !== Number(liveRecord.safeNonce)) {
      issue("safeTransaction.nonce", "Safe Transaction Service nonce does not match live record.");
    }

    if (!sameAddress(safeTransaction.to, tx.to)) {
      issue("safeTransaction.to", "Safe Transaction Service target does not match verified payload.");
    }

    if (String(safeTransaction.value ?? "0") !== String(tx.value ?? "0")) {
      issue("safeTransaction.value", "Safe Transaction Service value does not match verified payload.");
    }

    if (String(safeTransaction.data || "").toLowerCase() !== String(tx.data || "").toLowerCase()) {
      issue("safeTransaction.data", "Safe Transaction Service data does not match verified payload.");
    }

    if (safeTransaction.isExecuted !== false) {
      issue("safeTransaction.isExecuted", "Safe transaction must still be not executed.");
    }

    if (safeTransaction.transactionHash) {
      issue("safeTransaction.transactionHash", "Execution transaction hash must be empty before execution.");
    }

    confirmationCount = Array.isArray(safeTransaction.confirmations) ? safeTransaction.confirmations.length : confirmationCount;
    confirmationOwners = Array.isArray(safeTransaction.confirmations)
      ? safeTransaction.confirmations.map((item) => item.owner || item.ownerAddress || "").filter(Boolean)
      : confirmationOwners;

    requiredThreshold = Number(
      safeTransaction.confirmationsRequired ||
      safeTransaction.confirmations_required ||
      executionApproval.requiredThreshold ||
      pending.requiredThreshold ||
      safeThreshold ||
      0
    );

    missingConfirmationCount = Math.max(0, requiredThreshold - confirmationCount);
    thresholdReached = requiredThreshold > 0 && confirmationCount >= requiredThreshold;

    if (!thresholdReached || missingConfirmationCount !== 0) {
      issue("safeTransaction.threshold", "Safe transaction must have threshold reached and zero missing confirmations.");
    }

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
    issue("executionPreparationVerification", error.message);
  }
}

if (issues.length > 0) {
  const failed = {
    schema: "astra-dex-liquidity-safe-execution-preparation-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_LIQUIDITY_SAFE_EXECUTION_NOT_PREPARED",
    issues
  };

  writeJson(preparationFile, failed);
  console.log(JSON.stringify(failed, null, 2));
  process.exit(1);
}

const preparedAt = new Date().toISOString();

const executionInstruction = `Open the liquidity Safe on Base and execute only the already-submitted Safe transaction ${liveRecord.safeTxHash} at nonce ${liveRecord.safeNonce}. Confirm the target, value, calldata hash, Safe payload hash, and Transaction Builder hash match this preparation record. Do not create a new transaction. Do not execute unrelated transactions. Record execution evidence immediately after execution. Do not approve public trading, buy page activation, global treasury funding, or full launch.`;

const preparation = {
  schema: "astra-dex-liquidity-safe-execution-preparation-v0.1",
  preparedAt,
  status: "DEX_LIQUIDITY_SAFE_EXECUTION_PREPARED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  preparationOnly: true,
  txServiceBaseUrl,
  liquiditySafeAddress: liveRecord.liquiditySafeAddress,
  safeAddress: liveRecord.safeAddress,
  safeTxHash: liveRecord.safeTxHash,
  safeNonce: liveRecord.safeNonce,
  safeTransactionUrl: liveRecord.safeTransactionUrl,
  safeQueueUrl: `https://app.safe.global/transactions/queue?safe=base:${liveRecord.liquiditySafeAddress}`,
  safeHomeUrl: `https://app.safe.global/home?safe=base:${liveRecord.liquiditySafeAddress}`,
  safePayloadHash: liveRecord.safePayloadHash,
  transactionBuilderHash: liveRecord.transactionBuilderHash,
  calldataHash: liveRecord.calldataHash,
  submissionFingerprint: liveRecord.submissionFingerprint,
  confirmationCount,
  requiredThreshold,
  missingConfirmationCount,
  thresholdReached,
  confirmationOwners,
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
  preparedTransaction: {
    to: safePayload.transactions[0].to,
    value: safePayload.transactions[0].value,
    operation: safePayload.transactions[0].operation,
    operationValue: safePayload.transactions[0].operationValue,
    dataHash: safePayload.transactions[0].dataHash,
    recomputedDataHash: sha256Hex(safePayload.transactions[0].data),
    functionSelector: safePayload.transactions[0].functionSelector,
    functionSignature: safePayload.transactions[0].functionSignature
  },
  executionInstruction,
  operatorWarnings: [
    "Execute only the already-submitted threshold-reached Safe transaction.",
    "Do not create or submit a new Safe transaction.",
    "Confirm Safe tx hash and nonce match this preparation record.",
    "Confirm the transaction target is the verified NonfungiblePositionManager.",
    "Confirm value is 0 and transaction data starts with 0x88316456.",
    "Execution is expected to add liquidity and mint the position; public trading is still not approved.",
    "Do not approve public trading, buy page activation, global treasury funding, or full launch.",
    "Record execution evidence immediately after execution."
  ],
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
  liquiditySafeExecutionPreparationComplete: true,
  operatorExecutionCommandReviewed: true,
  liquiditySafeExecutionApprovalRecorded: true,
  liquiditySafeExecutionApproved: true,
  pendingSignatureMonitoringComplete: true,
  liquiditySafeTransactionSubmitted: true,
  liquiditySafeTransactionExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  publicTradingLinkApproved: false,
  buyPageActivated: false,
  fullLaunchApproved: false,
  requiredBeforeLiquiditySafeExecutionLive: {
    liquiditySafeExecutionPreparationComplete: true,
    operatorExecutionCommandReviewed: true,
    liquiditySafeExecutionApprovalRecorded: true,
    liquiditySafeExecutionApproved: true,
    thresholdReached: true,
    missingConfirmationCount: 0,
    safeTxHashRecorded: true,
    safeNonceRecorded: true,
    safeTransactionStillPending: true,
    liquiditySafeTransactionExecuted: false,
    liquidityAdded: false,
    positionMinted: false,
    publicStatusUpdatePrepared: false
  },
  safety: {
    preparationOnly: true,
    executesLiquiditySafeTransaction: false,
    addsLiquidity: false,
    mintsPositionOnchain: false,
    activatesBuyPage: false,
    approvesPublicTrading: false,
    approvesFullLaunch: false
  }
};

preparation.preparationHash = sha256Json(preparation);

writeJson(preparationFile, preparation);

const config = readJsonPath(configFile);

config.status = "liquidity-safe-execution-prepared-not-executed-no-liquidity-no-public-trading";
config.liquiditySafeExecutionPreparationComplete = true;
config.operatorExecutionCommandReviewed = true;
config.liquiditySafeExecutionApproved = true;
config.pendingSignatureMonitoringComplete = true;
config.thresholdReached = true;
config.missingConfirmationCount = 0;
config.confirmationCount = confirmationCount;
config.requiredThreshold = requiredThreshold;
config.liquiditySafeTransactionSubmitted = true;
config.liquiditySafeTransactionExecuted = false;
config.liquidityAdded = false;
config.positionMinted = false;
config.publicTradingApproved = false;
config.publicTradingLinkApproved = false;
config.buyPageActivationApproved = false;
config.fullLaunchApproved = false;
config.preparedLiquiditySafeExecution = {
  preparedAt,
  liquiditySafeAddress: preparation.liquiditySafeAddress,
  safeTxHash: preparation.safeTxHash,
  safeNonce: preparation.safeNonce,
  safeTransactionUrl: preparation.safeTransactionUrl,
  safePayloadHash: preparation.safePayloadHash,
  transactionBuilderHash: preparation.transactionBuilderHash,
  preparationHash: preparation.preparationHash,
  recordFile: "reports/dex-liquidity-safe-execution-preparation/dex-liquidity-safe-execution-preparation.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-safe-execution-preparation-result-v0.1",
  checkedAt: preparedAt,
  status: preparation.status,
  liquiditySafeAddress: preparation.liquiditySafeAddress,
  safeTxHash: preparation.safeTxHash,
  safeNonce: preparation.safeNonce,
  safeTransactionUrl: preparation.safeTransactionUrl,
  confirmationCount,
  requiredThreshold,
  missingConfirmationCount,
  thresholdReached: true,
  liquiditySafeExecutionPreparationComplete: true,
  liquiditySafeTransactionExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  fullLaunchApproved: false
}, null, 2));
