import { network } from "hardhat";
import fs from "node:fs";
import path from "node:path";
import { formatUnits } from "viem";

type HexAddress = `0x${string}`;
type Bytes32 = `0x${string}`;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const queueFile = "reports/execution-queue/execution-queue.json";
const eventsFile = "reports/execution-queue/execution-events.jsonl";
const executionsFile = "reports/execution-queue/onchain-executions.jsonl";

function loadEnvFile(filePath: string): void {
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

function requireAddress(name: string): HexAddress {
  const value = process.env[name];

  if (!value || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`${name} is missing or invalid.`);
  }

  return value as HexAddress;
}

function readJson(filePath: string): any {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function appendJsonl(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, JSON.stringify(value) + "\n");
}

function stringifyWithBigInt(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, innerValue) => typeof innerValue === "bigint" ? innerValue.toString() : innerValue,
    2
  );
}

function sortedQueueItems(queue: any): any[] {
  return Object.values(queue.items || {}).sort((a: any, b: any) => {
    const ad = a.createdAt || a.updatedAt || "";
    const bd = b.createdAt || b.updatedAt || "";
    return String(bd).localeCompare(String(ad));
  });
}

function resolveApprovedItem(queue: any): any {
  const requestedActionId = process.env.EXECUTION_ACTION_ID;
  const requestedSignalId = process.env.EXECUTION_SIGNAL_ID;

  const items = sortedQueueItems(queue);

  if (requestedActionId) {
    const exact = items.find((item: any) => item.actionId === requestedActionId);

    if (exact) return exact;

    const partial = items.filter((item: any) => item.actionId.startsWith(requestedActionId));

    if (partial.length === 1) return partial[0];
    if (partial.length > 1) throw new Error(`EXECUTION_ACTION_ID matched multiple items: ${requestedActionId}`);

    throw new Error(`EXECUTION_ACTION_ID was not found: ${requestedActionId}`);
  }

  if (requestedSignalId) {
    const exact = items.find((item: any) => item.signalId === requestedSignalId);

    if (exact) return exact;

    const partial = items.filter((item: any) => item.signalId.startsWith(requestedSignalId));

    if (partial.length === 1) return partial[0];
    if (partial.length > 1) throw new Error(`EXECUTION_SIGNAL_ID matched multiple items: ${requestedSignalId}`);

    throw new Error(`EXECUTION_SIGNAL_ID was not found: ${requestedSignalId}`);
  }

  const latestApproved = items.find((item: any) => item.status === "APPROVED_FOR_EXECUTION");

  if (!latestApproved) {
    throw new Error("No APPROVED_FOR_EXECUTION proposal found. Run: npm run execq:approve -- latest");
  }

  return latestApproved;
}

function toProposal(raw: any) {
  return {
    actionId: raw.actionId as Bytes32,
    signalId: raw.signalId as Bytes32,
    actionType: Number(raw.actionType),
    asset: raw.asset as HexAddress,
    recipient: raw.recipient as HexAddress,
    amount: BigInt(raw.amount),
    proposedUsdValue: BigInt(raw.proposedUsdValue),
    treasuryUsdValue: BigInt(raw.treasuryUsdValue),
    dailyUsdUsed: BigInt(raw.dailyUsdUsed),
    stableReserveUsdValue: BigInt(raw.stableReserveUsdValue),
    slippageBps: Number(raw.slippageBps),
    usesRealizedRevenue: Boolean(raw.usesRealizedRevenue),
    memo: String(raw.memo || "APPROVED_EXECUTION_QUEUE_ACTION")
  };
}

loadEnvFile("deployments/base-sepolia.env");

if (process.env.APPROVE_TREASURY_EXECUTION !== "YES") {
  throw new Error(
    "Manual execution approval required. Re-run with: APPROVE_TREASURY_EXECUTION=YES npm run execq:execute:base-sepolia"
  );
}

const tokenAddress = requireAddress("ASTRA_TOKEN");
const policyAddress = requireAddress("ASTRA_POLICY");
const registryAddress = requireAddress("ASTRA_SIGNAL_REGISTRY");
const controllerAddress = requireAddress("ASTRA_CONTROLLER");
const vaultAddress = requireAddress("ASTRA_VAULT");

const queue = readJson(queueFile);
const item = resolveApprovedItem(queue);

if (item.status !== "APPROVED_FOR_EXECUTION") {
  throw new Error(`Proposal ${item.actionId} is not APPROVED_FOR_EXECUTION. Current status: ${item.status}`);
}

if (!item.proposal) {
  throw new Error(`Proposal ${item.actionId} does not contain proposal data.`);
}

const proposal = toProposal(item.proposal);

const { viem, networkName } = await network.create();
const publicClient = await viem.getPublicClient();
const [walletClient] = await viem.getWalletClients();

const executor = walletClient.account.address;

console.log(`Network: ${networkName}`);
console.log(`Executor: ${executor}`);
console.log(`Controller: ${controllerAddress}`);
console.log(`Vault: ${vaultAddress}`);
console.log(`Signal: ${proposal.signalId}`);
console.log(`Action: ${proposal.actionId}`);

const controller = await viem.getContractAt("ExecutionController", controllerAddress);
const policy = await viem.getContractAt("TreasuryPolicy", policyAddress);
const registry = await viem.getContractAt("SignalRegistry", registryAddress);
const token = await viem.getContractAt("AstraToken", tokenAddress);

const executorRole = await controller.read.EXECUTOR_ROLE();
const canExecute = await controller.read.hasRole([executorRole, executor]);

if (!canExecute) {
  throw new Error(`Wallet ${executor} does not have EXECUTOR_ROLE on ExecutionController.`);
}

const alreadyExecuted = await controller.read.actionExecuted([proposal.actionId]);

if (alreadyExecuted) {
  throw new Error(`Action ${proposal.actionId} is already marked executed.`);
}

const signalExists = await registry.read.signalExists([proposal.signalId]);

if (!signalExists) {
  throw new Error(`Signal ${proposal.signalId} does not exist on-chain.`);
}

const signal = await registry.read.signals([proposal.signalId]);
const cancelled = Boolean(signal.cancelled ?? signal[10]);

if (cancelled) {
  throw new Error(`Signal ${proposal.signalId} is cancelled.`);
}

const [allowed, reason] = await policy.read.validateAction([
  Number(proposal.actionType),
  proposal.asset,
  proposal.proposedUsdValue,
  proposal.treasuryUsdValue,
  proposal.dailyUsdUsed,
  proposal.stableReserveUsdValue,
  Number(proposal.slippageBps),
  Boolean(proposal.usesRealizedRevenue)
]);

console.log("Live policy check:");
console.table({
  allowed,
  reason
});

if (!allowed) {
  throw new Error(`Live TreasuryPolicy rejected execution: ${reason}`);
}

if (proposal.asset.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
  console.log("Simulating native transfer...");
  await controller.simulate.executeNativeTransfer([proposal]);

  console.log("Simulation passed. Sending native transfer...");
  const txHash = await controller.write.executeNativeTransfer([proposal]);

  console.log(`Transaction sent: ${txHash}`);

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    confirmations: 1
  });

  item.status = "EXECUTED";
  item.updatedAt = new Date().toISOString();
  item.execution = {
    executedAt: new Date().toISOString(),
    txHash,
    blockNumber: receipt.blockNumber.toString(),
    executor,
    networkName,
    type: "native"
  };

  queue.updatedAt = new Date().toISOString();
  writeJson(queueFile, queue);

  appendJsonl(executionsFile, {
    actionId: proposal.actionId,
    signalId: proposal.signalId,
    txHash,
    blockNumber: receipt.blockNumber.toString(),
    executor,
    networkName,
    type: "native",
    executedAt: item.execution.executedAt
  });

  appendJsonl(eventsFile, {
    at: new Date().toISOString(),
    type: "EXECUTED",
    actionId: proposal.actionId,
    signalId: proposal.signalId,
    txHash,
    blockNumber: receipt.blockNumber.toString(),
    actor: executor
  });

  console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);
  console.log(`BaseScan: https://sepolia.basescan.org/tx/${txHash}`);
  process.exit(0);
}

const vaultBalanceBefore = await token.read.balanceOf([vaultAddress]);
const recipientBalanceBefore = await token.read.balanceOf([proposal.recipient]);

console.log("Balances before:");
console.table({
  vault: `${formatUnits(vaultBalanceBefore, 18)} ASTP`,
  recipient: `${formatUnits(recipientBalanceBefore, 18)} ASTP`,
  amount: `${formatUnits(proposal.amount, 18)} ASTP`
});

console.log("Simulating token transfer...");
await controller.simulate.executeTokenTransfer([proposal]);

console.log("Simulation passed. Sending token transfer...");
const txHash = await controller.write.executeTokenTransfer([proposal]);

console.log(`Transaction sent: ${txHash}`);

const receipt = await publicClient.waitForTransactionReceipt({
  hash: txHash,
  confirmations: 1
});

const vaultBalanceAfter = await token.read.balanceOf([vaultAddress]);
const recipientBalanceAfter = await token.read.balanceOf([proposal.recipient]);

console.log("Balances after:");
console.table({
  vault: `${formatUnits(vaultBalanceAfter, 18)} ASTP`,
  recipient: `${formatUnits(recipientBalanceAfter, 18)} ASTP`,
  vaultDelta: `${formatUnits(vaultBalanceAfter - vaultBalanceBefore, 18)} ASTP`,
  recipientDelta: `${formatUnits(recipientBalanceAfter - recipientBalanceBefore, 18)} ASTP`
});

item.status = "EXECUTED";
item.updatedAt = new Date().toISOString();
item.execution = {
  executedAt: new Date().toISOString(),
  txHash,
  blockNumber: receipt.blockNumber.toString(),
  executor,
  networkName,
  type: "token",
  vaultBalanceBefore: vaultBalanceBefore.toString(),
  vaultBalanceAfter: vaultBalanceAfter.toString(),
  recipientBalanceBefore: recipientBalanceBefore.toString(),
  recipientBalanceAfter: recipientBalanceAfter.toString()
};

queue.updatedAt = new Date().toISOString();
writeJson(queueFile, queue);

appendJsonl(executionsFile, {
  actionId: proposal.actionId,
  signalId: proposal.signalId,
  txHash,
  blockNumber: receipt.blockNumber.toString(),
  executor,
  networkName,
  type: "token",
  amount: proposal.amount.toString(),
  asset: proposal.asset,
  recipient: proposal.recipient,
  executedAt: item.execution.executedAt
});

appendJsonl(eventsFile, {
  at: new Date().toISOString(),
  type: "EXECUTED",
  actionId: proposal.actionId,
  signalId: proposal.signalId,
  txHash,
  blockNumber: receipt.blockNumber.toString(),
  actor: executor
});

console.log("Approved treasury execution complete.");
console.log(`Stored queue item:`);
console.log(stringifyWithBigInt(item));
console.log(`BaseScan: https://sepolia.basescan.org/tx/${txHash}`);
