import { network } from "hardhat";
import fs from "node:fs";
import path from "node:path";
import { formatUnits } from "viem";

type HexAddress = `0x${string}`;
type Bytes32 = `0x${string}`;

const configPath = "configs/mainnet-production.config.json";
const deploymentReportPath = "reports/mainnet-deployment/mainnet-deployment-v1.json";
const outDir = "reports/mainnet-postdeploy";
const outFile = path.join(outDir, "mainnet-postdeploy-check-v1.json");
const publicDocFile = "docs/mainnet-live/MAINNET_POSTDEPLOY_VERIFICATION_V1.md";

const DEFAULT_ADMIN_ROLE = ("0x" + "00".repeat(32)) as Bytes32;

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.dirname(publicDocFile), { recursive: true });

function requireAddress(value: string, label: string): HexAddress {
  if (!/^0x[a-fA-F0-9]{40}$/.test(value || "")) {
    throw new Error(`${label} must be a valid address.`);
  }

  return value as HexAddress;
}

function sameAddress(a: string, b: string): boolean {
  return String(a).toLowerCase() === String(b).toLowerCase();
}

function stringify(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, innerValue) => typeof innerValue === "bigint" ? innerValue.toString() : innerValue,
    2
  );
}

if (!fs.existsSync(configPath)) {
  throw new Error(`Missing private config: ${configPath}`);
}

if (!fs.existsSync(deploymentReportPath)) {
  throw new Error(`Missing deployment report: ${deploymentReportPath}`);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const deployment = JSON.parse(fs.readFileSync(deploymentReportPath, "utf8"));

const checks: Array<{ name: string; pass: boolean; details?: unknown }> = [];
const failures: Array<{ name: string; details?: unknown }> = [];
const warnings: Array<{ name: string; details?: unknown }> = [];

function check(name: string, pass: boolean, details: unknown = {}) {
  checks.push({ name, pass, details });

  if (!pass) {
    failures.push({ name, details });
  }
}

function warn(name: string, details: unknown = {}) {
  warnings.push({ name, details });
}

const addresses = {
  treasuryPolicy: requireAddress(deployment.contracts.treasuryPolicy, "treasuryPolicy"),
  treasuryVault: requireAddress(deployment.contracts.treasuryVault, "treasuryVault"),
  signalRegistry: requireAddress(deployment.contracts.signalRegistry, "signalRegistry"),
  executionController: requireAddress(deployment.contracts.executionController, "executionController"),
  astraToken: requireAddress(deployment.contracts.astraToken, "astraToken")
};

const safes = {
  governanceSafe: requireAddress(config.safes.governanceSafe, "governanceSafe"),
  treasurySafe: requireAddress(config.safes.treasurySafe, "treasurySafe"),
  executorSafe: requireAddress(config.safes.executorSafe, "executorSafe"),
  signalerSafe: requireAddress(config.safes.signalerSafe, "signalerSafe")
};

const deployerAddress = requireAddress(config.deployer.address, "deployer.address");

const rawSafeSetupTxHash = process.env.MAINNET_SAFE_SETUP_TX_HASH;
const safeSetupTxHash = rawSafeSetupTxHash
  ? (rawSafeSetupTxHash.startsWith("0x") ? rawSafeSetupTxHash : `0x${rawSafeSetupTxHash}`) as HexAddress
  : undefined;

if (safeSetupTxHash && !/^0x[a-fA-F0-9]{64}$/.test(safeSetupTxHash)) {
  throw new Error("MAINNET_SAFE_SETUP_TX_HASH must be 0x plus 64 hex characters. Use the BaseScan transaction hash, not a shortened hash.");
}

const { viem, networkName } = await network.create();
const publicClient = await viem.getPublicClient();

const chainId = await publicClient.getChainId();

check("connected chain is Base Mainnet", chainId === 8453, { chainId });

if (safeSetupTxHash) {
  const receipt = await publicClient.getTransactionReceipt({ hash: safeSetupTxHash });

  check("Governance Safe setup transaction succeeded", receipt.status === "success", {
    txHash: safeSetupTxHash,
    blockNumber: receipt.blockNumber,
    status: receipt.status
  });
} else {
  warn("MAINNET_SAFE_SETUP_TX_HASH not provided", {
    message: "Set MAINNET_SAFE_SETUP_TX_HASH=0x... to verify the Governance Safe setup transaction receipt."
  });
}

for (const [label, address] of Object.entries(addresses)) {
  const code = await publicClient.getCode({ address });

  check(`${label} has bytecode`, Boolean(code && code !== "0x"), {
    address,
    codeLength: code ? code.length : 0
  });
}

const token = await viem.getContractAt("AstraToken", addresses.astraToken);
const policy = await viem.getContractAt("TreasuryPolicy", addresses.treasuryPolicy);
const vault = await viem.getContractAt("TreasuryVault", addresses.treasuryVault);
const registry = await viem.getContractAt("SignalRegistry", addresses.signalRegistry);
const controller = await viem.getContractAt("ExecutionController", addresses.executionController);

const [name, symbol, decimals, totalSupply] = await Promise.all([
  token.read.name(),
  token.read.symbol(),
  token.read.decimals(),
  token.read.totalSupply()
]);

check("token name is AstraTreasury Token", name === "AstraTreasury Token", { name });
check("token symbol is ASTP", symbol === "ASTP", { symbol });
check("token decimals is 18", Number(decimals) === 18, { decimals: Number(decimals) });

check("token supply is 1,000,000,000 ASTP", totalSupply === 1_000_000_000n * 10n ** 18n, {
  totalSupply: formatUnits(totalSupply, 18)
});

const vaultBalance = await token.read.balanceOf([addresses.treasuryVault]);

check("TreasuryVault ASTP balance is 350,000,000 ASTP", vaultBalance === 350_000_000n * 10n ** 18n, {
  vaultBalance: formatUnits(vaultBalance, 18)
});

const [vaultPolicy, controllerVault, controllerPolicy, controllerRegistry] = await Promise.all([
  vault.read.policy(),
  controller.read.vault(),
  controller.read.policy(),
  controller.read.signalRegistry()
]);

check("TreasuryVault policy points to TreasuryPolicy", sameAddress(vaultPolicy, addresses.treasuryPolicy), {
  actual: vaultPolicy,
  expected: addresses.treasuryPolicy
});

check("ExecutionController vault points to TreasuryVault", sameAddress(controllerVault, addresses.treasuryVault), {
  actual: controllerVault,
  expected: addresses.treasuryVault
});

check("ExecutionController policy points to TreasuryPolicy", sameAddress(controllerPolicy, addresses.treasuryPolicy), {
  actual: controllerPolicy,
  expected: addresses.treasuryPolicy
});

check("ExecutionController registry points to SignalRegistry", sameAddress(controllerRegistry, addresses.signalRegistry), {
  actual: controllerRegistry,
  expected: addresses.signalRegistry
});

const vaultExecutorRole = await vault.read.EXECUTOR_ROLE();
const controllerExecutorRole = await controller.read.EXECUTOR_ROLE();
const signalerRole = await registry.read.SIGNALER_ROLE();

const astpApproved = await policy.read.isApprovedAsset([addresses.astraToken]);

check("TreasuryPolicy approves ASTP", astpApproved, {
  token: addresses.astraToken
});

check(
  "Governance Safe has TreasuryPolicy admin",
  await policy.read.hasRole([DEFAULT_ADMIN_ROLE, safes.governanceSafe]),
  { governanceSafe: safes.governanceSafe }
);

check(
  "Governance Safe has TreasuryVault admin",
  await vault.read.hasRole([DEFAULT_ADMIN_ROLE, safes.governanceSafe]),
  { governanceSafe: safes.governanceSafe }
);

check(
  "Governance Safe has SignalRegistry admin",
  await registry.read.hasRole([DEFAULT_ADMIN_ROLE, safes.governanceSafe]),
  { governanceSafe: safes.governanceSafe }
);

check(
  "Governance Safe has ExecutionController admin",
  await controller.read.hasRole([DEFAULT_ADMIN_ROLE, safes.governanceSafe]),
  { governanceSafe: safes.governanceSafe }
);

check(
  "ExecutionController has TreasuryVault.EXECUTOR_ROLE",
  await vault.read.hasRole([vaultExecutorRole, addresses.executionController]),
  { executionController: addresses.executionController }
);

check(
  "Executor Safe does not directly have TreasuryVault.EXECUTOR_ROLE",
  !(await vault.read.hasRole([vaultExecutorRole, safes.executorSafe])),
  { executorSafe: safes.executorSafe }
);

check(
  "Signaler Safe has SignalRegistry.SIGNALER_ROLE",
  await registry.read.hasRole([signalerRole, safes.signalerSafe]),
  { signalerSafe: safes.signalerSafe }
);

check(
  "Executor Safe has ExecutionController.EXECUTOR_ROLE",
  await controller.read.hasRole([controllerExecutorRole, safes.executorSafe]),
  { executorSafe: safes.executorSafe }
);

check(
  "Deployer does not have TreasuryPolicy admin",
  !(await policy.read.hasRole([DEFAULT_ADMIN_ROLE, deployerAddress])),
  { deployer: deployerAddress }
);

check(
  "Deployer does not have TreasuryVault admin",
  !(await vault.read.hasRole([DEFAULT_ADMIN_ROLE, deployerAddress])),
  { deployer: deployerAddress }
);

check(
  "Deployer does not have SignalRegistry admin",
  !(await registry.read.hasRole([DEFAULT_ADMIN_ROLE, deployerAddress])),
  { deployer: deployerAddress }
);

check(
  "Deployer does not have ExecutionController admin",
  !(await controller.read.hasRole([DEFAULT_ADMIN_ROLE, deployerAddress])),
  { deployer: deployerAddress }
);

check(
  "Deployer does not have ExecutionController.EXECUTOR_ROLE",
  !(await controller.read.hasRole([controllerExecutorRole, deployerAddress])),
  { deployer: deployerAddress }
);

check(
  "Deployer does not have SignalRegistry.SIGNALER_ROLE",
  !(await registry.read.hasRole([signalerRole, deployerAddress])),
  { deployer: deployerAddress }
);

const report = {
  schema: "astra-mainnet-postdeploy-check-v1",
  checkedAt: new Date().toISOString(),
  networkName,
  chainId,
  status: failures.length === 0 ? "PASS" : "FAIL",
  safeSetupTxHash: safeSetupTxHash || null,
  addresses,
  safes,
  deployerAddress,
  summary: {
    totalChecks: checks.length,
    passed: checks.filter((item) => item.pass).length,
    failed: failures.length,
    warnings: warnings.length
  },
  checks,
  failures,
  warnings,
  safety: {
    sendsTransactions: false,
    deploysContracts: false,
    movesFunds: false,
    approvesPublicSale: false,
    fundsTreasury: false
  }
};

fs.writeFileSync(outFile, stringify(report) + "\n");

const publicDoc = [
  "# Mainnet Post-Deployment Verification v1",
  "",
  "## Status",
  "",
  `Status: ${report.status}`,
  "",
  "## Network",
  "",
  "Base Mainnet",
  "",
  "Chain ID: 8453",
  "",
  "## Verification summary",
  "",
  `Checks passed: ${report.summary.passed}/${report.summary.totalChecks}`,
  `Warnings: ${report.summary.warnings}`,
  "",
  "## Verified properties",
  "",
  "- Contract bytecode exists at deployed addresses.",
  "- ASTP token metadata and supply are correct.",
  "- TreasuryVault ASTP balance is correct.",
  "- Contract wiring is correct.",
  "- TreasuryPolicy approves ASTP.",
  "- Governance Safe owns admin roles.",
  "- ExecutionController has TreasuryVault executor role.",
  "- Signaler Safe has SignalRegistry signaler role.",
  "- Executor Safe has ExecutionController executor role.",
  "- Deployer does not retain long-term privileged roles.",
  "",
  "## Important",
  "",
  "This verification does not approve real treasury funding, public token sale, staking, buybacks, or autonomous execution."
];

fs.writeFileSync(publicDocFile, publicDoc.join("\n") + "\n");

console.log("AstraTreasury Mainnet Post-Deployment Check v1");
console.log("=============================================");
console.log(`Status: ${report.status}`);
console.log(`Checks passed: ${report.summary.passed}/${report.summary.totalChecks}`);
console.log(`Warnings: ${report.summary.warnings}`);
console.log(`Report: ${outFile}`);

if (warnings.length > 0) {
  console.log("");
  console.log("Warnings:");
  console.table(warnings);
}

if (failures.length > 0) {
  console.log("");
  console.log("Failures:");
  console.table(failures);
  process.exit(1);
}
