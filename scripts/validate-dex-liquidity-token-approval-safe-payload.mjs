import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const payloadRelativePath = "reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json";
const transactionBuilderRelativePath = "reports/dex-liquidity-token-approval/payload/token-approval-safe-transaction-builder.json";
const generationReportRelativePath = "reports/dex-liquidity-token-approval-safe-payload/dex-liquidity-token-approval-safe-payload-generation.json";

const requiredFiles = [
  "configs/dex-liquidity-token-approval-safe-payload.config.json",
  "docs/dex-liquidity-token-approval-safe-payload/DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD.md",
  "docs/dex-liquidity-token-approval-safe-payload/DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_CHECKLIST.md",
  "docs/dex-liquidity-token-approval-safe-payload/DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_BOUNDARIES.md",
  "docs/dex-liquidity-token-approval-safe-payload/DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_RUNBOOK.md",
  "scripts/generate-dex-liquidity-token-approval-safe-payload.mjs",
  payloadRelativePath,
  transactionBuilderRelativePath,
  generationReportRelativePath,
  "public-docs/dex-liquidity-token-approval-payload-generation-approval-status.json",
  "reports/dex-liquidity-token-approval-payload-generation-approval/dex-liquidity-token-approval-payload-generation-approval-record.json",
  "public-docs/dex-liquidity-token-approval-requirements-recheck-status.json",
  "reports/dex-liquidity-token-approval-requirements-recheck/dex-liquidity-token-approval-requirements-recheck.json",
  "public-docs/dex-liquidity-funding-transfer-post-execution-balances-status.json",
  "public-docs/dex-pool-creation-post-execution-verification-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/mainnet-execution-status.json"
];

const forbiddenFiles = [
  "reports/dex-liquidity-token-approval/live/token-approval-executed.json",
  "reports/dex-liquidity-provision/payload/token-approval-safe-payload.json",
  "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
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

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || "").trim());
}

function isZeroAddress(value) {
  return String(value || "").toLowerCase() === "0x0000000000000000000000000000000000000000";
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required token approval Safe payload file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden token-approval-live/liquidity/public-trading artifact exists. Payload generation must not execute approvals or add liquidity.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-token-approval-safe-payload.config.json");
  const payload = readJson(payloadRelativePath);
  const transactionBuilder = readJson(transactionBuilderRelativePath);
  const generationReport = readJson(generationReportRelativePath);
  const approvalStatus = readJson("public-docs/dex-liquidity-token-approval-payload-generation-approval-status.json");
  const recheckStatus = readJson("public-docs/dex-liquidity-token-approval-requirements-recheck-status.json");
  const postBalances = readJson("public-docs/dex-liquidity-funding-transfer-post-execution-balances-status.json");
  const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.payloadGenerationOnly !== true) {
    issue("config.payloadGenerationOnly", "Config must be payload-generation-only.");
  }

  if (config.tokenApprovalSafePayloadGenerated !== true || config.tokenApprovalTransactionBuilderGenerated !== true) {
    issue("config.payloadFlags", "Config must show Safe payload and Transaction Builder generated.");
  }

  if (payload.schema !== "astra-dex-liquidity-token-approval-safe-payload-v0.1") {
    issue("payload.schema", "Invalid token approval payload schema.");
  }

  if (payload.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_SAFE_PAYLOAD_GENERATED_NOT_SUBMITTED_NO_APPROVALS_EXECUTED_NO_LIQUIDITY") {
    issue("payload.status", `Unexpected payload status: ${payload.status}`);
  }

  if (!isAddress(payload.liquiditySafeAddress) || isZeroAddress(payload.liquiditySafeAddress)) {
    issue("payload.liquiditySafeAddress", "Liquidity Safe address must be valid.");
  }

  if (!isAddress(payload.approvalSpender) || isZeroAddress(payload.approvalSpender)) {
    issue("payload.approvalSpender", "Approval spender must be valid.");
  }

  if (!Array.isArray(payload.transactions) || payload.transactions.length <= 0) {
    issue("payload.transactions", "Payload transactions must be present.");
  }

  for (const tx of payload.transactions || []) {
    if (!isAddress(tx.to) || !isAddress(tx.tokenAddress)) {
      issue(`payload.transactions.${tx.id}.to`, "Transaction target/token must be valid.");
    }

    if (String(tx.value) !== "0") {
      issue(`payload.transactions.${tx.id}.value`, "ERC-20 approve transaction value must be zero.");
    }

    if (tx.operation !== "CALL" || tx.operationValue !== 0) {
      issue(`payload.transactions.${tx.id}.operation`, "Operation must be CALL / 0.");
    }

    if (!String(tx.data || "").startsWith("0x095ea7b3")) {
      issue(`payload.transactions.${tx.id}.data`, "Approval calldata must use ERC-20 approve selector.");
    }

    if (!isAddress(tx.approvalSpender)) {
      issue(`payload.transactions.${tx.id}.approvalSpender`, "Approval spender must be valid.");
    }

    if (tx.tokenApprovalSafeTransactionSubmitted !== false || tx.tokenApprovalExecuted !== false) {
      issue(`payload.transactions.${tx.id}.flags`, "Submitted/executed flags must remain false.");
    }
  }

  if (!payload.payloadHash || typeof payload.payloadHash !== "string") {
    issue("payload.payloadHash", "Payload hash must be present.");
  }

  if (!Array.isArray(transactionBuilder.transactions) || transactionBuilder.transactions.length !== payload.transactions.length) {
    issue("transactionBuilder.transactions", "Transaction Builder transaction count must match payload.");
  }

  for (const key of [
    "tokenApprovalSafeTransactionSubmitted",
    "tokenApprovalSafeTransactionExecuted",
    "tokenApprovalExecuted",
    "liquidityMintCalldataGenerated",
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
    if (payload.flags?.[key] !== false) {
      issue(`payload.flags.${key}`, `${key} must remain false.`);
    }
  }

  if (approvalStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_GENERATION_APPROVED_NO_PAYLOAD_NO_APPROVALS_EXECUTED") {
    issue("approvalStatus.status", "Payload generation approval must be recorded.");
  }

  if (recheckStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_RECHECK_COMPLETE_APPROVALS_REQUIRED_NO_APPROVALS_EXECUTED") {
    issue("recheckStatus.status", "Approval requirements recheck must show approvals required.");
  }

  if (postBalances.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_POST_EXECUTION_BALANCES_VERIFIED_FUNDS_MOVED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("postBalances.status", "Post-execution balances must be verified.");
  }

  if (poolStatus.status !== "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("poolStatus.status", "Pool must remain no-liquidity/no-public-trading.");
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

  if (execution.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED") {
    issue("execution.mode", "Mainnet execution queue must remain disabled.");
  }

  if (generationReport.status !== payload.status || generationReport.payloadHash !== payload.payloadHash) {
    issue("generationReport", "Generation report must match payload status and hash.");
  }
}

const result = {
  schema: "astra-dex-liquidity-token-approval-safe-payload-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  payloadFile: payloadRelativePath,
  transactionBuilderFile: transactionBuilderRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
