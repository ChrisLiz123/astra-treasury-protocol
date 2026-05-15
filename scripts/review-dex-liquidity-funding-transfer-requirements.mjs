import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const reportDir = path.join(root, "reports", "dex-liquidity-funding-transfer-requirements");
const reviewFile = path.join(reportDir, "dex-liquidity-funding-transfer-requirements-review.json");

const confirm = process.env.DEX_LIQUIDITY_FUNDING_TRANSFER_REQUIREMENTS_CONFIRM || "";
const sourceReference = process.env.DEX_LIQUIDITY_FUNDING_SOURCE_REFERENCE || "";
const sourceAddress = process.env.DEX_LIQUIDITY_FUNDING_SOURCE_ADDRESS || "";
const transferPolicy = process.env.DEX_LIQUIDITY_FUNDING_TRANSFER_POLICY || "transfer-only-calculated-shortfalls-no-surplus-no-public-trading";

const requiredConfirm = "REVIEW_DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_REQUIREMENTS_ONLY";

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readJsonPath(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function sha256Json(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value, null, 2) + "\n").digest("hex");
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

function formatRaw(value, decimals) {
  const raw = BigInt(String(value || "0"));
  const base = 10n ** BigInt(Number(decimals || 0));
  const whole = raw / base;
  const fraction = raw % base;

  if (fraction === 0n) return whole.toString();

  const fractionText = fraction.toString().padStart(Number(decimals || 0), "0").replace(/0+$/, "");
  return `${whole.toString()}.${fractionText}`;
}

function requireStatus(name, value, expected) {
  if (value !== expected) {
    issue(name, `Expected ${expected}, got ${value || "UNKNOWN"}.`);
  }
}

function existingOrEnv(envName, existingPath, fallback = "") {
  if (process.env[envName]) return process.env[envName];

  const existing = readJsonPath(reviewFile, null);

  if (!existing) return fallback;

  const parts = existingPath.split(".");
  let value = existing;

  for (const part of parts) {
    if (value === null || value === undefined) return fallback;
    value = value[part];
  }

  return value ?? fallback;
}

async function main() {
  fs.mkdirSync(reportDir, { recursive: true });

  const config = readJson("configs/dex-liquidity-funding-transfer-requirements.config.json");
  const fundingApproval = readJson("public-docs/dex-liquidity-treasury-funding-approval-status.json");
  const fundingApprovalRecord = readJson("reports/dex-liquidity-treasury-funding-approval/dex-liquidity-treasury-funding-approval-record.json");
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

  if (confirm !== requiredConfirm) {
    const existingConfirm = existingOrEnv("DEX_LIQUIDITY_FUNDING_TRANSFER_REQUIREMENTS_CONFIRM", "operatorReview.confirmation", "");
    if (existingConfirm !== requiredConfirm) {
      issue("DEX_LIQUIDITY_FUNDING_TRANSFER_REQUIREMENTS_CONFIRM", `Must equal ${requiredConfirm}.`);
    }
  }

  const finalSourceReference = sourceReference || existingOrEnv("DEX_LIQUIDITY_FUNDING_SOURCE_REFERENCE", "fundingSource.sourceReference", "");
  const finalSourceAddress = sourceAddress || existingOrEnv("DEX_LIQUIDITY_FUNDING_SOURCE_ADDRESS", "fundingSource.sourceAddress", "");
  const finalTransferPolicy = transferPolicy || existingOrEnv("DEX_LIQUIDITY_FUNDING_TRANSFER_POLICY", "fundingSource.transferPolicy", "");

  requireUsable("DEX_LIQUIDITY_FUNDING_SOURCE_REFERENCE", finalSourceReference);

  if (looksSensitive(finalSourceAddress)) {
    issue("DEX_LIQUIDITY_FUNDING_SOURCE_ADDRESS", "Source address appears to contain sensitive material.");
  }

  if (finalSourceAddress && !isAddress(finalSourceAddress)) {
    issue("DEX_LIQUIDITY_FUNDING_SOURCE_ADDRESS", "Funding source address must be a valid address if supplied.");
  }

  requireUsable("DEX_LIQUIDITY_FUNDING_TRANSFER_POLICY", finalTransferPolicy);

  if (config.reviewPrepared !== true || config.reviewOnly !== true) {
    issue("config", "Funding transfer requirements review must be prepared and review-only.");
  }

  requireStatus("fundingApproval.status", fundingApproval.status, "DEX_LIQUIDITY_TREASURY_FUNDING_APPROVED_NO_FUNDS_MOVED_NO_LIQUIDITY_ADDED");
  requireStatus("mintReviewStatus.status", mintReviewStatus.status, "DEX_LIQUIDITY_MINT_PARAMETER_REVIEW_COMPLETE_NO_PAYLOAD_NO_LIQUIDITY");
  requireStatus("tokenApproval.status", tokenApproval.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_REVIEW_COMPLETE_NO_APPROVALS_EXECUTED");
  requireStatus("liquidityApproval.status", liquidityApproval.status, "DEX_LIQUIDITY_PROVISION_APPROVED_NO_LIQUIDITY_ADDED_NO_FUNDS_MOVED");
  requireStatus("postExecution.status", postExecution.status, "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
  requireStatus("poolCreated.status", poolCreated.status, "DEX_POOL_CREATED_BY_SAFE_EXECUTION_NO_LIQUIDITY");

  if (fundingApproval.summary?.dexLiquidityTreasuryFundingApproved !== true) {
    issue("fundingApproval.summary.dexLiquidityTreasuryFundingApproved", "Scoped DEX liquidity treasury funding approval must be recorded.");
  }

  if (fundingApproval.summary?.additionalFundingRequiredBeforeLiquidity !== true) {
    issue("fundingApproval.summary.additionalFundingRequiredBeforeLiquidity", "This requirements review is only needed when additional funding is required.");
  }

  if (fundingApproval.summary?.fundingTransferPayloadGenerated !== false || fundingApproval.summary?.fundingTransferExecuted !== false || fundingApproval.summary?.treasuryFundsMoved !== false) {
    issue("fundingApproval.summary", "Funding approval must show no transfer payload, no transfer execution, and no treasury funds moved.");
  }

  if (mintReviewStatus.summary?.liquidityAdded !== false || mintReviewStatus.summary?.treasuryFundsMoved !== false || mintReviewStatus.summary?.publicTradingApproved !== false) {
    issue("mintReviewStatus.summary", "Mint review must show no liquidity, no treasury funds moved, and no public trading.");
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
      issue(file, "Forbidden funding/liquidity/public-trading artifact exists. Review must not move funds or add liquidity.");
    }
  }

  const balanceContext = mintReview.riskControls?.tokenBalanceAllowanceContext || [];
  const fundingRequirementsFromApproval = fundingApprovalRecord.fundingRequirements || [];

  if (!Array.isArray(balanceContext) || balanceContext.length < 2) {
    issue("mintReview.riskControls.tokenBalanceAllowanceContext", "Mint review must include token balance/allowance context for both tokens.");
  }

  const tokenTransferRequirements = [];

  if (Array.isArray(balanceContext)) {
    for (const item of balanceContext) {
      const desiredRaw = BigInt(String(item.desiredRaw || "0"));
      const safeBalanceRaw = BigInt(String(item.safeBalanceRaw || "0"));
      const deficitRaw = desiredRaw > safeBalanceRaw ? desiredRaw - safeBalanceRaw : 0n;
      const decimals = Number(item.decimals || 0);
      const fundingRecord = fundingRequirementsFromApproval.find((candidate) => String(candidate.tokenAddress || "").toLowerCase() === String(item.tokenAddress || "").toLowerCase()) || {};

      tokenTransferRequirements.push({
        role: item.role,
        symbol: item.symbol,
        tokenAddress: item.tokenAddress,
        decimals,
        desiredRaw: desiredRaw.toString(),
        desiredHuman: item.desiredHuman || formatRaw(desiredRaw.toString(), decimals),
        currentSafeBalanceRaw: safeBalanceRaw.toString(),
        currentSafeBalanceHuman: item.safeBalanceHuman || formatRaw(safeBalanceRaw.toString(), decimals),
        shortfallRaw: deficitRaw.toString(),
        shortfallHuman: formatRaw(deficitRaw.toString(), decimals),
        fundingTransferRequiredForThisToken: deficitRaw > 0n,
        currentAllowanceRaw: item.currentAllowanceRaw || fundingRecord.currentAllowanceRaw || "0",
        currentAllowanceHuman: item.currentAllowanceHuman || fundingRecord.currentAllowanceHuman || "0",
        approvalRequiredForThisToken: item.allowanceCurrentlyCoversDesired !== true,
        fundingTransferPayloadGenerated: false,
        fundingTransferExecuted: false
      });
    }
  }

  const tokensRequiringFunding = tokenTransferRequirements.filter((item) => item.fundingTransferRequiredForThisToken);
  const anyFundingRequired = tokensRequiringFunding.length > 0;

  if (!anyFundingRequired) {
    issue("fundingRequirements", "Funding approval indicated additional funding required, but no token shortfall was calculated.");
  }

  const destinationSafeAddress =
    mintReview.mintParameters?.recipient ||
    fundingApprovalRecord.safeAddress ||
    tokenApproval.summary?.safeAddress ||
    "";

  if (!isAddress(destinationSafeAddress) || isZeroAddress(destinationSafeAddress)) {
    issue("destinationSafeAddress", "Destination Safe address must be valid.");
  }

  const status = issues.length === 0
    ? "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_REQUIREMENTS_REVIEW_COMPLETE_NO_FUNDS_MOVED"
    : "DEX_LIQUIDITY_TREASURY_FUNDING_TRANSFER_REQUIREMENTS_REVIEW_REQUIRED";

  const review = {
    schema: "astra-dex-liquidity-funding-transfer-requirements-review-v0.1",
    generatedAt: new Date().toISOString(),
    status,
    currentApprovedMode: "restricted-mainnet-operation",
    selectedPublicPurchasePath: "dex-liquidity-pool-trading",
    reviewOnly: true,
    operatorReview: {
      confirmation: requiredConfirm
    },
    poolContext: {
      poolAddress: fundingApproval.summary?.poolAddress || postExecution.summary?.poolAddress || poolCreated.poolAddress || "",
      poolLiquidity: fundingApproval.summary?.poolLiquidity || postExecution.summary?.poolLiquidity || "0",
      poolVerified: postExecution.summary?.poolVerified === true,
      liquidityVerifiedZero: postExecution.summary?.liquidityVerifiedZero === true
    },
    fundingSource: {
      sourceReference: finalSourceReference,
      sourceAddress: finalSourceAddress,
      sourceAddressProvided: isAddress(finalSourceAddress),
      sourceAddressRequiredBeforePayloadGeneration: !isAddress(finalSourceAddress),
      transferPolicy: finalTransferPolicy
    },
    fundingDestination: {
      destinationRole: "DEX liquidity Safe",
      destinationSafeAddress,
      destinationPurpose: "Fund reviewed Uniswap v3 liquidity mint amounts"
    },
    fundingTransferRequirements: {
      additionalFundingRequiredBeforeLiquidity: anyFundingRequired,
      tokensRequiringFundingCount: tokensRequiringFunding.length,
      tokenTransferRequirements,
      fundingTransferPayloadGenerated: false,
      fundingTransferSafePayloadGenerated: false,
      fundingTransferSubmitted: false,
      fundingTransferExecuted: false,
      treasuryFundsMoved: false
    },
    requiredBeforeFundingTransferApproval: {
      fundingTransferRequirementsReviewed: issues.length === 0,
      fundingSourceReviewed: issues.length === 0,
      fundingDestinationReviewed: issues.length === 0,
      fundingShortfallsCalculated: issues.length === 0,
      fundingTransferApprovalRecorded: false,
      fundingTransferPayloadGenerationApprovalRecorded: false,
      safeOwnersAndThresholdReviewed: true,
      operatorFundingCommandReviewed: false,
      publicStatusUpdatePrepared: false
    },
    flags: {
      fundingTransferRequirementsReviewed: issues.length === 0,
      fundingSourceReviewed: issues.length === 0,
      fundingDestinationReviewed: issues.length === 0,
      fundingShortfallsCalculated: issues.length === 0,
      fundingTransferPayloadGenerated: false,
      fundingTransferSafePayloadGenerated: false,
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
      globalTreasuryFundingApproved: false,
      globalTreasuryFundingExecuted: false,
      publicTradingApproved: false,
      publicTradingLinkApproved: false,
      buyPageActivated: false,
      fullLaunchApproved: false
    },
    safety: {
      reviewOnly: true,
      generatesFundingTransferCalldata: false,
      generatesSafePayload: false,
      movesTreasuryFunds: false,
      executesTokenApproval: false,
      addsLiquidity: false,
      mintsPosition: false,
      activatesBuyPage: false,
      approvesPublicTrading: false,
      approvesFullLaunch: false
    },
    issues
  };

  review.reviewHash = sha256Json(review);

  writeJson(reviewFile, review);

  console.log(JSON.stringify({
    schema: "astra-dex-liquidity-funding-transfer-requirements-review-result-v0.1",
    checkedAt: review.generatedAt,
    status,
    poolAddress: review.poolContext.poolAddress,
    destinationSafeAddress,
    sourceReference: finalSourceReference,
    sourceAddressProvided: review.fundingSource.sourceAddressProvided,
    tokensRequiringFundingCount: tokensRequiringFunding.length,
    fundingTransferPayloadGenerated: false,
    fundingTransferExecuted: false,
    tokenApprovalExecuted: false,
    liquidityAdded: false,
    positionMinted: false,
    treasuryFundsMoved: false,
    publicTradingApproved: false,
    fullLaunchApproved: false,
    issues
  }, null, 2));

  if (issues.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
