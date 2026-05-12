import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const alertsFile = path.join(root, "reports", "mainnet-alerts", "latest-mainnet-alerts.json");
const incidentsDir = path.join(root, "reports", "incidents");
const incidentDbFile = path.join(incidentsDir, "incidents.json");
const heartbeatFile = path.join(incidentsDir, "heartbeat.json");
const privateMdFile = path.join(incidentsDir, "INCIDENT_LOG.md");

const publicJsonFile = path.join(root, "public-docs", "incident-summary.json");
const publicHtmlFile = path.join(root, "public-docs", "incidents.html");
const publicDocFile = path.join(root, "docs", "mainnet-live", "INCIDENT_ACKNOWLEDGEMENT_WORKFLOW.md");

const command = process.argv[2] || "help";
const args = parseArgs(process.argv.slice(3));

fs.mkdirSync(incidentsDir, { recursive: true });
fs.mkdirSync(path.dirname(publicJsonFile), { recursive: true });
fs.mkdirSync(path.dirname(publicDocFile), { recursive: true });

const validStatuses = [
  "OPEN",
  "ACKNOWLEDGED",
  "INVESTIGATING",
  "RESOLVED",
  "DISMISSED_EXPECTED_EVENT"
];

function now() {
  return new Date().toISOString();
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

function parseArgs(argv) {
  const out = {};
  let key = null;

  for (const item of argv) {
    if (item.startsWith("--")) {
      key = item.slice(2);
      out[key] = true;
      continue;
    }

    if (key) {
      out[key] = item;
      key = null;
    }
  }

  return out;
}

function hash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function nextIncidentId(db) {
  let max = 0;

  for (const incident of db.incidents) {
    const match = String(incident.id || "").match(/^INC-(\d+)$/);
    if (match) max = Math.max(max, Number(match[1]));
  }

  return `INC-${String(max + 1).padStart(4, "0")}`;
}

function loadDb() {
  const db = readJson(incidentDbFile);

  if (db?.schema === "astra-incident-log-v0.1") {
    return db;
  }

  return {
    schema: "astra-incident-log-v0.1",
    createdAt: now(),
    updatedAt: now(),
    project: "AstraTreasury Protocol",
    network: "Base Mainnet",
    incidents: []
  };
}

function saveDb(db) {
  db.updatedAt = now();
  writeJson(incidentDbFile, db);
  renderPrivateMarkdown(db);
  renderPublicSummary(db);
}

function findIncident(db, id) {
  const incident = db.incidents.find((item) => item.id === id);

  if (!incident) {
    throw new Error(`Incident not found: ${id}`);
  }

  return incident;
}

function normalizeStatus(status) {
  const value = String(status || "").toUpperCase();

  if (!validStatuses.includes(value)) {
    throw new Error(`Invalid status: ${status}. Valid: ${validStatuses.join(", ")}`);
  }

  return value;
}

function alertFingerprint(alert) {
  return hash({
    severity: alert.severity,
    type: alert.type,
    message: alert.message,
    transactionHash: alert.details?.transactionHash || null,
    blockNumber: alert.details?.blockNumber || null,
    account: alert.details?.account || null,
    role: alert.details?.role || null
  });
}

function syncFromAlerts() {
  const db = loadDb();
  const alertStatus = readJson(alertsFile, {});
  const alerts = Array.isArray(alertStatus.alerts) ? alertStatus.alerts : [];

  let created = 0;

  for (const alert of alerts) {
    if (!["CRITICAL", "HIGH"].includes(String(alert.severity || ""))) {
      continue;
    }

    const fingerprint = alertFingerprint(alert);
    const existing = db.incidents.find((incident) => incident.alertFingerprint === fingerprint);

    if (existing) continue;

    const incident = {
      id: nextIncidentId(db),
      status: "OPEN",
      severity: alert.severity || "UNKNOWN",
      type: alert.type || "UNKNOWN",
      title: alert.message || `${alert.severity || "UNKNOWN"} alert`,
      source: "mainnet-alert-monitor",
      alertFingerprint: fingerprint,
      transactionHash: alert.details?.transactionHash || "",
      blockNumber: alert.details?.blockNumber || "",
      createdAt: now(),
      updatedAt: now(),
      acknowledgedAt: "",
      acknowledgedBy: "",
      resolvedAt: "",
      resolvedBy: "",
      resolution: "",
      privateNotes: "",
      publicSummary: "Operator review required for a restricted mainnet alert.",
      alertDetails: alert.details || {}
    };

    db.incidents.push(incident);
    created += 1;
  }

  saveDb(db);

  const heartbeat = {
    schema: "astra-incident-tracker-heartbeat-v0.1",
    checkedAt: now(),
    command: "sync",
    status: "OK",
    alertsSeen: alerts.length,
    incidentsCreated: created,
    totalIncidents: db.incidents.length,
    openIncidents: db.incidents.filter((item) => item.status !== "RESOLVED" && item.status !== "DISMISSED_EXPECTED_EVENT").length
  };

  writeJson(heartbeatFile, heartbeat);

  console.log("Incident sync complete.");
  console.log(`Alerts seen: ${alerts.length}`);
  console.log(`Incidents created: ${created}`);
  console.log(`Total incidents: ${db.incidents.length}`);
}

function listIncidents() {
  const db = loadDb();

  console.table(db.incidents.map((incident) => ({
    id: incident.id,
    status: incident.status,
    severity: incident.severity,
    type: incident.type,
    tx: incident.transactionHash,
    title: incident.title
  })));
}

function acknowledgeIncident(id, args) {
  const db = loadDb();
  const incident = findIncident(db, id);

  incident.status = "ACKNOWLEDGED";
  incident.acknowledgedAt = now();
  incident.acknowledgedBy = args.by && args.by !== true ? args.by : "operator";
  incident.privateNotes = appendNote(incident.privateNotes, args.note && args.note !== true ? args.note : "Acknowledged.");
  incident.updatedAt = now();

  saveDb(db);

  console.log(`Acknowledged ${id}`);
}

function investigateIncident(id, args) {
  const db = loadDb();
  const incident = findIncident(db, id);

  incident.status = "INVESTIGATING";
  incident.privateNotes = appendNote(incident.privateNotes, args.note && args.note !== true ? args.note : "Investigation started.");
  incident.updatedAt = now();

  saveDb(db);

  console.log(`Marked ${id} as INVESTIGATING`);
}

function resolveIncident(id, args) {
  const db = loadDb();
  const incident = findIncident(db, id);

  incident.status = normalizeStatus(args.status || "RESOLVED");

  if (!["RESOLVED", "DISMISSED_EXPECTED_EVENT"].includes(incident.status)) {
    throw new Error("Resolution status must be RESOLVED or DISMISSED_EXPECTED_EVENT");
  }

  incident.resolvedAt = now();
  incident.resolvedBy = args.by && args.by !== true ? args.by : "operator";
  incident.resolution = args.resolution && args.resolution !== true ? args.resolution : incident.status;
  incident.privateNotes = appendNote(incident.privateNotes, args.note && args.note !== true ? args.note : incident.resolution);
  incident.publicSummary = args.public && args.public !== true
    ? args.public
    : incident.status === "DISMISSED_EXPECTED_EVENT"
      ? "Reviewed and classified as an expected setup or monitoring event."
      : "Reviewed and resolved by operators.";
  incident.updatedAt = now();

  saveDb(db);

  console.log(`Resolved ${id} as ${incident.status}`);
}

function addManualIncident(args) {
  const db = loadDb();

  const severity = String(args.severity || "HIGH").toUpperCase();
  const type = String(args.type || "MANUAL_INCIDENT").toUpperCase();
  const title = args.title && args.title !== true ? args.title : "Manual incident";

  const incident = {
    id: nextIncidentId(db),
    status: "OPEN",
    severity,
    type,
    title,
    source: "manual",
    alertFingerprint: hash({ severity, type, title, createdAt: now() }),
    transactionHash: args.tx && args.tx !== true ? args.tx : "",
    blockNumber: args.block && args.block !== true ? args.block : "",
    createdAt: now(),
    updatedAt: now(),
    acknowledgedAt: "",
    acknowledgedBy: "",
    resolvedAt: "",
    resolvedBy: "",
    resolution: "",
    privateNotes: args.note && args.note !== true ? args.note : "",
    publicSummary: "Operator review required for a manually recorded incident.",
    alertDetails: {}
  };

  db.incidents.push(incident);
  saveDb(db);

  console.log(`Added manual incident ${incident.id}`);
}

function appendNote(existing, note) {
  const line = `[${now()}] ${note}`;
  return existing ? `${existing}\n${line}` : line;
}

function renderPrivateMarkdown(db) {
  const rows = db.incidents.map((incident) => {
    return `| ${incident.id} | ${incident.status} | ${incident.severity} | ${incident.type} | ${incident.transactionHash || ""} | ${incident.title.replaceAll("|", "\\|")} | ${incident.acknowledgedBy || ""} | ${incident.resolvedBy || ""} |`;
  });

  const md = [
    "# Private Incident Log",
    "",
    "This file is private runtime evidence. Do not publish operator notes or contact details.",
    "",
    `Generated at: ${now()}`,
    "",
    "| ID | Status | Severity | Type | Tx | Title | Acknowledged By | Resolved By |",
    "|---|---|---|---|---|---|---|---|",
    ...rows,
    "",
    "## Private notes",
    "",
    ...db.incidents.flatMap((incident) => [
      `### ${incident.id}`,
      "",
      incident.privateNotes || "No private notes.",
      ""
    ])
  ];

  fs.writeFileSync(privateMdFile, md.join("\n") + "\n");
}

function renderPublicSummary(db) {
  const active = db.incidents.filter((incident) => !["RESOLVED", "DISMISSED_EXPECTED_EVENT"].includes(incident.status));
  const resolved = db.incidents.filter((incident) => ["RESOLVED", "DISMISSED_EXPECTED_EVENT"].includes(incident.status));

  const publicIncidents = db.incidents.map((incident) => ({
    id: incident.id,
    status: incident.status,
    severity: incident.severity,
    type: incident.type,
    createdAt: incident.createdAt,
    acknowledgedAt: incident.acknowledgedAt,
    resolvedAt: incident.resolvedAt,
    publicSummary: incident.publicSummary,
    transactionHash: incident.transactionHash || ""
  }));

  const summary = {
    schema: "astra-public-incident-summary-v0.1",
    generatedAt: now(),
    project: "AstraTreasury Protocol",
    network: "Base Mainnet",
    status: active.length === 0 ? "NO_ACTIVE_INCIDENTS" : "ACTIVE_INCIDENTS_PRESENT",
    summary: {
      total: db.incidents.length,
      active: active.length,
      resolved: resolved.length,
      criticalActive: active.filter((item) => item.severity === "CRITICAL").length,
      highActive: active.filter((item) => item.severity === "HIGH").length
    },
    incidents: publicIncidents,
    publicStatement:
      active.length === 0
        ? "No active mainnet incidents are recorded in the latest public summary."
        : "Active mainnet incidents are under operator review. Restricted operations remain enforced."
  };

  writeJson(publicJsonFile, summary);
  writePublicHtml(summary);
}

function writePublicHtml(summary) {
  const rows = summary.incidents.length === 0
    ? '<tr><td colspan="5">No incidents recorded.</td></tr>'
    : summary.incidents.map((incident) => {
        return `<tr><td>${escapeHtml(incident.id)}</td><td>${escapeHtml(incident.status)}</td><td>${escapeHtml(incident.severity)}</td><td>${escapeHtml(incident.type)}</td><td>${escapeHtml(incident.publicSummary)}</td></tr>`;
      }).join("");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Incident Summary</title>
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
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; border-bottom: 1px solid #30363d; padding: 10px 8px; }
    th { color: #58a6ff; font-size: 13px; }
    td { font-size: 13px; overflow-wrap: anywhere; }
  </style>
</head>
<body>
<header>
  <h1>AstraTreasury Incident Summary</h1>
  <div class="muted">Sanitized public incident acknowledgement summary.</div>
</header>
<main>
  <section class="card">
    <h2>Status</h2>
    <div class="big ${summary.summary.active === 0 ? "ok" : "warn"}">${escapeHtml(summary.status)}</div>
    <p>${escapeHtml(summary.publicStatement)}</p>
  </section>

  <section class="card">
    <h2>Incidents</h2>
    <table>
      <thead><tr><th>ID</th><th>Status</th><th>Severity</th><th>Type</th><th>Summary</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/incidents">/api/public/incidents</a></p>
    <p><a href="/alerts">Alerts</a></p>
    <p><a href="/">Back to public site</a></p>
  </section>
</main>
</body>
</html>`;

  fs.writeFileSync(publicHtmlFile, html + "\n");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  }[ch]));
}

function printHelp() {
  console.log(`AstraTreasury Incident Tracker

Commands:
  sync
  list
  add --severity HIGH --type MANUAL --title "Title" --note "Private note"
  ack INC-0001 --by operator --note "Acknowledged"
  investigate INC-0001 --note "Investigation started"
  resolve INC-0001 --by operator --resolution "Expected Safe setup event" --public "Reviewed and dismissed as expected event"
  dismiss INC-0001 --by operator --note "Expected event"
  report

Examples:
  npm run incident:sync
  npm run incident:ack -- INC-0001 --by operator --note "Review started"
  npm run incident:resolve -- INC-0001 --resolution "Expected governance setup event"
`);
}

try {
  if (command === "help") printHelp();
  else if (command === "sync") syncFromAlerts();
  else if (command === "list") listIncidents();
  else if (command === "add") addManualIncident(args);
  else if (command === "ack") acknowledgeIncident(process.argv[3], parseArgs(process.argv.slice(4)));
  else if (command === "investigate") investigateIncident(process.argv[3], parseArgs(process.argv.slice(4)));
  else if (command === "resolve") resolveIncident(process.argv[3], parseArgs(process.argv.slice(4)));
  else if (command === "dismiss") resolveIncident(process.argv[3], { ...parseArgs(process.argv.slice(4)), status: "DISMISSED_EXPECTED_EVENT" });
  else if (command === "report") {
    const db = loadDb();
    saveDb(db);
    console.log(`Wrote ${publicJsonFile}`);
    console.log(`Wrote ${publicHtmlFile}`);
    console.log(`Wrote ${privateMdFile}`);
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
