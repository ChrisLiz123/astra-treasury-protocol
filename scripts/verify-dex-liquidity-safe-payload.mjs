import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const verificationDir = path.join(root, "reports", "dex-liquidity-safe-payload-verification");
const verificationFile = path.join(verificationDir, "dex-liquidity-safe-payload-verification.json");
const configFile = path.join(root, "configs", "dex-liquidity-safe-payload-verification.config.json");

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

function decodeAddressFromWord(word) {
  return `0x${String(word || "").replace(/^0x/i, "").padStart(64, "0").slice(-40)}`;
}

function decodeUintWord(word) {
  return BigInt(`0x${String(word || "").replace(/^0x/i, "").padStart(64, "0")}`).toString();
}

function decodeIntWord(word) {
  const raw = BigInt(`0x${String(word || "").replace(/^0x/i, "").padStart(64, "0")}`);
  const max = 1n << 256n;
  const half = 1n << 255n;

  return raw >= half ? (raw - max).toString() : raw.toString();
}

function decodeMintCalldata(data) {
  const clean = String(data || "").replace(/^0x/i, "");

  if (!clean.startsWith("88316456")) {
    throw new Error("Mint calldata does not start with selector 0x88316456.");
  }

  const body = clean.slice(8);

  if (body.length !== 64 * 11) {
    throw new Error(`Unexpected mint calldata static body length ${body.length}; expected ${64 * 11}.`);
  }

  const words = [];

  for (let i = 0; i < 11; i += 1) {
    words.push(body.slice(i * 64, (i + 1) * 64));
  }

  return {
    token0: decodeAddressFromWord(words[0]),
    token1: decodeAddressFromWord(words[1]),
    fee: decodeUintWord(words[2]),
    tickLower: decodeIntWord(words[3]),
    tickUpper: decodeIntWord(words[4]),
    amount0Desired: decodeUintWord(words[5]),
    amount1Desired: decodeUintWord(words[6]),
    amount0Min: decodeUintWord(words[7]),
    amount1Min: decodeUintWord(words[8]),
    recipient: decodeAddressFromWord(words[9]),
    deadline: decodeUintWord(words[10])
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

async function readPoolLiquidity(rpcUrl, poolAddress) {
  const result = await rpcCall(rpcUrl, "eth_call", [
    {to: poolAddress, data: "0x1a686502"},
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

const payload = readJson("reports/dex-liquidity-provision/payload/liquidity-safe-payload.json");
const builder = readJson("reports/dex-liquidity-provision/payload/liquidity-safe-transaction-builder.json");
const generationReport = readJson("reports/dex-liquidity-safe-payload/dex-liquidity-safe-payload-generation.json");
const payloadStatus = readJson("public-docs/dex-liquidity-safe-payload-status.json");
const approvalStatus = readJson("public-docs/dex-liquidity-safe-payload-generation-approval-status.json");
const calldataVerificationStatus = readJson("public-docs/dex-liquidity-mint-calldata-verification-status.json");
const calldataVerification = readJson("reports/dex-liquidity-mint-calldata-verification/dex-liquidity-mint-calldata-verification.json");
const calldata = readJson("reports/dex-liquidity-provision/payload/liquidity-mint-calldata.json");
const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

requireStatus("payload.status", payload.status, "DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("payloadStatus.status", payloadStatus.status, "DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("generationReport.status", generationReport.status, "DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("approvalStatus.status", approvalStatus.status, "DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATION_APPROVED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("calldataVerificationStatus.status", calldataVerificationStatus.status, "DEX_LIQUIDITY_MINT_CALLDATA_VERIFIED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("calldataVerification.status", calldataVerification.status, "DEX_LIQUIDITY_MINT_CALLDATA_VERIFIED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("calldata.status", calldata.status, "DEX_LIQUIDITY_MINT_CALLDATA_GENERATED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("poolStatus.status", poolStatus.status, "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING");

if (payloadStatus.summary?.liquiditySafePayloadGenerated !== true) {
  issue("payloadStatus.summary.liquiditySafePayloadGenerated", "Payload status must show generated.");
}

if (payloadStatus.summary?.liquiditySafeTransactionSubmitted !== false || payloadStatus.summary?.liquiditySafeTransactionExecuted !== false || payloadStatus.summary?.liquidityAdded !== false) {
  issue("payloadStatus.summary.liquidityFlags", "Payload status must show not submitted, not executed, and no liquidity.");
}

const payloadBase = JSON.parse(JSON.stringify(payload));
const recordedPayloadHash = payloadBase.safePayloadHash || "";
delete payloadBase.safePayloadHash;
const recomputedPayloadHash = sha256Json(payloadBase);

if (recordedPayloadHash !== recomputedPayloadHash) {
  issue("payload.safePayloadHash", "Safe payload hash does not match recomputed hash.");
}

const builderBase = JSON.parse(JSON.stringify(builder));
const recordedBuilderHash = builderBase.transactionBuilderHash || "";
delete builderBase.transactionBuilderHash;
const recomputedBuilderHash = sha256Json(builderBase);

if (recordedBuilderHash !== recomputedBuilderHash) {
  issue("builder.transactionBuilderHash", "Transaction Builder hash does not match recomputed hash.");
}

if (payload.transactionBuilderHash !== recordedBuilderHash) {
  issue("payload.transactionBuilderHash", "Payload Transaction Builder hash must match builder hash.");
}

if (!isAddress(payload.safeAddress) || !isAddress(payload.liquiditySafeAddress)) {
  issue("payload.safeAddress", "Safe/liquidity Safe address must be valid.");
}

if (!sameAddress(payload.safeAddress, payload.liquiditySafeAddress)) {
  issue("payload.safeAddress", "safeAddress must equal liquiditySafeAddress.");
}

if (!sameAddress(payload.liquiditySafeAddress, calldataVerification.liquiditySafeAddress)) {
  issue("payload.liquiditySafeAddress", "Payload liquidity Safe must match calldata verification.");
}

if (!isAddress(payload.nonfungiblePositionManager)) {
  issue("payload.nonfungiblePositionManager", "NonfungiblePositionManager must be valid.");
}

if (!sameAddress(payload.nonfungiblePositionManager, calldataVerification.nonfungiblePositionManager)) {
  issue("payload.nonfungiblePositionManager", "Payload target must match verified NonfungiblePositionManager.");
}

if (!Array.isArray(payload.transactions) || payload.transactions.length !== 1) {
  issue("payload.transactions", "Payload must contain exactly one transaction.");
}

if (!Array.isArray(builder.transactions) || builder.transactions.length !== 1) {
  issue("builder.transactions", "Transaction Builder must contain exactly one transaction.");
}

const tx = payload.transactions?.[0] || {};
const builderTx = builder.transactions?.[0] || {};

if (!isAddress(tx.to) || !sameAddress(tx.to, payload.nonfungiblePositionManager)) {
  issue("payload.transactions.0.to", "Transaction target must be NonfungiblePositionManager.");
}

if (String(tx.value) !== "0" || tx.operation !== "CALL" || tx.operationValue !== 0) {
  issue("payload.transactions.0.call", "Transaction must be CALL with value 0.");
}

if (tx.functionSelector !== "0x88316456" || !String(tx.data || "").startsWith("0x88316456")) {
  issue("payload.transactions.0.data", "Transaction data must be Uniswap V3 mint calldata.");
}

if (tx.dataHash !== sha256Hex(tx.data)) {
  issue("payload.transactions.0.dataHash", "Transaction data hash must match data.");
}

if (!sameAddress(builderTx.to, tx.to) || String(builderTx.value) !== String(tx.value) || String(builderTx.data) !== String(tx.data)) {
  issue("builder.transactions.0", "Transaction Builder transaction must match payload transaction.");
}

if (payload.calldataHash !== calldata.calldataHash || tx.data !== calldata.calldata) {
  issue("payload.calldata", "Payload calldata must match verified calldata artifact.");
}

if (payload.calldataArtifactHash !== calldata.calldataArtifactHash) {
  issue("payload.calldataArtifactHash", "Payload calldata artifact hash must match calldata artifact.");
}

if (generationReport.safePayloadHash !== payload.safePayloadHash || generationReport.transactionBuilderHash !== builder.transactionBuilderHash) {
  issue("generationReport.hashes", "Generation report hashes must match payload and Transaction Builder.");
}

let decoded = {};

try {
  decoded = decodeMintCalldata(tx.data);
} catch (error) {
  issue("payload.transactions.0.decode", error.message);
}

const mintParams = payload.mintParams || {};
const calldataMintParams = calldata.mintParams || {};

for (const key of ["token0", "token1", "recipient"]) {
  if (!isAddress(mintParams[key])) {
    issue(`mintParams.${key}`, `${key} must be a valid address.`);
  }

  if (!sameAddress(mintParams[key], calldataMintParams[key])) {
    issue(`mintParams.${key}`, `${key} must match calldata artifact.`);
  }

  if (!sameAddress(mintParams[key], decoded[key])) {
    issue(`mintParams.${key}`, `${key} must match decoded transaction data.`);
  }
}

for (const key of ["fee", "tickLower", "tickUpper", "amount0Desired", "amount1Desired", "amount0Min", "amount1Min", "deadline"]) {
  if (String(mintParams[key]) !== String(calldataMintParams[key])) {
    issue(`mintParams.${key}`, `${key} must match calldata artifact.`);
  }

  if (String(mintParams[key]) !== String(decoded[key])) {
    issue(`mintParams.${key}`, `${key} must match decoded transaction data.`);
  }
}

if (calldataVerification.calldataHash !== payload.calldataHash || calldataVerification.calldataArtifactHash !== payload.calldataArtifactHash) {
  issue("calldataVerification.hashes", "Verification hashes must match payload.");
}

if (calldataVerification.liveChecks?.token0?.balanceCoversDesired !== true || calldataVerification.liveChecks?.token0?.allowanceCoversDesired !== true) {
  issue("calldataVerification.liveChecks.token0", "Token0 live balance and allowance must cover desired amount.");
}

if (calldataVerification.liveChecks?.token1?.balanceCoversDesired !== true || calldataVerification.liveChecks?.token1?.allowanceCoversDesired !== true) {
  issue("calldataVerification.liveChecks.token1", "Token1 live balance and allowance must cover desired amount.");
}

for (const key of [
  "liquiditySafeTransactionSubmitted",
  "liquiditySafeTransactionExecuted",
  "liquidityAdded",
  "positionMinted",
  "publicTradingApproved",
  "publicTradingLinkApproved",
  "buyPageActivated",
  "fullLaunchApproved"
]) {
  if (payload.flags?.[key] !== false) {
    issue(`payload.flags.${key}`, `${key} must remain false.`);
  }
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
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "public-docs/dex-liquidity-added-status.json",
  "public-docs/dex-public-trading-live-status.json"
];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden submission/live/liquidity/public-trading artifact exists. Payload verification must not submit or add liquidity.");
  }
}

const rpcUrl =
  process.env.DEX_LIQUIDITY_SAFE_PAYLOAD_VERIFICATION_RPC_URL ||
  process.env.DEX_LIQUIDITY_MINT_CALLDATA_VERIFICATION_RPC_URL ||
  process.env.DEX_POST_EXECUTION_RPC_URL ||
  process.env.MAINNET_MONITOR_RPC_URL ||
  readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

if (!String(rpcUrl || "").startsWith("https://")) {
  issue("DEX_LIQUIDITY_SAFE_PAYLOAD_VERIFICATION_RPC_URL", "RPC URL must be available and start with https://.");
}

let livePoolLiquidity = String(poolStatus.summary?.poolLiquidity || "0");
let safeCodePresent = false;
let npmCodePresent = false;
let liveBalance0Raw = "";
let liveBalance1Raw = "";
let liveAllowance0Raw = "";
let liveAllowance1Raw = "";

if (issues.length === 0) {
  try {
    const safeCode = await rpcCall(rpcUrl, "eth_getCode", [payload.liquiditySafeAddress, "latest"]);
    safeCodePresent = isNonEmptyCode(safeCode);

    if (!safeCodePresent) {
      issue("liquiditySafeAddress.code", "Liquidity Safe address must have contract code.");
    }

    const npmCode = await rpcCall(rpcUrl, "eth_getCode", [payload.nonfungiblePositionManager, "latest"]);
    npmCodePresent = isNonEmptyCode(npmCode);

    if (!npmCodePresent) {
      issue("nonfungiblePositionManager.code", "NonfungiblePositionManager must have contract code.");
    }

    if (isAddress(payload.poolAddress)) {
      livePoolLiquidity = await readPoolLiquidity(rpcUrl, payload.poolAddress);
    }

    if (livePoolLiquidity !== "0") {
      issue("poolLiquidity", `Live pool liquidity is ${livePoolLiquidity}; expected 0.`);
    }

    liveBalance0Raw = await readTokenBalance(rpcUrl, mintParams.token0, payload.liquiditySafeAddress);
    liveBalance1Raw = await readTokenBalance(rpcUrl, mintParams.token1, payload.liquiditySafeAddress);
    liveAllowance0Raw = await readTokenAllowance(rpcUrl, mintParams.token0, payload.liquiditySafeAddress, payload.nonfungiblePositionManager);
    liveAllowance1Raw = await readTokenAllowance(rpcUrl, mintParams.token1, payload.liquiditySafeAddress, payload.nonfungiblePositionManager);

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
    issue("rpc", error.message);
  }
}

if (issues.length > 0) {
  const failed = {
    schema: "astra-dex-liquidity-safe-payload-verification-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_LIQUIDITY_SAFE_PAYLOAD_VERIFICATION_FAILED",
    issues
  };

  writeJson(verificationFile, failed);
  console.log(JSON.stringify(failed, null, 2));
  process.exit(1);
}

const verifiedAt = new Date().toISOString();

const verification = {
  schema: "astra-dex-liquidity-safe-payload-verification-v0.1",
  verifiedAt,
  status: "DEX_LIQUIDITY_SAFE_PAYLOAD_VERIFIED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  verificationOnly: true,
  safePayloadReference: "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  transactionBuilderReference: "reports/dex-liquidity-provision/payload/liquidity-safe-transaction-builder.json",
  generationReportReference: "reports/dex-liquidity-safe-payload/dex-liquidity-safe-payload-generation.json",
  safeAddress: payload.safeAddress,
  liquiditySafeAddress: payload.liquiditySafeAddress,
  nonfungiblePositionManager: payload.nonfungiblePositionManager,
  poolAddress: payload.poolAddress,
  safePayloadHash: payload.safePayloadHash,
  recomputedSafePayloadHash: recomputedPayloadHash,
  safePayloadHashVerified: true,
  transactionBuilderHash: builder.transactionBuilderHash,
  recomputedTransactionBuilderHash: recomputedBuilderHash,
  transactionBuilderHashVerified: true,
  calldataHash: payload.calldataHash,
  calldataArtifactHash: payload.calldataArtifactHash,
  transactionDataHash: tx.dataHash,
  transactionDataHashVerified: true,
  transactionTargetVerified: true,
  transactionValueVerified: true,
  transactionOperationVerified: true,
  transactionDataVerified: true,
  decodedMintParamsVerified: true,
  mintParams,
  decodedMintParamsFromTransactionData: decoded,
  liveChecks: {
    safeCodePresent,
    npmCodePresent,
    poolLiquidity: livePoolLiquidity,
    poolLiquidityVerifiedZero: livePoolLiquidity === "0",
    token0: {
      tokenAddress: mintParams.token0,
      desiredRaw: mintParams.amount0Desired,
      minRaw: mintParams.amount0Min,
      liveBalanceRaw: liveBalance0Raw,
      liveAllowanceRaw: liveAllowance0Raw,
      balanceCoversDesired: BigInt(liveBalance0Raw) >= BigInt(mintParams.amount0Desired),
      allowanceCoversDesired: BigInt(liveAllowance0Raw) >= BigInt(mintParams.amount0Desired)
    },
    token1: {
      tokenAddress: mintParams.token1,
      desiredRaw: mintParams.amount1Desired,
      minRaw: mintParams.amount1Min,
      liveBalanceRaw: liveBalance1Raw,
      liveAllowanceRaw: liveAllowance1Raw,
      balanceCoversDesired: BigInt(liveBalance1Raw) >= BigInt(mintParams.amount1Desired),
      allowanceCoversDesired: BigInt(liveAllowance1Raw) >= BigInt(mintParams.amount1Desired)
    }
  },
  liquiditySafePayloadGenerated: true,
  liquiditySafePayloadVerified: true,
  liquiditySafeTransactionSubmitted: false,
  liquiditySafeTransactionExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  publicTradingLinkApproved: false,
  buyPageActivated: false,
  fullLaunchApproved: false,
  requiredBeforeLiquiditySafeSubmissionApproval: {
    liquiditySafePayloadGenerated: true,
    liquiditySafePayloadVerified: true,
    safePayloadHashVerified: true,
    transactionBuilderHashVerified: true,
    mintCalldataHashVerified: true,
    transactionTargetVerified: true,
    transactionDataVerified: true,
    liveBalancesVerified: true,
    liveAllowancesVerified: true,
    poolLiquidityStillZero: true,
    liquiditySafeSubmissionApprovalRecorded: false,
    liquiditySafeTransactionSubmitted: false,
    liquidityAdded: false,
    publicStatusUpdatePrepared: false
  },
  safety: {
    verificationOnly: true,
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

verification.verificationHash = sha256Json(verification);

writeJson(verificationFile, verification);

const config = readJsonPath(configFile);

config.status = "liquidity-safe-payload-verified-not-submitted-not-executed-no-liquidity-no-public-trading";
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
config.verifiedLiquiditySafePayload = {
  verifiedAt,
  safePayloadHash: verification.safePayloadHash,
  transactionBuilderHash: verification.transactionBuilderHash,
  calldataHash: verification.calldataHash,
  verificationHash: verification.verificationHash,
  liquiditySafeAddress: verification.liquiditySafeAddress,
  nonfungiblePositionManager: verification.nonfungiblePositionManager,
  recordFile: "reports/dex-liquidity-safe-payload-verification/dex-liquidity-safe-payload-verification.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-safe-payload-verification-result-v0.1",
  checkedAt: verifiedAt,
  status: verification.status,
  liquiditySafeAddress: verification.liquiditySafeAddress,
  nonfungiblePositionManager: verification.nonfungiblePositionManager,
  safePayloadHashVerified: true,
  transactionBuilderHashVerified: true,
  transactionDataVerified: true,
  liveBalancesVerified: true,
  liveAllowancesVerified: true,
  poolLiquidityVerifiedZero: true,
  liquiditySafePayloadVerified: true,
  liquiditySafeTransactionSubmitted: false,
  liquiditySafeTransactionExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  fullLaunchApproved: false
}, null, 2));
