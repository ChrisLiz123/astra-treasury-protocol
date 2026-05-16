import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const confirm = process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_GENERATION_APPROVAL_CONFIRM || "";
const approver = process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_GENERATION_APPROVER || "";
const approvalReference = process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_GENERATION_APPROVAL_REFERENCE || "";
const overwrite = process.env.OVERWRITE_DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_GENERATION_APPROVAL || "";

const requiredConfirm = "APPROVE_DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_GENERATION_ONLY";

const recordDir = path.join(root, "reports", "dex-liquidity-token-approval-payload-generation-approval");
const recordFile = path.join(recordDir, "dex-liquidity-token-approval-payload-generation-approval-record.json");
const configFile = path.join(root, "configs", "dex-liquidity-token-approval-payload-generation-approval.config.json");

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

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || "").trim());
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
  issue("DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_GENERATION_APPROVAL_CONFIRM", `Must equal ${requiredConfirm}.`);
}

requireUsable("DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_GENERATION_APPROVER", approver);
requireUsable("DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_GENERATION_APPROVAL_REFERENCE", approvalReference);

if (fs.existsSync(recordFile) && overwrite !== "YES") {
  issue(
    "OVERWRITE_DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_GENERATION_APPROVAL",
    "Approval record already exists. Set OVERWRITE_DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_GENERATION_APPROVAL=YES only if replacing intentionally."
  );
}

const recheckStatus = readJson("public-docs/dex-liquidity-token-approval-requirements-recheck-status.json");
const recheck = readJson("reports/dex-liquidity-token-approval-requirements-recheck/dex-liquidity-token-approval-requirements-recheck.json");
const postBalances = readJson("public-docs/dex-liquidity-funding-transfer-post-execution-balances-status.json");
const executionLive = readJson("public-docs/dex-liquidity-funding-transfer-safe-execution-live-status.json");
const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

if (recheckStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_RECHECK_COMPLETE_APPROVALS_REQUIRED_NO_APPROVALS_EXECUTED") {
  issue("recheckStatus.status", "Token approval requirements recheck must be complete and approvals must be required.");
}

if (recheckStatus.summary?.tokenApprovalRequirementsRecheckComplete !== true) {
  issue("recheckStatus.summary.tokenApprovalRequirementsRecheckComplete", "Token approval requirements recheck must be complete.");
}

if (recheckStatus.summary?.tokenApprovalsRequiredBeforeLiquidity !== true) {
  issue("recheckStatus.summary.tokenApprovalsRequiredBeforeLiquidity", "Token approvals must be required before liquidity.");
}

if (recheckStatus.summary?.allRequiredBalancesAvailable !== true) {
  issue("recheckStatus.summary.allRequiredBalancesAvailable", "All required balances must be available.");
}

if (recheckStatus.summary?.tokenApprovalPayloadGenerated !== false || recheckStatus.summary?.tokenApprovalExecuted !== false || recheckStatus.summary?.liquidityAdded !== false) {
  issue("recheckStatus.summary.flags", "Recheck status must show no approval payload, no approval execution, and no liquidity.");
}

if (!isAddress(recheck.liquiditySafeAddress)) {
  issue("recheck.liquiditySafeAddress", "Liquidity Safe address must be valid.");
}

if (!isAddress(recheck.approvalSpender)) {
  issue("recheck.approvalSpender", "Approval spender must be valid.");
}

const requiredApprovalItems = Array.isArray(recheck.tokenApprovalRequirements)
  ? recheck.tokenApprovalRequirements.filter((item) => item.approvalRequired === true)
  : [];

if (requiredApprovalItems.length <= 0) {
  issue("recheck.tokenApprovalRequirements", "At least one token approval must be required.");
}

for (const item of requiredApprovalItems) {
  if (!isAddress(item.tokenAddress)) {
    issue(`tokenApprovalRequirements.${item.symbol}.tokenAddress`, "Token address must be valid.");
  }

  if (!isAddress(item.spenderAddress)) {
    issue(`tokenApprovalRequirements.${item.symbol}.spenderAddress`, "Spender address must be valid.");
  }

  if (!/^\d+$/.test(String(item.recommendedApprovalAmountRaw || "")) || BigInt(item.recommendedApprovalAmountRaw || "0") <= 0n) {
    issue(`tokenApprovalRequirements.${item.symbol}.recommendedApprovalAmountRaw`, "Recommended approval amount must be positive.");
  }

  if (item.tokenApprovalPayloadGenerated !== false || item.tokenApprovalExecuted !== false) {
    issue(`tokenApprovalRequirements.${item.symbol}.flags`, "Token approval payload/execution flags must remain false.");
  }
}

if (postBalances.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_POST_EXECUTION_BALANCES_VERIFIED_FUNDS_MOVED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
  issue("postBalances.status", "Post-execution balances must be verified.");
}

if (postBalances.summary?.destinationBalancesFunded !== true || postBalances.summary?.poolLiquidityVerifiedZero !== true) {
  issue("postBalances.summary", "Destination balances must be funded and pool liquidity must remain zero.");
}

if (executionLive.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_SAFE_EXECUTION_LIVE_RECORDED_FUNDS_MOVED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
  issue("executionLive.status", "Funding transfer Safe execution live evidence must be recorded.");
}

if (poolStatus.status !== "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
  issue("poolStatus.status", "Pool must remain verified with no liquidity and no public trading.");
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
  "reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json",
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
    issue(file, "Forbidden token-approval/liquidity/public-trading artifact exists. Approval milestone must not generate or execute approvals.");
  }
}

if (issues.length > 0) {
  console.log(JSON.stringify({
    schema: "astra-dex-liquidity-token-approval-payload-generation-approval-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_GENERATION_NOT_APPROVED",
    issues
  }, null, 2));
  process.exit(1);
}

fs.mkdirSync(recordDir, { recursive: true });

const recordedAt = new Date().toISOString();

const record = {
  schema: "astra-dex-liquidity-token-approval-payload-generation-approval-record-v0.1",
  recordedAt,
  status: "DEX_LIQUIDITY_TOKEN_APPROVAL_PAYLOAD_GENERATION_APPROVED_NO_PAYLOAD_NO_APPROVALS_EXECUTED",
  approvalScope: "token-approval-payload-generation-only-no-payload-generated-no-approvals-executed",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  approver,
  approvalReference,
  liquiditySafeAddress: recheck.liquiditySafeAddress,
  approvalSpender: recheck.approvalSpender,
  tokenApprovalsRequiredBeforeLiquidity: true,
  tokenApprovalRequirementsRecheckReference: "public-docs/dex-liquidity-token-approval-requirements-recheck-status.json",
  postExecutionBalanceVerificationReference: "public-docs/dex-liquidity-funding-transfer-post-execution-balances-status.json",
  requiredApprovalTokenCount: requiredApprovalItems.length,
  requiredApprovalTokenRequirements: requiredApprovalItems,
  tokenApprovalPayloadGenerationApprovalRecorded: true,
  tokenApprovalPayloadGenerationApproved: true,
  tokenApprovalRequirementsRecheckComplete: true,
  fundingTransferExecuted: true,
  treasuryFundsMoved: true,
  destinationBalancesFunded: true,
  tokenApprovalPayloadGenerated: false,
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
  requiredBeforeTokenApprovalPayloadGeneration: {
    tokenApprovalPayloadGenerationApprovalRecorded: true,
    tokenApprovalRequirementsRecheckComplete: true,
    tokenApprovalsRequiredBeforeLiquidity: true,
    postExecutionBalanceVerificationComplete: true,
    destinationBalancesFunded: true,
    approvalSpenderRecorded: true,
    tokenApprovalPayloadGenerated: false,
    tokenApprovalExecuted: false,
    operatorPayloadGenerationCommandReviewed: false,
    publicStatusUpdatePrepared: false
  },
  safety: {
    approvalOnly: true,
    generatesTokenApprovalPayload: false,
    executesTokenApproval: false,
    generatesLiquidityCalldata: false,
    addsLiquidity: false,
    mintsPosition: false,
    activatesBuyPage: false,
    approvesPublicTrading: false,
    approvesFullLaunch: false
  }
};

writeJson(recordFile, record);

const config = readJsonPath(configFile);

config.status = "token-approval-payload-generation-approved-no-payload-no-approvals-executed";
config.tokenApprovalPayloadGenerationApprovalRecorded = true;
config.tokenApprovalPayloadGenerationApproved = true;
config.tokenApprovalRequirementsRecheckComplete = true;
config.tokenApprovalsRequiredBeforeLiquidity = true;
config.fundingTransferExecuted = true;
config.treasuryFundsMoved = true;
config.destinationBalancesFunded = true;
config.tokenApprovalPayloadGenerated = false;
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
config.approvedTokenApprovalPayloadGeneration = {
  recordedAt,
  approver,
  approvalReference,
  liquiditySafeAddress: record.liquiditySafeAddress,
  approvalSpender: record.approvalSpender,
  requiredApprovalTokenCount: record.requiredApprovalTokenCount,
  recordFile: "reports/dex-liquidity-token-approval-payload-generation-approval/dex-liquidity-token-approval-payload-generation-approval-record.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-token-approval-payload-generation-approval-result-v0.1",
  checkedAt: recordedAt,
  status: record.status,
  liquiditySafeAddress: record.liquiditySafeAddress,
  approvalSpender: record.approvalSpender,
  requiredApprovalTokenCount: record.requiredApprovalTokenCount,
  tokenApprovalPayloadGenerationApproved: true,
  tokenApprovalPayloadGenerated: false,
  tokenApprovalExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  fullLaunchApproved: false
}, null, 2));
