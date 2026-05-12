import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const configFile = path.join(root, "configs", "mainnet-alert-escalation.config.json");
const eventReportFile = path.join(root, "reports", "mainnet-event-monitor", "latest-mainnet-event-monitor.json");
const monitorReportFile = path.join(root, "reports", "mainnet-monitor", "latest-mainnet-monitor.json");
const restrictedStatusFile = path.join(root, "public-docs", "restricted-operations-status.json");

const reportDir = path.join(root, "reports", "mainnet-alerts");
const reportFile = path.join(reportDir, "latest-mainnet-alerts.json");

const publicJsonFile = path.join(root, "public-docs", "mainnet-alerts-status.json");
const publicHtmlFile = path.join(root, "public-docs", "alerts.html");
const publicDocFile = path.join(root, "docs", "mainnet-live", "MAINNET_ALERT_STATUS.md");

fs.mkdirSync(reportDir, { recursive: true });
fs.mkdirSync(path.dirname(publicJsonFile), { recursive: true });
fs.mkdirSync(path.dirname(publicDocFile), { recursive: true });

function readJson(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return { error: error.message };
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  }[ch]));
}

function countBy(items, key) {
  const out = {};
  for (const item of items || []) {
    const value = item?.[key] || "UNKNOWN";
    out[value] = (out[value] || 0) + 1;
  }
  return out;
}

const config = readJson(configFile, {});
const eventReport = readJson(eventReportFile, {});
const monitorReport = readJson(monitorReportFile, {});
const restrictedStatus = readJson(restrictedStatusFile, {});

const alerts = Array.isArray(eventReport.alerts) ? eventReport.alerts : [];
const observations = Array.isArray(eventReport.observations) ? eventReport.observations : [];

const critical = alerts.filter((item) => item.severity === "CRITICAL");
const high = alerts.filter((item) => item.severity === "HIGH");
const warn = alerts.filter((item) => item.severity === "WARN");

let alertStatus = "CLEAR";

if (critical.length > 0) {
  alertStatus = "CRITICAL_ALERTS_PRESENT";
} else if (high.length > 0) {
  alertStatus = "HIGH_ALERTS_PRESENT";
} else if (warn.length > 0) {
  alertStatus = "WARNINGS_PRESENT";
}

const responseRequired = critical.length > 0 || high.length > 0;

const status = {
  schema: "astra-mainnet-alert-status-v0.1",
  generatedAt: new Date().toISOString(),
  status: alertStatus,
  responseRequired,
  mode: "RESTRICTED_MAINNET_ALERT_ESCALATION",
  network: {
    name: "Base Mainnet",
    chainId: 8453
  },
  publicStatement:
    responseRequired
      ? "AstraTreasury mainnet monitor has alerts that require operator review."
      : "AstraTreasury mainnet monitor has no high or critical alerts in the latest public snapshot.",
  summary: {
    totalAlerts: alerts.length,
    critical: critical.length,
    high: high.length,
    warn: warn.length,
    observations: observations.length,
    bySeverity: countBy(alerts, "severity"),
    byType: countBy(alerts, "type")
  },
  eventMonitor: {
    status: eventReport.status || "UNKNOWN",
    checkedAt: eventReport.checkedAt || null,
    blockRange: eventReport.blockRange || null
  },
  operationalMonitor: {
    status: monitorReport.status || "UNKNOWN",
    checkedAt: monitorReport.checkedAt || null
  },
  restrictedOperations: {
    status: restrictedStatus.status || "UNKNOWN",
    mode: restrictedStatus.mode || "UNKNOWN"
  },
  alerts,
  observations,
  escalationRules: config.severityRules || {},
  hardRules: config.hardRules || {},
  safety: {
    sendsTransactions: false,
    deploysContracts: false,
    movesFunds: false,
    enablesExecution: false,
    approvesPublicSale: false
  }
};

writeJson(reportFile, status);

writeJson(publicJsonFile, {
  schema: "astra-public-mainnet-alert-status-v0.1",
  generatedAt: status.generatedAt,
  status: status.status,
  responseRequired: status.responseRequired,
  mode: status.mode,
  network: status.network,
  publicStatement: status.publicStatement,
  summary: status.summary,
  eventMonitor: status.eventMonitor,
  operationalMonitor: status.operationalMonitor,
  restrictedOperations: status.restrictedOperations,
  alerts: status.alerts,
  escalationRules: status.escalationRules
});

const alertRows = alerts.length === 0
  ? '<tr><td colspan="5">No alerts in latest snapshot.</td></tr>'
  : alerts.map((alert) => {
      return `<tr><td>${escapeHtml(alert.severity)}</td><td>${escapeHtml(alert.type)}</td><td>${escapeHtml(alert.message)}</td><td>${escapeHtml(alert.details?.transactionHash || "")}</td><td>${alert.severity === "CRITICAL" || alert.severity === "HIGH" ? "yes" : "review"}</td></tr>`;
    }).join("");

const ruleRows = Object.entries(config.severityRules || {}).map(([severity, rule]) => {
  return `<tr><td>${escapeHtml(severity)}</td><td>${escapeHtml((rule.examples || []).join(", "))}</td><td>${escapeHtml((rule.requiredResponse || []).join(" | "))}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Mainnet Alerts</title>
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
  <h1>AstraTreasury Mainnet Alerts</h1>
  <div class="muted">Read-only alert escalation status for restricted mainnet operation.</div>
</header>
<main>
  <section class="card">
    <h2>Status</h2>
    <div class="big ${responseRequired ? "fail" : warn.length > 0 ? "warn" : "ok"}">${escapeHtml(alertStatus)}</div>
    <p>${escapeHtml(status.publicStatement)}</p>
  </section>

  <section class="card">
    <h2>Alerts</h2>
    <table>
      <thead><tr><th>Severity</th><th>Type</th><th>Message</th><th>Transaction</th><th>Response required</th></tr></thead>
      <tbody>${alertRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Escalation Rules</h2>
    <table>
      <thead><tr><th>Severity</th><th>Examples</th><th>Required response</th></tr></thead>
      <tbody>${ruleRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/alerts">/api/public/alerts</a></p>
    <p><a href="/mainnet-events">Mainnet event monitor</a></p>
    <p><a href="/">Back to public site</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

const md = [
  "# Mainnet Alert Status",
  "",
  `Status: ${alertStatus}`,
  "",
  status.publicStatement,
  "",
  "## Summary",
  "",
  `Total alerts: ${status.summary.totalAlerts}`,
  `Critical: ${status.summary.critical}`,
  `High: ${status.summary.high}`,
  `Warn: ${status.summary.warn}`,
  "",
  "## Rule",
  "",
  "High and critical alerts require operator review."
];

fs.writeFileSync(publicDocFile, md.join("\n") + "\n");

console.log("AstraTreasury Mainnet Alert Status");
console.log("==================================");
console.log(`Status: ${alertStatus}`);
console.log(`Response required: ${responseRequired}`);
console.log(`Alerts: ${alerts.length}`);
console.log(`Report: ${reportFile}`);

if (responseRequired) {
  console.log("High/Critical alerts require operator review.");
}
