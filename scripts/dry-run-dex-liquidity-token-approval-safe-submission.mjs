import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const recordDir = path.join(root, "reports", "dex-liquidity-token-approval-safe-submission-dry-run");
const recordFile = path.join(recordDir, "dex-liquidity-token-approval-safe-submission-dry-run.json");
const configFile = path.join(root, "configs", "dex-liquidity-token-approval-safe-submission-dry-run.config.json");

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

function encodeAddress(value) {
  return String(value).replace(/^0x/i, "").toLowerCase().padStart(64, "0");
}

function decodeUint(value) {
  const clean = String(value || "").replace(/^0x/i, "").padStart(64, "0");
  return BigInt(`0x${clean}`);
}

function decodeAddressFromWord(word) {
  const clean = String(word || "").replace(/^0x/i, "").padStart(64, "0");
  return `0x${clean.slice(-40)}`;
}

function decodeUint256FromWord(word) {
  const clean = String(word || "").replace(/^0x/i, "").padStart(64, "0");
  return BigInt(`0x${clean}`).toString();
}

function decodeApproveCalldata(data) {
  const clean = String(data || "").replace(/^0x/i, "");

  if (!clean.startsWith("095ea7b3")) {
    throw new Error("Calldata does not start with ERC-20 approve selector.");
  }

  const spenderWord = clean.slice(8, 72);
  const amountWord = clean.slice(72, 136);

  if (spenderWord.length !== 64 || amountWord.length !== 64) {
    throw new Error("Calldata is not the expected approve(address,uint256) length.");
  }

  return {
    selector: "0x095ea7b3",
    spender: decodeAddressFromWord(spenderWord),
    amountRaw: decodeUint256FromWord(amountWord)
  };
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

function requireStatus(name, value, expected) {
  if (value !== expected) {
    issue(name, `Expected ${expected}, got ${value || "UNKNOWN"}.`);
  }
}

const preparationStatus = readJson("public-docs/dex-liquidity-token-approval-safe-submission-preparation-status.json");
const preparation = readJson("reports/dex-liquidity-token-approval-safe-submission-preparation/dex-liquidity-token-approval-safe-submission-preparation.json");
const submissionApprovalStatus = readJson("public-docs/dex-liquidity-token-approval-safe-submission-approval-status.json");
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

requireStatus("preparationStatus.status", preparationStatus.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_PREPARED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("preparation.status", preparation.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_PREPARED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("submissionApprovalStatus.status", submissionApprovalStatus.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_APPROVED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("verificationStatus.status", verificationStatus.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("verification.status", verification.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("payloadStatus.status", payloadStatus.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("payload.status", payload.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("recheckStatus.status", recheckStatus.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_RECHECK_COMPLETE_APPROVALS_REQUIRED_NO_APPROVALS_EXECUTED");
requireStatus("postBalances.status", postBalances.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_POST_EXECUTION_BALANCES_VERIFIED_FUNDS_MOVED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("poolStatus.status", poolStatus.status, "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING");

if (preparationStatus.summary?.tokenApprovalSafeSubmissionPreparationComplete !== true || preparationStatus.summary?.operatorSubmissionCommandReviewed !== true) {
  issue("preparationStatus.summary", "Submission preparation and operator command review must be complete.");
}

if (preparationStatus.summary?.tokenApprovalSafeSubmissionDryRunComplete !== false || preparationStatus.summary?.tokenApprovalSafeTransactionSubmitted !== false || preparationStatus.summary?.tokenApprovalExecuted !== false) {
  issue("preparationStatus.summary.flags", "Preparation status must show dry run not complete, not submitted, and no approval execution.");
}

if (submissionApprovalStatus.summary?.tokenApprovalSafeSubmissionApproved !== true) {
  issue("submissionApprovalStatus.summary.tokenApprovalSafeSubmissionApproved", "Submission approval must be recorded.");
}

if (verificationStatus.summary?.tokenApprovalSafePayloadVerified !== true || verificationStatus.summary?.tokenApprovalPayloadHashVerified !== true || verificationStatus.summary?.transactionBuilderHashVerified !== true || verificationStatus.summary?.approvalCalldataVerified !== true) {
  issue("verificationStatus.summary", "Payload verification must be complete.");
}

if (verificationStatus.summary?.tokenApprovalSafeTransactionSubmitted !== false || verificationStatus.summary?.tokenApprovalExecuted !== false || verificationStatus.summary?.liquidityAdded !== false) {
  issue("verificationStatus.summary.flags", "Verification status must show not submitted, no approval execution, and no liquidity.");
}

if (payload.flags?.tokenApprovalSafeTransactionSubmitted !== false || payload.flags?.tokenApprovalExecuted !== false || payload.flags?.liquidityAdded !== false) {
  issue("payload.flags", "Payload flags must show not submitted, no approval execution, and no liquidity.");
}

if (!isAddress(payload.liquiditySafeAddress) || !isAddress(payload.approvalSpender)) {
  issue("payload.addresses", "Liquidity Safe and approval spender must be valid.");
}

if (payload.payloadHash !== preparation.payloadHash || payload.payloadHash !== verificationStatus.summary?.payloadHash) {
  issue("payload.payloadHash", "Payload hash must match preparation and verification status.");
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
    issue(file, "Forbidden submission-live/token-approval-executed/liquidity/public-trading artifact exists. Dry run must not submit or execute approvals.");
  }
}

const rpcUrl =
  process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_SUBMISSION_DRY_RUN_RPC_URL ||
  process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_SUBMISSION_PREPARATION_RPC_URL ||
  process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_VERIFICATION_RPC_URL ||
  process.env.DEX_POST_EXECUTION_RPC_URL ||
  process.env.MAINNET_MONITOR_RPC_URL ||
  readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

if (!String(rpcUrl || "").startsWith("https://")) {
  issue("DEX_LIQUIDITY_TOKEN_APPROVAL_SUBMISSION_DRY_RUN_RPC_URL", "RPC URL must be available and start with https://.");
}

const dryRunTransactionChecks = [];

if (issues.length === 0) {
  try {
    for (const [index, tx] of payload.transactions.entries()) {
      const builderTx = transactionBuilder.transactions[index] || {};
      const preparedTx = (preparation.preparedTransactions || []).find((item) => item.id === tx.id);
      const verificationCheck = (verification.transactionChecks || []).find((item) => item.id === tx.id);

      if (!preparedTx) {
        issue(`transactions.${tx.id}.preparedTx`, "Missing prepared transaction.");
        continue;
      }

      if (!verificationCheck) {
        issue(`transactions.${tx.id}.verificationCheck`, "Missing verification check.");
        continue;
      }

      const decoded = decodeApproveCalldata(tx.data);

      const builderMatchesPayload =
        sameAddress(builderTx.to, tx.to) &&
        String(builderTx.value) === String(tx.value) &&
        String(builderTx.data) === String(tx.data);

      const preparedMatchesPayload =
        sameAddress(preparedTx.to, tx.to) &&
        String(preparedTx.value) === String(tx.value) &&
        String(preparedTx.data) === String(tx.data);

      const outerToIsToken = sameAddress(tx.to, tx.tokenAddress);
      const decodedSpenderMatches = sameAddress(decoded.spender, payload.approvalSpender);
      const decodedAmountMatches = String(decoded.amountRaw) === String(tx.amountRaw);
      const dataHashVerified = sha256Hex(tx.data) === tx.dataHash;

      if (!builderMatchesPayload) {
        issue(`transactionBuilder.${index}`, "Transaction Builder transaction must match payload.");
      }

      if (!preparedMatchesPayload) {
        issue(`preparedTransactions.${tx.id}`, "Prepared transaction must match payload.");
      }

      if (!outerToIsToken) {
        issue(`transactions.${tx.id}.to`, "Outer To must be token contract.");
      }

      if (!decodedSpenderMatches) {
        issue(`transactions.${tx.id}.spender`, "Decoded spender must match approval spender.");
      }

      if (!decodedAmountMatches) {
        issue(`transactions.${tx.id}.amountRaw`, "Decoded amount must match payload amount.");
      }

      if (!dataHashVerified) {
        issue(`transactions.${tx.id}.dataHash`, "Data hash must verify.");
      }

      const currentBalanceRaw = await readTokenBalance(rpcUrl, tx.tokenAddress, payload.liquiditySafeAddress);
      const currentAllowanceRaw = await readTokenAllowance(rpcUrl, tx.tokenAddress, payload.liquiditySafeAddress, payload.approvalSpender);

      const balanceCoversFinalApproval = tx.approvalMode === "set-allowance-to-required-amount"
        ? BigInt(currentBalanceRaw || "0") >= BigInt(tx.amountRaw || "0")
        : true;

      const allowanceStillUnexecuted = String(currentAllowanceRaw) === String(tx.currentAllowanceRaw || currentAllowanceRaw);

      if (!balanceCoversFinalApproval) {
        issue(`transactions.${tx.id}.currentBalanceRaw`, `Current balance ${currentBalanceRaw} is below final approval amount ${tx.amountRaw}.`);
      }

      if (!allowanceStillUnexecuted) {
        issue(`transactions.${tx.id}.currentAllowanceRaw`, `Current allowance ${currentAllowanceRaw} differs from recorded pre-submission allowance ${tx.currentAllowanceRaw}.`);
      }

      dryRunTransactionChecks.push({
        id: tx.id,
        index,
        role: tx.role,
        symbol: tx.symbol,
        tokenAddress: tx.tokenAddress,
        approvalMode: tx.approvalMode,
        builderMatchesPayload,
        preparedMatchesPayload,
        outerToIsToken,
        decodedSpender: decoded.spender,
        decodedAmountRaw: decoded.amountRaw,
        decodedSpenderMatches,
        decodedAmountMatches,
        dataHashVerified,
        currentBalanceRaw,
        currentAllowanceRaw,
        recordedCurrentAllowanceRaw: tx.currentAllowanceRaw || "",
        allowanceStillUnexecuted,
        balanceCoversFinalApproval,
        tokenApprovalSafeTransactionSubmitted: false,
        tokenApprovalExecuted: false
      });
    }
  } catch (error) {
    issue("dryRunRpc", error.message);
  }
}

if (issues.length > 0) {
  const failed = {
    schema: "astra-dex-liquidity-token-approval-safe-submission-dry-run-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_DRY_RUN_FAILED",
    issues
  };

  writeJson(recordFile, failed);
  console.log(JSON.stringify(failed, null, 2));
  process.exit(1);
}

fs.mkdirSync(recordDir, { recursive: true });

const dryRunAt = new Date().toISOString();

const record = {
  schema: "astra-dex-liquidity-token-approval-safe-submission-dry-run-v0.1",
  dryRunAt,
  status: "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_SUBMISSION_DRY_RUN_COMPLETE_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  liquiditySafeAddress: payload.liquiditySafeAddress,
  approvalSpender: payload.approvalSpender,
  sourceSafeQueueUrl: preparation.sourceSafeQueueUrl,
  payloadReference: "reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json",
  transactionBuilderReference: "reports/dex-liquidity-token-approval/payload/token-approval-safe-transaction-builder.json",
  payloadHash: payload.payloadHash,
  transactionBuilderHash: verification.transactionBuilderHash,
  submissionPreparationReference: "public-docs/dex-liquidity-token-approval-safe-submission-preparation-status.json",
  submissionApprovalReference: "public-docs/dex-liquidity-token-approval-safe-submission-approval-status.json",
  transactionCount: payload.transactions.length,
  dryRunTransactionChecks,
  tokenApprovalSafeSubmissionDryRunComplete: true,
  operatorSubmissionCommandReviewed: true,
  operatorInstruction: "In the live submission milestone, import the verified Transaction Builder JSON into the liquidity Safe on Base and submit/propose only this token-approval payload. Stop after proposal/submission. Do not execute.",
  requiredBeforeTokenApprovalSafeSubmissionLive: {
    tokenApprovalSafeSubmissionDryRunComplete: true,
    tokenApprovalSafeSubmissionPreparationComplete: true,
    tokenApprovalSafeSubmissionApprovalRecorded: true,
    tokenApprovalSafePayloadVerified: true,
    tokenApprovalPayloadHashVerified: true,
    transactionBuilderHashVerified: true,
    approvalCalldataVerified: true,
    operatorSubmissionCommandReviewed: true,
    tokenApprovalSafeTransactionSubmitted: false,
    tokenApprovalExecuted: false,
    publicStatusUpdatePrepared: false
  },
  flags: {
    tokenApprovalSafeSubmissionDryRunComplete: true,
    operatorSubmissionCommandReviewed: true,
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
    dryRunOnly: true,
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

record.dryRunHash = sha256Json(record);

writeJson(recordFile, record);

const config = readJsonPath(configFile);

config.status = "token-approval-safe-submission-dry-run-complete-not-submitted-no-approvals-executed-no-liquidity";
config.tokenApprovalSafeSubmissionDryRunComplete = true;
config.operatorSubmissionCommandReviewed = true;
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
config.completedTokenApprovalSafeSubmissionDryRun = {
  dryRunAt,
  liquiditySafeAddress: record.liquiditySafeAddress,
  approvalSpender: record.approvalSpender,
  payloadHash: record.payloadHash,
  transactionBuilderHash: record.transactionBuilderHash,
  transactionCount: record.transactionCount,
  recordFile: "reports/dex-liquidity-token-approval-safe-submission-dry-run/dex-liquidity-token-approval-safe-submission-dry-run.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-token-approval-safe-submission-dry-run-result-v0.1",
  checkedAt: dryRunAt,
  status: record.status,
  liquiditySafeAddress: record.liquiditySafeAddress,
  approvalSpender: record.approvalSpender,
  transactionCount: record.transactionCount,
  tokenApprovalSafeSubmissionDryRunComplete: true,
  tokenApprovalSafeTransactionSubmitted: false,
  tokenApprovalExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  fullLaunchApproved: false
}, null, 2));
