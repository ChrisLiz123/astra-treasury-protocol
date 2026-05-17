import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const calldataRelativePath = "reports/dex-liquidity-provision/payload/liquidity-mint-calldata.json";
const generationReportRelativePath = "reports/dex-liquidity-mint-calldata/dex-liquidity-mint-calldata-generation.json";

const requiredFiles = [
  "configs/dex-liquidity-mint-calldata.config.json",
  "docs/dex-liquidity-mint-calldata/DEX_LIQUIDITY_MINT_CALLDATA.md",
  "docs/dex-liquidity-mint-calldata/DEX_LIQUIDITY_MINT_CALLDATA_CHECKLIST.md",
  "docs/dex-liquidity-mint-calldata/DEX_LIQUIDITY_MINT_CALLDATA_BOUNDARIES.md",
  "docs/dex-liquidity-mint-calldata/DEX_LIQUIDITY_MINT_CALLDATA_RUNBOOK.md",
  "scripts/generate-dex-liquidity-mint-calldata.mjs",
  calldataRelativePath,
  generationReportRelativePath,
  "public-docs/dex-liquidity-mint-calldata-generation-approval-status.json",
  "reports/dex-liquidity-mint-calldata-generation-approval/dex-liquidity-mint-calldata-generation-approval-record.json",
  "public-docs/dex-liquidity-token-approval-post-execution-allowances-status.json",
  "reports/dex-liquidity-token-approval-post-execution-allowances/dex-liquidity-token-approval-post-execution-allowances.json",
  "public-docs/dex-pool-creation-post-execution-verification-status.json",
  "public-docs/full-launch-status.json",
  "public-docs/treasury-funding-status.json",
  "public-docs/capability-matrix-status.json",
  "public-docs/mainnet-execution-status.json"
];

const forbiddenFiles = [
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

function sameAddress(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required liquidity mint calldata generation file.");
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    issue(file, "Forbidden liquidity/public-trading artifact exists. Calldata generation must not add liquidity or enable trading.");
  }
}

if (issues.length === 0) {
  const config = readJson("configs/dex-liquidity-mint-calldata.config.json");
  const calldata = readJson(calldataRelativePath);
  const generationReport = readJson(generationReportRelativePath);
  const approvalStatus = readJson("public-docs/dex-liquidity-mint-calldata-generation-approval-status.json");
  const allowanceStatus = readJson("public-docs/dex-liquidity-token-approval-post-execution-allowances-status.json");
  const allowanceReport = readJson("reports/dex-liquidity-token-approval-post-execution-allowances/dex-liquidity-token-approval-post-execution-allowances.json");
  const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.generationOnly !== true) {
    issue("config.generationOnly", "Config must be generation-only.");
  }

  if (config.liquidityMintCalldataGenerated !== true) {
    issue("config.liquidityMintCalldataGenerated", "Config must show calldata generated.");
  }

  if (calldata.schema !== "astra-dex-liquidity-mint-calldata-v0.1") {
    issue("calldata.schema", "Invalid calldata artifact schema.");
  }

  if (calldata.status !== "DEX_LIQUIDITY_MINT_CALLDATA_GENERATED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("calldata.status", `Unexpected calldata status: ${calldata.status}`);
  }

  if (!isAddress(calldata.liquiditySafeAddress) || !isAddress(calldata.nonfungiblePositionManager) || !isAddress(calldata.target)) {
    issue("calldata.addresses", "Liquidity Safe, NonfungiblePositionManager, and target must be valid.");
  }

  if (!sameAddress(calldata.nonfungiblePositionManager, calldata.target)) {
    issue("calldata.target", "Target must equal NonfungiblePositionManager.");
  }

  if (String(calldata.value) !== "0" || calldata.operation !== "CALL" || calldata.operationValue !== 0) {
    issue("calldata.call", "Calldata artifact must be CALL with value 0.");
  }

  if (calldata.functionSelector !== "0x88316456") {
    issue("calldata.functionSelector", "Mint selector must be 0x88316456.");
  }

  if (!String(calldata.calldata || "").startsWith("0x88316456")) {
    issue("calldata.calldata", "Calldata must start with mint selector 0x88316456.");
  }

  if (String(calldata.calldata || "").replace(/^0x/i, "").length !== 8 + (64 * 11)) {
    issue("calldata.calldata.length", "Mint calldata length must match static mint tuple encoding.");
  }

  const params = calldata.mintParams || {};
  const decoded = calldata.decodedMintParams || {};

  for (const key of ["token0", "token1", "recipient"]) {
    if (!isAddress(params[key]) || !sameAddress(params[key], decoded[key])) {
      issue(`mintParams.${key}`, `${key} must be valid and match decoded calldata.`);
    }
  }

  for (const key of ["fee", "tickLower", "tickUpper", "amount0Desired", "amount1Desired", "amount0Min", "amount1Min", "deadline"]) {
    if (String(params[key]) !== String(decoded[key])) {
      issue(`mintParams.${key}`, `${key} must match decoded calldata.`);
    }
  }

  if (BigInt(params.amount0Desired || "0") <= 0n || BigInt(params.amount1Desired || "0") <= 0n) {
    issue("mintParams.amounts", "Desired amounts must be positive.");
  }

  if (BigInt(params.amount0Min || "0") > BigInt(params.amount0Desired || "0")) {
    issue("mintParams.amount0Min", "amount0Min must not exceed amount0Desired.");
  }

  if (BigInt(params.amount1Min || "0") > BigInt(params.amount1Desired || "0")) {
    issue("mintParams.amount1Min", "amount1Min must not exceed amount1Desired.");
  }

  if (Number(params.tickLower) >= Number(params.tickUpper)) {
    issue("mintParams.ticks", "tickLower must be less than tickUpper.");
  }

  if (calldata.readinessChecks?.tokenApprovalExecuted !== true && allowanceStatus.summary?.tokenApprovalExecuted !== true) {
    issue("readiness.tokenApprovalExecuted", "Token approvals must be executed.");
  }

  if (calldata.readinessChecks?.allRequiredAllowancesAvailable !== true && allowanceStatus.summary?.allRequiredAllowancesAvailable !== true) {
    issue("readiness.allowances", "Required allowances must be available.");
  }

  if (calldata.readinessChecks?.token0?.balanceCoversDesired !== true || calldata.readinessChecks?.token0?.allowanceCoversDesired !== true) {
    issue("readiness.token0", "Token0 balance and allowance must cover desired amount.");
  }

  if (calldata.readinessChecks?.token1?.balanceCoversDesired !== true || calldata.readinessChecks?.token1?.allowanceCoversDesired !== true) {
    issue("readiness.token1", "Token1 balance and allowance must cover desired amount.");
  }

  if (String(calldata.poolLiquidityBeforeCalldataGeneration || "") !== "0") {
    issue("calldata.poolLiquidityBeforeCalldataGeneration", "Pool liquidity must be zero before calldata generation.");
  }

  for (const key of [
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
    if (calldata.flags?.[key] !== false) {
      issue(`calldata.flags.${key}`, `${key} must remain false.`);
    }
  }

  if (approvalStatus.status !== "DEX_LIQUIDITY_MINT_CALLDATA_GENERATION_APPROVED_NO_CALLDATA_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("approvalStatus.status", "Calldata generation approval must be recorded.");
  }

  if (allowanceStatus.status !== "DEX_LIQUIDITY_TOKEN_APPROVAL_POST_EXECUTION_ALLOWANCES_VERIFIED_APPROVALS_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING") {
    issue("allowanceStatus.status", "Post-execution allowances must be verified.");
  }

  if (!sameAddress(allowanceReport.liquiditySafeAddress, calldata.liquiditySafeAddress)) {
    issue("allowanceReport.liquiditySafeAddress", "Allowance report liquidity Safe must match calldata artifact.");
  }

  if (!sameAddress(allowanceReport.approvalSpender, calldata.nonfungiblePositionManager)) {
    issue("allowanceReport.approvalSpender", "Allowance report approval spender must match NonfungiblePositionManager.");
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

  if (generationReport.status !== calldata.status || generationReport.calldataHash !== calldata.calldataHash) {
    issue("generationReport", "Generation report must match calldata status and hash.");
  }
}

const result = {
  schema: "astra-dex-liquidity-mint-calldata-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  calldataFile: calldataRelativePath,
  generationReportFile: generationReportRelativePath,
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
