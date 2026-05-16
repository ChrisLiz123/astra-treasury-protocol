import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const reportDir = path.join(root, "reports", "dex-liquidity-token-approval-safe-pending-signatures");
const reportFile = path.join(reportDir, "dex-liquidity-token-approval-safe-pending-signatures-monitoring.json");
const configFile = path.join(root, "configs", "dex-liquidity-token-approval-safe-pending-signatures.config.json");

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

function sameAddress(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

function isTxHash(value) {
  return /^0x[0-9a-fA-F]{64}$/.test(String(value || "").trim());
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

async function fetchJson(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "User-Agent": "astra-treasury-protocol-token-approval-safe-pending-signatures/0.1"
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

const liveStatus = readJson("public-docs/dex-liquidity-token-approval-safe-submission-live-status.json");
const liveRecord = readJson("reports/dex-liquidity-token-approval-safe-submission-live/dex-liquidity-token-approval-safe-submission-live-record.json");
const dryRunStatus = readJson("public-docs/dex-liquidity-token-approval-safe-submission-dry-run-status.json");
const dryRun = readJson("reports/dex-liquidity-token-approval-safe-submission-dry-run/dex-liquidity-token-approval-safe-submission-dry-run.json");
const verificationStatus = readJson("public-docs/dex-liquidity-token-approval-safe-payload-verification-status.json");
const payload = readJson("reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json");
const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

requireStatus("liveStatus.status", liveStatus.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("liveRecord.status", liveRecord.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("dryRunStatus.status", dryRunStatus.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_DRY_RUN_COMPLETE_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("dryRun.status", dryRun.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_DRY_RUN_COMPLETE_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("verificationStatus.status", verificationStatus.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("payload.status", payload.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("poolStatus.status", poolStatus.status, "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING");

if (liveStatus.summary?.tokenApprovalSafeSubmissionLiveRecorded !== true || liveStatus.summary?.tokenApprovalSafeTransactionSubmitted !== true) {
  issue("liveStatus.summary.submission", "Live submission status must show submitted/proposed.");
}

if (liveStatus.summary?.tokenApprovalSafeTransactionExecuted !== false || liveStatus.summary?.tokenApprovalExecuted !== false || liveStatus.summary?.liquidityAdded !== false) {
  issue("liveStatus.summary.flags", "Live submission status must show not executed, no approval execution, and no liquidity.");
}

if (!isTxHash(liveRecord.safeTxHash)) {
  issue("liveRecord.safeTxHash", "Safe tx hash must be recorded.");
}

if (!Number.isInteger(liveRecord.safeNonce) || liveRecord.safeNonce < 0) {
  issue("liveRecord.safeNonce", "Safe nonce must be recorded.");
}

if (!isAddress(payload.liquiditySafeAddress) || !isAddress(payload.approvalSpender)) {
  issue("payload.addresses", "Payload liquidity Safe and approval spender must be valid.");
}

if (payload.payloadHash !== liveRecord.payloadHash) {
  issue("payload.payloadHash", "Payload hash must match live submission record.");
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
  "reports/dex-liquidity-token-approval/live/token-approval-executed.json",
  "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "public-docs/dex-liquidity-added-status.json",
  "public-docs/dex-public-trading-live-status.json"
];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden token-approval-executed/liquidity/public-trading artifact exists. Monitoring must not execute approvals or add liquidity.");
  }
}

const txServiceBaseUrl = (
  process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_TX_SERVICE_BASE_URL ||
  "https://safe-transaction-base.safe.global/api"
).replace(/\/+$/, "");

const rpcUrl =
  process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_PENDING_SIGNATURES_RPC_URL ||
  process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_SUBMISSION_DRY_RUN_RPC_URL ||
  process.env.DEX_POST_EXECUTION_RPC_URL ||
  process.env.MAINNET_MONITOR_RPC_URL ||
  readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

if (!String(rpcUrl || "").startsWith("https://")) {
  issue("DEX_LIQUIDITY_TOKEN_APPROVAL_PENDING_SIGNATURES_RPC_URL", "RPC URL must be available and start with https://.");
}

let safeTransactionService = {};
let safeInfo = {};
let confirmationCount = 0;
let requiredThreshold = 0;
let missingConfirmationCount = 0;
let thresholdReached = false;
let approvalStateChecks = [];

if (issues.length === 0) {
  try {
    safeTransactionService = await fetchJson(`${txServiceBaseUrl}/v1/multisig-transactions/${liveRecord.safeTxHash}/`);
    safeInfo = await fetchJson(`${txServiceBaseUrl}/v1/safes/${payload.liquiditySafeAddress}/`);

    if (!sameAddress(safeTransactionService.safe, payload.liquiditySafeAddress)) {
      issue("safeTransactionService.safe", "Safe Transaction Service safe address does not match liquidity Safe.");
    }

    if (Number(safeTransactionService.nonce) !== Number(liveRecord.safeNonce)) {
      issue("safeTransactionService.nonce", "Safe Transaction Service nonce does not match recorded nonce.");
    }

    if (safeTransactionService.isExecuted !== false) {
      issue("safeTransactionService.isExecuted", "Safe transaction must not be executed during pending-signatures monitoring.");
    }

    if (safeTransactionService.transactionHash) {
      issue("safeTransactionService.transactionHash", "On-chain transaction hash must be empty/null before execution.");
    }

    confirmationCount = Array.isArray(safeTransactionService.confirmations)
      ? safeTransactionService.confirmations.length
      : 0;

    requiredThreshold = Number(
      safeTransactionService.confirmationsRequired ??
      safeInfo.threshold ??
      0
    );

    if (!Number.isInteger(requiredThreshold) || requiredThreshold <= 0) {
      issue("requiredThreshold", "Required Safe threshold must be a positive integer.");
    }

    missingConfirmationCount = requiredThreshold > confirmationCount
      ? requiredThreshold - confirmationCount
      : 0;

    thresholdReached = requiredThreshold > 0 && confirmationCount >= requiredThreshold;

    for (const tx of payload.transactions || []) {
      const currentBalanceRaw = await readTokenBalance(rpcUrl, tx.tokenAddress, payload.liquiditySafeAddress);
      const currentAllowanceRaw = await readTokenAllowance(rpcUrl, tx.tokenAddress, payload.liquiditySafeAddress, payload.approvalSpender);

      const allowanceStillUnexecuted = String(currentAllowanceRaw) === String(tx.currentAllowanceRaw || currentAllowanceRaw);
      const balanceCoversFinalApproval = tx.approvalMode === "set-allowance-to-required-amount"
        ? BigInt(currentBalanceRaw || "0") >= BigInt(tx.amountRaw || "0")
        : true;

      if (!allowanceStillUnexecuted) {
        issue(`transactions.${tx.id}.currentAllowanceRaw`, `Current allowance ${currentAllowanceRaw} differs from recorded pre-submission allowance ${tx.currentAllowanceRaw}.`);
      }

      if (!balanceCoversFinalApproval) {
        issue(`transactions.${tx.id}.currentBalanceRaw`, `Current balance ${currentBalanceRaw} is below approval amount ${tx.amountRaw}.`);
      }

      approvalStateChecks.push({
        id: tx.id,
        role: tx.role,
        symbol: tx.symbol,
        tokenAddress: tx.tokenAddress,
        approvalMode: tx.approvalMode,
        amountRaw: tx.amountRaw,
        amountHuman: tx.amountHuman,
        liquiditySafeAddress: payload.liquiditySafeAddress,
        approvalSpender: payload.approvalSpender,
        currentBalanceRaw,
        currentAllowanceRaw,
        recordedCurrentAllowanceRaw: tx.currentAllowanceRaw || "",
        allowanceStillUnexecuted,
        balanceCoversFinalApproval,
        tokenApprovalSafeTransactionExecuted: false,
        tokenApprovalExecuted: false
      });
    }
  } catch (error) {
    issue("safeTransactionService", error.message);
  }
}

if (issues.length > 0) {
  const failed = {
    schema: "astra-dex-liquidity-token-approval-safe-pending-signatures-monitoring-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PENDING_SIGNATURES_MONITORING_REVIEW_REQUIRED",
    safeTxHash: liveRecord.safeTxHash || "",
    issues
  };

  writeJson(reportFile, failed);
  console.log(JSON.stringify(failed, null, 2));
  process.exit(1);
}

const monitoredAt = new Date().toISOString();

const status = thresholdReached
  ? "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PENDING_SIGNATURES_THRESHOLD_REACHED_NOT_EXECUTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY"
  : "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PENDING_SIGNATURES_MONITORING_ACTIVE_NOT_EXECUTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY";

const report = {
  schema: "astra-dex-liquidity-token-approval-safe-pending-signatures-monitoring-v0.1",
  monitoredAt,
  status,
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  liquiditySafeAddress: payload.liquiditySafeAddress,
  approvalSpender: payload.approvalSpender,
  payloadHash: payload.payloadHash,
  transactionBuilderHash: liveRecord.transactionBuilderHash,
  safeTxHash: liveRecord.safeTxHash,
  safeNonce: liveRecord.safeNonce,
  safeTransactionUrl: liveRecord.safeTransactionUrl,
  txServiceBaseUrl,
  safeTransactionService: {
    safe: safeTransactionService.safe,
    nonce: safeTransactionService.nonce,
    isExecuted: safeTransactionService.isExecuted,
    transactionHash: safeTransactionService.transactionHash || null,
    submissionDate: safeTransactionService.submissionDate || null,
    modified: safeTransactionService.modified || null,
    confirmationCount,
    requiredThreshold,
    missingConfirmationCount,
    thresholdReached
  },
  safeInfo: {
    owners: safeInfo.owners || [],
    threshold: safeInfo.threshold || null
  },
  approvalStateChecks,
  pendingSignatureMonitoringComplete: true,
  tokenApprovalSafeSubmissionLiveRecorded: true,
  tokenApprovalSafeTransactionSubmitted: true,
  tokenApprovalSafeTransactionExecuted: false,
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
  fullLaunchApproved: false,
  requiredBeforeTokenApprovalSafeExecutionApproval: {
    pendingSignatureMonitoringComplete: true,
    tokenApprovalSafeTransactionSubmitted: true,
    tokenApprovalSafeTransactionExecuted: false,
    tokenApprovalExecuted: false,
    safeTxHashRecorded: true,
    safeNonceRecorded: true,
    thresholdReached,
    safeExecutionApprovalRecorded: false,
    publicStatusUpdatePrepared: false
  },
  safety: {
    monitoringOnly: true,
    executesTokenApproval: false,
    generatesLiquidityCalldata: false,
    addsLiquidity: false,
    mintsPosition: false,
    activatesBuyPage: false,
    approvesPublicTrading: false,
    approvesFullLaunch: false
  }
};

report.monitoringHash = sha256Json(report);

writeJson(reportFile, report);

const config = readJsonPath(configFile);

config.status = thresholdReached
  ? "token-approval-safe-pending-signatures-threshold-reached-not-executed-no-approvals-executed-no-liquidity"
  : "token-approval-safe-pending-signatures-monitoring-active-not-executed-no-approvals-executed-no-liquidity";
config.pendingSignatureMonitoringComplete = true;
config.thresholdReached = thresholdReached;
config.tokenApprovalSafeSubmissionLiveRecorded = true;
config.tokenApprovalSafeTransactionSubmitted = true;
config.tokenApprovalSafeTransactionExecuted = false;
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
config.pendingSignatureMonitoring = {
  monitoredAt,
  liquiditySafeAddress: payload.liquiditySafeAddress,
  safeTxHash: liveRecord.safeTxHash,
  safeNonce: liveRecord.safeNonce,
  confirmationCount,
  requiredThreshold,
  missingConfirmationCount,
  thresholdReached,
  recordFile: "reports/dex-liquidity-token-approval-safe-pending-signatures/dex-liquidity-token-approval-safe-pending-signatures-monitoring.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-token-approval-safe-pending-signatures-monitoring-result-v0.1",
  checkedAt: monitoredAt,
  status,
  liquiditySafeAddress: payload.liquiditySafeAddress,
  safeTxHash: liveRecord.safeTxHash,
  safeNonce: liveRecord.safeNonce,
  confirmationCount,
  requiredThreshold,
  missingConfirmationCount,
  thresholdReached,
  tokenApprovalSafeTransactionExecuted: false,
  tokenApprovalExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  fullLaunchApproved: false
}, null, 2));
