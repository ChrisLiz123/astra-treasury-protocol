import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const confirm = process.env.DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATION_CONFIRM || "";
const overwrite = process.env.OVERWRITE_DEX_LIQUIDITY_SAFE_PAYLOAD || "";

const requiredConfirm = "GENERATE_DEX_LIQUIDITY_SAFE_PAYLOAD_ONLY_NOT_SUBMISSION_OR_EXECUTION";

const payloadDir = path.join(root, "reports", "dex-liquidity-provision", "payload");
const safePayloadFile = path.join(payloadDir, "liquidity-safe-payload.json");
const transactionBuilderFile = path.join(payloadDir, "liquidity-safe-transaction-builder.json");

const reportDir = path.join(root, "reports", "dex-liquidity-safe-payload");
const generationReportFile = path.join(reportDir, "dex-liquidity-safe-payload-generation.json");

const configFile = path.join(root, "configs", "dex-liquidity-safe-payload.config.json");

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

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || "").trim());
}

function sameAddress(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

function requireStatus(name, value, expected) {
  if (value !== expected) {
    issue(name, `Expected ${expected}, got ${value || "UNKNOWN"}.`);
  }
}

if (confirm !== requiredConfirm) {
  issue("DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATION_CONFIRM", `Must equal ${requiredConfirm}.`);
}

if ((fs.existsSync(safePayloadFile) || fs.existsSync(transactionBuilderFile)) && overwrite !== "YES") {
  issue(
    "OVERWRITE_DEX_LIQUIDITY_SAFE_PAYLOAD",
    "Liquidity Safe payload already exists. Set OVERWRITE_DEX_LIQUIDITY_SAFE_PAYLOAD=YES only if regenerating intentionally."
  );
}

const approvalStatus = readJson("public-docs/dex-liquidity-safe-payload-generation-approval-status.json");
const approvalRecord = readJson("reports/dex-liquidity-safe-payload-generation-approval/dex-liquidity-safe-payload-generation-approval-record.json");
const verificationStatus = readJson("public-docs/dex-liquidity-mint-calldata-verification-status.json");
const verification = readJson("reports/dex-liquidity-mint-calldata-verification/dex-liquidity-mint-calldata-verification.json");
const calldataStatus = readJson("public-docs/dex-liquidity-mint-calldata-status.json");
const calldata = readJson("reports/dex-liquidity-provision/payload/liquidity-mint-calldata.json");
const allowanceStatus = readJson("public-docs/dex-liquidity-token-approval-post-execution-allowances-status.json");
const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

requireStatus("approvalStatus.status", approvalStatus.status, "DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATION_APPROVED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("approvalRecord.status", approvalRecord.status, "DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATION_APPROVED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("verificationStatus.status", verificationStatus.status, "DEX_LIQUIDITY_MINT_CALLDATA_VERIFIED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("verification.status", verification.status, "DEX_LIQUIDITY_MINT_CALLDATA_VERIFIED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("calldataStatus.status", calldataStatus.status, "DEX_LIQUIDITY_MINT_CALLDATA_GENERATED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("calldata.status", calldata.status, "DEX_LIQUIDITY_MINT_CALLDATA_GENERATED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("allowanceStatus.status", allowanceStatus.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_POST_EXECUTION_ALLOWANCES_VERIFIED_APPROVALS_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
requireStatus("poolStatus.status", poolStatus.status, "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING");

if (approvalStatus.summary?.liquiditySafePayloadGenerationApproved !== true) {
  issue("approvalStatus.summary.liquiditySafePayloadGenerationApproved", "Safe payload generation approval must be recorded.");
}

if (approvalStatus.summary?.liquiditySafePayloadGenerated !== false || approvalStatus.summary?.liquidityAdded !== false) {
  issue("approvalStatus.summary.liquidityFlags", "Approval status must show no Safe payload and no liquidity.");
}

if (verificationStatus.summary?.liquidityMintCalldataVerified !== true || verificationStatus.summary?.calldataHashVerified !== true || verificationStatus.summary?.decodedMintParamsVerified !== true) {
  issue("verificationStatus.summary", "Mint calldata must be verified.");
}

if (verification.liveChecks?.token0?.balanceCoversDesired !== true || verification.liveChecks?.token0?.allowanceCoversDesired !== true) {
  issue("verification.liveChecks.token0", "Token0 balance and allowance must cover desired amount.");
}

if (verification.liveChecks?.token1?.balanceCoversDesired !== true || verification.liveChecks?.token1?.allowanceCoversDesired !== true) {
  issue("verification.liveChecks.token1", "Token1 balance and allowance must cover desired amount.");
}

if (!isAddress(calldata.liquiditySafeAddress) || !isAddress(calldata.nonfungiblePositionManager) || !isAddress(calldata.target)) {
  issue("calldata.addresses", "Liquidity Safe, NonfungiblePositionManager, and target must be valid.");
}

if (!sameAddress(calldata.target, calldata.nonfungiblePositionManager)) {
  issue("calldata.target", "Calldata target must equal NonfungiblePositionManager.");
}

if (!sameAddress(calldata.liquiditySafeAddress, verification.liquiditySafeAddress)) {
  issue("calldata.liquiditySafeAddress", "Calldata liquidity Safe must match verification record.");
}

if (!sameAddress(calldata.nonfungiblePositionManager, verification.nonfungiblePositionManager)) {
  issue("calldata.nonfungiblePositionManager", "Calldata NonfungiblePositionManager must match verification record.");
}

if (calldata.calldataHash !== verification.calldataHash || sha256Hex(calldata.calldata) !== calldata.calldataHash) {
  issue("calldata.calldataHash", "Calldata hash must match verification record and recomputed hash.");
}

if (calldata.functionSelector !== "0x88316456" || !String(calldata.calldata || "").startsWith("0x88316456")) {
  issue("calldata.functionSelector", "Calldata must be Uniswap V3 mint calldata.");
}

if (String(calldata.value) !== "0" || calldata.operation !== "CALL" || calldata.operationValue !== 0) {
  issue("calldata.call", "Calldata must be CALL with value 0.");
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
    issue(file, "Forbidden submission/live/liquidity/public-trading artifact exists. Safe payload generation must not submit or add liquidity.");
  }
}

if (issues.length > 0) {
  console.log(JSON.stringify({
    schema: "astra-dex-liquidity-safe-payload-generation-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_LIQUIDITY_SAFE_PAYLOAD_NOT_GENERATED",
    issues
  }, null, 2));
  process.exit(1);
}

fs.mkdirSync(payloadDir, { recursive: true });
fs.mkdirSync(reportDir, { recursive: true });

const generatedAt = new Date().toISOString();

const transaction = {
  id: "dex-liquidity-mint",
  description: "Uniswap V3 NonfungiblePositionManager.mint for ASTRA/USDC liquidity position",
  to: calldata.target,
  value: "0",
  data: calldata.calldata,
  dataHash: sha256Hex(calldata.calldata),
  operation: "CALL",
  operationValue: 0,
  functionSelector: calldata.functionSelector,
  functionSignature: calldata.functionSignature,
  mintParams: calldata.mintParams
};

const transactionBuilderBase = {
  version: "1.0",
  chainId: "8453",
  createdAt: generatedAt,
  meta: {
    name: "AstraTreasury DEX Liquidity Mint",
    description: "Review-only Transaction Builder JSON for Uniswap V3 liquidity mint. Do not execute until later approved milestones.",
    txBuilderVersion: "safe-ui-compatible-data-only-v0.1",
    createdFrom: "reports/dex-liquidity-provision/payload/liquidity-mint-calldata.json"
  },
  transactions: [
    {
      to: transaction.to,
      value: transaction.value,
      data: transaction.data
    }
  ]
};

const transactionBuilderHash = sha256Json(transactionBuilderBase);
const transactionBuilder = {
  ...transactionBuilderBase,
  transactionBuilderHash
};

const payloadBase = {
  schema: "astra-dex-liquidity-safe-payload-v0.1",
  generatedAt,
  status: "DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING",
  chainId: 8453,
  network: "Base Mainnet",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  dexVenue: "Uniswap on Base",
  safeAddress: calldata.liquiditySafeAddress,
  liquiditySafeAddress: calldata.liquiditySafeAddress,
  transactionCount: 1,
  transactions: [transaction],
  transactionBuilderReference: "reports/dex-liquidity-provision/payload/liquidity-safe-transaction-builder.json",
  transactionBuilderHash,
  calldataReference: "reports/dex-liquidity-provision/payload/liquidity-mint-calldata.json",
  calldataVerificationReference: "public-docs/dex-liquidity-mint-calldata-verification-status.json",
  calldataHash: calldata.calldataHash,
  calldataArtifactHash: calldata.calldataArtifactHash,
  nonfungiblePositionManager: calldata.nonfungiblePositionManager,
  poolAddress: calldata.poolAddress,
  mintParams: calldata.mintParams,
  readinessChecks: {
    liquiditySafePayloadGenerationApprovalRecorded: true,
    liquidityMintCalldataGenerated: true,
    liquidityMintCalldataVerified: true,
    tokenApprovalExecuted: true,
    liveBalancesVerified: true,
    liveAllowancesVerified: true,
    poolLiquidityStillZero: true
  },
  flags: {
    liquiditySafePayloadGenerated: true,
    liquiditySafePayloadVerified: false,
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
    generatedSafePayloadOnly: true,
    submitsLiquiditySafeTransaction: false,
    executesLiquiditySafeTransaction: false,
    addsLiquidity: false,
    mintsPositionOnchain: false,
    activatesBuyPage: false,
    approvesPublicTrading: false,
    approvesFullLaunch: false
  }
};

const safePayloadHash = sha256Json(payloadBase);
const safePayload = {
  ...payloadBase,
  safePayloadHash
};

writeJson(transactionBuilderFile, transactionBuilder);
writeJson(safePayloadFile, safePayload);

const generationReport = {
  schema: "astra-dex-liquidity-safe-payload-generation-report-v0.1",
  generatedAt,
  status: safePayload.status,
  safePayloadFile: "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  transactionBuilderFile: "reports/dex-liquidity-provision/payload/liquidity-safe-transaction-builder.json",
  safePayloadHash,
  transactionBuilderHash,
  calldataHash: calldata.calldataHash,
  liquiditySafeAddress: calldata.liquiditySafeAddress,
  nonfungiblePositionManager: calldata.nonfungiblePositionManager,
  poolAddress: calldata.poolAddress,
  transactionCount: 1,
  liquiditySafePayloadGenerated: true,
  liquiditySafePayloadVerified: false,
  liquiditySafeTransactionSubmitted: false,
  liquiditySafeTransactionExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  fullLaunchApproved: false
};

writeJson(generationReportFile, generationReport);

const config = readJsonPath(configFile);

config.status = "liquidity-safe-payload-generated-not-submitted-not-executed-no-liquidity-no-public-trading";
config.liquiditySafePayloadGenerated = true;
config.liquiditySafePayloadVerified = false;
config.liquiditySafeTransactionSubmitted = false;
config.liquiditySafeTransactionExecuted = false;
config.liquidityAdded = false;
config.positionMinted = false;
config.publicTradingApproved = false;
config.publicTradingLinkApproved = false;
config.buyPageActivationApproved = false;
config.fullLaunchApproved = false;
config.generatedLiquiditySafePayload = {
  generatedAt,
  safePayloadFile: "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  transactionBuilderFile: "reports/dex-liquidity-provision/payload/liquidity-safe-transaction-builder.json",
  safePayloadHash,
  transactionBuilderHash,
  liquiditySafeAddress: calldata.liquiditySafeAddress,
  nonfungiblePositionManager: calldata.nonfungiblePositionManager,
  calldataHash: calldata.calldataHash
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-safe-payload-generation-result-v0.1",
  checkedAt: generatedAt,
  status: safePayload.status,
  safePayloadFile: "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  transactionBuilderFile: "reports/dex-liquidity-provision/payload/liquidity-safe-transaction-builder.json",
  safePayloadHash,
  transactionBuilderHash,
  calldataHash: calldata.calldataHash,
  liquiditySafeAddress: calldata.liquiditySafeAddress,
  nonfungiblePositionManager: calldata.nonfungiblePositionManager,
  transactionCount: 1,
  liquiditySafePayloadGenerated: true,
  liquiditySafeTransactionSubmitted: false,
  liquiditySafeTransactionExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  fullLaunchApproved: false
}, null, 2));
