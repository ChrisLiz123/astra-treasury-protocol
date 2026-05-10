import { network } from "hardhat";
import fs from "node:fs";
import path from "node:path";

type HexAddress = `0x${string}`;
type Bytes32 = `0x${string}`;

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

loadEnvFile("deployments/base-sepolia.env");

if (process.env.APPROVE_PAPER_SIGNAL !== "YES") {
  throw new Error(
    "Manual approval required. Re-run with: APPROVE_PAPER_SIGNAL=YES npm run submit:paper:latest:base-sepolia"
  );
}

const registryAddress = requireAddress("ASTRA_SIGNAL_REGISTRY");
const paperSignalFile = process.env.PAPER_SIGNAL_FILE || "reports/paper-trading/latest.json";

if (!fs.existsSync(paperSignalFile)) {
  throw new Error(`Paper signal file not found: ${paperSignalFile}`);
}

const paperRecord = JSON.parse(fs.readFileSync(paperSignalFile, "utf8"));
const signal = paperRecord.signal;

if (!signal) {
  throw new Error("Paper signal record does not contain a signal object.");
}

if (!paperRecord.eligibleForManualSubmission) {
  throw new Error("Latest paper signal is not eligible for manual submission.");
}

const signalId = requireBytes32(String(paperRecord.signalId || paperRecord.paperSignalId), "signalId");
const dataHash = requireBytes32(String(signal.data_hash), "data_hash");

const { viem, networkName } = await network.create();
const publicClient = await viem.getPublicClient();
const [walletClient] = await viem.getWalletClients();

const submitter = walletClient.account.address;

console.log(`Network: ${networkName}`);
console.log(`Submitter: ${submitter}`);
console.log(`SignalRegistry: ${registryAddress}`);
console.log(`Paper signal file: ${paperSignalFile}`);
console.log(`Signal ID: ${signalId}`);

const registry = await viem.getContractAt("SignalRegistry", registryAddress);

const signalerRole = await registry.read.SIGNALER_ROLE();
const canSubmit = await registry.read.hasRole([signalerRole, submitter]);

if (!canSubmit) {
  throw new Error(`Wallet ${submitter} does not have SIGNALER_ROLE on SignalRegistry.`);
}

const alreadyExists = await registry.read.signalExists([signalId]);

if (alreadyExists) {
  console.log("This signal already exists on-chain. No new transaction sent.");

  const existingSignal = await registry.read.signals([signalId]);
  console.log(stringifyWithBigInt(existingSignal));

  process.exit(0);
}

console.log("Submitting manually approved paper signal on-chain...");
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

appendJsonl("reports/paper-trading/onchain-submissions.jsonl", {
  submittedAt: new Date().toISOString(),
  networkName,
  signalId,
  txHash,
  blockNumber: receipt.blockNumber.toString(),
  submitter,
  sourceFile: paperSignalFile,
  paperRecordCapturedAt: paperRecord.capturedAt,
  actionName: paperRecord.actionName,
  reasonCode: signal.reason_code
});

console.log("Manual submission complete.");
console.log(`BaseScan: https://sepolia.basescan.org/tx/${txHash}`);
