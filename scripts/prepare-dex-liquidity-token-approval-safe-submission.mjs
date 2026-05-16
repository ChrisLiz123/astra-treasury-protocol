import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const recordDir = path.join(root, "reports", "dex-liquidity-token-approval-safe-submission-preparation");
const recordFile = path.join(recordDir, "dex-liquidity-token-approval-safe-submission-preparation.json");
const configFile = path.join(root, "configs", "dex-liquidity-token-approval-safe-submission-preparation.config.json");

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
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({jsonrpc: "2.0", id: 1, method, params})
  });

  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(body.error.message || JSON.stringify(body.error));
  return body.result;
}

async function readTokenAllowance(rpcUrl, tokenAddress, ownerAddress, spenderAddress) {
  const result = await rpcCall(rpcUrl, "eth_call", [
    {to: tokenAddress, data: "0xdd62ed3e" + encodeAddress(ownerAddress) + encodeAddress(spenderAddress)},
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

function requireStatus(name, value, expected) {
  if (value !== expected) {
    issue(name, `Expected ${expected}, got ${value || "UNKNOWN"}.`);
  }
}

const submissionApprovalStatus = readJson("public-docs/dex-liquidity-token-approval-safe-submission-approval-status.json");
const submissionApprovalRecord = readJson("reports/dex-liquidity-token-approval-safe-submission-approval/dex-liquidity-token-approval-safe-submission-approval-record.json");
const verificationStatus = readJson("public-docs/dex-liquidity-token-approval-safe-payload-verification-status.json");
const verification = readJson("reports/dex-liquidity-token-approval-safe-payload-verification/dex-liquidity-token-approval-safe-payload-verification.json");
const payloadStatus = readJson("public-docs/dex-liquidity-token-approval-safe-payload-status.json");
const payload = readJson("reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json");
const transactionBuilder = readJson("reports/dex-liquidity-token-approval/payload/token-approval-safe-transaction-builder.json");
const recheckStatus = readJson("public-docs/dex-liquidity-token-approval-requirements-recheck-status.json");
const postBalances = readJson("public-docs/dex-liquidity-funding-transfer-post-execution-balances-status.json");
const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

requireStatus("submissionApprovalStatus.status", submissionApprovalStatus.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_APPROVED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("submissionApprovalRecord.status", submissionApprovalRecord.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_APPROVED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("verificationStatus.status", verificationStatus.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("verification.status", verification.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("payloadStatus.status", payloadStatus.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("payload.status", payload.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("recheckStatus.status", recheckStatus.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_RECHECK_COMPLETE_APPROVALS_REQUIRED_NO_APPROVALS_EXECUTED");
requireStatus("postBalances.status", postBalances.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_POST_EXECUTION_BALANCES_VERIFIED_FUNDS_MOVED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("poolStatus.status", poolStatus.status, "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING");

if (submissionApprovalStatus.summary?.tokenApprovalSafeSubmissionApproved !== true) {
  issue("submissionApprovalStatus.summary.tokenApprovalSafeSubmissionApproved", "Token approval Safe submission approval must be recorded.");
}

if (submissionApprovalStatus.summary?.tokenApprovalSafeTransactionSubmitted !== false || submissionApprovalStatus.summary?.tokenApprovalExecuted !== false || submissionApprovalStatus.summary?.liquidityAdded !== false) {
  issue("submissionApprovalStatus.summary.flags", "Submission approval must show not submitted, no approval execution, and no liquidity.");
}

if (verificationStatus.summary?.tokenApprovalSafePayloadVerified !== true || verificationStatus.summary?.tokenApprovalPayloadHashVerified !== true || verificationStatus.summary?.transactionBuilderHashVerified !== true || verificationStatus.summary?.approvalCalldataVerified !== true) {
  issue("verificationStatus.summary", "Token approval payload verification must be complete.");
}

if (verificationStatus.summary?.tokenApprovalSafeTransactionSubmitted !== false || verificationStatus.summary?.tokenApprovalExecuted !== false || verificationStatus.summary?.liquidityAdded !== false) {
  issue("verificationStatus.summary.flags", "Verification must show not submitted, no approval execution, and no liquidity.");
}

if (!isAddress(payload.liquiditySafeAddress) || isZeroAddress(payload.liquiditySafeAddress)) {
  issue("payload.liquiditySafeAddress", "Liquidity Safe address must be valid.");
}

if (!isAddress(payload.approvalSpender) || isZeroAddress(payload.approvalSpender)) {
  issue("payload.approvalSpender", "Approval spender must be valid.");
}

if (payload.payloadHash !== verificationStatus.summary?.payloadHash || payload.payloadHash !== submissionApprovalRecord.payloadHash) {
  issue("payload.payloadHash", "Payload hash must match verification status and submission approval record.");
}

if (!Array.isArray(payload.transactions) || payload.transactions.length <= 0) {
  issue("payload.transactions", "Payload transactions must be present.");
}

if (!Array.isArray(transactionBuilder.transactions) || transactionBuilder.transactions.length !== payload.transactions.length) {
  issue("transactionBuilder.transactions", "Transaction Builder transaction count must match payload.");
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
  "reports/dex-liquidity-token-approval-safe-submission-live/dex-liquidity-token-approval-safe-submission-live-record.json",
  "reports/dex-liquidity-token-approval/live/token-approval-executed.json",
  "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "public-docs/dex-liquidity-added-status.json",
  "public-docs/dex-public-trading-live-status.json"
];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden submission-live/token-approval-executed/liquidity/public-trading artifact exists. Preparation must not submit or execute approvals.");
  }
}

const rpcUrl =
  process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_SUBMISSION_PREPARATION_RPC_URL ||
  process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_VERIFICATION_RPC_URL ||
  process.env.DEX_POST_EXECUTION_RPC_URL ||
  process.env.MAINNET_MONITOR_RPC_URL ||
  readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

if (!String(rpcUrl || "").startsWith("https://")) {
  issue("DEX_LIQUIDITY_TOKEN_APPROVAL_SUBMISSION_PREPARATION_RPC_URL", "RPC URL must be available and start with https://.");
}

const preparedTransactions = [];

if (issues.length === 0) {
  try {
    for (const [index, tx] of payload.transactions.entries()) {
      const builderTx = transactionBuilder.transactions[index] || {};
      const verificationCheck = (verification.transactionChecks || []).find((item) => item.id === tx.id);

      if (!verificationCheck) {
        issue(`payload.transactions.${tx.id}.verificationCheck`, "Missing verification check for transaction.");
        continue;
      }

      if (!sameAddress(tx.to, tx.tokenAddress)) {
        issue(`payload.transactions.${tx.id}.to`, "Outer To must be the token contract.");
      }

      if (!sameAddress(builderTx.to, tx.to) || String(builderTx.value) !== String(tx.value) || String(builderTx.data) !== String(tx.data)) {
        issue(`transactionBuilder.${index}`, "Transaction Builder transaction must match payload.");
      }

      const currentBalanceRaw = await readTokenBalance(rpcUrl, tx.tokenAddress, payload.liquiditySafeAddress);
      const currentAllowanceRaw = await readTokenAllowance(rpcUrl, tx.tokenAddress, payload.liquiditySafeAddress, payload.approvalSpender);

      const balanceCoversFinalApproval = tx.approvalMode === "set-allowance-to-required-amount"
        ? BigInt(currentBalanceRaw || "0") >= BigInt(tx.amountRaw || "0")
        : true;

      const allowanceStillUnexecuted = String(currentAllowanceRaw) === String(tx.currentAllowanceRaw || currentAllowanceRaw);

      if (!balanceCoversFinalApproval) {
        issue(`payload.transactions.${tx.id}.currentBalanceRaw`, `Current balance ${currentBalanceRaw} is below final approval amount ${tx.amountRaw}.`);
      }

      if (!allowanceStillUnexecuted) {
        issue(`payload.transactions.${tx.id}.currentAllowanceRaw`, `Current allowance ${currentAllowanceRaw} differs from recorded pre-submission allowance ${tx.currentAllowanceRaw}.`);
      }

      preparedTransactions.push({
        index,
        id: tx.id,
        role: tx.role,
        symbol: tx.symbol,
        tokenAddress: tx.tokenAddress,
        safeAddress: payload.liquiditySafeAddress,
        approvalSpender: payload.approvalSpender,
        to: tx.to,
        value: tx.value,
        data: tx.data,
        dataHash: tx.dataHash,
        operation: tx.operation,
        operationValue: tx.operationValue,
        functionSelector: tx.functionSelector,
        functionSignature: tx.functionSignature,
        amountRaw: tx.amountRaw,
        amountHuman: tx.amountHuman,
        approvalMode: tx.approvalMode,
        currentBalanceRaw,
        currentAllowanceRaw,
        allowanceStillUnexecuted,
        balanceCoversFinalApproval,
        transactionBuilderFields: {
          to: tx.to,
          value: tx.value,
          data: tx.data,
          operation: "CALL"
        },
        tokenApprovalSafeTransactionSubmitted: false,
        tokenApprovalExecuted: false
      });
    }
  } catch (error) {
    issue("submissionPreparationRpc", error.message);
  }
}

if (issues.length > 0) {
  console.log(JSON.stringify({
    schema: "astra-dex-liquidity-token-approval-safe-submission-preparation-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_NOT_PREPARED",
    issues
  }, null, 2));
  process.exit(1);
}

fs.mkdirSync(recordDir, { recursive: true });

const preparedAt = new Date().toISOString();

const record = {
  schema: "astra-dex-liquidity-token-approval-safe-submission-preparation-v0.1",
  preparedAt,
  status: "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_PREPARED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  liquiditySafeAddress: payload.liquiditySafeAddress,
  approvalSpender: payload.approvalSpender,
  sourceSafeQueueUrl: `https://app.safe.global/transactions/queue?safe=base:${payload.liquiditySafeAddress}`,
  safeUiInstruction: "Open the liquidity Safe on Base, import the verified Transaction Builder JSON, and stop after preparing/dry-running. Do not submit until the live submission milestone.",
  payloadReference: "reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json",
  transactionBuilderReference: "reports/dex-liquidity-token-approval/payload/token-approval-safe-transaction-builder.json",
  payloadHash: payload.payloadHash,
  transactionBuilderHash: verification.transactionBuilderHash,
  verificationReference: "public-docs/dex-liquidity-token-approval-safe-payload-verification-status.json",
  submissionApprovalReference: "public-docs/dex-liquidity-token-approval-safe-submission-approval-status.json",
  transactionCount: preparedTransactions.length,
  preparedTransactions,
  operatorWarnings: [
    "Use the liquidity Safe, not the treasury/source Safe.",
    "Import the Transaction Builder JSON instead of manually changing token addresses or calldata.",
    "Each outer To address must be the token contract, not the approval spender.",
    "Do not execute during submission preparation or dry run.",
    "Do not generate liquidity calldata or add liquidity."
  ],
  requiredBeforeTokenApprovalSafeSubmissionDryRun: {
    tokenApprovalSafeSubmissionPreparationComplete: true,
    tokenApprovalSafeSubmissionApprovalRecorded: true,
    tokenApprovalSafePayloadVerified: true,
    tokenApprovalPayloadHashVerified: true,
    transactionBuilderHashVerified: true,
    approvalCalldataVerified: true,
    operatorSubmissionCommandReviewed: true,
    tokenApprovalSafeTransactionSubmitted: false,
    tokenApprovalExecuted: false,
    safeSubmissionDryRunComplete: false,
    publicStatusUpdatePrepared: false
  },
  flags: {
    tokenApprovalSafeSubmissionPreparationComplete: true,
    operatorSubmissionCommandReviewed: true,
    tokenApprovalSafeSubmissionDryRunComplete: false,
    tokenApprovalSafeTransactionSubmitted: false,
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
    fullLaunchApproved: false
  },
  safety: {
    preparationOnly: true,
    submitsSafeTransaction: false,
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

config.status = "token-approval-safe-submission-prepared-not-submitted-no-approvals-executed-no-liquidity";
config.tokenApprovalSafeSubmissionPreparationComplete = true;
config.operatorSubmissionCommandReviewed = true;
config.tokenApprovalSafeSubmissionDryRunComplete = false;
config.tokenApprovalSafeTransactionSubmitted = false;
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
config.preparedTokenApprovalSafeSubmission = {
  preparedAt,
  liquiditySafeAddress: record.liquiditySafeAddress,
  approvalSpender: record.approvalSpender,
  payloadHash: record.payloadHash,
  transactionBuilderHash: record.transactionBuilderHash,
  transactionCount: record.transactionCount,
  recordFile: "reports/dex-liquidity-token-approval-safe-submission-preparation/dex-liquidity-token-approval-safe-submission-preparation.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-token-approval-safe-submission-preparation-result-v0.1",
  checkedAt: preparedAt,
  status: record.status,
  liquiditySafeAddress: record.liquiditySafeAddress,
  approvalSpender: record.approvalSpender,
  transactionCount: record.transactionCount,
  tokenApprovalSafeSubmissionPreparationComplete: true,
  tokenApprovalSafeTransactionSubmitted: false,
  tokenApprovalExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  fullLaunchApproved: false
}, null, 2));
