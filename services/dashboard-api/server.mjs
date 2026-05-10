import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  formatEther,
  formatUnits,
  getAddress,
  http as viemHttp,
  parseAbi,
  parseAbiItem
} from "viem";
import { baseSepolia } from "viem/chains";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");
const deploymentEnvPath = path.join(projectRoot, "deployments", "base-sepolia.env");

loadEnvFile(deploymentEnvPath);

const PORT = Number(process.env.DASHBOARD_PORT || 8787);
const HOST = process.env.DASHBOARD_HOST || "127.0.0.1";
const RPC_URL =
  process.env.DASHBOARD_RPC_URL ||
  process.env.BASE_SEPOLIA_RPC_URL ||
  "https://base-sepolia-rpc.publicnode.com";

const LOOKBACK_BLOCKS = BigInt(process.env.DASHBOARD_LOOKBACK_BLOCKS || "50000");

const ACTION_NAMES = [
  "HOLD",
  "ADD_LIQUIDITY",
  "REMOVE_LIQUIDITY",
  "BUYBACK_SMALL",
  "REBALANCE_TO_STABLES",
  "REBALANCE_TO_ETH",
  "GRANT",
  "PAUSE_RISKY_ACTIONS"
];

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const tokenAddress = requireAddress("ASTRA_TOKEN");
const policyAddress = requireAddress("ASTRA_POLICY");
const vaultAddress = requireAddress("ASTRA_VAULT");
const registryAddress = requireAddress("ASTRA_SIGNAL_REGISTRY");
const controllerAddress = requireAddress("ASTRA_CONTROLLER");

const client = createPublicClient({
  chain: baseSepolia,
  transport: viemHttp(RPC_URL)
});

const tokenAbi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)"
]);

const policyAbi = parseAbi([
  "function config() view returns (uint16 maxSingleTradeBps, uint16 maxDailyTradeBps, uint16 minStableReserveBps, uint16 maxMonthlyBuybackRevenueBps, uint16 maxSlippageBps, bool allowBuybacks, bool allowLiquidityActions, bool allowGrants)",
  "function isApprovedAsset(address asset) view returns (bool)"
]);

const vaultAbi = parseAbi([
  "function policy() view returns (address)",
  "function paused() view returns (bool)",
  "function EXECUTOR_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)"
]);

const registryAbi = parseAbi([
  "function signals(bytes32 signalId) view returns (bytes32 signalId, string modelVersion, uint8 actionType, uint16 confidenceBps, uint16 riskBps, uint256 maxSizeUsd, bytes32 dataHash, string reasonCode, uint64 createdAt, address submittedBy, bool cancelled)",
  "function signalExists(bytes32 signalId) view returns (bool)",
  "function paused() view returns (bool)"
]);

const controllerAbi = parseAbi([
  "function vault() view returns (address)",
  "function policy() view returns (address)",
  "function signalRegistry() view returns (address)",
  "function paused() view returns (bool)",
  "function actionExecuted(bytes32 actionId) view returns (bool)"
]);

const signalSubmittedEvent = parseAbiItem(
  "event SignalSubmitted(bytes32 indexed signalId, string modelVersion, uint8 actionType, uint16 confidenceBps, uint16 riskBps, uint256 maxSizeUsd, bytes32 dataHash, string reasonCode, address indexed submittedBy)"
);

const actionExecutedEvent = parseAbiItem(
  "event ActionExecuted(bytes32 indexed actionId, bytes32 indexed signalId, uint8 actionType, address indexed asset, address recipient, uint256 amount, string memo, address executor)"
);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^(?:export\s+)?([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;

    const key = match[1];
    let value = match[2].trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function requireAddress(name) {
  const value = process.env[name];

  if (!value || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`${name} is missing or invalid in deployments/base-sepolia.env`);
  }

  return getAddress(value);
}

function optionalAddress(name) {
  const value = process.env[name];

  if (!value) return undefined;

  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`${name} is invalid in deployments/base-sepolia.env`);
  }

  return getAddress(value);
}

function optionalBytes32(name) {
  const value = process.env[name];

  if (!value) return undefined;

  if (!/^0x[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error(`${name} is invalid. It should be 0x plus 64 hex characters.`);
  }

  return value;
}

function getStructField(value, key, index) {
  return value?.[key] ?? value?.[index];
}

function actionName(actionType) {
  return ACTION_NAMES[Number(actionType)] || `UNKNOWN_${actionType}`;
}

function bigIntJson(_key, value) {
  return typeof value === "bigint" ? value.toString() : value;
}

function sameAddress(a, b) {
  return String(a).toLowerCase() === String(b).toLowerCase();
}

function tokenRead(functionName, args = []) {
  return client.readContract({ address: tokenAddress, abi: tokenAbi, functionName, args });
}

function policyRead(functionName, args = []) {
  return client.readContract({ address: policyAddress, abi: policyAbi, functionName, args });
}

function vaultRead(functionName, args = []) {
  return client.readContract({ address: vaultAddress, abi: vaultAbi, functionName, args });
}

function registryRead(functionName, args = []) {
  return client.readContract({ address: registryAddress, abi: registryAbi, functionName, args });
}

function controllerRead(functionName, args = []) {
  return client.readContract({ address: controllerAddress, abi: controllerAbi, functionName, args });
}


const paperDir = path.join(projectRoot, "reports", "paper-trading");
const paperFiles = {
  latest: path.join(paperDir, "latest.json"),
  latestObserved: path.join(paperDir, "latest-observed.json"),
  state: path.join(paperDir, "state.json"),
  heartbeat: path.join(paperDir, "heartbeat.json"),
  signals: path.join(paperDir, "signals.jsonl"),
  errors: path.join(paperDir, "errors.jsonl"),
  onchainSubmissions: path.join(paperDir, "onchain-submissions.jsonl"),
  approvalQueue: path.join(paperDir, "approval-queue.json"),
  approvalEvents: path.join(paperDir, "approval-events.jsonl")
};

function readJsonFile(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return {
      error: error.message,
      filePath
    };
  }
}

function readJsonlFile(filePath, limit = 50) {
  try {
    if (!fs.existsSync(filePath)) return [];

    const lines = fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    return lines
      .slice(-limit)
      .reverse()
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (error) {
          return {
            parseError: error.message,
            raw: line
          };
        }
      });
  } catch (error) {
    return [
      {
        error: error.message,
        filePath
      }
    ];
  }
}

function getPaperHeartbeat() {
  return {
    file: paperFiles.heartbeat,
    exists: fs.existsSync(paperFiles.heartbeat),
    data: readJsonFile(paperFiles.heartbeat, {
      status: "MISSING",
      message: "Paper-trading heartbeat file does not exist yet."
    })
  };
}

function getPaperLatest() {
  return {
    latestPending: {
      file: paperFiles.latest,
      exists: fs.existsSync(paperFiles.latest),
      data: readJsonFile(paperFiles.latest, null)
    },
    latestObserved: {
      file: paperFiles.latestObserved,
      exists: fs.existsSync(paperFiles.latestObserved),
      data: readJsonFile(paperFiles.latestObserved, null)
    }
  };
}

function getPaperState() {
  return {
    file: paperFiles.state,
    exists: fs.existsSync(paperFiles.state),
    data: readJsonFile(paperFiles.state, null)
  };
}

function getPaperSignals(limit = Number(process.env.DASHBOARD_PAPER_SIGNAL_LIMIT || "50")) {
  const signals = readJsonlFile(paperFiles.signals, limit);
  const onchainSubmissions = readJsonlFile(paperFiles.onchainSubmissions, limit);

  const submissionsBySignal = new Map();

  for (const submission of onchainSubmissions) {
    if (!submission?.signalId) continue;

    if (!submissionsBySignal.has(submission.signalId)) {
      submissionsBySignal.set(submission.signalId, []);
    }

    submissionsBySignal.get(submission.signalId).push(submission);
  }

  const items = signals.map((record) => {
    const signalId = record.signalId || record.paperSignalId;
    const submissions = signalId ? submissionsBySignal.get(signalId) || [] : [];

    return {
      ...record,
      submittedOnChain: submissions.length > 0 || Boolean(record.submittedOnChain),
      onchainSubmissionCount: submissions.length,
      latestOnchainSubmission: submissions[0] || null,
      onchainSubmissions: submissions
    };
  });

  return {
    found: items.length > 0,
    count: items.length,
    limit,
    file: paperFiles.signals,
    exists: fs.existsSync(paperFiles.signals),
    items
  };
}

function getPaperErrors(limit = Number(process.env.DASHBOARD_PAPER_ERROR_LIMIT || "25")) {
  const errors = readJsonlFile(paperFiles.errors, limit);

  return {
    found: errors.length > 0,
    count: errors.length,
    limit,
    file: paperFiles.errors,
    exists: fs.existsSync(paperFiles.errors),
    items: errors
  };
}

function getPaperOnchainSubmissions(limit = Number(process.env.DASHBOARD_PAPER_SUBMISSION_LIMIT || "50")) {
  const items = readJsonlFile(paperFiles.onchainSubmissions, limit);

  return {
    found: items.length > 0,
    count: items.length,
    limit,
    file: paperFiles.onchainSubmissions,
    exists: fs.existsSync(paperFiles.onchainSubmissions),
    items
  };
}


function normalizeApprovalStatus(status) {
  const value = String(status || "NEW").toUpperCase();

  if (value === "APPROVED") return "APPROVED";
  if (value === "SUBMITTED_ONCHAIN") return "SUBMITTED_ONCHAIN";
  if (value === "REJECTED") return "REJECTED";

  return "NEW";
}

function sortApprovalItems(items) {
  return items.sort((a, b) => {
    const ad = a.capturedAt || a.updatedAt || a.createdAt || "";
    const bd = b.capturedAt || b.updatedAt || b.createdAt || "";
    return String(bd).localeCompare(String(ad));
  });
}


const executionDir = path.join(projectRoot, "reports", "execution-queue");
const executionFiles = {
  queue: path.join(executionDir, "execution-queue.json"),
  events: path.join(executionDir, "execution-events.jsonl"),
  onchainExecutions: path.join(executionDir, "onchain-executions.jsonl")
};

function normalizeExecutionStatus(status) {
  const value = String(status || "NEW").toUpperCase();

  if (value === "POLICY_PASSED") return "POLICY_PASSED";
  if (value === "APPROVED_FOR_EXECUTION") return "APPROVED_FOR_EXECUTION";
  if (value === "EXECUTED") return "EXECUTED";
  if (value === "POLICY_BLOCKED") return "POLICY_BLOCKED";
  if (value === "REJECTED") return "REJECTED";
  if (value === "UNSUPPORTED_ACTION") return "UNSUPPORTED_ACTION";
  if (value === "SIGNAL_CANCELLED") return "SIGNAL_CANCELLED";

  return "NEW";
}

function sortExecutionItems(items) {
  return items.sort((a, b) => {
    const ad = a.createdAt || a.updatedAt || "";
    const bd = b.createdAt || b.updatedAt || "";
    return String(bd).localeCompare(String(ad));
  });
}

function getExecutionQueue(limit = Number(process.env.DASHBOARD_EXECUTION_QUEUE_LIMIT || "100")) {
  const queue = readJsonFile(executionFiles.queue, {
    version: "astra-execution-queue-v0.1",
    createdAt: null,
    updatedAt: null,
    items: {}
  });

  const events = readJsonlFile(executionFiles.events, 100);
  const onchainExecutions = readJsonlFile(executionFiles.onchainExecutions, 100);

  const items = sortExecutionItems(
    Object.values(queue.items || {}).map((item) => {
      const status = normalizeExecutionStatus(item.status);

      return {
        ...item,
        status,
        actionName: item.proposal?.actionName || item.signal?.actionName || null,
        policyAllowed: item.policyCheck?.allowed ?? null,
        policyReason: item.policyCheck?.reason ?? null,
        amountFormatted: item.proposal?.amountFormatted || null,
        recipient: item.proposal?.recipient || null,
        latestTxHash:
          item.execution?.txHash ||
          item.executionCheck?.matchingExecutions?.[0]?.transactionHash ||
          null
      };
    })
  ).slice(0, limit);

  const grouped = {
    policyPassed: items.filter((item) => item.status === "POLICY_PASSED"),
    approvedForExecution: items.filter((item) => item.status === "APPROVED_FOR_EXECUTION"),
    executed: items.filter((item) => item.status === "EXECUTED"),
    policyBlocked: items.filter((item) => item.status === "POLICY_BLOCKED"),
    rejected: items.filter((item) => item.status === "REJECTED"),
    unsupportedAction: items.filter((item) => item.status === "UNSUPPORTED_ACTION"),
    signalCancelled: items.filter((item) => item.status === "SIGNAL_CANCELLED"),
    new: items.filter((item) => item.status === "NEW")
  };

  return {
    app: "AstraTreasury Policy-Aware Execution Queue",
    generatedAt: new Date().toISOString(),
    file: executionFiles.queue,
    eventsFile: executionFiles.events,
    executionsFile: executionFiles.onchainExecutions,
    queueExists: fs.existsSync(executionFiles.queue),
    queueUpdatedAt: queue.updatedAt || null,
    summary: {
      total: items.length,
      policyPassed: grouped.policyPassed.length,
      approvedForExecution: grouped.approvedForExecution.length,
      executed: grouped.executed.length,
      policyBlocked: grouped.policyBlocked.length,
      rejected: grouped.rejected.length,
      unsupportedAction: grouped.unsupportedAction.length,
      signalCancelled: grouped.signalCancelled.length,
      new: grouped.new.length
    },
    grouped,
    items,
    recentEvents: events,
    onchainExecutions
  };
}

function getApprovalQueue(limit = Number(process.env.DASHBOARD_APPROVAL_QUEUE_LIMIT || "100")) {
  const queue = readJsonFile(paperFiles.approvalQueue, {
    version: "astra-approval-queue-v0.1",
    createdAt: null,
    updatedAt: null,
    items: {}
  });

  const approvalEvents = readJsonlFile(paperFiles.approvalEvents, 100);
  const paperSignals = getPaperSignals(limit);
  const itemsBySignal = new Map();

  for (const record of paperSignals.items || []) {
    const signalId = record.signalId || record.paperSignalId;
    if (!signalId) continue;

    const queueItem = queue.items?.[signalId] || {};
    const status = normalizeApprovalStatus(
      record.submittedOnChain ? "SUBMITTED_ONCHAIN" : queueItem.status || "NEW"
    );

    itemsBySignal.set(signalId, {
      signalId,
      status,
      capturedAt: record.capturedAt || queueItem.capturedAt || null,
      updatedAt: queueItem.updatedAt || null,
      actionName: record.actionName || queueItem.actionName || null,
      reasonCode: record.signal?.reason_code || queueItem.reasonCode || null,
      confidenceBps: record.signal?.confidence_bps ?? queueItem.confidenceBps ?? null,
      riskBps: record.signal?.risk_bps ?? queueItem.riskBps ?? null,
      paperRecord: record,
      approval: queueItem.approval || null,
      rejection: queueItem.rejection || null,
      submittedOnChain: record.submittedOnChain || status === "SUBMITTED_ONCHAIN",
      latestTxHash: record.latestOnchainSubmission?.txHash || queueItem.latestTxHash || null,
      latestOnchainSubmission: record.latestOnchainSubmission || queueItem.onchainSubmissions?.[0] || null,
      onchainSubmissions: record.onchainSubmissions || queueItem.onchainSubmissions || []
    });
  }

  for (const [signalId, queueItem] of Object.entries(queue.items || {})) {
    if (itemsBySignal.has(signalId)) continue;

    const record = queueItem.paperRecord || {};
    const status = normalizeApprovalStatus(queueItem.status);

    itemsBySignal.set(signalId, {
      signalId,
      status,
      capturedAt: queueItem.capturedAt || record.capturedAt || null,
      updatedAt: queueItem.updatedAt || null,
      actionName: queueItem.actionName || record.actionName || null,
      reasonCode: queueItem.reasonCode || record.signal?.reason_code || null,
      confidenceBps: queueItem.confidenceBps ?? record.signal?.confidence_bps ?? null,
      riskBps: queueItem.riskBps ?? record.signal?.risk_bps ?? null,
      paperRecord: record,
      approval: queueItem.approval || null,
      rejection: queueItem.rejection || null,
      submittedOnChain: status === "SUBMITTED_ONCHAIN",
      latestTxHash: queueItem.latestTxHash || null,
      latestOnchainSubmission: queueItem.onchainSubmissions?.[0] || null,
      onchainSubmissions: queueItem.onchainSubmissions || []
    });
  }

  const allItems = sortApprovalItems(Array.from(itemsBySignal.values()));

  const grouped = {
    new: allItems.filter((item) => item.status === "NEW"),
    approved: allItems.filter((item) => item.status === "APPROVED"),
    submittedOnChain: allItems.filter((item) => item.status === "SUBMITTED_ONCHAIN"),
    rejected: allItems.filter((item) => item.status === "REJECTED")
  };

  return {
    app: "AstraTreasury Manual Approval Queue",
    generatedAt: new Date().toISOString(),
    file: paperFiles.approvalQueue,
    eventsFile: paperFiles.approvalEvents,
    queueExists: fs.existsSync(paperFiles.approvalQueue),
    queueUpdatedAt: queue.updatedAt || null,
    summary: {
      total: allItems.length,
      new: grouped.new.length,
      approved: grouped.approved.length,
      submittedOnChain: grouped.submittedOnChain.length,
      rejected: grouped.rejected.length
    },
    grouped,
    items: allItems,
    recentApprovalEvents: approvalEvents
  };
}

function getPaperStatus() {
  const heartbeat = getPaperHeartbeat();
  const latest = getPaperLatest();
  const state = getPaperState();
  const signals = getPaperSignals();
  const errors = getPaperErrors(5);
  const onchainSubmissions = getPaperOnchainSubmissions();

  const heartbeatData = heartbeat.data || {};
  const stateData = state.data || {};
  const latestPending = latest.latestPending.data || null;
  const latestObserved = latest.latestObserved.data || null;

  const pendingSignals = signals.items.filter((item) => {
    return item.manualApprovalRequired && !item.submittedOnChain;
  });

  const loopHealthy =
    heartbeat.exists &&
    heartbeatData.status === "OK" &&
    !String(heartbeatData.message || "").toLowerCase().includes("error");

  return {
    app: "AstraTreasury Paper-Trading Dashboard",
    generatedAt: new Date().toISOString(),
    health: {
      status: loopHealthy ? "OK" : "WARN",
      loopHealthy,
      heartbeatStatus: heartbeatData.status || "UNKNOWN",
      lastCheckedAt: heartbeatData.checkedAt || null,
      lastObservedActionName: heartbeatData.lastObservedActionName || null,
      duplicateSkipped: Boolean(heartbeatData.duplicateSkipped),
      errorCountShown: errors.count
    },
    files: {
      paperDir,
      latest: {
        exists: latest.latestPending.exists,
        file: latest.latestPending.file
      },
      latestObserved: {
        exists: latest.latestObserved.exists,
        file: latest.latestObserved.file
      },
      state: {
        exists: state.exists,
        file: state.file
      },
      signals: {
        exists: signals.exists,
        file: signals.file
      },
      heartbeat: {
        exists: heartbeat.exists,
        file: heartbeat.file
      }
    },
    summary: {
      totalPaperSignalsShown: signals.count,
      pendingManualApprovalsShown: pendingSignals.length,
      onchainSubmissionsShown: onchainSubmissions.count,
      cashUsd: stateData.cashUsd ?? null,
      liquidityUsd: stateData.liquidityUsd ?? null,
      astpTokens: stateData.astpTokens ?? null,
      lastTokenPriceUsd: stateData.lastTokenPriceUsd ?? null,
      totalPaperValueUsd: stateData.totalPaperValueUsd ?? null,
      signalCount: stateData.signalCount ?? null,
      appliedPaperActionCount: stateData.appliedPaperActionCount ?? null
    },
    heartbeat,
    latest,
    state,
    pendingManualApprovals: pendingSignals,
    recentSignals: signals,
    recentErrors: errors,
    onchainSubmissions
  };
}

async function getContractCodeStatus() {
  const entries = {
    token: tokenAddress,
    policy: policyAddress,
    vault: vaultAddress,
    signalRegistry: registryAddress,
    controller: controllerAddress
  };

  const rows = {};

  for (const [name, address] of Object.entries(entries)) {
    const bytecode = await client.getBytecode({ address });

    rows[name] = {
      address,
      hasCode: Boolean(bytecode && bytecode !== "0x")
    };
  }

  return rows;
}

async function getTreasury() {
  const [name, symbol, decimals, totalSupply, vaultAstpBalance, vaultEthBalance] =
    await Promise.all([
      tokenRead("name"),
      tokenRead("symbol"),
      tokenRead("decimals"),
      tokenRead("totalSupply"),
      tokenRead("balanceOf", [vaultAddress]),
      client.getBalance({ address: vaultAddress })
    ]);

  const watchedWallets = {
    treasuryVault: vaultAddress,
    liquidityWallet: optionalAddress("ASTRA_LIQUIDITY_WALLET"),
    ecosystemWallet: optionalAddress("ASTRA_ECOSYSTEM_WALLET"),
    teamWallet: optionalAddress("ASTRA_TEAM_WALLET"),
    communityWallet: optionalAddress("ASTRA_COMMUNITY_WALLET"),
    advisorsWallet: optionalAddress("ASTRA_ADVISORS_WALLET"),
    testRecipient: optionalAddress("ASTRA_TEST_RECIPIENT")
  };

  const balances = {};

  for (const [label, address] of Object.entries(watchedWallets)) {
    if (!address) continue;

    const balance = await tokenRead("balanceOf", [address]);

    balances[label] = {
      address,
      astpRaw: balance,
      astp: formatUnits(balance, Number(decimals))
    };
  }

  return {
    token: {
      address: tokenAddress,
      name,
      symbol,
      decimals: Number(decimals),
      totalSupplyRaw: totalSupply,
      totalSupply: formatUnits(totalSupply, Number(decimals))
    },
    vault: {
      address: vaultAddress,
      astpBalanceRaw: vaultAstpBalance,
      astpBalance: formatUnits(vaultAstpBalance, Number(decimals)),
      ethBalanceWei: vaultEthBalance,
      ethBalance: formatEther(vaultEthBalance)
    },
    watchedBalances: balances
  };
}

async function getPolicy() {
  const cfg = await policyRead("config");
  const astpApproved = await policyRead("isApprovedAsset", [tokenAddress]);
  const nativeEthApproved = await policyRead("isApprovedAsset", [ZERO_ADDRESS]);

  return {
    address: policyAddress,
    approvedAssets: {
      astp: astpApproved,
      nativeEth: nativeEthApproved
    },
    config: {
      maxSingleTradeBps: Number(getStructField(cfg, "maxSingleTradeBps", 0)),
      maxDailyTradeBps: Number(getStructField(cfg, "maxDailyTradeBps", 1)),
      minStableReserveBps: Number(getStructField(cfg, "minStableReserveBps", 2)),
      maxMonthlyBuybackRevenueBps: Number(getStructField(cfg, "maxMonthlyBuybackRevenueBps", 3)),
      maxSlippageBps: Number(getStructField(cfg, "maxSlippageBps", 4)),
      allowBuybacks: Boolean(getStructField(cfg, "allowBuybacks", 5)),
      allowLiquidityActions: Boolean(getStructField(cfg, "allowLiquidityActions", 6)),
      allowGrants: Boolean(getStructField(cfg, "allowGrants", 7))
    }
  };
}

async function latestBlockRange() {
  const latest = await client.getBlockNumber();
  const fromBlock = latest > LOOKBACK_BLOCKS ? latest - LOOKBACK_BLOCKS : 0n;

  return { fromBlock, toBlock: latest };
}

async function findLatestSignalIdFromLogs() {
  try {
    const { fromBlock, toBlock } = await latestBlockRange();

    const logs = await client.getLogs({
      address: registryAddress,
      event: signalSubmittedEvent,
      fromBlock,
      toBlock
    });

    if (logs.length === 0) return undefined;

    logs.sort((a, b) => {
      if (a.blockNumber === b.blockNumber) {
        return Number(a.logIndex ?? 0) - Number(b.logIndex ?? 0);
      }

      return a.blockNumber > b.blockNumber ? 1 : -1;
    });

    return logs.at(-1)?.args.signalId;
  } catch (_error) {
    return undefined;
  }
}

async function getLatestSignal() {
  const configuredSignalId = optionalBytes32("ASTRA_SIGNAL_ID");
  const latestLogSignalId = await findLatestSignalIdFromLogs();
  const signalId = latestLogSignalId || configuredSignalId;

  if (!signalId) {
    return {
      found: false,
      source: "none",
      message: "No ASTRA_SIGNAL_ID set and no SignalSubmitted events found in the lookback window."
    };
  }

  const exists = await registryRead("signalExists", [signalId]);

  if (!exists) {
    return {
      found: false,
      source: latestLogSignalId ? "event_logs" : "ASTRA_SIGNAL_ID",
      signalId,
      message: "Signal ID was found, but SignalRegistry.signalExists returned false."
    };
  }

  const signal = await registryRead("signals", [signalId]);
  const actionType = Number(getStructField(signal, "actionType", 2));

  return {
    found: true,
    source: latestLogSignalId ? "event_logs" : "ASTRA_SIGNAL_ID",
    signalId,
    modelVersion: String(getStructField(signal, "modelVersion", 1)),
    actionType,
    actionName: actionName(actionType),
    confidenceBps: Number(getStructField(signal, "confidenceBps", 3)),
    riskBps: Number(getStructField(signal, "riskBps", 4)),
    maxSizeUsdRaw: getStructField(signal, "maxSizeUsd", 5),
    dataHash: String(getStructField(signal, "dataHash", 6)),
    reasonCode: String(getStructField(signal, "reasonCode", 7)),
    createdAt: Number(getStructField(signal, "createdAt", 8)),
    submittedBy: String(getStructField(signal, "submittedBy", 9)),
    cancelled: Boolean(getStructField(signal, "cancelled", 10))
  };
}

async function getRecentExecution() {
  try {
    const { fromBlock, toBlock } = await latestBlockRange();

    const logs = await client.getLogs({
      address: controllerAddress,
      event: actionExecutedEvent,
      fromBlock,
      toBlock
    });

    if (logs.length === 0) {
      return {
        found: false,
        message: "No ActionExecuted events found in the lookback window.",
        lookbackBlocks: LOOKBACK_BLOCKS.toString()
      };
    }

    logs.sort((a, b) => {
      if (a.blockNumber === b.blockNumber) {
        return Number(a.logIndex ?? 0) - Number(b.logIndex ?? 0);
      }

      return a.blockNumber > b.blockNumber ? 1 : -1;
    });

    const log = logs.at(-1);
    const args = log.args;

    const executed = await controllerRead("actionExecuted", [args.actionId]);
    const amount = args.amount;
    const isAstp = sameAddress(args.asset, tokenAddress);
    const isNative = sameAddress(args.asset, ZERO_ADDRESS);

    return {
      found: true,
      transactionHash: log.transactionHash,
      blockNumber: log.blockNumber,
      actionId: args.actionId,
      signalId: args.signalId,
      actionType: Number(args.actionType),
      actionName: actionName(Number(args.actionType)),
      asset: args.asset,
      assetType: isAstp ? "ASTP" : isNative ? "ETH" : "OTHER",
      recipient: args.recipient,
      amountRaw: amount,
      amountFormatted: isAstp ? formatUnits(amount, 18) : isNative ? formatEther(amount) : amount.toString(),
      memo: args.memo,
      executor: args.executor,
      markedExecuted: executed,
      explorerUrl: `https://sepolia.basescan.org/tx/${log.transactionHash}`
    };
  } catch (error) {
    return {
      found: false,
      message: "Could not load recent execution logs.",
      error: error.message,
      lookbackBlocks: LOOKBACK_BLOCKS.toString()
    };
  }
}



async function getSignalHistory(limit = Number(process.env.DASHBOARD_SIGNAL_HISTORY_LIMIT || process.env.DASHBOARD_HISTORY_LIMIT || "50")) {
  try {
    const { fromBlock, toBlock } = await latestBlockRange();

    const [signalLogs, executionLogs] = await Promise.all([
      client.getLogs({
        address: registryAddress,
        event: signalSubmittedEvent,
        fromBlock,
        toBlock
      }),
      client.getLogs({
        address: controllerAddress,
        event: actionExecutedEvent,
        fromBlock,
        toBlock
      }).catch(() => [])
    ]);

    const executionsBySignal = new Map();

    for (const log of executionLogs) {
      const args = log.args;
      const signalId = String(args.signalId);
      const actionType = Number(args.actionType);
      const amount = args.amount;
      const isAstp = sameAddress(args.asset, tokenAddress);
      const isNative = sameAddress(args.asset, ZERO_ADDRESS);

      const item = {
        transactionHash: log.transactionHash,
        explorerUrl: `https://sepolia.basescan.org/tx/${log.transactionHash}`,
        blockNumber: log.blockNumber,
        logIndex: log.logIndex,
        actionId: args.actionId,
        signalId: args.signalId,
        actionType,
        actionName: actionName(actionType),
        asset: args.asset,
        assetType: isAstp ? "ASTP" : isNative ? "ETH" : "OTHER",
        recipient: args.recipient,
        amountRaw: amount,
        amountFormatted: isAstp
          ? formatUnits(amount, 18)
          : isNative
            ? formatEther(amount)
            : amount.toString(),
        memo: args.memo,
        executor: args.executor
      };

      if (!executionsBySignal.has(signalId)) {
        executionsBySignal.set(signalId, []);
      }

      executionsBySignal.get(signalId).push(item);
    }

    for (const items of executionsBySignal.values()) {
      items.sort((a, b) => {
        if (a.blockNumber === b.blockNumber) {
          return Number(b.logIndex ?? 0) - Number(a.logIndex ?? 0);
        }

        return a.blockNumber > b.blockNumber ? -1 : 1;
      });
    }

    signalLogs.sort((a, b) => {
      if (a.blockNumber === b.blockNumber) {
        return Number(b.logIndex ?? 0) - Number(a.logIndex ?? 0);
      }

      return a.blockNumber > b.blockNumber ? -1 : 1;
    });

    const selected = signalLogs.slice(0, limit);

    const items = await Promise.all(
      selected.map(async (log) => {
        const args = log.args;
        const signalId = args.signalId;
        const signalIdKey = String(signalId);
        const actionType = Number(args.actionType);
        const relatedExecutions = executionsBySignal.get(signalIdKey) || [];

        let onChainRecordExists = false;
        let cancelled = false;
        let createdAt = null;
        let storedSubmittedBy = null;

        try {
          onChainRecordExists = await registryRead("signalExists", [signalId]);

          if (onChainRecordExists) {
            const storedSignal = await registryRead("signals", [signalId]);
            cancelled = Boolean(getStructField(storedSignal, "cancelled", 10));
            createdAt = Number(getStructField(storedSignal, "createdAt", 8));
            storedSubmittedBy = String(getStructField(storedSignal, "submittedBy", 9));
          }
        } catch (_error) {
          onChainRecordExists = false;
        }

        return {
          transactionHash: log.transactionHash,
          explorerUrl: `https://sepolia.basescan.org/tx/${log.transactionHash}`,
          blockNumber: log.blockNumber,
          logIndex: log.logIndex,
          signalId,
          modelVersion: String(args.modelVersion),
          actionType,
          actionName: actionName(actionType),
          confidenceBps: Number(args.confidenceBps),
          riskBps: Number(args.riskBps),
          maxSizeUsdRaw: args.maxSizeUsd,
          dataHash: args.dataHash,
          reasonCode: String(args.reasonCode),
          submittedBy: String(args.submittedBy),
          storedSubmittedBy,
          createdAt,
          cancelled,
          onChainRecordExists,
          executionCount: relatedExecutions.length,
          executed: relatedExecutions.length > 0,
          latestExecution: relatedExecutions[0] || null,
          executions: relatedExecutions
        };
      })
    );

    return {
      found: items.length > 0,
      count: items.length,
      limit,
      lookbackBlocks: LOOKBACK_BLOCKS.toString(),
      signalRegistry: registryAddress,
      executionController: controllerAddress,
      items
    };
  } catch (error) {
    return {
      found: false,
      count: 0,
      message: "Could not load signal history.",
      error: error.message,
      lookbackBlocks: LOOKBACK_BLOCKS.toString(),
      signalRegistry: registryAddress,
      executionController: controllerAddress,
      items: []
    };
  }
}

async function getActionHistory(limit = Number(process.env.DASHBOARD_HISTORY_LIMIT || "25")) {
  try {
    const { fromBlock, toBlock } = await latestBlockRange();

    const logs = await client.getLogs({
      address: controllerAddress,
      event: actionExecutedEvent,
      fromBlock,
      toBlock
    });

    logs.sort((a, b) => {
      if (a.blockNumber === b.blockNumber) {
        return Number(b.logIndex ?? 0) - Number(a.logIndex ?? 0);
      }

      return a.blockNumber > b.blockNumber ? -1 : 1;
    });

    const selected = logs.slice(0, limit);

    const items = await Promise.all(
      selected.map(async (log) => {
        const args = log.args;
        const amount = args.amount;
        const isAstp = sameAddress(args.asset, tokenAddress);
        const isNative = sameAddress(args.asset, ZERO_ADDRESS);
        const actionType = Number(args.actionType);
        const markedExecuted = await controllerRead("actionExecuted", [args.actionId]);

        return {
          transactionHash: log.transactionHash,
          explorerUrl: `https://sepolia.basescan.org/tx/${log.transactionHash}`,
          blockNumber: log.blockNumber,
          logIndex: log.logIndex,
          actionId: args.actionId,
          signalId: args.signalId,
          actionType,
          actionName: actionName(actionType),
          asset: args.asset,
          assetType: isAstp ? "ASTP" : isNative ? "ETH" : "OTHER",
          recipient: args.recipient,
          amountRaw: amount,
          amountFormatted: isAstp
            ? formatUnits(amount, 18)
            : isNative
              ? formatEther(amount)
              : amount.toString(),
          memo: args.memo,
          executor: args.executor,
          markedExecuted
        };
      })
    );

    return {
      found: items.length > 0,
      count: items.length,
      limit,
      lookbackBlocks: LOOKBACK_BLOCKS.toString(),
      controller: controllerAddress,
      items
    };
  } catch (error) {
    return {
      found: false,
      count: 0,
      message: "Could not load action history.",
      error: error.message,
      lookbackBlocks: LOOKBACK_BLOCKS.toString(),
      controller: controllerAddress,
      items: []
    };
  }
}

async function getHealth() {
  const [
    code,
    policyData,
    vaultPolicy,
    controllerVault,
    controllerPolicy,
    controllerRegistry,
    vaultPaused,
    registryPaused,
    controllerPaused
  ] =
    await Promise.all([
      getContractCodeStatus(),
      getPolicy(),
      vaultRead("policy"),
      controllerRead("vault"),
      controllerRead("policy"),
      controllerRead("signalRegistry"),
      vaultRead("paused"),
      registryRead("paused"),
      controllerRead("paused")
    ]);

  const vaultExecutorRole = await vaultRead("EXECUTOR_ROLE");
  const controllerCanMoveVaultFunds = await vaultRead("hasRole", [vaultExecutorRole, controllerAddress]);

  const checks = {
    tokenHasCode: code.token.hasCode,
    policyHasCode: code.policy.hasCode,
    vaultHasCode: code.vault.hasCode,
    signalRegistryHasCode: code.signalRegistry.hasCode,
    controllerHasCode: code.controller.hasCode,
    astpApproved: policyData.approvedAssets.astp,
    nativeEthApproved: policyData.approvedAssets.nativeEth,
    vaultPolicyMatches: sameAddress(vaultPolicy, policyAddress),
    controllerVaultMatches: sameAddress(controllerVault, vaultAddress),
    controllerPolicyMatches: sameAddress(controllerPolicy, policyAddress),
    controllerRegistryMatches: sameAddress(controllerRegistry, registryAddress),
    controllerCanMoveVaultFunds,
    vaultNotPaused: !vaultPaused,
    signalRegistryNotPaused: !registryPaused,
    executionControllerNotPaused: !controllerPaused
  };

  const ok = Object.values(checks).every(Boolean);

  return {
    status: ok ? "OK" : "WARN",
    checkedAt: new Date().toISOString(),
    rpcUrl: RPC_URL,
    contracts: {
      token: tokenAddress,
      policy: policyAddress,
      vault: vaultAddress,
      signalRegistry: registryAddress,
      controller: controllerAddress
    },
    code,
    checks,
    paused: {
      vaultPaused,
      signalRegistryPaused: registryPaused,
      executionControllerPaused: controllerPaused
    }
  };
}

async function getStatus() {
  const [chainId, treasury, policy, latestSignal, recentExecution, health] = await Promise.all([
    client.getChainId(),
    getTreasury(),
    getPolicy(),
    getLatestSignal(),
    getRecentExecution(),
    getHealth()
  ]);

  return {
    app: "AstraTreasury Protocol Dashboard API",
    network: "Base Sepolia",
    chainId,
    generatedAt: new Date().toISOString(),
    treasury,
    policy,
    latestSignal,
    recentExecution,
    health
  };
}

function htmlPage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Protocol Dashboard</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #0d1117; color: #e6edf3; }
    header { padding: 28px 32px; border-bottom: 1px solid #30363d; background: #010409; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    main { padding: 24px 32px 48px; display: grid; gap: 18px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 14px; padding: 18px; box-shadow: 0 12px 30px rgba(0,0,0,.2); }
    .card h2 { margin: 0 0 14px; font-size: 17px; color: #58a6ff; }
    .big { font-size: 26px; font-weight: 700; margin: 6px 0; }
    .muted { color: #8b949e; font-size: 13px; overflow-wrap: anywhere; }
    .ok { color: #3fb950; font-weight: 700; }
    .warn { color: #d29922; font-weight: 700; }
    dl { margin: 0; }
    dt { color: #8b949e; font-size: 12px; margin-top: 10px; }
    dd { margin: 3px 0 0; overflow-wrap: anywhere; }
    a { color: #58a6ff; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #0d1117; border: 1px solid #30363d; border-radius: 10px; padding: 12px; max-height: 360px; overflow: auto; }
    button { background: #238636; color: white; border: none; border-radius: 8px; padding: 9px 13px; cursor: pointer; }
  </style>
</head>
<body>
  <header>
    <h1>AstraTreasury Protocol</h1>
    <div class="muted">Base Sepolia dashboard/API. Read-only. No funds can move from this page.</div>
  </header>
  <main>
    <section class="grid">
      <div class="card"><h2>Protocol Health</h2><div id="health" class="big">Loading…</div><div id="healthMeta" class="muted"></div></div>
      <div class="card"><h2>Treasury ASTP</h2><div id="treasuryAstp" class="big">Loading…</div><div id="treasuryEth" class="muted"></div></div>
      <div class="card"><h2>Latest AI Signal</h2><div id="signalAction" class="big">Loading…</div><div id="signalMeta" class="muted"></div></div>
      <div class="card"><h2>Recent Execution</h2><div id="executionAction" class="big">Loading…</div><div id="executionMeta" class="muted"></div></div>
    </section>

    <section class="grid">
      <div class="card"><h2>Policy Settings</h2><dl id="policy"></dl></div>
      <div class="card"><h2>Contracts</h2><dl id="contracts"></dl></div>
    </section>

    <section class="card">
      <h2>API</h2>
      <p class="muted">
        Endpoints:
        <a href="/api/status">/api/status</a>,
        <a href="/api/treasury">/api/treasury</a>,
        <a href="/api/signal">/api/signal</a>,
        <a href="/api/signal-history">/api/signal-history</a>,
        <a href="/api/policy">/api/policy</a>,
        <a href="/api/recent-execution">/api/recent-execution</a>,
        <a href="/api/action-history">/api/action-history</a>,
        <a href="/api/health">/api/health</a>,
        <a href="/history">/history</a>,
        <a href="/signals">/signals</a>
      </p>
      <button onclick="load()">Refresh</button>
      <pre id="raw"></pre>
    </section>
  </main>

<script>
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

function dl(rows) {
  return Object.entries(rows).map(([k, v]) =>
    "<dt>" + escapeHtml(k) + "</dt><dd>" + escapeHtml(v) + "</dd>"
  ).join("");
}

async function load() {
  const res = await fetch("/api/status");
  const data = await res.json();

  const healthClass = data.health.status === "OK" ? "ok" : "warn";
  document.getElementById("health").innerHTML =
    '<span class="' + healthClass + '">' + data.health.status + "</span>";
  document.getElementById("healthMeta").textContent = "Checked " + data.health.checkedAt;

  document.getElementById("treasuryAstp").textContent =
    Number(data.treasury.vault.astpBalance).toLocaleString(undefined, { maximumFractionDigits: 4 }) + " ASTP";
  document.getElementById("treasuryEth").textContent =
    data.treasury.vault.ethBalance + " ETH in vault";

  document.getElementById("signalAction").textContent =
    data.latestSignal.found ? data.latestSignal.actionName : "No signal found";
  document.getElementById("signalMeta").textContent =
    data.latestSignal.found
      ? "confidence " + data.latestSignal.confidenceBps + " bps | reason " + data.latestSignal.reasonCode
      : data.latestSignal.message;

  document.getElementById("executionAction").textContent =
    data.recentExecution.found ? data.recentExecution.actionName : "No execution found";
  document.getElementById("executionMeta").innerHTML =
    data.recentExecution.found
      ? "amount " + escapeHtml(data.recentExecution.amountFormatted) + " " + escapeHtml(data.recentExecution.assetType) +
        '<br><a href="' + data.recentExecution.explorerUrl + '" target="_blank" rel="noreferrer">View on BaseScan</a>'
      : escapeHtml(data.recentExecution.message);

  document.getElementById("policy").innerHTML = dl(data.policy.config);
  document.getElementById("contracts").innerHTML = dl(data.health.contracts);
  document.getElementById("raw").textContent = JSON.stringify(data, null, 2);
}

load().catch(err => {
  document.getElementById("raw").textContent = err.stack || String(err);
});
</script>
</body>
</html>`;
}



function htmlSignalHistoryPage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Signal History</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #0d1117; color: #e6edf3; }
    header { padding: 28px 32px; border-bottom: 1px solid #30363d; background: #010409; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    main { padding: 24px 32px 48px; }
    a { color: #58a6ff; }
    .muted { color: #8b949e; font-size: 13px; overflow-wrap: anywhere; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 14px; padding: 18px; box-shadow: 0 12px 30px rgba(0,0,0,.2); }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { text-align: left; border-bottom: 1px solid #30363d; padding: 10px 8px; vertical-align: top; }
    th { color: #58a6ff; font-size: 13px; }
    td { font-size: 13px; overflow-wrap: anywhere; }
    button { background: #238636; color: white; border: none; border-radius: 8px; padding: 9px 13px; cursor: pointer; }
    .pill { display: inline-block; padding: 3px 8px; border-radius: 999px; background: #21262d; border: 1px solid #30363d; }
    .ok { color: #3fb950; font-weight: 700; }
    .warn { color: #d29922; font-weight: 700; }
  </style>
</head>
<body>
  <header>
    <h1>AstraTreasury Signal History</h1>
    <div class="muted">
      Read-only history of AI signals submitted to SignalRegistry on Base Sepolia.
      <a href="/">Dashboard</a> ·
      <a href="/history">Action history</a>
    </div>
  </header>
  <main>
    <section class="card">
      <button onclick="loadSignals()">Refresh</button>
      <div id="meta" class="muted" style="margin-top:12px;">Loading…</div>
      <table>
        <thead>
          <tr>
            <th>Signal</th>
            <th>Model</th>
            <th>Action</th>
            <th>Confidence / Risk</th>
            <th>Reason</th>
            <th>Submitted By</th>
            <th>Executed?</th>
            <th>Tx</th>
          </tr>
        </thead>
        <tbody id="rows"></tbody>
      </table>
    </section>
  </main>

<script>
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

function fmtDate(value) {
  if (!value) return "n/a";
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "n/a";
  return new Date(n * 1000).toLocaleString();
}

async function loadSignals() {
  const res = await fetch("/api/signal-history");
  const data = await res.json();

  document.getElementById("meta").textContent =
    "Found " + data.count + " signal(s), lookback " + data.lookbackBlocks + " blocks.";

  const tbody = document.getElementById("rows");

  if (!data.items || data.items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="muted">No AI signals found in the lookback window.</td></tr>';
    return;
  }

  tbody.innerHTML = data.items.map(item => {
    const execStatus = item.executed
      ? "<span class='ok'>YES</span><br><span class='muted'>" + escapeHtml(item.executionCount) + " execution(s)</span>"
      : "<span class='warn'>NO</span>";

    const latestExecution = item.latestExecution
      ? "<br><a target='_blank' rel='noreferrer' href='" + escapeHtml(item.latestExecution.explorerUrl) + "'>Latest execution</a>"
      : "";

    return "<tr>" +
      "<td><span class='muted'>" + escapeHtml(item.signalId) + "</span><br><span class='muted'>Block " + escapeHtml(item.blockNumber) + "</span></td>" +
      "<td>" + escapeHtml(item.modelVersion) + "<br><span class='muted'>" + escapeHtml(fmtDate(item.createdAt)) + "</span></td>" +
      "<td><span class='pill'>" + escapeHtml(item.actionName) + "</span><br><span class='muted'>type " + escapeHtml(item.actionType) + "</span></td>" +
      "<td>" + escapeHtml(item.confidenceBps) + " bps<br><span class='muted'>risk " + escapeHtml(item.riskBps) + " bps</span></td>" +
      "<td>" + escapeHtml(item.reasonCode) + "<br><span class='muted'>" + escapeHtml(item.dataHash) + "</span></td>" +
      "<td>" + escapeHtml(item.submittedBy) + "</td>" +
      "<td>" + execStatus + latestExecution + "</td>" +
      "<td><a target='_blank' rel='noreferrer' href='" + escapeHtml(item.explorerUrl) + "'>BaseScan</a></td>" +
    "</tr>";
  }).join("");
}

loadSignals().catch(err => {
  document.getElementById("meta").textContent = err.stack || String(err);
});
</script>
</body>
</html>`;
}

function htmlHistoryPage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Action History</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #0d1117; color: #e6edf3; }
    header { padding: 28px 32px; border-bottom: 1px solid #30363d; background: #010409; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    main { padding: 24px 32px 48px; }
    a { color: #58a6ff; }
    .muted { color: #8b949e; font-size: 13px; overflow-wrap: anywhere; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 14px; padding: 18px; box-shadow: 0 12px 30px rgba(0,0,0,.2); }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { text-align: left; border-bottom: 1px solid #30363d; padding: 10px 8px; vertical-align: top; }
    th { color: #58a6ff; font-size: 13px; }
    td { font-size: 13px; overflow-wrap: anywhere; }
    button { background: #238636; color: white; border: none; border-radius: 8px; padding: 9px 13px; cursor: pointer; }
    .pill { display: inline-block; padding: 3px 8px; border-radius: 999px; background: #21262d; border: 1px solid #30363d; }
  </style>
</head>
<body>
  <header>
    <h1>AstraTreasury Action History</h1>
    <div class="muted">
      Read-only history of ActionExecuted events on Base Sepolia.
      <a href="/">Back to dashboard</a>
    </div>
  </header>
  <main>
    <section class="card">
      <button onclick="loadHistory()">Refresh</button>
      <div id="meta" class="muted" style="margin-top:12px;">Loading…</div>
      <table>
        <thead>
          <tr>
            <th>Action</th>
            <th>Amount</th>
            <th>Recipient</th>
            <th>Executor</th>
            <th>Block</th>
            <th>Memo</th>
            <th>Tx</th>
          </tr>
        </thead>
        <tbody id="rows"></tbody>
      </table>
    </section>
  </main>

<script>
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

async function loadHistory() {
  const res = await fetch("/api/action-history");
  const data = await res.json();

  document.getElementById("meta").textContent =
    "Found " + data.count + " action(s), lookback " + data.lookbackBlocks + " blocks.";

  const tbody = document.getElementById("rows");

  if (!data.items || data.items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="muted">No treasury actions found in the lookback window.</td></tr>';
    return;
  }

  tbody.innerHTML = data.items.map(item => {
    return "<tr>" +
      "<td><span class='pill'>" + escapeHtml(item.actionName) + "</span><br><span class='muted'>" + escapeHtml(item.actionId) + "</span></td>" +
      "<td>" + escapeHtml(item.amountFormatted) + " " + escapeHtml(item.assetType) + "<br><span class='muted'>" + escapeHtml(item.asset) + "</span></td>" +
      "<td>" + escapeHtml(item.recipient) + "</td>" +
      "<td>" + escapeHtml(item.executor) + "</td>" +
      "<td>" + escapeHtml(item.blockNumber) + "</td>" +
      "<td>" + escapeHtml(item.memo) + "</td>" +
      "<td><a target='_blank' rel='noreferrer' href='" + escapeHtml(item.explorerUrl) + "'>BaseScan</a></td>" +
    "</tr>";
  }).join("");
}

loadHistory().catch(err => {
  document.getElementById("meta").textContent = err.stack || String(err);
});
</script>
</body>
</html>`;
}




function htmlExecutionQueuePage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Execution Queue</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #0d1117; color: #e6edf3; }
    header { padding: 28px 32px; border-bottom: 1px solid #30363d; background: #010409; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    main { padding: 24px 32px 48px; display: grid; gap: 18px; }
    a { color: #58a6ff; }
    .muted { color: #8b949e; font-size: 13px; overflow-wrap: anywhere; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 14px; padding: 18px; box-shadow: 0 12px 30px rgba(0,0,0,.2); }
    .card h2 { margin: 0 0 14px; font-size: 17px; color: #58a6ff; }
    .big { font-size: 28px; font-weight: 700; margin: 6px 0; }
    .ok { color: #3fb950; font-weight: 700; }
    .warn { color: #d29922; font-weight: 700; }
    .danger { color: #f85149; font-weight: 700; }
    button { background: #238636; color: white; border: none; border-radius: 8px; padding: 9px 13px; cursor: pointer; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { text-align: left; border-bottom: 1px solid #30363d; padding: 10px 8px; vertical-align: top; }
    th { color: #58a6ff; font-size: 13px; }
    td { font-size: 13px; overflow-wrap: anywhere; }
    .pill { display: inline-block; padding: 3px 8px; border-radius: 999px; background: #21262d; border: 1px solid #30363d; }
    .cmd { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background: #0d1117; border: 1px solid #30363d; border-radius: 8px; padding: 8px; overflow-wrap: anywhere; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #0d1117; border: 1px solid #30363d; border-radius: 10px; padding: 12px; max-height: 360px; overflow: auto; }
  </style>
</head>
<body>
  <header>
    <h1>AstraTreasury Execution Queue</h1>
    <div class="muted">
      Policy-aware human approval queue for treasury execution proposals.
      <a href="/">Dashboard</a> ·
      <a href="/paper">Paper</a> ·
      <a href="/queue">Signal approval queue</a> ·
      <a href="/history">Action history</a>
    </div>
  </header>

  <main>
    <section class="grid">
      <div class="card"><h2>Policy Passed</h2><div id="countPolicyPassed" class="big ok">0</div><div class="muted">Ready for human execution approval</div></div>
      <div class="card"><h2>Approved</h2><div id="countApproved" class="big ok">0</div><div class="muted">Ready for guarded execution command</div></div>
      <div class="card"><h2>Executed</h2><div id="countExecuted" class="big">0</div><div class="muted">Already moved testnet treasury funds</div></div>
      <div class="card"><h2>Policy Blocked</h2><div id="countBlocked" class="big warn">0</div><div class="muted">TreasuryPolicy rejected</div></div>
      <div class="card"><h2>Rejected</h2><div id="countRejected" class="big danger">0</div><div class="muted">Human rejected</div></div>
    </section>

    <section class="card">
      <h2>Commands</h2>
      <div class="muted">Run these on the server. This browser page is read-only.</div>
      <div class="cmd" style="margin-top:12px;">npm run execq:sync</div>
      <div class="cmd" style="margin-top:8px;">npm run execq:approve -- latest "approved after policy review"</div>
      <div class="cmd" style="margin-top:8px;">npm run execq:reject -- latest "rejected after review"</div>
      <div class="cmd" style="margin-top:8px;">APPROVE_TREASURY_EXECUTION=YES npm run execq:execute:base-sepolia</div>
    </section>

    <section class="card">
      <h2>Policy-Passed Proposals</h2>
      <table>
        <thead>
          <tr><th>Action</th><th>Signal</th><th>Amount</th><th>Recipient</th><th>Policy</th><th>Suggested Command</th></tr>
        </thead>
        <tbody id="policyRows"></tbody>
      </table>
    </section>

    <section class="card">
      <h2>Approved For Execution</h2>
      <table>
        <thead>
          <tr><th>Action</th><th>Signal</th><th>Amount</th><th>Recipient</th><th>Approval</th><th>Execute Command</th></tr>
        </thead>
        <tbody id="approvedRows"></tbody>
      </table>
    </section>

    <section class="card">
      <h2>Executed</h2>
      <table>
        <thead>
          <tr><th>Action</th><th>Signal</th><th>Tx</th><th>Recipient</th></tr>
        </thead>
        <tbody id="executedRows"></tbody>
      </table>
    </section>

    <section class="card">
      <h2>Blocked / Rejected / Unsupported</h2>
      <table>
        <thead>
          <tr><th>Status</th><th>Action</th><th>Signal</th><th>Reason</th></tr>
        </thead>
        <tbody id="blockedRows"></tbody>
      </table>
    </section>

    <section class="card">
      <h2>API</h2>
      <button onclick="loadExecutionQueue()">Refresh</button>
      <div class="muted" style="margin-top:10px;">
        Endpoint: <a href="/api/execution-queue">/api/execution-queue</a>
      </div>
      <pre id="raw"></pre>
    </section>
  </main>

<script>
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

function dateText(value) {
  if (!value) return "n/a";
  const d = new Date(value);
  if (String(d) === "Invalid Date") return String(value);
  return d.toLocaleString();
}

function shortId(id) {
  id = String(id || "");
  if (id.length <= 24) return id;
  return id.slice(0, 18) + "..." + id.slice(-8);
}

function emptyRow(cols, text) {
  return "<tr><td colspan='" + cols + "' class='muted'>" + escapeHtml(text) + "</td></tr>";
}

function command(text) {
  return "<div class='cmd'>" + escapeHtml(text) + "</div>";
}

function actionCell(item) {
  return "<span class='pill'>" + escapeHtml(item.actionName || "UNKNOWN") + "</span><br><span class='muted'>" + escapeHtml(shortId(item.actionId)) + "</span>";
}

function signalCell(item) {
  return "<span class='muted'>" + escapeHtml(shortId(item.signalId)) + "</span><br><span class='muted'>" + escapeHtml(item.signalId) + "</span>";
}

function amountCell(item) {
  return escapeHtml(item.amountFormatted || item.proposal?.amountFormatted || "n/a") + " ASTP";
}

function txCell(item) {
  const tx =
    item.latestTxHash ||
    item.execution?.txHash ||
    item.executionCheck?.matchingExecutions?.[0]?.transactionHash;

  if (!tx) return "<span class='muted'>No tx hash</span>";

  return "<a target='_blank' rel='noreferrer' href='https://sepolia.basescan.org/tx/" + escapeHtml(tx) + "'>BaseScan</a><br><span class='muted'>" + escapeHtml(tx) + "</span>";
}

function renderPolicyPassed(items) {
  if (!items || items.length === 0) return emptyRow(6, "No policy-passed execution proposals.");

  return items.map(item => {
    const approveCmd = "npm run execq:approve -- " + item.actionId + ' "approved after policy review"';
    const rejectCmd = "npm run execq:reject -- " + item.actionId + ' "rejected after execution review"';

    return "<tr>" +
      "<td>" + actionCell(item) + "</td>" +
      "<td>" + signalCell(item) + "</td>" +
      "<td>" + amountCell(item) + "</td>" +
      "<td>" + escapeHtml(item.recipient || item.proposal?.recipient) + "</td>" +
      "<td>" + escapeHtml(item.policyAllowed) + " / " + escapeHtml(item.policyReason) + "</td>" +
      "<td>" + command(approveCmd) + "<div style='height:8px'></div>" + command(rejectCmd) + "</td>" +
    "</tr>";
  }).join("");
}

function renderApproved(items) {
  if (!items || items.length === 0) return emptyRow(6, "No proposals approved for execution.");

  return items.map(item => {
    const execCmd = "EXECUTION_ACTION_ID=" + item.actionId + " APPROVE_TREASURY_EXECUTION=YES npm run execq:execute:base-sepolia";

    return "<tr>" +
      "<td>" + actionCell(item) + "</td>" +
      "<td>" + signalCell(item) + "</td>" +
      "<td>" + amountCell(item) + "</td>" +
      "<td>" + escapeHtml(item.recipient || item.proposal?.recipient) + "</td>" +
      "<td>" + escapeHtml(dateText(item.approval?.approvedAt)) + "<br><span class='muted'>" + escapeHtml(item.approval?.note || "") + "</span></td>" +
      "<td>" + command(execCmd) + "</td>" +
    "</tr>";
  }).join("");
}

function renderExecuted(items) {
  if (!items || items.length === 0) return emptyRow(4, "No executed proposals.");

  return items.map(item => {
    return "<tr>" +
      "<td>" + actionCell(item) + "</td>" +
      "<td>" + signalCell(item) + "</td>" +
      "<td>" + txCell(item) + "</td>" +
      "<td>" + escapeHtml(item.recipient || item.proposal?.recipient || "") + "</td>" +
    "</tr>";
  }).join("");
}

function renderBlocked(data) {
  const items = [
    ...(data.grouped.policyBlocked || []),
    ...(data.grouped.rejected || []),
    ...(data.grouped.unsupportedAction || []),
    ...(data.grouped.signalCancelled || [])
  ];

  if (items.length === 0) return emptyRow(4, "No blocked, rejected, unsupported, or cancelled proposals.");

  return items.map(item => {
    const reason =
      item.policyReason ||
      item.unsupportedReason ||
      item.rejection?.note ||
      item.signal?.reasonCode ||
      "n/a";

    return "<tr>" +
      "<td>" + escapeHtml(item.status) + "</td>" +
      "<td>" + actionCell(item) + "</td>" +
      "<td>" + signalCell(item) + "</td>" +
      "<td>" + escapeHtml(reason) + "</td>" +
    "</tr>";
  }).join("");
}

async function loadExecutionQueue() {
  const res = await fetch("/api/execution-queue");
  const data = await res.json();

  document.getElementById("countPolicyPassed").textContent = data.summary.policyPassed;
  document.getElementById("countApproved").textContent = data.summary.approvedForExecution;
  document.getElementById("countExecuted").textContent = data.summary.executed;
  document.getElementById("countBlocked").textContent = data.summary.policyBlocked;
  document.getElementById("countRejected").textContent = data.summary.rejected;

  document.getElementById("policyRows").innerHTML = renderPolicyPassed(data.grouped.policyPassed);
  document.getElementById("approvedRows").innerHTML = renderApproved(data.grouped.approvedForExecution);
  document.getElementById("executedRows").innerHTML = renderExecuted(data.grouped.executed);
  document.getElementById("blockedRows").innerHTML = renderBlocked(data);

  document.getElementById("raw").textContent = JSON.stringify(data, null, 2);
}

loadExecutionQueue().catch(err => {
  document.getElementById("raw").textContent = err.stack || String(err);
});
</script>
</body>
</html>`;
}

function htmlApprovalQueuePage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Approval Queue</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #0d1117; color: #e6edf3; }
    header { padding: 28px 32px; border-bottom: 1px solid #30363d; background: #010409; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    main { padding: 24px 32px 48px; display: grid; gap: 18px; }
    a { color: #58a6ff; }
    .muted { color: #8b949e; font-size: 13px; overflow-wrap: anywhere; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 14px; padding: 18px; box-shadow: 0 12px 30px rgba(0,0,0,.2); }
    .card h2 { margin: 0 0 14px; font-size: 17px; color: #58a6ff; }
    .big { font-size: 28px; font-weight: 700; margin: 6px 0; }
    .ok { color: #3fb950; font-weight: 700; }
    .warn { color: #d29922; font-weight: 700; }
    .danger { color: #f85149; font-weight: 700; }
    button { background: #238636; color: white; border: none; border-radius: 8px; padding: 9px 13px; cursor: pointer; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { text-align: left; border-bottom: 1px solid #30363d; padding: 10px 8px; vertical-align: top; }
    th { color: #58a6ff; font-size: 13px; }
    td { font-size: 13px; overflow-wrap: anywhere; }
    .pill { display: inline-block; padding: 3px 8px; border-radius: 999px; background: #21262d; border: 1px solid #30363d; }
    .cmd { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background: #0d1117; border: 1px solid #30363d; border-radius: 8px; padding: 8px; overflow-wrap: anywhere; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #0d1117; border: 1px solid #30363d; border-radius: 10px; padding: 12px; max-height: 360px; overflow: auto; }
  </style>
</head>
<body>
  <header>
    <h1>AstraTreasury Manual Approval Queue</h1>
    <div class="muted">
      Local human-in-the-loop queue for paper signals.
      <a href="/">Dashboard</a> ·
      <a href="/paper">Paper trading</a> ·
      <a href="/signals">Signal history</a> ·
      <a href="/history">Action history</a>
    </div>
  </header>

  <main>
    <section class="grid">
      <div class="card"><h2>New</h2><div id="countNew" class="big">0</div><div class="muted">Awaiting review</div></div>
      <div class="card"><h2>Approved</h2><div id="countApproved" class="big ok">0</div><div class="muted">Ready for manual on-chain submission</div></div>
      <div class="card"><h2>Submitted On-chain</h2><div id="countSubmitted" class="big">0</div><div class="muted">Already sent to SignalRegistry</div></div>
      <div class="card"><h2>Rejected</h2><div id="countRejected" class="big danger">0</div><div class="muted">Reviewed and declined</div></div>
    </section>

    <section class="card">
      <h2>Commands</h2>
      <div class="muted">Run these on the server. The browser page is read-only.</div>
      <div class="cmd" style="margin-top:12px;">npm run queue:sync</div>
      <div class="cmd" style="margin-top:8px;">npm run queue:approve -- latest "approved after review"</div>
      <div class="cmd" style="margin-top:8px;">npm run queue:reject -- latest "rejected after review"</div>
      <div class="cmd" style="margin-top:8px;">APPROVE_PAPER_SIGNAL=YES npm run submit:paper:approved:base-sepolia</div>
    </section>

    <section class="card">
      <h2>New Paper Signals</h2>
      <table>
        <thead>
          <tr><th>Signal</th><th>Action</th><th>Confidence / Risk</th><th>Reason</th><th>Captured</th><th>Suggested Command</th></tr>
        </thead>
        <tbody id="newRows"></tbody>
      </table>
    </section>

    <section class="card">
      <h2>Approved Signals</h2>
      <table>
        <thead>
          <tr><th>Signal</th><th>Action</th><th>Approved</th><th>Reason</th><th>Submit Command</th></tr>
        </thead>
        <tbody id="approvedRows"></tbody>
      </table>
    </section>

    <section class="card">
      <h2>Submitted On-chain</h2>
      <table>
        <thead>
          <tr><th>Signal</th><th>Action</th><th>Tx</th><th>Reason</th></tr>
        </thead>
        <tbody id="submittedRows"></tbody>
      </table>
    </section>

    <section class="card">
      <h2>Rejected Signals</h2>
      <table>
        <thead>
          <tr><th>Signal</th><th>Action</th><th>Rejected</th><th>Reason</th></tr>
        </thead>
        <tbody id="rejectedRows"></tbody>
      </table>
    </section>

    <section class="card">
      <h2>API</h2>
      <button onclick="loadQueue()">Refresh</button>
      <div class="muted" style="margin-top:10px;">
        Endpoint: <a href="/api/paper/approval-queue">/api/paper/approval-queue</a>
      </div>
      <pre id="raw"></pre>
    </section>
  </main>

<script>
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

function dateText(value) {
  if (!value) return "n/a";
  const d = new Date(value);
  if (String(d) === "Invalid Date") return String(value);
  return d.toLocaleString();
}

function shortId(id) {
  id = String(id || "");
  if (id.length <= 24) return id;
  return id.slice(0, 18) + "..." + id.slice(-8);
}

function emptyRow(cols, text) {
  return "<tr><td colspan='" + cols + "' class='muted'>" + escapeHtml(text) + "</td></tr>";
}

function command(text) {
  return "<div class='cmd'>" + escapeHtml(text) + "</div>";
}

function signalCell(item) {
  return "<span class='muted'>" + escapeHtml(shortId(item.signalId)) + "</span><br><span class='muted'>" + escapeHtml(item.signalId) + "</span>";
}

function actionCell(item) {
  return "<span class='pill'>" + escapeHtml(item.actionName || "UNKNOWN") + "</span>";
}

function confidenceCell(item) {
  return escapeHtml(item.confidenceBps ?? "n/a") + " bps<br><span class='muted'>risk " + escapeHtml(item.riskBps ?? "n/a") + " bps</span>";
}

function renderNew(items) {
  if (!items || items.length === 0) return emptyRow(6, "No new paper signals.");

  return items.map(item => {
    const approveCmd = "npm run queue:approve -- " + item.signalId + ' "approved after review"';
    const rejectCmd = "npm run queue:reject -- " + item.signalId + ' "rejected after review"';

    return "<tr>" +
      "<td>" + signalCell(item) + "</td>" +
      "<td>" + actionCell(item) + "</td>" +
      "<td>" + confidenceCell(item) + "</td>" +
      "<td>" + escapeHtml(item.reasonCode) + "</td>" +
      "<td>" + escapeHtml(dateText(item.capturedAt)) + "</td>" +
      "<td>" + command(approveCmd) + "<div style='height:8px'></div>" + command(rejectCmd) + "</td>" +
    "</tr>";
  }).join("");
}

function renderApproved(items) {
  if (!items || items.length === 0) return emptyRow(5, "No approved signals.");

  return items.map(item => {
    const submitCmd = "PAPER_SIGNAL_ID=" + item.signalId + " APPROVE_PAPER_SIGNAL=YES npm run submit:paper:approved:base-sepolia";

    return "<tr>" +
      "<td>" + signalCell(item) + "</td>" +
      "<td>" + actionCell(item) + "</td>" +
      "<td>" + escapeHtml(dateText(item.approval?.approvedAt)) + "<br><span class='muted'>" + escapeHtml(item.approval?.note || "") + "</span></td>" +
      "<td>" + escapeHtml(item.reasonCode) + "</td>" +
      "<td>" + command(submitCmd) + "</td>" +
    "</tr>";
  }).join("");
}

function renderSubmitted(items) {
  if (!items || items.length === 0) return emptyRow(4, "No submitted-on-chain queue items.");

  return items.map(item => {
    const tx = item.latestTxHash || item.latestOnchainSubmission?.txHash;
    const link = tx
      ? "<a target='_blank' rel='noreferrer' href='https://sepolia.basescan.org/tx/" + escapeHtml(tx) + "'>BaseScan</a><br><span class='muted'>" + escapeHtml(tx) + "</span>"
      : "<span class='muted'>No tx hash recorded</span>";

    return "<tr>" +
      "<td>" + signalCell(item) + "</td>" +
      "<td>" + actionCell(item) + "</td>" +
      "<td>" + link + "</td>" +
      "<td>" + escapeHtml(item.reasonCode) + "</td>" +
    "</tr>";
  }).join("");
}

function renderRejected(items) {
  if (!items || items.length === 0) return emptyRow(4, "No rejected signals.");

  return items.map(item => {
    return "<tr>" +
      "<td>" + signalCell(item) + "</td>" +
      "<td>" + actionCell(item) + "</td>" +
      "<td>" + escapeHtml(dateText(item.rejection?.rejectedAt)) + "<br><span class='muted'>" + escapeHtml(item.rejection?.note || "") + "</span></td>" +
      "<td>" + escapeHtml(item.reasonCode) + "</td>" +
    "</tr>";
  }).join("");
}

async function loadQueue() {
  const res = await fetch("/api/paper/approval-queue");
  const data = await res.json();

  document.getElementById("countNew").textContent = data.summary.new;
  document.getElementById("countApproved").textContent = data.summary.approved;
  document.getElementById("countSubmitted").textContent = data.summary.submittedOnChain;
  document.getElementById("countRejected").textContent = data.summary.rejected;

  document.getElementById("newRows").innerHTML = renderNew(data.grouped.new);
  document.getElementById("approvedRows").innerHTML = renderApproved(data.grouped.approved);
  document.getElementById("submittedRows").innerHTML = renderSubmitted(data.grouped.submittedOnChain);
  document.getElementById("rejectedRows").innerHTML = renderRejected(data.grouped.rejected);

  document.getElementById("raw").textContent = JSON.stringify(data, null, 2);
}

loadQueue().catch(err => {
  document.getElementById("raw").textContent = err.stack || String(err);
});
</script>
</body>
</html>`;
}

function htmlPaperPage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Paper Trading</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #0d1117; color: #e6edf3; }
    header { padding: 28px 32px; border-bottom: 1px solid #30363d; background: #010409; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    main { padding: 24px 32px 48px; display: grid; gap: 18px; }
    a { color: #58a6ff; }
    .muted { color: #8b949e; font-size: 13px; overflow-wrap: anywhere; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 14px; padding: 18px; box-shadow: 0 12px 30px rgba(0,0,0,.2); }
    .card h2 { margin: 0 0 14px; font-size: 17px; color: #58a6ff; }
    .big { font-size: 26px; font-weight: 700; margin: 6px 0; }
    .ok { color: #3fb950; font-weight: 700; }
    .warn { color: #d29922; font-weight: 700; }
    .danger { color: #f85149; font-weight: 700; }
    button { background: #238636; color: white; border: none; border-radius: 8px; padding: 9px 13px; cursor: pointer; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { text-align: left; border-bottom: 1px solid #30363d; padding: 10px 8px; vertical-align: top; }
    th { color: #58a6ff; font-size: 13px; }
    td { font-size: 13px; overflow-wrap: anywhere; }
    dl { margin: 0; }
    dt { color: #8b949e; font-size: 12px; margin-top: 10px; }
    dd { margin: 3px 0 0; overflow-wrap: anywhere; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #0d1117; border: 1px solid #30363d; border-radius: 10px; padding: 12px; max-height: 380px; overflow: auto; }
    .pill { display: inline-block; padding: 3px 8px; border-radius: 999px; background: #21262d; border: 1px solid #30363d; }
    .cmd { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background: #0d1117; border: 1px solid #30363d; border-radius: 8px; padding: 8px; overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <header>
    <h1>AstraTreasury Paper Trading</h1>
    <div class="muted">
      Read-only paper-trading dashboard. No private key is used here.
      <a href="/">Dashboard</a> ·
      <a href="/signals">Signal history</a> ·
      <a href="/history">Action history</a>
    </div>
  </header>

  <main>
    <section class="grid">
      <div class="card">
        <h2>Paper Loop Health</h2>
        <div id="loopHealth" class="big">Loading…</div>
        <div id="loopMeta" class="muted"></div>
      </div>

      <div class="card">
        <h2>Virtual Treasury Value</h2>
        <div id="paperValue" class="big">Loading…</div>
        <div id="paperValueMeta" class="muted"></div>
      </div>

      <div class="card">
        <h2>Latest Observed Signal</h2>
        <div id="latestObserved" class="big">Loading…</div>
        <div id="latestObservedMeta" class="muted"></div>
      </div>

      <div class="card">
        <h2>Pending Manual Approvals</h2>
        <div id="pendingCount" class="big">Loading…</div>
        <div id="pendingMeta" class="muted"></div>
      </div>
    </section>

    <section class="grid">
      <div class="card">
        <h2>Virtual Treasury State</h2>
        <dl id="stateRows"></dl>
      </div>

      <div class="card">
        <h2>Manual Submission Command</h2>
        <div class="muted">
          This submits the latest paper signal to SignalRegistry only. It does not move treasury funds.
        </div>
        <div class="cmd" style="margin-top:12px;">
APPROVE_PAPER_SIGNAL=YES npm run submit:paper:latest:base-sepolia
        </div>
      </div>
    </section>

    <section class="card">
      <h2>Pending Manual Approvals</h2>
      <table>
        <thead>
          <tr>
            <th>Signal</th>
            <th>Action</th>
            <th>Confidence / Risk</th>
            <th>Reason</th>
            <th>Captured</th>
            <th>Paper Effect</th>
          </tr>
        </thead>
        <tbody id="pendingRows"></tbody>
      </table>
    </section>

    <section class="card">
      <h2>Recent Paper Signals</h2>
      <button onclick="loadPaper()">Refresh</button>
      <div id="historyMeta" class="muted" style="margin-top:12px;"></div>
      <table>
        <thead>
          <tr>
            <th>Signal</th>
            <th>Action</th>
            <th>Status</th>
            <th>Confidence / Risk</th>
            <th>Reason</th>
            <th>Paper Effect</th>
            <th>On-chain?</th>
          </tr>
        </thead>
        <tbody id="signalRows"></tbody>
      </table>
    </section>

    <section class="card">
      <h2>API</h2>
      <div class="muted">
        Endpoints:
        <a href="/api/paper/status">/api/paper/status</a>,
        <a href="/api/paper/latest">/api/paper/latest</a>,
        <a href="/api/paper/state">/api/paper/state</a>,
        <a href="/api/paper/heartbeat">/api/paper/heartbeat</a>,
        <a href="/api/paper/signals">/api/paper/signals</a>,
        <a href="/api/paper/errors">/api/paper/errors</a>
      </div>
      <pre id="raw"></pre>
    </section>
  </main>

<script>
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

function money(value) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "n/a";
  return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function num(value, digits = 4) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "n/a";
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function dateText(value) {
  if (!value) return "n/a";
  const d = new Date(value);
  if (String(d) === "Invalid Date") return String(value);
  return d.toLocaleString();
}

function dl(rows) {
  return Object.entries(rows).map(([k, v]) =>
    "<dt>" + escapeHtml(k) + "</dt><dd>" + escapeHtml(v) + "</dd>"
  ).join("");
}

function paperEffectText(item) {
  const effect = item.paperEffect || {};
  if (!effect.action) return "n/a";
  return effect.action + " | " + money(effect.amountUsd || 0);
}

function onchainText(item) {
  if (item.submittedOnChain) {
    const tx = item.latestOnchainSubmission?.txHash;
    const url = tx ? "https://sepolia.basescan.org/tx/" + tx : null;

    return "<span class='ok'>YES</span>" +
      (url ? "<br><a target='_blank' rel='noreferrer' href='" + escapeHtml(url) + "'>BaseScan</a>" : "");
  }

  return "<span class='warn'>NO</span>";
}

function renderSignalRows(items) {
  if (!items || items.length === 0) {
    return '<tr><td colspan="7" class="muted">No paper signals found yet.</td></tr>';
  }

  return items.map(item => {
    const sig = item.signal || {};
    return "<tr>" +
      "<td><span class='muted'>" + escapeHtml(item.signalId || item.paperSignalId) + "</span><br><span class='muted'>" + escapeHtml(dateText(item.capturedAt)) + "</span></td>" +
      "<td><span class='pill'>" + escapeHtml(item.actionName) + "</span><br><span class='muted'>type " + escapeHtml(sig.action_type) + "</span></td>" +
      "<td>" + escapeHtml(item.status) + "<br><span class='muted'>manual approval: " + escapeHtml(item.manualApprovalRequired) + "</span></td>" +
      "<td>" + escapeHtml(sig.confidence_bps) + " bps<br><span class='muted'>risk " + escapeHtml(sig.risk_bps) + " bps</span></td>" +
      "<td>" + escapeHtml(sig.reason_code) + "<br><span class='muted'>" + escapeHtml(sig.data_hash) + "</span></td>" +
      "<td>" + escapeHtml(paperEffectText(item)) + "</td>" +
      "<td>" + onchainText(item) + "</td>" +
    "</tr>";
  }).join("");
}

function renderPendingRows(items) {
  if (!items || items.length === 0) {
    return '<tr><td colspan="6" class="muted">No pending manual approvals.</td></tr>';
  }

  return items.map(item => {
    const sig = item.signal || {};
    return "<tr>" +
      "<td><span class='muted'>" + escapeHtml(item.signalId || item.paperSignalId) + "</span></td>" +
      "<td><span class='pill'>" + escapeHtml(item.actionName) + "</span></td>" +
      "<td>" + escapeHtml(sig.confidence_bps) + " bps<br><span class='muted'>risk " + escapeHtml(sig.risk_bps) + " bps</span></td>" +
      "<td>" + escapeHtml(sig.reason_code) + "</td>" +
      "<td>" + escapeHtml(dateText(item.capturedAt)) + "</td>" +
      "<td>" + escapeHtml(paperEffectText(item)) + "</td>" +
    "</tr>";
  }).join("");
}

async function loadPaper() {
  const res = await fetch("/api/paper/status");
  const data = await res.json();

  const health = data.health || {};
  const summary = data.summary || {};
  const state = data.state?.data || {};
  const latestObserved = data.latest?.latestObserved?.data || {};
  const observedSignal = latestObserved.signal || {};

  const healthClass = health.status === "OK" ? "ok" : "warn";

  document.getElementById("loopHealth").innerHTML =
    "<span class='" + healthClass + "'>" + escapeHtml(health.status || "UNKNOWN") + "</span>";
  document.getElementById("loopMeta").textContent =
    "Last checked: " + dateText(health.lastCheckedAt) +
    " | duplicate skipped: " + String(health.duplicateSkipped);

  document.getElementById("paperValue").textContent = money(summary.totalPaperValueUsd);
  document.getElementById("paperValueMeta").textContent =
    "cash " + money(summary.cashUsd) +
    " | liquidity " + money(summary.liquidityUsd) +
    " | ASTP " + num(summary.astpTokens);

  document.getElementById("latestObserved").textContent =
    latestObserved.actionName || health.lastObservedActionName || "No signal";
  document.getElementById("latestObservedMeta").textContent =
    observedSignal.reason_code
      ? "reason " + observedSignal.reason_code + " | confidence " + observedSignal.confidence_bps + " bps"
      : "No latest observed paper signal yet.";

  document.getElementById("pendingCount").textContent =
    String(summary.pendingManualApprovalsShown ?? 0);
  document.getElementById("pendingMeta").textContent =
    "Recent pending approvals shown from local paper-trading log.";

  document.getElementById("stateRows").innerHTML = dl({
    cashUsd: money(state.cashUsd),
    liquidityUsd: money(state.liquidityUsd),
    astpTokens: num(state.astpTokens),
    lastTokenPriceUsd: money(state.lastTokenPriceUsd),
    totalPaperValueUsd: money(state.totalPaperValueUsd),
    signalCount: state.signalCount ?? "n/a",
    appliedPaperActionCount: state.appliedPaperActionCount ?? "n/a",
    updatedAt: dateText(state.updatedAt)
  });

  document.getElementById("pendingRows").innerHTML =
    renderPendingRows(data.pendingManualApprovals || []);

  document.getElementById("signalRows").innerHTML =
    renderSignalRows(data.recentSignals?.items || []);

  document.getElementById("historyMeta").textContent =
    "Showing " + (data.recentSignals?.count || 0) + " recent paper signal(s).";

  document.getElementById("raw").textContent = JSON.stringify(data, null, 2);
}

loadPaper().catch(err => {
  document.getElementById("raw").textContent = err.stack || String(err);
});
</script>
</body>
</html>`;
}

async function handleApi(pathname) {
  if (pathname === "/api/status") return getStatus();
  if (pathname === "/api/execution-queue") return getExecutionQueue();
  if (pathname === "/api/paper/status") return getPaperStatus();
  if (pathname === "/api/paper/approval-queue") return getApprovalQueue();
  if (pathname === "/api/paper/latest") return getPaperLatest();
  if (pathname === "/api/paper/state") return getPaperState();
  if (pathname === "/api/paper/heartbeat") return getPaperHeartbeat();
  if (pathname === "/api/paper/signals") return getPaperSignals();
  if (pathname === "/api/paper/errors") return getPaperErrors();
  if (pathname === "/api/paper/onchain-submissions") return getPaperOnchainSubmissions();
  if (pathname === "/api/treasury") return getTreasury();
  if (pathname === "/api/signal") return getLatestSignal();
  if (pathname === "/api/signal-history") return getSignalHistory();
  if (pathname === "/api/policy") return getPolicy();
  if (pathname === "/api/recent-execution") return getRecentExecution();
  if (pathname === "/api/action-history") return getActionHistory();
  if (pathname === "/api/health") return getHealth();

  return undefined;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(htmlPage());
      return;
    }

    if (url.pathname === "/signals") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(htmlSignalHistoryPage());
      return;
    }

    if (url.pathname === "/history") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(htmlHistoryPage());
      return;
    }

    if (url.pathname === "/execution-queue") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(htmlExecutionQueuePage());
      return;
    }

    if (url.pathname === "/queue") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(htmlApprovalQueuePage());
      return;
    }

    if (url.pathname === "/paper") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(htmlPaperPage());
      return;
    }


    if (url.pathname === "/public-docs" || url.pathname === "/public-docs/") {
      const docsIndex = path.join(projectRoot, "public-docs", "astra-public-overview.html");

      if (!fs.existsSync(docsIndex)) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Public docs not generated yet. Run: npm run docs:public\n");
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(fs.readFileSync(docsIndex));
      return;
    }

    if (url.pathname.startsWith("/public-docs/")) {
      const requested = decodeURIComponent(url.pathname.replace("/public-docs/", ""));
      const safePath = path.normalize(requested).replace(/^(\.\.(\/|\\|$))+/, "");
      const fullPath = path.join(projectRoot, "public-docs", safePath);
      const docsRoot = path.join(projectRoot, "public-docs");

      if (!fullPath.startsWith(docsRoot) || !fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found\n");
        return;
      }

      const ext = path.extname(fullPath).toLowerCase();
      const type =
        ext === ".html" ? "text/html; charset=utf-8" :
        ext === ".json" ? "application/json; charset=utf-8" :
        ext === ".md" ? "text/markdown; charset=utf-8" :
        "text/plain; charset=utf-8";

      res.writeHead(200, { "Content-Type": type });
      res.end(fs.readFileSync(fullPath));
      return;
    }

    if (url.pathname === "/favicon.ico") {
      res.writeHead(204);
      res.end();
      return;
    }

    const apiResult = await handleApi(url.pathname);

    if (apiResult !== undefined) {
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*"
      });
      res.end(JSON.stringify(apiResult, bigIntJson, 2));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Not found" }));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: error.message, stack: error.stack }, null, 2));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`AstraTreasury dashboard running at http://${HOST}:${PORT}`);
  console.log(`RPC: ${RPC_URL}`);
  console.log("Read-only dashboard. No private key is used.");
});
