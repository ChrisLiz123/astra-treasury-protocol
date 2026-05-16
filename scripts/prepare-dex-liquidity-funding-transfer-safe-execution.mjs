import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const recordDir = path.join(root, "reports", "dex-liquidity-funding-transfer-safe-execution-preparation");
const recordFile = path.join(recordDir, "dex-liquidity-funding-transfer-safe-execution-preparation.json");
const configFile = path.join(root, "configs", "dex-liquidity-funding-transfer-safe-execution-preparation.config.json");

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

function readRuntimeEnvValue(key) {
  const runtimeFile = path.join(root, ".runtime", "mainnet-monitor.env");

  if (!fs.existsSync(runtimeFile)) return "";

  const lines = fs.readFileSync(runtimeFile, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const [rawKey, ...rest] = trimmed.split("=");

    if (rawKey.trim() === key) {
      return rest.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }

  return "";
}

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || "").trim());
}

function sameAddress(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
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
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params
    })
  });

  if (!response.ok) {
    throw new Error(`RPC HTTP ${response.status}`);
  }

  const body = await response.json();

  if (body.error) {
    throw new Error(body.error.message || JSON.stringify(body.error));
  }

  return body.result;
}

async function readTokenBalance(rpcUrl, tokenAddress, ownerAddress) {
  const result = await rpcCall(rpcUrl, "eth_call", [
    {
      to: tokenAddress,
      data: "0x70a08231" + encodeAddress(ownerAddress)
    },
    "latest"
  ]);

  return decodeUint(result).toString();
}

async function fetchJson(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "User-Agent": "astra-treasury-protocol-safe-execution-preparation/0.1"
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

const executionApprovalStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-execution-approval-status.json");
const executionApprovalRecord = readJson("reports/dex-liquidity-funding-transfer-safe-execution-approval/dex-liquidity-funding-transfer-safe-execution-approval-record.json");
const pendingStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-pending-signatures-status.json");
const pendingReport = readJson("reports/dex-liquidity-funding-transfer-safe-pending-signatures/dex-liquidity-funding-transfer-safe-pending-signatures-monitoring.json");
const liveStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-submission-live-status.json");
const liveRecord = readJson("reports/dex-liquidity-funding-transfer-safe-submission-live/dex-liquidity-funding-transfer-safe-submission-live-record.json");
const payload = readJson("reports/dex-liquidity-treasury-funding/payload/funding-transfer-safe-payload.json");
const postExecution = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

requireStatus("executionApprovalStatus.status", executionApprovalStatus.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_EXECUTION_APPROVED_NOT_EXECUTED_NO_FUNDS_MOVED");
requireStatus("executionApprovalRecord.status", executionApprovalRecord.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_EXECUTION_APPROVED_NOT_EXECUTED_NO_FUNDS_MOVED");
requireStatus("pendingStatus.status", pendingStatus.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_PENDING_SIGNATURES_THRESHOLD_REACHED_NOT_EXECUTED_NO_FUNDS_MOVED");
requireStatus("pendingReport.status", pendingReport.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_PENDING_SIGNATURES_THRESHOLD_REACHED_NOT_EXECUTED_NO_FUNDS_MOVED");
requireStatus("liveStatus.status", liveStatus.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED_NO_FUNDS_MOVED");
requireStatus("liveRecord.status", liveRecord.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED_NO_FUNDS_MOVED");
requireStatus("payload.status", payload.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_FUNDS_MOVED");
requireStatus("postExecution.status", postExecution.status, "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING");

if (executionApprovalStatus.summary?.fundingTransferSafeExecutionApproved !== true) {
  issue("executionApprovalStatus.summary.fundingTransferSafeExecutionApproved", "Safe execution approval must be recorded.");
}

if (executionApprovalStatus.summary?.safeTransactionExecuted !== false || executionApprovalStatus.summary?.fundingTransferExecuted !== false || executionApprovalStatus.summary?.treasuryFundsMoved !== false) {
  issue("executionApprovalStatus.summary", "Execution approval status must show not executed and no funds moved.");
}

if (pendingStatus.summary?.thresholdReached !== true || Number(pendingStatus.summary?.missingConfirmationCount || 0) !== 0) {
  issue("pendingStatus.summary.threshold", "Pending signatures must show threshold reached and zero missing confirmations.");
}

if (pendingStatus.summary?.safeTransactionExecuted !== false || pendingStatus.summary?.fundingTransferExecuted !== false || pendingStatus.summary?.treasuryFundsMoved !== false) {
  issue("pendingStatus.summary", "Pending signatures status must show not executed and no funds moved.");
}

if (liveStatus.summary?.safeTransactionSubmitted !== true || liveStatus.summary?.safeTransactionExecuted !== false) {
  issue("liveStatus.summary", "Live submission must show submitted/proposed and not executed.");
}

if (!isAddress(payload.sourceSafeAddress) || !isAddress(payload.destinationSafeAddress)) {
  issue("payload.safeAddresses", "Payload source/destination Safe addresses must be valid.");
}

if (payload.payloadHash !== executionApprovalRecord.payloadHash || payload.payloadHash !== pendingReport.payloadHash || payload.payloadHash !== liveRecord.payloadHash) {
  issue("payload.payloadHash", "Payload hash must match execution approval, pending report, and live record.");
}

if (String(liveRecord.safeTxHash) !== String(executionApprovalRecord.safeTxHash) || String(liveRecord.safeTxHash) !== String(pendingReport.safeTxHash)) {
  issue("safeTxHash", "Safe tx hash must match across live, pending, and execution approval records.");
}

if (Number(liveRecord.safeNonce) !== Number(executionApprovalRecord.safeNonce) || Number(liveRecord.safeNonce) !== Number(pendingReport.safeNonce)) {
  issue("safeNonce", "Safe nonce must match across live, pending, and execution approval records.");
}

if (postExecution.summary?.liquidityVerifiedZero !== true || String(postExecution.summary?.poolLiquidity || "") !== "0") {
  issue("postExecution.summary.poolLiquidity", "Pool liquidity must remain zero.");
}

if (fullLaunch.fullLaunchApproved !== false) {
  issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
}

if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
  issue("treasuryFunding", "Global treasury funding must remain not approved and not executed.");
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
  "reports/dex-liquidity-treasury-funding/live/funds-moved.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  "reports/dex-liquidity-provision/payload/token-approval-safe-payload.json",
  "public-docs/dex-liquidity-added-status.json",
  "public-docs/dex-public-trading-live-status.json"
];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden funds-moved/liquidity/public-trading artifact exists. Execution preparation must not execute, move funds, or add liquidity.");
  }
}

const txServiceBaseUrl = (
  process.env.DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_TX_SERVICE_BASE_URL ||
  "https://safe-transaction-base.safe.global/api"
).replace(/\/+$/, "");

const rpcUrl =
  process.env.DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_EXECUTION_PREPARATION_RPC_URL ||
  process.env.DEX_LIQUIDITY_FUNDING_TRANSFER_PENDING_SIGNATURES_RPC_URL ||
  process.env.DEX_POST_EXECUTION_RPC_URL ||
  process.env.MAINNET_MONITOR_RPC_URL ||
  readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

if (!String(rpcUrl || "").startsWith("https://")) {
  issue("DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_EXECUTION_PREPARATION_RPC_URL", "RPC URL must be available and start with https://.");
}

let safeTransactionService = {};
let serviceThresholdReached = false;
let serviceExecutionConfirmedFalse = false;
let executionReadinessChecks = [];

if (issues.length === 0) {
  try {
    safeTransactionService = await fetchJson(`${txServiceBaseUrl}/v1/multisig-transactions/${liveRecord.safeTxHash}/`);

    if (!sameAddress(safeTransactionService.safe, payload.sourceSafeAddress)) {
      issue("safeTransactionService.safe", "Safe Transaction Service safe address does not match source Safe.");
    }

    if (Number(safeTransactionService.nonce) !== Number(liveRecord.safeNonce)) {
      issue("safeTransactionService.nonce", "Safe Transaction Service nonce does not match recorded nonce.");
    }

    if (safeTransactionService.isExecuted !== false) {
      issue("safeTransactionService.isExecuted", "Safe transaction must not be executed during execution preparation.");
    }

    if (safeTransactionService.transactionHash) {
      issue("safeTransactionService.transactionHash", "On-chain transaction hash must be empty/null before execution.");
    }

    const confirmationCount = Array.isArray(safeTransactionService.confirmations) ? safeTransactionService.confirmations.length : 0;
    const requiredThreshold = Number(safeTransactionService.confirmationsRequired ?? pendingReport.safeTransactionService?.requiredThreshold ?? 0);

    serviceThresholdReached = requiredThreshold > 0 && confirmationCount >= requiredThreshold;
    serviceExecutionConfirmedFalse = safeTransactionService.isExecuted === false;

    if (!serviceThresholdReached) {
      issue("safeTransactionService.thresholdReached", "Safe Transaction Service no longer shows threshold reached.");
    }

    for (const tx of payload.transactions || []) {
      const matchingPendingCheck = (pendingReport.transactionChecks || []).find((item) => item.id === tx.id);

      const sourceBalanceRaw = await readTokenBalance(rpcUrl, tx.tokenAddress, payload.sourceSafeAddress);
      const destinationBalanceRaw = await readTokenBalance(rpcUrl, tx.tokenAddress, payload.destinationSafeAddress);

      const expectedDestinationBalanceRaw = matchingPendingCheck?.expectedDestinationBalanceRaw || "0";
      const sourceBalanceCoversTransfer = BigInt(sourceBalanceRaw || "0") >= BigInt(tx.amountRaw || "0");
      const destinationBalanceUnchanged = String(destinationBalanceRaw) === String(expectedDestinationBalanceRaw);

      if (!sourceBalanceCoversTransfer) {
        issue(`transactions.${tx.id}.sourceBalance`, `Source balance ${sourceBalanceRaw} no longer covers transfer ${tx.amountRaw}.`);
      }

      if (!destinationBalanceUnchanged) {
        issue(`transactions.${tx.id}.destinationBalance`, `Destination balance ${destinationBalanceRaw} differs from expected pre-execution balance ${expectedDestinationBalanceRaw}.`);
      }

      executionReadinessChecks.push({
        id: tx.id,
        role: tx.role,
        symbol: tx.symbol,
        tokenAddress: tx.tokenAddress,
        amountRaw: tx.amountRaw,
        amountHuman: tx.amountHuman,
        sourceBalanceRaw,
        sourceBalanceCoversTransfer,
        destinationBalanceRaw,
        expectedDestinationBalanceRaw,
        destinationBalanceUnchanged,
        fundingTransferExecuted: false
      });
    }
  } catch (error) {
    issue("safeTransactionService", error.message);
  }
}

if (issues.length > 0) {
  console.log(JSON.stringify({
    schema: "astra-dex-liquidity-funding-transfer-safe-execution-preparation-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_EXECUTION_NOT_PREPARED",
    issues
  }, null, 2));
  process.exit(1);
}

fs.mkdirSync(recordDir, { recursive: true });

const preparedAt = new Date().toISOString();

const record = {
  schema: "astra-dex-liquidity-funding-transfer-safe-execution-preparation-v0.1",
  preparedAt,
  status: "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_EXECUTION_PREPARED_NOT_EXECUTED_NO_FUNDS_MOVED",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  sourceSafeAddress: payload.sourceSafeAddress,
  destinationSafeAddress: payload.destinationSafeAddress,
  safeTxHash: liveRecord.safeTxHash,
  safeNonce: liveRecord.safeNonce,
  safeTransactionUrl: liveRecord.safeTransactionUrl,
  payloadHash: payload.payloadHash,
  executionApprovalReference: "public-docs/dex-liquidity-funding-transfer-safe-execution-approval-status.json",
  pendingSignaturesReference: "public-docs/dex-liquidity-funding-transfer-safe-pending-signatures-status.json",
  liveSubmissionReference: "public-docs/dex-liquidity-funding-transfer-safe-submission-live-status.json",
  safeTransactionService: {
    baseUrl: txServiceBaseUrl,
    safe: safeTransactionService.safe,
    nonce: safeTransactionService.nonce,
    isExecuted: safeTransactionService.isExecuted,
    transactionHash: safeTransactionService.transactionHash || null,
    confirmationCount: Array.isArray(safeTransactionService.confirmations) ? safeTransactionService.confirmations.length : 0,
    confirmationsRequired: safeTransactionService.confirmationsRequired ?? pendingReport.safeTransactionService?.requiredThreshold ?? null,
    submissionDate: safeTransactionService.submissionDate || null,
    modified: safeTransactionService.modified || null
  },
  serviceThresholdReached,
  serviceExecutionConfirmedFalse,
  executionReadinessChecks,
  safeExecutionPreparationComplete: true,
  operatorExecutionCommandReviewed: true,
  operatorInstruction: "In the live execution milestone, execute only the recorded Safe transaction hash from the source Safe on Base. Do not execute unrelated transactions. Record execution evidence immediately after execution.",
  requiredBeforeFundingTransferSafeExecutionLive: {
    safeExecutionPreparationComplete: true,
    operatorExecutionCommandReviewed: true,
    safeExecutionApprovalRecorded: true,
    pendingSignatureMonitoringComplete: true,
    thresholdReached: true,
    safeTransactionSubmitted: true,
    safeTransactionExecuted: false,
    fundingTransferExecuted: false,
    safeTxHashRecorded: true,
    safeNonceRecorded: true,
    publicStatusUpdatePrepared: false
  },
  flags: {
    safeExecutionPreparationComplete: true,
    operatorExecutionCommandReviewed: true,
    safeTransactionSubmitted: true,
    safeTransactionExecuted: false,
    fundingTransferSubmitted: true,
    fundingTransferExecuted: false,
    treasuryFundsMoved: false,
    globalTreasuryFundingApproved: false,
    globalTreasuryFundingExecuted: false,
    tokenApprovalPayloadGenerated: false,
    tokenApprovalExecuted: false,
    liquidityMintCalldataGenerated: false,
    liquiditySafePayloadGenerated: false,
    liquiditySafeTransactionSubmitted: false,
    liquiditySafeTransactionExecuted: false,
    liquidityAdded: false,
    positionMinted: false,
    publicTradingApproved: false,
    publicTradingLinkApproved: false,
    buyPageActivated: false,
    fullLaunchApproved: false
  },
  safety: {
    preparationOnly: true,
    executesSafeTransactionByThisScript: false,
    movesTreasuryFunds: false,
    executesTokenApproval: false,
    generatesLiquidityCalldata: false,
    addsLiquidity: false,
    mintsPosition: false,
    activatesBuyPage: false,
    approvesPublicTrading: false,
    approvesFullLaunch: false
  }
};

record.preparationHash = sha256Json(record);

writeJson(recordFile, record);

const config = readJsonPath(configFile);

config.status = "funding-transfer-safe-execution-prepared-not-executed-no-funds-moved";
config.safeExecutionPreparationComplete = true;
config.operatorExecutionCommandReviewed = true;
config.safeTransactionSubmitted = true;
config.safeTransactionExecuted = false;
config.fundingTransferSubmitted = true;
config.fundingTransferExecuted = false;
config.treasuryFundsMoved = false;
config.globalTreasuryFundingApproved = false;
config.globalTreasuryFundingExecuted = false;
config.tokenApprovalPayloadGenerated = false;
config.tokenApprovalExecuted = false;
config.liquidityMintCalldataGenerated = false;
config.liquiditySafePayloadGenerated = false;
config.liquiditySafeTransactionSubmitted = false;
config.liquiditySafeTransactionExecuted = false;
config.liquidityAdded = false;
config.positionMinted = false;
config.publicTradingApproved = false;
config.publicTradingLinkApproved = false;
config.buyPageActivationApproved = false;
config.fullLaunchApproved = false;
config.preparedFundingTransferSafeExecution = {
  preparedAt,
  sourceSafeAddress: record.sourceSafeAddress,
  destinationSafeAddress: record.destinationSafeAddress,
  safeTxHash: record.safeTxHash,
  safeNonce: record.safeNonce,
  payloadHash: record.payloadHash,
  recordFile: "reports/dex-liquidity-funding-transfer-safe-execution-preparation/dex-liquidity-funding-transfer-safe-execution-preparation.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-funding-transfer-safe-execution-preparation-result-v0.1",
  checkedAt: preparedAt,
  status: record.status,
  sourceSafeAddress: record.sourceSafeAddress,
  destinationSafeAddress: record.destinationSafeAddress,
  safeTxHash: record.safeTxHash,
  safeNonce: record.safeNonce,
  serviceThresholdReached,
  serviceExecutionConfirmedFalse,
  safeExecutionPreparationComplete: true,
  safeTransactionExecuted: false,
  fundingTransferExecuted: false,
  treasuryFundsMoved: false,
  tokenApprovalExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  fullLaunchApproved: false
}, null, 2));
