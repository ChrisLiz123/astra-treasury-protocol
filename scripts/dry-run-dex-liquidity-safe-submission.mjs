import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const confirm = process.env.DEX_LIQUIDITY_SAFE_SUBMISSION_DRY_RUN_CONFIRM || "";
const requiredConfirm = "DRY_RUN_DEX_LIQUIDITY_SAFE_SUBMISSION_ONLY_NOT_SUBMITTING";

const reportDir = path.join(root, "reports", "dex-liquidity-safe-submission-dry-run");
const dryRunFile = path.join(reportDir, "dex-liquidity-safe-submission-dry-run.json");
const configFile = path.join(root, "configs", "dex-liquidity-safe-submission-dry-run.config.json");

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
      "User-Agent": "astra-treasury-protocol-dex-liquidity-safe-submission-dry-run/0.1"
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

if (confirm !== requiredConfirm) {
  issue("DEX_LIQUIDITY_SAFE_SUBMISSION_DRY_RUN_CONFIRM", `Must equal ${requiredConfirm}.`);
}

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

requireStatus("preparationStatus.status", preparationStatus.status, "DEX_LIQUIDITY_SAFE_SUBMISSION_PREPARED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("preparation.status", preparation.status, "DEX_LIQUIDITY_SAFE_SUBMISSION_PREPARED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("submissionApprovalStatus.status", submissionApprovalStatus.status, "DEX_LIQUIDITY_SAFE_SUBMISSION_APPROVED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("payloadVerificationStatus.status", payloadVerificationStatus.status, "DEX_LIQUIDITY_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("payloadVerification.status", payloadVerification.status, "DEX_LIQUIDITY_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("payloadStatus.status", payloadStatus.status, "DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("safePayload.status", safePayload.status, "DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("poolStatus.status", poolStatus.status, "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING");

if (preparationStatus.summary?.liquiditySafeSubmissionPreparationComplete !== true || preparationStatus.summary?.operatorSubmissionCommandReviewed !== true) {
  issue("preparationStatus.summary", "Submission preparation and operator command review must be complete.");
}

if (submissionApprovalStatus.summary?.liquiditySafeSubmissionApproved !== true) {
  issue("submissionApprovalStatus.summary.liquiditySafeSubmissionApproved", "Submission approval must be recorded.");
}

if (
  payloadVerificationStatus.summary?.liquiditySafePayloadVerified !== true ||
  payloadVerificationStatus.summary?.safePayloadHashVerified !== true ||
  payloadVerificationStatus.summary?.transactionBuilderHashVerified !== true ||
  payloadVerificationStatus.summary?.transactionDataVerified !== true
) {
  issue("payloadVerificationStatus.summary", "Safe payload verification flags must be true.");
}

if (payloadVerification.liveChecks?.token0?.balanceCoversDesired !== true || payloadVerification.liveChecks?.token0?.allowanceCoversDesired !== true) {
  issue("payloadVerification.liveChecks.token0", "Token0 balance and allowance must cover desired amount.");
}

if (payloadVerification.liveChecks?.token1?.balanceCoversDesired !== true || payloadVerification.liveChecks?.token1?.allowanceCoversDesired !== true) {
  issue("payloadVerification.liveChecks.token1", "Token1 balance and allowance must cover desired amount.");
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

if (!isAddress(safePayload.nonfungiblePositionManager)) {
  issue("safePayload.nonfungiblePositionManager", "NonfungiblePositionManager must be valid.");
}

if (safePayload.safePayloadHash !== payloadVerification.safePayloadHash || safePayload.safePayloadHash !== preparation.safePayloadHash) {
  issue("safePayload.safePayloadHash", "Safe payload hash must match verification and preparation.");
}

if (safePayload.transactionBuilderHash !== transactionBuilder.transactionBuilderHash || safePayload.transactionBuilderHash !== preparation.transactionBuilderHash) {
  issue("safePayload.transactionBuilderHash", "Transaction Builder hash must match builder and preparation.");
}

if (safePayload.calldataHash !== payloadVerification.calldataHash || safePayload.calldataHash !== preparation.calldataHash) {
  issue("safePayload.calldataHash", "Calldata hash must match verification and preparation.");
}

if (!Array.isArray(safePayload.transactions) || safePayload.transactions.length !== 1) {
  issue("safePayload.transactions", "Safe payload must contain exactly one transaction.");
}

const tx = safePayload.transactions?.[0] || {};
const builderTx = transactionBuilder.transactions?.[0] || {};

if (!isAddress(tx.to) || !sameAddress(tx.to, safePayload.nonfungiblePositionManager)) {
  issue("safePayload.transactions.0.to", "Transaction target must be NonfungiblePositionManager.");
}

if (String(tx.value) !== "0" || tx.operation !== "CALL" || tx.operationValue !== 0) {
  issue("safePayload.transactions.0.call", "Transaction must be CALL with value 0.");
}

if (!String(tx.data || "").startsWith("0x88316456")) {
  issue("safePayload.transactions.0.data", "Transaction data must be Uniswap V3 mint calldata.");
}

if (tx.dataHash !== sha256Hex(tx.data)) {
  issue("safePayload.transactions.0.dataHash", "Transaction data hash must match data.");
}

if (!sameAddress(builderTx.to, tx.to) || String(builderTx.value) !== String(tx.value) || String(builderTx.data) !== String(tx.data)) {
  issue("transactionBuilder.transactions.0", "Transaction Builder transaction must match Safe payload transaction.");
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
  "reports/dex-liquidity-safe-submission-live/dex-liquidity-safe-submission-live-record.json",
  "reports/dex-liquidity-safe-pending-signatures/dex-liquidity-safe-pending-signatures-monitoring.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "public-docs/dex-liquidity-safe-submission-live-status.json",
  "public-docs/dex-liquidity-added-status.json",
  "public-docs/dex-public-trading-live-status.json"
];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden submission/live/liquidity/public-trading artifact exists. Dry run must not submit or add liquidity.");
  }
}

const txServiceBaseUrl = (
  process.env.DEX_LIQUIDITY_SAFE_TX_SERVICE_BASE_URL ||
  "https://safe-transaction-base.safe.global/api"
).replace(/\/+$/, "");

const rpcUrl =
  process.env.DEX_LIQUIDITY_SAFE_SUBMISSION_DRY_RUN_RPC_URL ||
  process.env.DEX_LIQUIDITY_SAFE_PAYLOAD_VERIFICATION_RPC_URL ||
  process.env.DEX_POST_EXECUTION_RPC_URL ||
  process.env.MAINNET_MONITOR_RPC_URL ||
  readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

if (!String(rpcUrl || "").startsWith("https://")) {
  issue("DEX_LIQUIDITY_SAFE_SUBMISSION_DRY_RUN_RPC_URL", "RPC URL must be available and start with https://.");
}

let safeInfo = {};
let safeTransactionServiceReachable = false;
let liquiditySafeExists = false;
let safeOwners = [];
let safeThreshold = 0;
let currentNonce = null;
let pendingTransactions = [];
let matchingPendingTransactions = [];
let noDuplicatePendingSafeTransaction = false;
let livePoolLiquidity = String(poolStatus.summary?.poolLiquidity || "0");
let safeCodePresent = false;
let npmCodePresent = false;
let liveBalance0Raw = "";
let liveBalance1Raw = "";
let liveAllowance0Raw = "";
let liveAllowance1Raw = "";

if (issues.length === 0) {
  try {
    safeInfo = await fetchJson(`${txServiceBaseUrl}/v1/safes/${safePayload.liquiditySafeAddress}/`);
    safeTransactionServiceReachable = true;

    safeOwners = Array.isArray(safeInfo.owners) ? safeInfo.owners : [];
    safeThreshold = Number(safeInfo.threshold || 0);
    currentNonce = Number.isInteger(Number(safeInfo.nonce)) ? Number(safeInfo.nonce) : safeInfo.nonce ?? null;

    liquiditySafeExists = safeThreshold > 0 && safeOwners.length > 0;

    if (!liquiditySafeExists) {
      issue("safeTransactionService.safe", "Liquidity Safe must exist with owners and positive threshold.");
    }

    const pendingList = await fetchJson(`${txServiceBaseUrl}/v1/safes/${safePayload.liquiditySafeAddress}/multisig-transactions/?executed=false&limit=100`);
    pendingTransactions = Array.isArray(pendingList.results) ? pendingList.results : [];

    matchingPendingTransactions = pendingTransactions.filter((item) => {
      const sameTo = sameAddress(item.to, tx.to);
      const sameData = String(item.data || "").toLowerCase() === String(tx.data || "").toLowerCase();
      const sameValue = String(item.value ?? "0") === String(tx.value ?? "0");

      return sameTo && sameData && sameValue;
    }).map((item) => ({
      safeTxHash: item.safeTxHash || "",
      nonce: item.nonce,
      isExecuted: item.isExecuted,
      submissionDate: item.submissionDate || "",
      modified: item.modified || "",
      to: item.to || "",
      value: String(item.value ?? ""),
      dataHash: item.data ? sha256Hex(item.data) : ""
    }));

    noDuplicatePendingSafeTransaction = matchingPendingTransactions.length === 0;

    if (!noDuplicatePendingSafeTransaction) {
      issue("safeTransactionService.pendingTransactions", "A matching pending liquidity Safe transaction already exists. Do not create a duplicate; inspect the Safe queue.");
    }

    const safeCode = await rpcCall(rpcUrl, "eth_getCode", [safePayload.liquiditySafeAddress, "latest"]);
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

    liveBalance0Raw = await readTokenBalance(rpcUrl, mintParams.token0, safePayload.liquiditySafeAddress);
    liveBalance1Raw = await readTokenBalance(rpcUrl, mintParams.token1, safePayload.liquiditySafeAddress);
    liveAllowance0Raw = await readTokenAllowance(rpcUrl, mintParams.token0, safePayload.liquiditySafeAddress, safePayload.nonfungiblePositionManager);
    liveAllowance1Raw = await readTokenAllowance(rpcUrl, mintParams.token1, safePayload.liquiditySafeAddress, safePayload.nonfungiblePositionManager);

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
    issue("dryRun", error.message);
  }
}

if (issues.length > 0) {
  const failed = {
    schema: "astra-dex-liquidity-safe-submission-dry-run-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_LIQUIDITY_SAFE_SUBMISSION_DRY_RUN_FAILED",
    issues
  };

  writeJson(dryRunFile, failed);
  console.log(JSON.stringify(failed, null, 2));
  process.exit(1);
}

const checkedAt = new Date().toISOString();
const submissionFingerprint = sha256Json({
  safeAddress: safePayload.liquiditySafeAddress,
  chainId: 8453,
  to: tx.to,
  value: tx.value,
  data: tx.data,
  operation: tx.operation,
  safePayloadHash: safePayload.safePayloadHash,
  transactionBuilderHash: safePayload.transactionBuilderHash
});

const dryRun = {
  schema: "astra-dex-liquidity-safe-submission-dry-run-v0.1",
  checkedAt,
  status: "DEX_LIQUIDITY_SAFE_SUBMISSION_DRY_RUN_COMPLETE_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  dryRunOnly: true,
  txServiceBaseUrl,
  network: "Base Mainnet",
  chainId: 8453,
  liquiditySafeAddress: safePayload.liquiditySafeAddress,
  safeQueueUrl: preparation.safeQueueUrl,
  safeHomeUrl: preparation.safeHomeUrl,
  safeInfo: {
    owners: safeOwners,
    threshold: safeThreshold,
    nonce: currentNonce
  },
  safeTransactionServiceReachable,
  liquiditySafeExists,
  noDuplicatePendingSafeTransaction,
  pendingTransactionCount: pendingTransactions.length,
  matchingPendingTransactionCount: matchingPendingTransactions.length,
  matchingPendingTransactions,
  submissionFingerprint,
  safePayloadReference: "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  transactionBuilderReference: "reports/dex-liquidity-provision/payload/liquidity-safe-transaction-builder.json",
  safePayloadHash: safePayload.safePayloadHash,
  transactionBuilderHash: safePayload.transactionBuilderHash,
  calldataHash: safePayload.calldataHash,
  transactionCount: safePayload.transactionCount,
  dryRunTransaction: {
    to: tx.to,
    value: tx.value,
    operation: tx.operation,
    operationValue: tx.operationValue,
    dataHash: tx.dataHash,
    functionSelector: tx.functionSelector,
    functionSignature: tx.functionSignature,
    dataPreview: `${String(tx.data || "").slice(0, 42)}...${String(tx.data || "").slice(-16)}`
  },
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
  operatorInstruction: "This dry run did not submit anything. In the live submission milestone, import the verified Transaction Builder JSON into the liquidity Safe on Base and submit/propose only the verified single mint transaction. Do not execute during submission.",
  liquiditySafeSubmissionDryRunComplete: true,
  liquiditySafeSubmissionPreparationComplete: true,
  operatorSubmissionCommandReviewed: true,
  liquiditySafeSubmissionApprovalRecorded: true,
  liquiditySafeSubmissionApproved: true,
  liquiditySafePayloadGenerated: true,
  liquiditySafePayloadVerified: true,
  safePayloadHashVerified: true,
  transactionBuilderHashVerified: true,
  transactionDataVerified: true,
  liveBalancesVerified: true,
  liveAllowancesVerified: true,
  poolLiquidityStillZero: true,
  liquiditySafeTransactionSubmitted: false,
  liquiditySafeTransactionExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  publicTradingLinkApproved: false,
  buyPageActivated: false,
  fullLaunchApproved: false,
  requiredBeforeLiquiditySafeSubmissionLive: {
    liquiditySafeSubmissionDryRunComplete: true,
    liquiditySafeSubmissionPreparationComplete: true,
    liquiditySafeSubmissionApproved: true,
    liquiditySafePayloadVerified: true,
    safeTransactionServiceReachable: true,
    liquiditySafeExists: true,
    noDuplicatePendingSafeTransaction: true,
    liquiditySafeTransactionSubmitted: false,
    liquiditySafeTransactionExecuted: false,
    liquidityAdded: false,
    publicStatusUpdatePrepared: false
  },
  safety: {
    dryRunOnly: true,
    submitsLiquiditySafeTransaction: false,
    executesLiquiditySafeTransaction: false,
    addsLiquidity: false,
    mintsPositionOnchain: false,
    activatesBuyPage: false,
    approvesPublicTrading: false,
    approvesFullLaunch: false
  },
  issues: []
};

dryRun.dryRunHash = sha256Json(dryRun);

writeJson(dryRunFile, dryRun);

const config = readJsonPath(configFile);

config.status = "liquidity-safe-submission-dry-run-complete-not-submitted-not-executed-no-liquidity-no-public-trading";
config.liquiditySafeSubmissionDryRunComplete = true;
config.liquiditySafeSubmissionPreparationComplete = true;
config.operatorSubmissionCommandReviewed = true;
config.liquiditySafeSubmissionApprovalRecorded = true;
config.liquiditySafeSubmissionApproved = true;
config.liquiditySafePayloadGenerated = true;
config.liquiditySafePayloadVerified = true;
config.liquiditySafeTransactionSubmitted = false;
config.liquiditySafeTransactionExecuted = false;
config.liquidityAdded = false;
config.positionMinted = false;
config.publicTradingApproved = false;
config.publicTradingLinkApproved = false;
config.buyPageActivationApproved = false;
config.fullLaunchApproved = false;
config.dryRunLiquiditySafeSubmission = {
  checkedAt,
  liquiditySafeAddress: dryRun.liquiditySafeAddress,
  safeQueueUrl: dryRun.safeQueueUrl,
  safePayloadHash: dryRun.safePayloadHash,
  transactionBuilderHash: dryRun.transactionBuilderHash,
  submissionFingerprint,
  dryRunHash: dryRun.dryRunHash,
  recordFile: "reports/dex-liquidity-safe-submission-dry-run/dex-liquidity-safe-submission-dry-run.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-safe-submission-dry-run-result-v0.1",
  checkedAt,
  status: dryRun.status,
  liquiditySafeAddress: dryRun.liquiditySafeAddress,
  safeQueueUrl: dryRun.safeQueueUrl,
  safeTransactionServiceReachable: true,
  liquiditySafeExists: true,
  safeThreshold,
  pendingTransactionCount: dryRun.pendingTransactionCount,
  matchingPendingTransactionCount: dryRun.matchingPendingTransactionCount,
  noDuplicatePendingSafeTransaction: true,
  submissionFingerprint,
  liquiditySafeSubmissionDryRunComplete: true,
  liquiditySafeTransactionSubmitted: false,
  liquiditySafeTransactionExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  fullLaunchApproved: false
}, null, 2));
