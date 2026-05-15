import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const reportDir = path.join(root, "reports", "dex-liquidity-token-approval-requirements");
const reviewFile = path.join(reportDir, "dex-liquidity-token-approval-requirements-review.json");

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function sha256Json(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value, null, 2) + "\n").digest("hex");
}

function readRuntimeEnvValue(key) {
  const runtimeFile = path.join(root, ".runtime", "mainnet-monitor.env");

  if (!fs.existsSync(runtimeFile)) return "";

  const lines = fs.readFileSync(runtimeFile, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const [rawKey, ...rest] = trimmed.split("=");

    if (rawKey.trim() === key) {
      return rest.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }

  return "";
}

function normalizeAddress(value) {
  return String(value || "").trim();
}

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || "").trim());
}

function sameAddress(a, b) {
  return normalizeAddress(a).toLowerCase() === normalizeAddress(b).toLowerCase();
}

function encodeAddress(value) {
  return normalizeAddress(value).replace(/^0x/i, "").toLowerCase().padStart(64, "0");
}

function decodeUint(value) {
  const clean = String(value || "").replace(/^0x/i, "").padStart(64, "0");
  return BigInt(`0x${clean}`);
}

function isNonEmptyCode(value) {
  return typeof value === "string" && value !== "0x" && value.length > 2;
}

function normalizeKey(key) {
  return String(key || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function collectValuesByKey(value, keyPatterns, results = []) {
  if (value === null || value === undefined) return results;

  if (Array.isArray(value)) {
    for (const item of value) collectValuesByKey(item, keyPatterns, results);
    return results;
  }

  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const normalized = normalizeKey(key);

      if (keyPatterns.some((pattern) => normalized.includes(pattern))) {
        if (typeof child === "string" || typeof child === "number") {
          results.push(String(child));
        }
      }

      collectValuesByKey(child, keyPatterns, results);
    }
  }

  return results;
}

function parseHumanAmountToRaw(value, decimals) {
  const raw = String(value || "").trim();

  if (!raw) return "";

  const numeric = raw
    .replace(/,/g, "")
    .replace(/[A-Za-z_%/$()]/g, "")
    .trim();

  if (!/^\d+(\.\d+)?$/.test(numeric)) return "";

  const [whole, fraction = ""] = numeric.split(".");
  const padded = (fraction + "0".repeat(decimals)).slice(0, decimals);
  const combined = `${whole}${padded}`.replace(/^0+/, "") || "0";

  return BigInt(combined).toString();
}

function formatRaw(value, decimals) {
  const raw = BigInt(String(value || "0"));
  const base = 10n ** BigInt(decimals);
  const whole = raw / base;
  const fraction = raw % base;

  if (fraction === 0n) return whole.toString();

  const fractionText = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole.toString()}.${fractionText}`;
}

async function rpcCall(rpcUrl, method, params) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params
    })
  });

  if (!response.ok) {
    throw new Error(`RPC HTTP ${response.status}`);
  }

  const body = await response.json();

  if (body.error) {
    throw new Error(body.error.message || JSON.stringify(body.error));
  }

  return body.result;
}

async function readDecimals(rpcUrl, token) {
  const result = await rpcCall(rpcUrl, "eth_call", [
    {
      to: token,
      data: "0x313ce567"
    },
    "latest"
  ]);

  return Number(decodeUint(result));
}

async function readBalance(rpcUrl, token, owner) {
  const result = await rpcCall(rpcUrl, "eth_call", [
    {
      to: token,
      data: "0x70a08231" + encodeAddress(owner)
    },
    "latest"
  ]);

  return decodeUint(result).toString();
}

async function readAllowance(rpcUrl, token, owner, spender) {
  const result = await rpcCall(rpcUrl, "eth_call", [
    {
      to: token,
      data: "0xdd62ed3e" + encodeAddress(owner) + encodeAddress(spender)
    },
    "latest"
  ]);

  return decodeUint(result).toString();
}

function requireStatus(name, value, expected) {
  if (value !== expected) {
    issue(name, `Expected ${expected}, got ${value || "UNKNOWN"}.`);
  }
}

async function main() {
  fs.mkdirSync(reportDir, { recursive: true });

  const config = readJson("configs/dex-liquidity-token-approval-requirements.config.json");
  const liquidityApproval = readJson("public-docs/dex-liquidity-provision-approval-status.json");
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
  const payload = readJson("reports/dex-pool-creation-safe-payload-generation/generated/dex-pool-creation-safe-payload.json");
  const factoryRouter = readJson("reports/dex-pool-creation-factory-router-review/dex-pool-creation-factory-router-review.json");

  if (config.reviewPrepared !== true || config.reviewOnly !== true) {
    issue("config", "Token approval requirements review must be prepared and review-only.");
  }

  requireStatus("liquidityApproval.status", liquidityApproval.status, "DEX_LIQUIDITY_PROVISION_APPROVED_NO_LIQUIDITY_ADDED_NO_FUNDS_MOVED");
  requireStatus("postExecution.status", postExecution.status, "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
  requireStatus("executionLive.status", executionLive.status, "DEX_POOL_CREATION_SAFE_EXECUTION_LIVE_RECORDED_POOL_CREATED_NO_LIQUIDITY");
  requireStatus("poolCreated.status", poolCreated.status, "DEX_POOL_CREATED_BY_SAFE_EXECUTION_NO_LIQUIDITY");
  requireStatus("parameterApproval.status", parameterApproval.status, "DEX_LIQUIDITY_PARAMETERS_APPROVED_NO_POOL_NO_LIQUIDITY");
  requireStatus("sourceSafeImpact.status", sourceSafeImpact.status, "DEX_LIQUIDITY_SOURCE_SAFE_IMPACT_APPROVED_NO_FUNDS_NO_SAFE_PAYLOAD");

  if (parameterSelection.status !== "DEX_LIQUIDITY_PARAMETER_SELECTION_IMPORTED_NOT_APPROVED" || parameterSelection.summary?.selectionValid !== true) {
    issue("parameterSelection.status", "Valid imported liquidity parameter selection is required.");
  }

  if (postExecution.summary?.liquidityVerifiedZero !== true || String(postExecution.summary?.poolLiquidity || "") !== "0") {
    issue("postExecution.summary.poolLiquidity", "Pool liquidity must remain zero.");
  }

  if (liquidityApproval.summary?.liquidityAdded !== false || liquidityApproval.summary?.treasuryFundsMoved !== false || liquidityApproval.summary?.publicTradingApproved !== false) {
    issue("liquidityApproval.summary", "Liquidity approval must show no liquidity, no treasury funds moved, and no public trading.");
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
      issue(file, "Forbidden liquidity/public-trading artifact exists. Review must not add liquidity or enable trading.");
    }
  }

  const rpcUrl =
    process.env.DEX_LIQUIDITY_APPROVAL_REVIEW_RPC_URL ||
    process.env.DEX_POST_EXECUTION_RPC_URL ||
    process.env.DEX_SAFE_EXECUTION_RPC_URL ||
    process.env.MAINNET_MONITOR_RPC_URL ||
    readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

  if (!String(rpcUrl || "").startsWith("https://")) {
    issue("DEX_LIQUIDITY_APPROVAL_REVIEW_RPC_URL", "RPC URL must be available and start with https://.");
  }

  const safeAddress = payload.safeAddress || executionLive.safeExecutionLive?.record?.safeAddress || "";
  const spender = factoryRouter.intendedExecutionPath?.targetAddress || factoryRouter.uniswapContracts?.nonfungiblePositionManager || "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1";

  const tokens = [
    {
      role: "token0",
      symbol: payload.transaction?.parameters?.token0Symbol || poolCreated.token0Symbol || "",
      address: payload.transaction?.parameters?.token0 || poolCreated.token0 || "",
      plannedHumanAmountPatterns: [
        "liquidityamounttoken0",
        "token0amount",
        "amounttoken0"
      ]
    },
    {
      role: "token1",
      symbol: payload.transaction?.parameters?.token1Symbol || poolCreated.token1Symbol || "",
      address: payload.transaction?.parameters?.token1 || poolCreated.token1 || "",
      plannedHumanAmountPatterns: [
        "liquidityamounttoken1",
        "token1amount",
        "amounttoken1"
      ]
    }
  ];

  for (const token of tokens) {
    const symbolKey = normalizeKey(token.symbol);

    if (symbolKey.includes("astra")) {
      token.plannedHumanAmountPatterns.push("liquidityamountastra", "astraamount", "amountastra", "liquidityastra");
    }

    if (symbolKey.includes("usdc") || symbolKey.includes("counter")) {
      token.plannedHumanAmountPatterns.push("liquidityamountcounterasset", "counterassetamount", "amountcounterasset", "liquidityamountusdc", "usdcamount", "amountusdc");
    }

    const envKey = token.symbol?.toUpperCase() === "ASTRA"
      ? "DEX_LIQUIDITY_REQUIRED_ASTRA_AMOUNT_RAW"
      : token.symbol?.toUpperCase() === "USDC"
        ? "DEX_LIQUIDITY_REQUIRED_COUNTER_ASSET_AMOUNT_RAW"
        : "";

    if (envKey && process.env[envKey]) {
      token.requiredRawOverride = process.env[envKey];
    }
  }

  if (!isAddress(safeAddress)) {
    issue("safeAddress", "Safe address must be valid.");
  }

  if (!isAddress(spender)) {
    issue("spender", "NonfungiblePositionManager spender address must be valid.");
  }

  for (const token of tokens) {
    if (!isAddress(token.address)) {
      issue(`${token.role}.address`, `${token.role} address must be valid.`);
    }
  }

  let tokenReviews = [];

  if (issues.length === 0) {
    try {
      const spenderCode = await rpcCall(rpcUrl, "eth_getCode", [spender, "latest"]);

      if (!isNonEmptyCode(spenderCode)) {
        issue("spender.code", "NonfungiblePositionManager spender has no contract code.");
      }

      for (const token of tokens) {
        const tokenCode = await rpcCall(rpcUrl, "eth_getCode", [token.address, "latest"]);

        if (!isNonEmptyCode(tokenCode)) {
          issue(`${token.role}.code`, `${token.role} token has no contract code.`);
        }

        const decimals = await readDecimals(rpcUrl, token.address);
        const balanceRaw = await readBalance(rpcUrl, token.address, safeAddress);
        const allowanceRaw = await readAllowance(rpcUrl, token.address, safeAddress, spender);

        const plannedCandidates = collectValuesByKey(parameterSelection, token.plannedHumanAmountPatterns);
        const plannedHumanAmount = plannedCandidates[0] || "";
        const plannedRawAmount = token.requiredRawOverride || parseHumanAmountToRaw(plannedHumanAmount, decimals);

        const hasPlannedRawAmount = /^\d+$/.test(String(plannedRawAmount || ""));
        const allowanceCoversPlanned = hasPlannedRawAmount
          ? BigInt(allowanceRaw) >= BigInt(plannedRawAmount)
          : false;

        const balanceCoversPlanned = hasPlannedRawAmount
          ? BigInt(balanceRaw) >= BigInt(plannedRawAmount)
          : false;

        tokenReviews.push({
          role: token.role,
          symbol: token.symbol,
          tokenAddress: token.address,
          tokenCodePresent: isNonEmptyCode(tokenCode),
          decimals,
          safeAddress,
          approvalSpenderRole: "Uniswap v3 NonfungiblePositionManager",
          approvalSpenderAddress: spender,
          balanceRaw,
          balanceHuman: formatRaw(balanceRaw, decimals),
          currentAllowanceRaw: allowanceRaw,
          currentAllowanceHuman: formatRaw(allowanceRaw, decimals),
          plannedHumanAmount,
          plannedRawAmount: hasPlannedRawAmount ? plannedRawAmount : "",
          plannedAmountKnown: hasPlannedRawAmount,
          balanceCoversPlanned,
          allowanceCoversPlanned,
          tokenApprovalLikelyRequiredForLaterMint: hasPlannedRawAmount ? !allowanceCoversPlanned : true,
          approvalPayloadGenerated: false,
          approvalExecuted: false
        });
      }
    } catch (error) {
      issue("rpc", error.message);
    }
  }

  const approvalsLikelyRequired = tokenReviews.some((item) => item.tokenApprovalLikelyRequiredForLaterMint === true);

  const status = issues.length === 0
    ? "DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_REVIEW_COMPLETE_NO_APPROVALS_EXECUTED"
    : "DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_REVIEW_REQUIRED";

  const review = {
    schema: "astra-dex-liquidity-token-approval-requirements-review-v0.1",
    generatedAt: new Date().toISOString(),
    status,
    currentApprovedMode: "restricted-mainnet-operation",
    selectedPublicPurchasePath: "dex-liquidity-pool-trading",
    reviewOnly: true,
    poolContext: {
      poolAddress: postExecution.summary?.poolAddress || poolCreated.poolAddress || "",
      poolLiquidity: postExecution.summary?.poolLiquidity || "0",
      poolVerified: postExecution.summary?.poolVerified === true,
      liquidityVerifiedZero: postExecution.summary?.liquidityVerifiedZero === true
    },
    approvalContext: {
      safeAddress,
      approvalSpenderRole: "Uniswap v3 NonfungiblePositionManager",
      approvalSpenderAddress: spender,
      approvalsLikelyRequired,
      tokenApprovalPayloadGenerated: false,
      tokenApprovalSafePayloadGenerated: false,
      tokenApprovalExecuted: false
    },
    tokenApprovalRequirements: tokenReviews,
    requiredBeforeTokenApprovalPayloadGeneration: {
      tokenApprovalRequirementsReviewed: issues.length === 0,
      liquidityProvisionApprovalRecorded: true,
      poolVerified: true,
      treasuryFundingApprovalRecorded: false,
      tokenApprovalPayloadGenerationApprovalRecorded: false,
      safeOwnersAndThresholdReviewed: true,
      operatorApprovalCommandReviewed: false,
      publicStatusUpdatePrepared: false
    },
    flags: {
      tokenApprovalRequirementsReviewed: issues.length === 0,
      currentAllowancesRead: issues.length === 0,
      currentBalancesRead: issues.length === 0,
      tokenApprovalPayloadGenerated: false,
      tokenApprovalSafePayloadGenerated: false,
      tokenApprovalExecuted: false,
      liquiditySafePayloadGenerated: false,
      liquiditySafeTransactionSubmitted: false,
      liquiditySafeTransactionExecuted: false,
      liquidityAdded: false,
      positionMinted: false,
      treasuryFundingApproved: false,
      treasuryFundsMoved: false,
      publicTradingApproved: false,
      publicTradingLinkApproved: false,
      buyPageActivated: false,
      fullLaunchApproved: false
    },
    safety: {
      readOnlyRpcOnly: true,
      generatesApprovalCalldata: false,
      generatesSafePayload: false,
      approvesTokens: false,
      addsLiquidity: false,
      mintsPosition: false,
      movesTreasuryFunds: false,
      activatesBuyPage: false,
      approvesPublicTrading: false,
      approvesFullLaunch: false
    },
    issues
  };

  review.reviewHash = sha256Json(review);

  writeJson(reviewFile, review);

  console.log(JSON.stringify({
    schema: "astra-dex-liquidity-token-approval-requirements-review-result-v0.1",
    checkedAt: review.generatedAt,
    status,
    poolAddress: review.poolContext.poolAddress,
    poolLiquidity: review.poolContext.poolLiquidity,
    safeAddress,
    approvalSpenderAddress: spender,
    approvalsLikelyRequired,
    tokenApprovalPayloadGenerated: false,
    tokenApprovalExecuted: false,
    liquidityAdded: false,
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
