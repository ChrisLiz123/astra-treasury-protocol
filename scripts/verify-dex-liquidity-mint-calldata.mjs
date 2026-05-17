import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const verificationDir = path.join(root, "reports", "dex-liquidity-mint-calldata-verification");
const verificationFile = path.join(verificationDir, "dex-liquidity-mint-calldata-verification.json");
const configFile = path.join(root, "configs", "dex-liquidity-mint-calldata-verification.config.json");

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

function tickSpacingForFee(fee) {
  const table = {
    "100": 1,
    "500": 10,
    "3000": 60,
    "10000": 200
  };

  return table[String(fee)] || 0;
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

const calldata = readJson("reports/dex-liquidity-provision/payload/liquidity-mint-calldata.json");
const generationReport = readJson("reports/dex-liquidity-mint-calldata/dex-liquidity-mint-calldata-generation.json");
const calldataStatus = readJson("public-docs/dex-liquidity-mint-calldata-status.json");
const approvalStatus = readJson("public-docs/dex-liquidity-mint-calldata-generation-approval-status.json");
const allowanceStatus = readJson("public-docs/dex-liquidity-token-approval-post-execution-allowances-status.json");
const allowanceReport = readJson("reports/dex-liquidity-token-approval-post-execution-allowances/dex-liquidity-token-approval-post-execution-allowances.json");
const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

requireStatus("calldata.status", calldata.status, "DEX_LIQUIDITY_MINT_CALLDATA_GENERATED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("calldataStatus.status", calldataStatus.status, "DEX_LIQUIDITY_MINT_CALLDATA_GENERATED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("generationReport.status", generationReport.status, "DEX_LIQUIDITY_MINT_CALLDATA_GENERATED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("approvalStatus.status", approvalStatus.status, "DEX_LIQUIDITY_MINT_CALLDATA_GENERATION_APPROVED_NO_CALLDATA_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("allowanceStatus.status", allowanceStatus.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_POST_EXECUTION_ALLOWANCES_VERIFIED_APPROVALS_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("poolStatus.status", poolStatus.status, "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING");

if (calldataStatus.summary?.liquidityMintCalldataGenerated !== true) {
  issue("calldataStatus.summary.liquidityMintCalldataGenerated", "Calldata status must show generated.");
}

if (calldataStatus.summary?.liquiditySafePayloadGenerated !== false || calldataStatus.summary?.liquidityAdded !== false) {
  issue("calldataStatus.summary.liquidityFlags", "Calldata status must show no Safe payload and no liquidity.");
}

if (allowanceStatus.summary?.allRequiredAllowancesAvailable !== true || allowanceStatus.summary?.allRequiredBalancesAvailable !== true) {
  issue("allowanceStatus.summary", "Allowances and balances must be available.");
}

if (allowanceStatus.summary?.tokenApprovalExecuted !== true) {
  issue("allowanceStatus.summary.tokenApprovalExecuted", "Token approvals must be executed.");
}

if (poolStatus.summary?.liquidityVerifiedZero !== true || String(poolStatus.summary?.poolLiquidity || "") !== "0") {
  issue("poolStatus.summary.poolLiquidity", "Pool liquidity must remain zero.");
}

if (!isAddress(calldata.liquiditySafeAddress) || !isAddress(calldata.nonfungiblePositionManager) || !isAddress(calldata.target)) {
  issue("calldata.addresses", "Liquidity Safe, NonfungiblePositionManager, and target must be valid.");
}

if (!sameAddress(calldata.nonfungiblePositionManager, calldata.target)) {
  issue("calldata.target", "Target must equal NonfungiblePositionManager.");
}

if (!sameAddress(calldata.liquiditySafeAddress, allowanceReport.liquiditySafeAddress)) {
  issue("calldata.liquiditySafeAddress", "Liquidity Safe must match allowance report.");
}

if (!sameAddress(calldata.nonfungiblePositionManager, allowanceReport.approvalSpender)) {
  issue("calldata.nonfungiblePositionManager", "NonfungiblePositionManager must match approved spender.");
}

if (String(calldata.value) !== "0" || calldata.operation !== "CALL" || calldata.operationValue !== 0) {
  issue("calldata.call", "Calldata artifact must be CALL with value 0.");
}

if (calldata.functionSelector !== "0x88316456") {
  issue("calldata.functionSelector", "Mint function selector must be 0x88316456.");
}

if (!String(calldata.calldata || "").startsWith("0x88316456")) {
  issue("calldata.calldata", "Calldata must start with 0x88316456.");
}

if (String(calldata.calldata || "").replace(/^0x/i, "").length !== 8 + (64 * 11)) {
  issue("calldata.calldata.length", "Calldata length must equal selector plus 11 static ABI words.");
}

let decoded = {};
let recomputedCalldataHash = "";
let recomputedArtifactHash = "";

try {
  decoded = decodeMintCalldata(calldata.calldata);
  recomputedCalldataHash = sha256Hex(calldata.calldata);

  const artifactForHash = JSON.parse(JSON.stringify(calldata));
  const recordedArtifactHash = artifactForHash.calldataArtifactHash || "";
  delete artifactForHash.calldataArtifactHash;
  recomputedArtifactHash = sha256Json(artifactForHash);

  if (calldata.calldataHash !== recomputedCalldataHash) {
    issue("calldata.calldataHash", "Calldata hash does not match recomputed hash.");
  }

  if (recordedArtifactHash !== recomputedArtifactHash) {
    issue("calldata.calldataArtifactHash", "Calldata artifact hash does not match recomputed hash.");
  }
} catch (error) {
  issue("calldata.decode", error.message);
}

const params = calldata.mintParams || {};
const artifactDecoded = calldata.decodedMintParams || {};

for (const key of ["token0", "token1", "recipient"]) {
  if (!isAddress(params[key])) {
    issue(`mintParams.${key}`, `${key} must be a valid address.`);
  }

  if (!sameAddress(params[key], decoded[key])) {
    issue(`mintParams.${key}`, `${key} must match freshly decoded calldata.`);
  }

  if (!sameAddress(params[key], artifactDecoded[key])) {
    issue(`decodedMintParams.${key}`, `${key} must match stored decoded parameters.`);
  }
}

for (const key of ["fee", "tickLower", "tickUpper", "amount0Desired", "amount1Desired", "amount0Min", "amount1Min", "deadline"]) {
  if (String(params[key]) !== String(decoded[key])) {
    issue(`mintParams.${key}`, `${key} must match freshly decoded calldata.`);
  }

  if (String(params[key]) !== String(artifactDecoded[key])) {
    issue(`decodedMintParams.${key}`, `${key} must match stored decoded parameters.`);
  }
}

if (isAddress(params.token0) && isAddress(params.token1)) {
  if (String(params.token0).toLowerCase() >= String(params.token1).toLowerCase()) {
    issue("mintParams.tokenOrdering", "token0 must sort before token1 for Uniswap V3.");
  }
}

const fee = Number(params.fee);
const tickSpacing = tickSpacingForFee(fee);

if (!tickSpacing) {
  issue("mintParams.fee", `Unsupported fee tier: ${params.fee}`);
}

const tickLower = Number(params.tickLower);
const tickUpper = Number(params.tickUpper);

if (!Number.isInteger(tickLower) || !Number.isInteger(tickUpper)) {
  issue("mintParams.ticks", "Ticks must be integers.");
}

if (tickLower >= tickUpper) {
  issue("mintParams.ticks", "tickLower must be less than tickUpper.");
}

if (tickSpacing && (tickLower % tickSpacing !== 0 || tickUpper % tickSpacing !== 0)) {
  issue("mintParams.ticks", `Ticks must be multiples of tick spacing ${tickSpacing}.`);
}

if (tickLower < -887272 || tickUpper > 887272) {
  issue("mintParams.ticks", "Ticks must remain within Uniswap V3 tick bounds.");
}

if (BigInt(params.amount0Desired || "0") <= 0n || BigInt(params.amount1Desired || "0") <= 0n) {
  issue("mintParams.desiredAmounts", "Desired amounts must be positive.");
}

if (BigInt(params.amount0Min || "0") > BigInt(params.amount0Desired || "0")) {
  issue("mintParams.amount0Min", "amount0Min must not exceed amount0Desired.");
}

if (BigInt(params.amount1Min || "0") > BigInt(params.amount1Desired || "0")) {
  issue("mintParams.amount1Min", "amount1Min must not exceed amount1Desired.");
}

if (!sameAddress(params.recipient, calldata.liquiditySafeAddress)) {
  issue("mintParams.recipient", "Mint recipient should be the liquidity Safe.");
}

const now = Math.floor(Date.now() / 1000);

if (!/^\d+$/.test(String(params.deadline || "")) || Number(params.deadline) <= now) {
  issue("mintParams.deadline", "Deadline must be a future Unix timestamp.");
}

if (String(calldata.poolLiquidityBeforeCalldataGeneration || "") !== "0") {
  issue("calldata.poolLiquidityBeforeCalldataGeneration", "Pool liquidity before calldata generation must be zero.");
}

for (const key of [
  "liquiditySafePayloadGenerated",
  "liquiditySafeTransactionSubmitted",
  "liquiditySafeTransactionExecuted",
  "liquidityAdded",
  "positionMinted",
  "publicTradingApproved",
  "publicTradingLinkApproved",
  "buyPageActivated",
  "fullLaunchApproved"
]) {
  if (calldata.flags?.[key] !== false) {
    issue(`calldata.flags.${key}`, `${key} must remain false.`);
  }
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
  "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "public-docs/dex-liquidity-added-status.json",
  "public-docs/dex-public-trading-live-status.json"
];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden liquidity/public-trading artifact exists. Calldata verification must not add liquidity or enable trading.");
  }
}

const rpcUrl =
  process.env.DEX_LIQUIDITY_MINT_CALLDATA_VERIFICATION_RPC_URL ||
  process.env.DEX_LIQUIDITY_MINT_CALLDATA_RPC_URL ||
  process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_POST_EXECUTION_ALLOWANCES_RPC_URL ||
  process.env.DEX_POST_EXECUTION_RPC_URL ||
  process.env.MAINNET_MONITOR_RPC_URL ||
  readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

if (!String(rpcUrl || "").startsWith("https://")) {
  issue("DEX_LIQUIDITY_MINT_CALLDATA_VERIFICATION_RPC_URL", "RPC URL must be available and start with https://.");
}

let livePoolLiquidity = String(poolStatus.summary?.poolLiquidity || "0");
let nftManagerCodePresent = false;
let liveBalance0Raw = "";
let liveBalance1Raw = "";
let liveAllowance0Raw = "";
let liveAllowance1Raw = "";

if (issues.length === 0) {
  try {
    const nftManagerCode = await rpcCall(rpcUrl, "eth_getCode", [calldata.nonfungiblePositionManager, "latest"]);
    nftManagerCodePresent = isNonEmptyCode(nftManagerCode);

    if (!nftManagerCodePresent) {
      issue("nonfungiblePositionManager.code", "NonfungiblePositionManager must have contract code.");
    }

    if (isAddress(calldata.poolAddress)) {
      livePoolLiquidity = await readPoolLiquidity(rpcUrl, calldata.poolAddress);
    }

    if (livePoolLiquidity !== "0") {
      issue("poolLiquidity", `Live pool liquidity is ${livePoolLiquidity}; expected 0.`);
    }

    liveBalance0Raw = await readTokenBalance(rpcUrl, params.token0, calldata.liquiditySafeAddress);
    liveBalance1Raw = await readTokenBalance(rpcUrl, params.token1, calldata.liquiditySafeAddress);
    liveAllowance0Raw = await readTokenAllowance(rpcUrl, params.token0, calldata.liquiditySafeAddress, calldata.nonfungiblePositionManager);
    liveAllowance1Raw = await readTokenAllowance(rpcUrl, params.token1, calldata.liquiditySafeAddress, calldata.nonfungiblePositionManager);

    if (BigInt(liveBalance0Raw) < BigInt(params.amount0Desired)) {
      issue("liveBalances.token0", `Token0 balance ${liveBalance0Raw} is below amount0Desired ${params.amount0Desired}.`);
    }

    if (BigInt(liveBalance1Raw) < BigInt(params.amount1Desired)) {
      issue("liveBalances.token1", `Token1 balance ${liveBalance1Raw} is below amount1Desired ${params.amount1Desired}.`);
    }

    if (BigInt(liveAllowance0Raw) < BigInt(params.amount0Desired)) {
      issue("liveAllowances.token0", `Token0 allowance ${liveAllowance0Raw} is below amount0Desired ${params.amount0Desired}.`);
    }

    if (BigInt(liveAllowance1Raw) < BigInt(params.amount1Desired)) {
      issue("liveAllowances.token1", `Token1 allowance ${liveAllowance1Raw} is below amount1Desired ${params.amount1Desired}.`);
    }
  } catch (error) {
    issue("rpc", error.message);
  }
}

if (issues.length > 0) {
  const failed = {
    schema: "astra-dex-liquidity-mint-calldata-verification-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_LIQUIDITY_MINT_CALLDATA_VERIFICATION_FAILED",
    issues
  };

  writeJson(verificationFile, failed);
  console.log(JSON.stringify(failed, null, 2));
  process.exit(1);
}

const verifiedAt = new Date().toISOString();

const verification = {
  schema: "astra-dex-liquidity-mint-calldata-verification-v0.1",
  verifiedAt,
  status: "DEX_LIQUIDITY_MINT_CALLDATA_VERIFIED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  verificationOnly: true,
  calldataReference: "reports/dex-liquidity-provision/payload/liquidity-mint-calldata.json",
  generationReportReference: "reports/dex-liquidity-mint-calldata/dex-liquidity-mint-calldata-generation.json",
  liquiditySafeAddress: calldata.liquiditySafeAddress,
  nonfungiblePositionManager: calldata.nonfungiblePositionManager,
  poolAddress: calldata.poolAddress,
  calldataHash: calldata.calldataHash,
  recomputedCalldataHash,
  calldataHashVerified: true,
  calldataArtifactHash: calldata.calldataArtifactHash,
  recomputedCalldataArtifactHash: recomputedArtifactHash,
  calldataArtifactHashVerified: true,
  functionSelector: calldata.functionSelector,
  functionSignature: calldata.functionSignature,
  mintParams: params,
  freshlyDecodedMintParams: decoded,
  storedDecodedMintParams: artifactDecoded,
  decodedMintParamsVerified: true,
  tickSpacing,
  liveChecks: {
    nftManagerCodePresent,
    poolLiquidity: livePoolLiquidity,
    poolLiquidityVerifiedZero: livePoolLiquidity === "0",
    token0: {
      tokenAddress: params.token0,
      desiredRaw: params.amount0Desired,
      minRaw: params.amount0Min,
      liveBalanceRaw: liveBalance0Raw,
      liveAllowanceRaw: liveAllowance0Raw,
      balanceCoversDesired: BigInt(liveBalance0Raw) >= BigInt(params.amount0Desired),
      allowanceCoversDesired: BigInt(liveAllowance0Raw) >= BigInt(params.amount0Desired)
    },
    token1: {
      tokenAddress: params.token1,
      desiredRaw: params.amount1Desired,
      minRaw: params.amount1Min,
      liveBalanceRaw: liveBalance1Raw,
      liveAllowanceRaw: liveAllowance1Raw,
      balanceCoversDesired: BigInt(liveBalance1Raw) >= BigInt(params.amount1Desired),
      allowanceCoversDesired: BigInt(liveAllowance1Raw) >= BigInt(params.amount1Desired)
    }
  },
  liquidityMintCalldataGenerated: true,
  liquidityMintCalldataVerified: true,
  tokenApprovalExecuted: true,
  allRequiredAllowancesAvailable: true,
  allRequiredBalancesAvailable: true,
  poolLiquidityVerifiedZero: true,
  liquiditySafePayloadGenerated: false,
  liquiditySafeTransactionSubmitted: false,
  liquiditySafeTransactionExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  publicTradingLinkApproved: false,
  buyPageActivated: false,
  fullLaunchApproved: false,
  requiredBeforeLiquiditySafePayloadGenerationApproval: {
    liquidityMintCalldataGenerated: true,
    liquidityMintCalldataVerified: true,
    liquidityMintCalldataHashVerified: true,
    liquidityMintCalldataDecoded: true,
    nonfungiblePositionManagerVerified: true,
    liveBalancesVerified: true,
    liveAllowancesVerified: true,
    poolLiquidityStillZero: true,
    liquiditySafePayloadGenerationApprovalRecorded: false,
    liquiditySafePayloadGenerated: false,
    liquidityAdded: false,
    publicStatusUpdatePrepared: false
  },
  safety: {
    verificationOnly: true,
    generatesLiquiditySafePayload: false,
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

config.status = "liquidity-mint-calldata-verified-no-safe-payload-no-liquidity-no-public-trading";
config.liquidityMintCalldataGenerated = true;
config.liquidityMintCalldataVerified = true;
config.liquiditySafePayloadGenerated = false;
config.liquiditySafeTransactionSubmitted = false;
config.liquiditySafeTransactionExecuted = false;
config.liquidityAdded = false;
config.positionMinted = false;
config.publicTradingApproved = false;
config.publicTradingLinkApproved = false;
config.buyPageActivationApproved = false;
config.fullLaunchApproved = false;
config.verifiedLiquidityMintCalldata = {
  verifiedAt,
  calldataHash: verification.calldataHash,
  calldataArtifactHash: verification.calldataArtifactHash,
  verificationHash: verification.verificationHash,
  liquiditySafeAddress: verification.liquiditySafeAddress,
  nonfungiblePositionManager: verification.nonfungiblePositionManager,
  poolAddress: verification.poolAddress,
  recordFile: "reports/dex-liquidity-mint-calldata-verification/dex-liquidity-mint-calldata-verification.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-mint-calldata-verification-result-v0.1",
  checkedAt: verifiedAt,
  status: verification.status,
  liquiditySafeAddress: verification.liquiditySafeAddress,
  nonfungiblePositionManager: verification.nonfungiblePositionManager,
  poolAddress: verification.poolAddress,
  calldataHashVerified: true,
  calldataArtifactHashVerified: true,
  decodedMintParamsVerified: true,
  poolLiquidityVerifiedZero: true,
  liquidityMintCalldataVerified: true,
  liquiditySafePayloadGenerated: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  fullLaunchApproved: false
}, null, 2));
