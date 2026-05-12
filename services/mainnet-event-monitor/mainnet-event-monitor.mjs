import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  decodeEventLog,
  formatUnits,
  getAddress,
  http,
  parseAbiItem
} from "viem";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const runtimeEnvFile = path.join(root, ".runtime", "mainnet-monitor.env");
const manifestFile = path.join(root, "deployments", "base-mainnet.public.json");
const restrictedConfigFile = path.join(root, "configs", "restricted-operations.config.json");

const reportsDir = path.join(root, "reports", "mainnet-event-monitor");
const latestReportFile = path.join(reportsDir, "latest-mainnet-event-monitor.json");
const heartbeatFile = path.join(reportsDir, "heartbeat.json");
const stateFile = path.join(reportsDir, "state.json");

const publicJsonFile = path.join(root, "public-docs", "mainnet-event-monitor-status.json");
const publicHtmlFile = path.join(root, "public-docs", "mainnet-events.html");

const once = process.argv.includes("--once");

loadEnvFile(runtimeEnvFile);

const intervalSeconds = Number(process.env.MAINNET_EVENT_MONITOR_INTERVAL_SECONDS || "300");
const lookbackBlocks = BigInt(process.env.MAINNET_EVENT_MONITOR_INITIAL_LOOKBACK_BLOCKS || "0");

const rpcUrl =
  process.env.MAINNET_EVENT_MONITOR_RPC_URL ||
  process.env.MAINNET_MONITOR_RPC_URL ||
  process.env.BASE_MAINNET_RPC_URL ||
  "";

fs.mkdirSync(reportsDir, { recursive: true });
fs.mkdirSync(path.dirname(publicJsonFile), { recursive: true });

if (!rpcUrl || !rpcUrl.startsWith("https://")) {
  console.error("Missing valid RPC URL. Use MAINNET_EVENT_MONITOR_RPC_URL or MAINNET_MONITOR_RPC_URL in .runtime/mainnet-monitor.env");
  process.exit(1);
}

const transferEvent = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
const roleGrantedEvent = parseAbiItem("event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)");
const roleRevokedEvent = parseAbiItem("event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)");
const pausedEvent = parseAbiItem("event Paused(address account)");
const unpausedEvent = parseAbiItem("event Unpaused(address account)");

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

function normalizeAddress(value) {
  try {
    return getAddress(value);
  } catch {
    return null;
  }
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

function makeAlert(severity, type, message, details = {}) {
  return {
    severity,
    type,
    message,
    details
  };
}

async function safeGetLogs(client, args) {
  try {
    return await client.getLogs(args);
  } catch (error) {
    return [{
      __monitorError: true,
      message: error.message,
      args
    }];
  }
}

async function getEventLogsForContracts(client, contracts, event, fromBlock, toBlock) {
  const out = [];

  for (const [label, address] of Object.entries(contracts)) {
    const logs = await safeGetLogs(client, {
      address,
      event,
      fromBlock,
      toBlock
    });

    for (const log of logs) {
      out.push({
        contractLabel: label,
        contractAddress: address,
        log
      });
    }
  }

  return out;
}

function serializeLog(log) {
  if (log.__monitorError) {
    return {
      monitorError: true,
      message: log.message
    };
  }

  return {
    blockNumber: log.blockNumber?.toString(),
    transactionHash: log.transactionHash,
    logIndex: log.logIndex,
    address: log.address,
    args: log.args || null
  };
}

async function runOnce() {
  const manifest = readJson(manifestFile);
  const restrictedConfig = readJson(restrictedConfigFile, {});
  const state = readJson(stateFile, null);

  if (!manifest?.contracts) {
    throw new Error("Missing deployments/base-mainnet.public.json");
  }

  const contracts = {
    treasuryPolicy: normalizeAddress(manifest.contracts.treasuryPolicy),
    treasuryVault: normalizeAddress(manifest.contracts.treasuryVault),
    signalRegistry: normalizeAddress(manifest.contracts.signalRegistry),
    executionController: normalizeAddress(manifest.contracts.executionController),
    astraToken: normalizeAddress(manifest.contracts.astraToken)
  };

  for (const [label, address] of Object.entries(contracts)) {
    if (!address) throw new Error(`Invalid contract address in manifest: ${label}`);
  }

  const client = createPublicClient({
    transport: http(rpcUrl)
  });

  const chainId = await client.getChainId();

  if (chainId !== 8453) {
    throw new Error(`Connected chainId ${chainId}; expected Base Mainnet 8453`);
  }

  const latestBlock = await client.getBlockNumber();

  let fromBlock;
  let bootstrapped = false;

  if (state?.lastCheckedBlock) {
    fromBlock = BigInt(state.lastCheckedBlock) + 1n;
  } else {
    fromBlock = latestBlock > lookbackBlocks ? latestBlock - lookbackBlocks : 0n;
    bootstrapped = true;
  }

  const toBlock = latestBlock;

  if (fromBlock > toBlock) {
    fromBlock = toBlock;
  }

  const monitoredContracts = {
    treasuryPolicy: contracts.treasuryPolicy,
    treasuryVault: contracts.treasuryVault,
    signalRegistry: contracts.signalRegistry,
    executionController: contracts.executionController
  };

  const alerts = [];
  const observations = [];

  const vaultOutLogs = await safeGetLogs(client, {
    address: contracts.astraToken,
    event: transferEvent,
    args: {
      from: contracts.treasuryVault
    },
    fromBlock,
    toBlock
  });

  for (const log of vaultOutLogs) {
    if (log.__monitorError) {
      alerts.push(makeAlert("WARN", "LOG_QUERY_ERROR", "Could not query vault outflow logs.", serializeLog(log)));
      continue;
    }

    const value = log.args?.value ?? 0n;

    alerts.push(makeAlert("CRITICAL", "VAULT_ASTP_OUTFLOW", "ASTP transfer out of TreasuryVault observed during restricted mode.", {
      blockNumber: log.blockNumber?.toString(),
      transactionHash: log.transactionHash,
      from: log.args?.from,
      to: log.args?.to,
      valueRaw: value.toString(),
      valueFormatted: formatUnits(value, 18)
    }));
  }

  const vaultInLogs = await safeGetLogs(client, {
    address: contracts.astraToken,
    event: transferEvent,
    args: {
      to: contracts.treasuryVault
    },
    fromBlock,
    toBlock
  });

  for (const log of vaultInLogs) {
    if (log.__monitorError) {
      alerts.push(makeAlert("WARN", "LOG_QUERY_ERROR", "Could not query vault inflow logs.", serializeLog(log)));
      continue;
    }

    const value = log.args?.value ?? 0n;

    observations.push({
      type: "VAULT_ASTP_INFLOW",
      severity: "INFO",
      message: "ASTP transfer into TreasuryVault observed.",
      details: {
        blockNumber: log.blockNumber?.toString(),
        transactionHash: log.transactionHash,
        from: log.args?.from,
        to: log.args?.to,
        valueRaw: value.toString(),
        valueFormatted: formatUnits(value, 18)
      }
    });
  }

  const roleGrantedLogs = await getEventLogsForContracts(client, monitoredContracts, roleGrantedEvent, fromBlock, toBlock);

  for (const item of roleGrantedLogs) {
    if (item.log.__monitorError) {
      alerts.push(makeAlert("WARN", "LOG_QUERY_ERROR", `Could not query RoleGranted logs for ${item.contractLabel}.`, serializeLog(item.log)));
      continue;
    }

    alerts.push(makeAlert("HIGH", "ROLE_GRANTED", "RoleGranted event observed during restricted mode.", {
      contractLabel: item.contractLabel,
      contractAddress: item.contractAddress,
      blockNumber: item.log.blockNumber?.toString(),
      transactionHash: item.log.transactionHash,
      role: item.log.args?.role,
      account: item.log.args?.account,
      sender: item.log.args?.sender
    }));
  }

  const roleRevokedLogs = await getEventLogsForContracts(client, monitoredContracts, roleRevokedEvent, fromBlock, toBlock);

  for (const item of roleRevokedLogs) {
    if (item.log.__monitorError) {
      alerts.push(makeAlert("WARN", "LOG_QUERY_ERROR", `Could not query RoleRevoked logs for ${item.contractLabel}.`, serializeLog(item.log)));
      continue;
    }

    alerts.push(makeAlert("HIGH", "ROLE_REVOKED", "RoleRevoked event observed during restricted mode.", {
      contractLabel: item.contractLabel,
      contractAddress: item.contractAddress,
      blockNumber: item.log.blockNumber?.toString(),
      transactionHash: item.log.transactionHash,
      role: item.log.args?.role,
      account: item.log.args?.account,
      sender: item.log.args?.sender
    }));
  }

  const pausedLogs = await getEventLogsForContracts(client, monitoredContracts, pausedEvent, fromBlock, toBlock);

  for (const item of pausedLogs) {
    if (item.log.__monitorError) continue;

    alerts.push(makeAlert("HIGH", "CONTRACT_PAUSED", "Paused event observed.", {
      contractLabel: item.contractLabel,
      contractAddress: item.contractAddress,
      blockNumber: item.log.blockNumber?.toString(),
      transactionHash: item.log.transactionHash,
      account: item.log.args?.account
    }));
  }

  const unpausedLogs = await getEventLogsForContracts(client, monitoredContracts, unpausedEvent, fromBlock, toBlock);

  for (const item of unpausedLogs) {
    if (item.log.__monitorError) continue;

    alerts.push(makeAlert("HIGH", "CONTRACT_UNPAUSED", "Unpaused event observed.", {
      contractLabel: item.contractLabel,
      contractAddress: item.contractAddress,
      blockNumber: item.log.blockNumber?.toString(),
      transactionHash: item.log.transactionHash,
      account: item.log.args?.account
    }));
  }

  const restricted = restrictedConfig?.restrictedCapabilities || {};

  const restrictedViolations = Object.entries(restricted).filter(([_key, value]) => value !== false);

  for (const [key, value] of restrictedViolations) {
    alerts.push(makeAlert("HIGH", "RESTRICTED_FLAG_ENABLED", "Restricted capability flag is not false.", {
      key,
      value
    }));
  }

  const highOrCritical = alerts.filter((alert) => ["HIGH", "CRITICAL"].includes(alert.severity));
  const warnOnly = alerts.filter((alert) => alert.severity === "WARN");

  const status = highOrCritical.length > 0
    ? "FAIL"
    : warnOnly.length > 0
      ? "WARN"
      : "PASS";

  const report = {
    schema: "astra-mainnet-event-monitor-v1",
    checkedAt: now(),
    status,
    mode: "READ_ONLY_EVENT_MONITOR",
    network: {
      name: "Base Mainnet",
      chainId
    },
    blockRange: {
      fromBlock: fromBlock.toString(),
      toBlock: toBlock.toString(),
      latestBlock: latestBlock.toString(),
      bootstrapped
    },
    summary: {
      alerts: alerts.length,
      highOrCriticalAlerts: highOrCritical.length,
      observations: observations.length
    },
    alerts,
    observations,
    restrictedCapabilities: restricted,
    safety: {
      sendsTransactions: false,
      deploysContracts: false,
      movesFunds: false,
      enablesExecution: false
    }
  };

  writeJson(latestReportFile, report);
  writeJson(publicJsonFile, sanitizePublicReport(report));
  writePublicHtml(report);

  if (status === "PASS" || status === "WARN") {
    writeJson(stateFile, {
      lastCheckedBlock: latestBlock.toString(),
      updatedAt: now()
    });
  }

  const heartbeat = {
    status,
    checkedAt: report.checkedAt,
    blockRange: report.blockRange,
    alerts: alerts.length,
    highOrCriticalAlerts: highOrCritical.length,
    observations: observations.length,
    intervalSeconds
  };

  writeJson(heartbeatFile, heartbeat);

  console.log("AstraTreasury Mainnet Event Monitor");
  console.log("===================================");
  console.log(`Status: ${status}`);
  console.log(`Blocks: ${fromBlock} -> ${toBlock}`);
  console.log(`Alerts: ${alerts.length}`);
  console.log(`Observations: ${observations.length}`);
  console.log(`Report: ${latestReportFile}`);

  if (highOrCritical.length > 0) {
    console.log("High/Critical alerts:");
    console.table(highOrCritical.map((alert) => ({
      severity: alert.severity,
      type: alert.type,
      message: alert.message,
      transactionHash: alert.details?.transactionHash || ""
    })));
  }

  return report;
}

function sanitizePublicReport(report) {
  return {
    schema: "astra-public-mainnet-event-monitor-status-v1",
    checkedAt: report.checkedAt,
    status: report.status,
    mode: report.mode,
    network: report.network,
    blockRange: report.blockRange,
    summary: report.summary,
    alerts: report.alerts,
    observations: report.observations,
    publicStatement:
      "AstraTreasury mainnet event monitor is read-only. Restricted mode remains active."
  };
}

function writePublicHtml(report) {
  const alertRows = report.alerts.length === 0
    ? '<tr><td colspan="4">No alerts.</td></tr>'
    : report.alerts.map((alert) => {
        return `<tr><td>${escapeHtml(alert.severity)}</td><td>${escapeHtml(alert.type)}</td><td>${escapeHtml(alert.message)}</td><td>${escapeHtml(alert.details?.transactionHash || "")}</td></tr>`;
      }).join("");

  const observationRows = report.observations.length === 0
    ? '<tr><td colspan="3">No observations.</td></tr>'
    : report.observations.map((observation) => {
        return `<tr><td>${escapeHtml(observation.type)}</td><td>${escapeHtml(observation.message)}</td><td>${escapeHtml(observation.details?.transactionHash || "")}</td></tr>`;
      }).join("");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Mainnet Event Monitor</title>
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
    .warn { color: #d29922; font-weight: 700; }
    .fail { color: #f85149; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; border-bottom: 1px solid #30363d; padding: 10px 8px; }
    th { color: #58a6ff; font-size: 13px; }
    td { font-size: 13px; overflow-wrap: anywhere; }
  </style>
</head>
<body>
<header>
  <h1>AstraTreasury Mainnet Event Monitor</h1>
  <div class="muted">Read-only event monitoring for restricted mainnet operation.</div>
</header>
<main>
  <section class="card">
    <h2>Status</h2>
    <div class="big ${report.status === "PASS" ? "ok" : report.status === "WARN" ? "warn" : "fail"}">${escapeHtml(report.status)}</div>
    <p>Block range: ${escapeHtml(report.blockRange.fromBlock)} → ${escapeHtml(report.blockRange.toBlock)}</p>
    <p>Alerts: ${escapeHtml(report.summary.alerts)} | Observations: ${escapeHtml(report.summary.observations)}</p>
  </section>

  <section class="card">
    <h2>Alerts</h2>
    <table>
      <thead><tr><th>Severity</th><th>Type</th><th>Message</th><th>Transaction</th></tr></thead>
      <tbody>${alertRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Observations</h2>
    <table>
      <thead><tr><th>Type</th><th>Message</th><th>Transaction</th></tr></thead>
      <tbody>${observationRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/mainnet-events">/api/public/mainnet-events</a></p>
    <p><a href="/mainnet-execution">Mainnet execution queue</a></p>
    <p><a href="/">Back to public site</a></p>
  </section>
</main>
</body>
</html>`;

  fs.writeFileSync(publicHtmlFile, html + "\n");
}

async function runSafely() {
  try {
    const report = await runOnce();

    if (once && report.status === "FAIL") {
      process.exit(1);
    }

    return report;
  } catch (error) {
    const event = {
      schema: "astra-mainnet-event-monitor-error-v1",
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
  console.log(`Mainnet event monitor loop running every ${intervalSeconds} seconds.`);
  setInterval(runSafely, intervalSeconds * 1000);
}
