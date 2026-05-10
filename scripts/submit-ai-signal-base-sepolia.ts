import { network } from "hardhat";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

type HexAddress = `0x${string}`;
type Bytes32 = `0x${string}`;

type AiSignal = {
  model_version: string;
  action_type: number;
  confidence_bps: number;
  risk_bps: number;
  max_size_usd: number;
  data_hash: string;
  reason_code: string;
  generated_at: number;
};

function requireAddress(name: string): HexAddress {
  const value = process.env[name];

  if (!value || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(
      `${name} is missing or invalid. Run: export ${name}=0x... or source deployments/base-sepolia.env`
    );
  }

  return value as HexAddress;
}

function requireBytes32(value: string, name: string): Bytes32 {
  if (!/^0x[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error(`${name} must be a 32-byte hex string, got: ${value}`);
  }

  return value as Bytes32;
}

function readAiSignal(): AiSignal {
  const raw = execFileSync("python3", ["services/ai-engine/main.py"], {
    encoding: "utf8"
  });

  const parsed = JSON.parse(raw);

  if (!parsed.signal) {
    throw new Error("AI simulator output did not contain a signal object.");
  }

  return parsed.signal as AiSignal;
}

function makeSignalId(signal: AiSignal): Bytes32 {
  const payload = JSON.stringify({
    model_version: signal.model_version,
    action_type: signal.action_type,
    confidence_bps: signal.confidence_bps,
    risk_bps: signal.risk_bps,
    max_size_usd: signal.max_size_usd,
    data_hash: signal.data_hash,
    reason_code: signal.reason_code,
    generated_at: signal.generated_at
  });

  return ("0x" + createHash("sha256").update(payload).digest("hex")) as Bytes32;
}

function stringifyWithBigInt(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, innerValue) =>
      typeof innerValue === "bigint" ? innerValue.toString() : innerValue,
    2
  );
}

const registryAddress = requireAddress("ASTRA_SIGNAL_REGISTRY");

const { viem, networkName } = await network.create();
const publicClient = await viem.getPublicClient();
const [walletClient] = await viem.getWalletClients();

const submitter = walletClient.account.address;

console.log(`Network: ${networkName}`);
console.log(`Submitter: ${submitter}`);
console.log(`SignalRegistry: ${registryAddress}`);

const signalRegistry = await viem.getContractAt(
  "SignalRegistry",
  registryAddress
);

const signalerRole = await signalRegistry.read.SIGNALER_ROLE();
const canSubmit = await signalRegistry.read.hasRole([signalerRole, submitter]);

if (!canSubmit) {
  throw new Error(
    `The current wallet ${submitter} does not have SIGNALER_ROLE on SignalRegistry.`
  );
}

const signal = readAiSignal();
const signalId = makeSignalId(signal);
const dataHash = requireBytes32(signal.data_hash, "data_hash");

console.log("Generated AI signal:");
console.table({
  signalId,
  modelVersion: signal.model_version,
  actionType: signal.action_type,
  confidenceBps: signal.confidence_bps,
  riskBps: signal.risk_bps,
  maxSizeUsd: signal.max_size_usd,
  dataHash,
  reasonCode: signal.reason_code
});

const alreadyExists = await signalRegistry.read.signalExists([signalId]);

if (alreadyExists) {
  console.log("Signal already exists on-chain. Reading existing signal...");
  const existingSignal = await signalRegistry.read.signals([signalId]);
  console.log(stringifyWithBigInt(existingSignal));
  process.exit(0);
}

console.log("Submitting signal to Base Sepolia...");

const txHash = await signalRegistry.write.submitSignal([
  signalId,
  signal.model_version,
  Number(signal.action_type),
  Number(signal.confidence_bps),
  Number(signal.risk_bps),
  BigInt(signal.max_size_usd),
  dataHash,
  signal.reason_code
]);

console.log(`Transaction sent: ${txHash}`);

const receipt = await publicClient.waitForTransactionReceipt({
  hash: txHash,
  confirmations: 1
});

console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);

const storedSignal = await signalRegistry.read.signals([signalId]);

console.log("Stored on-chain signal:");
console.log(stringifyWithBigInt(storedSignal));

console.log("Done. This was a signal log only; no treasury funds were moved.");
