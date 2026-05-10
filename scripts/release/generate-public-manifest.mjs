import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, "deployments", "base-sepolia.env");
const outPath = path.join(root, "deployments", "base-sepolia.public.json");

loadEnvFile(envPath);

const required = [
  "ASTRA_TOKEN",
  "ASTRA_POLICY",
  "ASTRA_VAULT",
  "ASTRA_SIGNAL_REGISTRY",
  "ASTRA_CONTROLLER"
];

for (const key of required) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(process.env[key] || "")) {
    throw new Error(`${key} is missing or invalid in deployments/base-sepolia.env`);
  }
}

const manifest = {
  schema: "astra-deployment-manifest-v0.1",
  generatedAt: new Date().toISOString(),
  project: "AstraTreasury Protocol",
  version: "0.1.0",
  status: "public-testnet-prototype",
  network: {
    name: "Base Sepolia",
    chainId: 84532,
    explorer: "https://sepolia.basescan.org"
  },
  token: {
    name: "AstraTreasury Token",
    symbol: "ASTP",
    decimals: 18,
    supplyModel: "fixed"
  },
  contracts: {
    astraToken: process.env.ASTRA_TOKEN,
    treasuryPolicy: process.env.ASTRA_POLICY,
    treasuryVault: process.env.ASTRA_VAULT,
    signalRegistry: process.env.ASTRA_SIGNAL_REGISTRY,
    executionController: process.env.ASTRA_CONTROLLER
  },
  publicSite: {
    root: "https://astratreasury.ai",
    www: "https://www.astratreasury.ai"
  },
  safetyModel: {
    signalApprovalRequired: true,
    executionApprovalRequired: true,
    policyCheckRequired: true,
    mainnetLaunched: false,
    realFunds: false
  },
  disclaimers: [
    "Base Sepolia testnet prototype.",
    "No public token sale.",
    "No investment product.",
    "No promise of returns.",
    "Testnet ASTP has no real monetary value."
  ]
};

fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`Wrote ${outPath}`);

function loadEnvFile(filePath) {
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

    process.env[key] ||= value;
  }
}
