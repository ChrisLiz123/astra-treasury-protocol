import { network } from "hardhat";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { formatUnits, parseUnits } from "viem";

const outDir = "reports/audit";
const outFile = path.join(outDir, "local-safe-role-transfer-dry-run.json");

fs.mkdirSync(outDir, { recursive: true });

const UNIT = 10n ** 18n;
const DEFAULT_ADMIN_ROLE = ("0x" + "00".repeat(32)) as `0x${string}`;

function bytes32(label: string): `0x${string}` {
  return ("0x" + createHash("sha256").update(label).digest("hex")) as `0x${string}`;
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
const failures: Array<{ name: string; details?: unknown }> = [];

function check(name: string, pass: boolean, details: unknown = {}) {
  checks.push({ name, pass, details });
  if (!pass) failures.push({ name, details });
}

async function expectRevert(name: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    check(name, false, { expected: "revert", actual: "success" });
  } catch (error: any) {
    check(name, true, {
      reverted: true,
      message: String(error?.shortMessage || error?.message || error).slice(0, 240)
    });
  }
}

const { viem, networkName } = await network.create();

const publicClient = await viem.getPublicClient();
const wallets = await viem.getWalletClients();

const [
  deployer,
  ecosystem,
  liquidity,
  team,
  community,
  advisors,
  recipient,
  governanceSafe,
  treasurySafe,
  executorSafe,
  signalerSafe
] = wallets;

async function wait(txHash: `0x${string}`) {
  return publicClient.waitForTransactionReceipt({ hash: txHash });
}

console.log("AstraTreasury local Safe role-transfer dry run");
console.log("=============================================");
console.log(`Network: ${networkName}`);
console.log(`Deployer: ${deployer.account.address}`);
console.log(`Mock governanceSafe: ${governanceSafe.account.address}`);
console.log(`Mock treasurySafe: ${treasurySafe.account.address}`);
console.log(`Mock executorSafe: ${executorSafe.account.address}`);
console.log(`Mock signalerSafe: ${signalerSafe.account.address}`);

const policy = await viem.deployContract("TreasuryPolicy", [deployer.account.address]);
const vault = await viem.deployContract("TreasuryVault", [deployer.account.address, policy.address]);
const registry = await viem.deployContract("SignalRegistry", [deployer.account.address]);
const controller = await viem.deployContract("ExecutionController", [
  deployer.account.address,
  vault.address,
  policy.address,
  registry.address
]);

const token = await viem.deployContract("AstraToken", [
  vault.address,
  ecosystem.account.address,
  liquidity.account.address,
  team.account.address,
  community.account.address,
  advisors.account.address
]);

await wait(await policy.write.setAssetPolicy([token.address, true, false]));

const vaultExecutorRole = await vault.read.EXECUTOR_ROLE();
const signalerRole = await registry.read.SIGNALER_ROLE();
const controllerExecutorRole = await controller.read.EXECUTOR_ROLE();

await wait(await vault.write.grantRole([vaultExecutorRole, controller.address]));

check("controller has direct vault executor role before transfer", await vault.read.hasRole([vaultExecutorRole, controller.address]), {
  controller: controller.address
});

console.log("Granting future Safe-style roles...");

for (const contract of [policy, vault, registry, controller]) {
  await wait(await contract.write.grantRole([DEFAULT_ADMIN_ROLE, governanceSafe.account.address]));
}

await wait(await registry.write.grantRole([signalerRole, signalerSafe.account.address]));
await wait(await controller.write.grantRole([controllerExecutorRole, executorSafe.account.address]));

if (await vault.read.hasRole([vaultExecutorRole, deployer.account.address])) {
  await wait(await vault.write.revokeRole([vaultExecutorRole, deployer.account.address]));
}

if (await controller.read.hasRole([controllerExecutorRole, deployer.account.address])) {
  await wait(await controller.write.revokeRole([controllerExecutorRole, deployer.account.address]));
}

if (await registry.read.hasRole([signalerRole, deployer.account.address])) {
  await wait(await registry.write.revokeRole([signalerRole, deployer.account.address]));
}

for (const contract of [policy, vault, registry, controller]) {
  await wait(await contract.write.revokeRole([DEFAULT_ADMIN_ROLE, deployer.account.address]));
}

console.log("Checking role transfer result...");

check("governanceSafe owns TreasuryPolicy admin", await policy.read.hasRole([DEFAULT_ADMIN_ROLE, governanceSafe.account.address]));
check("governanceSafe owns TreasuryVault admin", await vault.read.hasRole([DEFAULT_ADMIN_ROLE, governanceSafe.account.address]));
check("governanceSafe owns SignalRegistry admin", await registry.read.hasRole([DEFAULT_ADMIN_ROLE, governanceSafe.account.address]));
check("governanceSafe owns ExecutionController admin", await controller.read.hasRole([DEFAULT_ADMIN_ROLE, governanceSafe.account.address]));

check("deployer no longer owns TreasuryPolicy admin", !(await policy.read.hasRole([DEFAULT_ADMIN_ROLE, deployer.account.address])));
check("deployer no longer owns TreasuryVault admin", !(await vault.read.hasRole([DEFAULT_ADMIN_ROLE, deployer.account.address])));
check("deployer no longer owns SignalRegistry admin", !(await registry.read.hasRole([DEFAULT_ADMIN_ROLE, deployer.account.address])));
check("deployer no longer owns ExecutionController admin", !(await controller.read.hasRole([DEFAULT_ADMIN_ROLE, deployer.account.address])));

check("signalerSafe has SignalRegistry.SIGNALER_ROLE", await registry.read.hasRole([signalerRole, signalerSafe.account.address]));
check("executorSafe has ExecutionController.EXECUTOR_ROLE", await controller.read.hasRole([controllerExecutorRole, executorSafe.account.address]));

check("controller remains the only intended vault executor", await vault.read.hasRole([vaultExecutorRole, controller.address]), {
  controller: controller.address
});

check("executorSafe does not directly hold vault executor role", !(await vault.read.hasRole([vaultExecutorRole, executorSafe.account.address])), {
  executorSafe: executorSafe.account.address
});

await expectRevert("deployer cannot grant SignalRegistry roles after admin revocation", async () => {
  await registry.write.grantRole([signalerRole, deployer.account.address]);
});

console.log("Testing future role flow...");

const signalId = bytes32("safe-dry-run-signal");
const actionId = bytes32("safe-dry-run-action");

await wait(
  await registry.write.submitSignal(
    [
      signalId,
      "astra-safe-dry-run-v0.1",
      1,
      7400,
      1000,
      1000n,
      bytes32("safe-dry-run-data"),
      "SAFE_DRY_RUN_SIGNAL"
    ],
    { account: signalerSafe.account }
  )
);

check("signalerSafe can submit approved signal", await registry.read.signalExists([signalId]), {
  signalId
});

const recipientBefore = await token.read.balanceOf([recipient.account.address]);
const vaultBefore = await token.read.balanceOf([vault.address]);

const proposal = {
  actionId,
  signalId,
  actionType: 1,
  asset: token.address,
  recipient: recipient.account.address,
  amount: parseUnits("1", 18),
  proposedUsdValue: usd18(1n),
  treasuryUsdValue: usd18(1_000_000n),
  dailyUsdUsed: usd18(0n),
  stableReserveUsdValue: usd18(480_000n),
  slippageBps: 80,
  usesRealizedRevenue: false,
  memo: "SAFE_ROLE_TRANSFER_DRY_RUN"
};

await wait(await controller.write.executeTokenTransfer([proposal], { account: executorSafe.account }));

const recipientAfter = await token.read.balanceOf([recipient.account.address]);
const vaultAfter = await token.read.balanceOf([vault.address]);

check("executorSafe can execute through controller after policy check", recipientAfter - recipientBefore === proposal.amount, {
  recipientDelta: formatUnits(recipientAfter - recipientBefore, 18)
});

check("vault moved exactly proposal amount", vaultBefore - vaultAfter === proposal.amount, {
  vaultDelta: formatUnits(vaultBefore - vaultAfter, 18)
});

await expectRevert("deployer cannot execute through controller after executor revocation", async () => {
  await controller.write.executeTokenTransfer([
    {
      ...proposal,
      actionId: bytes32("deployer-should-not-execute")
    }
  ]);
});

const report = {
  schema: "astra-local-safe-role-transfer-dry-run-v0.1",
  generatedAt: new Date().toISOString(),
  networkName,
  status: failures.length === 0 ? "PASS" : "FAIL",
  mockSafes: {
    governanceSafe: governanceSafe.account.address,
    treasurySafe: treasurySafe.account.address,
    executorSafe: executorSafe.account.address,
    signalerSafe: signalerSafe.account.address
  },
  deployedContracts: {
    token: token.address,
    policy: policy.address,
    vault: vault.address,
    signalRegistry: registry.address,
    executionController: controller.address
  },
  checks,
  failures
};

fs.writeFileSync(outFile, stringify(report) + "\n");

console.log("");
console.log("AstraTreasury Safe role-transfer dry-run result");
console.log("==============================================");
console.log(`Status: ${report.status}`);
console.log(`Checks passed: ${checks.filter((item) => item.pass).length}/${checks.length}`);
console.log(`Report: ${outFile}`);

if (failures.length > 0) {
  console.log("Failures:");
  console.log(stringify(failures));
  process.exit(1);
}
