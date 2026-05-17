import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const safePayloadRelativePath = "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json";
const transactionBuilderRelativePath = "reports/dex-liquidity-provision/payload/liquidity-safe-transaction-builder.json";
const generationReportRelativePath = "reports/dex-liquidity-safe-payload/dex-liquidity-safe-payload-generation.json";

const requiredFiles = [
  "configs/dex-liquidity-safe-payload.config.json",
  "docs/dex-liquidity-safe-payload/DEX_LIQUIDITY_SAFE_PAYLOAD.md",
  "docs/dex-liquidity-safe-payload/DEX_LIQUIDITY_SAFE_PAYLOAD_CHECKLIST.md",
  "docs/dex-liquidity-safe-payload/DEX_LIQUIDITY_SAFE_PAYLOAD_BOUNDARIES.md",
  "docs/dex-liquidity-safe-payload/DEX_LIQUIDITY_SAFE_PAYLOAD_RUNBOOK.md",
  "scripts/generate-dex-liquidity-safe-payload.mjs",
  safePayloadRelativePath,
  transactionBuilderRelativePath,
  generationReportRelativePath,
  "public-docs/dex-liquidity-safe-payload-generation-approval-status.json",
  "reports/dex-liquidity-safe-payload-generation-approval/dex-liquidity-safe-payload-generation-approval-record.json",
  "public-docs/dex-liquidity-mint-calldata-verification-status.json",
  "reports/dex-liquidity-mint-calldata-verification/dex-liquidity-mint-calldata-verification.json",
  "reports/dex-liquidity-provision/payload/liquidity-mint-calldata.json",
  "public-docs/dex-pool-creation-post-execution-verification-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/mainnet-execution-status.json"
];

const forbiddenFiles = [
  "reports/dex-liquidity-safe-submission-live/dex-liquidity-safe-submission-live-record.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "public-docs/dex-liquidity-added-status.json",
  "public-docs/dex-public-trading-live-status.json"
];

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
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

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required liquidity Safe payload generation file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden liquidity submission/live/liquidity/public-trading artifact exists. Safe payload generation must not submit or add liquidity.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-safe-payload.config.json");
  const payload = readJson(safePayloadRelativePath);
  const builder = readJson(transactionBuilderRelativePath);
  const generationReport = readJson(generationReportRelativePath);
  const approvalStatus = readJson("public-docs/dex-liquidity-safe-payload-generation-approval-status.json");
  const verificationStatus = readJson("public-docs/dex-liquidity-mint-calldata-verification-status.json");
  const verification = readJson("reports/dex-liquidity-mint-calldata-verification/dex-liquidity-mint-calldata-verification.json");
  const calldata = readJson("reports/dex-liquidity-provision/payload/liquidity-mint-calldata.json");
  const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.generationOnly !== true) {
    issue("config.generationOnly", "Config must be generation-only.");
  }

  if (config.liquiditySafePayloadGenerated !== true) {
    issue("config.liquiditySafePayloadGenerated", "Config must show Safe payload generated.");
  }

  if (payload.schema !== "astra-dex-liquidity-safe-payload-v0.1") {
    issue("payload.schema", "Invalid liquidity Safe payload schema.");
  }

  if (payload.status !== "DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NOT_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("payload.status", `Unexpected payload status: ${payload.status}`);
  }

  const { safePayloadHash, ...payloadBase } = payload;
  const recomputedPayloadHash = sha256Json(payloadBase);

  if (safePayloadHash !== recomputedPayloadHash) {
    issue("payload.safePayloadHash", "Safe payload hash must match recomputed hash.");
  }

  const { transactionBuilderHash, ...builderBase } = builder;
  const recomputedBuilderHash = sha256Json(builderBase);

  if (transactionBuilderHash !== recomputedBuilderHash) {
    issue("builder.transactionBuilderHash", "Transaction Builder hash must match recomputed hash.");
  }

  if (payload.transactionBuilderHash !== builder.transactionBuilderHash) {
    issue("payload.transactionBuilderHash", "Payload Transaction Builder hash must match builder file.");
  }

  if (!isAddress(payload.safeAddress) || !isAddress(payload.liquiditySafeAddress)) {
    issue("payload.safeAddress", "Payload Safe address must be valid.");
  }

  if (!sameAddress(payload.safeAddress, payload.liquiditySafeAddress)) {
    issue("payload.safeAddress", "safeAddress must equal liquiditySafeAddress.");
  }

  if (!isAddress(payload.nonfungiblePositionManager)) {
    issue("payload.nonfungiblePositionManager", "NonfungiblePositionManager must be valid.");
  }

  if (!Array.isArray(payload.transactions) || payload.transactions.length !== 1) {
    issue("payload.transactions", "Payload must contain exactly one transaction.");
  }

  const tx = payload.transactions?.[0] || {};
  const builderTx = builder.transactions?.[0] || {};

  if (!isAddress(tx.to) || !sameAddress(tx.to, payload.nonfungiblePositionManager)) {
    issue("payload.transactions.0.to", "Transaction target must be NonfungiblePositionManager.");
  }

  if (String(tx.value) !== "0" || tx.operation !== "CALL" || tx.operationValue !== 0) {
    issue("payload.transactions.0.call", "Transaction must be CALL with value 0.");
  }

  if (!String(tx.data || "").startsWith("0x88316456")) {
    issue("payload.transactions.0.data", "Transaction data must be mint calldata.");
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

  if (!sameAddress(payload.liquiditySafeAddress, verification.liquiditySafeAddress)) {
    issue("payload.liquiditySafeAddress", "Payload liquidity Safe must match verification.");
  }

  if (!sameAddress(payload.nonfungiblePositionManager, verification.nonfungiblePositionManager)) {
    issue("payload.nonfungiblePositionManager", "Payload target must match verified NonfungiblePositionManager.");
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

  if (approvalStatus.status !== "DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATION_APPROVED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("approvalStatus.status", "Safe payload generation approval must be recorded.");
  }

  if (verificationStatus.status !== "DEX_LIQUIDITY_MINT_CALLDATA_VERIFIED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("verificationStatus.status", "Calldata verification must be complete.");
  }

  if (verification.liquidityMintCalldataVerified !== true) {
    issue("verification.liquidityMintCalldataVerified", "Calldata verification record must show verified.");
  }

  if (poolStatus.status !== "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("poolStatus.status", "Pool must remain no-liquidity/no-public-trading.");
  }

  if (poolStatus.summary?.liquidityVerifiedZero !== true || String(poolStatus.summary?.poolLiquidity || "") !== "0") {
    issue("poolStatus.summary.poolLiquidity", "Pool liquidity must remain zero.");
  }

  if (generationReport.status !== payload.status || generationReport.safePayloadHash !== payload.safePayloadHash || generationReport.transactionBuilderHash !== builder.transactionBuilderHash) {
    issue("generationReport", "Generation report must match payload and Transaction Builder hashes.");
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

  if (execution.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED") {
    issue("execution.mode", "Mainnet execution queue must remain disabled.");
  }
}

const result = {
  schema: "astra-dex-liquidity-safe-payload-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  safePayloadFile: safePayloadRelativePath,
  transactionBuilderFile: transactionBuilderRelativePath,
  generationReportFile: generationReportRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
