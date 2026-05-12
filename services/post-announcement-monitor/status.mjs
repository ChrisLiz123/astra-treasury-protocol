import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const monitorConfigFile = path.join(root, "configs", "post-announcement-monitoring.config.json");
const publicationConfigFile = path.join(root, "configs", "announcement-publication.config.json");

const launchStatusFile = path.join(root, "public-docs", "restricted-launch-status.json");
const monitorStatusFile = path.join(root, "public-docs", "mainnet-monitor-status.json");
const eventStatusFile = path.join(root, "public-docs", "mainnet-event-monitor-status.json");
const alertsStatusFile = path.join(root, "public-docs", "mainnet-alerts-status.json");
const incidentsStatusFile = path.join(root, "public-docs", "incident-summary.json");
const evidenceIndexFile = path.join(root, "public-docs", "evidence-index.json");

const reportDir = path.join(root, "reports", "post-announcement-monitor");
const reportFile = path.join(reportDir, "post-announcement-status.json");
const heartbeatFile = path.join(reportDir, "heartbeat.json");

const publicJsonFile = path.join(root, "public-docs", "post-announcement-status.json");
const publicHtmlFile = path.join(root, "public-docs", "post-announcement.html");

const command = process.argv[2] || "status";
const args = parseArgs(process.argv.slice(3));

fs.mkdirSync(reportDir, { recursive: true });
fs.mkdirSync(path.dirname(publicJsonFile), { recursive: true });

const loopIntervalSeconds = Number(process.env.POST_ANNOUNCEMENT_MONITOR_INTERVAL_SECONDS || "900");

function now() {
  return new Date().toISOString();
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

function readJson(filePath, fallback = {}) {
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

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  }[ch]));
}

async function checkUrl(url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(10000)
    });

    return {
      url,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    return {
      url,
      ok: false,
      error: error.message
    };
  }
}

function savePublicationConfig(config) {
  writeJson(publicationConfigFile, config);
}

function saveMonitorConfig(config) {
  writeJson(monitorConfigFile, config);
}

async function markPosted() {
  const config = readJson(publicationConfigFile, {});

  const channel = args.channel && args.channel !== true ? args.channel : "unknown";
  const url = args.url && args.url !== true ? args.url : "";
  const notes = args.notes && args.notes !== true ? args.notes : "Restricted launch announcement posted.";

  if (!url || !/^https?:\/\//.test(url)) {
    throw new Error("Provide --url with the public announcement post URL.");
  }

  const publication = {
    date: now(),
    channel,
    url,
    status: "POSTED",
    notes
  };

  config.announcementPosted = true;
  config.publications = Array.isArray(config.publications) ? config.publications : [];
  config.publications.push(publication);

  savePublicationConfig(config);

  const logPath = path.join(root, "docs", "announcement", "ANNOUNCEMENT_PUBLICATION_LOG.md");
  const line = `| ${publication.date} | ${channel} | ${url} | POSTED | ${notes.replaceAll("|", "\\|")} |\n`;

  fs.appendFileSync(logPath, line);

  console.log("Announcement publication logged.");
  console.log(JSON.stringify(publication, null, 2));

  await generateStatus();
}

async function startWindow() {
  if (process.env.POST_ANNOUNCEMENT_START !== "YES") {
    throw new Error("Start blocked. Re-run with POST_ANNOUNCEMENT_START=YES.");
  }

  const config = readJson(monitorConfigFile, {});
  const publication = readJson(publicationConfigFile, {});

  if (publication.announcementPosted !== true) {
    throw new Error("Cannot start window until announcementPosted=true in announcement-publication config.");
  }

  const startedAt = new Date();
  const windowHours = Number(config.windowHours || 24);
  const endsAt = new Date(startedAt.getTime() + windowHours * 60 * 60 * 1000);

  config.status = "active";
  config.startedAt = startedAt.toISOString();
  config.endsAt = endsAt.toISOString();
  config.completedAt = "";

  saveMonitorConfig(config);

  console.log("Post-announcement monitoring window started.");
  console.log(`Started: ${config.startedAt}`);
  console.log(`Ends: ${config.endsAt}`);

  await generateStatus();
}

async function completeWindow() {
  if (process.env.POST_ANNOUNCEMENT_COMPLETE !== "YES") {
    throw new Error("Complete blocked. Re-run with POST_ANNOUNCEMENT_COMPLETE=YES.");
  }

  const status = await generateStatus({ failOnReviewRequired: true });
  const config = readJson(monitorConfigFile, {});

  config.status = "complete";
  config.completedAt = now();

  saveMonitorConfig(config);

  console.log("Post-announcement monitoring window marked complete.");
  console.log(`Completed: ${config.completedAt}`);

  return status;
}

async function generateStatus(options = {}) {
  const config = readJson(monitorConfigFile, {});
  const publication = readJson(publicationConfigFile, {});

  const launchStatus = readJson(launchStatusFile, {});
  const monitorStatus = readJson(monitorStatusFile, {});
  const eventStatus = readJson(eventStatusFile, {});
  const alertsStatus = readJson(alertsStatusFile, {});
  const incidentsStatus = readJson(incidentsStatusFile, {});
  const evidenceIndex = readJson(evidenceIndexFile, {});

  const requiredLinks = Array.isArray(publication.requiredPublicLinks)
    ? publication.requiredPublicLinks
    : [
        "https://astratreasury.ai/announcement",
        "https://astratreasury.ai/announcement-publication",
        "https://astratreasury.ai/launch",
        "https://astratreasury.ai/mainnet",
        "https://astratreasury.ai/live",
        "https://astratreasury.ai/monitor",
        "https://astratreasury.ai/restricted-operations",
        "https://astratreasury.ai/mainnet-execution",
        "https://astratreasury.ai/transparency"
      ];

  const linkChecks = [];

  for (const url of requiredLinks) {
    linkChecks.push(await checkUrl(url));
  }

  const publicationLinks = [];

  for (const item of publication.publications || []) {
    if (item.url && item.url !== "TBD") {
      publicationLinks.push(await checkUrl(item.url));
    }
  }

  const activeIncidents = Number(incidentsStatus?.summary?.active || 0);
  const highOrCriticalAlerts = Number(alertsStatus?.summary?.critical || 0) + Number(alertsStatus?.summary?.high || 0);

  const nowMs = Date.now();
  const startedAtMs = config.startedAt ? Date.parse(config.startedAt) : null;
  const endsAtMs = config.endsAt ? Date.parse(config.endsAt) : null;

  const checks = [
    {
      name: "announcement logged as posted",
      pass: publication.announcementPosted === true,
      details: { announcementPosted: publication.announcementPosted }
    },
    {
      name: "required public links reachable",
      pass: linkChecks.every((item) => item.ok),
      details: linkChecks
    },
    {
      name: "publication links reachable",
      pass: publicationLinks.every((item) => item.ok),
      details: publicationLinks
    },
    {
      name: "restricted launch ready",
      pass: launchStatus.status === "RESTRICTED_LAUNCH_READY",
      details: { status: launchStatus.status || "UNKNOWN" }
    },
    {
      name: "mainnet monitor passing",
      pass: monitorStatus.status === "PASS",
      details: { status: monitorStatus.status || "UNKNOWN" }
    },
    {
      name: "event monitor has no high/critical alerts",
      pass: highOrCriticalAlerts === 0 && !["FAIL", "ERROR"].includes(String(eventStatus.status || "")),
      details: { eventStatus: eventStatus.status || "UNKNOWN", highOrCriticalAlerts }
    },
    {
      name: "alerts do not require response",
      pass: alertsStatus.responseRequired !== true,
      details: { alertStatus: alertsStatus.status || "UNKNOWN", responseRequired: alertsStatus.responseRequired }
    },
    {
      name: "no active incidents",
      pass: activeIncidents === 0,
      details: { activeIncidents }
    },
    {
      name: "evidence snapshot exists",
      pass: Number(evidenceIndex.snapshotCount || 0) > 0,
      details: { snapshotCount: evidenceIndex.snapshotCount || 0 }
    }
  ];

  const failures = checks.filter((item) => !item.pass);

  let windowState = config.status || "not_started";

  if (windowState === "active" && endsAtMs && nowMs >= endsAtMs) {
    windowState = "active_window_elapsed_ready_for_completion_review";
  }

  const status = failures.length === 0
    ? windowState === "complete"
      ? "POST_ANNOUNCEMENT_WINDOW_COMPLETE"
      : windowState === "active_window_elapsed_ready_for_completion_review"
        ? "POST_ANNOUNCEMENT_WINDOW_ELAPSED_READY_FOR_COMPLETION"
        : windowState === "active"
          ? "POST_ANNOUNCEMENT_MONITORING_ACTIVE"
          : "POST_ANNOUNCEMENT_READY_TO_START"
    : "POST_ANNOUNCEMENT_REVIEW_REQUIRED";

  const report = {
    schema: "astra-post-announcement-monitoring-status-v0.1",
    generatedAt: now(),
    status,
    window: {
      state: windowState,
      configuredState: config.status || "not_started",
      windowHours: Number(config.windowHours || 24),
      startedAt: config.startedAt || "",
      endsAt: config.endsAt || "",
      completedAt: config.completedAt || ""
    },
    publication: {
      announcementPosted: publication.announcementPosted === true,
      publications: publication.publications || []
    },
    summary: {
      totalChecks: checks.length,
      passed: checks.length - failures.length,
      failed: failures.length,
      activeIncidents,
      highOrCriticalAlerts,
      evidenceSnapshots: evidenceIndex.snapshotCount || 0
    },
    checks,
    failures,
    linkChecks,
    publicationLinks,
    restrictions: {
      publicTokenSale: false,
      realTreasuryFunding: false,
      stakingOrRewards: false,
      buybackProgram: false,
      autonomousExecution: false,
      mainnetExecutionQueue: false
    },
    publicStatement:
      "AstraTreasury restricted launch announcement monitoring tracks public links, monitors, alerts, incidents, and evidence snapshots. Restricted capabilities remain disabled."
  };

  writeJson(reportFile, report);

  writeJson(publicJsonFile, {
    schema: "astra-public-post-announcement-monitoring-status-v0.1",
    generatedAt: report.generatedAt,
    status: report.status,
    window: report.window,
    publication: report.publication,
    summary: report.summary,
    failures: report.failures,
    restrictions: report.restrictions,
    publicStatement: report.publicStatement
  });

  writePublicHtml(report);

  writeJson(heartbeatFile, {
    checkedAt: report.generatedAt,
    status: report.status,
    failed: failures.length,
    window: report.window
  });

  console.log("AstraTreasury Post-Announcement Monitoring");
  console.log("==========================================");
  console.log(`Status: ${report.status}`);
  console.log(`Window: ${report.window.state}`);
  console.log(`Checks passed: ${report.summary.passed}/${report.summary.totalChecks}`);
  console.log(`Report: ${reportFile}`);

  if (failures.length > 0) {
    console.table(failures.map((item) => ({
      name: item.name,
      details: JSON.stringify(item.details).slice(0, 240)
    })));
  }

  if (options.failOnReviewRequired && failures.length > 0) {
    process.exit(1);
  }

  return report;
}

function writePublicHtml(report) {
  const rows = report.checks.map((item) => {
    return `<tr><td>${escapeHtml(item.name)}</td><td>${item.pass ? "PASS" : "FAIL"}</td></tr>`;
  }).join("");

  const publicationRows = report.publication.publications.length === 0
    ? '<tr><td colspan="4">No public posts logged yet.</td></tr>'
    : report.publication.publications.map((item) => {
        return `<tr><td>${escapeHtml(item.date || "")}</td><td>${escapeHtml(item.channel || "")}</td><td>${escapeHtml(item.url || "")}</td><td>${escapeHtml(item.status || "")}</td></tr>`;
      }).join("");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Post-Announcement Monitoring</title>
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
    .big { font-size: 26px; font-weight: 700; color: #3fb950; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; border-bottom: 1px solid #30363d; padding: 10px 8px; }
    th { color: #58a6ff; font-size: 13px; }
    td { font-size: 13px; overflow-wrap: anywhere; }
  </style>
</head>
<body>
<header>
  <h1>AstraTreasury Post-Announcement Monitoring</h1>
  <div class="muted">24-hour post-publication monitoring status. Sanitized and read-only.</div>
</header>
<main>
  <section class="card">
    <h2>Status</h2>
    <div class="big">${escapeHtml(report.status)}</div>
    <p>${escapeHtml(report.publicStatement)}</p>
    <p>Window: ${escapeHtml(report.window.state)}</p>
    <p>Started: ${escapeHtml(report.window.startedAt || "not started")}</p>
    <p>Ends: ${escapeHtml(report.window.endsAt || "not started")}</p>
  </section>

  <section class="card">
    <h2>Checks</h2>
    <table>
      <thead><tr><th>Check</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Publication Log</h2>
    <table>
      <thead><tr><th>Date</th><th>Channel</th><th>URL</th><th>Status</th></tr></thead>
      <tbody>${publicationRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/post-announcement">/api/public/post-announcement</a></p>
    <p><a href="/announcement-publication">Announcement publication status</a></p>
    <p><a href="/">Back to public site</a></p>
  </section>
</main>
</body>
</html>`;

  writeText(publicHtmlFile, html + "\n");
}

async function loop() {
  await generateStatus();

  console.log(`Post-announcement monitor loop running every ${loopIntervalSeconds} seconds.`);

  setInterval(async () => {
    try {
      await generateStatus();
    } catch (error) {
      writeJson(heartbeatFile, {
        checkedAt: now(),
        status: "ERROR",
        message: error.message,
        stack: error.stack
      });
      console.error(error);
    }
  }, loopIntervalSeconds * 1000);
}

if (command === "mark-posted") {
  await markPosted();
} else if (command === "start") {
  await startWindow();
} else if (command === "complete") {
  await completeWindow();
} else if (command === "status") {
  await generateStatus();
} else if (command === "loop") {
  await loop();
} else {
  console.log(`Commands:
  mark-posted --channel X --url URL --notes "..."
  start
  status
  complete
  loop`);
}
