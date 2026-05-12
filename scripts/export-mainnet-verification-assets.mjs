import fs from "node:fs";
import path from "node:path";
import { encodeAbiParameters } from "viem";

const root = process.cwd();

const deploymentReportPath = path.join(root, "reports", "mainnet-deployment", "mainnet-deployment-v1.json");
const configPath = path.join(root, "configs", "mainnet-production.config.json");

const outDir = path.join(root, "reports", "mainnet-verification");
const argsDir = path.join(outDir, "constructor-args");
const argsNo0xDir = path.join(outDir, "constructor-args-no-0x");

const publicManifestPath = path.join(root, "deployments", "base-mainnet.public.json");
const publicDocPath = path.join(root, "docs", "mainnet-live", "BASE_MAINNET_DEPLOYMENT_MANIFEST.md");

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(argsDir, { recursive: true });
fs.mkdirSync(argsNo0xDir, { recursive: true });
fs.mkdirSync(path.dirname(publicManifestPath), { recursive: true });
fs.mkdirSync(path.dirname(publicDocPath), { recursive: true });

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

function requireAddress(value, label) {
  if (!isAddress(value)) {
    throw new Error(`${label} must be a valid address. Got: ${value}`);
  }

  return value;
}

const deployment = readJson(deploymentReportPath);
const config = readJson(configPath);

const contracts = {
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

const allocationWallets = {
  ecosystemWallet: requireAddress(config.allocationWallets.ecosystemWallet, "ecosystemWallet"),
  liquidityWallet: requireAddress(config.allocationWallets.liquidityWallet, "liquidityWallet"),
  teamWallet: requireAddress(config.allocationWallets.teamWallet, "teamWallet"),
  communityWallet: requireAddress(config.allocationWallets.communityWallet, "communityWallet"),
  advisorsWallet: requireAddress(config.allocationWallets.advisorsWallet, "advisorsWallet")
};

const deployerAddress = requireAddress(config.deployer.address, "deployer.address");

const specs = [
  {
    name: "TreasuryPolicy",
    sourceName: "contracts/TreasuryPolicy.sol:TreasuryPolicy",
    address: contracts.treasuryPolicy,
    constructorTypes: ["address"],
    constructorArgs: [safes.governanceSafe]
  },
  {
    name: "TreasuryVault",
    sourceName: "contracts/TreasuryVault.sol:TreasuryVault",
    address: contracts.treasuryVault,
    constructorTypes: ["address", "address"],
    constructorArgs: [safes.governanceSafe, contracts.treasuryPolicy]
  },
  {
    name: "SignalRegistry",
    sourceName: "contracts/SignalRegistry.sol:SignalRegistry",
    address: contracts.signalRegistry,
    constructorTypes: ["address"],
    constructorArgs: [safes.governanceSafe]
  },
  {
    name: "ExecutionController",
    sourceName: "contracts/ExecutionController.sol:ExecutionController",
    address: contracts.executionController,
    constructorTypes: ["address", "address", "address", "address"],
    constructorArgs: [
      safes.governanceSafe,
      contracts.treasuryVault,
      contracts.treasuryPolicy,
      contracts.signalRegistry
    ]
  },
  {
    name: "AstraToken",
    sourceName: "contracts/AstraToken.sol:AstraToken",
    address: contracts.astraToken,
    constructorTypes: ["address", "address", "address", "address", "address", "address"],
    constructorArgs: [
      contracts.treasuryVault,
      allocationWallets.ecosystemWallet,
      allocationWallets.liquidityWallet,
      allocationWallets.teamWallet,
      allocationWallets.communityWallet,
      allocationWallets.advisorsWallet
    ]
  }
];

for (const spec of specs) {
  const encoded = encodeAbiParameters(
    spec.constructorTypes.map((type) => ({ type })),
    spec.constructorArgs
  );

  spec.encodedConstructorArgs = encoded;
  spec.encodedConstructorArgsNo0x = encoded.slice(2);

  fs.writeFileSync(path.join(argsDir, `${spec.name}.txt`), encoded + "\n");
  fs.writeFileSync(path.join(argsNo0xDir, `${spec.name}.txt`), encoded.slice(2) + "\n");
}

const verifyScript = [
  "#!/usr/bin/env bash",
  "set -euo pipefail",
  "cd /opt/astra-treasury-protocol",
  "",
  "echo 'Building with production profile...'",
  "npx hardhat build --build-profile production",
  "",
  "echo 'Verifying TreasuryPolicy...'",
  `npx hardhat verify --network baseMainnet --build-profile production ${contracts.treasuryPolicy} ${safes.governanceSafe}`,
  "",
  "echo 'Verifying TreasuryVault...'",
  `npx hardhat verify --network baseMainnet --build-profile production ${contracts.treasuryVault} ${safes.governanceSafe} ${contracts.treasuryPolicy}`,
  "",
  "echo 'Verifying SignalRegistry...'",
  `npx hardhat verify --network baseMainnet --build-profile production ${contracts.signalRegistry} ${safes.governanceSafe}`,
  "",
  "echo 'Verifying ExecutionController...'",
  `npx hardhat verify --network baseMainnet --build-profile production ${contracts.executionController} ${safes.governanceSafe} ${contracts.treasuryVault} ${contracts.treasuryPolicy} ${contracts.signalRegistry}`,
  "",
  "echo 'Verifying AstraToken...'",
  `npx hardhat verify --network baseMainnet --build-profile production ${contracts.astraToken} ${contracts.treasuryVault} ${allocationWallets.ecosystemWallet} ${allocationWallets.liquidityWallet} ${allocationWallets.teamWallet} ${allocationWallets.communityWallet} ${allocationWallets.advisorsWallet}`,
  "",
  "echo 'Base Mainnet verification commands complete.'"
].join("\n") + "\n";

const verifyScriptPath = path.join(outDir, "base-mainnet-verify-commands.sh");
fs.writeFileSync(verifyScriptPath, verifyScript);
fs.chmodSync(verifyScriptPath, 0o755);

const manifest = {
  schema: "astra-base-mainnet-public-manifest-v0.1",
  generatedAt: new Date().toISOString(),
  project: "AstraTreasury Protocol",
  version: "0.1.1",
  status: "base-mainnet-contracts-deployed-postdeploy-verified",
  network: {
    name: "Base Mainnet",
    chainId: 8453,
    explorer: "https://basescan.org"
  },
  publicSite: {
    root: "https://astratreasury.ai",
    www: "https://www.astratreasury.ai"
  },
  safetyStatus: {
    publicTokenSale: false,
    realTreasuryFunding: false,
    stakingOrRewardsLaunch: false,
    buybackProgram: false,
    autonomousExecution: false
  },
  contracts: {
    treasuryPolicy: contracts.treasuryPolicy,
    treasuryVault: contracts.treasuryVault,
    signalRegistry: contracts.signalRegistry,
    executionController: contracts.executionController,
    astraToken: contracts.astraToken
  },
  safes,
  allocationWallets,
  deployer: {
    address: deployerAddress,
    finalRoleState: "no long-term privileged roles expected"
  },
  explorerLinks: Object.fromEntries(
    Object.entries(contracts).map(([key, address]) => [key, `https://basescan.org/address/${address}`])
  ),
  verification: {
    commandScript: "reports/mainnet-verification/base-mainnet-verify-commands.sh",
    constructorArgsDir: "reports/mainnet-verification/constructor-args-no-0x",
    buildProfile: "production"
  },
  disclaimers: [
    "Base Mainnet contracts are deployed.",
    "This does not approve public token sale.",
    "This does not approve real treasury funding.",
    "This does not approve staking, rewards, buybacks, or autonomous execution."
  ]
};

fs.writeFileSync(publicManifestPath, JSON.stringify(manifest, null, 2) + "\n");

const doc = [
  "# Base Mainnet Deployment Manifest",
  "",
  "## Status",
  "",
  "Base Mainnet contracts deployed and post-deployment verification prepared.",
  "",
  "## Important",
  "",
  "This does not approve a public token sale, real treasury funding, staking, rewards, buybacks, or autonomous execution.",
  "",
  "## Network",
  "",
  "Base Mainnet",
  "",
  "Chain ID: 8453",
  "",
  "## Contracts",
  "",
  "| Contract | Address | BaseScan |",
  "|---|---|---|",
  ...Object.entries(contracts).map(([name, address]) => {
    return `| ${name} | \`${address}\` | https://basescan.org/address/${address} |`;
  }),
  "",
  "## Safes",
  "",
  "| Safe | Address |",
  "|---|---|",
  ...Object.entries(safes).map(([name, address]) => {
    return `| ${name} | \`${address}\` |`;
  }),
  "",
  "## Safety status",
  "",
  "- Public token sale: no",
  "- Real treasury funding: no",
  "- Staking/rewards launch: no",
  "- Buyback program: no",
  "- Autonomous execution: no",
  "",
  "## Verification",
  "",
  "Run:",
  "",
  "```bash",
  "bash reports/mainnet-verification/base-mainnet-verify-commands.sh",
  "```"
];

fs.writeFileSync(publicDocPath, doc.join("\n") + "\n");

console.log("Mainnet verification assets generated.");
console.log(`Verify script: ${verifyScriptPath}`);
console.log(`Public manifest: ${publicManifestPath}`);
console.log(`Public doc: ${publicDocPath}`);
console.log("");
console.table(specs.map((spec) => ({
  contract: spec.name,
  address: spec.address,
  constructorArgs: spec.constructorArgs.join(", ")
})));
