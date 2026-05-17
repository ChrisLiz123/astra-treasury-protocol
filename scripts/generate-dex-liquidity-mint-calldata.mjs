import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const confirm = process.env.DEX_LIQUIDITY_MINT_CALLDATA_GENERATION_CONFIRM || "";
const overwrite = process.env.OVERWRITE_DEX_LIQUIDITY_MINT_CALLDATA || "";

const requiredConfirm = "GENERATE_DEX_LIQUIDITY_MINT_CALLDATA_ONLY_NOT_LIQUIDITY";

const calldataDir = path.join(root, "reports", "dex-liquidity-provision", "payload");
const calldataFile = path.join(calldataDir, "liquidity-mint-calldata.json");

const reportDir = path.join(root, "reports", "dex-liquidity-mint-calldata");
const generationReportFile = path.join(reportDir, "dex-liquidity-mint-calldata-generation.json");

const configFile = path.join(root, "configs", "dex-liquidity-mint-calldata.config.json");

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

function readJson(relativePath, fallback = null) {
  const full = path.join(root, relativePath);
  if (!fs.existsSync(full)) {
    if (fallback !== null) return fallback;
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return JSON.parse(fs.readFileSync(full, "utf8"));
}

function readJsonPath(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function sha256Json(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value, null, 2) + "\n").digest("hex");
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function readRuntimeEnvValue(key) {
  const runtimeFile = path.join(root, ".runtime", "mainnet-monitor.env");

  if (!fs.existsSync(runtimeFile)) return "";

  for (const line of fs.readFileSync(runtimeFile, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [rawKey, ...rest] = trimmed.split("=");
    if (rawKey.trim() === key) return rest.join("=").trim().replace(/^["']|["']$/g, "");
  }

  return "";
}

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || "").trim());
}

function isNonEmptyCode(value) {
  return typeof value === "string" && value !== "0x" && value.length > 2;
}

function sameAddress(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

function encodeAddress(value) {
  return String(value).replace(/^0x/i, "").toLowerCase().padStart(64, "0");
}

function encodeUint256(value) {
  const n = BigInt(String(value));
  if (n < 0n) throw new Error(`uint256 cannot be negative: ${value}`);
  return n.toString(16).padStart(64, "0");
}

function encodeInt256(value) {
  let n = BigInt(String(value));
  const max = 1n << 256n;

  if (n < 0n) {
    n = max + n;
  }

  if (n < 0n || n >= max) {
    throw new Error(`int256 out of range: ${value}`);
  }

  return n.toString(16).padStart(64, "0");
}

function encodeMintCalldata(params) {
  const selector = "88316456";

  const words = [
    encodeAddress(params.token0),
    encodeAddress(params.token1),
    encodeUint256(params.fee),
    encodeInt256(params.tickLower),
    encodeInt256(params.tickUpper),
    encodeUint256(params.amount0Desired),
    encodeUint256(params.amount1Desired),
    encodeUint256(params.amount0Min),
    encodeUint256(params.amount1Min),
    encodeAddress(params.recipient),
    encodeUint256(params.deadline)
  ];

  return `0x${selector}${words.join("")}`;
}

function decodeAddressFromWord(word) {
  return `0x${String(word || "").replace(/^0x/i, "").padStart(64, "0").slice(-40)}`;
}

function decodeUintWord(word) {
  return BigInt(`0x${String(word || "").replace(/^0x/i, "").padStart(64, "0")}`).toString();
}

function decodeIntWord(word) {
  const raw = BigInt(`0x${String(word || "").replace(/^0x/i, "").padStart(64, "0")}`);
  const max = 1n << 256n;
  const half = 1n << 255n;

  return raw >= half ? (raw - max).toString() : raw.toString();
}

function decodeMintCalldata(data) {
  const clean = String(data || "").replace(/^0x/i, "");

  if (!clean.startsWith("88316456")) {
    throw new Error("Mint calldata does not start with NonfungiblePositionManager mint selector 0x88316456.");
  }

  const body = clean.slice(8);

  if (body.length !== 64 * 11) {
    throw new Error(`Unexpected mint calldata static body length ${body.length}; expected ${64 * 11}.`);
  }

  const words = [];

  for (let i = 0; i < 11; i += 1) {
    words.push(body.slice(i * 64, (i + 1) * 64));
  }

  return {
    token0: decodeAddressFromWord(words[0]),
    token1: decodeAddressFromWord(words[1]),
    fee: decodeUintWord(words[2]),
    tickLower: decodeIntWord(words[3]),
    tickUpper: decodeIntWord(words[4]),
    amount0Desired: decodeUintWord(words[5]),
    amount1Desired: decodeUintWord(words[6]),
    amount0Min: decodeUintWord(words[7]),
    amount1Min: decodeUintWord(words[8]),
    recipient: decodeAddressFromWord(words[9]),
    deadline: decodeUintWord(words[10])
  };
}

function tickSpacingForFee(fee) {
  const table = {
    "100": 1,
    "500": 10,
    "3000": 60,
    "10000": 200
  };

  return table[String(fee)] || 0;
}

function defaultTickLower(spacing) {
  return Math.ceil(-887272 / spacing) * spacing;
}

function defaultTickUpper(spacing) {
  return Math.floor(887272 / spacing) * spacing;
}

function requireStatus(name, value, expected) {
  if (value !== expected) {
    issue(name, `Expected ${expected}, got ${value || "UNKNOWN"}.`);
  }
}

function chooseRawAmount(role, allowanceReport) {
  const envKey = role === "token0" ? "DEX_LIQUIDITY_AMOUNT0_DESIRED_RAW" : "DEX_LIQUIDITY_AMOUNT1_DESIRED_RAW";
  const envValue = process.env[envKey] || "";

  if (/^\d+$/.test(envValue) && BigInt(envValue) > 0n) return envValue;

  const checks = Array.isArray(allowanceReport.allowanceVerificationChecks)
    ? allowanceReport.allowanceVerificationChecks
    : [];

  const byRole = checks.find((item) => String(item.role || "").toLowerCase() === role.toLowerCase());

  if (byRole && /^\d+$/.test(String(byRole.expectedAllowanceRaw || "")) && BigInt(String(byRole.expectedAllowanceRaw)) > 0n) {
    return String(byRole.expectedAllowanceRaw);
  }

  throw new Error(`Could not determine ${role} desired raw amount. Set ${envKey}.`);
}

function chooseMinAmount(role, desiredRaw) {
  const envKey = role === "token0" ? "DEX_LIQUIDITY_AMOUNT0_MIN_RAW" : "DEX_LIQUIDITY_AMOUNT1_MIN_RAW";
  const envValue = process.env[envKey] || "";

  if (/^\d+$/.test(envValue)) return envValue;

  const slippageBps = Number(process.env.DEX_LIQUIDITY_MINT_MIN_DEFAULT_SLIPPAGE_BPS || "500");

  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps > 10000) {
    throw new Error("DEX_LIQUIDITY_MINT_MIN_DEFAULT_SLIPPAGE_BPS must be an integer between 0 and 10000.");
  }

  return ((BigInt(desiredRaw) * BigInt(10000 - slippageBps)) / 10000n).toString();
}

function extractFee(poolPayload, fallback) {
  const candidates = [
    poolPayload?.transaction?.parameters?.fee,
    poolPayload?.parameters?.fee,
    poolPayload?.fee,
    fallback,
    process.env.DEX_LIQUIDITY_FEE
  ];

  for (const candidate of candidates) {
    if (/^\d+$/.test(String(candidate || "")) && Number(candidate) > 0) {
      return Number(candidate);
    }
  }

  throw new Error("Could not determine Uniswap fee tier.");
}

function extractPoolAddress(poolStatus) {
  const candidates = [
    poolStatus?.summary?.poolAddress,
    poolStatus?.poolAddress,
    poolStatus?.pool?.address
  ];

  for (const candidate of candidates) {
    if (isAddress(candidate)) return candidate;
  }

  return "";
}

async function rpcCall(rpcUrl, method, params) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({jsonrpc: "2.0", id: 1, method, params})
  });

  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(body.error.message || JSON.stringify(body.error));
  return body.result;
}

async function readPoolLiquidity(rpcUrl, poolAddress) {
  const result = await rpcCall(rpcUrl, "eth_call", [
    {to: poolAddress, data: "0x1a686502"},
    "latest"
  ]);

  return BigInt(result || "0x0").toString();
}

async function readTokenAllowance(rpcUrl, tokenAddress, ownerAddress, spenderAddress) {
  const result = await rpcCall(rpcUrl, "eth_call", [
    {to: tokenAddress, data: "0xdd62ed3e" + encodeAddress(ownerAddress) + encodeAddress(spenderAddress)},
    "latest"
  ]);

  return BigInt(result || "0x0").toString();
}

async function readTokenBalance(rpcUrl, tokenAddress, ownerAddress) {
  const result = await rpcCall(rpcUrl, "eth_call", [
    {to: tokenAddress, data: "0x70a08231" + encodeAddress(ownerAddress)},
    "latest"
  ]);

  return BigInt(result || "0x0").toString();
}

async function main() {
  if (confirm !== requiredConfirm) {
    issue("DEX_LIQUIDITY_MINT_CALLDATA_GENERATION_CONFIRM", `Must equal ${requiredConfirm}.`);
  }

  if (fs.existsSync(calldataFile) && overwrite !== "YES") {
    issue("OVERWRITE_DEX_LIQUIDITY_MINT_CALLDATA", "Liquidity mint calldata already exists. Set OVERWRITE_DEX_LIQUIDITY_MINT_CALLDATA=YES only if regenerating intentionally.");
  }

  const approvalStatus = readJson("public-docs/dex-liquidity-mint-calldata-generation-approval-status.json");
  const approvalRecord = readJson("reports/dex-liquidity-mint-calldata-generation-approval/dex-liquidity-mint-calldata-generation-approval-record.json");
  const allowanceStatus = readJson("public-docs/dex-liquidity-token-approval-post-execution-allowances-status.json");
  const allowanceReport = readJson("reports/dex-liquidity-token-approval-post-execution-allowances/dex-liquidity-token-approval-post-execution-allowances.json");
  const payload = readJson("reports/dex-liquidity-token-approval/payload/token-approval-safe-payload.json");
  const poolStatus = readJson("public-docs/dex-pool-creation-post-execution-verification-status.json");
  const poolPayload = readJson("reports/dex-pool-creation-safe-payload-generation/generated/dex-pool-creation-safe-payload.json", {});
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const capabilityMatrix = readJson("public-docs/capability-matrix-status.json");
  const monitor = readJson("public-docs/mainnet-monitor-status.json");
  const alerts = readJson("public-docs/mainnet-alerts-status.json");
  const incidents = readJson("public-docs/incident-summary.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  requireStatus("approvalStatus.status", approvalStatus.status, "DEX_LIQUIDITY_MINT_CALLDATA_GENERATION_APPROVED_NO_CALLDATA_NO_LIQUIDITY_NO_PUBLIC_TRADING");
  requireStatus("allowanceStatus.status", allowanceStatus.status, "DEX_LIQUIDITY_TOKEN_APPROVAL_POST_EXECUTION_ALLOWANCES_VERIFIED_APPROVALS_EXECUTED_NO_LIQUIDITY_NO_PUBLIC_TRADING");
  requireStatus("poolStatus.status", poolStatus.status, "DEX_POOL_CREATION_POST_EXECUTION_POOL_VERIFIED_NO_LIQUIDITY_NO_PUBLIC_TRADING");

  if (approvalStatus.summary?.liquidityMintCalldataGenerationApproved !== true) {
    issue("approvalStatus.summary.liquidityMintCalldataGenerationApproved", "Calldata generation approval must be recorded.");
  }

  if (approvalStatus.summary?.liquidityMintCalldataGenerated !== false || approvalStatus.summary?.liquidityAdded !== false) {
    issue("approvalStatus.summary.liquidityFlags", "Approval status must show no calldata and no liquidity.");
  }

  if (allowanceStatus.summary?.allRequiredAllowancesAvailable !== true || allowanceStatus.summary?.allRequiredBalancesAvailable !== true) {
    issue("allowanceStatus.summary", "Required allowances and balances must be available.");
  }

  if (allowanceStatus.summary?.tokenApprovalExecuted !== true) {
    issue("allowanceStatus.summary.tokenApprovalExecuted", "Token approvals must be executed.");
  }

  if (poolStatus.summary?.liquidityVerifiedZero !== true || String(poolStatus.summary?.poolLiquidity || "") !== "0") {
    issue("poolStatus.summary.poolLiquidity", "Pool liquidity must remain zero before calldata generation.");
  }

  if (!isAddress(allowanceReport.liquiditySafeAddress) || !isAddress(allowanceReport.approvalSpender)) {
    issue("allowanceReport.addresses", "Liquidity Safe and approval spender must be valid.");
  }

  if (!isAddress(payload.liquiditySafeAddress) || !isAddress(payload.approvalSpender)) {
    issue("payload.addresses", "Payload liquidity Safe and approval spender must be valid.");
  }

  if (!sameAddress(allowanceReport.liquiditySafeAddress, payload.liquiditySafeAddress)) {
    issue("liquiditySafeAddress", "Allowance report and payload liquidity Safe addresses must match.");
  }

  if (!sameAddress(allowanceReport.approvalSpender, payload.approvalSpender)) {
    issue("approvalSpender", "Allowance report and payload approval spender must match.");
  }

  if (approvalRecord.tokenApprovalExecuted !== true || approvalRecord.allRequiredAllowancesAvailable !== true || approvalRecord.allRequiredBalancesAvailable !== true) {
    issue("approvalRecord.readinessFlags", "Approval record must show token approvals, allowances, and balances ready.");
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
    "public-docs/dex-liquidity-added-status.json",
    "public-docs/dex-public-trading-live-status.json"
  ];

  for (const file of forbiddenFiles) {
    if (fs.existsSync(path.join(root, file))) {
      issue(file, "Forbidden liquidity/public-trading artifact exists. Calldata generation must not generate a Safe payload or add liquidity.");
    }
  }

  const fee = extractFee(poolPayload, poolStatus.summary?.fee);
  const tickSpacing = tickSpacingForFee(fee);

  if (!tickSpacing) {
    issue("fee", `Unsupported fee tier for tick spacing: ${fee}`);
  }

  const roleChecks = Array.isArray(allowanceReport.allowanceVerificationChecks)
    ? allowanceReport.allowanceVerificationChecks
    : [];

  let token0Check = roleChecks.find((item) => String(item.role || "").toLowerCase() === "token0");
  let token1Check = roleChecks.find((item) => String(item.role || "").toLowerCase() === "token1");

  if (!token0Check || !token1Check) {
    const sorted = [...roleChecks].sort((a, b) => String(a.tokenAddress || "").toLowerCase().localeCompare(String(b.tokenAddress || "").toLowerCase()));
    token0Check = token0Check || sorted[0];
    token1Check = token1Check || sorted[1];
  }

  if (!token0Check || !token1Check) {
    issue("allowanceReport.allowanceVerificationChecks", "Could not find token0/token1 allowance verification checks.");
  }

  const token0 = token0Check?.tokenAddress || "";
  const token1 = token1Check?.tokenAddress || "";

  if (!isAddress(token0) || !isAddress(token1)) {
    issue("tokens", "Token0 and token1 addresses must be valid.");
  }

  const amount0Desired = chooseRawAmount("token0", allowanceReport);
  const amount1Desired = chooseRawAmount("token1", allowanceReport);
  const amount0Min = chooseMinAmount("token0", amount0Desired);
  const amount1Min = chooseMinAmount("token1", amount1Desired);

  const tickLower = process.env.DEX_LIQUIDITY_TICK_LOWER !== undefined && process.env.DEX_LIQUIDITY_TICK_LOWER !== ""
    ? Number(process.env.DEX_LIQUIDITY_TICK_LOWER)
    : defaultTickLower(tickSpacing || 1);

  const tickUpper = process.env.DEX_LIQUIDITY_TICK_UPPER !== undefined && process.env.DEX_LIQUIDITY_TICK_UPPER !== ""
    ? Number(process.env.DEX_LIQUIDITY_TICK_UPPER)
    : defaultTickUpper(tickSpacing || 1);

  if (!Number.isInteger(tickLower) || !Number.isInteger(tickUpper)) {
    issue("ticks", "tickLower and tickUpper must be integers.");
  }

  if (tickLower >= tickUpper) {
    issue("ticks", "tickLower must be less than tickUpper.");
  }

  if (tickSpacing && (tickLower % tickSpacing !== 0 || tickUpper % tickSpacing !== 0)) {
    issue("ticks", `Ticks must be multiples of tick spacing ${tickSpacing}.`);
  }

  const recipient = process.env.DEX_LIQUIDITY_MINT_RECIPIENT || allowanceReport.liquiditySafeAddress;

  if (!isAddress(recipient)) {
    issue("DEX_LIQUIDITY_MINT_RECIPIENT", "Mint recipient must be a valid address.");
  }

  const now = Math.floor(Date.now() / 1000);
  const defaultDeadlineSeconds = Number(process.env.DEX_LIQUIDITY_MINT_DEFAULT_DEADLINE_SECONDS || "1209600");
  const deadline = process.env.DEX_LIQUIDITY_MINT_DEADLINE_UNIX
    ? Number(process.env.DEX_LIQUIDITY_MINT_DEADLINE_UNIX)
    : now + defaultDeadlineSeconds;

  if (!Number.isInteger(deadline) || deadline <= now) {
    issue("deadline", "Deadline must be an integer Unix timestamp in the future.");
  }

  const poolAddress = extractPoolAddress(poolStatus);

  const rpcUrl =
    process.env.DEX_LIQUIDITY_MINT_CALLDATA_RPC_URL ||
    process.env.DEX_LIQUIDITY_TOKEN_APPROVAL_POST_EXECUTION_ALLOWANCES_RPC_URL ||
    process.env.DEX_POST_EXECUTION_RPC_URL ||
    process.env.MAINNET_MONITOR_RPC_URL ||
    readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

  if (!String(rpcUrl || "").startsWith("https://")) {
    issue("DEX_LIQUIDITY_MINT_CALLDATA_RPC_URL", "RPC URL must be available and start with https://.");
  }

  let currentPoolLiquidity = "0";
  let liveBalance0Raw = "";
  let liveBalance1Raw = "";
  let liveAllowance0Raw = "";
  let liveAllowance1Raw = "";
  let nftManagerCodePresent = false;

  if (issues.length === 0) {
    try {
      const nftManagerCode = await rpcCall(rpcUrl, "eth_getCode", [allowanceReport.approvalSpender, "latest"]);
      nftManagerCodePresent = isNonEmptyCode(nftManagerCode);

      if (!nftManagerCodePresent) {
        issue("approvalSpender.code", "Approval spender / NonfungiblePositionManager must have contract code.");
      }

      if (isAddress(poolAddress)) {
        currentPoolLiquidity = await readPoolLiquidity(rpcUrl, poolAddress);
      }

      if (currentPoolLiquidity !== "0") {
        issue("poolLiquidity", `Pool liquidity is ${currentPoolLiquidity}; expected 0.`);
      }

      liveBalance0Raw = await readTokenBalance(rpcUrl, token0, allowanceReport.liquiditySafeAddress);
      liveBalance1Raw = await readTokenBalance(rpcUrl, token1, allowanceReport.liquiditySafeAddress);
      liveAllowance0Raw = await readTokenAllowance(rpcUrl, token0, allowanceReport.liquiditySafeAddress, allowanceReport.approvalSpender);
      liveAllowance1Raw = await readTokenAllowance(rpcUrl, token1, allowanceReport.liquiditySafeAddress, allowanceReport.approvalSpender);

      if (BigInt(liveBalance0Raw) < BigInt(amount0Desired)) {
        issue("token0.balance", `Token0 balance ${liveBalance0Raw} is below desired amount ${amount0Desired}.`);
      }

      if (BigInt(liveBalance1Raw) < BigInt(amount1Desired)) {
        issue("token1.balance", `Token1 balance ${liveBalance1Raw} is below desired amount ${amount1Desired}.`);
      }

      if (BigInt(liveAllowance0Raw) < BigInt(amount0Desired)) {
        issue("token0.allowance", `Token0 allowance ${liveAllowance0Raw} is below desired amount ${amount0Desired}.`);
      }

      if (BigInt(liveAllowance1Raw) < BigInt(amount1Desired)) {
        issue("token1.allowance", `Token1 allowance ${liveAllowance1Raw} is below desired amount ${amount1Desired}.`);
      }
    } catch (error) {
      issue("rpc", error.message);
    }
  }

  if (issues.length > 0) {
    console.log(JSON.stringify({
      schema: "astra-dex-liquidity-mint-calldata-generation-result-v0.1",
      checkedAt: new Date().toISOString(),
      status: "STOP_DEX_LIQUIDITY_MINT_CALLDATA_NOT_GENERATED",
      issues
    }, null, 2));
    process.exit(1);
  }

  fs.mkdirSync(calldataDir, { recursive: true });
  fs.mkdirSync(reportDir, { recursive: true });

  const generatedAt = new Date().toISOString();

  const mintParams = {
    token0,
    token1,
    fee: String(fee),
    tickLower: String(tickLower),
    tickUpper: String(tickUpper),
    amount0Desired,
    amount1Desired,
    amount0Min,
    amount1Min,
    recipient,
    deadline: String(deadline)
  };

  const calldata = encodeMintCalldata(mintParams);
  const decodedMintParams = decodeMintCalldata(calldata);

  const calldataArtifact = {
    schema: "astra-dex-liquidity-mint-calldata-v0.1",
    generatedAt,
    status: "DEX_LIQUIDITY_MINT_CALLDATA_GENERATED_NO_SAFE_PAYLOAD_NO_LIQUIDITY_NO_PUBLIC_TRADING",
    chainId: 8453,
    network: "Base Mainnet",
    selectedPublicPurchasePath: "dex-liquidity-pool-trading",
    dexVenue: "Uniswap on Base",
    liquiditySafeAddress: allowanceReport.liquiditySafeAddress,
    nonfungiblePositionManager: allowanceReport.approvalSpender,
    target: allowanceReport.approvalSpender,
    value: "0",
    operation: "CALL",
    operationValue: 0,
    functionSelector: "0x88316456",
    functionSignature: "mint((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256))",
    poolAddress,
    poolLiquidityBeforeCalldataGeneration: currentPoolLiquidity,
    tickSpacing,
    mintParams,
    decodedMintParams,
    calldata,
    calldataBytes: (calldata.length - 2) / 2,
    calldataHash: sha256Hex(calldata),
    readinessChecks: {
      tokenApprovalPostExecutionAllowanceVerificationComplete: true,
      tokenApprovalExecuted: true,
      allRequiredAllowancesAvailable: true,
      allRequiredBalancesAvailable: true,
      poolLiquidityVerifiedZero: true,
      nftManagerCodePresent,
      token0: {
        tokenAddress: token0,
        symbol: token0Check.symbol || "",
        role: "token0",
        desiredRaw: amount0Desired,
        minRaw: amount0Min,
        liveBalanceRaw: liveBalance0Raw,
        liveAllowanceRaw: liveAllowance0Raw,
        balanceCoversDesired: BigInt(liveBalance0Raw) >= BigInt(amount0Desired),
        allowanceCoversDesired: BigInt(liveAllowance0Raw) >= BigInt(amount0Desired)
      },
      token1: {
        tokenAddress: token1,
        symbol: token1Check.symbol || "",
        role: "token1",
        desiredRaw: amount1Desired,
        minRaw: amount1Min,
        liveBalanceRaw: liveBalance1Raw,
        liveAllowanceRaw: liveAllowance1Raw,
        balanceCoversDesired: BigInt(liveBalance1Raw) >= BigInt(amount1Desired),
        allowanceCoversDesired: BigInt(liveAllowance1Raw) >= BigInt(amount1Desired)
      }
    },
    sourceReferences: {
      calldataGenerationApproval: "public-docs/dex-liquidity-mint-calldata-generation-approval-status.json",
      postExecutionAllowances: "public-docs/dex-liquidity-token-approval-post-execution-allowances-status.json",
      poolPostExecutionVerification: "public-docs/dex-pool-creation-post-execution-verification-status.json"
    },
    flags: {
      liquidityMintCalldataGenerated: true,
      liquidityMintCalldataVerified: false,
      liquiditySafePayloadGenerated: false,
      liquiditySafeTransactionSubmitted: false,
      liquiditySafeTransactionExecuted: false,
      liquidityAdded: false,
      positionMinted: false,
      publicTradingApproved: false,
      publicTradingLinkApproved: false,
      buyPageActivated: false,
      fullLaunchApproved: false
    },
    safety: {
      localCalldataOnly: true,
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

  calldataArtifact.calldataArtifactHash = sha256Json(calldataArtifact);

  writeJson(calldataFile, calldataArtifact);

  const generationReport = {
    schema: "astra-dex-liquidity-mint-calldata-generation-report-v0.1",
    generatedAt,
    status: calldataArtifact.status,
    calldataFile: "reports/dex-liquidity-provision/payload/liquidity-mint-calldata.json",
    calldataHash: calldataArtifact.calldataHash,
    calldataArtifactHash: calldataArtifact.calldataArtifactHash,
    liquiditySafeAddress: calldataArtifact.liquiditySafeAddress,
    nonfungiblePositionManager: calldataArtifact.nonfungiblePositionManager,
    poolAddress,
    tickLower,
    tickUpper,
    amount0Desired,
    amount1Desired,
    amount0Min,
    amount1Min,
    deadline,
    liquidityMintCalldataGenerated: true,
    liquiditySafePayloadGenerated: false,
    liquidityAdded: false,
    positionMinted: false,
    publicTradingApproved: false,
    fullLaunchApproved: false
  };

  writeJson(generationReportFile, generationReport);

  const config = readJsonPath(configFile);

  config.status = "liquidity-mint-calldata-generated-no-safe-payload-no-liquidity-no-public-trading";
  config.liquidityMintCalldataGenerated = true;
  config.liquidityMintCalldataVerified = false;
  config.liquiditySafePayloadGenerated = false;
  config.liquiditySafeTransactionSubmitted = false;
  config.liquiditySafeTransactionExecuted = false;
  config.liquidityAdded = false;
  config.positionMinted = false;
  config.publicTradingApproved = false;
  config.publicTradingLinkApproved = false;
  config.buyPageActivationApproved = false;
  config.fullLaunchApproved = false;
  config.generatedLiquidityMintCalldata = {
    generatedAt,
    calldataFile: "reports/dex-liquidity-provision/payload/liquidity-mint-calldata.json",
    calldataHash: calldataArtifact.calldataHash,
    calldataArtifactHash: calldataArtifact.calldataArtifactHash,
    liquiditySafeAddress: calldataArtifact.liquiditySafeAddress,
    nonfungiblePositionManager: calldataArtifact.nonfungiblePositionManager,
    poolAddress
  };

  writeJson(configFile, config);

  console.log(JSON.stringify({
    schema: "astra-dex-liquidity-mint-calldata-generation-result-v0.1",
    checkedAt: generatedAt,
    status: calldataArtifact.status,
    calldataFile: "reports/dex-liquidity-provision/payload/liquidity-mint-calldata.json",
    calldataHash: calldataArtifact.calldataHash,
    liquiditySafeAddress: calldataArtifact.liquiditySafeAddress,
    nonfungiblePositionManager: calldataArtifact.nonfungiblePositionManager,
    poolAddress,
    token0,
    token1,
    fee,
    tickLower,
    tickUpper,
    amount0Desired,
    amount1Desired,
    amount0Min,
    amount1Min,
    recipient,
    deadline,
    liquidityMintCalldataGenerated: true,
    liquiditySafePayloadGenerated: false,
    liquidityAdded: false,
    positionMinted: false,
    publicTradingApproved: false,
    fullLaunchApproved: false
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
