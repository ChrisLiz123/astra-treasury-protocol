import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const publicJsonFile = path.join(root, "public-docs", "trust-status.json");
const publicHtmlFile = path.join(root, "public-docs", "trust.html");
const publicDocFile = path.join(root, "docs", "trust", "TRUST_CENTER.md");

fs.mkdirSync(path.dirname(publicJsonFile), { recursive: true });
fs.mkdirSync(path.dirname(publicDocFile), { recursive: true });

function readJson(relativePath, fallback = {}) {
  try {
    const full = path.join(root, relativePath);
    if (!fs.existsSync(full)) return fallback;
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch (error) {
    return { error: error.message };
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  }[ch]));
}

function humanize(value, fallback = "Unknown") {
  if (!value) return fallback;

  const map = {
    PASS: "Passing",
    CLEAR: "Clear",
    NO_ACTIVE_INCIDENTS: "No active incidents",
    RESTRICTED_LAUNCH_READY: "Restricted launch ready",
    RESTRICTED_LAUNCH_STABILIZED: "Restricted launch stabilized",
    RESTRICTED_LAUNCH_STABILIZATION_REVIEW_REQUIRED: "Stabilization review pending",
    MAINNET_CONTRACTS_DEPLOYED_RESTRICTED_OPERATION: "Restricted mainnet operation",
    MAINNET_RESTRICTED_OPERATION: "Restricted operation",
    MAINNET_EXECUTION_QUEUE_DISABLED: "Execution queue disabled",
    CAPABILITY_ROADMAP_READY: "Roadmap ready",
    PUBLIC_DEX_MARKET_DATA_AVAILABLE: "Market data available",
    NO_PUBLIC_DEX_MARKET_DATA: "No public DEX market data"
  };

  if (map[value]) return map[value];

  return String(value)
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function tone(value) {
  const v = String(value || "").toUpperCase();

  if (v.includes("FAIL") || v.includes("ERROR") || v.includes("CRITICAL") || v.includes("ACTIVE_INCIDENT")) return "danger";
  if (v.includes("WARN") || v.includes("REVIEW") || v.includes("PENDING") || v.includes("NO_PUBLIC_DEX")) return "warn";
  return "ok";
}

function check(checks, name, pass, details = {}) {
  checks.push({ name, pass: Boolean(pass), details });
}

const mainnet = readJson("public-docs/mainnet-status.json");
const live = readJson("public-docs/live-status.json");
const launch = readJson("public-docs/restricted-launch-status.json");
const stabilization = readJson("public-docs/stabilization-status.json");
const restrictedOps = readJson("public-docs/restricted-operations-status.json");
const execution = readJson("public-docs/mainnet-execution-status.json");
const monitor = readJson("public-docs/mainnet-monitor-status.json");
const events = readJson("public-docs/mainnet-event-monitor-status.json");
const alerts = readJson("public-docs/mainnet-alerts-status.json");
const incidents = readJson("public-docs/incident-summary.json");
const evidence = readJson("public-docs/evidence-index.json");
const packages = readJson("public-docs/package-inventory.json");
const token = readJson("public-docs/token-status.json");
const wallet = readJson("public-docs/wallet-status.json");
const brand = readJson("public-docs/brand-status.json");
const market = readJson("public-docs/market-status.json");
const roadmap = readJson("public-docs/capability-roadmap-status.json");
const announcement = readJson("public-docs/announcement-status.json");
const postAnnouncement = readJson("public-docs/post-announcement-status.json");

const checks = [];

const contracts = mainnet.contracts || {};
const contractCount = Object.keys(contracts).length;

const activeIncidents = Number(incidents?.summary?.active || 0);
const alertResponseRequired = Boolean(alerts?.responseRequired);
const eventHighCritical = Number(events?.summary?.highOrCriticalAlerts || 0);

check(checks, "Base Mainnet manifest exists", contractCount > 0, { contractCount });
check(checks, "Operational monitor passing", monitor.status === "PASS", { status: monitor.status || "UNKNOWN" });
check(checks, "Event monitor has no high/critical alerts", eventHighCritical === 0 && !["FAIL", "ERROR"].includes(String(events.status || "")), {
  eventStatus: events.status || "UNKNOWN",
  highOrCriticalAlerts: eventHighCritical
});
check(checks, "Alerts do not require operator response", alertResponseRequired === false, {
  alertStatus: alerts.status || "UNKNOWN",
  responseRequired: alertResponseRequired
});
check(checks, "No active incidents", activeIncidents === 0, { activeIncidents });
check(checks, "Restricted operations active", restrictedOps.mode === "MAINNET_RESTRICTED_OPERATION", {
  mode: restrictedOps.mode || "UNKNOWN"
});
check(checks, "Mainnet execution queue disabled", execution.mode === "MAINNET_EXECUTION_QUEUE_DISABLED", {
  mode: execution.mode || "UNKNOWN"
});
check(checks, "Evidence archive exists", Number(evidence.snapshotCount || 0) > 0, {
  snapshotCount: evidence.snapshotCount || 0
});
check(checks, "Token metadata published", Boolean(token.address && token.logoURI), {
  address: token.address || "",
  logoURI: token.logoURI || ""
});
check(checks, "Capability roadmap ready", roadmap.status === "CAPABILITY_ROADMAP_READY", {
  status: roadmap.status || "UNKNOWN"
});

const failures = checks.filter((item) => !item.pass);

const status = {
  schema: "astra-public-trust-center-v0.1",
  generatedAt: new Date().toISOString(),
  project: "AstraTreasury Protocol",
  version: "0.1.1",
  status: failures.length === 0 ? "TRUST_CENTER_READY" : "TRUST_CENTER_REVIEW_REQUIRED",
  network: {
    name: "Base Mainnet",
    chainId: 8453
  },
  publicStatement:
    failures.length === 0
      ? "AstraTreasury public trust status is healthy for restricted Base Mainnet operation. Restricted capabilities remain disabled."
      : "AstraTreasury public trust status requires review. Restricted capabilities remain disabled.",
  summary: {
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
    contractCount,
    activeIncidents,
    alertResponseRequired,
    evidenceSnapshots: evidence.snapshotCount || 0,
    packageCount: packages?.summary?.total || null
  },
  sections: {
    deployment: {
      status: mainnet.status || "UNKNOWN",
      contracts: contractCount,
      page: "/mainnet",
      api: "/api/public/mainnet"
    },
    live: {
      status: live.liveStatus || live.status || "UNKNOWN",
      page: "/live",
      api: "/api/public/live"
    },
    launch: {
      status: launch.status || "UNKNOWN",
      page: "/launch",
      api: "/api/public/launch"
    },
    stabilization: {
      status: stabilization.status || "PENDING_24H_WINDOW",
      page: "/stabilization",
      api: "/api/public/stabilization"
    },
    monitoring: {
      status: monitor.status || "UNKNOWN",
      eventStatus: events.status || "UNKNOWN",
      page: "/monitor",
      eventsPage: "/mainnet-events"
    },
    alerts: {
      status: alerts.status || "UNKNOWN",
      responseRequired: alertResponseRequired,
      page: "/alerts"
    },
    incidents: {
      status: incidents.status || "UNKNOWN",
      active: activeIncidents,
      page: "/incidents"
    },
    restrictions: {
      status: restrictedOps.mode || "UNKNOWN",
      executionQueue: execution.mode || "UNKNOWN",
      page: "/restricted-operations",
      executionPage: "/mainnet-execution"
    },
    token: {
      status: token.status || "UNKNOWN",
      symbol: token.symbol || "ASTP",
      address: token.address || "",
      page: "/token",
      walletPage: "/wallet",
      brandPage: "/brand",
      marketPage: "/market"
    },
    roadmap: {
      status: roadmap.status || "UNKNOWN",
      page: "/roadmap"
    },
    evidence: {
      snapshots: evidence.snapshotCount || 0,
      page: "/evidence"
    }
  },
  checks,
  failures,
  restrictions: {
    publicTokenSale: false,
    realTreasuryFunding: false,
    stakingOrRewards: false,
    buybackProgram: false,
    autonomousExecution: false,
    mainnetExecutionQueue: false,
    paperToOnchainAutomation: false
  }
};

fs.writeFileSync(publicJsonFile, JSON.stringify(status, null, 2) + "\n");

const statusRows = [
  ["Deployment", mainnet.status || "Base Mainnet deployed", "/mainnet"],
  ["Restricted launch", launch.status || "UNKNOWN", "/launch"],
  ["Live status", live.liveStatus || live.status || "UNKNOWN", "/live"],
  ["Operational monitor", monitor.status || "UNKNOWN", "/monitor"],
  ["Event monitor", events.status || "UNKNOWN", "/mainnet-events"],
  ["Alerts", alerts.status || "UNKNOWN", "/alerts"],
  ["Incidents", activeIncidents === 0 ? "NO_ACTIVE_INCIDENTS" : "ACTIVE_INCIDENTS_PRESENT", "/incidents"],
  ["Execution queue", execution.mode || "UNKNOWN", "/mainnet-execution"],
  ["Restricted operations", restrictedOps.mode || "UNKNOWN", "/restricted-operations"],
  ["Token metadata", token.status || "UNKNOWN", "/token"],
  ["Market data", market.status || "UNKNOWN", "/market"],
  ["Roadmap", roadmap.status || "UNKNOWN", "/roadmap"],
  ["Evidence archive", `${evidence.snapshotCount || 0} snapshots`, "/evidence"]
];

const statusTableRows = statusRows.map(([label, value, href]) => {
  return `<tr>
<td>${escapeHtml(label)}</td>
<td><span class="${tone(value)}">${escapeHtml(humanize(value))}</span></td>
<td><a href="${escapeHtml(href)}">View</a></td>
</tr>`;
}).join("");

const checkRows = checks.map((item) => {
  return `<tr>
<td>${escapeHtml(item.name)}</td>
<td><span class="${item.pass ? "ok" : "danger"}">${item.pass ? "PASS" : "FAIL"}</span></td>
</tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Trust Center</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #08111f;
      --surface: #0e1a2b;
      --surface-2: #111f33;
      --border: rgba(148, 163, 184, 0.2);
      --text: #edf4fb;
      --muted: #9aaec4;
      --blue: #67a7ff;
      --green: #41d49b;
      --yellow: #f4c35f;
      --red: #f87171;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    body {
      margin: 0;
      background: linear-gradient(180deg, #07101d, var(--bg));
      color: var(--text);
    }

    a { color: var(--blue); text-decoration: none; }

    main {
      width: min(1120px, calc(100% - 40px));
      margin: 0 auto;
      padding: 44px 0 72px;
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 28px;
      box-shadow: 0 22px 70px rgba(0,0,0,.28);
      margin-bottom: 18px;
    }

    h1 {
      margin: 0 0 10px;
      font-size: 42px;
      letter-spacing: -1.2px;
    }

    h2 {
      margin: 0 0 14px;
      font-size: 24px;
      letter-spacing: -0.5px;
    }

    p {
      color: var(--muted);
      line-height: 1.65;
    }

    .hero {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: flex-start;
    }

    .badge {
      display: inline-flex;
      padding: 8px 12px;
      border-radius: 999px;
      font-weight: 850;
      font-size: 13px;
      background: rgba(65, 212, 155, .10);
      border: 1px solid rgba(65, 212, 155, .22);
      color: var(--green);
      white-space: nowrap;
    }

    .stats {
      margin-top: 24px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
    }

    .stat {
      border: 1px solid var(--border);
      border-radius: 18px;
      background: rgba(255,255,255,.03);
      padding: 18px;
    }

    .label {
      color: var(--muted);
      font-size: 13px;
      margin-bottom: 8px;
    }

    .value {
      font-size: 24px;
      font-weight: 850;
    }

    .ok { color: var(--green); }
    .warn { color: var(--yellow); }
    .danger { color: var(--red); }

    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--border);
      border-radius: 18px;
      overflow: hidden;
    }

    th, td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
      text-align: left;
      vertical-align: top;
    }

    th {
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .08em;
      background: rgba(255,255,255,.03);
    }

    tr:last-child td {
      border-bottom: 0;
    }

    .notice {
      padding: 16px;
      border-radius: 16px;
      background: rgba(244,195,95,.08);
      border: 1px solid rgba(244,195,95,.22);
      color: #f7d99a;
      line-height: 1.6;
    }

    @media (max-width: 840px) {
      .hero {
        flex-direction: column;
      }

      .stats {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
<main>
  <section class="card">
    <div class="hero">
      <div>
        <h1>AstraTreasury Trust Center</h1>
        <p>
          A centralized public view of deployment status, monitoring, alerts, incidents,
          evidence, token metadata, restricted operations, and future capability governance.
        </p>
      </div>
      <div class="badge">${escapeHtml(humanize(status.status))}</div>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="label">Checks</div>
        <div class="value ${failures.length === 0 ? "ok" : "warn"}">${status.summary.passed}/${status.summary.totalChecks}</div>
      </div>
      <div class="stat">
        <div class="label">Contracts</div>
        <div class="value">${contractCount}</div>
      </div>
      <div class="stat">
        <div class="label">Active incidents</div>
        <div class="value ${activeIncidents === 0 ? "ok" : "warn"}">${activeIncidents}</div>
      </div>
      <div class="stat">
        <div class="label">Evidence snapshots</div>
        <div class="value">${evidence.snapshotCount || 0}</div>
      </div>
    </div>
  </section>

  <section class="card">
    <h2>Status overview</h2>
    <table>
      <thead>
        <tr><th>Area</th><th>Status</th><th>Link</th></tr>
      </thead>
      <tbody>${statusTableRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Trust checks</h2>
    <table>
      <thead>
        <tr><th>Check</th><th>Status</th></tr>
      </thead>
      <tbody>${checkRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Important restrictions</h2>
    <div class="notice">
      Public token sale, real treasury funding, staking/rewards, buybacks, autonomous execution,
      paper-to-on-chain automation, and mainnet execution queue activation remain disabled.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/trust">/api/public/trust</a></p>
    <p><a href="/transparency">Transparency index</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

const md = [
  "# AstraTreasury Trust Center",
  "",
  `Status: ${status.status}`,
  "",
  status.publicStatement,
  "",
  "## Checks",
  "",
  ...checks.map((item) => `- ${item.name}: ${item.pass ? "PASS" : "FAIL"}`),
  "",
  "## Restrictions",
  "",
  "- Public token sale: disabled",
  "- Real treasury funding: disabled",
  "- Staking/rewards: disabled",
  "- Buyback program: disabled",
  "- Autonomous execution: disabled",
  "- Mainnet execution queue: disabled",
  "- Paper-to-on-chain automation: disabled"
];

fs.writeFileSync(publicDocFile, md.join("\n") + "\n");

console.log("AstraTreasury Trust Center");
console.log("==========================");
console.log(`Status: ${status.status}`);
console.log(`Checks passed: ${status.summary.passed}/${status.summary.totalChecks}`);
console.log(`Wrote ${publicHtmlFile}`);
console.log(`Wrote ${publicJsonFile}`);
