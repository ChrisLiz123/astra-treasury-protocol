import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const confirm = process.env.DEX_SOURCE_SAFE_IMPACT_APPROVAL_CONFIRM || "";
const approver = process.env.DEX_SOURCE_SAFE_IMPACT_APPROVER || "";
const approvalReference = process.env.DEX_SOURCE_SAFE_IMPACT_APPROVAL_REFERENCE || "";
const liquiditySourceClassification = process.env.LIQUIDITY_SOURCE_CLASSIFICATION || "";
const safeImpactClassification = process.env.SAFE_IMPACT_CLASSIFICATION || "";
const overwrite = process.env.OVERWRITE_DEX_SOURCE_SAFE_IMPACT_APPROVAL || "";

const requiredConfirm = "APPROVE_DEX_SOURCE_SAFE_IMPACT_ONLY";

const recordDir = path.join(root, "reports", "dex-liquidity-source-safe-impact");
const recordFile = path.join(recordDir, "dex-liquidity-source-safe-impact-approval-record.json");
const configFile = path.join(root, "configs", "dex-liquidity-source-safe-impact-approval.config.json");

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

function requireFalse(pathName, value, message) {
  if (value !== false) {
    issue(pathName, message);
  }
}

if (confirm !== requiredConfirm) {
  issue("DEX_SOURCE_SAFE_IMPACT_APPROVAL_CONFIRM", `Must equal ${requiredConfirm}.`);
}

requireUsable("DEX_SOURCE_SAFE_IMPACT_APPROVER", approver);
requireUsable("DEX_SOURCE_SAFE_IMPACT_APPROVAL_REFERENCE", approvalReference);
requireUsable("LIQUIDITY_SOURCE_CLASSIFICATION", liquiditySourceClassification);
requireUsable("SAFE_IMPACT_CLASSIFICATION", safeImpactClassification);

const config = readJsonPath(configFile);

if (!config.allowedLiquiditySourceClassifications.includes(liquiditySourceClassification)) {
  issue("LIQUIDITY_SOURCE_CLASSIFICATION", `Must be one of: ${config.allowedLiquiditySourceClassifications.join(", ")}`);
}

if (!config.allowedSafeImpactClassifications.includes(safeImpactClassification)) {
  issue("SAFE_IMPACT_CLASSIFICATION", `Must be one of: ${config.allowedSafeImpactClassifications.join(", ")}`);
}

if (
  (liquiditySourceClassification === "treasury-safe-controlled" || liquiditySourceClassification === "hybrid") &&
  safeImpactClassification !== "safe-review-required-later"
) {
  issue("SAFE_IMPACT_CLASSIFICATION", "Treasury/Safe-controlled or hybrid liquidity source requires safe-review-required-later.");
}

if (fs.existsSync(recordFile) && overwrite !== "YES") {
  issue(
    "OVERWRITE_DEX_SOURCE_SAFE_IMPACT_APPROVAL",
    "Approval record already exists. Set OVERWRITE_DEX_SOURCE_SAFE_IMPACT_APPROVAL=YES only if replacing intentionally."
  );
}

const parameterApproval = readJson("public-docs/dex-liquidity-parameter-approval-status.json");
const parameterSelection = readJson("public-docs/dex-liquidity-parameter-selection-status.json");
const finalizationReview = readJson("public-docs/dex-liquidity-parameter-finalization-status.json");
const parameterReview = readJson("public-docs/dex-liquidity-parameters-status.json");
const dexPath = readJson("public-docs/dex-liquidity-path-status.json");
const finalRelease = readJson("public-docs/restricted-mode-final-release-status.json");
const governanceDecision = readJson("public-docs/governance-decision-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const safeTx = readJson("public-docs/treasury-safe-transaction-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

if (parameterApproval.status !== "DEX_LIQUIDITY_PARAMETERS_APPROVED_NO_POOL_NO_LIQUIDITY") {
  issue("parameterApproval.status", "DEX liquidity parameters must be approved before source/Safe-impact approval.");
}

if (parameterSelection.status !== "DEX_LIQUIDITY_PARAMETER_SELECTION_IMPORTED_NOT_APPROVED" || parameterSelection.summary?.selectionValid !== true) {
  issue("parameterSelection.status", "A valid imported parameter selection is required.");
}

if (![
  "DEX_LIQUIDITY_PARAMETER_FINALIZATION_REVIEW_READY_NOT_APPROVED",
  "DEX_LIQUIDITY_PARAMETER_FINALIZATION_REVIEW_PARAMETERS_APPROVED_NO_POOL"
].includes(finalizationReview.status)) {
  issue("finalizationReview.status", "DEX parameter finalization status must be ready or parameters-approved/no-pool.");
}

if (parameterReview.status !== "DEX_LIQUIDITY_PARAMETER_REVIEW_READY_NOT_FINALIZED") {
  issue("parameterReview.status", "DEX parameter review must remain ready and not finalized.");
}

if (dexPath.status !== "DEX_LIQUIDITY_PATH_SELECTED_NOT_APPROVED") {
  issue("dexPath.status", "DEX liquidity path must be selected but not approved.");
}

if (finalRelease.status !== "RESTRICTED_MODE_FINAL_RELEASE_READY_DECISION_RECORDED_ALL_DISABLED") {
  issue("finalRelease.status", "Restricted-mode final release must be ready.");
}

if (governanceDecision.governanceDecisionRecorded !== true || governanceDecision.fullLaunchApproved !== false) {
  issue("governanceDecision", "Governance decision must be recorded and must not approve full launch.");
}

if (capabilityMatrix.allCapabilitiesDisabled !== true || capabilityMatrix.allCapabilityApprovalsFalse !== true) {
  issue("capabilityMatrix", "Capability Matrix must remain all-disabled.");
}

if (fullLaunch.fullLaunchApproved !== false) {
  issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
}

if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
  issue("treasuryFunding", "Treasury funding must remain not approved and not executed.");
}

if (safeTx.safeTransactionPayloadGenerated !== false || safeTx.safeTransactionPrepared !== false) {
  issue("safeTx", "Safe payload must remain not generated and Safe transaction not prepared.");
}

if (monitor.status !== "PASS") {
  issue("monitor.status", `Mainnet monitor must be PASS, got ${monitor.status}.`);
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

if (issues.length > 0) {
  console.log(JSON.stringify({
    schema: "astra-dex-liquidity-source-safe-impact-approval-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_SOURCE_SAFE_IMPACT_NOT_APPROVED",
    issues
  }, null, 2));
  process.exit(1);
}

fs.mkdirSync(recordDir, { recursive: true });

const now = new Date().toISOString();
const selectionSummary = parameterApproval.parameterApproval?.approvalSummary || {};
const treasuryOrSafeImpact =
  liquiditySourceClassification === "treasury-safe-controlled" ||
  liquiditySourceClassification === "hybrid" ||
  safeImpactClassification === "safe-review-required-later";

const record = {
  schema: "astra-dex-liquidity-source-safe-impact-approval-record-v0.1",
  recordedAt: now,
  status: "DEX_LIQUIDITY_SOURCE_SAFE_IMPACT_APPROVED_NO_FUNDS_NO_SAFE_PAYLOAD",
  approvalScope: "liquidity-source-safe-impact-planning-only",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  approver,
  approvalReference,
  liquiditySourceClassification,
  safeImpactClassification,
  treasuryOrSafeImpact,
  liquiditySourceApprovedForPlanning: true,
  safeImpactReviewedForPlanning: true,
  treasuryAssetUseAcknowledgedForLaterApproval: treasuryOrSafeImpact,
  externalLiquidityProviderPathAcknowledged: liquiditySourceClassification === "external-lp-wallet" || liquiditySourceClassification === "hybrid",
  parameterApprovalReference: "public-docs/dex-liquidity-parameter-approval-status.json",
  selectionSummary,
  poolCreated: false,
  liquidityAdded: false,
  publicTradingApproved: false,
  publicTradingLinkApproved: false,
  buyPageActivated: false,
  safePayloadGenerated: false,
  safeTransactionExecuted: false,
  treasuryFundsMoved: false,
  treasuryFundingApproved: false,
  fullLaunchApproved: false,
  safety: {
    sendsTransactions: false,
    movesFunds: false,
    createsLiquidityPool: false,
    addsLiquidity: false,
    enablesPublicTrading: false,
    generatesSafePayload: false,
    activatesBuyPage: false,
    approvesFullLaunch: false
  }
};

writeJson(recordFile, record);

config.status = "dex-liquidity-source-safe-impact-approved-no-funds-no-safe-payload";
config.sourceSafeImpactApprovalRecorded = true;
config.liquiditySourceApprovedForPlanning = true;
config.safeImpactReviewedForPlanning = true;
config.treasuryAssetUseAcknowledgedForLaterApproval = treasuryOrSafeImpact;
config.externalLiquidityProviderPathAcknowledged = liquiditySourceClassification === "external-lp-wallet" || liquiditySourceClassification === "hybrid";
config.dexLiquidityPathApproved = false;
config.liquidityPoolCreationApproved = false;
config.liquidityProvisionApproved = false;
config.publicTradingApproved = false;
config.publicTradingLinkApproved = false;
config.buyPageActivationApproved = false;
config.safePayloadGenerationApproved = false;
config.safeTransactionExecutionApproved = false;
config.treasuryFundingApproved = false;
config.fullLaunchApproved = false;
config.approvedSourceSafeImpact = {
  recordedAt: now,
  approver,
  approvalReference,
  recordFile: "reports/dex-liquidity-source-safe-impact/dex-liquidity-source-safe-impact-approval-record.json",
  liquiditySourceClassification,
  safeImpactClassification,
  treasuryOrSafeImpact
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-source-safe-impact-approval-result-v0.1",
  checkedAt: now,
  status: "DEX_LIQUIDITY_SOURCE_SAFE_IMPACT_APPROVED_NO_FUNDS_NO_SAFE_PAYLOAD",
  recordFile,
  liquiditySourceClassification,
  safeImpactClassification,
  treasuryOrSafeImpact,
  createsPool: false,
  addsLiquidity: false,
  generatesSafePayload: false,
  movesFunds: false,
  approvesPublicTrading: false,
  approvesFullLaunch: false
}, null, 2));
