import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const configFile = path.join(root, "configs", "capability-roadmap.config.json");
const restrictedStatusFile = path.join(root, "public-docs", "restricted-operations-status.json");
const executionStatusFile = path.join(root, "public-docs", "mainnet-execution-status.json");
const launchStatusFile = path.join(root, "public-docs", "restricted-launch-status.json");

const reportDir = path.join(root, "reports", "capability-roadmap");
const reportFile = path.join(reportDir, "capability-roadmap-status.json");

const publicJsonFile = path.join(root, "public-docs", "capability-roadmap-status.json");
const publicHtmlFile = path.join(root, "public-docs", "roadmap.html");

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

const config = readJson(configFile);
const restrictedStatus = readJson(restrictedStatusFile);
const executionStatus = readJson(executionStatusFile);
const launchStatus = readJson(launchStatusFile);

const capabilities = config.capabilities || {};

const checks = [];

function check(name, pass, details = {}) {
  checks.push({ name, pass: Boolean(pass), details });
}

check("restricted launch status ready or active", ["RESTRICTED_LAUNCH_READY", "RESTRICTED_LAUNCH_REVIEW_REQUIRED"].includes(String(launchStatus.status || "")), {
  status: launchStatus.status || "UNKNOWN"
});

check("mainnet execution queue disabled", executionStatus.mode === "MAINNET_EXECUTION_QUEUE_DISABLED", {
  mode: executionStatus.mode || "UNKNOWN"
});

for (const [key, capability] of Object.entries(capabilities)) {
  check(`capability disabled: ${key}`, capability.status === "DISABLED", {
    status: capability.status
  });
}

const restrictedFlags = restrictedStatus.restrictedCapabilities || {};

for (const [key, value] of Object.entries(restrictedFlags)) {
  check(`restricted flag false: ${key}`, value === false, {
    value
  });
}

const failures = checks.filter((item) => !item.pass);

const status = {
  schema: "astra-capability-roadmap-status-v0.1",
  generatedAt: new Date().toISOString(),
  status: failures.length === 0 ? "CAPABILITY_ROADMAP_READY" : "CAPABILITY_ROADMAP_REVIEW_REQUIRED",
  mode: "PLANNING_ONLY_NO_CAPABILITY_ENABLED",
  network: {
    name: "Base Mainnet",
    chainId: 8453
  },
  publicStatement:
    "AstraTreasury future capabilities are documented as separate approval tracks. Public sale, real treasury funding, staking/rewards, buybacks, autonomous execution, and mainnet execution queue activation remain disabled.",
  summary: {
    capabilityCount: Object.keys(capabilities).length,
    disabledCapabilities: Object.values(capabilities).filter((item) => item.status === "DISABLED").length,
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length
  },
  capabilities,
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

writeJson(reportFile, status);

writeJson(publicJsonFile, {
  schema: "astra-public-capability-roadmap-status-v0.1",
  generatedAt: status.generatedAt,
  status: status.status,
  mode: status.mode,
  network: status.network,
  publicStatement: status.publicStatement,
  summary: status.summary,
  capabilities: status.capabilities,
  restrictions: status.restrictions,
  failures: status.failures
});

const rows = Object.entries(capabilities).map(([key, capability]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(capability.status)}</td><td>${escapeHtml(capability.riskLevel)}</td><td>${escapeHtml((capability.requiredApprovals || []).join(" | "))}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Capability Roadmap</title>
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
  <h1>AstraTreasury Capability Roadmap</h1>
  <div class="muted">Planning-only roadmap. No capability is enabled by this page.</div>
</header>
<main>
  <section class="card">
    <h2>Status</h2>
    <div class="big">${escapeHtml(status.status)}</div>
    <p>${escapeHtml(status.publicStatement)}</p>
  </section>

  <section class="card">
    <h2>Capabilities</h2>
    <table>
      <thead><tr><th>Capability</th><th>Status</th><th>Risk</th><th>Required approvals</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/roadmap">/api/public/roadmap</a></p>
    <p><a href="/stabilization">Restricted launch stabilization</a></p>
    <p><a href="/">Back to public site</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Capability Roadmap");
console.log("================================");
console.log(`Status: ${status.status}`);
console.log(`Disabled capabilities: ${status.summary.disabledCapabilities}/${status.summary.capabilityCount}`);
console.log(`Report: ${reportFile}`);

if (failures.length > 0) {
  console.table(failures.map((item) => ({ name: item.name, details: JSON.stringify(item.details) })));
  process.exit(1);
}
