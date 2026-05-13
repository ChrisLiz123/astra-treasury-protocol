import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const files = {
  config: "configs/public-disclosure-update.config.json",
  fullLaunch: "public-docs/full-launch-status.json",
  legalFullLaunch: "public-docs/legal-full-launch-status.json",
  treasuryFunding: "public-docs/treasury-funding-status.json",
  executionDryRun: "public-docs/execution-dry-run-status.json",
  restrictedOps: "public-docs/restricted-operations-status.json",
  mainnetExecution: "public-docs/mainnet-execution-status.json",
  trust: "public-docs/trust-status.json",
  market: "public-docs/market-status.json",
  token: "public-docs/token-status.json"
};

const reportDir = path.join(root, "reports", "disclosures");
const reportFile = path.join(reportDir, "public-disclosure-update-status.json");

const publicJsonFile = path.join(root, "public-docs", "disclosures-status.json");
const publicHtmlFile = path.join(root, "public-docs", "disclosures.html");

fs.mkdirSync(reportDir, { recursive: true });
fs.mkdirSync(path.dirname(publicJsonFile), { recursive: true });

function readJson(relativePath, fallback = {}) {
  const full = path.join(root, relativePath);

  try {
    if (!fs.existsSync(full)) return fallback;
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch (error) {
    return { error: error.message };
  }
}

function readText(relativePath, fallback = "") {
  const full = path.join(root, relativePath);

  try {
    if (!fs.existsSync(full)) return fallback;
    return fs.readFileSync(full, "utf8");
  } catch {
    return fallback;
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

function markdownToHtml(text) {
  return text
    .split(/\r?\n/)
    .map((line) => {
      if (line.startsWith("# ")) return `<h1>${escapeHtml(line.slice(2))}</h1>`;
      if (line.startsWith("## ")) return `<h2>${escapeHtml(line.slice(3))}</h2>`;
      if (line.startsWith("- ")) return `<li>${escapeHtml(line.slice(2))}</li>`;
      if (!line.trim()) return "";
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join("\n")
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>\n${match}</ul>\n`);
}

const config = readJson(files.config);
const fullLaunch = readJson(files.fullLaunch);
const legalFullLaunch = readJson(files.legalFullLaunch);
const treasuryFunding = readJson(files.treasuryFunding);
const executionDryRun = readJson(files.executionDryRun);
const restrictedOps = readJson(files.restrictedOps);
const mainnetExecution = readJson(files.mainnetExecution);
const trust = readJson(files.trust);
const market = readJson(files.market);
const token = readJson(files.token);

const checks = [];

check(checks, "Trust Center ready", trust.status === "TRUST_CENTER_READY", {
  status: trust.status || "UNKNOWN"
});

check(checks, "Full launch not approved", fullLaunch.fullLaunchApproved === false, {
  fullLaunchApproved: fullLaunch.fullLaunchApproved
});

check(checks, "Legal full-launch not approved", legalFullLaunch.legalFullLaunchApproved === false, {
  legalFullLaunchApproved: legalFullLaunch.legalFullLaunchApproved
});

check(checks, "Treasury funding not approved", treasuryFunding.treasuryFundingApproved === false, {
  treasuryFundingApproved: treasuryFunding.treasuryFundingApproved
});

check(checks, "Execution dry run passed in disabled mode", executionDryRun.status === "EXECUTION_QUEUE_DRY_RUN_V2_PASS_DISABLED_MODE", {
  status: executionDryRun.status || "UNKNOWN"
});

check(checks, "Mainnet execution queue disabled", mainnetExecution.mode === "MAINNET_EXECUTION_QUEUE_DISABLED", {
  mode: mainnetExecution.mode || "UNKNOWN"
});

check(checks, "Restricted operations active", restrictedOps.mode === "MAINNET_RESTRICTED_OPERATION", {
  mode: restrictedOps.mode || "UNKNOWN"
});

check(checks, "Token metadata published", Boolean(token.address && token.logoURI), {
  address: token.address || "",
  logoURI: token.logoURI || ""
});

check(checks, "Public disclosures not final-approved", config.publicDisclosuresApproved === false, {
  publicDisclosuresApproved: config.publicDisclosuresApproved
});

for (const [key, value] of Object.entries(config.capabilityApprovals || {})) {
  check(checks, `Capability remains not approved: ${key}`, value === false, { value });
}

const failures = checks.filter((item) => !item.pass);

const status = failures.length === 0
  ? "PUBLIC_DISCLOSURE_UPDATE_DRAFT_READY_NOT_APPROVED"
  : "PUBLIC_DISCLOSURE_UPDATE_REVIEW_REQUIRED";

const disclosureStatement = readText("docs/disclosures/CURRENT_PUBLIC_DISCLOSURE_STATEMENT.md");
const riskDisclosure = readText("docs/disclosures/RISK_DISCLOSURE_DRAFT.md");

const report = {
  schema: "astra-public-disclosure-update-status-v0.1",
  generatedAt: new Date().toISOString(),
  status,
  currentApprovedMode: "restricted-mainnet-operation",
  publicDisclosuresApproved: false,
  fullLaunchApproved: false,
  network: {
    name: "Base Mainnet",
    chainId: 8453
  },
  publicStatement:
    "AstraTreasury public disclosure update is drafted for review. Full launch and restricted capabilities are not approved.",
  summary: {
    totalChecks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
    disclosureAreas: Object.keys(config.requiredDisclosureAreas || {}).length,
    prohibitedClaims: (config.prohibitedClaims || []).length
  },
  requiredDisclosureAreas: config.requiredDisclosureAreas || {},
  capabilityApprovals: config.capabilityApprovals || {},
  currentStatuses: {
    fullLaunch: fullLaunch.status || "UNKNOWN",
    legalFullLaunch: legalFullLaunch.status || "UNKNOWN",
    treasuryFunding: treasuryFunding.status || "UNKNOWN",
    executionDryRun: executionDryRun.status || "UNKNOWN",
    restrictedOperations: restrictedOps.mode || "UNKNOWN",
    mainnetExecution: mainnetExecution.mode || "UNKNOWN",
    market: market.status || "UNKNOWN",
    token: token.status || "UNKNOWN"
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
  schema: "astra-public-disclosures-status-v0.1",
  generatedAt: report.generatedAt,
  status: report.status,
  currentApprovedMode: report.currentApprovedMode,
  publicDisclosuresApproved: report.publicDisclosuresApproved,
  fullLaunchApproved: report.fullLaunchApproved,
  network: report.network,
  publicStatement: report.publicStatement,
  summary: report.summary,
  requiredDisclosureAreas: report.requiredDisclosureAreas,
  currentStatuses: report.currentStatuses,
  restrictions: report.restrictions,
  failures: report.failures,
  currentDisclosureStatement: disclosureStatement,
  riskDisclosureDraft: riskDisclosure
});

const statusRows = Object.entries(report.currentStatuses).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(humanize(value))}</td></tr>`;
}).join("");

const disclosureRows = Object.entries(report.requiredDisclosureAreas).map(([key, value]) => {
  return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(humanize(value))}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Public Disclosures</title>
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
    p, li { color: var(--muted); line-height: 1.65; }

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
    <div class="badge">Drafted for review · not final approved</div>
    <h1>Public Disclosures</h1>
    <p>${escapeHtml(report.publicStatement)}</p>
  </section>

  <section class="card">
    ${markdownToHtml(disclosureStatement)}
  </section>

  <section class="card">
    <h2>Current statuses</h2>
    <table>
      <thead><tr><th>Area</th><th>Status</th></tr></thead>
      <tbody>${statusRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Disclosure areas</h2>
    <table>
      <thead><tr><th>Area</th><th>Status</th></tr></thead>
      <tbody>${disclosureRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Risk disclosure draft</h2>
    ${markdownToHtml(riskDisclosure)}
  </section>

  <section class="card">
    <h2>Important</h2>
    <div class="notice">
      This disclosure update does not approve full launch, public token sale, treasury funding,
      staking/rewards, buybacks, autonomous execution, paper-to-on-chain automation, or execution queue activation.
    </div>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/disclosures">/api/public/disclosures</a></p>
    <p><a href="/full-launch">Full launch readiness</a></p>
    <p><a href="/legal-full-launch">Legal full-launch review</a></p>
    <p><a href="/">Back to homepage</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(publicHtmlFile, html + "\n");

console.log("AstraTreasury Public Disclosure Update");
console.log("======================================");
console.log(`Status: ${report.status}`);
console.log(`Checks passed: ${report.summary.passed}/${report.summary.totalChecks}`);
console.log(`Disclosure areas: ${report.summary.disclosureAreas}`);
console.log(`Report: ${reportFile}`);

if (failures.length > 0) {
  console.table(failures.map((item) => ({
    name: item.name,
    details: JSON.stringify(item.details).slice(0, 240)
  })));
  process.exit(1);
}
