import fs from "node:fs";
import path from "node:path";
import { encodeAbiParameters } from "viem";
import solc from "solc";

const projectRoot = process.cwd();
const outDir = path.join(projectRoot, "reports", "verification");
const constructorDir = path.join(outDir, "constructor-args");
const constructorNo0xDir = path.join(outDir, "constructor-args-no-0x");

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(constructorDir, { recursive: true });
fs.mkdirSync(constructorNo0xDir, { recursive: true });

loadEnvFile(path.join(projectRoot, "deployments", "base-sepolia.env"));

const required = [
  "ASTRA_TOKEN",
  "ASTRA_POLICY",
  "ASTRA_VAULT",
  "ASTRA_SIGNAL_REGISTRY",
  "ASTRA_CONTROLLER",
  "ASTRA_ADMIN",
  "ASTRA_ECOSYSTEM_WALLET",
  "ASTRA_LIQUIDITY_WALLET",
  "ASTRA_TEAM_WALLET",
  "ASTRA_COMMUNITY_WALLET",
  "ASTRA_ADVISORS_WALLET"
];

for (const name of required) {
  if (!isAddress(process.env[name])) {
    throw new Error(`${name} is missing or invalid in deployments/base-sepolia.env`);
  }
}

const addresses = Object.fromEntries(required.map((name) => [name, process.env[name]]));

const contracts = [
  {
    name: "TreasuryPolicy",
    sourceName: "contracts/TreasuryPolicy.sol:TreasuryPolicy",
    address: addresses.ASTRA_POLICY,
    constructorTypes: ["address"],
    constructorArgs: [addresses.ASTRA_ADMIN]
  },
  {
    name: "TreasuryVault",
    sourceName: "contracts/TreasuryVault.sol:TreasuryVault",
    address: addresses.ASTRA_VAULT,
    constructorTypes: ["address", "address"],
    constructorArgs: [addresses.ASTRA_ADMIN, addresses.ASTRA_POLICY]
  },
  {
    name: "SignalRegistry",
    sourceName: "contracts/SignalRegistry.sol:SignalRegistry",
    address: addresses.ASTRA_SIGNAL_REGISTRY,
    constructorTypes: ["address"],
    constructorArgs: [addresses.ASTRA_ADMIN]
  },
  {
    name: "ExecutionController",
    sourceName: "contracts/ExecutionController.sol:ExecutionController",
    address: addresses.ASTRA_CONTROLLER,
    constructorTypes: ["address", "address", "address", "address"],
    constructorArgs: [
      addresses.ASTRA_ADMIN,
      addresses.ASTRA_VAULT,
      addresses.ASTRA_POLICY,
      addresses.ASTRA_SIGNAL_REGISTRY
    ]
  },
  {
    name: "AstraToken",
    sourceName: "contracts/AstraToken.sol:AstraToken",
    address: addresses.ASTRA_TOKEN,
    constructorTypes: ["address", "address", "address", "address", "address", "address"],
    constructorArgs: [
      addresses.ASTRA_VAULT,
      addresses.ASTRA_ECOSYSTEM_WALLET,
      addresses.ASTRA_LIQUIDITY_WALLET,
      addresses.ASTRA_TEAM_WALLET,
      addresses.ASTRA_COMMUNITY_WALLET,
      addresses.ASTRA_ADVISORS_WALLET
    ]
  }
];

for (const spec of contracts) {
  const encoded = encodeAbiParameters(
    spec.constructorTypes.map((type) => ({ type })),
    spec.constructorArgs
  );

  spec.encodedConstructorArgs = encoded;
  spec.encodedConstructorArgsNo0x = encoded.slice(2);

  fs.writeFileSync(
    path.join(constructorDir, `${spec.name}.txt`),
    encoded + "\n"
  );

  fs.writeFileSync(
    path.join(constructorNo0xDir, `${spec.name}.txt`),
    encoded.slice(2) + "\n"
  );
}

const standardJsonInput = buildStandardJsonInput();

fs.writeFileSync(
  path.join(outDir, "standard-json-input.json"),
  JSON.stringify(standardJsonInput, null, 2) + "\n"
);

const compilerVersion = solc.version();

fs.writeFileSync(path.join(outDir, "compiler-version.txt"), compilerVersion + "\n");

const contractSummary = {
  generatedAt: new Date().toISOString(),
  network: "Base Sepolia",
  chainId: 84532,
  compilerVersion,
  evmVersion: "cancun",
  optimizer: {
    enabled: true,
    runs: 200
  },
  addresses,
  contracts
};

fs.writeFileSync(
  path.join(outDir, "base-sepolia-contracts.json"),
  JSON.stringify(contractSummary, null, 2) + "\n"
);

const verifyLines = [
  "#!/usr/bin/env bash",
  "set -euo pipefail",
  "cd \"$(dirname \"$0\")/../..\"",
  "",
  "source deployments/base-sepolia.env",
  "",
  "echo 'Building with production profile...'",
  "npx hardhat build --build-profile production",
  "",
  "echo 'Verifying TreasuryPolicy...'",
  'npx hardhat verify --network baseSepolia "$ASTRA_POLICY" "$ASTRA_ADMIN"',
  "",
  "echo 'Verifying TreasuryVault...'",
  'npx hardhat verify --network baseSepolia "$ASTRA_VAULT" "$ASTRA_ADMIN" "$ASTRA_POLICY"',
  "",
  "echo 'Verifying SignalRegistry...'",
  'npx hardhat verify --network baseSepolia "$ASTRA_SIGNAL_REGISTRY" "$ASTRA_ADMIN"',
  "",
  "echo 'Verifying ExecutionController...'",
  'npx hardhat verify --network baseSepolia "$ASTRA_CONTROLLER" "$ASTRA_ADMIN" "$ASTRA_VAULT" "$ASTRA_POLICY" "$ASTRA_SIGNAL_REGISTRY"',
  "",
  "echo 'Verifying AstraToken...'",
  'npx hardhat verify --network baseSepolia "$ASTRA_TOKEN" "$ASTRA_VAULT" "$ASTRA_ECOSYSTEM_WALLET" "$ASTRA_LIQUIDITY_WALLET" "$ASTRA_TEAM_WALLET" "$ASTRA_COMMUNITY_WALLET" "$ASTRA_ADVISORS_WALLET"',
  "",
  "echo 'Verification commands complete.'"
];

const verifyScript = path.join(outDir, "base-sepolia-verify-commands.sh");
fs.writeFileSync(verifyScript, verifyLines.join("\n") + "\n");
fs.chmodSync(verifyScript, 0o755);

const manualMd = [
  "# Manual BaseScan Verification Package",
  "",
  "Use this if Hardhat API verification fails or you do not have a supported API key.",
  "",
  "Base Sepolia explorer:",
  "",
  "```text",
  "https://sepolia.basescan.org/verifyContract",
  "```",
  "",
  "Compiler type:",
  "",
  "```text",
  "Solidity (Standard-Json-Input)",
  "```",
  "",
  "Compiler version:",
  "",
  "```text",
  `v${compilerVersion}`,
  "```",
  "",
  "Standard JSON input file:",
  "",
  "```text",
  "reports/verification/standard-json-input.json",
  "```",
  "",
  "Constructor args are in:",
  "",
  "```text",
  "reports/verification/constructor-args-no-0x/",
  "```",
  "",
  "Contracts:",
  "",
  ...contracts.flatMap((c) => [
    `## ${c.name}`,
    "",
    `Address: \`${c.address}\``,
    "",
    `Contract: \`${c.sourceName}\``,
    "",
    `Constructor args file: \`reports/verification/constructor-args-no-0x/${c.name}.txt\``,
    "",
    `BaseScan: https://sepolia.basescan.org/address/${c.address}`,
    ""
  ])
];

fs.writeFileSync(path.join(outDir, "manual-basescan-verification.md"), manualMd.join("\n"));

console.log("Verification assets generated:");
console.log(`- ${path.join(outDir, "standard-json-input.json")}`);
console.log(`- ${path.join(outDir, "base-sepolia-contracts.json")}`);
console.log(`- ${path.join(outDir, "base-sepolia-verify-commands.sh")}`);
console.log(`- ${path.join(outDir, "manual-basescan-verification.md")}`);

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

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

function buildStandardJsonInput() {
  const entryFiles = [
    "contracts/AstraToken.sol",
    "contracts/TreasuryPolicy.sol",
    "contracts/SignalRegistry.sol",
    "contracts/TreasuryVault.sol",
    "contracts/ExecutionController.sol"
  ];

  const sources = {};
  const visited = new Set();

  for (const entry of entryFiles) {
    collectSource(entry, path.join(projectRoot, entry));
  }

  return {
    language: "Solidity",
    sources,
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      evmVersion: "cancun",
      outputSelection: {
        "*": {
          "*": [
            "abi",
            "evm.bytecode",
            "evm.deployedBytecode",
            "evm.methodIdentifiers",
            "metadata"
          ]
        }
      }
    }
  };

  function collectSource(sourceKey, absolutePath) {
    const normalizedKey = sourceKey.replaceAll("\\", "/");

    if (visited.has(normalizedKey)) return;
    visited.add(normalizedKey);

    const content = fs.readFileSync(absolutePath, "utf8");
    sources[normalizedKey] = { content };

    const importRegex = /import\s+(?:[^"']+from\s+)?["']([^"']+)["'];/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      const resolved = resolveImport(importPath, absolutePath);

      collectSource(resolved.sourceKey, resolved.absolutePath);
    }
  }

  function resolveImport(importPath, currentAbsolutePath) {
    if (importPath.startsWith("@")) {
      return {
        sourceKey: importPath,
        absolutePath: path.join(projectRoot, "node_modules", importPath)
      };
    }

    const absolutePath = path.resolve(path.dirname(currentAbsolutePath), importPath);

    return {
      sourceKey: path.relative(projectRoot, absolutePath).replaceAll("\\", "/"),
      absolutePath
    };
  }
}
