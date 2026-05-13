import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const configFile = path.join(root, "configs", "legal-full-launch-review.config.json");
const fullLaunchFile = path.join(root, "public-docs", "full-launch-status.json");
const stabilizationFile = path.join(root, "public-docs", "stabilization-status.json");
const trustFile = path.join(root, "public-docs", "trust-status.json");

const reportDir = path.join(root, "reports", "legal-full-launch");
const reportFile = path.join(reportDir, "legal-full-launch-status.json");

const publicJsonFile = path.join(root, "public-docs", "legal-full-launch-status.json");
const publicHtmlFile = path.join(root, "public-docs", "legal-full-launch.html");

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

function humanize(value) {
  return String(value || "UNKNOWN")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function check(checks, name, pass, details = {}) {
  checks.push({ name, pass: Boolean(pass), details });
}

const config = readJson(configFile);
const fullLaunch = readJson(fullLaunchFile);
const stabilization = readJson(stabilizationFile);
const trust = readJson(trustFile);

const checks = [];

check(checks, "Restricted launch stabilized", stabilization.status === "RESTRICTED_LAUNCH_STABILIZED", {
  status: stabilization.status || "UNKNOWN"
});

check(checks, "Full launch readiness track exists", Boolean(fullLaunch.status), {
  status: fullLaunch.status || "UNKNOWN"
});

check(checks, "Trust Center ready", trust.status === "TRUST_CENTER_READY", {
  status: trust.status || "UNKNOWN"
});

check(checks, "Legal full launch not yet approved", config.legalFullLaunchApproved === false, {
  legalFullLaunchApproved: config.legalFullLaunchApproved
});

check(checks, "Full launch not yet approved", config.fullLaunchApproved === false, {
  fullLaunchApproved: config.fullLaunchApproved
});

for (const [key, value] of Object.entries(config.capabilityApprovals || {})) {
  check(checks, `Capability remains not approved: ${key}`, value === false, { value });
}

const reviewAreas = config.requiredLegalReviewAreas || {};
for (const [key, value] of Object.entries(reviewAreas)) {
  check(checks, `Legal review pending: ${key}`, value === "PENDING_COUNSEL_REVIEW", { value });
}

const failures = checks.filter((item) => !item.pass);

const status = failures.length === 0
  ? "LEGAL_FULL_LAUNCH_REVIEW_OPEN_NOT_APPROVED"
  : "LEGAL_FULL_LAUNCH_REVIEW_REQUIRES_ATTENTION";

const report = {
  schema: "astra-legal-full-launch-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  legalFullLaunchApproved: false,
  fullLaunchApproved: false,
  network: {
    name: "Base Mainnet",
    chainId: 8453
  },
  publicStatement:
    "AstraTreasury legal full-launch review is open. Full launch and restricted capabilities are not approved.",
  summary: {
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
    reviewAreas: Object.keys(reviewAreas).length,
    pendingReviewAreas: Object.values(reviewAreas).filter((value) => value === "PENDING_COUNSEL_REVIEW").length
  },
  reviewAreas,
  capabilityApprovals: config.capabilityApprovals || {},
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
  },
  safety: {
    sendsTransactions: false,
    movesFunds: false,
    enablesExecution: false,
    approvesPublicSale: false,
    approvesTreasuryFunding: false
  }
};

writeJson(reportFile, report);

writeJson(publicJsonFile, {
  schema: "astra-public-legal-full-launch-status-v0.1",
  generatedAt: report.generatedAt,
  status: report.status,
  currentApprovedMode: report.currentApprovedMode,
  legalFullLaunchApproved: report.legalFullLaunchApproved,
  fullLaunchApproved: report.fullLaunchApproved,
  network: report.network,
  publicStatement: report.publicStatement,
  summary: report.summary,
  reviewAreas: report.reviewAreas,
  capabilityApprovals: report.capabilityApprovals,
  restrictions: report.restrictions,
  failures: report.failures
});

const reviewRows = Object.entries(reviewAreas).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(humanize(value))}</td></tr>`;
}).join("");

const capabilityRows = Object.entries(report.capabilityApprovals).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${value ? "Approved" : "Not approved"}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Legal Full-Launch Review</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #08111f;
      --surface: #0e1a2b;
      --border: rgba(148, 163, 184, 0.2);
      --text: #edf4fb;
      --muted: #9aaec4;
      --blue: #67a7ff;
      --yellow: #f4c35f;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    body { margin: 0; background: linear-gradient(180deg, #07101d, var(--bg)); color: var(--text); }
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

    h1 { margin: 0 0 10px; font-size: 42px; letter-spacing: -1.2px; }
    h2 { margin: 0 0 14px; font-size: 24px; }
    p { color: var(--muted); line-height: 1.65; }

    .badge {
      display: inline-flex;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(244,195,95,.08);
      border: 1px solid rgba(244,195,95,.22);
      color: var(--yellow);
      font-weight: 850;
      margin-bottom: 16px;
    }

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

    tr:last-child td { border-bottom: 0; }

    .notice {
      padding: 16px;
      border-radius: 16px;
      background: rgba(244,195,95,.08);
      border: 1px solid rgba(244,195,95,.22);
      color: #f7d99a;
      line-height: 1.6;
    }
  </style>
</head>
<body>
<main>
  <section class="card">
    <div class="badge">Legal review open · not approved</div>
    <h1>Legal Full-Launch Review</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
  </section>

  <section class="card">
    <h2>Review areas</h2>
    <table>
      <thead><tr><th>Area</th><th>Status</th></tr></thead>
      <tbody>${reviewRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Capability approvals</h2>
    <table>
      <thead><tr><th>Capability</th><th>Status</th></tr></thead>
      <tbody>${capabilityRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Important</h2>
    <div class="notice">
      This legal review package does not approve full launch, public token sale, treasury funding,
      staking/rewards, buybacks, autonomous execution, paper-to-on-chain automation, or execution queue activation.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/legal-full-launch">/api/public/legal-full-launch</a></p>
    <p><a href="/full-launch">Full launch readiness</a></p>
    <p><a href="/roadmap">Capability roadmap</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Legal Full-Launch Review");
console.log("======================================");
console.log(`Status: ${report.status}`);
console.log(`Checks passed: ${report.summary.passed}/${report.summary.totalChecks}`);
console.log(`Pending review areas: ${report.summary.pendingReviewAreas}/${report.summary.reviewAreas}`);
console.log(`Report: ${reportFile}`);

if (failures.length > 0) {
  console.table(failures.map((item) => ({
    name: item.name,
    details: JSON.stringify(item.details).slice(0, 240)
  })));
  process.exit(1);
}
