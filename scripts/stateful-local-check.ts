import { network } from "hardhat";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { formatUnits, parseUnits } from "viem";

const outDir = "reports/audit";
const outFile = path.join(outDir, "local-stateful-check.json");

fs.mkdirSync(outDir, { recursive: true });

const UNIT = 10n ** 18n;

function bytes32(label: string): `0x${string}` {
  return ("0x" + createHash("sha256").update(label).digest("hex")) as `0x${string}`;
}

function randomBytes32(): `0x${string}` {
  return ("0x" + randomBytes(32).toString("hex")) as `0x${string}`;
}

function usd18(value: bigint): bigint {
  return value * UNIT;
}

function stringify(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, innerValue) => typeof innerValue === "bigint" ? innerValue.toString() : innerValue,
    2
  );
}

const checks: Array<{ name: string; pass: boolean; details?: unknown }> = [];
const findings: Array<{ id: string; severity: string; title: string; details: unknown; recommendation: string }> = [];
const failures: Array<{ name: string; details?: unknown }> = [];

function check(name: string, pass: boolean, details: unknown = {}) {
  checks.push({ name, pass, details });

  if (!pass) {
    failures.push({ name, details });
  }
}

async function expectRevert(name: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    check(name, false, { expected: "revert", actual: "success" });
  } catch (error: any) {
    check(name, true, { reverted: true, message: String(error?.shortMessage || error?.message || error).slice(0, 300) });
  }
}

const { viem, networkName } = await network.create();

const publicClient = await viem.getPublicClient();
const wallets = await viem.getWalletClients();

const [admin, ecosystem, liquidity, team, community, advisors, recipient, otherRecipient] = wallets;

const adminAddress = admin.account.address;
const ecosystemAddress = ecosystem.account.address;
const liquidityAddress = liquidity.account.address;
const teamAddress = team.account.address;
const communityAddress = community.account.address;
const advisorsAddress = advisors.account.address;
const recipientAddress = recipient.account.address;
const otherRecipientAddress = otherRecipient.account.address;

async function wait(txHash: `0x${string}`) {
  return publicClient.waitForTransactionReceipt({ hash: txHash });
}

console.log("AstraTreasury local stateful audit check");
console.log("=======================================");
console.log(`Network: ${networkName}`);
console.log(`Admin: ${adminAddress}`);

console.log("Deploying local contracts...");

const policy = await viem.deployContract("TreasuryPolicy", [adminAddress]);
const vault = await viem.deployContract("TreasuryVault", [adminAddress, policy.address]);
const registry = await viem.deployContract("SignalRegistry", [adminAddress]);
const controller = await viem.deployContract("ExecutionController", [
  adminAddress,
  vault.address,
  policy.address,
  registry.address
]);

const token = await viem.deployContract("AstraToken", [
  vault.address,
  ecosystemAddress,
  liquidityAddress,
  teamAddress,
  communityAddress,
  advisorsAddress
]);

console.log("Wiring local contracts...");

await wait(await policy.write.setAssetPolicy([token.address, true, false]));

const vaultExecutorRole = await vault.read.EXECUTOR_ROLE();
await wait(await vault.write.grantRole([vaultExecutorRole, controller.address]));

const controllerCanMoveVaultFunds = await vault.read.hasRole([vaultExecutorRole, controller.address]);

check("controller has vault executor role", controllerCanMoveVaultFunds, {
  controller: controller.address,
  vault: vault.address
});

const tokenSupply = await token.read.totalSupply();
const vaultBalanceStart = await token.read.balanceOf([vault.address]);

check("token supply is 1,000,000,000 ASTP", tokenSupply === 1_000_000_000n * UNIT, {
  tokenSupply: formatUnits(tokenSupply, 18)
});

check("vault starts with treasury allocation", vaultBalanceStart === 350_000_000n * UNIT, {
  vaultBalanceStart: formatUnits(vaultBalanceStart, 18)
});

const vaultPolicy = await vault.read.policy();
const controllerVault = await controller.read.vault();
const controllerPolicy = await controller.read.policy();
const controllerRegistry = await controller.read.signalRegistry();

check("vault policy wiring", String(vaultPolicy).toLowerCase() === String(policy.address).toLowerCase(), {
  vaultPolicy,
  expected: policy.address
});

check("controller vault wiring", String(controllerVault).toLowerCase() === String(vault.address).toLowerCase(), {
  controllerVault,
  expected: vault.address
});

check("controller policy wiring", String(controllerPolicy).toLowerCase() === String(policy.address).toLowerCase(), {
  controllerPolicy,
  expected: policy.address
});

check("controller signal registry wiring", String(controllerRegistry).toLowerCase() === String(registry.address).toLowerCase(), {
  controllerRegistry,
  expected: registry.address
});

console.log("Submitting and executing a valid signal...");

const signalId = bytes32("astra-local-valid-signal");
const dataHash = bytes32("astra-local-data-window");
const actionId = bytes32("astra-local-valid-action");

await wait(
  await registry.write.submitSignal([
    signalId,
    "astra-local-stateful-v0.1",
    1,
    7400,
    1000,
    5000n,
    dataHash,
    "LOCAL_VALID_SIGNAL"
  ])
);

const signalExists = await registry.read.signalExists([signalId]);
check("submitted signal exists", signalExists, { signalId });

const amount = parseUnits("1", 18);

const validProposal = {
  actionId,
  signalId,
  actionType: 1,
  asset: token.address,
  recipient: recipientAddress,
  amount,
  proposedUsdValue: usd18(1n),
  treasuryUsdValue: usd18(1_000_000n),
  dailyUsdUsed: usd18(0n),
  stableReserveUsdValue: usd18(480_000n),
  slippageBps: 80,
  usesRealizedRevenue: false,
  memo: "LOCAL_STATEFUL_VALID_EXECUTION"
};

const recipientBefore = await token.read.balanceOf([recipientAddress]);
const vaultBefore = await token.read.balanceOf([vault.address]);

await wait(await controller.write.executeTokenTransfer([validProposal]));

const recipientAfter = await token.read.balanceOf([recipientAddress]);
const vaultAfter = await token.read.balanceOf([vault.address]);

check("valid execution transfers 1 ASTP to recipient", recipientAfter - recipientBefore === amount, {
  before: formatUnits(recipientBefore, 18),
  after: formatUnits(recipientAfter, 18),
  delta: formatUnits(recipientAfter - recipientBefore, 18)
});

check("valid execution removes 1 ASTP from vault", vaultBefore - vaultAfter === amount, {
  before: formatUnits(vaultBefore, 18),
  after: formatUnits(vaultAfter, 18),
  delta: formatUnits(vaultBefore - vaultAfter, 18)
});

const actionMarkedExecuted = await controller.read.actionExecuted([actionId]);

check("action marked executed", actionMarkedExecuted, { actionId });

console.log("Testing expected reverts...");

await expectRevert("duplicate action execution reverts", async () => {
  await controller.write.executeTokenTransfer([validProposal]);
});

const unknownSignalProposal = {
  ...validProposal,
  actionId: bytes32("astra-local-unknown-signal-action"),
  signalId: bytes32("astra-local-unknown-signal")
};

await expectRevert("unknown signal execution reverts", async () => {
  await controller.write.executeTokenTransfer([unknownSignalProposal]);
});

const excessiveSlippageProposal = {
  ...validProposal,
  actionId: bytes32("astra-local-high-slippage-action"),
  slippageBps: 101
};

await expectRevert("policy rejects excessive slippage", async () => {
  await controller.write.executeTokenTransfer([excessiveSlippageProposal]);
});

const unapprovedAssetProposal = {
  ...validProposal,
  actionId: bytes32("astra-local-unapproved-asset-action"),
  asset: "0x000000000000000000000000000000000000dEaD" as `0x${string}`
};

await expectRevert("policy rejects unapproved asset", async () => {
  await controller.write.executeTokenTransfer([unapprovedAssetProposal]);
});

console.log("Checking cancelled-signal behavior...");

const cancelSignalId = bytes32("astra-local-cancelled-signal");
const cancelActionId = bytes32("astra-local-cancelled-action");

await wait(
  await registry.write.submitSignal([
    cancelSignalId,
    "astra-local-stateful-v0.1",
    1,
    7000,
    1500,
    1000n,
    bytes32("astra-local-cancelled-data"),
    "LOCAL_CANCEL_TEST"
  ])
);

await wait(await registry.write.cancelSignal([cancelSignalId]));

const cancelledSignal = await registry.read.signals([cancelSignalId]);
const isCancelled = Boolean((cancelledSignal as any).cancelled ?? (cancelledSignal as any)[10]);

check("signal can be cancelled in registry", isCancelled, {
  cancelSignalId
});

const cancelledProposal = {
  ...validProposal,
  actionId: cancelActionId,
  signalId: cancelSignalId,
  recipient: otherRecipientAddress,
  memo: "LOCAL_CANCELLED_SIGNAL_EXECUTION_TEST"
};

let cancelledSignalExecuted = false;

try {
  await wait(await controller.write.executeTokenTransfer([cancelledProposal]));
  cancelledSignalExecuted = true;
} catch (_error) {
  cancelledSignalExecuted = false;
}

if (cancelledSignalExecuted) {
  findings.push({
    id: "ASTRA-FINDING-001",
    severity: "medium",
    title: "ExecutionController permits execution of a cancelled SignalRegistry signal",
    details: {
      signalId: cancelSignalId,
      actionId: cancelActionId,
      observed: "cancelled signal was executable because controller checks signalExists but not cancelled flag"
    },
    recommendation:
      "Update ExecutionController to query SignalRegistry cancellation state before execution, or add an isSignalExecutable(signalId) interface that returns exists && !cancelled."
  });
} else {
  check("cancelled signal execution reverts", true, {
    cancelSignalId
  });
}

const status =
  failures.length > 0
    ? "FAIL"
    : findings.length > 0
      ? "PASS_WITH_FINDINGS"
      : "PASS";

const report = {
  schema: "astra-local-stateful-audit-v0.1",
  generatedAt: new Date().toISOString(),
  networkName,
  status,
  summary: {
    checks: checks.length,
    passed: checks.filter((item) => item.pass).length,
    failed: failures.length,
    findings: findings.length
  },
  deployedContracts: {
    token: token.address,
    policy: policy.address,
    vault: vault.address,
    signalRegistry: registry.address,
    executionController: controller.address
  },
  checks,
  findings,
  failures
};

fs.writeFileSync(outFile, stringify(report) + "\n");

console.log("");
console.log("AstraTreasury local stateful audit result");
console.log("========================================");
console.log(`Status: ${status}`);
console.log(`Checks passed: ${report.summary.passed}/${report.summary.checks}`);
console.log(`Findings: ${findings.length}`);
console.log(`Report: ${outFile}`);

if (findings.length > 0) {
  console.log("");
  console.log("Findings:");
  console.table(
    findings.map((finding) => ({
      id: finding.id,
      severity: finding.severity,
      title: finding.title
    }))
  );
}

if (failures.length > 0) {
  console.log("");
  console.log("Failures:");
  console.table(failures);
  process.exit(1);
}
