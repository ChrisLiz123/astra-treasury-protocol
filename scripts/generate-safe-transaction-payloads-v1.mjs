import fs from "node:fs";
import path from "node:path";
import {
  encodeFunctionData,
  keccak256,
  parseAbi,
  toBytes
} from "viem";

const root = process.cwd();

const configPath = path.join(root, "configs", "mainnet-production.config.json");
const deploymentReportPath = path.join(root, "reports", "mainnet-deployment", "mainnet-deployment-v1.json");
const outDir = path.join(root, "reports", "mainnet-safe-payloads");
const payloadFile = path.join(outDir, "governance-safe-postdeploy-role-setup.json");
const manifestFile = path.join(outDir, "safe-payload-manifest-v1.json");
const publicDocFile = path.join(root, "docs", "mainnet-live", "SAFE_TRANSACTION_PAYLOADS_V1.md");

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.dirname(publicDocFile), { recursive: true });

const requireDeployment = process.env.SAFE_PAYLOADS_REQUIRE_DEPLOYMENT === "true";

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

function roleHash(roleName) {
  return keccak256(toBytes(roleName));
}

function txBuilderMethod(name, inputs) {
  return {
    name,
    payable: false,
    inputs
  };
}

function makeTx({ to, data, method, values, note }) {
  return {
    to,
    value: "0",
    data,
    contractMethod: method,
    contractInputsValues: values,
    meta: {
      note
    }
  };
}

const config = readJson(configPath);

if (!config) {
  console.error(`Missing config: ${configPath}`);
  process.exit(1);
}

const deploymentReport = readJson(deploymentReportPath);
const hasDeploymentReport = Boolean(deploymentReport?.contracts);

if (requireDeployment && !hasDeploymentReport) {
  console.error(`Missing deployment report required for real payload generation: ${deploymentReportPath}`);
  process.exit(1);
}

const governanceSafe = config.safes?.governanceSafe;
const signalerSafe = config.safes?.signalerSafe;
const executorSafe = config.safes?.executorSafe;

const issues = [];

if (!isAddress(governanceSafe)) issues.push({ path: "safes.governanceSafe", message: "Invalid Governance Safe address." });
if (!isAddress(signalerSafe)) issues.push({ path: "safes.signalerSafe", message: "Invalid Signaler Safe address." });
if (!isAddress(executorSafe)) issues.push({ path: "safes.executorSafe", message: "Invalid Executor Safe address." });

let mode = "TEMPLATE_PENDING_DEPLOYMENT_REPORT";

let addresses = {
  treasuryPolicy: "TREASURY_POLICY_ADDRESS",
  treasuryVault: "TREASURY_VAULT_ADDRESS",
  signalRegistry: "SIGNAL_REGISTRY_ADDRESS",
  executionController: "EXECUTION_CONTROLLER_ADDRESS",
  astraToken: "ASTRA_TOKEN_ADDRESS"
};

if (hasDeploymentReport) {
  mode = "READY_FOR_SAFE_TRANSACTION_BUILDER_IMPORT";

  addresses = {
    treasuryPolicy: deploymentReport.contracts.treasuryPolicy,
    treasuryVault: deploymentReport.contracts.treasuryVault,
    signalRegistry: deploymentReport.contracts.signalRegistry,
    executionController: deploymentReport.contracts.executionController,
    astraToken: deploymentReport.contracts.astraToken
  };

  for (const [key, value] of Object.entries(addresses)) {
    if (!isAddress(value)) {
      issues.push({ path: `deployment.contracts.${key}`, message: "Invalid deployed contract address." });
    }
  }
}

if (issues.length > 0) {
  console.log(JSON.stringify({ status: "BLOCKED", issues }, null, 2));
  process.exit(1);
}

const EXECUTOR_ROLE = roleHash("EXECUTOR_ROLE");
const SIGNALER_ROLE = roleHash("SIGNALER_ROLE");

const policyAbi = parseAbi([
  "function setAssetPolicy(address asset, bool approved, bool isNativeAsset)"
]);

const accessControlAbi = parseAbi([
  "function grantRole(bytes32 role, address account)"
]);

let transactions = [];

if (hasDeploymentReport) {
  transactions = [
    makeTx({
      to: addresses.treasuryPolicy,
      data: encodeFunctionData({
        abi: policyAbi,
        functionName: "setAssetPolicy",
        args: [addresses.astraToken, true, false]
      }),
      method: txBuilderMethod("setAssetPolicy", [
        { name: "asset", type: "address", internalType: "address" },
        { name: "approved", type: "bool", internalType: "bool" },
        { name: "isNativeAsset", type: "bool", internalType: "bool" }
      ]),
      values: {
        asset: addresses.astraToken,
        approved: "true",
        isNativeAsset: "false"
      },
      note: "Approve ASTP as a TreasuryPolicy asset."
    }),
    makeTx({
      to: addresses.treasuryVault,
      data: encodeFunctionData({
        abi: accessControlAbi,
        functionName: "grantRole",
        args: [EXECUTOR_ROLE, addresses.executionController]
      }),
      method: txBuilderMethod("grantRole", [
        { name: "role", type: "bytes32", internalType: "bytes32" },
        { name: "account", type: "address", internalType: "address" }
      ]),
      values: {
        role: EXECUTOR_ROLE,
        account: addresses.executionController
      },
      note: "Grant TreasuryVault.EXECUTOR_ROLE to ExecutionController only."
    }),
    makeTx({
      to: addresses.signalRegistry,
      data: encodeFunctionData({
        abi: accessControlAbi,
        functionName: "grantRole",
        args: [SIGNALER_ROLE, signalerSafe]
      }),
      method: txBuilderMethod("grantRole", [
        { name: "role", type: "bytes32", internalType: "bytes32" },
        { name: "account", type: "address", internalType: "address" }
      ]),
      values: {
        role: SIGNALER_ROLE,
        account: signalerSafe
      },
      note: "Grant SignalRegistry.SIGNALER_ROLE to Signaler Safe."
    }),
    makeTx({
      to: addresses.executionController,
      data: encodeFunctionData({
        abi: accessControlAbi,
        functionName: "grantRole",
        args: [EXECUTOR_ROLE, executorSafe]
      }),
      method: txBuilderMethod("grantRole", [
        { name: "role", type: "bytes32", internalType: "bytes32" },
        { name: "account", type: "address", internalType: "address" }
      ]),
      values: {
        role: EXECUTOR_ROLE,
        account: executorSafe
      },
      note: "Grant ExecutionController.EXECUTOR_ROLE to Executor Safe."
    })
  ];
} else {
  transactions = [
    {
      to: "TREASURY_POLICY_ADDRESS",
      value: "0",
      data: "GENERATED_AFTER_MAINNET_DEPLOYMENT",
      contractMethod: txBuilderMethod("setAssetPolicy", [
        { name: "asset", type: "address", internalType: "address" },
        { name: "approved", type: "bool", internalType: "bool" },
        { name: "isNativeAsset", type: "bool", internalType: "bool" }
      ]),
      contractInputsValues: {
        asset: "ASTRA_TOKEN_ADDRESS",
        approved: "true",
        isNativeAsset: "false"
      },
      meta: {
        note: "Template only. Regenerate after deployment."
      }
    },
    {
      to: "TREASURY_VAULT_ADDRESS",
      value: "0",
      data: "GENERATED_AFTER_MAINNET_DEPLOYMENT",
      contractMethod: txBuilderMethod("grantRole", [
        { name: "role", type: "bytes32", internalType: "bytes32" },
        { name: "account", type: "address", internalType: "address" }
      ]),
      contractInputsValues: {
        role: EXECUTOR_ROLE,
        account: "EXECUTION_CONTROLLER_ADDRESS"
      },
      meta: {
        note: "Template only. Regenerate after deployment."
      }
    },
    {
      to: "SIGNAL_REGISTRY_ADDRESS",
      value: "0",
      data: "GENERATED_AFTER_MAINNET_DEPLOYMENT",
      contractMethod: txBuilderMethod("grantRole", [
        { name: "role", type: "bytes32", internalType: "bytes32" },
        { name: "account", type: "address", internalType: "address" }
      ]),
      contractInputsValues: {
        role: SIGNALER_ROLE,
        account: signalerSafe
      },
      meta: {
        note: "Template only. Regenerate after deployment."
      }
    },
    {
      to: "EXECUTION_CONTROLLER_ADDRESS",
      value: "0",
      data: "GENERATED_AFTER_MAINNET_DEPLOYMENT",
      contractMethod: txBuilderMethod("grantRole", [
        { name: "role", type: "bytes32", internalType: "bytes32" },
        { name: "account", type: "address", internalType: "address" }
      ]),
      contractInputsValues: {
        role: EXECUTOR_ROLE,
        account: executorSafe
      },
      meta: {
        note: "Template only. Regenerate after deployment."
      }
    }
  ];
}

const payload = {
  version: "1.0",
  chainId: "8453",
  createdAt: Date.now(),
  meta: {
    name: "AstraTreasury Mainnet Post-Deployment Governance Setup",
    description:
      hasDeploymentReport
        ? "Governance Safe post-deployment setup transactions for AstraTreasury on Base Mainnet."
        : "Template only. Regenerate after mainnet deployment report exists.",
    txBuilderVersion: "1.0.0",
    createdFromSafeAddress: governanceSafe,
    createdFromOwnerAddress: governanceSafe,
    checksum: "0x"
  },
  transactions
};

const manifest = {
  schema: "astra-safe-transaction-payload-manifest-v1",
  generatedAt: new Date().toISOString(),
  mode,
  chainId: 8453,
  governanceSafe,
  signalerSafe,
  executorSafe,
  roleHashes: {
    EXECUTOR_ROLE,
    SIGNALER_ROLE
  },
  deploymentReportPath,
  hasDeploymentReport,
  payloadFile,
  transactionCount: transactions.length,
  warnings: [
    "Do not import template payloads into Safe.",
    "Only import payloads with mode READY_FOR_SAFE_TRANSACTION_BUILDER_IMPORT.",
    "Review every transaction in Safe before signing.",
    "This payload does not fund treasury and does not authorize a public sale."
  ]
};

fs.writeFileSync(payloadFile, JSON.stringify(payload, null, 2) + "\n");
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");

const publicDoc = [
  "# Safe Transaction Payloads v1",
  "",
  "## Status",
  "",
  `Mode: ${mode}`,
  "",
  "## Purpose",
  "",
  "Generate Governance Safe Transaction Builder payloads for AstraTreasury post-deployment setup.",
  "",
  "## Transactions",
  "",
  "1. TreasuryPolicy.setAssetPolicy(ASTRA_TOKEN, true, false)",
  "2. TreasuryVault.grantRole(EXECUTOR_ROLE, ExecutionController)",
  "3. SignalRegistry.grantRole(SIGNALER_ROLE, Signaler Safe)",
  "4. ExecutionController.grantRole(EXECUTOR_ROLE, Executor Safe)",
  "",
  "## Current rule",
  "",
  hasDeploymentReport
    ? "Payload is generated from a mainnet deployment report. Review before importing into Safe."
    : "Template only. Do not import into Safe until mainnet deployment report exists and payload is regenerated.",
  "",
  "## Generated files",
  "",
  "- reports/mainnet-safe-payloads/governance-safe-postdeploy-role-setup.json",
  "- reports/mainnet-safe-payloads/safe-payload-manifest-v1.json",
  "",
  "## Safety",
  "",
  "- No transaction is submitted by this generator.",
  "- No Safe transaction is signed by this generator.",
  "- No funds are moved by this generator.",
  "- Review every transaction manually inside Safe before signing."
];

fs.writeFileSync(path.join(root, "docs", "mainnet-live", "SAFE_TRANSACTION_PAYLOADS_V1.md"), publicDoc.join("\n") + "\n");

console.log("Safe Transaction Payload Generation v1");
console.log("======================================");
console.log(`Mode: ${mode}`);
console.log(`Payload: ${payloadFile}`);
console.log(`Manifest: ${manifestFile}`);
console.log(`Transactions: ${transactions.length}`);

if (requireDeployment && mode !== "READY_FOR_SAFE_TRANSACTION_BUILDER_IMPORT") {
  process.exit(1);
}
