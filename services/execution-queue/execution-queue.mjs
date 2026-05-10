import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  formatUnits,
  getAddress,
  http as viemHttp,
  parseAbi,
  parseAbiItem,
  parseUnits
} from "viem";
import { baseSepolia } from "viem/chains";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");

const command = process.argv[2] || "status";
const actionArg = process.argv[3];
const note = process.argv.slice(4).join(" ").trim();

const paperDir = path.join(projectRoot, "reports", "paper-trading");
const approvalQueueFile = path.join(paperDir, "approval-queue.json");

const executionDir = path.join(projectRoot, "reports", "execution-queue");
const queueFile = path.join(executionDir, "execution-queue.json");
const eventsFile = path.join(executionDir, "execution-events.jsonl");

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const UNIT = 10n ** 18n;

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

fs.mkdirSync(executionDir, { recursive: true });

loadEnvFile(path.join(projectRoot, "deployments", "base-sepolia.env"));

const RPC_URL =
  process.env.DASHBOARD_RPC_URL ||
  process.env.BASE_SEPOLIA_RPC_URL ||
  "https://base-sepolia-rpc.publicnode.com";

const tokenAddress = requireAddress("ASTRA_TOKEN");
const policyAddress = requireAddress("ASTRA_POLICY");
const vaultAddress = requireAddress("ASTRA_VAULT");
const registryAddress = requireAddress("ASTRA_SIGNAL_REGISTRY");
const controllerAddress = requireAddress("ASTRA_CONTROLLER");

const lookbackBlocks = BigInt(process.env.EXEC_QUEUE_LOOKBACK_BLOCKS || "50000");

const client = createPublicClient({
  chain: baseSepolia,
  transport: viemHttp(RPC_URL)
});

const policyAbi = parseAbi([
  "function validateAction(uint8 actionType, address asset, uint256 proposedUsdValue, uint256 treasuryUsdValue, uint256 dailyUsdUsed, uint256 stableReserveUsdValue, uint16 slippageBps, bool usesRealizedRevenue) view returns (bool allowed, string reason)",
  "function isApprovedAsset(address asset) view returns (bool)"
]);

const registryAbi = parseAbi([
  "function signalExists(bytes32 signalId) view returns (bool)",
  "function signals(bytes32 signalId) view returns (bytes32 signalId, string modelVersion, uint8 actionType, uint16 confidenceBps, uint16 riskBps, uint256 maxSizeUsd, bytes32 dataHash, string reasonCode, uint64 createdAt, address submittedBy, bool cancelled)"
]);

const controllerAbi = parseAbi([
  "function actionExecuted(bytes32 actionId) view returns (bool)"
]);

const actionExecutedEvent = parseAbiItem(
  "event ActionExecuted(bytes32 indexed actionId, bytes32 indexed signalId, uint8 actionType, address indexed asset, address recipient, uint256 amount, string memo, address executor)"
);

function now() {
  return new Date().toISOString();
}

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
    throw new Error(`${name} is missing or invalid.`);
  }

  return getAddress(value);
}

function optionalAddress(name, fallback) {
  const value = process.env[name];

  if (!value) return fallback;

  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`${name} is invalid: ${value}`);
  }

  return getAddress(value);
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (_error) {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function appendJsonl(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, JSON.stringify(value) + "\n");
}

function bigintJson(_key, value) {
  return typeof value === "bigint" ? value.toString() : value;
}

function sha256Hex(value) {
  return "0x" + createHash("sha256").update(value).digest("hex");
}

function actionName(actionType) {
  return ACTION_NAMES[Number(actionType)] || `UNKNOWN_${actionType}`;
}

function getStructField(value, key, index) {
  return value?.[key] ?? value?.[index];
}

function usd18(wholeUsd) {
  return BigInt(String(wholeUsd)) * UNIT;
}

function makeActionId(payload) {
  return sha256Hex(JSON.stringify(payload));
}

function loadQueue() {
  return readJson(queueFile, {
    version: "astra-execution-queue-v0.1",
    createdAt: now(),
    updatedAt: now(),
    items: {}
  });
}

function loadSubmittedSignalItems() {
  const approvalQueue = readJson(approvalQueueFile, {
    items: {}
  });

  return Object.values(approvalQueue.items || {}).filter((item) => {
    return item.status === "SUBMITTED_ONCHAIN" && item.signalId;
  });
}

async function latestBlockRange() {
  const latest = await client.getBlockNumber();
  const fromBlock = latest > lookbackBlocks ? latest - lookbackBlocks : 0n;

  return { fromBlock, toBlock: latest };
}

async function getExecutionsBySignal() {
  const bySignal = new Map();

  try {
    const { fromBlock, toBlock } = await latestBlockRange();

    const logs = await client.getLogs({
      address: controllerAddress,
      event: actionExecutedEvent,
      fromBlock,
      toBlock
    });

    for (const log of logs) {
      const args = log.args;
      const signalId = String(args.signalId);

      if (!bySignal.has(signalId)) {
        bySignal.set(signalId, []);
      }

      bySignal.get(signalId).push({
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber.toString(),
        logIndex: Number(log.logIndex ?? 0),
        actionId: String(args.actionId),
        signalId,
        actionType: Number(args.actionType),
        actionName: actionName(Number(args.actionType)),
        asset: String(args.asset),
        recipient: String(args.recipient),
        amount: String(args.amount),
        memo: String(args.memo),
        executor: String(args.executor),
        explorerUrl: `https://sepolia.basescan.org/tx/${log.transactionHash}`
      });
    }
  } catch (error) {
    console.error(`Warning: could not read ActionExecuted logs: ${error.message}`);
  }

  for (const items of bySignal.values()) {
    items.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));
  }

  return bySignal;
}

async function readOnchainSignal(signalId) {
  const exists = await client.readContract({
    address: registryAddress,
    abi: registryAbi,
    functionName: "signalExists",
    args: [signalId]
  });

  if (!exists) {
    return {
      exists: false,
      signalId
    };
  }

  const signal = await client.readContract({
    address: registryAddress,
    abi: registryAbi,
    functionName: "signals",
    args: [signalId]
  });

  const actionType = Number(getStructField(signal, "actionType", 2));

  return {
    exists: true,
    signalId,
    modelVersion: String(getStructField(signal, "modelVersion", 1)),
    actionType,
    actionName: actionName(actionType),
    confidenceBps: Number(getStructField(signal, "confidenceBps", 3)),
    riskBps: Number(getStructField(signal, "riskBps", 4)),
    maxSizeUsd: String(getStructField(signal, "maxSizeUsd", 5)),
    dataHash: String(getStructField(signal, "dataHash", 6)),
    reasonCode: String(getStructField(signal, "reasonCode", 7)),
    createdAt: String(getStructField(signal, "createdAt", 8)),
    submittedBy: String(getStructField(signal, "submittedBy", 9)),
    cancelled: Boolean(getStructField(signal, "cancelled", 10))
  };
}

function buildProposalFromSignal(signal) {
  const actionType = Number(signal.actionType);

  const supportedForMvp = actionType === 1 || actionType === 6;

  if (!supportedForMvp) {
    return {
      supported: false,
      unsupportedReason: `Action type ${actionType} (${actionName(actionType)}) is not executable by the MVP token-transfer path.`
    };
  }

  const recipient =
    actionType === 6
      ? optionalAddress("ASTRA_ECOSYSTEM_WALLET", optionalAddress("ASTRA_LIQUIDITY_WALLET", vaultAddress))
      : optionalAddress("ASTRA_LIQUIDITY_WALLET", vaultAddress);

  const amount = parseUnits(process.env.EXEC_QUEUE_ASTP_AMOUNT || "1", 18);
  const proposedUsdWhole = process.env.EXEC_QUEUE_PROPOSED_USD || "1";
  const treasuryUsdWhole = process.env.EXEC_QUEUE_TREASURY_USD || "1000000";
  const dailyUsdWhole = process.env.EXEC_QUEUE_DAILY_USED_USD || "0";
  const stableReserveUsdWhole = process.env.EXEC_QUEUE_STABLE_RESERVE_USD || "480000";
  const slippageBps = Number(process.env.EXEC_QUEUE_SLIPPAGE_BPS || "80");

  const basePayload = {
    schema: "astra-execution-proposal-v0.1",
    signalId: signal.signalId,
    actionType,
    asset: tokenAddress,
    recipient,
    amount: amount.toString(),
    proposedUsdValue: usd18(proposedUsdWhole).toString(),
    treasuryUsdValue: usd18(treasuryUsdWhole).toString(),
    dailyUsdUsed: usd18(dailyUsdWhole).toString(),
    stableReserveUsdValue: usd18(stableReserveUsdWhole).toString(),
    slippageBps,
    usesRealizedRevenue: false,
    vault: vaultAddress,
    controller: controllerAddress
  };

  const actionId = makeActionId(basePayload);

  return {
    supported: true,
    proposal: {
      actionId,
      signalId: signal.signalId,
      actionType,
      actionName: actionName(actionType),
      asset: tokenAddress,
      recipient,
      amount: amount.toString(),
      amountFormatted: formatUnits(amount, 18),
      proposedUsdValue: usd18(proposedUsdWhole).toString(),
      treasuryUsdValue: usd18(treasuryUsdWhole).toString(),
      dailyUsdUsed: usd18(dailyUsdWhole).toString(),
      stableReserveUsdValue: usd18(stableReserveUsdWhole).toString(),
      slippageBps,
      usesRealizedRevenue: false,
      memo: `EXECUTION_QUEUE_TESTNET: ${actionName(actionType)} from approved on-chain AI signal.`
    }
  };
}

async function validateProposalPolicy(proposal) {
  const result = await client.readContract({
    address: policyAddress,
    abi: policyAbi,
    functionName: "validateAction",
    args: [
      Number(proposal.actionType),
      proposal.asset,
      BigInt(proposal.proposedUsdValue),
      BigInt(proposal.treasuryUsdValue),
      BigInt(proposal.dailyUsdUsed),
      BigInt(proposal.stableReserveUsdValue),
      Number(proposal.slippageBps),
      Boolean(proposal.usesRealizedRevenue)
    ]
  });

  return {
    allowed: Boolean(result[0]),
    reason: String(result[1])
  };
}

async function isActionAlreadyExecuted(actionId) {
  return client.readContract({
    address: controllerAddress,
    abi: controllerAbi,
    functionName: "actionExecuted",
    args: [actionId]
  });
}

async function syncQueue() {
  const queue = loadQueue();
  const submittedSignals = loadSubmittedSignalItems();
  const executionsBySignal = await getExecutionsBySignal();

  let added = 0;
  let updated = 0;

  for (const submitted of submittedSignals) {
    const signalId = submitted.signalId;
    const onchainSignal = await readOnchainSignal(signalId);

    if (!onchainSignal.exists) {
      continue;
    }

    const proposalBuild = buildProposalFromSignal(onchainSignal);

    let actionId = null;
    let proposal = null;
    let status = "NEW";
    let policyCheck = null;
    let executionCheck = {
      alreadyExecutedByActionId: false,
      alreadyExecutedBySignal: false,
      matchingExecutions: executionsBySignal.get(signalId) || []
    };

    if (!proposalBuild.supported) {
      actionId = makeActionId({
        signalId,
        unsupportedReason: proposalBuild.unsupportedReason,
        actionType: onchainSignal.actionType
      });

      status = "UNSUPPORTED_ACTION";
    } else {
      proposal = proposalBuild.proposal;
      actionId = proposal.actionId;

      executionCheck.alreadyExecutedByActionId = await isActionAlreadyExecuted(actionId);
      executionCheck.alreadyExecutedBySignal = executionCheck.matchingExecutions.length > 0;

      if (onchainSignal.cancelled) {
        status = "SIGNAL_CANCELLED";
      } else if (executionCheck.alreadyExecutedByActionId || executionCheck.alreadyExecutedBySignal) {
        status = "EXECUTED";
      } else {
        policyCheck = await validateProposalPolicy(proposal);
        status = policyCheck.allowed ? "POLICY_PASSED" : "POLICY_BLOCKED";
      }
    }

    const existing = queue.items[actionId];

    if (!existing) {
      queue.items[actionId] = {
        actionId,
        signalId,
        status,
        createdAt: now(),
        updatedAt: now(),
        source: "approved-onchain-signal",
        signal: onchainSignal,
        proposal,
        policyCheck,
        executionCheck,
        unsupportedReason: proposalBuild.unsupportedReason || null,
        approval: null,
        rejection: null,
        execution: null
      };

      added += 1;
      continue;
    }

    const preservedTerminalStatuses = new Set(["REJECTED", "APPROVED_FOR_EXECUTION", "EXECUTED"]);

    existing.signal = onchainSignal;
    existing.proposal = proposal || existing.proposal || null;
    existing.policyCheck = policyCheck || existing.policyCheck || null;
    existing.executionCheck = executionCheck;
    existing.unsupportedReason = proposalBuild.unsupportedReason || existing.unsupportedReason || null;
    existing.updatedAt = now();

    if (status === "EXECUTED") {
      existing.status = "EXECUTED";
    } else if (!preservedTerminalStatuses.has(existing.status)) {
      existing.status = status;
    } else if (existing.status === "APPROVED_FOR_EXECUTION" && policyCheck && !policyCheck.allowed) {
      existing.status = "POLICY_BLOCKED";
      existing.approval = null;
    }

    updated += 1;
  }

  queue.updatedAt = now();
  writeJson(queueFile, queue);

  return {
    queue,
    added,
    updated,
    total: Object.keys(queue.items || {}).length
  };
}

function sortedItems(queue) {
  return Object.values(queue.items || {}).sort((a, b) => {
    const ad = a.createdAt || a.updatedAt || "";
    const bd = b.createdAt || b.updatedAt || "";
    return String(bd).localeCompare(String(ad));
  });
}

function groupItems(queue) {
  const groups = {
    POLICY_PASSED: [],
    APPROVED_FOR_EXECUTION: [],
    EXECUTED: [],
    POLICY_BLOCKED: [],
    REJECTED: [],
    UNSUPPORTED_ACTION: [],
    SIGNAL_CANCELLED: [],
    NEW: []
  };

  for (const item of sortedItems(queue)) {
    const status = item.status || "NEW";

    if (!groups[status]) {
      groups[status] = [];
    }

    groups[status].push(item);
  }

  return groups;
}

function resolveActionId(queue, arg, preferredStatus = null) {
  const items = sortedItems(queue);

  if (!arg || arg === "latest") {
    const filtered = preferredStatus
      ? items.filter((item) => item.status === preferredStatus)
      : items.filter((item) => item.status !== "EXECUTED");

    if (filtered.length === 0) {
      throw new Error(preferredStatus ? `No ${preferredStatus} proposals found.` : "No execution proposals found.");
    }

    return filtered[0].actionId;
  }

  const exact = items.find((item) => item.actionId === arg || item.signalId === arg);
  if (exact) return exact.actionId;

  const matches = items.filter((item) => {
    return item.actionId?.startsWith(arg) || item.signalId?.startsWith(arg);
  });

  if (matches.length === 1) {
    return matches[0].actionId;
  }

  if (matches.length > 1) {
    throw new Error(`Prefix matched multiple execution proposals: ${arg}`);
  }

  throw new Error(`Execution proposal not found: ${arg}`);
}

function appendQueueEvent(type, item, extra = {}) {
  appendJsonl(eventsFile, {
    at: now(),
    type,
    actionId: item.actionId,
    signalId: item.signalId,
    status: item.status,
    actionName: item.proposal?.actionName || item.signal?.actionName || null,
    policyAllowed: item.policyCheck?.allowed ?? null,
    policyReason: item.policyCheck?.reason ?? null,
    note: extra.note || null,
    actor: process.env.USER || "local",
    ...extra
  });
}

async function approveProposal(arg) {
  const { queue } = await syncQueue();
  const actionId = resolveActionId(queue, arg || "latest", "POLICY_PASSED");
  const item = queue.items[actionId];

  if (item.status !== "POLICY_PASSED") {
    throw new Error(`Only POLICY_PASSED proposals can be approved. Current status: ${item.status}`);
  }

  item.status = "APPROVED_FOR_EXECUTION";
  item.updatedAt = now();
  item.approval = {
    approvedAt: now(),
    approvedBy: process.env.USER || "local",
    note: note || null
  };
  item.rejection = null;

  queue.updatedAt = now();
  writeJson(queueFile, queue);
  appendQueueEvent("APPROVED_FOR_EXECUTION", item, { note });

  console.log(`Approved execution proposal: ${actionId}`);
  console.log(`Signal: ${item.signalId}`);
  console.log(`Action: ${item.proposal?.actionName}`);
  console.log(`Policy: ${item.policyCheck?.allowed ? "allowed" : "blocked"} / ${item.policyCheck?.reason}`);
}

async function rejectProposal(arg) {
  const { queue } = await syncQueue();
  const actionId = resolveActionId(queue, arg || "latest");
  const item = queue.items[actionId];

  if (item.status === "EXECUTED") {
    throw new Error("Cannot reject a proposal that is already executed.");
  }

  item.status = "REJECTED";
  item.updatedAt = now();
  item.rejection = {
    rejectedAt: now(),
    rejectedBy: process.env.USER || "local",
    note: note || null
  };
  item.approval = null;

  queue.updatedAt = now();
  writeJson(queueFile, queue);
  appendQueueEvent("REJECTED", item, { note });

  console.log(`Rejected execution proposal: ${actionId}`);
  console.log(`Signal: ${item.signalId}`);
  console.log(`Action: ${item.proposal?.actionName || item.signal?.actionName}`);
}

function printStatus(queue) {
  const groups = groupItems(queue);

  console.log("AstraTreasury execution approval queue");
  console.log("======================================");
  console.log(`Queue file: ${queueFile}`);
  console.log(`Updated: ${queue.updatedAt}`);
  console.log("");

  for (const status of [
    "POLICY_PASSED",
    "APPROVED_FOR_EXECUTION",
    "EXECUTED",
    "POLICY_BLOCKED",
    "REJECTED",
    "UNSUPPORTED_ACTION",
    "SIGNAL_CANCELLED",
    "NEW"
  ]) {
    console.log(`${status}: ${groups[status]?.length || 0}`);
  }

  console.log("");
  console.log("Newest proposals:");

  console.table(
    sortedItems(queue).slice(0, 15).map((item) => ({
      status: item.status,
      actionId: item.actionId.slice(0, 18) + "...",
      signalId: item.signalId.slice(0, 18) + "...",
      action: item.proposal?.actionName || item.signal?.actionName,
      amount: item.proposal?.amountFormatted || "",
      recipient: item.proposal?.recipient || "",
      policy: item.policyCheck ? `${item.policyCheck.allowed}/${item.policyCheck.reason}` : "",
      latestTx: item.execution?.txHash || item.executionCheck?.matchingExecutions?.[0]?.transactionHash || ""
    }))
  );
}

try {
  if (command === "sync") {
    const result = await syncQueue();
    console.log(`Execution queue synced. Added ${result.added}, updated ${result.updated}, total ${result.total}.`);
    process.exit(0);
  }

  if (command === "status" || command === "list") {
    const result = await syncQueue();
    printStatus(result.queue);
    process.exit(0);
  }

  if (command === "approve") {
    await approveProposal(actionArg);
    process.exit(0);
  }

  if (command === "reject") {
    await rejectProposal(actionArg);
    process.exit(0);
  }

  throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
