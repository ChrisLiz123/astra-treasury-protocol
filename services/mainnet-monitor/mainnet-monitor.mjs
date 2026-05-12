import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  formatUnits,
  getAddress,
  http,
  parseAbi
} from "viem";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const runtimeEnvFile = path.join(root, ".runtime", "mainnet-monitor.env");
const manifestFile = path.join(root, "deployments", "base-mainnet.public.json");
const restrictedConfigFile = path.join(root, "configs", "restricted-operations.config.json");

const reportsDir = path.join(root, "reports", "mainnet-monitor");
const latestReportFile = path.join(reportsDir, "latest-mainnet-monitor.json");
const heartbeatFile = path.join(reportsDir, "heartbeat.json");

const publicJsonFile = path.join(root, "public-docs", "mainnet-monitor-status.json");
const publicHtmlFile = path.join(root, "public-docs", "monitor.html");

const once = process.argv.includes("--once");

loadEnvFile(runtimeEnvFile);

const intervalSeconds = Number(
  process.env.MAINNET_MONITOR_INTERVAL_SECONDS || "300"
);

const rpcUrl =
  process.env.MAINNET_MONITOR_RPC_URL ||
  process.env.BASE_MAINNET_RPC_URL ||
  "";

fs.mkdirSync(reportsDir, { recursive: true });
fs.mkdirSync(path.dirname(publicJsonFile), { recursive: true });

if (!rpcUrl) {
  console.error("Missing MAINNET_MONITOR_RPC_URL. Add it to .runtime/mainnet-monitor.env");
  process.exit(1);
}

const tokenAbi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)"
]);

const policyAbi = parseAbi([
  "function isApprovedAsset(address asset) view returns (bool)",
  "function hasRole(bytes32 role, address account) view returns (bool)"
]);

const vaultAbi = parseAbi([
  "function policy() view returns (address)",
  "function EXECUTOR_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)"
]);

const registryAbi = parseAbi([
  "function SIGNALER_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)"
]);

const controllerAbi = parseAbi([
  "function vault() view returns (address)",
  "function policy() view returns (address)",
  "function signalRegistry() view returns (address)",
  "function EXECUTOR_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)"
]);

const DEFAULT_ADMIN_ROLE = `0x${"00".repeat(32)}`;

function now() {
  return new Date().toISOString();
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
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

function readJson(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return { error: error.message };
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, bigintJson, 2) + "\n");
}

function bigintJson(_key, value) {
  return typeof value === "bigint" ? value.toString() : value;
}

function sameAddress(a, b) {
  return String(a).toLowerCase() === String(b).toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  }[ch]));
}

function getAddressOrNull(value) {
  try {
    return getAddress(value);
  } catch {
    return null;
  }
}

function check(checks, name, pass, details = {}) {
  checks.push({ name, pass: Boolean(pass), details });
}

async function readContract(client, address, abi, functionName, args = []) {
  return client.readContract({
    address,
    abi,
    functionName,
    args
  });
}

async function runMonitorOnce() {
  const manifest = readJson(manifestFile);
  const restrictedConfig = readJson(restrictedConfigFile);

  if (!manifest?.contracts) {
    throw new Error("Missing or invalid deployments/base-mainnet.public.json");
  }

  const contracts = {
    treasuryPolicy: getAddressOrNull(manifest.contracts.treasuryPolicy),
    treasuryVault: getAddressOrNull(manifest.contracts.treasuryVault),
    signalRegistry: getAddressOrNull(manifest.contracts.signalRegistry),
    executionController: getAddressOrNull(manifest.contracts.executionController),
    astraToken: getAddressOrNull(manifest.contracts.astraToken)
  };

  const safes = {
    governanceSafe: getAddressOrNull(manifest.safes?.governanceSafe),
    treasurySafe: getAddressOrNull(manifest.safes?.treasurySafe),
    executorSafe: getAddressOrNull(manifest.safes?.executorSafe),
    signalerSafe: getAddressOrNull(manifest.safes?.signalerSafe)
  };

  const checks = [];
  const warnings = [];

  for (const [key, value] of Object.entries(contracts)) {
    check(checks, `contract address valid: ${key}`, Boolean(value), {
      value
    });
  }

  for (const [key, value] of Object.entries(safes)) {
    check(checks, `safe address valid: ${key}`, Boolean(value), {
      value
    });
  }

  const client = createPublicClient({
    transport: http(rpcUrl)
  });

  const chainId = await client.getChainId();

  check(checks, "connected chain is Base Mainnet", chainId === 8453, {
    chainId
  });

  for (const [label, address] of Object.entries(contracts)) {
    if (!address) continue;

    const code = await client.getCode({ address });

    check(checks, `${label} bytecode exists`, Boolean(code && code !== "0x"), {
      address,
      codeLength: code ? code.length : 0
    });
  }

  const [name, symbol, decimals, totalSupply] = await Promise.all([
    readContract(client, contracts.astraToken, tokenAbi, "name"),
    readContract(client, contracts.astraToken, tokenAbi, "symbol"),
    readContract(client, contracts.astraToken, tokenAbi, "decimals"),
    readContract(client, contracts.astraToken, tokenAbi, "totalSupply")
  ]);

  check(checks, "ASTP token name", name === "AstraTreasury Token", { name });
  check(checks, "ASTP token symbol", symbol === "ASTP", { symbol });
  check(checks, "ASTP decimals", Number(decimals) === 18, { decimals: Number(decimals) });

  check(checks, "ASTP fixed supply", totalSupply === 1_000_000_000n * 10n ** 18n, {
    totalSupplyFormatted: formatUnits(totalSupply, 18)
  });

  const vaultBalance = await readContract(
    client,
    contracts.astraToken,
    tokenAbi,
    "balanceOf",
    [contracts.treasuryVault]
  );

  check(checks, "TreasuryVault ASTP balance is 350,000,000", vaultBalance === 350_000_000n * 10n ** 18n, {
    vaultBalanceFormatted: formatUnits(vaultBalance, 18)
  });

  const [
    vaultPolicy,
    controllerVault,
    controllerPolicy,
    controllerRegistry
  ] = await Promise.all([
    readContract(client, contracts.treasuryVault, vaultAbi, "policy"),
    readContract(client, contracts.executionController, controllerAbi, "vault"),
    readContract(client, contracts.executionController, controllerAbi, "policy"),
    readContract(client, contracts.executionController, controllerAbi, "signalRegistry")
  ]);

  check(checks, "TreasuryVault policy wiring", sameAddress(vaultPolicy, contracts.treasuryPolicy), {
    actual: vaultPolicy,
    expected: contracts.treasuryPolicy
  });

  check(checks, "ExecutionController vault wiring", sameAddress(controllerVault, contracts.treasuryVault), {
    actual: controllerVault,
    expected: contracts.treasuryVault
  });

  check(checks, "ExecutionController policy wiring", sameAddress(controllerPolicy, contracts.treasuryPolicy), {
    actual: controllerPolicy,
    expected: contracts.treasuryPolicy
  });

  check(checks, "ExecutionController registry wiring", sameAddress(controllerRegistry, contracts.signalRegistry), {
    actual: controllerRegistry,
    expected: contracts.signalRegistry
  });

  const astpApproved = await readContract(
    client,
    contracts.treasuryPolicy,
    policyAbi,
    "isApprovedAsset",
    [contracts.astraToken]
  );

  check(checks, "TreasuryPolicy approves ASTP", Boolean(astpApproved), {
    astraToken: contracts.astraToken
  });

  const [
    vaultExecutorRole,
    controllerExecutorRole,
    signalerRole
  ] = await Promise.all([
    readContract(client, contracts.treasuryVault, vaultAbi, "EXECUTOR_ROLE"),
    readContract(client, contracts.executionController, controllerAbi, "EXECUTOR_ROLE"),
    readContract(client, contracts.signalRegistry, registryAbi, "SIGNALER_ROLE")
  ]);

  check(
    checks,
    "Governance Safe has TreasuryPolicy admin",
    await readContract(client, contracts.treasuryPolicy, policyAbi, "hasRole", [
      DEFAULT_ADMIN_ROLE,
      safes.governanceSafe
    ])
  );

  check(
    checks,
    "Governance Safe has TreasuryVault admin",
    await readContract(client, contracts.treasuryVault, vaultAbi, "hasRole", [
      DEFAULT_ADMIN_ROLE,
      safes.governanceSafe
    ])
  );

  check(
    checks,
    "Governance Safe has SignalRegistry admin",
    await readContract(client, contracts.signalRegistry, registryAbi, "hasRole", [
      DEFAULT_ADMIN_ROLE,
      safes.governanceSafe
    ])
  );

  check(
    checks,
    "Governance Safe has ExecutionController admin",
    await readContract(client, contracts.executionController, controllerAbi, "hasRole", [
      DEFAULT_ADMIN_ROLE,
      safes.governanceSafe
    ])
  );

  check(
    checks,
    "ExecutionController has TreasuryVault.EXECUTOR_ROLE",
    await readContract(client, contracts.treasuryVault, vaultAbi, "hasRole", [
      vaultExecutorRole,
      contracts.executionController
    ])
  );

  check(
    checks,
    "Executor Safe does not directly have TreasuryVault.EXECUTOR_ROLE",
    !(await readContract(client, contracts.treasuryVault, vaultAbi, "hasRole", [
      vaultExecutorRole,
      safes.executorSafe
    ]))
  );

  check(
    checks,
    "Signaler Safe has SignalRegistry.SIGNALER_ROLE",
    await readContract(client, contracts.signalRegistry, registryAbi, "hasRole", [
      signalerRole,
      safes.signalerSafe
    ])
  );

  check(
    checks,
    "Executor Safe has ExecutionController.EXECUTOR_ROLE",
    await readContract(client, contracts.executionController, controllerAbi, "hasRole", [
      controllerExecutorRole,
      safes.executorSafe
    ])
  );

  const restricted = restrictedConfig?.restrictedCapabilities || {};

  const restrictedKeys = [
    "publicTokenSaleApproved",
    "realTreasuryFundingApproved",
    "stakingOrRewardsApproved",
    "buybackProgramApproved",
    "autonomousExecutionApproved",
    "mainnetExecutionQueueEnabled",
    "mainnetPaperToOnchainAutomationEnabled"
  ];

  for (const key of restrictedKeys) {
    check(checks, `restricted capability disabled: ${key}`, restricted[key] === false, {
      value: restricted[key]
    });
  }

  const failed = checks.filter((item) => !item.pass);

  const report = {
    schema: "astra-mainnet-operational-monitor-v1",
    checkedAt: now(),
    status: failed.length === 0 ? "PASS" : "FAIL",
    mode: "READ_ONLY_MAINNET_MONITOR",
    network: {
      name: "Base Mainnet",
      chainId
    },
    summary: {
      totalChecks: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
      warnings: warnings.length
    },
    contracts,
    safes,
    token: {
      name,
      symbol,
      decimals: Number(decimals),
      totalSupplyFormatted: formatUnits(totalSupply, 18),
      vaultBalanceFormatted: formatUnits(vaultBalance, 18)
    },
    restrictedCapabilities: restricted,
    checks,
    failures: failed,
    warnings,
    safety: {
      sendsTransactions: false,
      deploysContracts: false,
      movesFunds: false,
      approvesPublicSale: false,
      fundsTreasury: false
    }
  };

  writeJson(latestReportFile, report);
  writeJson(publicJsonFile, sanitizePublicReport(report));
  writePublicHtml(report);

  const heartbeat = {
    status: report.status,
    checkedAt: report.checkedAt,
    totalChecks: report.summary.totalChecks,
    failed: report.summary.failed,
    intervalSeconds
  };

  writeJson(heartbeatFile, heartbeat);

  console.log("AstraTreasury Mainnet Operational Monitor");
  console.log("=========================================");
  console.log(`Status: ${report.status}`);
  console.log(`Checks passed: ${report.summary.passed}/${report.summary.totalChecks}`);
  console.log(`Report: ${latestReportFile}`);

  if (failed.length > 0) {
    console.log("Failures:");
    console.table(failed.map((item) => ({
      name: item.name,
      details: JSON.stringify(item.details)
    })));
  }

  return report;
}

function sanitizePublicReport(report) {
  return {
    schema: "astra-public-mainnet-monitor-status-v1",
    checkedAt: report.checkedAt,
    status: report.status,
    mode: report.mode,
    network: report.network,
    summary: report.summary,
    contracts: report.contracts,
    safes: report.safes,
    token: report.token,
    restrictedCapabilities: report.restrictedCapabilities,
    failures: report.failures.map((item) => ({
      name: item.name,
      details: item.details
    })),
    publicStatement:
      "AstraTreasury Base Mainnet contracts are monitored in read-only restricted mode. Public token sale, real treasury funding, staking/rewards, buybacks, and autonomous execution remain disabled."
  };
}

function writePublicHtml(report) {
  const rows = report.checks.map((item) => {
    return `<tr><td>${escapeHtml(item.name)}</td><td>${item.pass ? "PASS" : "FAIL"}</td></tr>`;
  }).join("");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Mainnet Monitor</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #0d1117; color: #e6edf3; }
    header { padding: 32px; background: #010409; border-bottom: 1px solid #30363d; }
    main { padding: 24px 32px 56px; display: grid; gap: 18px; }
    h1 { margin: 0 0 8px; font-size: 30px; }
    h2 { margin-top: 0; color: #58a6ff; }
    a { color: #58a6ff; }
    .muted { color: #8b949e; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 14px; padding: 18px; }
    .big { font-size: 26px; font-weight: 700; }
    .ok { color: #3fb950; font-weight: 700; }
    .fail { color: #f85149; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; border-bottom: 1px solid #30363d; padding: 10px 8px; }
    th { color: #58a6ff; font-size: 13px; }
    td { font-size: 13px; overflow-wrap: anywhere; }
  </style>
</head>
<body>
<header>
  <h1>AstraTreasury Mainnet Monitor</h1>
  <div class="muted">Read-only Base Mainnet operational monitor.</div>
</header>
<main>
  <section class="card">
    <h2>Status</h2>
    <div class="big ${report.status === "PASS" ? "ok" : "fail"}">${escapeHtml(report.status)}</div>
    <p>Checks passed: ${escapeHtml(report.summary.passed)}/${escapeHtml(report.summary.totalChecks)}</p>
    <p>Checked at: ${escapeHtml(report.checkedAt)}</p>
  </section>

  <section class="card">
    <h2>Token</h2>
    <p>Symbol: ${escapeHtml(report.token.symbol)}</p>
    <p>Total supply: ${escapeHtml(report.token.totalSupplyFormatted)}</p>
    <p>Vault balance: ${escapeHtml(report.token.vaultBalanceFormatted)}</p>
  </section>

  <section class="card">
    <h2>Checks</h2>
    <table>
      <thead><tr><th>Check</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/monitor">/api/public/monitor</a></p>
    <p><a href="/restricted-operations">Restricted operations</a></p>
    <p><a href="/">Back to public site</a></p>
  </section>
</main>
</body>
</html>`;

  fs.writeFileSync(publicHtmlFile, html + "\n");
}

async function runSafely() {
  try {
    const report = await runMonitorOnce();

    if (once && report.status !== "PASS") {
      process.exit(1);
    }

    return report;
  } catch (error) {
    const event = {
      schema: "astra-mainnet-operational-monitor-error-v1",
      checkedAt: now(),
      status: "ERROR",
      message: error.message,
      stack: error.stack
    };

    writeJson(heartbeatFile, event);
    writeJson(latestReportFile, event);
    writeJson(publicJsonFile, {
      checkedAt: event.checkedAt,
      status: "ERROR",
      message: event.message
    });

    console.error(error);

    if (once) process.exit(1);

    return event;
  }
}

await runSafely();

if (!once) {
  console.log(`Mainnet monitor loop running every ${intervalSeconds} seconds.`);
  setInterval(runSafely, intervalSeconds * 1000);
}
