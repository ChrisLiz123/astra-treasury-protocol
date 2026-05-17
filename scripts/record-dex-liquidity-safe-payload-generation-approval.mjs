import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const confirm = process.env.DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATION_APPROVAL_CONFIRM || "";
const approver = process.env.DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATION_APPROVER || "";
const approvalReference = process.env.DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATION_APPROVAL_REFERENCE || "";
const overwrite = process.env.OVERWRITE_DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATION_APPROVAL || "";

const requiredConfirm = "APPROVE_DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATION_ONLY_NOT_SUBMISSION_OR_EXECUTION";

const recordDir = path.join(root, "reports", "dex-liquidity-safe-payload-generation-approval");
const recordFile = path.join(recordDir, "dex-liquidity-safe-payload-generation-approval-record.json");
const configFile = path.join(root, "configs", "dex-liquidity-safe-payload-generation-approval.config.json");

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
  issue("DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATION_APPROVAL_CONFIRM", `Must equal ${requiredConfirm}.`);
}

requireUsable("DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATION_APPROVER", approver);
requireUsable("DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATION_APPROVAL_REFERENCE", approvalReference);

if (fs.existsSync(recordFile) && overwrite !== "YES") {
  issue(
    "OVERWRITE_DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATION_APPROVAL",
    "Approval record already exists. Set OVERWRITE_DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATION_APPROVAL=YES only if replacing intentionally."
  );
}

const verificationStatus = readJson("public-docs/dex-liquidity-mint-calldata-verification-status.json");
const verification = readJson("reports/dex-liquidity-mint-calldata-verification/dex-liquidity-mint-calldata-verification.json");
const calldataStatus = readJson("public-docs/dex-liquidity-mint-calldata-status.json");
const calldata = readJson("reports/dex-liquidity-provision/payload/liquidity-mint-calldata.json");
const approvalStatus = readJson("public-docs/dex-liquidity-mint-calldata-generation-approval-status.json");
const allowanceStatus = readJson("public-docs/dex-liquidity-token-approval-post-execution-allowances-status.json");
const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
const fullLaunch = readJson("public-docs/full-launch-status.json");
const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const execution = readJson("public-docs/mainnet-execution-status.json");

if (verificationStatus.status !== "DEX_LIQUIDITY_MINT_CALLDATA_VERIFIED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
  issue("verificationStatus.status", "Liquidity mint calldata verification must be complete.");
}

if (verificationStatus.summary?.liquidityMintCalldataVerified !== true) {
  issue("verificationStatus.summary.liquidityMintCalldataVerified", "Calldata must be verified.");
}

if (verificationStatus.summary?.calldataHashVerified !== true || verificationStatus.summary?.calldataArtifactHashVerified !== true || verificationStatus.summary?.decodedMintParamsVerified !== true) {
  issue("verificationStatus.summary.hashDecodeFlags", "Calldata hash, artifact hash, and decoded params must verify.");
}

if (verificationStatus.summary?.nftManagerCodePresent !== true || verificationStatus.summary?.poolLiquidityVerifiedZero !== true) {
  issue("verificationStatus.summary.liveChecks", "NPM code and zero pool liquidity must verify.");
}

if (verificationStatus.summary?.liquiditySafePayloadGenerated !== false || verificationStatus.summary?.liquidityAdded !== false || verificationStatus.summary?.publicTradingApproved !== false || verificationStatus.summary?.fullLaunchApproved !== false) {
  issue("verificationStatus.summary.restrictions", "Safe payload, liquidity, public trading, and full launch must remain false.");
}

if (verification.status !== "DEX_LIQUIDITY_MINT_CALLDATA_VERIFIED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
  issue("verification.status", "Verification record must be complete.");
}

if (verification.liquidityMintCalldataVerified !== true || verification.liquidityMintCalldataGenerated !== true) {
  issue("verification.calldataFlags", "Verification record must show calldata generated and verified.");
}

if (verification.liveChecks?.token0?.balanceCoversDesired !== true || verification.liveChecks?.token0?.allowanceCoversDesired !== true) {
  issue("verification.liveChecks.token0", "Token0 live balance and allowance must cover desired amount.");
}

if (verification.liveChecks?.token1?.balanceCoversDesired !== true || verification.liveChecks?.token1?.allowanceCoversDesired !== true) {
  issue("verification.liveChecks.token1", "Token1 live balance and allowance must cover desired amount.");
}

if (calldataStatus.status !== "DEX_LIQUIDITY_MINT_CALLDATA_GENERATED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
  issue("calldataStatus.status", "Mint calldata generation status must be complete.");
}

if (calldata.status !== "DEX_LIQUIDITY_MINT_CALLDATA_GENERATED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
  issue("calldata.status", "Mint calldata artifact status must be generated.");
}

if (calldata.calldataHash !== verification.calldataHash) {
  issue("calldata.calldataHash", "Calldata hash must match verification record.");
}

if (!isAddress(calldata.liquiditySafeAddress) || !isAddress(calldata.nonfungiblePositionManager)) {
  issue("calldata.addresses", "Liquidity Safe and NonfungiblePositionManager must be valid.");
}

if (approvalStatus.status !== "DEX_LIQUIDITY_MINT_CALLDATA_GENERATION_APPROVED_NO_CALLDATA_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
  issue("approvalStatus.status", "Mint calldata generation approval must be recorded.");
}

if (allowanceStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_POST_EXECUTION_ALLOWANCES_VERIFIED_APPROVALS_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
  issue("allowanceStatus.status", "Token approval post-execution allowances must be verified.");
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
  "reports/dex-liquidity-provision/payload/liquidity-safe-payload.json",
  "reports/dex-liquidity-provision/live/liquidity-added.json",
  "reports/dex-liquidity-provision/live/position-minted.json",
  "public-docs/dex-liquidity-safe-payload-status.json",
  "public-docs/dex-liquidity-added-status.json",
  "public-docs/dex-public-trading-live-status.json"
];

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden liquidity Safe payload/liquidity/public-trading artifact exists. Approval milestone must not generate payload or add liquidity.");
  }
}

if (issues.length > 0) {
  console.log(JSON.stringify({
    schema: "astra-dex-liquidity-safe-payload-generation-approval-result-v0.1",
    checkedAt: new Date().toISOString(),
    status: "STOP_DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATION_NOT_APPROVED",
    issues
  }, null, 2));
  process.exit(1);
}

fs.mkdirSync(recordDir, { recursive: true });

const recordedAt = new Date().toISOString();

const record = {
  schema: "astra-dex-liquidity-safe-payload-generation-approval-record-v0.1",
  recordedAt,
  status: "DEX_LIQUIDITY_SAFE_PAYLOAD_GENERATION_APPROVED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING",
  approvalScope: "liquidity-safe-payload-generation-only-no-submission-no-execution-no-liquidity",
  selectedPublicPurchasePath: "dex-liquidity-pool-trading",
  approver,
  approvalReference,
  liquiditySafeAddress: verification.liquiditySafeAddress,
  nonfungiblePositionManager: verification.nonfungiblePositionManager,
  poolAddress: verification.poolAddress,
  calldataHash: verification.calldataHash,
  calldataArtifactHash: verification.calldataArtifactHash,
  verificationHash: verification.verificationHash,
  calldataReference: "reports/dex-liquidity-provision/payload/liquidity-mint-calldata.json",
  calldataVerificationReference: "public-docs/dex-liquidity-mint-calldata-verification-status.json",
  tokenApprovalAllowanceReference: "public-docs/dex-liquidity-token-approval-post-execution-allowances-status.json",
  mintParams: verification.mintParams,
  liveChecks: verification.liveChecks,
  liquiditySafePayloadGenerationApprovalRecorded: true,
  liquiditySafePayloadGenerationApproved: true,
  liquidityMintCalldataGenerated: true,
  liquidityMintCalldataVerified: true,
  liquidityMintCalldataHashVerified: true,
  liquidityMintCalldataDecoded: true,
  nonfungiblePositionManagerVerified: true,
  liveBalancesVerified: true,
  liveAllowancesVerified: true,
  poolLiquidityStillZero: true,
  tokenApprovalExecuted: true,
  allRequiredAllowancesAvailable: true,
  allRequiredBalancesAvailable: true,
  liquiditySafePayloadGenerated: false,
  liquiditySafeTransactionSubmitted: false,
  liquiditySafeTransactionExecuted: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  publicTradingLinkApproved: false,
  buyPageActivated: false,
  fullLaunchApproved: false,
  requiredBeforeLiquiditySafePayloadGeneration: {
    liquiditySafePayloadGenerationApprovalRecorded: true,
    liquidityMintCalldataGenerated: true,
    liquidityMintCalldataVerified: true,
    liquidityMintCalldataHashVerified: true,
    liveBalancesVerified: true,
    liveAllowancesVerified: true,
    poolLiquidityStillZero: true,
    liquiditySafePayloadGenerated: false,
    liquidityAdded: false,
    operatorSafePayloadGenerationCommandReviewed: false,
    publicStatusUpdatePrepared: false
  },
  safety: {
    approvalOnly: true,
    generatesLiquiditySafePayload: false,
    submitsLiquiditySafeTransaction: false,
    executesLiquiditySafeTransaction: false,
    addsLiquidity: false,
    mintsPositionOnchain: false,
    activatesBuyPage: false,
    approvesPublicTrading: false,
    approvesFullLaunch: false
  }
};

writeJson(recordFile, record);

const config = readJsonPath(configFile);

config.status = "liquidity-safe-payload-generation-approved-no-safe-payload-no-liquidity-no-public-trading";
config.liquiditySafePayloadGenerationApprovalRecorded = true;
config.liquiditySafePayloadGenerationApproved = true;
config.liquidityMintCalldataGenerated = true;
config.liquidityMintCalldataVerified = true;
config.tokenApprovalExecuted = true;
config.allRequiredAllowancesAvailable = true;
config.allRequiredBalancesAvailable = true;
config.poolLiquidityVerifiedZero = true;
config.liquiditySafePayloadGenerated = false;
config.liquiditySafeTransactionSubmitted = false;
config.liquiditySafeTransactionExecuted = false;
config.liquidityAdded = false;
config.positionMinted = false;
config.publicTradingApproved = false;
config.publicTradingLinkApproved = false;
config.buyPageActivationApproved = false;
config.fullLaunchApproved = false;
config.approvedLiquiditySafePayloadGeneration = {
  recordedAt,
  approver,
  approvalReference,
  liquiditySafeAddress: record.liquiditySafeAddress,
  nonfungiblePositionManager: record.nonfungiblePositionManager,
  calldataHash: record.calldataHash,
  verificationHash: record.verificationHash,
  recordFile: "reports/dex-liquidity-safe-payload-generation-approval/dex-liquidity-safe-payload-generation-approval-record.json"
};

writeJson(configFile, config);

console.log(JSON.stringify({
  schema: "astra-dex-liquidity-safe-payload-generation-approval-result-v0.1",
  checkedAt: recordedAt,
  status: record.status,
  liquiditySafeAddress: record.liquiditySafeAddress,
  nonfungiblePositionManager: record.nonfungiblePositionManager,
  calldataHash: record.calldataHash,
  liquiditySafePayloadGenerationApproved: true,
  liquiditySafePayloadGenerated: false,
  liquidityAdded: false,
  positionMinted: false,
  publicTradingApproved: false,
  fullLaunchApproved: false
}, null, 2));
