import { network } from "hardhat";
import fs from "node:fs";
import path from "node:path";

type HexAddress = `0x${string}`;
type Bytes32 = `0x${string}`;

const queueFile = "reports/paper-trading/approval-queue.json";
const eventsFile = "reports/paper-trading/approval-events.jsonl";
const submissionsFile = "reports/paper-trading/onchain-submissions.jsonl";

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

function requireBytes32(value: string, name: string): Bytes32 {
  if (!/^0x[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error(`${name} must be 0x plus 64 hex characters.`);
  }

  return value as Bytes32;
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
    const ad = a.capturedAt || a.updatedAt || a.createdAt || "";
    const bd = b.capturedAt || b.updatedAt || b.createdAt || "";
    return String(bd).localeCompare(String(ad));
  });
}

function resolveApprovedItem(queue: any): any {
  const requestedSignalId = process.env.PAPER_SIGNAL_ID;

  const items = sortedQueueItems(queue);

  if (requestedSignalId) {
    const exact = items.find((item: any) => item.signalId === requestedSignalId);

    if (exact) return exact;

    const partial = items.filter((item: any) => item.signalId.startsWith(requestedSignalId));

    if (partial.length === 1) return partial[0];
    if (partial.length > 1) throw new Error(`PAPER_SIGNAL_ID matched multiple queue items: ${requestedSignalId}`);

    throw new Error(`PAPER_SIGNAL_ID was not found in approval queue: ${requestedSignalId}`);
  }

  const latestApproved = items.find((item: any) => item.status === "APPROVED");

  if (!latestApproved) {
    throw new Error("No APPROVED paper signal found. Run: npm run queue:approve -- latest");
  }

  return latestApproved;
}

loadEnvFile("deployments/base-sepolia.env");

if (process.env.APPROVE_PAPER_SIGNAL !== "YES") {
  throw new Error(
    "Manual approval required. Re-run with: APPROVE_PAPER_SIGNAL=YES npm run submit:paper:approved:base-sepolia"
  );
}

const registryAddress = requireAddress("ASTRA_SIGNAL_REGISTRY");

const queue = readJson(queueFile);
const item = resolveApprovedItem(queue);

if (item.status !== "APPROVED") {
  throw new Error(`Signal ${item.signalId} is not APPROVED. Current status: ${item.status}`);
}

const paperRecord = item.paperRecord;

if (!paperRecord?.signal) {
  throw new Error(`Queue item ${item.signalId} does not contain paperRecord.signal.`);
}

const signal = paperRecord.signal;
const signalId = requireBytes32(String(item.signalId), "signalId");
const dataHash = requireBytes32(String(signal.data_hash), "data_hash");

const { viem, networkName } = await network.create();
const publicClient = await viem.getPublicClient();
const [walletClient] = await viem.getWalletClients();

const submitter = walletClient.account.address;

console.log(`Network: ${networkName}`);
console.log(`Submitter: ${submitter}`);
console.log(`SignalRegistry: ${registryAddress}`);
console.log(`Signal ID: ${signalId}`);
console.log(`Queue status: ${item.status}`);

const registry = await viem.getContractAt("SignalRegistry", registryAddress);

const signalerRole = await registry.read.SIGNALER_ROLE();
const canSubmit = await registry.read.hasRole([signalerRole, submitter]);

if (!canSubmit) {
  throw new Error(`Wallet ${submitter} does not have SIGNALER_ROLE on SignalRegistry.`);
}

const alreadyExists = await registry.read.signalExists([signalId]);

if (alreadyExists) {
  console.log("This signal already exists on-chain. Marking queue item as SUBMITTED_ONCHAIN.");

  item.status = "SUBMITTED_ONCHAIN";
  item.updatedAt = new Date().toISOString();
  item.submittedAt = item.submittedAt || new Date().toISOString();

  queue.updatedAt = new Date().toISOString();
  writeJson(queueFile, queue);

  process.exit(0);
}

console.log("Submitting approved paper signal on-chain...");
console.table({
  modelVersion: signal.model_version,
  actionType: Number(signal.action_type),
  confidenceBps: Number(signal.confidence_bps),
  riskBps: Number(signal.risk_bps),
  maxSizeUsd: Number(signal.max_size_usd),
  dataHash,
  reasonCode: signal.reason_code
});

const txHash = await registry.write.submitSignal([
  signalId,
  String(signal.model_version),
  Number(signal.action_type),
  Number(signal.confidence_bps),
  Number(signal.risk_bps),
  BigInt(signal.max_size_usd),
  dataHash,
  String(signal.reason_code)
]);

console.log(`Transaction sent: ${txHash}`);

const receipt = await publicClient.waitForTransactionReceipt({
  hash: txHash,
  confirmations: 1
});

console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);

const storedSignal = await registry.read.signals([signalId]);

console.log("Stored on-chain signal:");
console.log(stringifyWithBigInt(storedSignal));

const submission = {
  submittedAt: new Date().toISOString(),
  networkName,
  signalId,
  txHash,
  blockNumber: receipt.blockNumber.toString(),
  submitter,
  queueStatusBeforeSubmission: "APPROVED",
  paperRecordCapturedAt: paperRecord.capturedAt,
  actionName: paperRecord.actionName,
  reasonCode: signal.reason_code
};

appendJsonl(submissionsFile, submission);

item.status = "SUBMITTED_ONCHAIN";
item.updatedAt = new Date().toISOString();
item.submittedAt = submission.submittedAt;
item.latestTxHash = txHash;
item.onchainSubmissions = [submission, ...(item.onchainSubmissions || [])];

queue.updatedAt = new Date().toISOString();
writeJson(queueFile, queue);

appendJsonl(eventsFile, {
  at: new Date().toISOString(),
  type: "SUBMITTED_ONCHAIN",
  signalId,
  status: "SUBMITTED_ONCHAIN",
  txHash,
  blockNumber: receipt.blockNumber.toString(),
  actor: submitter,
  note: "Approved paper signal submitted to SignalRegistry."
});

console.log("Approved signal submission complete.");
console.log(`BaseScan: https://sepolia.basescan.org/tx/${txHash}`);
