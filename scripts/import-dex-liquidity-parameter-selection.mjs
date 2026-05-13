import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const selectionDir = path.join(root, "reports", "dex-liquidity-parameter-selection", "import");
const selectionFile = path.join(selectionDir, "dex-liquidity-parameter-selection.json");

const confirm = process.env.DEX_PARAMETER_SELECTION_IMPORT_CONFIRM || "";
const overwrite = process.env.OVERWRITE_DEX_PARAMETER_SELECTION || "";
const requiredConfirm = "IMPORT_DEX_PARAMETER_SELECTION_FOR_REVIEW_ONLY";

const values = {
  selectionId: process.env.DEX_SELECTION_ID || "",
  dexVenue: process.env.DEX_VENUE || "Uniswap on Base",
  poolVersion: process.env.POOL_VERSION || "",
  tokenPair: process.env.TOKEN_PAIR || "",
  astraTokenAddress: process.env.ASTRA_TOKEN_ADDRESS || "",
  counterAssetSymbol: process.env.COUNTER_ASSET_SYMBOL || "",
  counterAssetAddress: process.env.COUNTER_ASSET_ADDRESS || "",
  feeTierOrPoolType: process.env.FEE_TIER_OR_POOL_TYPE || "",
  initialPriceApproach: process.env.INITIAL_PRICE_APPROACH || "",
  initialPriceHuman: process.env.INITIAL_PRICE_HUMAN || "",
  liquidityAmountAstra: process.env.LIQUIDITY_AMOUNT_ASTRA || "",
  liquidityAmountCounterAsset: process.env.LIQUIDITY_AMOUNT_COUNTER_ASSET || "",
  liquiditySource: process.env.LIQUIDITY_SOURCE || "",
  priceRange: process.env.PRICE_RANGE || "",
  slippageGuidance: process.env.SLIPPAGE_GUIDANCE || "",
  impermanentLossDisclosure: process.env.IMPERMANENT_LOSS_DISCLOSURE || "",
  mevRiskDisclosure: process.env.MEV_RISK_DISCLOSURE || "",
  tokenImpersonationDisclosure: process.env.TOKEN_IMPERSONATION_DISCLOSURE || "",
  safeTransactionPath: process.env.SAFE_TRANSACTION_PATH || "",
  publicTradingLinkPlan: process.env.PUBLIC_TRADING_LINK_PLAN || "",
  buyPageLanguage: process.env.BUY_PAGE_LANGUAGE || "",
  selectedAt: process.env.SELECTED_AT || new Date().toISOString()
};

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
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

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || "").trim());
}

if (confirm !== requiredConfirm) {
  issue("DEX_PARAMETER_SELECTION_IMPORT_CONFIRM", `Must equal ${requiredConfirm}.`);
}

const config = readJson("configs/dex-liquidity-parameter-selection-import.config.json");

for (const [key, value] of Object.entries(values)) {
  requireUsable(key, value);
}

if (!Array.isArray(config.allowedPairs) || !config.allowedPairs.includes(values.tokenPair)) {
  issue("TOKEN_PAIR", `Must be one of: ${(config.allowedPairs || []).join(", ")}`);
}

if (!Array.isArray(config.allowedPoolVersions) || !config.allowedPoolVersions.includes(values.poolVersion)) {
  issue("POOL_VERSION", `Must be one of: ${(config.allowedPoolVersions || []).join(", ")}`);
}

if (!isAddress(values.astraTokenAddress)) {
  issue("ASTRA_TOKEN_ADDRESS", "Must be a 0x address with 40 hex characters.");
}

if (!isAddress(values.counterAssetAddress)) {
  issue("COUNTER_ASSET_ADDRESS", "Must be a 0x address with 40 hex characters.");
}

if (!Number.isFinite(Date.parse(values.selectedAt))) {
  issue("SELECTED_AT", "Must be a valid ISO timestamp.");
}

for (const envName of [
  "APPROVES_POOL_CREATION",
  "APPROVES_LIQUIDITY_PROVISION",
  "APPROVES_PUBLIC_TRADING",
  "GENERATES_SAFE_PAYLOAD",
  "MOVES_FUNDS",
  "ACTIVATES_BUY_PAGE"
]) {
  if (process.env[envName] === "true") {
    issue(envName, "Must not be true during parameter selection import.");
  }
}

if (fs.existsSync(selectionFile) && overwrite !== "YES") {
  issue(
    "OVERWRITE_DEX_PARAMETER_SELECTION",
    "Selection file already exists. Set OVERWRITE_DEX_PARAMETER_SELECTION=YES only if replacing it intentionally."
  );
}

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

if (parameterReview.status !== "DEX_LIQUIDITY_PARAMETER_REVIEW_READY_NOT_FINALIZED") {
  issue("parameterReview.status", "DEX liquidity parameter review must be ready and not finalized.");
}

if (dexPath.status !== "DEX_LIQUIDITY_PATH_SELECTED_NOT_APPROVED") {
  issue("dexPath.status", "DEX liquidity path must be selected and not approved.");
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
    schema: "astra-dex-liquidity-parameter-selection-import-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_PARAMETER_SELECTION_NOT_IMPORTED",
    issues
  }, null, 2));
  process.exit(1);
}

const selection = {
  schema: "astra-dex-liquidity-parameter-selection-v0.1",
  ...values,
  approvesPoolCreation: false,
  approvesLiquidityProvision: false,
  approvesPublicTrading: false,
  generatesSafePayload: false,
  movesFunds: false,
  activatesBuyPage: false,
  importedAt: new Date().toISOString(),
  importScope: "parameter-selection-review-only-no-approval",
  safety: {
    createsPool: false,
    addsLiquidity: false,
    approvesPublicTrading: false,
    generatesSafePayload: false,
    executesSafeTransaction: false,
    movesFunds: false,
    activatesBuyPage: false,
    approvesFullLaunch: false
  }
};

fs.mkdirSync(selectionDir, { recursive: true });
fs.writeFileSync(selectionFile, JSON.stringify(selection, null, 2) + "\n");

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-parameter-selection-import-result-v0.1",
  checkedAt: selection.importedAt,
  status: "DEX_LIQUIDITY_PARAMETER_SELECTION_IMPORTED_NOT_APPROVED",
  selectionFile,
  tokenPair: selection.tokenPair,
  poolVersion: selection.poolVersion,
  createsPool: false,
  addsLiquidity: false,
  generatesSafePayload: false,
  movesFunds: false,
  approvesPublicTrading: false,
  approvesFullLaunch: false
}, null, 2));
