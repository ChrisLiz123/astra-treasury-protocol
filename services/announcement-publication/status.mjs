import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const configFile = path.join(root, "configs", "announcement-publication.config.json");
const launchStatusFile = path.join(root, "public-docs", "restricted-launch-status.json");
const monitorStatusFile = path.join(root, "public-docs", "mainnet-monitor-status.json");
const alertsStatusFile = path.join(root, "public-docs", "mainnet-alerts-status.json");
const incidentsStatusFile = path.join(root, "public-docs", "incident-summary.json");

const reportDir = path.join(root, "reports", "announcement-publication");
const reportFile = path.join(reportDir, "announcement-publication-status.json");

const publicJsonFile = path.join(root, "public-docs", "announcement-publication-status.json");
const publicHtmlFile = path.join(root, "public-docs", "announcement-publication.html");

fs.mkdirSync(reportDir, { recursive: true });
fs.mkdirSync(path.dirname(publicJsonFile), { recursive: true });

function readJson(filePath, fallback = {}) {
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

const config = readJson(configFile);
const launchStatus = readJson(launchStatusFile);
const monitorStatus = readJson(monitorStatusFile);
const alertsStatus = readJson(alertsStatusFile);
const incidentsStatus = readJson(incidentsStatusFile);

const requiredLinks = Array.isArray(config.requiredPublicLinks) ? config.requiredPublicLinks : [];
const publications = Array.isArray(config.publications) ? config.publications : [];

const requiredLinkChecks = [];

for (const url of requiredLinks) {
  requiredLinkChecks.push(await checkUrl(url));
}

const publicationLinkChecks = [];

for (const publication of publications) {
  if (publication.url && publication.url !== "TBD") {
    publicationLinkChecks.push(await checkUrl(publication.url));
  }
}

const requiredLinksOk = requiredLinkChecks.every((item) => item.ok);
const publicationLinksOk = publicationLinkChecks.every((item) => item.ok);

const activeIncidents = Number(incidentsStatus?.summary?.active || 0);
const responseRequired = Boolean(alertsStatus?.responseRequired);

const checks = [
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
    name: "alerts do not require response",
    pass: responseRequired === false,
    details: { responseRequired, status: alertsStatus.status || "UNKNOWN" }
  },
  {
    name: "no active incidents",
    pass: activeIncidents === 0,
    details: { activeIncidents }
  },
  {
    name: "required public links reachable",
    pass: requiredLinksOk,
    details: requiredLinkChecks
  },
  {
    name: "publication links reachable if configured",
    pass: publicationLinksOk,
    details: publicationLinkChecks
  }
];

const failures = checks.filter((item) => !item.pass);

const status = failures.length > 0
  ? "ANNOUNCEMENT_PUBLICATION_REVIEW_REQUIRED"
  : config.announcementPosted
    ? "ANNOUNCEMENT_POSTED_AND_MONITORED"
    : "READY_FOR_REVIEWED_PUBLIC_POSTING";

const report = {
  schema: "astra-announcement-publication-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  announcementPosted: Boolean(config.announcementPosted),
  network: {
    name: "Base Mainnet",
    chainId: 8453
  },
  publicStatement:
    config.announcementPosted
      ? "AstraTreasury restricted launch announcement has been posted and is being monitored."
      : "AstraTreasury restricted launch announcement is ready for reviewed public posting.",
  summary: {
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
    publications: publications.length,
    activeIncidents,
    responseRequired
  },
  requiredLinkChecks,
  publicationLinkChecks,
  publications,
  checks,
  failures,
  restrictions: {
    publicTokenSale: false,
    realTreasuryFunding: false,
    stakingOrRewards: false,
    buybackProgram: false,
    autonomousExecution: false,
    mainnetExecutionQueue: false
  }
};

writeJson(reportFile, report);

writeJson(publicJsonFile, {
  schema: "astra-public-announcement-publication-status-v0.1",
  generatedAt: report.generatedAt,
  status: report.status,
  announcementPosted: report.announcementPosted,
  publicStatement: report.publicStatement,
  summary: report.summary,
  requiredLinkChecks: report.requiredLinkChecks,
  publicationLinkChecks: report.publicationLinkChecks,
  publications: report.publications,
  failures: report.failures,
  restrictions: report.restrictions
});

const checkRows = checks.map((item) => {
  return `<tr><td>${escapeHtml(item.name)}</td><td>${item.pass ? "PASS" : "FAIL"}</td></tr>`;
}).join("");

const publicationRows = publications.length === 0
  ? '<tr><td colspan="4">No public posts logged yet.</td></tr>'
  : publications.map((item) => {
      return `<tr><td>${escapeHtml(item.channel || "")}</td><td>${escapeHtml(item.url || "")}</td><td>${escapeHtml(item.status || "")}</td><td>${escapeHtml(item.notes || "")}</td></tr>`;
    }).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Announcement Publication Status</title>
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
  <h1>AstraTreasury Announcement Publication Status</h1>
  <div class="muted">Public post-announcement monitoring status. Sanitized and read-only.</div>
</header>
<main>
  <section class="card">
    <h2>Status</h2>
    <div class="big">${escapeHtml(status)}</div>
    <p>${escapeHtml(report.publicStatement)}</p>
  </section>

  <section class="card">
    <h2>Checks</h2>
    <table>
      <thead><tr><th>Check</th><th>Status</th></tr></thead>
      <tbody>${checkRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Publication Log</h2>
    <table>
      <thead><tr><th>Channel</th><th>URL</th><th>Status</th><th>Notes</th></tr></thead>
      <tbody>${publicationRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/announcement-publication">/api/public/announcement-publication</a></p>
    <p><a href="/announcement">Announcement package</a></p>
    <p><a href="/">Back to public site</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Announcement Publication Status");
console.log("============================================");
console.log(`Status: ${status}`);
console.log(`Checks passed: ${report.summary.passed}/${report.summary.totalChecks}`);
console.log(`Report: ${reportFile}`);

if (failures.length > 0) {
  console.table(failures.map((item) => ({ name: item.name, details: JSON.stringify(item.details) })));
  process.exit(1);
}
