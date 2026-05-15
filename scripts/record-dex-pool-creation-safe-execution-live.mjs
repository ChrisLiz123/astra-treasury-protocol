import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const confirm = process.env.DEX_SAFE_EXECUTION_LIVE_CONFIRM || "";
const requiredConfirm = "RECORD_DEX_SAFE_EXECUTION_LIVE_POOL_CREATION_ONLY";

const executionTxHash = process.env.DEX_SAFE_EXECUTION_TX_HASH || "";
const executedBy = process.env.DEX_SAFE_EXECUTED_BY || "";
const executedAt = process.env.DEX_SAFE_EXECUTED_AT || "";
const executionMethod = process.env.DEX_SAFE_EXECUTION_METHOD || "";
const executionReference = process.env.DEX_SAFE_EXECUTION_REFERENCE || "";
const overwrite = process.env.OVERWRITE_DEX_SAFE_EXECUTION_LIVE || "";

const recordDir = path.join(root, "reports", "dex-pool-creation-safe-execution-live");
const recordFile = path.join(recordDir, "dex-pool-creation-safe-execution-live-record.json");
const poolRecordDir = path.join(root, "reports", "dex-pool-creation", "live");
const poolRecordFile = path.join(poolRecordDir, "dex-pool-created.json");
const configFile = path.join(root, "configs", "dex-pool-creation-safe-execution-live.config.json");

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

function isTxHash(value) {
  return /^0x[0-9a-fA-F]{64}$/.test(String(value || "").trim());
}

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || "").trim());
}

function sameAddress(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

function zeroAddress() {
  return "0x0000000000000000000000000000000000000000";
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

async function fetchJson(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`GET ${url} returned HTTP ${response.status}`);
  }

  return response.json();
}

function encodeAddress(value) {
  return String(value).replace(/^0x/i, "").toLowerCase().padStart(64, "0");
}

function encodeUint24(value) {
  return BigInt(value).toString(16).padStart(64, "0");
}

function decodeAddressFromWord(value) {
  const clean = String(value || "").replace(/^0x/i, "").padStart(64, "0");
  return `0x${clean.slice(-40)}`;
}

async function main() {
  if (confirm !== requiredConfirm) {
    issue("DEX_SAFE_EXECUTION_LIVE_CONFIRM", `Must equal ${requiredConfirm}.`);
  }

  if (!isTxHash(executionTxHash)) {
    issue("DEX_SAFE_EXECUTION_TX_HASH", "Execution transaction hash must be a 0x-prefixed 32-byte hash.");
  }

  requireUsable("DEX_SAFE_EXECUTED_BY", executedBy);
  requireUsable("DEX_SAFE_EXECUTED_AT", executedAt);
  requireUsable("DEX_SAFE_EXECUTION_METHOD", executionMethod);
  requireUsable("DEX_SAFE_EXECUTION_REFERENCE", executionReference);

  if (fs.existsSync(recordFile) && overwrite !== "YES") {
    issue("OVERWRITE_DEX_SAFE_EXECUTION_LIVE", "Execution live record already exists. Set OVERWRITE_DEX_SAFE_EXECUTION_LIVE=YES only if replacing intentionally.");
  }

  const approval = readJson("public-docs/dex-pool-creation-safe-execution-approval-status.json");
  const pending = readJson("public-docs/dex-pool-creation-safe-pending-signatures-status.json");
  const live = readJson("public-docs/dex-pool-creation-safe-submission-live-status.json");
  const payload = readJson("reports/dex-pool-creation-safe-payload-generation/generated/dex-pool-creation-safe-payload.json");
  const safeExecApproval = readJson("reports/dex-pool-creation-safe-execution-approval/dex-pool-creation-safe-execution-approval-record.json");
  const factoryRouter = readJson("reports/dex-pool-creation-factory-router-review/dex-pool-creation-factory-router-review.json");
  const fullLaunch = readJson("public-docs/full-launch-status.json");
  const treasuryFunding = readJson("public-docs/treasury-funding-status.json");
  const execution = readJson("public-docs/mainnet-execution-status.json");

  if (approval.status !== "DEX_POOL_CREATION_SAFE_EXECUTION_APPROVED_NOT_EXECUTED") {
    issue("approval.status", "Safe execution approval must be recorded.");
  }

  if (pending.status !== "DEX_POOL_CREATION_SAFE_PENDING_SIGNATURE_MONITORING_THRESHOLD_REACHED_NOT_EXECUTED") {
    issue("pending.status", "Pending signature monitor must show threshold reached and not executed.");
  }

  if (pending.summary?.thresholdReached !== true) {
    issue("pending.summary.thresholdReached", "Threshold must be reached.");
  }

  if (live.status !== "DEX_POOL_CREATION_SAFE_SUBMISSION_LIVE_RECORDED_NOT_EXECUTED") {
    issue("live.status", "Safe submission live evidence must be recorded.");
  }

  if (fullLaunch.fullLaunchApproved !== false) {
    issue("fullLaunch.fullLaunchApproved", "Full launch must remain not approved.");
  }

  if (treasuryFunding.treasuryFundingApproved !== false || treasuryFunding.treasuryFundingExecuted !== false) {
    issue("treasuryFunding", "Treasury funding must remain not approved and not executed.");
  }

  if (execution.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED") {
    issue("execution.mode", "Mainnet execution queue must remain disabled.");
  }

  const rpcUrl =
    process.env.DEX_SAFE_EXECUTION_RPC_URL ||
    process.env.DEX_POOL_PRECHECK_RPC_URL ||
    process.env.MAINNET_MONITOR_RPC_URL ||
    readRuntimeEnvValue("MAINNET_MONITOR_RPC_URL");

  if (!String(rpcUrl || "").startsWith("https://")) {
    issue("DEX_SAFE_EXECUTION_RPC_URL", "RPC URL must be available and start with https://.");
  }

  const safeTxHash = safeExecApproval.safeTxHash || pending.summary?.safeTxHash || "";
  const safeTxServiceUrl = `https://safe-transaction-base.safe.global/api/v1/multisig-transactions/${safeTxHash}/`;

  let safeTxService = {};
  let receipt = {};
  let poolAddress = "";
  let receiptStatusSuccess = false;
  let serviceExecutionConfirmed = false;

  if (issues.length === 0) {
    try {
      safeTxService = await fetchJson(safeTxServiceUrl);

      serviceExecutionConfirmed = safeTxService.isExecuted === true;

      if (!serviceExecutionConfirmed) {
        issue("safeTransactionService.isExecuted", "Safe Transaction Service does not yet show the transaction executed.");
      }

      if (safeTxService.transactionHash && !sameAddress(safeTxService.transactionHash, executionTxHash)) {
        issue("safeTransactionService.transactionHash", "Safe Transaction Service transactionHash does not match provided execution tx hash.");
      }

      if (safeTxService.safe && !sameAddress(safeTxService.safe, payload.safeAddress)) {
        issue("safeTransactionService.safe", "Safe address mismatch.");
      }

      if (safeTxService.to && !sameAddress(safeTxService.to, payload.transaction?.to)) {
        issue("safeTransactionService.to", "Target address mismatch.");
      }

      receipt = await rpcCall(rpcUrl, "eth_getTransactionReceipt", [executionTxHash]);

      if (!receipt || typeof receipt !== "object") {
        issue("receipt", "Execution transaction receipt not found.");
      } else {
        receiptStatusSuccess = receipt.status === "0x1";

        if (!receiptStatusSuccess) {
          issue("receipt.status", `Execution transaction receipt status is not success: ${receipt.status}`);
        }
      }

      const token0 = payload.transaction?.parameters?.token0 || "";
      const token1 = payload.transaction?.parameters?.token1 || "";
      const fee = payload.transaction?.parameters?.fee || "";
      const factoryAddress = factoryRouter.rpcChecks?.nfpmFactoryAddress || "0x33128a8fC17869897dcE68Ed026d694621f6FDfD";

      const getPoolSelector = "0x1698ee82";
      const getPoolCalldata =
        getPoolSelector +
        encodeAddress(token0) +
        encodeAddress(token1) +
        encodeUint24(fee);

      const getPoolResult = await rpcCall(rpcUrl, "eth_call", [
        {
          to: factoryAddress,
          data: getPoolCalldata
        },
        "latest"
      ]);

      poolAddress = decodeAddressFromWord(getPoolResult);

      if (!isAddress(poolAddress) || sameAddress(poolAddress, zeroAddress())) {
        issue("factory.getPool", `Factory getPool did not return a non-zero pool address: ${poolAddress}`);
      }
    } catch (error) {
      issue("executionVerification", error.message);
    }
  }

  if (issues.length > 0) {
    console.log(JSON.stringify({
      schema: "astra-dex-pool-creation-safe-execution-live-result-v0.1",
      checkedAt: new Date().toISOString(),
      status: "STOP_DEX_SAFE_EXECUTION_LIVE_NOT_RECORDED",
      issues
    }, null, 2));
    process.exit(1);
  }

  fs.mkdirSync(recordDir, { recursive: true });
  fs.mkdirSync(poolRecordDir, { recursive: true });

  const now = new Date().toISOString();

  const record = {
    schema: "astra-dex-pool-creation-safe-execution-live-record-v0.1",
    recordedAt: now,
    status: "DEX_POOL_CREATION_SAFE_EXECUTION_LIVE_RECORDED_POOL_CREATED_NO_LIQUIDITY",
    selectedPublicPurchasePath: "dex-liquidity-pool-trading",
    safeTxHash,
    safeNonce: safeExecApproval.safeNonce,
    safeAddress: payload.safeAddress,
    payloadHash: payload.payloadHash,
    targetAddress: payload.transaction?.to,
    functionSignature: payload.transaction?.functionSignature,
    executionTxHash,
    executionMethod,
    executedBy,
    executedAt,
    executionReference,
    safeTransactionServiceUrl: safeTxServiceUrl,
    safeTransactionServiceExecutionConfirmed: serviceExecutionConfirmed,
    receiptStatusSuccess,
    poolAddress,
    token0: payload.transaction?.parameters?.token0,
    token0Symbol: payload.transaction?.parameters?.token0Symbol,
    token1: payload.transaction?.parameters?.token1,
    token1Symbol: payload.transaction?.parameters?.token1Symbol,
    fee: payload.transaction?.parameters?.fee,
    sqrtPriceX96: payload.transaction?.parameters?.sqrtPriceX96,
    safeTransactionExecuted: true,
    poolCreated: true,
    poolAddressVerified: true,
    liquidityProvisionApproved: false,
    liquidityAdded: false,
    publicTradingApproved: false,
    publicTradingLinkApproved: false,
    buyPageActivated: false,
    treasuryFundingApproved: false,
    treasuryFundsMoved: false,
    fullLaunchApproved: false,
    safety: {
      executedByOperator: true,
      executedByThisScript: false,
      addsLiquidity: false,
      movesTreasuryFunds: false,
      activatesBuyPage: false,
      approvesPublicTrading: false,
      approvesFullLaunch: false
    }
  };

  const poolRecord = {
    schema: "astra-dex-pool-created-evidence-v0.1",
    recordedAt: now,
    status: "DEX_POOL_CREATED_BY_SAFE_EXECUTION_NO_LIQUIDITY",
    poolAddress,
    safeTxHash,
    executionTxHash,
    safeAddress: payload.safeAddress,
    targetAddress: payload.transaction?.to,
    token0: payload.transaction?.parameters?.token0,
    token0Symbol: payload.transaction?.parameters?.token0Symbol,
    token1: payload.transaction?.parameters?.token1,
    token1Symbol: payload.transaction?.parameters?.token1Symbol,
    fee: payload.transaction?.parameters?.fee,
    sqrtPriceX96: payload.transaction?.parameters?.sqrtPriceX96,
    liquidityAdded: false,
    publicTradingApproved: false,
    buyPageActivated: false,
    fullLaunchApproved: false
  };

  writeJson(recordFile, record);
  writeJson(poolRecordFile, poolRecord);

  const config = readJsonPath(configFile);

  config.status = "safe-execution-live-recorded-pool-created-no-liquidity";
  config.safeExecutionLiveRecorded = true;
  config.safeTransactionExecuted = true;
  config.poolCreated = true;
  config.poolAddressVerified = true;
  config.liquidityProvisionApproved = false;
  config.liquidityAdded = false;
  config.publicTradingApproved = false;
  config.publicTradingLinkApproved = false;
  config.buyPageActivationApproved = false;
  config.treasuryFundingApproved = false;
  config.treasuryFundsMoved = false;
  config.fullLaunchApproved = false;
  config.liveExecution = {
    recordedAt: now,
    executionTxHash,
    safeTxHash,
    poolAddress,
    recordFile: "reports/dex-pool-creation-safe-execution-live/dex-pool-creation-safe-execution-live-record.json"
  };

  writeJson(configFile, config);

  console.log(JSON.stringify({
    schema: "astra-dex-pool-creation-safe-execution-live-result-v0.1",
    checkedAt: now,
    status: "DEX_POOL_CREATION_SAFE_EXECUTION_LIVE_RECORDED_POOL_CREATED_NO_LIQUIDITY",
    executionTxHash,
    safeTxHash,
    poolAddress,
    safeTransactionExecuted: true,
    poolCreated: true,
    liquidityAdded: false,
    movesFunds: false,
    publicTradingApproved: false,
    fullLaunchApproved: false
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
