import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const confirm = process.env.DEX_LIQUIDITY_PROVISION_APPROVAL_CONFIRM || "";
const approver = process.env.DEX_LIQUIDITY_PROVISION_APPROVER || "";
const approvalReference = process.env.DEX_LIQUIDITY_PROVISION_APPROVAL_REFERENCE || "";
const overwrite = process.env.OVERWRITE_DEX_LIQUIDITY_PROVISION_APPROVAL || "";

const requiredConfirm = "APPROVE_DEX_LIQUIDITY_PROVISION_PLANNING_ONLY";

const recordDir = path.join(root, "reports", "dex-liquidity-provision-approval");
const recordFile = path.join(recordDir, "dex-liquidity-provision-approval-record.json");
const configFile = path.join(root, "configs", "dex-liquidity-provision-approval.config.json");

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

function isPlaceholder(value) {
  const normalized = String(value || "").trim().toLowerCase();

  return (
    normalized.length === 0 ||
    normalized === "tbd" ||
    normalized.includes("tbd") ||
    normalized.includes("todo") ||
    normalized.includes("placeholder") ||
    normalized.includes("replace_with") ||
    normalized.includes("paste_") ||
    normalized === "yyyy-mm-ddthh:mm:ssz"
  );
}

function looksSensitive(value) {
  const normalized = String(value || "").toLowerCase();

  return (
    normalized.includes("private key") ||
    normalized.includes("seed phrase") ||
    normalized.includes("mnemonic") ||
    normalized.includes("password") ||
    normalized.includes("secret")
  );
}

function requireUsable(name, value) {
  if (isPlaceholder(value)) {
    issue(name, "Required value is missing or still a placeholder.");
  }

  if (looksSensitive(value)) {
    issue(name, "Value appears to contain sensitive material.");
  }
}

if (confirm !== requiredConfirm) {
  issue("DEX_LIQUIDITY_PROVISION_APPROVAL_CONFIRM", `Must equal ${requiredConfirm}.`);
}

requireUsable("DEX_LIQUIDITY_PROVISION_APPROVER", approver);
requireUsable("DEX_LIQUIDITY_PROVISION_APPROVAL_REFERENCE", approvalReference);

if (fs.existsSync(recordFile) && overwrite !== "YES") {
  issue(
    "OVERWRITE_DEX_LIQUIDITY_PROVISION_APPROVAL",
    "Approval record already exists. Set OVERWRITE_DEX_LIQUIDITY_PROVISION_APPROVAL=YES only if replacing intentionally."
  );
}

const postExecution = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const executionLive = readJson("public-docs/dex-pool-creation-safe-execution-live-status.json");
const poolCreated = readJson("reports/dex-pool-creation/live/dex-pool-created.json");
const parameterApproval = readJson("public-docs/dex-liquidity-parameter-approval-status.json");
const sourceSafeImpact = readJson("public-docs/dex-liquidity-source-safe-impact-status.json");
const parameterSelection = readJson("public-docs/dex-liquidity-parameter-selection-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

if (postExecution.status !== "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
  issue("postExecution.status", "Post-execution pool verification must be complete.");
}

if (postExecution.summary?.poolVerified !== true) {
  issue("postExecution.summary.poolVerified", "Pool must be verified.");
}

if (postExecution.summary?.liquidityVerifiedZero !== true || String(postExecution.summary?.poolLiquidity || "") !== "0") {
  issue("postExecution.summary.poolLiquidity", "Pool liquidity must be verified as zero.");
}

if (postExecution.summary?.liquidityAdded !== false || postExecution.summary?.fundsMoved !== false || postExecution.summary?.publicTradingApproved !== false) {
  issue("postExecution.summary", "Post-execution verification must show no liquidity, no funds moved, and no public trading.");
}

if (executionLive.status !== "DEX_POOL_CREATION_SAFE_EXECUTION_LIVE_RECORDED_POOL_CREATED_NO_LIQUIDITY") {
  issue("executionLive.status", "Safe execution live evidence must be recorded.");
}

if (poolCreated.status !== "DEX_POOL_CREATED_BY_SAFE_EXECUTION_NO_LIQUIDITY") {
  issue("poolCreated.status", "Pool-created evidence must show no liquidity.");
}

if (poolCreated.liquidityAdded !== false || poolCreated.publicTradingApproved !== false || poolCreated.fullLaunchApproved !== false) {
  issue("poolCreated.flags", "Pool-created evidence must show no liquidity, no public trading, and no full launch.");
}

if (parameterApproval.status !== "DEX_LIQUIDITY_PARAMETERS_APPROVED_NO_POOL_NO_LIQUIDITY") {
  issue("parameterApproval.status", "DEX liquidity parameters must be approved.");
}

if (sourceSafeImpact.status !== "DEX_LIQUIDITY_SOURCE_SAFE_IMPACT_APPROVED_NO_FUNDS_NO_SAFE_PAYLOAD") {
  issue("sourceSafeImpact.status", "DEX liquidity source/Safe-impact approval must be recorded.");
}

if (parameterSelection.status !== "DEX_LIQUIDITY_PARAMETER_SELECTION_IMPORTED_NOT_APPROVED" || parameterSelection.summary?.selectionValid !== true) {
  issue("parameterSelection.status", "Valid imported liquidity parameter selection is required.");
}

if (fullLaunch.fullLaunchApproved !== false) {
  issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
}

if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
  issue("treasuryFunding", "Treasury funding must remain not approved and not executed.");
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
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  "reports/dex-liquidity-provision/payload/token-approval-safe-payload.json",
  "public-docs/dex-liquidity-added-status.json",
  "public-docs/dex-public-trading-live-status.json"
];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden liquidity/public-trading artifact exists. Approval must not add liquidity or enable trading.");
  }
}

if (issues.length > 0) {
  console.log(JSON.stringify({
    schema: "astra-dex-liquidity-provision-approval-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_LIQUIDITY_PROVISION_NOT_APPROVED",
    issues
  }, null, 2));
  process.exit(1);
}

fs.mkdirSync(recordDir, { recursive: true });

const now = new Date().toISOString();

const record = {
  schema: "astra-dex-liquidity-provision-approval-record-v0.1",
  recordedAt: now,
  status: "DEX_LIQUIDITY_PROVISION_APPROVED_NO_LIQUIDITY_ADDED_NO_FUNDS_MOVED",
  approvalScope: "liquidity-provision-planning-only-no-payload-no-funds-no-trading",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  approver,
  approvalReference,
  postExecutionVerificationReference: "public-docs/dex-pool-creation-post-execution-verification-status.json",
  poolCreatedReference: "reports/dex-pool-creation/live/dex-pool-created.json",
  poolAddress: postExecution.summary?.poolAddress || poolCreated.poolAddress || "",
  poolLiquidity: String(postExecution.summary?.poolLiquidity || "0"),
  poolVerified: true,
  liquidityProvisionApprovalRecorded: true,
  liquidityProvisionApproved: true,
  liquiditySafePayloadGenerationApproved: false,
  liquiditySafePayloadGenerated: false,
  liquiditySafeTransactionSubmitted: false,
  liquiditySafeTransactionExecuted: false,
  tokenApprovalPayloadGenerated: false,
  tokenApprovalExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  treasuryFundingApproved: false,
  treasuryFundsMoved: false,
  publicTradingApproved: false,
  publicTradingLinkApproved: false,
  buyPageActivated: false,
  fullLaunchApproved: false,
  requiredBeforeLiquidityPayloadGeneration: {
    liquidityProvisionApprovalRecorded: true,
    poolVerified: true,
    poolLiquidityVerifiedZero: true,
    treasuryFundingApprovalRecorded: false,
    tokenApprovalRequirementsReviewed: false,
    liquidityMintParametersReviewed: false,
    slippageAndDeadlineReviewed: false,
    safePayloadGenerationApprovalRecorded: false,
    publicStatusUpdatePrepared: false
  },
  safety: {
    generatesLiquidityPayload: false,
    submitsSafeTransaction: false,
    executesSafeTransaction: false,
    approvesTokens: false,
    addsLiquidity: false,
    mintsPosition: false,
    movesTreasuryFunds: false,
    activatesBuyPage: false,
    approvesPublicTrading: false,
    approvesFullLaunch: false
  }
};

writeJson(recordFile, record);

const config = readJsonPath(configFile);

config.status = "liquidity-provision-approved-no-liquidity-added-no-funds-moved";
config.liquidityProvisionApprovalRecorded = true;
config.liquidityProvisionApproved = true;
config.liquiditySafePayloadGenerationApproved = false;
config.liquiditySafePayloadGenerated = false;
config.liquiditySafeTransactionSubmitted = false;
config.liquiditySafeTransactionExecuted = false;
config.tokenApprovalPayloadGenerated = false;
config.tokenApprovalExecuted = false;
config.liquidityAdded = false;
config.positionMinted = false;
config.treasuryFundingApproved = false;
config.treasuryFundsMoved = false;
config.publicTradingApproved = false;
config.publicTradingLinkApproved = false;
config.buyPageActivationApproved = false;
config.fullLaunchApproved = false;
config.approvedLiquidityProvisionPlanning = {
  recordedAt: now,
  approver,
  approvalReference,
  poolAddress: record.poolAddress,
  recordFile: "reports/dex-liquidity-provision-approval/dex-liquidity-provision-approval-record.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-provision-approval-result-v0.1",
  checkedAt: now,
  status: "DEX_LIQUIDITY_PROVISION_APPROVED_NO_LIQUIDITY_ADDED_NO_FUNDS_MOVED",
  recordFile,
  poolAddress: record.poolAddress,
  poolLiquidity: record.poolLiquidity,
  liquidityProvisionApproved: true,
  liquiditySafePayloadGenerated: false,
  tokenApprovalExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  treasuryFundsMoved: false,
  publicTradingApproved: false,
  fullLaunchApproved: false
}, null, 2));
