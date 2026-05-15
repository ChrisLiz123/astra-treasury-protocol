import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const confirm = process.env.DEX_LIQUIDITY_FUNDING_TRANSFER_PAYLOAD_GENERATION_APPROVAL_CONFIRM || "";
const approver = process.env.DEX_LIQUIDITY_FUNDING_TRANSFER_PAYLOAD_GENERATION_APPROVER || "";
const approvalReference = process.env.DEX_LIQUIDITY_FUNDING_TRANSFER_PAYLOAD_GENERATION_APPROVAL_REFERENCE || "";
const overwrite = process.env.OVERWRITE_DEX_LIQUIDITY_FUNDING_TRANSFER_PAYLOAD_GENERATION_APPROVAL || "";

const requiredConfirm = "APPROVE_DEX_LIQUIDITY_FUNDING_TRANSFER_PAYLOAD_GENERATION_ONLY";

const recordDir = path.join(root, "reports", "dex-liquidity-funding-transfer-payload-generation-approval");
const recordFile = path.join(recordDir, "dex-liquidity-funding-transfer-payload-generation-approval-record.json");
const configFile = path.join(root, "configs", "dex-liquidity-funding-transfer-payload-generation-approval.config.json");

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

function isZeroAddress(value) {
  return String(value || "").toLowerCase() === "0x0000000000000000000000000000000000000000";
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
  issue("DEX_LIQUIDITY_FUNDING_TRANSFER_PAYLOAD_GENERATION_APPROVAL_CONFIRM", `Must equal ${requiredConfirm}.`);
}

requireUsable("DEX_LIQUIDITY_FUNDING_TRANSFER_PAYLOAD_GENERATION_APPROVER", approver);
requireUsable("DEX_LIQUIDITY_FUNDING_TRANSFER_PAYLOAD_GENERATION_APPROVAL_REFERENCE", approvalReference);

if (fs.existsSync(recordFile) && overwrite !== "YES") {
  issue(
    "OVERWRITE_DEX_LIQUIDITY_FUNDING_TRANSFER_PAYLOAD_GENERATION_APPROVAL",
    "Approval record already exists. Set OVERWRITE_DEX_LIQUIDITY_FUNDING_TRANSFER_PAYLOAD_GENERATION_APPROVAL=YES only if replacing intentionally."
  );
}

const transferApproval = readJson("public-docs/dex-liquidity-funding-transfer-approval-status.json");
const transferApprovalRecord = readJson("reports/dex-liquidity-funding-transfer-approval/dex-liquidity-funding-transfer-approval-record.json");
const requirementsStatus = readJson("public-docs/dex-liquidity-funding-transfer-requirements-status.json");
const requirementsReview = readJson("reports/dex-liquidity-funding-transfer-requirements/dex-liquidity-funding-transfer-requirements-review.json");
const fundingApproval = readJson("public-docs/dex-liquidity-treasury-funding-approval-status.json");
const mintReview = readJson("public-docs/dex-liquidity-mint-parameter-review-status.json");
const tokenApproval = readJson("public-docs/dex-liquidity-token-approval-requirements-status.json");
const liquidityApproval = readJson("public-docs/dex-liquidity-provision-approval-status.json");
const postExecution = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

if (transferApproval.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_APPROVED_NO_PAYLOAD_NO_FUNDS_MOVED") {
  issue("transferApproval.status", "Funding transfer approval must be recorded.");
}

if (transferApproval.summary?.fundingTransferApproved !== true) {
  issue("transferApproval.summary.fundingTransferApproved", "Funding transfer plan must be approved.");
}

if (transferApproval.summary?.fundingTransferPayloadGenerated !== false || transferApproval.summary?.fundingTransferExecuted !== false || transferApproval.summary?.treasuryFundsMoved !== false) {
  issue("transferApproval.summary", "Transfer approval must show no payload, no execution, and no treasury funds moved.");
}

if (requirementsStatus.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_REQUIREMENTS_REVIEW_COMPLETE_NO_FUNDS_MOVED") {
  issue("requirementsStatus.status", "Funding transfer requirements review must be complete.");
}

if (requirementsStatus.summary?.sourceAddressProvided !== true || requirementsStatus.summary?.sourceAddressRequiredBeforePayloadGeneration !== false) {
  issue("requirementsStatus.summary.sourceAddress", "Funding source address must be recorded.");
}

if (requirementsStatus.summary?.additionalFundingRequiredBeforeLiquidity !== true) {
  issue("requirementsStatus.summary.additionalFundingRequiredBeforeLiquidity", "Additional funding must be required.");
}

if (!Number.isInteger(Number(requirementsStatus.summary?.tokensRequiringFundingCount)) || Number(requirementsStatus.summary?.tokensRequiringFundingCount) <= 0) {
  issue("requirementsStatus.summary.tokensRequiringFundingCount", "At least one token must require funding.");
}

if (fundingApproval.status !== "DEX_LIQUIDITY_TREASURY_FUNDING_APPROVED_NO_FUNDS_MOVED_NO_LIQUIDITY_ADDED") {
  issue("fundingApproval.status", "DEX liquidity treasury funding approval must be recorded.");
}

if (mintReview.status !== "DEX_LIQUIDITY_MINT_PARAMETER_REVIEW_COMPLETE_NO_PAYLOAD_NO_LIQUIDITY") {
  issue("mintReview.status", "Mint parameter review must be complete.");
}

if (tokenApproval.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_REVIEW_COMPLETE_NO_APPROVALS_EXECUTED") {
  issue("tokenApproval.status", "Token approval requirements review must be complete.");
}

if (liquidityApproval.status !== "DEX_LIQUIDITY_PROVISION_APPROVED_NO_LIQUIDITY_ADDED_NO_FUNDS_MOVED") {
  issue("liquidityApproval.status", "Liquidity provision planning approval must be recorded.");
}

if (postExecution.status !== "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
  issue("postExecution.status", "Post-execution pool verification must be complete.");
}

if (postExecution.summary?.liquidityVerifiedZero !== true || String(postExecution.summary?.poolLiquidity || "") !== "0") {
  issue("postExecution.summary.poolLiquidity", "Pool liquidity must remain zero.");
}

if (fullLaunch.fullLaunchApproved !== false) {
  issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
}

if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
  issue("treasuryFunding", "Global treasury funding must remain not approved and not executed.");
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
  "reports/dex-liquidity-treasury-funding/live/funds-moved.json",
  "reports/dex-liquidity-treasury-funding/payload/funding-transfer-safe-payload.json",
  "public-docs/dex-liquidity-added-status.json",
  "public-docs/dex-public-trading-live-status.json"
];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden funding/liquidity/public-trading artifact exists. Approval must not generate payloads or move funds.");
  }
}

const source = requirementsReview.fundingSource || {};
const destination = requirementsReview.fundingDestination || {};
const tokenTransferRequirements = transferApprovalRecord.tokenTransferRequirements || requirementsReview.fundingTransferRequirements?.tokenTransferRequirements || [];

if (!isAddress(source.sourceAddress) || isZeroAddress(source.sourceAddress)) {
  issue("requirementsReview.fundingSource.sourceAddress", "Funding source address must be valid.");
}

if (!isAddress(destination.destinationSafeAddress) || isZeroAddress(destination.destinationSafeAddress)) {
  issue("requirementsReview.fundingDestination.destinationSafeAddress", "Destination Safe must be valid.");
}

if (!Array.isArray(tokenTransferRequirements) || tokenTransferRequirements.length < 2) {
  issue("tokenTransferRequirements", "Token transfer requirements must include both tokens.");
}

const tokensRequiringFunding = tokenTransferRequirements.filter((item) => item.fundingTransferRequiredForThisToken === true);

if (tokensRequiringFunding.length <= 0) {
  issue("tokenTransferRequirements", "At least one token must require funding.");
}

for (const item of tokenTransferRequirements) {
  if (!isAddress(item.tokenAddress)) {
    issue(`tokenTransferRequirements.${item.role}.tokenAddress`, "Token address must be valid.");
  }

  if (!/^\d+$/.test(String(item.shortfallRaw || ""))) {
    issue(`tokenTransferRequirements.${item.role}.shortfallRaw`, "Shortfall raw amount must be a decimal integer.");
  }

  if (item.fundingTransferRequiredForThisToken === true && BigInt(String(item.shortfallRaw || "0")) <= 0n) {
    issue(`tokenTransferRequirements.${item.role}.shortfallRaw`, "Required funding token must have positive shortfall.");
  }
}

if (issues.length > 0) {
  console.log(JSON.stringify({
    schema: "astra-dex-liquidity-funding-transfer-payload-generation-approval-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_LIQUIDITY_FUNDING_TRANSFER_PAYLOAD_GENERATION_NOT_APPROVED",
    issues
  }, null, 2));
  process.exit(1);
}

fs.mkdirSync(recordDir, { recursive: true });

const now = new Date().toISOString();

const record = {
  schema: "astra-dex-liquidity-funding-transfer-payload-generation-approval-record-v0.1",
  recordedAt: now,
  status: "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_PAYLOAD_GENERATION_APPROVED_NO_PAYLOAD_NO_FUNDS_MOVED",
  approvalScope: "funding-transfer-payload-generation-only-no-payload-generated-no-funds-moved",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  approver,
  approvalReference,
  fundingTransferApprovalReference: "public-docs/dex-liquidity-funding-transfer-approval-status.json",
  fundingTransferRequirementsReference: "public-docs/dex-liquidity-funding-transfer-requirements-status.json",
  sourceReference: source.sourceReference,
  sourceAddress: source.sourceAddress,
  destinationSafeAddress: destination.destinationSafeAddress,
  tokensRequiringFundingCount: tokensRequiringFunding.length,
  tokenTransferRequirements,
  fundingTransferPayloadGenerationApprovalRecorded: true,
  fundingTransferPayloadGenerationApproved: true,
  fundingTransferApproved: true,
  fundingTransferPayloadGenerated: false,
  fundingTransferSafePayloadGenerated: false,
  fundingTransferSubmitted: false,
  fundingTransferExecuted: false,
  treasuryFundsMoved: false,
  globalTreasuryFundingApproved: false,
  globalTreasuryFundingExecuted: false,
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
  requiredBeforeFundingTransferPayloadGeneration: {
    fundingTransferPayloadGenerationApprovalRecorded: true,
    fundingTransferApprovalRecorded: true,
    fundingTransferRequirementsReviewed: true,
    fundingSourceReviewed: true,
    fundingDestinationReviewed: true,
    fundingShortfallsCalculated: true,
    safeOwnersAndThresholdReviewed: true,
    operatorFundingCommandReviewed: false,
    publicStatusUpdatePrepared: false
  },
  safety: {
    generatesFundingTransferCalldata: false,
    generatesSafePayload: false,
    submitsSafeTransaction: false,
    executesFundingTransfer: false,
    movesTreasuryFunds: false,
    executesTokenApproval: false,
    addsLiquidity: false,
    mintsPosition: false,
    activatesBuyPage: false,
    approvesPublicTrading: false,
    approvesFullLaunch: false
  }
};

writeJson(recordFile, record);

const config = readJsonPath(configFile);

config.status = "funding-transfer-payload-generation-approved-no-payload-no-funds-moved";
config.fundingTransferPayloadGenerationApprovalRecorded = true;
config.fundingTransferPayloadGenerationApproved = true;
config.fundingTransferApproved = true;
config.fundingTransferPayloadGenerated = false;
config.fundingTransferSafePayloadGenerated = false;
config.fundingTransferSubmitted = false;
config.fundingTransferExecuted = false;
config.treasuryFundsMoved = false;
config.globalTreasuryFundingApproved = false;
config.globalTreasuryFundingExecuted = false;
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
config.approvedFundingTransferPayloadGeneration = {
  recordedAt: now,
  approver,
  approvalReference,
  sourceAddress: record.sourceAddress,
  destinationSafeAddress: record.destinationSafeAddress,
  tokensRequiringFundingCount: record.tokensRequiringFundingCount,
  recordFile: "reports/dex-liquidity-funding-transfer-payload-generation-approval/dex-liquidity-funding-transfer-payload-generation-approval-record.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-funding-transfer-payload-generation-approval-result-v0.1",
  checkedAt: now,
  status: "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_PAYLOAD_GENERATION_APPROVED_NO_PAYLOAD_NO_FUNDS_MOVED",
  recordFile,
  sourceAddress: record.sourceAddress,
  destinationSafeAddress: record.destinationSafeAddress,
  tokensRequiringFundingCount: record.tokensRequiringFundingCount,
  fundingTransferPayloadGenerationApproved: true,
  fundingTransferPayloadGenerated: false,
  fundingTransferExecuted: false,
  treasuryFundsMoved: false,
  tokenApprovalExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  fullLaunchApproved: false
}, null, 2));
