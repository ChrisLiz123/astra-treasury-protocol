import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const payloadRelativePath = "reports/dex-pool-creation-safe-payload-generation/generated/dex-pool-creation-safe-payload.json";
const payloadPath = path.join(root, payloadRelativePath);
const resultRelativePath = "reports/dex-pool-creation-safe-payload-generation/dex-pool-creation-safe-payload-generation-result.json";

const requiredFiles = [
  "configs/dex-pool-creation-safe-payload-generation.config.json",
  "docs/dex-pool-creation-safe-payload-generation/DEX_POOL_CREATION_SAFE_PAYLOAD_GENERATION.md",
  "docs/dex-pool-creation-safe-payload-generation/DEX_POOL_CREATION_SAFE_PAYLOAD_GENERATION_CHECKLIST.md",
  "docs/dex-pool-creation-safe-payload-generation/DEX_POOL_CREATION_SAFE_PAYLOAD_GENERATION_BOUNDARIES.md",
  "docs/dex-pool-creation-safe-payload-generation/DEX_POOL_CREATION_SAFE_PAYLOAD_GENERATION_RUNBOOK.md",
  "scripts/generate-dex-pool-creation-safe-payload.mjs",
  payloadRelativePath,
  resultRelativePath,
  "public-docs/dex-pool-creation-safe-payload-generation-approval-status.json",
  "public-docs/dex-pool-creation-safe-owners-threshold-status.json",
  "public-docs/dex-pool-creation-factory-router-review-status.json",
  "public-docs/dex-pool-creation-token-ordering-sqrtprice-status.json",
  "public-docs/dex-pool-existence-precheck-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/treasury-safe-transaction-status.json",
  "public-docs/mainnet-monitor-status.json",
  "public-docs/mainnet-alerts-status.json",
  "public-docs/incident-summary.json",
  "public-docs/mainnet-execution-status.json"
];

const forbiddenFiles = [
  "reports/dex-pool-creation/live/dex-pool-created.json",
  "reports/dex-pool-creation/live/pool-created.json",
  "reports/dex-pool-creation/direct/direct-execution-submitted.json",
  "public-docs/dex-pool-created-status.json"
];

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || "").trim());
}

function encodeAddress(value) {
  return String(value).replace(/^0x/i, "").toLowerCase().padStart(64, "0");
}

function encodeUint(value, bits, label) {
  const n = BigInt(String(value));
  const max = (1n << BigInt(bits)) - 1n;

  if (n < 0n || n > max) {
    throw new Error(`${label} out of uint${bits} range`);
  }

  return n.toString(16).padStart(64, "0");
}

function sha256JsonWithoutPayloadHash(value) {
  const copy = JSON.parse(JSON.stringify(value));
  delete copy.payloadHash;

  return crypto.createHash("sha256").update(JSON.stringify(copy, null, 2) + "\n").digest("hex");
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required Safe payload generation file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden execution/live artifact exists. Payload generation must not execute or create pool.");
  }
}

if (issues.length === 0) {
  const payload = readJson(payloadRelativePath);
  const result = readJson(resultRelativePath);
  const approval = readJson("public-docs/dex-pool-creation-safe-payload-generation-approval-status.json");
  const safeOwners = readJson("public-docs/dex-pool-creation-safe-owners-threshold-status.json");
  const factoryRouter = readJson("public-docs/dex-pool-creation-factory-router-review-status.json");
  const sqrtReview = readJson("public-docs/dex-pool-creation-token-ordering-sqrtprice-status.json");
  const precheck = readJson("public-docs/dex-pool-existence-precheck-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const safeTx = readJson("public-docs/treasury-safe-transaction-status.json");
  const monitor = readJson("public-docs/mainnet-monitor-status.json");
  const alerts = readJson("public-docs/mainnet-alerts-status.json");
  const incidents = readJson("public-docs/incident-summary.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (payload.schema !== "astra-dex-pool-creation-safe-payload-v0.1") {
    issue("payload.schema", "Invalid Safe payload schema.");
  }

  if (payload.status !== "DEX_POOL_CREATION_SAFE_PAYLOAD_GENERATED_NOT_EXECUTED") {
    issue("payload.status", "Unexpected payload status.");
  }

  if (!isAddress(payload.safeAddress)) {
    issue("payload.safeAddress", "Safe address must be valid.");
  }

  if (!isAddress(payload.transaction?.to)) {
    issue("payload.transaction.to", "Transaction target must be valid.");
  }

  if (payload.transaction?.value !== "0") {
    issue("payload.transaction.value", "Pool creation payload value must be 0.");
  }

  if (payload.transaction?.operation !== "CALL" || payload.transaction?.operationValue !== 0) {
    issue("payload.transaction.operation", "Operation must be CALL / 0.");
  }

  if (payload.transaction?.functionSelector !== "0x13ead562") {
    issue("payload.transaction.functionSelector", "Unexpected function selector.");
  }

  if (payload.transaction?.functionSignature !== "createAndInitializePoolIfNecessary(address,address,uint24,uint160)") {
    issue("payload.transaction.functionSignature", "Unexpected function signature.");
  }

  const params = payload.transaction?.parameters || {};
  const expectedData =
    "0x13ead562" +
    encodeAddress(params.token0) +
    encodeAddress(params.token1) +
    encodeUint(params.fee, 24, "fee") +
    encodeUint(params.sqrtPriceX96, 160, "sqrtPriceX96");

  if (payload.transaction?.data !== expectedData) {
    issue("payload.transaction.data", "Encoded calldata does not match expected ABI encoding.");
  }

  if (payload.transaction?.data?.length !== 266) {
    issue("payload.transaction.data", "Encoded calldata length should be 132 bytes including selector.");
  }

  if (payload.payloadHash !== sha256JsonWithoutPayloadHash(payload)) {
    issue("payload.payloadHash", "Payload hash does not match payload contents.");
  }

  for (const [key, expected] of Object.entries({
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
  })) {
    if (payload.flags?.[key] !== expected) {
      issue(`payload.flags.${key}`, `Expected ${expected}.`);
    }
  }

  if (payload.safety?.localFileOnly !== true || payload.safety?.submittedToSafe !== false || payload.safety?.executesSafeTransaction !== false) {
    issue("payload.safety", "Payload must remain local, unsubmitted, and unexecuted.");
  }

  if (result.status !== "DEX_POOL_CREATION_SAFE_PAYLOAD_GENERATED_NOT_EXECUTED") {
    issue("result.status", "Generation result status is unexpected.");
  }

  if (approval.status !== "DEX_POOL_CREATION_SAFE_PAYLOAD_GENERATION_APPROVED_NO_PAYLOAD_GENERATED") {
    issue("approval.status", "Payload generation approval must be recorded.");
  }

  if (safeOwners.status !== "DEX_POOL_CREATION_SAFE_OWNERS_THRESHOLD_REVIEW_COMPLETE_NO_PAYLOAD_GENERATED") {
    issue("safeOwners.status", "Safe owners and threshold review must be complete.");
  }

  if (factoryRouter.status !== "DEX_POOL_CREATION_FACTORY_ROUTER_EXECUTION_PATH_REVIEW_COMPLETE_NO_PAYLOAD_GENERATED") {
    issue("factoryRouter.status", "Factory/router review must be complete.");
  }

  if (sqrtReview.status !== "DEX_POOL_CREATION_TOKEN_ORDERING_SQRTPRICEX96_REVIEW_COMPLETE_NO_PAYLOAD_GENERATED") {
    issue("sqrtReview.status", "Token ordering and sqrtPriceX96 review must be complete.");
  }

  if (precheck.status !== "DEX_POOL_EXISTENCE_FACTORY_PRECHECK_COMPLETE_NO_POOL_FOUND" || precheck.summary?.poolExists !== false) {
    issue("precheck.status", "Fresh no-pool precheck must show no selected pool.");
  }

  if (fullLaunch.fullLaunchApproved !== false) {
    issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
  }

  if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
    issue("treasuryFunding", "Treasury funding must remain not approved and not executed.");
  }

  if (safeTx.safeTransactionPayloadGenerated !== false || safeTx.safeTransactionPrepared !== false) {
    issue("safeTx", "Existing treasury Safe transaction status must remain not prepared.");
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
}

const result = {
  schema: "astra-dex-pool-creation-safe-payload-generation-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  payloadFile: payloadRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
