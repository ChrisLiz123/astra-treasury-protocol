import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const recordDir = path.join(root, "reports", "dex-liquidity-funding-transfer-safe-submission-dry-run");
const recordFile = path.join(recordDir, "dex-liquidity-funding-transfer-safe-submission-dry-run.json");
const configFile = path.join(root, "configs", "dex-liquidity-funding-transfer-safe-submission-dry-run.config.json");

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

function isZeroAddress(value) {
  return String(value || "").toLowerCase() === "0x0000000000000000000000000000000000000000";
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

function requireStatus(name, value, expected) {
  if (value !== expected) {
    issue(name, `Expected ${expected}, got ${value || "UNKNOWN"}.`);
  }
}

const preparationStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-submission-preparation-status.json");
const preparation = readJson("reports/dex-liquidity-funding-transfer-safe-submission-preparation/dex-liquidity-funding-transfer-safe-submission-preparation.json");
const submissionApproval = readJson("public-docs/dex-liquidity-funding-transfer-safe-submission-approval-status.json");
const payloadVerificationStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-payload-verification-status.json");
const payloadVerification = readJson("reports/dex-liquidity-funding-transfer-safe-payload-verification/dex-liquidity-funding-transfer-safe-payload-verification.json");
const payloadStatus = readJson("public-docs/dex-liquidity-funding-transfer-safe-payload-status.json");
const payload = readJson("reports/dex-liquidity-treasury-funding/payload/funding-transfer-safe-payload.json");
const postExecution = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

requireStatus("preparationStatus.status", preparationStatus.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_SUBMISSION_PREPARED_NOT_SUBMITTED_NO_FUNDS_MOVED");
requireStatus("preparation.status", preparation.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_SUBMISSION_PREPARED_NOT_SUBMITTED_NO_FUNDS_MOVED");
requireStatus("submissionApproval.status", submissionApproval.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_SUBMISSION_APPROVED_NOT_SUBMITTED_NO_FUNDS_MOVED");
requireStatus("payloadVerificationStatus.status", payloadVerificationStatus.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NO_FUNDS_MOVED");
requireStatus("payloadStatus.status", payloadStatus.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_FUNDS_MOVED");
requireStatus("payload.status", payload.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_FUNDS_MOVED");
requireStatus("postExecution.status", postExecution.status, "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING");

if (preparationStatus.summary?.safeSubmissionPreparationComplete !== true) {
  issue("preparationStatus.summary.safeSubmissionPreparationComplete", "Safe submission preparation must be complete.");
}

if (preparationStatus.summary?.safeSubmissionDryRunComplete !== false || preparationStatus.summary?.fundingTransferSubmitted !== false || preparationStatus.summary?.fundingTransferExecuted !== false || preparationStatus.summary?.treasuryFundsMoved !== false) {
  issue("preparationStatus.summary", "Preparation status must show dry run not previously complete, no submission, no execution, no funds moved.");
}

if (submissionApproval.summary?.fundingTransferSafeSubmissionApproved !== true) {
  issue("submissionApproval.summary.fundingTransferSafeSubmissionApproved", "Safe submission approval must be recorded.");
}

if (payloadVerificationStatus.summary?.fundingTransferSafePayloadVerified !== true || payloadVerificationStatus.summary?.payloadHashVerified !== true) {
  issue("payloadVerificationStatus.summary", "Payload must be verified and payload hash must verify.");
}

if (payloadVerificationStatus.summary?.fundingTransferSubmitted !== false || payloadVerificationStatus.summary?.fundingTransferExecuted !== false || payloadVerificationStatus.summary?.treasuryFundsMoved !== false) {
  issue("payloadVerificationStatus.summary", "Payload verification must show not submitted, not executed, and no funds moved.");
}

if (payload.flags?.fundingTransferSubmitted !== false || payload.flags?.fundingTransferExecuted !== false || payload.flags?.treasuryFundsMoved !== false) {
  issue("payload.flags", "Payload must remain not submitted, not executed, and no treasury funds moved.");
}

if (!isAddress(payload.sourceSafeAddress) || isZeroAddress(payload.sourceSafeAddress)) {
  issue("payload.sourceSafeAddress", "Source Safe must be valid.");
}

if (!isAddress(payload.destinationSafeAddress) || isZeroAddress(payload.destinationSafeAddress)) {
  issue("payload.destinationSafeAddress", "Destination Safe must be valid.");
}

if (preparation.payloadHash !== payload.payloadHash) {
  issue("preparation.payloadHash", "Preparation payload hash must match payload.");
}

if (!Array.isArray(preparation.preparedTransactions) || preparation.preparedTransactions.length !== payload.transactions.length) {
  issue("preparation.preparedTransactions", "Prepared transaction count must match payload transaction count.");
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
  "reports/dex-liquidity-funding-transfer-safe-submission-live/dex-liquidity-funding-transfer-safe-submission-live-record.json",
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
    issue(file, "Forbidden live/submission/liquidity/public-trading artifact exists. Dry run must not submit, move funds, or add liquidity.");
  }
}

const rpcUrl =
  process.env.DEX_LIQUIDITY_FUNDING_TRANSFER_SUBMISSION_DRY_RUN_RPC_URL ||
  process.env.DEX_LIQUIDITY_FUNDING_TRANSFER_PAYLOAD_VERIFICATION_RPC_URL ||
  process.env.DEX_POST_EXECUTION_RPC_URL ||
  process.env.MAINNET_MONITOR_RPC_URL ||
  readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

if (!String(rpcUrl || "").startsWith("https://")) {
  issue("DEX_LIQUIDITY_FUNDING_TRANSFER_SUBMISSION_DRY_RUN_RPC_URL", "RPC URL must be available and start with https://.");
}

const dryRunTransactionChecks = [];

if (issues.length === 0) {
  try {
    for (const prepared of preparation.preparedTransactions) {
      const matchingPayloadTx = payload.transactions.find((tx) => tx.id === prepared.id);
      const matchingVerification = payloadVerification.transactionChecks.find((tx) => tx.id === prepared.id);

      if (!matchingPayloadTx) {
        issue(`preparedTransactions.${prepared.id}`, "Prepared transaction has no matching payload transaction.");
        continue;
      }

      if (!matchingVerification) {
        issue(`preparedTransactions.${prepared.id}`, "Prepared transaction has no matching verification check.");
        continue;
      }

      const builder = prepared.transactionBuilderFields || {};
      const builderMatchesPayload =
        sameAddress(builder.to, matchingPayloadTx.to) &&
        String(builder.value) === String(matchingPayloadTx.value) &&
        String(builder.data) === String(matchingPayloadTx.data) &&
        String(builder.operation) === "CALL";

      if (!builderMatchesPayload) {
        issue(`preparedTransactions.${prepared.id}.transactionBuilderFields`, "Transaction Builder fields do not match payload transaction.");
      }

      if (sha256Hex(builder.data) !== matchingPayloadTx.dataHash) {
        issue(`preparedTransactions.${prepared.id}.dataHash`, "Prepared transaction data hash mismatch.");
      }

      const sourceBalanceRaw = await readTokenBalance(rpcUrl, matchingPayloadTx.tokenAddress, payload.sourceSafeAddress);
      const destinationBalanceRaw = await readTokenBalance(rpcUrl, matchingPayloadTx.tokenAddress, payload.destinationSafeAddress);

      const sourceBalanceCoversTransfer = BigInt(sourceBalanceRaw || "0") >= BigInt(matchingPayloadTx.amountRaw || "0");
      const destinationBalanceUnchanged = String(destinationBalanceRaw) === String(matchingVerification.requirementsReviewDestinationBalanceRaw || "0");

      if (!sourceBalanceCoversTransfer) {
        issue(`preparedTransactions.${prepared.id}.sourceBalance`, `Source balance ${sourceBalanceRaw} no longer covers transfer ${matchingPayloadTx.amountRaw}.`);
      }

      if (!destinationBalanceUnchanged) {
        issue(`preparedTransactions.${prepared.id}.destinationBalance`, `Destination balance ${destinationBalanceRaw} differs from requirements-review balance ${matchingVerification.requirementsReviewDestinationBalanceRaw}.`);
      }

      dryRunTransactionChecks.push({
        id: prepared.id,
        index: prepared.index,
        role: prepared.role,
        symbol: prepared.symbol,
        tokenAddress: prepared.tokenAddress,
        builderMatchesPayload,
        dataHashVerified: sha256Hex(builder.data) === matchingPayloadTx.dataHash,
        sourceBalanceRaw,
        sourceBalanceCoversTransfer,
        destinationBalanceRaw,
        requirementsReviewDestinationBalanceRaw: matchingVerification.requirementsReviewDestinationBalanceRaw || "0",
        destinationBalanceUnchanged,
        fundingTransferSubmitted: false,
        fundingTransferExecuted: false
      });
    }
  } catch (error) {
    issue("dryRunRpc", error.message);
  }
}

if (issues.length > 0) {
  console.log(JSON.stringify({
    schema: "astra-dex-liquidity-funding-transfer-safe-submission-dry-run-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_LIQUIDITY_FUNDING_TRANSFER_SAFE_SUBMISSION_DRY_RUN_FAILED",
    issues
  }, null, 2));
  process.exit(1);
}

fs.mkdirSync(recordDir, { recursive: true });

const dryRunAt = new Date().toISOString();

const record = {
  schema: "astra-dex-liquidity-funding-transfer-safe-submission-dry-run-v0.1",
  dryRunAt,
  status: "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_SUBMISSION_DRY_RUN_COMPLETE_NOT_SUBMITTED_NO_FUNDS_MOVED",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  sourceSafeAddress: payload.sourceSafeAddress,
  destinationSafeAddress: payload.destinationSafeAddress,
  sourceSafeQueueUrl: preparation.sourceSafeQueueUrl,
  payloadReference: "reports/dex-liquidity-treasury-funding/payload/funding-transfer-safe-payload.json",
  payloadHash: payload.payloadHash,
  preparationReference: "public-docs/dex-liquidity-funding-transfer-safe-submission-preparation-status.json",
  submissionApprovalReference: "public-docs/dex-liquidity-funding-transfer-safe-submission-approval-status.json",
  transactionCount: preparation.preparedTransactions.length,
  dryRunTransactionChecks,
  safeSubmissionDryRunComplete: true,
  operatorSubmissionCommandReviewed: true,
  operatorInstruction: "In the live submission milestone, propose only this verified transaction batch from the source Safe on Base. Stop after proposal/submission. Do not execute.",
  requiredBeforeFundingTransferSafeSubmissionLive: {
    safeSubmissionDryRunComplete: true,
    safeSubmissionPreparationComplete: true,
    safeSubmissionApprovalRecorded: true,
    fundingTransferSafePayloadVerified: true,
    payloadHashVerified: true,
    sourceSafeReviewed: true,
    destinationSafeReviewed: true,
    tokenTransferAmountsReviewed: true,
    operatorSubmissionCommandReviewed: true,
    publicStatusUpdatePrepared: false
  },
  flags: {
    safeSubmissionDryRunComplete: true,
    fundingTransferSubmitted: false,
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
    dryRunOnly: true,
    submitsSafeTransaction: false,
    executesSafeTransaction: false,
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

record.dryRunHash = sha256Json(record);

writeJson(recordFile, record);

const config = readJsonPath(configFile);

config.status = "funding-transfer-safe-submission-dry-run-complete-not-submitted-no-funds-moved";
config.safeSubmissionDryRunComplete = true;
config.operatorSubmissionCommandReviewed = true;
config.fundingTransferSubmitted = false;
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
config.completedFundingTransferSafeSubmissionDryRun = {
  dryRunAt,
  sourceSafeAddress: payload.sourceSafeAddress,
  destinationSafeAddress: payload.destinationSafeAddress,
  payloadHash: payload.payloadHash,
  transactionCount: preparation.preparedTransactions.length,
  recordFile: "reports/dex-liquidity-funding-transfer-safe-submission-dry-run/dex-liquidity-funding-transfer-safe-submission-dry-run.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-funding-transfer-safe-submission-dry-run-result-v0.1",
  checkedAt: dryRunAt,
  status: record.status,
  sourceSafeAddress: record.sourceSafeAddress,
  destinationSafeAddress: record.destinationSafeAddress,
  transactionCount: record.transactionCount,
  safeSubmissionDryRunComplete: true,
  fundingTransferSubmitted: false,
  fundingTransferExecuted: false,
  treasuryFundsMoved: false,
  tokenApprovalExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  fullLaunchApproved: false
}, null, 2));
