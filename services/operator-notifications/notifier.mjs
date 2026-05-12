import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const runtimeEnvFile = path.join(root, ".runtime", "operator-notifications.env");
const alertsFile = path.join(root, "reports", "mainnet-alerts", "latest-mainnet-alerts.json");
const eventMonitorFile = path.join(root, "reports", "mainnet-event-monitor", "latest-mainnet-event-monitor.json");
const mainnetMonitorFile = path.join(root, "reports", "mainnet-monitor", "latest-mainnet-monitor.json");
const restrictedStatusFile = path.join(root, "public-docs", "restricted-operations-status.json");

const reportDir = path.join(root, "reports", "operator-notifications");
const heartbeatFile = path.join(reportDir, "heartbeat.json");
const stateFile = path.join(reportDir, "state.json");
const eventsFile = path.join(reportDir, "events.jsonl");

const once = process.argv.includes("--once");
const testMode = process.argv.includes("--test");

loadEnvFile(runtimeEnvFile);

const intervalSeconds = Number(process.env.OPERATOR_NOTIFY_INTERVAL_SECONDS || "300");
const enabled = String(process.env.OPERATOR_NOTIFY_ENABLED || "false").toLowerCase() === "true";
const webhookUrl = process.env.OPERATOR_NOTIFY_WEBHOOK_URL || "";
const format = String(process.env.OPERATOR_NOTIFY_FORMAT || "slack").toLowerCase();
const includeWarnings = String(process.env.OPERATOR_NOTIFY_INCLUDE_WARNINGS || "true").toLowerCase() === "true";
const minSecondsBetweenDuplicates = Number(process.env.OPERATOR_NOTIFY_MIN_SECONDS_BETWEEN_DUPLICATES || "900");

fs.mkdirSync(reportDir, { recursive: true });

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
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function appendJsonl(filePath, value) {
  fs.appendFileSync(filePath, JSON.stringify(value) + "\n");
}

function hashMessage(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function buildNotification(alertsStatus, eventMonitor, mainnetMonitor, restrictedStatus) {
  const alerts = Array.isArray(alertsStatus?.alerts) ? alertsStatus.alerts : [];
  const critical = alerts.filter((item) => item.severity === "CRITICAL");
  const high = alerts.filter((item) => item.severity === "HIGH");
  const warn = alerts.filter((item) => item.severity === "WARN");

  const shouldNotify =
    testMode ||
    critical.length > 0 ||
    high.length > 0 ||
    (includeWarnings && warn.length > 0) ||
    ["FAIL", "ERROR", "WARN", "CRITICAL_ALERTS_PRESENT", "HIGH_ALERTS_PRESENT", "WARNINGS_PRESENT"].includes(String(alertsStatus?.status || "")) ||
    ["FAIL", "ERROR", "WARN"].includes(String(eventMonitor?.status || "")) ||
    ["FAIL", "ERROR", "WARN"].includes(String(mainnetMonitor?.status || ""));

  const severity =
    critical.length > 0 ? "CRITICAL" :
    high.length > 0 ? "HIGH" :
    warn.length > 0 ? "WARN" :
    testMode ? "TEST" :
    "INFO";

  const title = testMode
    ? "AstraTreasury notification test"
    : `AstraTreasury mainnet alert status: ${alertsStatus?.status || "UNKNOWN"}`;

  const lines = [
    `*${title}*`,
    "",
    `Severity: ${severity}`,
    `Alert status: ${alertsStatus?.status || "UNKNOWN"}`,
    `Response required: ${alertsStatus?.responseRequired ? "yes" : "no"}`,
    `Event monitor: ${eventMonitor?.status || "UNKNOWN"}`,
    `Mainnet monitor: ${mainnetMonitor?.status || "UNKNOWN"}`,
    `Restricted status: ${restrictedStatus?.mode || restrictedStatus?.status || "UNKNOWN"}`,
    "",
    `Critical: ${critical.length}`,
    `High: ${high.length}`,
    `Warn: ${warn.length}`,
    "",
    "Public pages:",
    "https://astratreasury.ai/alerts",
    "https://astratreasury.ai/mainnet-events",
    "https://astratreasury.ai/monitor"
  ];

  if (alerts.length > 0) {
    lines.push("");
    lines.push("Latest alerts:");

    for (const alert of alerts.slice(0, 5)) {
      lines.push(`- ${alert.severity || "UNKNOWN"} ${alert.type || "UNKNOWN"}: ${alert.message || ""}`);
      if (alert.details?.transactionHash) {
        lines.push(`  tx: ${alert.details.transactionHash}`);
      }
    }
  }

  const text = lines.join("\n");

  return {
    shouldNotify,
    severity,
    title,
    text,
    fingerprint: hashMessage({
      status: alertsStatus?.status,
      eventMonitor: eventMonitor?.status,
      mainnetMonitor: mainnetMonitor?.status,
      alerts: alerts.map((item) => ({
        severity: item.severity,
        type: item.type,
        tx: item.details?.transactionHash || null,
        message: item.message
      }))
    })
  };
}

function formatPayload(message) {
  if (format === "discord") {
    return {
      content: message.text
        .replaceAll("*", "**")
        .slice(0, 1900)
    };
  }

  if (format === "generic") {
    return {
      source: "AstraTreasury",
      title: message.title,
      severity: message.severity,
      text: message.text,
      generatedAt: now()
    };
  }

  return {
    text: message.text
  };
}

async function sendWebhook(message) {
  if (!enabled) {
    return {
      sent: false,
      reason: "notifications disabled"
    };
  }

  if (!webhookUrl || !webhookUrl.startsWith("https://")) {
    return {
      sent: false,
      reason: "missing or invalid webhook URL"
    };
  }

  const payload = formatPayload(message);

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = await res.text();

  return {
    sent: res.ok,
    status: res.status,
    statusText: res.statusText,
    bodyTail: body.slice(-500)
  };
}

async function runOnce() {
  const alertsStatus = readJson(alertsFile, {});
  const eventMonitor = readJson(eventMonitorFile, {});
  const mainnetMonitor = readJson(mainnetMonitorFile, {});
  const restrictedStatus = readJson(restrictedStatusFile, {});
  const state = readJson(stateFile, {});

  const message = buildNotification(alertsStatus, eventMonitor, mainnetMonitor, restrictedStatus);

  let delivery = {
    sent: false,
    reason: "no notification needed"
  };

  const nowMs = Date.now();
  const duplicateTooSoon =
    state.lastFingerprint === message.fingerprint &&
    state.lastSentAtMs &&
    nowMs - Number(state.lastSentAtMs) < minSecondsBetweenDuplicates * 1000;

  if (message.shouldNotify && !duplicateTooSoon) {
    delivery = await sendWebhook(message);
  } else if (message.shouldNotify && duplicateTooSoon) {
    delivery = {
      sent: false,
      reason: "duplicate suppressed"
    };
  }

  if (delivery.sent) {
    writeJson(stateFile, {
      lastFingerprint: message.fingerprint,
      lastSentAt: now(),
      lastSentAtMs: nowMs,
      lastSeverity: message.severity
    });
  }

  const heartbeat = {
    schema: "astra-operator-notification-heartbeat-v0.1",
    checkedAt: now(),
    status: delivery.sent ? "SENT" : message.shouldNotify ? "PENDING_OR_SUPPRESSED" : "IDLE",
    enabled,
    format,
    includeWarnings,
    testMode,
    shouldNotify: message.shouldNotify,
    severity: message.severity,
    delivery,
    publicPages: [
      "https://astratreasury.ai/alerts",
      "https://astratreasury.ai/mainnet-events",
      "https://astratreasury.ai/monitor"
    ],
    safety: {
      sendsTransactions: false,
      movesFunds: false,
      deploysContracts: false,
      exposesWebhookPublicly: false
    }
  };

  writeJson(heartbeatFile, heartbeat);
  appendJsonl(eventsFile, heartbeat);

  console.log("AstraTreasury Operator Notifications");
  console.log("====================================");
  console.log(`Enabled: ${enabled}`);
  console.log(`Format: ${format}`);
  console.log(`Status: ${heartbeat.status}`);
  console.log(`Should notify: ${message.shouldNotify}`);
  console.log(`Severity: ${message.severity}`);
  console.log(`Delivery: ${JSON.stringify(delivery)}`);
  console.log(`Heartbeat: ${heartbeatFile}`);

  return heartbeat;
}

async function runSafely() {
  try {
    return await runOnce();
  } catch (error) {
    const event = {
      schema: "astra-operator-notification-error-v0.1",
      checkedAt: now(),
      status: "ERROR",
      message: error.message,
      stack: error.stack
    };

    writeJson(heartbeatFile, event);
    appendJsonl(eventsFile, event);

    console.error(error);

    if (once) process.exit(1);

    return event;
  }
}

await runSafely();

if (!once) {
  console.log(`Operator notification loop running every ${intervalSeconds} seconds.`);
  setInterval(runSafely, intervalSeconds * 1000);
}
