import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const confirm = process.env.DEX_LIQUIDITY_SAFE_SUBMISSION_LIVE_CONFIRM || "";
const safeTxHash = process.env.DEX_LIQUIDITY_SAFE_TX_HASH || "";
const safeNonceRaw = process.env.DEX_LIQUIDITY_SAFE_NONCE || "";
const safeTransactionUrlEnv = process.env.DEX_LIQUIDITY_SAFE_TRANSACTION_URL || "";
const submissionMethod = process.env.DEX_LIQUIDITY_SAFE_SUBMISSION_METHOD || "";
const submittedBy = process.env.DEX_LIQUIDITY_SAFE_SUBMITTED_BY || "";
const submittedAt = process.env.DEX_LIQUIDITY_SAFE_SUBMITTED_AT || new Date().toISOString();
const submissionReference = process.env.DEX_LIQUIDITY_SAFE_SUBMISSION_REFERENCE || "";
const overwrite = process.env.OVERWRITE_DEX_LIQUIDITY_SAFE_SUBMISSION_LIVE || "";

const requiredConfirm = "RECORD_DEX_LIQUIDITY_SAFE_SUBMISSION_LIVE_ONLY_NOT_EXECUTION";

const recordDir = path.join(root, "reports", "dex-liquidity-safe-submission-live");
const recordFile = path.join(recordDir, "dex-liquidity-safe-submission-live-record.json");
const configFile = path.join(root, "configs", "dex-liquidity-safe-submission-live.config.json");

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

async function fetchJson(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "User-Agent": "astra-treasury-protocol-dex-liquidity-safe-submission-live/0.1"
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

if (confirm !== requiredConfirm) {
  issue("DEX_LIQUIDITY_SAFE_SUBMISSION_LIVE_CONFIRM", `Must equal ${requiredConfirm}.`);
}

if (!isTxHash(safeTxHash)) {
  issue("DEX_LIQUIDITY_SAFE_TX_HASH", "Safe tx hash must be a valid 0x-prefixed 32-byte hash.");
}

if (!/^\d+$/.test(String(safeNonceRaw || ""))) {
  issue("DEX_LIQUIDITY_SAFE_NONCE", "Safe nonce must be a non-negative integer string.");
}

requireUsable("DEX_LIQUIDITY_SAFE_SUBMISSION_METHOD", submissionMethod);
requireUsable("DEX_LIQUIDITY_SAFE_SUBMITTED_BY", submittedBy);
requireUsable("DEX_LIQUIDITY_SAFE_SUBMISSION_REFERENCE", submissionReference);

if (fs.existsSync(recordFile) && overwrite !== "YES") {
  issue(
    "OVERWRITE_DEX_LIQUIDITY_SAFE_SUBMISSION_LIVE",
    "Live submission record already exists. Set OVERWRITE_DEX_LIQUIDITY_SAFE_SUBMISSION_LIVE=YES only if replacing intentionally."
  );
}

const dryRunStatus = readJson("public-docs/dex-liquidity-safe-submission-dry-run-status.json");
const dryRun = readJson("reports/dex-liquidity-safe-submission-dry-run/dex-liquidity-safe-submission-dry-run.json");
const preparationStatus = readJson("public-docs/dex-liquidity-safe-submission-preparation-status.json");
const preparation = readJson("reports/dex-liquidity-safe-submission-preparation/dex-liquidity-safe-submission-preparation.json");
const submissionApprovalStatus = readJson("public-docs/dex-liquidity-safe-submission-approval-status.json");
const payloadVerificationStatus = readJson("public-docs/dex-liquidity-safe-payload-verification-status.json");
const payloadVerification = readJson("reports/dex-liquidity-safe-payload-verification/dex-liquidity-safe-payload-verification.json");
const payloadStatus = readJson("public-docs/dex-liquidity-safe-payload-status.json");
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

requireStatus("dryRunStatus.status", dryRunStatus.status, "DEX_LIQUIDITY_SAFE_SUBMISSION_DRY_RUN_COMPLETE_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("dryRun.status", dryRun.status, "DEX_LIQUIDITY_SAFE_SUBMISSION_DRY_RUN_COMPLETE_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("preparationStatus.status", preparationStatus.status, "DEX_LIQUIDITY_SAFE_SUBMISSION_PREPARED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("preparation.status", preparation.status, "DEX_LIQUIDITY_SAFE_SUBMISSION_PREPARED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("submissionApprovalStatus.status", submissionApprovalStatus.status, "DEX_LIQUIDITY_SAFE_SUBMISSION_APPROVED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("payloadVerificationStatus.status", payloadVerificationStatus.status, "DEX_LIQUIDITY_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("payloadVerification.status", payloadVerification.status, "DEX_LIQUIDITY_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("payloadStatus.status", payloadStatus.status, "DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("safePayload.status", safePayload.status, "DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("poolStatus.status", poolStatus.status, "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING");

if (dryRunStatus.summary?.liquiditySafeSubmissionDryRunComplete !== true) {
  issue("dryRunStatus.summary.liquiditySafeSubmissionDryRunComplete", "Submission dry run must be complete.");
}

if (dryRunStatus.summary?.noDuplicatePendingSafeTransaction !== true) {
  issue("dryRunStatus.summary.noDuplicatePendingSafeTransaction", "Dry run must show no duplicate pending transaction before live submission.");
}

if (preparationStatus.summary?.liquiditySafeSubmissionPreparationComplete !== true || preparationStatus.summary?.operatorSubmissionCommandReviewed !== true) {
  issue("preparationStatus.summary", "Submission preparation and operator command review must be complete.");
}

if (submissionApprovalStatus.summary?.liquiditySafeSubmissionApproved !== true) {
  issue("submissionApprovalStatus.summary.liquiditySafeSubmissionApproved", "Submission approval must be recorded.");
}

if (payloadVerificationStatus.summary?.liquiditySafePayloadVerified !== true || payloadVerificationStatus.summary?.safePayloadHashVerified !== true || payloadVerificationStatus.summary?.transactionBuilderHashVerified !== true || payloadVerificationStatus.summary?.transactionDataVerified !== true) {
  issue("payloadVerificationStatus.summary", "Safe payload must be verified.");
}

if (!isAddress(safePayload.safeAddress) || !isAddress(safePayload.liquiditySafeAddress)) {
  issue("safePayload.safeAddress", "Safe payload Safe address must be valid.");
}

if (!sameAddress(safePayload.safeAddress, safePayload.liquiditySafeAddress)) {
  issue("safePayload.safeAddress", "safeAddress must equal liquiditySafeAddress.");
}

if (!sameAddress(safePayload.liquiditySafeAddress, payloadVerification.liquiditySafeAddress)) {
  issue("safePayload.liquiditySafeAddress", "Safe payload liquidity Safe must match verification record.");
}

if (safePayload.safePayloadHash !== payloadVerification.safePayloadHash || safePayload.safePayloadHash !== dryRun.safePayloadHash) {
  issue("safePayload.safePayloadHash", "Safe payload hash must match verification and dry run.");
}

if (safePayload.transactionBuilderHash !== transactionBuilder.transactionBuilderHash || safePayload.transactionBuilderHash !== dryRun.transactionBuilderHash) {
  issue("safePayload.transactionBuilderHash", "Transaction Builder hash must match builder and dry run.");
}

if (safePayload.calldataHash !== payloadVerification.calldataHash || safePayload.calldataHash !== dryRun.calldataHash) {
  issue("safePayload.calldataHash", "Calldata hash must match verification and dry run.");
}

if (!Array.isArray(safePayload.transactions) || safePayload.transactions.length !== 1) {
  issue("safePayload.transactions", "Safe payload must contain exactly one transaction.");
}

const tx = safePayload.transactions?.[0] || {};

if (!isAddress(tx.to)) {
  issue("safePayload.transactions.0.to", "Transaction target must be valid.");
}

if (String(tx.value) !== "0" || tx.operation !== "CALL" || tx.operationValue !== 0) {
  issue("safePayload.transactions.0.call", "Transaction must be CALL with value 0.");
}

if (!String(tx.data || "").startsWith("0x88316456")) {
  issue("safePayload.transactions.0.data", "Transaction data must be Uniswap V3 mint calldata.");
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
  "reports/dex-liquidity-safe-pending-signatures/dex-liquidity-safe-pending-signatures-monitoring.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "public-docs/dex-liquidity-added-status.json",
  "public-docs/dex-public-trading-live-status.json"
];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden pending-signature/liquidity/public-trading artifact exists. Live submission must not add liquidity or enable trading.");
  }
}

const txServiceBaseUrl = (
  process.env.DEX_LIQUIDITY_SAFE_TX_SERVICE_BASE_URL ||
  "https://safe-transaction-base.safe.global/api"
).replace(/\/+$/, "");

let safeTransactionService = {};
let confirmationCount = 0;
let requiredThreshold = 0;
let missingConfirmationCount = 0;
let thresholdReached = false;
let safeTransactionServicePending = false;

if (issues.length === 0) {
  try {
    safeTransactionService = await fetchJson(`${txServiceBaseUrl}/v1/multisig-transactions/${safeTxHash}/`);

    if (!sameAddress(safeTransactionService.safe, safePayload.liquiditySafeAddress)) {
      issue("safeTransactionService.safe", "Safe Transaction Service safe does not match liquidity Safe.");
    }

    if (Number(safeTransactionService.nonce) !== Number(safeNonceRaw)) {
      issue("safeTransactionService.nonce", "Safe Transaction Service nonce does not match recorded nonce.");
    }

    if (!sameAddress(safeTransactionService.to, tx.to)) {
      issue("safeTransactionService.to", "Safe Transaction Service target does not match verified payload.");
    }

    if (String(safeTransactionService.value ?? "0") !== String(tx.value ?? "0")) {
      issue("safeTransactionService.value", "Safe Transaction Service value does not match verified payload.");
    }

    if (String(safeTransactionService.data || "").toLowerCase() !== String(tx.data || "").toLowerCase()) {
      issue("safeTransactionService.data", "Safe Transaction Service data does not match verified payload.");
    }

    if (safeTransactionService.isExecuted !== false) {
      issue("safeTransactionService.isExecuted", "Liquidity Safe transaction must not be executed during submission.");
    }

    if (safeTransactionService.transactionHash) {
      issue("safeTransactionService.transactionHash", "On-chain execution transaction hash must be empty/null during submission.");
    }

    confirmationCount = Array.isArray(safeTransactionService.confirmations) ? safeTransactionService.confirmations.length : 0;
    requiredThreshold = Number(safeTransactionService.confirmationsRequired || safeTransactionService.confirmations_required || dryRun.safeInfo?.threshold || 0);
    missingConfirmationCount = Math.max(0, requiredThreshold - confirmationCount);
    thresholdReached = requiredThreshold > 0 && confirmationCount >= requiredThreshold;
    safeTransactionServicePending = safeTransactionService.isExecuted === false;

    if (!safeTransactionServicePending) {
      issue("safeTransactionService.pending", "Safe Transaction Service must show the transaction as pending/not executed.");
    }
  } catch (error) {
    issue("safeTransactionService", error.message);
  }
}

if (issues.length > 0) {
  console.log(JSON.stringify({
    schema: "astra-dex-liquidity-safe-submission-live-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_LIQUIDITY_SAFE_SUBMISSION_LIVE_NOT_RECORDED",
    issues
  }, null, 2));
  process.exit(1);
}

fs.mkdirSync(recordDir, { recursive: true });

const recordedAt = new Date().toISOString();
const safeNonce = Number(safeNonceRaw);
const safeTransactionUrl = safeTransactionUrlEnv || `https://app.safe.global/transactions/queue?safe=base:${safePayload.liquiditySafeAddress}`;

const record = {
  schema: "astra-dex-liquidity-safe-submission-live-record-v0.1",
  recordedAt,
  submittedAt,
  status: "DEX_LIQUIDITY_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  submissionMethod,
  submittedBy,
  submissionReference,
  liquiditySafeAddress: safePayload.liquiditySafeAddress,
  safeAddress: safePayload.safeAddress,
  safeTxHash,
  safeNonce,
  safeTransactionUrl,
  txServiceBaseUrl,
  safePayloadHash: safePayload.safePayloadHash,
  transactionBuilderHash: safePayload.transactionBuilderHash,
  calldataHash: safePayload.calldataHash,
  submissionFingerprint: dryRun.submissionFingerprint,
  transactionCount: safePayload.transactionCount,
  submittedTransaction: {
    to: tx.to,
    value: tx.value,
    operation: tx.operation,
    operationValue: tx.operationValue,
    dataHash: tx.dataHash,
    functionSelector: tx.functionSelector,
    functionSignature: tx.functionSignature
  },
  safeTransactionService: {
    safe: safeTransactionService.safe,
    nonce: safeTransactionService.nonce,
    to: safeTransactionService.to,
    value: String(safeTransactionService.value ?? ""),
    isExecuted: safeTransactionService.isExecuted,
    transactionHash: safeTransactionService.transactionHash || null,
    submissionDate: safeTransactionService.submissionDate || null,
    modified: safeTransactionService.modified || null
  },
  confirmationCount,
  requiredThreshold,
  missingConfirmationCount,
  thresholdReached,
  safeTransactionServicePending,
  liquiditySafeSubmissionLiveRecorded: true,
  liquiditySafeTransactionSubmitted: true,
  liquiditySafeTransactionExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  publicTradingLinkApproved: false,
  buyPageActivated: false,
  fullLaunchApproved: false,
  requiredBeforeLiquiditySafePendingSignaturesMonitoring: {
    liquiditySafeSubmissionLiveRecorded: true,
    liquiditySafeTransactionSubmitted: true,
    safeTxHashRecorded: true,
    safeNonceRecorded: true,
    safeTransactionServicePending: true,
    liquiditySafeTransactionExecuted: false,
    liquidityAdded: false,
    positionMinted: false,
    pendingSignatureMonitoringComplete: false,
    publicStatusUpdatePrepared: false
  },
  safety: {
    recordsSubmissionEvidenceOnly: true,
    executesLiquiditySafeTransaction: false,
    addsLiquidity: false,
    mintsPositionOnchain: false,
    activatesBuyPage: false,
    approvesPublicTrading: false,
    approvesFullLaunch: false
  }
};

writeJson(recordFile, record);

const config = readJsonPath(configFile);

config.status = "liquidity-safe-submission-live-recorded-not-executed-no-liquidity-no-public-trading";
config.liquiditySafeSubmissionLiveRecorded = true;
config.liquiditySafeTransactionSubmitted = true;
config.liquiditySafeTransactionExecuted = false;
config.liquidityAdded = false;
config.positionMinted = false;
config.publicTradingApproved = false;
config.publicTradingLinkApproved = false;
config.buyPageActivationApproved = false;
config.fullLaunchApproved = false;
config.recordedLiquiditySafeSubmissionLive = {
  recordedAt,
  submittedAt,
  liquiditySafeAddress: record.liquiditySafeAddress,
  safeTxHash: record.safeTxHash,
  safeNonce: record.safeNonce,
  safeTransactionUrl: record.safeTransactionUrl,
  safePayloadHash: record.safePayloadHash,
  transactionBuilderHash: record.transactionBuilderHash,
  recordFile: "reports/dex-liquidity-safe-submission-live/dex-liquidity-safe-submission-live-record.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-safe-submission-live-result-v0.1",
  checkedAt: recordedAt,
  status: record.status,
  liquiditySafeAddress: record.liquiditySafeAddress,
  safeTxHash: record.safeTxHash,
  safeNonce: record.safeNonce,
  safeTransactionUrl: record.safeTransactionUrl,
  confirmationCount,
  requiredThreshold,
  missingConfirmationCount,
  thresholdReached,
  liquiditySafeTransactionSubmitted: true,
  liquiditySafeTransactionExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  fullLaunchApproved: false
}, null, 2));
