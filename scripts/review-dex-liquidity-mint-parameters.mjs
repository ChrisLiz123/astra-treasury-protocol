import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const reportDir = path.join(root, "reports", "dex-liquidity-mint-parameter-review");
const reviewFile = path.join(reportDir, "dex-liquidity-mint-parameter-review.json");

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

function isNonEmptyCode(value) {
  return typeof value === "string" && value !== "0x" && value.length > 2;
}

function encodeAddress(value) {
  return normalizeAddress(value).replace(/^0x/i, "").toLowerCase().padStart(64, "0");
}

function decodeUint(value) {
  const clean = String(value || "").replace(/^0x/i, "").padStart(64, "0");
  return BigInt(`0x${clean}`);
}

function decodeInt256Word(word) {
  const clean = String(word || "").replace(/^0x/i, "").padStart(64, "0");
  let value = BigInt(`0x${clean}`);

  if (value >= (1n << 255n)) {
    value -= (1n << 256n);
  }

  return value;
}

function decodeSlot0(result) {
  const clean = String(result || "").replace(/^0x/i, "");

  if (clean.length < 64 * 7) {
    throw new Error(`slot0 returned too little data: ${result}`);
  }

  const words = clean.match(/.{64}/g) || [];

  return {
    sqrtPriceX96: BigInt(`0x${words[0]}`).toString(),
    tick: Number(decodeInt256Word(words[1])),
    observationIndex: BigInt(`0x${words[2]}`).toString(),
    observationCardinality: BigInt(`0x${words[3]}`).toString(),
    observationCardinalityNext: BigInt(`0x${words[4]}`).toString(),
    feeProtocol: BigInt(`0x${words[5]}`).toString(),
    unlocked: BigInt(`0x${words[6]}`) !== 0n
  };
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

async function readPoolTickSpacing(rpcUrl, poolAddress, fallbackFee) {
  try {
    const result = await rpcCall(rpcUrl, "eth_call", [
      {
        to: poolAddress,
        data: "0xd0c93a7c"
      },
      "latest"
    ]);

    const spacing = Number(decodeInt256Word(result));

    if (Number.isInteger(spacing) && spacing > 0) return spacing;
  } catch {}

  const fee = Number(fallbackFee);

  if (fee === 100) return 1;
  if (fee === 500) return 10;
  if (fee === 3000) return 60;
  if (fee === 10000) return 200;

  throw new Error(`Unable to determine tick spacing for fee ${fallbackFee}.`);
}

function parseRequiredInteger(value, label) {
  const raw = String(value || "").trim();

  if (!/^-?\d+$/.test(raw)) {
    issue(label, "Expected an integer.");
    return null;
  }

  return Number(raw);
}

function parseRequiredBigIntString(value, label) {
  const raw = String(value || "").trim();

  if (!/^\d+$/.test(raw)) {
    issue(label, "Expected a non-negative decimal integer string.");
    return "";
  }

  return BigInt(raw).toString();
}

function getExisting(pathName, fallback = "") {
  const existing = readJsonPath(reviewFile, null);

  if (!existing) return fallback;

  const parts = pathName.split(".");
  let value = existing;

  for (const part of parts) {
    if (value === null || value === undefined) return fallback;
    value = value[part];
  }

  return value ?? fallback;
}

function pick(name, existingPath, fallback = "") {
  return process.env[name] || getExisting(existingPath, fallback);
}

function minFromBps(desiredRaw, bps) {
  const desired = BigInt(desiredRaw);
  const basisPoints = BigInt(String(bps));
  return ((desired * (10000n - basisPoints)) / 10000n).toString();
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

function requireStatus(name, value, expected) {
  if (value !== expected) {
    issue(name, `Expected ${expected}, got ${value || "UNKNOWN"}.`);
  }
}

async function main() {
  fs.mkdirSync(reportDir, { recursive: true });

  const config = readJson("configs/dex-liquidity-mint-parameter-review.config.json");
  const tokenApproval = readJson("public-docs/dex-liquidity-token-approval-requirements-status.json");
  const tokenApprovalReview = readJson("reports/dex-liquidity-token-approval-requirements/dex-liquidity-token-approval-requirements-review.json");
  const liquidityApproval = readJson("public-docs/dex-liquidity-provision-approval-status.json");
  const postExecution = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const executionLive = readJson("public-docs/dex-pool-creation-safe-execution-live-status.json");
  const poolCreated = readJson("reports/dex-pool-creation/live/dex-pool-created.json");
  const payload = readJson("reports/dex-pool-creation-safe-payload-generation/generated/dex-pool-creation-safe-payload.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const monitor = readJson("public-docs/mainnet-monitor-status.json");
  const alerts = readJson("public-docs/mainnet-alerts-status.json");
  const incidents = readJson("public-docs/incident-summary.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (config.reviewPrepared !== true || config.reviewOnly !== true) {
    issue("config", "Mint parameter review must be prepared and review-only.");
  }

  requireStatus("tokenApproval.status", tokenApproval.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_REQUIREMENTS_REVIEW_COMPLETE_NO_APPROVALS_EXECUTED");
  requireStatus("liquidityApproval.status", liquidityApproval.status, "DEX_LIQUIDITY_PROVISION_APPROVED_NO_LIQUIDITY_ADDED_NO_FUNDS_MOVED");
  requireStatus("postExecution.status", postExecution.status, "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
  requireStatus("executionLive.status", executionLive.status, "DEX_POOL_CREATION_SAFE_EXECUTION_LIVE_RECORDED_POOL_CREATED_NO_LIQUIDITY");
  requireStatus("poolCreated.status", poolCreated.status, "DEX_POOL_CREATED_BY_SAFE_EXECUTION_NO_LIQUIDITY");

  if (postExecution.summary?.liquidityVerifiedZero !== true || String(postExecution.summary?.poolLiquidity || "") !== "0") {
    issue("postExecution.summary.poolLiquidity", "Pool liquidity must remain zero.");
  }

  if (tokenApproval.summary?.tokenApprovalPayloadGenerated !== false || tokenApproval.summary?.tokenApprovalExecuted !== false) {
    issue("tokenApproval.summary", "Token approval calldata/execution must remain false.");
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

  const confirm = process.env.DEX_LIQUIDITY_MINT_PARAMETER_REVIEW_CONFIRM || getExisting("operatorReview.confirmation", "");

  if (confirm !== "REVIEW_DEX_LIQUIDITY_MINT_PARAMETERS_ONLY") {
    issue("DEX_LIQUIDITY_MINT_PARAMETER_REVIEW_CONFIRM", "Must equal REVIEW_DEX_LIQUIDITY_MINT_PARAMETERS_ONLY on first run.");
  }

  const poolAddress = postExecution.summary?.poolAddress || poolCreated.poolAddress || "";
  const safeAddress = tokenApproval.summary?.safeAddress || payload.safeAddress || "";
  const recipient = normalizeAddress(pick("DEX_LIQUIDITY_RECIPIENT", "mintParameters.recipient", safeAddress));

  const token0 = payload.transaction?.parameters?.token0 || poolCreated.token0 || "";
  const token1 = payload.transaction?.parameters?.token1 || poolCreated.token1 || "";
  const token0Symbol = payload.transaction?.parameters?.token0Symbol || poolCreated.token0Symbol || "token0";
  const token1Symbol = payload.transaction?.parameters?.token1Symbol || poolCreated.token1Symbol || "token1";
  const fee = Number(payload.transaction?.parameters?.fee || poolCreated.fee || 0);

  const tickLower = parseRequiredInteger(pick("DEX_LIQUIDITY_TICK_LOWER", "mintParameters.tickLower"), "DEX_LIQUIDITY_TICK_LOWER");
  const tickUpper = parseRequiredInteger(pick("DEX_LIQUIDITY_TICK_UPPER", "mintParameters.tickUpper"), "DEX_LIQUIDITY_TICK_UPPER");

  const amount0Desired = parseRequiredBigIntString(pick("DEX_LIQUIDITY_AMOUNT0_DESIRED_RAW", "mintParameters.amount0DesiredRaw"), "DEX_LIQUIDITY_AMOUNT0_DESIRED_RAW");
  const amount1Desired = parseRequiredBigIntString(pick("DEX_LIQUIDITY_AMOUNT1_DESIRED_RAW", "mintParameters.amount1DesiredRaw"), "DEX_LIQUIDITY_AMOUNT1_DESIRED_RAW");

  const slippageBpsRaw = pick("DEX_LIQUIDITY_SLIPPAGE_BPS", "riskControls.slippageBps", "");
  const slippageBps = /^\d+$/.test(String(slippageBpsRaw || "")) ? Number(slippageBpsRaw) : null;

  let amount0Min = pick("DEX_LIQUIDITY_AMOUNT0_MIN_RAW", "mintParameters.amount0MinRaw", "");
  let amount1Min = pick("DEX_LIQUIDITY_AMOUNT1_MIN_RAW", "mintParameters.amount1MinRaw", "");

  if (!amount0Min && amount0Desired && slippageBps !== null) {
    amount0Min = minFromBps(amount0Desired, slippageBps);
  }

  if (!amount1Min && amount1Desired && slippageBps !== null) {
    amount1Min = minFromBps(amount1Desired, slippageBps);
  }

  amount0Min = parseRequiredBigIntString(amount0Min, "DEX_LIQUIDITY_AMOUNT0_MIN_RAW");
  amount1Min = parseRequiredBigIntString(amount1Min, "DEX_LIQUIDITY_AMOUNT1_MIN_RAW");

  const deadlinePolicy = pick("DEX_LIQUIDITY_DEADLINE_POLICY", "mintParameters.deadlinePolicy", "operator-set-at-execution-with-short-validity-window");
  const allowOutOfRange = process.env.DEX_LIQUIDITY_ALLOW_OUT_OF_RANGE_MINT === "YES";

  if (!isAddress(poolAddress)) {
    issue("poolAddress", "Pool address must be valid.");
  }

  if (!isAddress(safeAddress)) {
    issue("safeAddress", "Safe address must be valid.");
  }

  if (!isAddress(recipient)) {
    issue("DEX_LIQUIDITY_RECIPIENT", "Recipient must be a valid address.");
  }

  if (isAddress(recipient) && isAddress(safeAddress) && !sameAddress(recipient, safeAddress)) {
    issue("DEX_LIQUIDITY_RECIPIENT", "Recipient must be the reviewed Safe address unless this workflow is explicitly redesigned.");
  }

  if (!isAddress(token0) || !isAddress(token1)) {
    issue("tokens", "token0/token1 must be valid addresses.");
  }

  if (!Number.isInteger(fee) || fee <= 0) {
    issue("fee", "Pool fee must be a positive integer.");
  }

  if (!deadlinePolicy || String(deadlinePolicy).toLowerCase().includes("replace_with")) {
    issue("DEX_LIQUIDITY_DEADLINE_POLICY", "Deadline policy must be recorded.");
  }

  const rpcUrl =
    process.env.DEX_LIQUIDITY_MINT_REVIEW_RPC_URL ||
    process.env.DEX_LIQUIDITY_APPROVAL_REVIEW_RPC_URL ||
    process.env.DEX_POST_EXECUTION_RPC_URL ||
    process.env.DEX_SAFE_EXECUTION_RPC_URL ||
    process.env.MAINNET_MONITOR_RPC_URL ||
    readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

  if (!String(rpcUrl || "").startsWith("https://")) {
    issue("DEX_LIQUIDITY_MINT_REVIEW_RPC_URL", "RPC URL must be available and start with https://.");
  }

  let poolCodePresent = false;
  let tickSpacing = 0;
  let slot0 = {};
  let currentTickInRange = false;
  let lowerAligned = false;
  let upperAligned = false;
  let amountChecks = {};
  let tokenBalanceAllowanceContext = [];

  if (issues.length === 0) {
    try {
      const poolCode = await rpcCall(rpcUrl, "eth_getCode", [poolAddress, "latest"]);
      poolCodePresent = isNonEmptyCode(poolCode);

      if (!poolCodePresent) {
        issue("pool.code", "Pool contract code must be present.");
      }

      tickSpacing = await readPoolTickSpacing(rpcUrl, poolAddress, fee);

      slot0 = decodeSlot0(await rpcCall(rpcUrl, "eth_call", [
        {
          to: poolAddress,
          data: "0x3850c7bd"
        },
        "latest"
      ]));

      lowerAligned = Number.isInteger(tickLower) && tickSpacing > 0 && tickLower % tickSpacing === 0;
      upperAligned = Number.isInteger(tickUpper) && tickSpacing > 0 && tickUpper % tickSpacing === 0;
      currentTickInRange = Number.isInteger(tickLower) && Number.isInteger(tickUpper) && slot0.tick >= tickLower && slot0.tick < tickUpper;

      if (tickLower >= tickUpper) {
        issue("tickRange", "tickLower must be lower than tickUpper.");
      }

      if (tickLower < -887272 || tickUpper > 887272) {
        issue("tickRange", "Tick range must be within Uniswap v3 global tick bounds.");
      }

      if (!lowerAligned) {
        issue("tickLower", `tickLower must be aligned to tick spacing ${tickSpacing}.`);
      }

      if (!upperAligned) {
        issue("tickUpper", `tickUpper must be aligned to tick spacing ${tickSpacing}.`);
      }

      if (!currentTickInRange && !allowOutOfRange) {
        issue("tickRange.currentTick", "Current tick must be in range for this reviewed initial liquidity path. Set DEX_LIQUIDITY_ALLOW_OUT_OF_RANGE_MINT=YES only if deliberately reviewing out-of-range liquidity.");
      }

      amountChecks = {
        amount0DesiredPositive: BigInt(amount0Desired) > 0n,
        amount1DesiredPositive: BigInt(amount1Desired) > 0n,
        amount0MinNotGreaterThanDesired: BigInt(amount0Min) <= BigInt(amount0Desired),
        amount1MinNotGreaterThanDesired: BigInt(amount1Min) <= BigInt(amount1Desired)
      };

      if (!amountChecks.amount0DesiredPositive) {
        issue("amount0Desired", "amount0Desired must be greater than zero.");
      }

      if (!amountChecks.amount1DesiredPositive) {
        issue("amount1Desired", "amount1Desired must be greater than zero.");
      }

      if (!amountChecks.amount0MinNotGreaterThanDesired) {
        issue("amount0Min", "amount0Min cannot be greater than amount0Desired.");
      }

      if (!amountChecks.amount1MinNotGreaterThanDesired) {
        issue("amount1Min", "amount1Min cannot be greater than amount1Desired.");
      }

      const tokenReviews = tokenApprovalReview.tokenApprovalRequirements || [];

      for (const item of tokenReviews) {
        const desiredRaw = sameAddress(item.tokenAddress, token0)
          ? amount0Desired
          : sameAddress(item.tokenAddress, token1)
            ? amount1Desired
            : "0";

        tokenBalanceAllowanceContext.push({
          role: item.role,
          symbol: item.symbol,
          tokenAddress: item.tokenAddress,
          decimals: item.decimals,
          desiredRaw,
          desiredHuman: formatRaw(desiredRaw, item.decimals || 0),
          safeBalanceRaw: item.balanceRaw,
          safeBalanceHuman: item.balanceHuman,
          currentAllowanceRaw: item.currentAllowanceRaw,
          currentAllowanceHuman: item.currentAllowanceHuman,
          balanceCurrentlyCoversDesired: BigInt(item.balanceRaw || "0") >= BigInt(desiredRaw || "0"),
          allowanceCurrentlyCoversDesired: BigInt(item.currentAllowanceRaw || "0") >= BigInt(desiredRaw || "0")
        });
      }
    } catch (error) {
      issue("rpc", error.message);
    }
  }

  const status = issues.length === 0
    ? "DEX_LIQUIDITY_MINT_PARAMETER_REVIEW_COMPLETE_NO_PAYLOAD_NO_LIQUIDITY"
    : "DEX_LIQUIDITY_MINT_PARAMETER_REVIEW_REQUIRED";

  const review = {
    schema: "astra-dex-liquidity-mint-parameter-review-v0.1",
    generatedAt: new Date().toISOString(),
    status,
    currentApprovedMode: "restricted-mainnet-operation",
    selectedPublicPurchasePath: "dex-liquidity-pool-trading",
    reviewOnly: true,
    operatorReview: {
      confirmation: "REVIEW_DEX_LIQUIDITY_MINT_PARAMETERS_ONLY",
      allowOutOfRangeMint: allowOutOfRange
    },
    poolContext: {
      poolAddress,
      poolCodePresent,
      poolLiquidity: postExecution.summary?.poolLiquidity || "0",
      poolVerified: postExecution.summary?.poolVerified === true,
      token0,
      token0Symbol,
      token1,
      token1Symbol,
      fee,
      tickSpacing,
      slot0,
      currentTick: slot0.tick
    },
    mintParameters: {
      token0,
      token1,
      fee,
      tickLower,
      tickUpper,
      amount0DesiredRaw: amount0Desired,
      amount1DesiredRaw: amount1Desired,
      amount0MinRaw: amount0Min,
      amount1MinRaw: amount1Min,
      recipient,
      deadlinePolicy
    },
    riskControls: {
      slippageBps,
      lowerAlignedToTickSpacing: lowerAligned,
      upperAlignedToTickSpacing: upperAligned,
      currentTickInRange,
      amountChecks,
      tokenBalanceAllowanceContext
    },
    requiredBeforeLiquidityPayloadGeneration: {
      mintParametersReviewed: issues.length === 0,
      tokenApprovalRequirementsReviewed: true,
      poolVerified: true,
      poolLiquidityVerifiedZero: true,
      treasuryFundingApprovalRecorded: false,
      tokenApprovalPayloadGenerationApprovalRecorded: false,
      liquidityPayloadGenerationApprovalRecorded: false,
      operatorLiquidityCommandReviewed: false,
      publicStatusUpdatePrepared: false
    },
    flags: {
      mintParametersReviewed: issues.length === 0,
      tickRangeReviewed: issues.length === 0,
      amountsReviewed: issues.length === 0,
      slippageReviewed: issues.length === 0,
      recipientReviewed: issues.length === 0,
      deadlinePolicyReviewed: issues.length === 0,
      tokenApprovalPayloadGenerated: false,
      tokenApprovalExecuted: false,
      liquidityMintCalldataGenerated: false,
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
      generatesMintCalldata: false,
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
    schema: "astra-dex-liquidity-mint-parameter-review-result-v0.1",
    checkedAt: review.generatedAt,
    status,
    poolAddress,
    currentTick: slot0.tick,
    tickSpacing,
    tickLower,
    tickUpper,
    currentTickInRange,
    amount0DesiredRaw: amount0Desired,
    amount1DesiredRaw: amount1Desired,
    recipient,
    liquidityMintCalldataGenerated: false,
    liquiditySafePayloadGenerated: false,
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
