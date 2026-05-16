import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const payloadRelativePath = "reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json";
const transactionBuilderRelativePath = "reports/dex-liquidity-token-approval/payload/token-approval-safe-transaction-builder.json";
const verificationDir = path.join(root, "reports", "dex-liquidity-token-approval-safe-payload-verification");
const verificationFile = path.join(verificationDir, "dex-liquidity-token-approval-safe-payload-verification.json");
const configFile = path.join(root, "configs", "dex-liquidity-token-approval-safe-payload-verification.config.json");

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

function isZeroAddress(value) {
  return String(value || "").toLowerCase() === "0x0000000000000000000000000000000000000000";
}

function sameAddress(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

function encodeAddress(value) {
  return String(value).replace(/^0x/i, "").toLowerCase().padStart(64, "0");
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

function requireStatus(name, value, expected) {
  if (value !== expected) {
    issue(name, `Expected ${expected}, got ${value || "UNKNOWN"}.`);
  }
}

fs.mkdirSync(verificationDir, { recursive: true });

const config = readJson("configs/dex-liquidity-token-approval-safe-payload-verification.config.json");
const payload = readJson(payloadRelativePath);
const transactionBuilder = readJson(transactionBuilderRelativePath);
const generationReport = readJson("reports/dex-liquidity-token-approval-safe-payload/dex-liquidity-token-approval-safe-payload-generation.json");
const payloadStatus = readJson("public-docs/dex-liquidity-token-approval-safe-payload-status.json");
const approvalStatus = readJson("public-docs/dex-liquidity-token-approval-payload-generation-approval-status.json");
const recheckStatus = readJson("public-docs/dex-liquidity-token-approval-requirements-recheck-status.json");
const recheck = readJson("reports/dex-liquidity-token-approval-requirements-recheck/dex-liquidity-token-approval-requirements-recheck.json");
const postBalances = readJson("public-docs/dex-liquidity-funding-transfer-post-execution-balances-status.json");
const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

if (config.verificationOnly !== true) {
  issue("config.verificationOnly", "Config must be verification-only.");
}

requireStatus("payload.status", payload.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("payloadStatus.status", payloadStatus.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("generationReport.status", generationReport.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY");
requireStatus("approvalStatus.status", approvalStatus.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_GENERATION_APPROVED_NO_PAYLOAD_NO_APPROVALS_EXECUTED");
requireStatus("recheckStatus.status", recheckStatus.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_RECHECK_COMPLETE_APPROVALS_REQUIRED_NO_APPROVALS_EXECUTED");
requireStatus("postBalances.status", postBalances.status, "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_POST_EXECUTION_BALANCES_VERIFIED_FUNDS_MOVED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("poolStatus.status", poolStatus.status, "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING");

if (payloadStatus.summary?.tokenApprovalSafePayloadGenerated !== true || payloadStatus.summary?.tokenApprovalTransactionBuilderGenerated !== true) {
  issue("payloadStatus.summary", "Payload and Transaction Builder must be generated.");
}

if (payloadStatus.summary?.tokenApprovalSafeTransactionSubmitted !== false || payloadStatus.summary?.tokenApprovalExecuted !== false || payloadStatus.summary?.liquidityAdded !== false) {
  issue("payloadStatus.summary.flags", "Payload status must show not submitted, no approval execution, and no liquidity.");
}

if (!isAddress(payload.liquiditySafeAddress) || isZeroAddress(payload.liquiditySafeAddress)) {
  issue("payload.liquiditySafeAddress", "Liquidity Safe must be valid.");
}

if (!isAddress(payload.approvalSpender) || isZeroAddress(payload.approvalSpender)) {
  issue("payload.approvalSpender", "Approval spender must be valid.");
}

if (!sameAddress(payload.liquiditySafeAddress, recheck.liquiditySafeAddress)) {
  issue("payload.liquiditySafeAddress", "Payload liquidity Safe must match recheck.");
}

if (!sameAddress(payload.approvalSpender, recheck.approvalSpender)) {
  issue("payload.approvalSpender", "Payload spender must match recheck.");
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
  "reports/dex-liquidity-provision/payload/token-approval-safe-payload.json",
  "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "public-docs/dex-liquidity-added-status.json",
  "public-docs/dex-public-trading-live-status.json"
];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden token-approval-live/liquidity/public-trading artifact exists. Verification must not execute approvals or add liquidity.");
  }
}

const payloadForHash = JSON.parse(JSON.stringify(payload));
const recordedPayloadHash = payloadForHash.payloadHash || "";
delete payloadForHash.payloadHash;
const recomputedPayloadHash = sha256Json(payloadForHash);
const payloadHashVerified = recordedPayloadHash === recomputedPayloadHash;

if (!payloadHashVerified) {
  issue("payload.payloadHash", "Payload hash does not match recomputed hash.");
}

const builderForHash = JSON.parse(JSON.stringify(transactionBuilder));
const recordedTransactionBuilderHash = builderForHash.transactionBuilderHash || generationReport.transactionBuilderHash || "";
delete builderForHash.transactionBuilderHash;
const recomputedTransactionBuilderHash = sha256Json(builderForHash);
const transactionBuilderHashVerified = recordedTransactionBuilderHash === recomputedTransactionBuilderHash;

if (!transactionBuilderHashVerified) {
  issue("transactionBuilder.transactionBuilderHash", "Transaction Builder hash does not match recomputed hash.");
}

if (!Array.isArray(payload.transactions) || payload.transactions.length <= 0) {
  issue("payload.transactions", "Payload transactions must be present.");
}

if (!Array.isArray(transactionBuilder.transactions) || transactionBuilder.transactions.length !== payload.transactions.length) {
  issue("transactionBuilder.transactions", "Transaction Builder transaction count must match payload.");
}

const requiredApprovalItems = Array.isArray(recheck.tokenApprovalRequirements)
  ? recheck.tokenApprovalRequirements.filter((item) => item.approvalRequired === true)
  : [];

const requirementsByToken = new Map(requiredApprovalItems.map((item) => [String(item.tokenAddress || "").toLowerCase(), item]));

const rpcUrl =
  process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_VERIFICATION_RPC_URL ||
  process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_RPC_URL ||
  process.env.DEX_POST_EXECUTION_RPC_URL ||
  process.env.MAINNET_MONITOR_RPC_URL ||
  readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

if (!String(rpcUrl || "").startsWith("https://")) {
  issue("DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_VERIFICATION_RPC_URL", "RPC URL must be available and start with https://.");
}

const transactionChecks = [];

if (issues.length === 0) {
  try {
    for (const [index, tx] of payload.transactions.entries()) {
      const builderTx = transactionBuilder.transactions[index] || {};
      const decoded = decodeApproveCalldata(tx.data);
      const requirement = requirementsByToken.get(String(tx.tokenAddress || "").toLowerCase());

      if (!isAddress(tx.to) || !isAddress(tx.tokenAddress)) {
        issue(`transactions.${tx.id}.to`, "Transaction target/token must be valid.");
      }

      if (!sameAddress(tx.to, tx.tokenAddress)) {
        issue(`transactions.${tx.id}.to`, "Approval transaction outer To must be the token contract.");
      }

      if (!sameAddress(builderTx.to, tx.to)) {
        issue(`transactionBuilder.${index}.to`, "Transaction Builder To must match payload transaction To.");
      }

      if (String(builderTx.value) !== String(tx.value) || String(tx.value) !== "0") {
        issue(`transactionBuilder.${index}.value`, "Transaction Builder and payload value must be 0.");
      }

      if (String(builderTx.data) !== String(tx.data)) {
        issue(`transactionBuilder.${index}.data`, "Transaction Builder data must match payload transaction data.");
      }

      if (tx.operation !== "CALL" || tx.operationValue !== 0) {
        issue(`transactions.${tx.id}.operation`, "Operation must be CALL / 0.");
      }

      if (tx.functionSelector !== "0x095ea7b3" || tx.functionSignature !== "approve(address,uint256)") {
        issue(`transactions.${tx.id}.functionSignature`, "Function must be ERC-20 approve(address,uint256).");
      }

      if (!sameAddress(decoded.spender, payload.approvalSpender)) {
        issue(`transactions.${tx.id}.spender`, "Decoded spender must match payload approval spender.");
      }

      if (String(decoded.amountRaw) !== String(tx.amountRaw)) {
        issue(`transactions.${tx.id}.amountRaw`, "Decoded approval amount must match payload amount.");
      }

      if (sha256Hex(tx.data) !== tx.dataHash) {
        issue(`transactions.${tx.id}.dataHash`, "Calldata hash mismatch.");
      }

      if (tx.approvalMode === "set-allowance-to-required-amount") {
        if (!requirement) {
          issue(`transactions.${tx.id}.requirement`, "No matching required approval item found.");
        } else if (String(tx.amountRaw) !== String(requirement.recommendedApprovalAmountRaw || requirement.desiredRaw || "")) {
          issue(`transactions.${tx.id}.recommendedApprovalAmountRaw`, "Final approval amount must match rechecked recommended approval amount.");
        }
      }

      if (tx.approvalMode === "reset-existing-allowance-to-zero-before-final-approval" && String(tx.amountRaw) !== "0") {
        issue(`transactions.${tx.id}.resetAmount`, "Reset approval transaction must approve 0.");
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

      transactionChecks.push({
        id: tx.id,
        role: tx.role,
        symbol: tx.symbol,
        tokenAddress: tx.tokenAddress,
        approvalMode: tx.approvalMode,
        decodedSpender: decoded.spender,
        decodedAmountRaw: decoded.amountRaw,
        approvalSpenderMatches: sameAddress(decoded.spender, payload.approvalSpender),
        amountMatchesCalldata: String(decoded.amountRaw) === String(tx.amountRaw),
        outerToIsToken: sameAddress(tx.to, tx.tokenAddress),
        transactionBuilderMatchesPayload: sameAddress(builderTx.to, tx.to) && String(builderTx.value) === String(tx.value) && String(builderTx.data) === String(tx.data),
        dataHashVerified: sha256Hex(tx.data) === tx.dataHash,
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
    issue("payloadVerificationRpc", error.message);
  }
}

if (issues.length > 0) {
  const failed = {
    schema: "astra-dex-liquidity-token-approval-safe-payload-verification-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_VERIFICATION_REQUIRED",
    issues
  };

  writeJson(verificationFile, failed);
  console.log(JSON.stringify(failed, null, 2));
  process.exit(1);
}

const verifiedAt = new Date().toISOString();

const verification = {
  schema: "astra-dex-liquidity-token-approval-safe-payload-verification-v0.1",
  verifiedAt,
  status: "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  verificationOnly: true,
  payloadReference: payloadRelativePath,
  transactionBuilderReference: transactionBuilderRelativePath,
  liquiditySafeAddress: payload.liquiditySafeAddress,
  approvalSpender: payload.approvalSpender,
  payloadHash: recordedPayloadHash,
  recomputedPayloadHash,
  payloadHashVerified,
  transactionBuilderHash: recordedTransactionBuilderHash,
  recomputedTransactionBuilderHash,
  transactionBuilderHashVerified,
  transactionCount: payload.transactions.length,
  transactionChecks,
  tokenApprovalSafePayloadVerified: true,
  tokenApprovalPayloadHashVerified: true,
  transactionBuilderJsonVerified: true,
  approvalCalldataVerified: true,
  tokenApprovalSafePayloadGenerated: true,
  tokenApprovalTransactionBuilderGenerated: true,
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
  fullLaunchApproved: false,
  requiredBeforeTokenApprovalSafeSubmissionApproval: {
    tokenApprovalSafePayloadVerified: true,
    tokenApprovalPayloadHashVerified: true,
    transactionBuilderHashVerified: true,
    approvalCalldataVerified: true,
    tokenApprovalSafeTransactionSubmitted: false,
    tokenApprovalExecuted: false,
    safeSubmissionApprovalRecorded: false,
    publicStatusUpdatePrepared: false
  },
  safety: {
    verificationOnly: true,
    submitsSafeTransaction: false,
    executesTokenApproval: false,
    generatesLiquidityCalldata: false,
    addsLiquidity: false,
    mintsPosition: false,
    activatesBuyPage: false,
    approvesPublicTrading: false,
    approvesFullLaunch: false
  },
  issues: []
};

verification.verificationHash = sha256Json(verification);

writeJson(verificationFile, verification);

const currentConfig = readJsonPath(configFile);

currentConfig.status = "token-approval-safe-payload-verified-not-submitted-no-approvals-executed-no-liquidity";
currentConfig.tokenApprovalSafePayloadVerified = true;
currentConfig.tokenApprovalPayloadHashVerified = true;
currentConfig.transactionBuilderHashVerified = true;
currentConfig.approvalCalldataVerified = true;
currentConfig.tokenApprovalSafePayloadGenerated = true;
currentConfig.tokenApprovalTransactionBuilderGenerated = true;
currentConfig.tokenApprovalSafeTransactionSubmitted = false;
currentConfig.tokenApprovalSafeTransactionExecuted = false;
currentConfig.tokenApprovalExecuted = false;
currentConfig.liquidityMintCalldataGenerated = false;
currentConfig.liquiditySafePayloadGenerated = false;
currentConfig.liquiditySafeTransactionSubmitted = false;
currentConfig.liquiditySafeTransactionExecuted = false;
currentConfig.liquidityAdded = false;
currentConfig.positionMinted = false;
currentConfig.publicTradingApproved = false;
currentConfig.publicTradingLinkApproved = false;
currentConfig.buyPageActivationApproved = false;
currentConfig.fullLaunchApproved = false;
currentConfig.verifiedTokenApprovalSafePayload = {
  verifiedAt,
  liquiditySafeAddress: verification.liquiditySafeAddress,
  approvalSpender: verification.approvalSpender,
  payloadHash: verification.payloadHash,
  transactionBuilderHash: verification.transactionBuilderHash,
  transactionCount: verification.transactionCount,
  recordFile: "reports/dex-liquidity-token-approval-safe-payload-verification/dex-liquidity-token-approval-safe-payload-verification.json"
};

writeJson(configFile, currentConfig);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-token-approval-safe-payload-verification-result-v0.1",
  checkedAt: verifiedAt,
  status: verification.status,
  liquiditySafeAddress: verification.liquiditySafeAddress,
  approvalSpender: verification.approvalSpender,
  payloadHashVerified,
  transactionBuilderHashVerified,
  transactionCount: verification.transactionCount,
  tokenApprovalSafePayloadVerified: true,
  tokenApprovalSafeTransactionSubmitted: false,
  tokenApprovalExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  fullLaunchApproved: false
}, null, 2));
