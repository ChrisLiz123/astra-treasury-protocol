import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const configPath = path.join(root, "configs", "mainnet-production.config.json");
const outDir = path.join(root, "reports", "mainnet-commands");
const commandDir = path.join(outDir, "commands");
const manifestFile = path.join(outDir, "mainnet-command-manifest-v1.json");
const publicDocFile = path.join(root, "docs", "mainnet-live", "MAINNET_DEPLOYMENT_COMMANDS_V1.md");

fs.mkdirSync(commandDir, { recursive: true });
fs.mkdirSync(path.dirname(publicDocFile), { recursive: true });

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

function sha256(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function writeExecutable(filePath, content) {
  fs.writeFileSync(filePath, content);
  fs.chmodSync(filePath, 0o755);
}

if (!fs.existsSync(configPath)) {
  console.error(`Missing private config: ${configPath}`);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const issues = [];

function issue(path, message) {
  issues.push({ path, message });
}

if (config.network?.chainId !== 8453) {
  issue("network.chainId", "Expected Base Mainnet chainId 8453.");
}

if (!config.rpc?.primaryProvider || config.rpc.primaryProvider === "TBD") {
  issue("rpc.primaryProvider", "Primary RPC provider missing.");
}

if (!config.rpc?.backupProvider || config.rpc.backupProvider === "TBD") {
  issue("rpc.backupProvider", "Backup RPC provider missing.");
}

for (const [key, value] of Object.entries(config.safes || {})) {
  if (!isAddress(value)) issue(`safes.${key}`, "Must be a valid address.");
}

for (const [key, value] of Object.entries(config.allocationWallets || {})) {
  if (!isAddress(value)) issue(`allocationWallets.${key}`, "Must be a valid address.");
}

if (!isAddress(config.deployer?.address)) {
  issue("deployer.address", "Must be a valid deployer address.");
}

if (config.controls?.auditCleared !== true) {
  issue("controls.auditCleared", "Audit must be cleared.");
}

if (config.controls?.legalCleared !== true) {
  issue("controls.legalCleared", "Legal must be cleared.");
}

if (config.controls?.publicSaleApproved === true) {
  issue("controls.publicSaleApproved", "Public sale must not be bundled with deployment.");
}

if (config.controls?.realTreasuryFundingApproved === true) {
  issue("controls.realTreasuryFundingApproved", "Real treasury funding must not be bundled with deployment.");
}

const finalApproval = config.controls?.mainnetDeploymentApproved === true;

const constructorPlan = {
  TreasuryPolicy: {
    args: [config.safes.governanceSafe]
  },
  TreasuryVault: {
    args: [config.safes.governanceSafe, "TREASURY_POLICY_ADDRESS"]
  },
  SignalRegistry: {
    args: [config.safes.governanceSafe]
  },
  ExecutionController: {
    args: [
      config.safes.governanceSafe,
      "TREASURY_VAULT_ADDRESS",
      "TREASURY_POLICY_ADDRESS",
      "SIGNAL_REGISTRY_ADDRESS"
    ]
  },
  AstraToken: {
    args: [
      "TREASURY_VAULT_ADDRESS",
      config.allocationWallets.ecosystemWallet,
      config.allocationWallets.liquidityWallet,
      config.allocationWallets.teamWallet,
      config.allocationWallets.communityWallet,
      config.allocationWallets.advisorsWallet
    ]
  }
};

const commands = {
  keystoreSetup: [
    "cd /opt/astra-treasury-protocol",
    "npx hardhat keystore set BASE_MAINNET_RPC_URL",
    "npx hardhat keystore set BASE_MAINNET_BACKUP_RPC_URL",
    "npx hardhat keystore set BASE_MAINNET_DEPLOYER_PRIVATE_KEY",
    "npx hardhat keystore set ETHERSCAN_API_KEY"
  ],
  preflight: [
    "cd /opt/astra-treasury-protocol",
    "npm run mainnet:config:validate",
    "npm run mainnet:dry-run:v1",
    "npm run audit:full",
    "npm run governance:gate:full",
    "npm run ops:status",
    "npm run domain:check"
  ],
  deployGuarded: [
    "cd /opt/astra-treasury-protocol",
    "ASTRA_MAINNET_DEPLOYMENT_APPROVED=YES npm run deploy:base-mainnet:guarded"
  ],
  verifyTemplate: [
    "cd /opt/astra-treasury-protocol",
    "npx hardhat build --build-profile production",
    "npx hardhat verify --network baseMainnet --build-profile production TREASURY_POLICY_ADDRESS GOVERNANCE_SAFE",
    "npx hardhat verify --network baseMainnet --build-profile production TREASURY_VAULT_ADDRESS GOVERNANCE_SAFE TREASURY_POLICY_ADDRESS",
    "npx hardhat verify --network baseMainnet --build-profile production SIGNAL_REGISTRY_ADDRESS GOVERNANCE_SAFE",
    "npx hardhat verify --network baseMainnet --build-profile production EXECUTION_CONTROLLER_ADDRESS GOVERNANCE_SAFE TREASURY_VAULT_ADDRESS TREASURY_POLICY_ADDRESS SIGNAL_REGISTRY_ADDRESS",
    "npx hardhat verify --network baseMainnet --build-profile production ASTRA_TOKEN_ADDRESS TREASURY_VAULT_ADDRESS ECOSYSTEM_WALLET LIQUIDITY_WALLET TEAM_WALLET COMMUNITY_WALLET ADVISORS_WALLET"
  ],
  postDeploymentChecks: [
    "cd /opt/astra-treasury-protocol",
    "npm run mainnet:postdeploy:check",
    "npm run release:manifest",
    "npm run docs:public",
    "npm run docs:packages-public",
    "npm run docs:transparency-public"
  ]
};

writeExecutable(
  path.join(commandDir, "00-keystore-setup-template.sh"),
  `#!/usr/bin/env bash
set -euo pipefail

echo "This is a template. It stores secrets in Hardhat keystore."
echo "Do not paste secrets into GitHub or config JSON."

${commands.keystoreSetup.join("\n")}
`
);

writeExecutable(
  path.join(commandDir, "01-preflight-template.sh"),
  `#!/usr/bin/env bash
set -euo pipefail

echo "Mainnet preflight template. Does not deploy."

${commands.preflight.join("\n")}
`
);

writeExecutable(
  path.join(commandDir, "02-deploy-guarded-template.sh"),
  `#!/usr/bin/env bash
set -euo pipefail

echo "Guarded deployment template."
echo "This will only work if mainnetDeploymentApproved=true and ASTRA_MAINNET_DEPLOYMENT_APPROVED=YES."
echo "Review everything before running."

${commands.deployGuarded.join("\n")}
`
);

writeExecutable(
  path.join(commandDir, "03-verify-template.sh"),
  `#!/usr/bin/env bash
set -euo pipefail

echo "Verification template. Replace placeholder addresses after deployment."

${commands.verifyTemplate.join("\n")}
`
);

writeExecutable(
  path.join(commandDir, "04-post-deployment-checks-template.sh"),
  `#!/usr/bin/env bash
set -euo pipefail

echo "Post-deployment checks template. Run only after confirmed deployment."

${commands.postDeploymentChecks.join("\n")}
`
);

const manifest = {
  schema: "astra-mainnet-deployment-command-manifest-v1",
  generatedAt: new Date().toISOString(),
  status: issues.length === 0 ? "READY_FOR_COMMAND_REVIEW" : "BLOCKED_BY_CONFIG_ISSUES",
  finalDeploymentApproval: finalApproval ? "APPROVED" : "PENDING_FINAL_GO_NO_GO",
  warning: "Generated commands only. This manifest does not authorize deployment.",
  network: config.network,
  rpc: {
    primaryProvider: config.rpc.primaryProvider,
    primaryRpcConfigVariable: config.rpc.primaryRpcConfigVariable,
    backupProvider: config.rpc.backupProvider,
    backupRpcConfigVariable: config.rpc.backupRpcConfigVariable
  },
  safes: config.safes,
  allocationWallets: config.allocationWallets,
  deployer: config.deployer,
  configFingerprint: sha256({
    network: config.network,
    rpc: config.rpc,
    safes: config.safes,
    allocationWallets: config.allocationWallets,
    deployer: config.deployer,
    controls: config.controls
  }),
  constructorPlan,
  commands,
  generatedFiles: [
    "reports/mainnet-commands/commands/00-keystore-setup-template.sh",
    "reports/mainnet-commands/commands/01-preflight-template.sh",
    "reports/mainnet-commands/commands/02-deploy-guarded-template.sh",
    "reports/mainnet-commands/commands/03-verify-template.sh",
    "reports/mainnet-commands/commands/04-post-deployment-checks-template.sh"
  ],
  issues
};

fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");

const doc = [
  "# Mainnet Deployment Commands v1",
  "",
  "## Status",
  "",
  `Command generation status: ${manifest.status}`,
  `Final deployment approval: ${manifest.finalDeploymentApproval}`,
  "",
  "## Important",
  "",
  "These are generated command templates only. They do not authorize deployment.",
  "",
  "## Network",
  "",
  "Base Mainnet",
  "",
  "Chain ID: 8453",
  "",
  "## Command files generated",
  "",
  ...manifest.generatedFiles.map((file) => `- ${file}`),
  "",
  "## Required command order",
  "",
  "1. Review private mainnet config.",
  "2. Run preflight template.",
  "3. Only after final go/no-go, set mainnetDeploymentApproved=true in the private config.",
  "4. Only after final go/no-go, run guarded deployment command.",
  "5. Verify contracts.",
  "6. Execute Safe-admin setup transactions.",
  "7. Run post-deployment checks.",
  "",
  "## Rule",
  "",
  "Do not run the guarded deployment command until the final explicit go/no-go."
];

fs.writeFileSync(publicDocFile, doc.join("\n") + "\n");

console.log("Mainnet Deployment Command Generation v1");
console.log("========================================");
console.log(`Status: ${manifest.status}`);
console.log(`Final approval: ${manifest.finalDeploymentApproval}`);
console.log(`Private manifest: ${manifestFile}`);
console.log(`Public doc: ${publicDocFile}`);
console.log(`Command directory: ${commandDir}`);

if (issues.length > 0) {
  console.log("");
  console.log("Config issues:");
  console.table(issues);
  process.exit(1);
}
