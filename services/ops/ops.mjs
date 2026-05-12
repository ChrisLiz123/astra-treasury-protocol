import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");

const command = process.argv[2] || "status";

const dashboardUrl = process.env.OPS_DASHBOARD_URL || "http://127.0.0.1:8787";
const paperHeartbeatMaxAgeSeconds = Number(process.env.OPS_PAPER_HEARTBEAT_MAX_AGE_SECONDS || "900");
const watchdogIntervalSeconds = Number(process.env.OPS_WATCHDOG_INTERVAL_SECONDS || "60");

const reportsDir = path.join(projectRoot, "reports");
const opsDir = path.join(reportsDir, "ops");
const snapshotsDir = path.join(opsDir, "snapshots");
const backupsDir = path.join(projectRoot, "backups");

const paperDir = path.join(reportsDir, "paper-trading");
const executionDir = path.join(reportsDir, "execution-queue");

const files = {
  deployment: path.join(projectRoot, "deployments", "base-sepolia.env"),
  paperHeartbeat: path.join(paperDir, "heartbeat.json"),
  paperState: path.join(paperDir, "state.json"),
  paperApprovalQueue: path.join(paperDir, "approval-queue.json"),
  executionQueue: path.join(executionDir, "execution-queue.json"),
  latestOpsStatus: path.join(opsDir, "latest-status.json"),
  watchdogHeartbeat: path.join(opsDir, "watchdog-heartbeat.json"),
  watchdogEvents: path.join(opsDir, "watchdog-events.jsonl")
};

fs.mkdirSync(opsDir, { recursive: true });
fs.mkdirSync(snapshotsDir, { recursive: true });
fs.mkdirSync(backupsDir, { recursive: true });

function now() {
  return new Date().toISOString();
}

function safeTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function readJson(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return {
      error: error.message,
      filePath
    };
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function appendJsonl(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, JSON.stringify(value) + "\n");
}

function fileInfo(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return {
      exists: true,
      sizeBytes: stat.size,
      modifiedAt: stat.mtime.toISOString()
    };
  } catch (_error) {
    return {
      exists: false,
      sizeBytes: 0,
      modifiedAt: null
    };
  }
}

function secondsSince(isoDate) {
  if (!isoDate) return null;

  const time = new Date(isoDate).getTime();
  if (!Number.isFinite(time)) return null;

  return Math.floor((Date.now() - time) / 1000);
}

function safeExec(commandName, args = []) {
  try {
    return {
      ok: true,
      stdout: execFileSync(commandName, args, {
        cwd: projectRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      })
    };
  } catch (error) {
    return {
      ok: false,
      stdout: error.stdout?.toString?.() || "",
      stderr: error.stderr?.toString?.() || "",
      message: error.message
    };
  }
}

async function fetchJson(endpoint) {
  const url = `${dashboardUrl}${endpoint}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000)
    });

    const text = await res.text();

    if (!res.ok) {
      return {
        ok: false,
        url,
        status: res.status,
        error: text.slice(0, 500)
      };
    }

    return {
      ok: true,
      url,
      data: JSON.parse(text)
    };
  } catch (error) {
    return {
      ok: false,
      url,
      error: error.message
    };
  }
}

function getPm2Status() {
  const result = safeExec("pm2", ["jlist"]);

  if (!result.ok) {
    return {
      ok: false,
      error: result.message,
      stderr: result.stderr
    };
  }

  try {
    const processes = JSON.parse(result.stdout);

    const simplified = processes.map((proc) => ({
      name: proc.name,
      status: proc.pm2_env?.status,
      restarts: proc.pm2_env?.restart_time,
      uptimeMs: proc.pm2_env?.pm_uptime ? Date.now() - proc.pm2_env.pm_uptime : null,
      memoryBytes: proc.monit?.memory,
      cpuPercent: proc.monit?.cpu
    }));

    const byName = Object.fromEntries(simplified.map((proc) => [proc.name, proc]));

    return {
      ok: true,
      processes: simplified,
      required: {
        astraDashboardOnline: byName["astra-dashboard"]?.status === "online",
        astraPaperLoopOnline: byName["astra-paper-loop"]?.status === "online",
        astraPublicSiteOnline: byName["astra-public-site"]?.status === "online",
        astraOpsWatchdogOnline: byName["astra-ops-watchdog"]?.status === "online",
        astraPublicRefreshOnline: byName["astra-public-refresh"]?.status === "online",
        astraEvidenceArchiveOnline: byName["astra-evidence-archive"]?.status === "online",
        astraMainnetMonitorOnline: byName["astra-mainnet-monitor"]?.status === "online",
        astraMainnetEventsOnline: byName["astra-mainnet-events"]?.status === "online"
      }
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      raw: result.stdout.slice(0, 500)
    };
  }
}

function getLocalFilesStatus() {
  const paperHeartbeat = readJson(files.paperHeartbeat, null);
  const paperState = readJson(files.paperState, null);
  const signalApprovalQueue = readJson(files.paperApprovalQueue, { items: {} });
  const executionQueue = readJson(files.executionQueue, { items: {} });

  const heartbeatAgeSeconds = secondsSince(paperHeartbeat?.checkedAt);

  const signalQueueItems = Object.values(signalApprovalQueue.items || {});
  const executionQueueItems = Object.values(executionQueue.items || {});

  const signalStatuses = countBy(signalQueueItems, "status");
  const executionStatuses = countBy(executionQueueItems, "status");

  return {
    files: {
      deployment: fileInfo(files.deployment),
      paperHeartbeat: fileInfo(files.paperHeartbeat),
      paperState: fileInfo(files.paperState),
      paperApprovalQueue: fileInfo(files.paperApprovalQueue),
      executionQueue: fileInfo(files.executionQueue)
    },
    paperHeartbeat: {
      status: paperHeartbeat?.status || "UNKNOWN",
      checkedAt: paperHeartbeat?.checkedAt || null,
      ageSeconds: heartbeatAgeSeconds,
      healthy:
        paperHeartbeat?.status === "OK" &&
        heartbeatAgeSeconds !== null &&
        heartbeatAgeSeconds <= paperHeartbeatMaxAgeSeconds
    },
    paperState: {
      updatedAt: paperState?.updatedAt || null,
      signalCount: paperState?.signalCount ?? null,
      appliedPaperActionCount: paperState?.appliedPaperActionCount ?? null,
      totalPaperValueUsd: paperState?.totalPaperValueUsd ?? null
    },
    signalApprovalQueue: {
      updatedAt: signalApprovalQueue.updatedAt || null,
      total: signalQueueItems.length,
      statuses: signalStatuses
    },
    executionQueue: {
      updatedAt: executionQueue.updatedAt || null,
      total: executionQueueItems.length,
      statuses: executionStatuses
    }
  };
}

function countBy(items, key) {
  const out = {};

  for (const item of items) {
    const value = item?.[key] || "UNKNOWN";
    out[value] = (out[value] || 0) + 1;
  }

  return out;
}

async function collectStatus() {
  const [
    dashboardHealth,
    paperStatus,
    signalApprovalQueue,
    executionQueue,
    actionHistory
  ] = await Promise.all([
    fetchJson("/api/health"),
    fetchJson("/api/paper/status"),
    fetchJson("/api/paper/approval-queue"),
    fetchJson("/api/execution-queue"),
    fetchJson("/api/action-history")
  ]);

  const pm2 = getPm2Status();
  const local = getLocalFilesStatus();

  const checks = {
    dashboardResponding: dashboardHealth.ok,
    dashboardHealthOk: dashboardHealth.ok && dashboardHealth.data?.status !== "WARN" && dashboardHealth.data?.health?.status !== "WARN",
    paperApiResponding: paperStatus.ok,
    paperLoopHealthy: local.paperHeartbeat.healthy,
    signalApprovalQueueResponding: signalApprovalQueue.ok,
    executionQueueResponding: executionQueue.ok,
    pm2Available: pm2.ok,
    astraDashboardOnline: Boolean(pm2.required?.astraDashboardOnline),
    astraPaperLoopOnline: Boolean(pm2.required?.astraPaperLoopOnline),
    astraPublicSiteOnline: Boolean(pm2.required?.astraPublicSiteOnline),
    astraOpsWatchdogOnline: Boolean(pm2.required?.astraOpsWatchdogOnline),
    astraPublicRefreshOnline: Boolean(pm2.required?.astraPublicRefreshOnline),
    astraEvidenceArchiveOnline: Boolean(pm2.required?.astraEvidenceArchiveOnline),
    astraMainnetMonitorOnline: Boolean(pm2.required?.astraMainnetMonitorOnline),
    astraMainnetEventsOnline: Boolean(pm2.required?.astraMainnetEventsOnline),
    deploymentFilePresent: local.files.deployment.exists,
    paperStatePresent: local.files.paperState.exists
  };

  const ok = Object.values(checks).every(Boolean);

  return {
    app: "AstraTreasury Ops Status",
    generatedAt: now(),
    status: ok ? "OK" : "WARN",
    dashboardUrl,
    checks,
    pm2,
    local,
    api: {
      dashboardHealth,
      paperStatus,
      signalApprovalQueue,
      executionQueue,
      actionHistory
    }
  };
}

function printStatus(status) {
  console.log("AstraTreasury Ops Status");
  console.log("========================");
  console.log(`Generated: ${status.generatedAt}`);
  console.log(`Overall: ${status.status}`);
  console.log("");

  console.table(status.checks);

  console.log("");
  console.log("PM2 required processes:");
  console.table(status.pm2.required || {});

  console.log("");
  console.log("Paper loop:");
  console.table(status.local.paperHeartbeat);

  console.log("");
  console.log("Signal approval queue:");
  console.table(status.local.signalApprovalQueue.statuses);

  console.log("");
  console.log("Execution queue:");
  console.table(status.local.executionQueue.statuses);
}

async function statusCommand() {
  const status = await collectStatus();
  writeJson(files.latestOpsStatus, status);
  printStatus(status);

  if (status.status !== "OK") {
    process.exitCode = 1;
  }
}

async function snapshotCommand() {
  const status = await collectStatus();

  const snapshotFile = path.join(snapshotsDir, `astra-status-${safeTimestamp()}.json`);

  writeJson(snapshotFile, status);
  writeJson(files.latestOpsStatus, status);

  console.log(`Snapshot saved: ${snapshotFile}`);
  console.log(`Overall status: ${status.status}`);

  if (status.status !== "OK") {
    process.exitCode = 1;
  }
}

function backupCommand() {
  const backupFile = path.join(backupsDir, `astra-treasury-backup-${safeTimestamp()}.tar.gz`);

  const result = safeExec("tar", [
    "-czf",
    backupFile,
    "--exclude=node_modules",
    "--exclude=.git",
    "--exclude=backups",
    "--exclude=cache",
    "--exclude=artifacts",
    "--exclude=.hardhat",
    "-C",
    projectRoot,
    "."
  ]);

  if (!result.ok) {
    console.error("Backup failed.");
    console.error(result.stderr || result.message);
    process.exit(1);
  }

  const info = fileInfo(backupFile);

  console.log("Backup complete.");
  console.log(`File: ${backupFile}`);
  console.log(`Size: ${info.sizeBytes} bytes`);
  console.log("");
  console.log("This project backup does not include your Hardhat keystore or private keys.");
}

async function watchdogTick() {
  const status = await collectStatus();

  writeJson(files.latestOpsStatus, status);
  writeJson(files.watchdogHeartbeat, {
    status: status.status,
    checkedAt: status.generatedAt,
    checks: status.checks
  });

  if (status.status !== "OK") {
    appendJsonl(files.watchdogEvents, {
      at: now(),
      type: "WATCHDOG_WARN",
      checks: status.checks
    });

    console.error(`[${now()}] WATCHDOG WARN`);
    console.error(JSON.stringify(status.checks, null, 2));
  } else {
    console.log(`[${now()}] watchdog OK`);
  }
}

async function watchdogCommand() {
  await watchdogTick();

  console.log(`AstraTreasury ops watchdog running every ${watchdogIntervalSeconds} seconds.`);

  setInterval(() => {
    watchdogTick().catch((error) => {
      appendJsonl(files.watchdogEvents, {
        at: now(),
        type: "WATCHDOG_ERROR",
        message: error.message,
        stack: error.stack
      });

      writeJson(files.watchdogHeartbeat, {
        status: "ERROR",
        checkedAt: now(),
        message: error.message
      });

      console.error(`[${now()}] watchdog error: ${error.message}`);
    });
  }, watchdogIntervalSeconds * 1000);
}

if (command === "status") {
  await statusCommand();
} else if (command === "snapshot") {
  await snapshotCommand();
} else if (command === "backup") {
  backupCommand();
} else if (command === "watchdog") {
  await watchdogCommand();
} else {
  console.error(`Unknown command: ${command}`);
  console.error("Use: status, snapshot, backup, watchdog");
  process.exit(1);
}
