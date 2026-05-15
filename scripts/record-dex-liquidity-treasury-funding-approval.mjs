import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const confirm = process.env.DEX_LIQUIDITY_TREASURY_FUNDING_APPROVAL_CONFIRM || "";
const approver = process.env.DEX_LIQUIDITY_TREASURY_FUNDING_APPROVER || "";
const approvalReference = process.env.DEX_LIQUIDITY_TREASURY_FUNDING_APPROVAL_REFERENCE || "";
const overwrite = process.env.OVERWRITE_DEX_LIQUIDITY_TREASURY_FUNDING_APPROVAL || "";

const requiredConfirm = "APPROVE_DEX_LIQUIDITY_TREASURY_FUNDING_PLANNING_ONLY";

const recordDir = path.join(root, "reports", "dex-liquidity-treasury-funding-approval");
const recordFile = path.join(recordDir, "dex-liquidity-treasury-funding-approval-record.json");
const configFile = path.join(root, "configs", "dex-liquidity-treasury-funding-approval.config.json");

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
  issue("DEX_LIQUIDITY_TREASURY_FUNDING_APPROVAL_CONFIRM", `Must equal ${requiredConfirm}.`);
}

requireUsable("DEX_LIQUIDITY_TREASURY_FUNDING_APPROVER", approver);
requireUsable("DEX_LIQUIDITY_TREASURY_FUNDING_APPROVAL_REFERENCE", approvalReference);

if (fs.existsSync(recordFile) && overwrite !== "YES") {
  issue(
    "OVERWRITE_DEX_LIQUIDITY_TREASURY_FUNDING_APPROVAL",
    "Approval record already exists. Set OVERWRITE_DEX_LIQUIDITY_TREASURY_FUNDING_APPROVAL=YES only if replacing intentionally."
  );
}

const mintReviewStatus = readJson("public-docs/dex-liquidity-mint-parameter-review-status.json");
const mintReview = readJson("reports/dex-liquidity-mint-parameter-review/dex-liquidity-mint-parameter-review.json");
const tokenApproval = readJson("public-docs/dex-liquidity-token-approval-requirements-status.json");
const liquidityApproval = readJson("public-docs/dex-liquidity-provision-approval-status.json");
const postExecution = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const poolCreated = readJson("reports/dex-pool-creation/live/dex-pool-created.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

if (mintReviewStatus.status !== "DEX_LIQUIDITY_MINT_PARAMETER_REVIEW_COMPLETE_NO_PAYLOAD_NO_LIQUIDITY") {
  issue("mintReviewStatus.status", "DEX liquidity mint parameter review must be complete.");
}

if (mintReviewStatus.summary?.mintParametersReviewed !== true) {
  issue("mintReviewStatus.summary.mintParametersReviewed", "Mint parameters must be reviewed.");
}

if (mintReviewStatus.summary?.liquidityAdded !== false || mintReviewStatus.summary?.treasuryFundsMoved !== false || mintReviewStatus.summary?.publicTradingApproved !== false) {
  issue("mintReviewStatus.summary", "Mint review must show no liquidity, no treasury funds moved, and no public trading.");
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

if (poolCreated.status !== "DEX_POOL_CREATED_BY_SAFE_EXECUTION_NO_LIQUIDITY") {
  issue("poolCreated.status", "Pool-created evidence must show no liquidity.");
}

if (fullLaunch.fullLaunchApproved !== false) {
  issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
}

if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
  issue("treasuryFunding", "Global treasury funding must remain not approved and not executed in this scoped step.");
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
    issue(file, "Forbidden funding/liquidity/public-trading artifact exists. Approval must not move funds or add liquidity.");
  }
}

const balanceContext = mintReview.riskControls?.tokenBalanceAllowanceContext || [];
const allDesiredBalancesCurrentlyAvailable =
  Array.isArray(balanceContext) &&
  balanceContext.length >= 2 &&
  balanceContext.every((item) => item.balanceCurrentlyCoversDesired === true);

const allDesiredAllowancesCurrentlyAvailable =
  Array.isArray(balanceContext) &&
  balanceContext.length >= 2 &&
  balanceContext.every((item) => item.allowanceCurrentlyCoversDesired === true);

const additionalFundingRequiredBeforeLiquidity = !allDesiredBalancesCurrentlyAvailable;
const tokenApprovalsRequiredBeforeLiquidity = !allDesiredAllowancesCurrentlyAvailable;

if (!Array.isArray(balanceContext) || balanceContext.length < 2) {
  issue("mintReview.riskControls.tokenBalanceAllowanceContext", "Mint review must include token balance/allowance context for both tokens.");
}

if (issues.length > 0) {
  console.log(JSON.stringify({
    schema: "astra-dex-liquidity-treasury-funding-approval-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_LIQUIDITY_TREASURY_FUNDING_NOT_APPROVED",
    issues
  }, null, 2));
  process.exit(1);
}

fs.mkdirSync(recordDir, { recursive: true });

const now = new Date().toISOString();

const fundingRequirements = balanceContext.map((item) => ({
  role: item.role,
  symbol: item.symbol,
  tokenAddress: item.tokenAddress,
  desiredRaw: item.desiredRaw,
  desiredHuman: item.desiredHuman,
  safeBalanceRaw: item.safeBalanceRaw,
  safeBalanceHuman: item.safeBalanceHuman,
  currentAllowanceRaw: item.currentAllowanceRaw,
  currentAllowanceHuman: item.currentAllowanceHuman,
  balanceCurrentlyCoversDesired: item.balanceCurrentlyCoversDesired,
  allowanceCurrentlyCoversDesired: item.allowanceCurrentlyCoversDesired,
  additionalFundingRequiredForThisToken: item.balanceCurrentlyCoversDesired !== true,
  approvalRequiredForThisToken: item.allowanceCurrentlyCoversDesired !== true
}));

const record = {
  schema: "astra-dex-liquidity-treasury-funding-approval-record-v0.1",
  recordedAt: now,
  status: "DEX_LIQUIDITY_TREASURY_FUNDING_APPROVED_NO_FUNDS_MOVED_NO_LIQUIDITY_ADDED",
  approvalScope: "dex-liquidity-treasury-funding-planning-only-no-funds-moved-no-liquidity",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  approver,
  approvalReference,
  mintParameterReviewReference: "public-docs/dex-liquidity-mint-parameter-review-status.json",
  tokenApprovalRequirementsReference: "public-docs/dex-liquidity-token-approval-requirements-status.json",
  liquidityProvisionApprovalReference: "public-docs/dex-liquidity-provision-approval-status.json",
  poolAddress: mintReviewStatus.summary?.poolAddress || postExecution.summary?.poolAddress || poolCreated.poolAddress || "",
  poolLiquidity: String(mintReviewStatus.summary?.poolLiquidity || postExecution.summary?.poolLiquidity || "0"),
  safeAddress: mintReviewStatus.summary?.recipient || mintReview.mintParameters?.recipient || "",
  tickLower: mintReview.mintParameters?.tickLower,
  tickUpper: mintReview.mintParameters?.tickUpper,
  amount0DesiredRaw: mintReview.mintParameters?.amount0DesiredRaw,
  amount1DesiredRaw: mintReview.mintParameters?.amount1DesiredRaw,
  amount0MinRaw: mintReview.mintParameters?.amount0MinRaw,
  amount1MinRaw: mintReview.mintParameters?.amount1MinRaw,
  dexLiquidityTreasuryFundingApprovalRecorded: true,
  dexLiquidityTreasuryFundingApproved: true,
  allDesiredBalancesCurrentlyAvailable,
  allDesiredAllowancesCurrentlyAvailable,
  additionalFundingRequiredBeforeLiquidity,
  tokenApprovalsRequiredBeforeLiquidity,
  fundingRequirements,
  globalTreasuryFundingApproved: false,
  globalTreasuryFundingExecuted: false,
  fundingTransferPayloadGenerated: false,
  fundingTransferSubmitted: false,
  fundingTransferExecuted: false,
  tokenApprovalPayloadGenerated: false,
  tokenApprovalExecuted: false,
  liquidityMintCalldataGenerated: false,
  liquiditySafePayloadGenerated: false,
  liquiditySafeTransactionSubmitted: false,
  liquiditySafeTransactionExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  treasuryFundsMoved: false,
  publicTradingApproved: false,
  publicTradingLinkApproved: false,
  buyPageActivated: false,
  fullLaunchApproved: false,
  requiredBeforeFundingTransferOrApprovalPayloadGeneration: {
    dexLiquidityTreasuryFundingApprovalRecorded: true,
    mintParametersReviewed: true,
    tokenApprovalRequirementsReviewed: true,
    poolVerified: true,
    poolLiquidityVerifiedZero: true,
    fundingTransferRequirementsReviewed: false,
    tokenApprovalPayloadGenerationApprovalRecorded: false,
    liquidityPayloadGenerationApprovalRecorded: false,
    safeOwnersAndThresholdReviewed: true,
    operatorFundingCommandReviewed: false,
    publicStatusUpdatePrepared: false
  },
  safety: {
    movesTreasuryFunds: false,
    generatesFundingTransferPayload: false,
    generatesTokenApprovalCalldata: false,
    generatesLiquidityCalldata: false,
    generatesSafePayload: false,
    approvesTokens: false,
    addsLiquidity: false,
    mintsPosition: false,
    activatesBuyPage: false,
    approvesPublicTrading: false,
    approvesFullLaunch: false
  }
};

writeJson(recordFile, record);

const config = readJsonPath(configFile);

config.status = "dex-liquidity-treasury-funding-approved-no-funds-moved-no-liquidity-added";
config.dexLiquidityTreasuryFundingApprovalRecorded = true;
config.dexLiquidityTreasuryFundingApproved = true;
config.globalTreasuryFundingApproved = false;
config.globalTreasuryFundingExecuted = false;
config.fundingTransferPayloadGenerated = false;
config.fundingTransferSubmitted = false;
config.fundingTransferExecuted = false;
config.tokenApprovalPayloadGenerated = false;
config.tokenApprovalExecuted = false;
config.liquidityMintCalldataGenerated = false;
config.liquiditySafePayloadGenerated = false;
config.liquiditySafeTransactionSubmitted = false;
config.liquiditySafeTransactionExecuted = false;
config.liquidityAdded = false;
config.positionMinted = false;
config.treasuryFundsMoved = false;
config.publicTradingApproved = false;
config.publicTradingLinkApproved = false;
config.buyPageActivationApproved = false;
config.fullLaunchApproved = false;
config.approvedDexLiquidityTreasuryFundingPlanning = {
  recordedAt: now,
  approver,
  approvalReference,
  poolAddress: record.poolAddress,
  allDesiredBalancesCurrentlyAvailable,
  additionalFundingRequiredBeforeLiquidity,
  tokenApprovalsRequiredBeforeLiquidity,
  recordFile: "reports/dex-liquidity-treasury-funding-approval/dex-liquidity-treasury-funding-approval-record.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-treasury-funding-approval-result-v0.1",
  checkedAt: now,
  status: "DEX_LIQUIDITY_TREASURY_FUNDING_APPROVED_NO_FUNDS_MOVED_NO_LIQUIDITY_ADDED",
  recordFile,
  poolAddress: record.poolAddress,
  allDesiredBalancesCurrentlyAvailable,
  additionalFundingRequiredBeforeLiquidity,
  tokenApprovalsRequiredBeforeLiquidity,
  fundingTransferPayloadGenerated: false,
  fundingTransferExecuted: false,
  tokenApprovalExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  treasuryFundsMoved: false,
  publicTradingApproved: false,
  fullLaunchApproved: false
}, null, 2));
