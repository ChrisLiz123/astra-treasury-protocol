import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const confirm = process.env.DEX_SAFE_PAYLOAD_GENERATION_CONFIRM || "";
const overwrite = process.env.OVERWRITE_DEX_SAFE_PAYLOAD || "";

const requiredConfirm = "GENERATE_DEX_POOL_CREATION_SAFE_PAYLOAD_ONLY_NO_EXECUTION";

const outputDir = path.join(root, "reports", "dex-pool-creation-safe-payload-generation", "generated");
const payloadFile = path.join(outputDir, "dex-pool-creation-safe-payload.json");
const resultFile = path.join(root, "reports", "dex-pool-creation-safe-payload-generation", "dex-pool-creation-safe-payload-generation-result.json");

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function sha256Json(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value, null, 2) + "\n").digest("hex");
}

function normalizeAddress(value) {
  return String(value || "").trim();
}

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || "").trim());
}

function sameAddress(a, b) {
  return normalizeAddress(a).toLowerCase() === normalizeAddress(b).toLowerCase();
}

function encodeAddress(value) {
  const address = normalizeAddress(value);

  if (!isAddress(address)) {
    throw new Error(`Invalid address: ${value}`);
  }

  return address.replace(/^0x/i, "").toLowerCase().padStart(64, "0");
}

function encodeUint(value, bits, label) {
  const n = BigInt(String(value));

  if (n < 0n) {
    throw new Error(`${label} cannot be negative.`);
  }

  const max = (1n << BigInt(bits)) - 1n;

  if (n > max) {
    throw new Error(`${label} exceeds uint${bits}.`);
  }

  return n.toString(16).padStart(64, "0");
}

function parseFee(value) {
  const raw = String(value || "").trim();

  if (/^\d+$/.test(raw)) {
    return Number(raw);
  }

  const compact = raw.toLowerCase().replace(/\s+/g, "");

  if (compact.includes("0.01%") || compact.includes("0.01percent")) return 100;
  if (compact.includes("0.05%") || compact.includes("0.05percent")) return 500;
  if (compact.includes("0.3%") || compact.includes("0.30%") || compact.includes("0.3percent") || compact.includes("0.30percent")) return 3000;
  if (compact.includes("1%") || compact.includes("1.0%") || compact.includes("1percent")) return 10000;

  return null;
}

function requireStatus(name, value, expected) {
  if (value !== expected) {
    issue(name, `Expected ${expected}, got ${value || "UNKNOWN"}.`);
  }
}

if (confirm !== requiredConfirm) {
  issue("DEX_SAFE_PAYLOAD_GENERATION_CONFIRM", `Must equal ${requiredConfirm}.`);
}

if (fs.existsSync(payloadFile) && overwrite !== "YES") {
  issue("OVERWRITE_DEX_SAFE_PAYLOAD", "Payload already exists. Set OVERWRITE_DEX_SAFE_PAYLOAD=YES only if regenerating intentionally after review.");
}

const approval = readJson("public-docs/dex-pool-creation-safe-payload-generation-approval-status.json");
const safeOwners = readJson("public-docs/dex-pool-creation-safe-owners-threshold-status.json");
const factoryRouterPublic = readJson("public-docs/dex-pool-creation-factory-router-review-status.json");
const factoryRouter = readJson("reports/dex-pool-creation-factory-router-review/dex-pool-creation-factory-router-review.json");
const sqrtReviewPublic = readJson("public-docs/dex-pool-creation-token-ordering-sqrtprice-status.json");
const sqrtReview = readJson("reports/dex-pool-creation-token-ordering-sqrtprice/dex-pool-creation-token-ordering-sqrtprice-review.json");
const draftReview = readJson("public-docs/dex-pool-creation-safe-payload-draft-review-status.json");
const draftStatus = readJson("public-docs/dex-pool-creation-safe-payload-draft-status.json");
const preparation = readJson("public-docs/dex-pool-creation-safe-payload-preparation-status.json");
const executionPrecheck = readJson("public-docs/dex-pool-creation-execution-precheck-status.json");
const poolCreationApproval = readJson("public-docs/dex-pool-creation-approval-status.json");
const precheck = readJson("public-docs/dex-pool-existence-precheck-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const safeTx = readJson("public-docs/treasury-safe-transaction-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

requireStatus("approval.status", approval.status, "DEX_POOL_CREATION_SAFE_PAYLOAD_GENERATION_APPROVED_NO_PAYLOAD_GENERATED");
requireStatus("safeOwners.status", safeOwners.status, "DEX_POOL_CREATION_SAFE_OWNERS_THRESHOLD_REVIEW_COMPLETE_NO_PAYLOAD_GENERATED");
requireStatus("factoryRouter.status", factoryRouterPublic.status, "DEX_POOL_CREATION_FACTORY_ROUTER_EXECUTION_PATH_REVIEW_COMPLETE_NO_PAYLOAD_GENERATED");
requireStatus("sqrtReview.status", sqrtReviewPublic.status, "DEX_POOL_CREATION_TOKEN_ORDERING_SQRTPRICEX96_REVIEW_COMPLETE_NO_PAYLOAD_GENERATED");
requireStatus("draftReview.status", draftReview.status, "DEX_POOL_CREATION_SAFE_PAYLOAD_DRAFT_REVIEW_READY_FOR_SQRTPRICEX96_REVIEW_NO_PAYLOAD_GENERATED");
requireStatus("draftStatus.status", draftStatus.status, "DEX_POOL_CREATION_SAFE_PAYLOAD_DRAFT_READY_NO_PAYLOAD_GENERATED");
requireStatus("preparation.status", preparation.status, "DEX_POOL_CREATION_SAFE_PAYLOAD_PREPARATION_READY_NO_PAYLOAD_GENERATED");
requireStatus("executionPrecheck.status", executionPrecheck.status, "DEX_POOL_CREATION_EXECUTION_PRECHECK_READY_FOR_SAFE_PAYLOAD_PREPARATION_NO_POOL_CREATED");
requireStatus("poolCreationApproval.status", poolCreationApproval.status, "DEX_POOL_CREATION_APPROVED_NO_POOL_CREATED");

if (precheck.status !== "DEX_POOL_EXISTENCE_FACTORY_PRECHECK_COMPLETE_NO_POOL_FOUND" || precheck.summary?.poolExists !== false) {
  issue("precheck.status", "Fresh pool existence precheck must show NO_POOL_FOUND.");
}

if (fullLaunch.fullLaunchApproved !== false) {
  issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
}

if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
  issue("treasuryFunding", "Treasury funding must remain not approved and not executed.");
}

if (safeTx.safeTransactionPayloadGenerated !== false || safeTx.safeTransactionPrepared !== false) {
  issue("safeTx", "Existing Safe transaction status must remain not generated/not prepared before this payload generation.");
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
  "reports/dex-pool-creation/live/dex-pool-created.json",
  "reports/dex-pool-creation/live/pool-created.json",
  "reports/dex-pool-creation/direct/direct-execution-submitted.json",
  "public-docs/dex-pool-created-status.json"
];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden execution/live artifact exists. Payload generation must not execute or create a pool.");
  }
}

const targetAddress = normalizeAddress(factoryRouter.intendedExecutionPath?.targetAddress || factoryRouterPublic.summary?.targetAddress);
const functionSignature = factoryRouter.intendedExecutionPath?.functionSignature || factoryRouterPublic.summary?.functionSignature || "";
const functionSelector = "0x13ead562";
const operation = "CALL";
const operationValue = 0;
const value = "0";
const safeAddress = normalizeAddress(safeOwners.summary?.safeAddress || safeOwners.safeOwnersThresholdReview?.safeReview?.safeAddress || "");

const token0 = sqrtReview.tokenOrderingReview?.token0 || {};
const token1 = sqrtReview.tokenOrderingReview?.token1 || {};
const fee = factoryRouter.selectedInputsForLaterPayloadGeneration?.fee || parseFee(sqrtReview.feeTierOrPoolType);
const sqrtPriceX96 = sqrtReview.sqrtPriceX96Review?.sqrtPriceX96 || sqrtReviewPublic.summary?.sqrtPriceX96 || "";

if (!isAddress(targetAddress)) {
  issue("targetAddress", "Target address must be a valid address.");
}

if (!isAddress(safeAddress)) {
  issue("safeAddress", "Safe address must be a valid address.");
}

if (!isAddress(token0.address)) {
  issue("token0.address", "token0 address must be valid.");
}

if (!isAddress(token1.address)) {
  issue("token1.address", "token1 address must be valid.");
}

if (!fee || !Number.isInteger(Number(fee))) {
  issue("fee", "Fee must be a valid integer.");
}

if (!/^\d+$/.test(String(sqrtPriceX96)) || BigInt(String(sqrtPriceX96 || "0")) <= 0n) {
  issue("sqrtPriceX96", "sqrtPriceX96 must be a positive decimal integer.");
}

if (functionSignature !== "createAndInitializePoolIfNecessary(address,address,uint24,uint160)") {
  issue("functionSignature", "Unexpected function signature.");
}

if (issues.length > 0) {
  const result = {
    schema: "astra-dex-pool-creation-safe-payload-generation-result-v0.1",
    generatedAt: new Date().toISOString(),
    status: "STOP_DEX_SAFE_PAYLOAD_NOT_GENERATED",
    issues
  };

  fs.mkdirSync(outputDir, { recursive: true });
  writeJson(resultFile, result);
  console.log(JSON.stringify(result, null, 2));
  process.exit(1);
}

const calldata =
  functionSelector +
  encodeAddress(token0.address) +
  encodeAddress(token1.address) +
  encodeUint(fee, 24, "fee") +
  encodeUint(sqrtPriceX96, 160, "sqrtPriceX96");

const safePayload = {
  schema: "astra-dex-pool-creation-safe-payload-v0.1",
  generatedAt: new Date().toISOString(),
  status: "DEX_POOL_CREATION_SAFE_PAYLOAD_GENERATED_NOT_EXECUTED",
  currentApprovedMode: "restricted-mainnet-operation",
  network: {
    name: "Base Mainnet",
    chainId: 8453
  },
  safeAddress,
  approvalReference: "public-docs/dex-pool-creation-safe-payload-generation-approval-status.json",
  transaction: {
    to: targetAddress,
    value,
    data: calldata,
    operation,
    operationValue,
    functionSelector,
    functionSignature,
    functionName: "createAndInitializePoolIfNecessary",
    parameters: {
      token0: token0.address,
      token0Symbol: token0.symbol || "",
      token1: token1.address,
      token1Symbol: token1.symbol || "",
      fee: Number(fee),
      sqrtPriceX96: String(sqrtPriceX96)
    }
  },
  reviewReferences: {
    safeOwnersThreshold: "public-docs/dex-pool-creation-safe-owners-threshold-status.json",
    factoryRouter: "public-docs/dex-pool-creation-factory-router-review-status.json",
    sqrtPriceX96: "public-docs/dex-pool-creation-token-ordering-sqrtprice-status.json",
    safePayloadGenerationApproval: "public-docs/dex-pool-creation-safe-payload-generation-approval-status.json",
    freshNoPoolRecheck: "public-docs/dex-pool-existence-precheck-status.json"
  },
  flags: {
    encodedCallDataGenerated: true,
    safePayloadGenerated: true,
    safeTransactionPrepared: false,
    safeTransactionSubmitted: false,
    safeTransactionExecuted: false,
    poolCreated: false,
    liquidityAdded: false,
    fundsMoved: false,
    publicTradingApproved: false,
    buyPageActivated: false,
    fullLaunchApproved: false
  },
  safety: {
    localFileOnly: true,
    submittedToSafe: false,
    queuedInSafe: false,
    sendsTransactions: false,
    movesFunds: false,
    createsLiquidityPoolByThisScript: false,
    addsLiquidity: false,
    enablesPublicTrading: false,
    preparesSafeTransaction: false,
    executesSafeTransaction: false,
    activatesBuyPage: false,
    approvesFullLaunch: false
  }
};

safePayload.payloadHash = sha256Json(safePayload);

fs.mkdirSync(outputDir, { recursive: true });
writeJson(payloadFile, safePayload);

const result = {
  schema: "astra-dex-pool-creation-safe-payload-generation-result-v0.1",
  generatedAt: safePayload.generatedAt,
  status: "DEX_POOL_CREATION_SAFE_PAYLOAD_GENERATED_NOT_EXECUTED",
  payloadFile: "reports/dex-pool-creation-safe-payload-generation/generated/dex-pool-creation-safe-payload.json",
  payloadHash: safePayload.payloadHash,
  safeAddress,
  targetAddress,
  functionSelector,
  functionSignature,
  calldataBytes: (calldata.length - 2) / 2,
  encodedCallDataGenerated: true,
  safePayloadGenerated: true,
  safeTransactionPrepared: false,
  safeTransactionSubmitted: false,
  safeTransactionExecuted: false,
  poolCreated: false,
  liquidityAdded: false,
  movesFunds: false,
  approvesPublicTrading: false,
  approvesFullLaunch: false,
  issues: []
};

writeJson(resultFile, result);

console.log(JSON.stringify(result, null, 2));
