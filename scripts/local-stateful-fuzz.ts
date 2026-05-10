import { network } from "hardhat";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { formatUnits, parseUnits } from "viem";

const outDir = "reports/audit";
const outFile = path.join(outDir, "local-stateful-fuzz.json");

fs.mkdirSync(outDir, { recursive: true });

const UNIT = 10n ** 18n;

type Hex32 = `0x${string}`;

type SignalRecord = {
  id: Hex32;
  cancelled: boolean;
};

type Proposal = {
  actionId: Hex32;
  signalId: Hex32;
  actionType: number;
  asset: `0x${string}`;
  recipient: `0x${string}`;
  amount: bigint;
  proposedUsdValue: bigint;
  treasuryUsdValue: bigint;
  dailyUsdUsed: bigint;
  stableReserveUsdValue: bigint;
  slippageBps: number;
  usesRealizedRevenue: boolean;
  memo: string;
};

function bytes32(label: string): Hex32 {
  return ("0x" + createHash("sha256").update(label).digest("hex")) as Hex32;
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

function makeRng(seed: number) {
  let state = seed >>> 0;

  return function rng() {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0xffffffff;
  };
}

function pick<T>(rng: () => number, values: T[]): T {
  return values[Math.floor(rng() * values.length)];
}

async function main() {
  const sequences = Number(process.env.LOCAL_FUZZ_SEQUENCES || "12");
  const stepsPerSequence = Number(process.env.LOCAL_FUZZ_STEPS || "30");
  const seed = Number(process.env.LOCAL_FUZZ_SEED || "1337");

  const report = {
    schema: "astra-local-stateful-fuzz-v0.1",
    generatedAt: new Date().toISOString(),
    seed,
    sequences,
    stepsPerSequence,
    status: "PASS",
    totals: {
      checks: 0,
      passed: 0,
      failed: 0,
      expectedReverts: 0,
      successfulExecutions: 0
    },
    failures: [] as unknown[],
    sequenceReports: [] as unknown[]
  };

  console.log("AstraTreasury local randomized stateful fuzz");
  console.log("===========================================");
  console.log(`Sequences: ${sequences}`);
  console.log(`Steps/sequence: ${stepsPerSequence}`);
  console.log(`Seed: ${seed}`);

  for (let sequenceIndex = 0; sequenceIndex < sequences; sequenceIndex++) {
    const rng = makeRng(seed + sequenceIndex);
    const sequence = await runSequence(sequenceIndex, rng, stepsPerSequence);

    report.sequenceReports.push(sequence);

    report.totals.checks += sequence.checks.length;
    report.totals.passed += sequence.checks.filter((item: any) => item.pass).length;
    report.totals.failed += sequence.checks.filter((item: any) => !item.pass).length;
    report.totals.expectedReverts += sequence.expectedReverts;
    report.totals.successfulExecutions += sequence.successfulExecutions;

    for (const failure of sequence.checks.filter((item: any) => !item.pass)) {
      report.failures.push({
        sequenceIndex,
        failure
      });
    }

    console.log(
      `Sequence ${sequenceIndex + 1}/${sequences}: ${sequence.status} | ` +
      `${sequence.successfulExecutions} executions | ${sequence.expectedReverts} expected reverts`
    );
  }

  if (report.totals.failed > 0) {
    report.status = "FAIL";
  }

  fs.writeFileSync(outFile, stringify(report) + "\n");

  console.log("");
  console.log("AstraTreasury local fuzz result");
  console.log("==============================");
  console.log(`Status: ${report.status}`);
  console.log(`Checks passed: ${report.totals.passed}/${report.totals.checks}`);
  console.log(`Successful executions: ${report.totals.successfulExecutions}`);
  console.log(`Expected reverts: ${report.totals.expectedReverts}`);
  console.log(`Report: ${outFile}`);

  if (report.status !== "PASS") {
    console.log("");
    console.log("Failures:");
    console.log(stringify(report.failures.slice(0, 10)));
    process.exit(1);
  }
}

async function runSequence(sequenceIndex: number, rng: () => number, steps: number) {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();
  const wallets = await viem.getWalletClients();

  const [admin, ecosystem, liquidity, team, community, advisors, recipientA, recipientB] = wallets;

  const adminAddress = admin.account.address;
  const recipientAddresses = [recipientA.account.address, recipientB.account.address];

  async function wait(txHash: `0x${string}`) {
    return publicClient.waitForTransactionReceipt({ hash: txHash });
  }

  const checks: Array<{ name: string; pass: boolean; details?: unknown }> = [];
  let expectedReverts = 0;
  let successfulExecutions = 0;

  function check(name: string, pass: boolean, details: unknown = {}) {
    checks.push({ name, pass, details });
  }

  async function expectRevert(name: string, fn: () => Promise<unknown>) {
    try {
      await fn();
      check(name, false, { expected: "revert", actual: "success" });
    } catch (error: any) {
      expectedReverts += 1;
      check(name, true, {
        reverted: true,
        message: String(error?.shortMessage || error?.message || error).slice(0, 240)
      });
    }
  }

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
    ecosystem.account.address,
    liquidity.account.address,
    team.account.address,
    community.account.address,
    advisors.account.address
  ]);

  await wait(await policy.write.setAssetPolicy([token.address, true, false]));

  const vaultExecutorRole = await vault.read.EXECUTOR_ROLE();
  await wait(await vault.write.grantRole([vaultExecutorRole, controller.address]));

  const signals: SignalRecord[] = [];
  const executedProposals: Proposal[] = [];

  const initialSupply = await token.read.totalSupply();
  const initialVaultBalance = await token.read.balanceOf([vault.address]);

  check("initial total supply is fixed", initialSupply === 1_000_000_000n * UNIT, {
    initialSupply: formatUnits(initialSupply, 18)
  });

  check("initial vault balance is treasury allocation", initialVaultBalance === 350_000_000n * UNIT, {
    initialVaultBalance: formatUnits(initialVaultBalance, 18)
  });

  for (let step = 0; step < steps; step++) {
    const op = pick(rng, [
      "submit_signal",
      "cancel_signal",
      "execute_valid",
      "execute_duplicate",
      "execute_unknown_signal",
      "execute_cancelled_signal",
      "execute_high_slippage",
      "execute_unapproved_asset",
      "execute_zero_recipient"
    ]);

    const totalSupplyBefore = await token.read.totalSupply();
    const vaultBefore = await token.read.balanceOf([vault.address]);

    if (op === "submit_signal") {
      const id = bytes32(`sequence-${sequenceIndex}-step-${step}-signal-${signals.length}`);

      await wait(
        await registry.write.submitSignal([
          id,
          "astra-local-fuzz-v0.1",
          1,
          7000,
          1500,
          1000n,
          bytes32(`sequence-${sequenceIndex}-step-${step}-data`),
          "LOCAL_FUZZ_SIGNAL"
        ])
      );

      const exists = await registry.read.signalExists([id]);

      signals.push({
        id,
        cancelled: false
      });

      check("submitted signal exists", exists, { signalId: id });
    }

    if (op === "cancel_signal") {
      const active = signals.filter((signal) => !signal.cancelled);

      if (active.length === 0) {
        check("cancel skipped when no active signal", true);
      } else {
        const target = pick(rng, active);
        await wait(await registry.write.cancelSignal([target.id]));
        target.cancelled = true;

        const stored = await registry.read.signals([target.id]);
        const cancelled = Boolean((stored as any).cancelled ?? (stored as any)[10]);

        check("cancelled signal is marked cancelled", cancelled, { signalId: target.id });
      }
    }

    if (op === "execute_valid") {
      const active = signals.filter((signal) => !signal.cancelled);

      if (active.length === 0) {
        check("valid execution skipped when no active signal", true);
      } else {
        const signal = pick(rng, active);
        const proposal = makeValidProposal({
          sequenceIndex,
          step,
          signalId: signal.id,
          tokenAddress: token.address,
          recipient: pick(rng, recipientAddresses)
        });

        const recipientBefore = await token.read.balanceOf([proposal.recipient]);

        await wait(await controller.write.executeTokenTransfer([proposal]));

        const recipientAfter = await token.read.balanceOf([proposal.recipient]);
        const vaultAfter = await token.read.balanceOf([vault.address]);

        executedProposals.push(proposal);
        successfulExecutions += 1;

        check("valid execution moved exactly proposal amount to recipient", recipientAfter - recipientBefore === proposal.amount, {
          delta: formatUnits(recipientAfter - recipientBefore, 18),
          expected: formatUnits(proposal.amount, 18)
        });

        check("valid execution reduced vault by proposal amount", vaultBefore - vaultAfter === proposal.amount, {
          delta: formatUnits(vaultBefore - vaultAfter, 18),
          expected: formatUnits(proposal.amount, 18)
        });

        const executed = await controller.read.actionExecuted([proposal.actionId]);

        check("valid execution marked action executed", executed, {
          actionId: proposal.actionId
        });
      }
    }

    if (op === "execute_duplicate") {
      if (executedProposals.length === 0) {
        check("duplicate execution skipped when no executed proposal", true);
      } else {
        const proposal = pick(rng, executedProposals);

        await expectRevert("duplicate execution reverts", async () => {
          await controller.write.executeTokenTransfer([proposal]);
        });
      }
    }

    if (op === "execute_unknown_signal") {
      const proposal = makeValidProposal({
        sequenceIndex,
        step,
        signalId: bytes32(`sequence-${sequenceIndex}-step-${step}-unknown-signal`),
        tokenAddress: token.address,
        recipient: pick(rng, recipientAddresses)
      });

      await expectRevert("unknown signal execution reverts", async () => {
        await controller.write.executeTokenTransfer([proposal]);
      });
    }

    if (op === "execute_cancelled_signal") {
      const cancelledSignals = signals.filter((signal) => signal.cancelled);

      if (cancelledSignals.length === 0) {
        check("cancelled execution skipped when no cancelled signal", true);
      } else {
        const signal = pick(rng, cancelledSignals);
        const proposal = makeValidProposal({
          sequenceIndex,
          step,
          signalId: signal.id,
          tokenAddress: token.address,
          recipient: pick(rng, recipientAddresses)
        });

        await expectRevert("cancelled signal execution reverts", async () => {
          await controller.write.executeTokenTransfer([proposal]);
        });
      }
    }

    if (op === "execute_high_slippage") {
      const active = signals.filter((signal) => !signal.cancelled);

      if (active.length === 0) {
        check("high slippage execution skipped when no active signal", true);
      } else {
        const signal = pick(rng, active);
        const proposal = {
          ...makeValidProposal({
            sequenceIndex,
            step,
            signalId: signal.id,
            tokenAddress: token.address,
            recipient: pick(rng, recipientAddresses)
          }),
          slippageBps: 101
        };

        await expectRevert("high slippage execution reverts", async () => {
          await controller.write.executeTokenTransfer([proposal]);
        });
      }
    }

    if (op === "execute_unapproved_asset") {
      const active = signals.filter((signal) => !signal.cancelled);

      if (active.length === 0) {
        check("unapproved asset execution skipped when no active signal", true);
      } else {
        const signal = pick(rng, active);
        const proposal = {
          ...makeValidProposal({
            sequenceIndex,
            step,
            signalId: signal.id,
            tokenAddress: token.address,
            recipient: pick(rng, recipientAddresses)
          }),
          asset: "0x000000000000000000000000000000000000dEaD" as `0x${string}`
        };

        await expectRevert("unapproved asset execution reverts", async () => {
          await controller.write.executeTokenTransfer([proposal]);
        });
      }
    }

    if (op === "execute_zero_recipient") {
      const active = signals.filter((signal) => !signal.cancelled);

      if (active.length === 0) {
        check("zero recipient execution skipped when no active signal", true);
      } else {
        const signal = pick(rng, active);
        const proposal = {
          ...makeValidProposal({
            sequenceIndex,
            step,
            signalId: signal.id,
            tokenAddress: token.address,
            recipient: "0x0000000000000000000000000000000000000000"
          })
        };

        await expectRevert("zero recipient execution reverts", async () => {
          await controller.write.executeTokenTransfer([proposal]);
        });
      }
    }

    const totalSupplyAfter = await token.read.totalSupply();
    const vaultAfterStep = await token.read.balanceOf([vault.address]);

    check("total supply invariant after step", totalSupplyAfter === totalSupplyBefore, {
      step,
      op,
      before: formatUnits(totalSupplyBefore, 18),
      after: formatUnits(totalSupplyAfter, 18)
    });

    check("vault balance never exceeds initial treasury allocation", vaultAfterStep <= initialVaultBalance, {
      step,
      op,
      vaultBalance: formatUnits(vaultAfterStep, 18),
      initialVaultBalance: formatUnits(initialVaultBalance, 18)
    });
  }

  return {
    sequenceIndex,
    status: checks.every((item) => item.pass) ? "PASS" : "FAIL",
    checks,
    expectedReverts,
    successfulExecutions,
    signalCount: signals.length,
    cancelledSignalCount: signals.filter((signal) => signal.cancelled).length,
    executedProposalCount: executedProposals.length
  };
}

function makeValidProposal(args: {
  sequenceIndex: number;
  step: number;
  signalId: Hex32;
  tokenAddress: `0x${string}`;
  recipient: `0x${string}`;
}): Proposal {
  return {
    actionId: bytes32(`sequence-${args.sequenceIndex}-step-${args.step}-action`),
    signalId: args.signalId,
    actionType: 1,
    asset: args.tokenAddress,
    recipient: args.recipient,
    amount: parseUnits("1", 18),
    proposedUsdValue: usd18(1n),
    treasuryUsdValue: usd18(1_000_000n),
    dailyUsdUsed: usd18(0n),
    stableReserveUsdValue: usd18(480_000n),
    slippageBps: 80,
    usesRealizedRevenue: false,
    memo: `LOCAL_FUZZ_SEQUENCE_${args.sequenceIndex}_STEP_${args.step}`
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
