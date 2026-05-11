import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const publicDocsDir = path.join(root, "public-docs");

fs.mkdirSync(publicDocsDir, { recursive: true });

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return {
      error: error.message
    };
  }
}

function fileStatus(file) {
  const full = path.join(root, file);

  if (!fs.existsSync(full)) {
    return {
      file,
      exists: false,
      sizeBytes: 0
    };
  }

  const stat = fs.statSync(full);

  return {
    file,
    exists: true,
    sizeBytes: stat.size,
    modifiedAt: stat.mtime.toISOString()
  };
}

function run(command, fallback = "") {
  try {
    return execSync(command, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return fallback;
  }
}

function githubUrlFromRemote(remote) {
  if (!remote) return null;

  if (remote.startsWith("git@github.com:")) {
    return "https://github.com/" + remote.replace("git@github.com:", "").replace(/\.git$/, "");
  }

  if (remote.startsWith("https://github.com/")) {
    return remote.replace(/\.git$/, "");
  }

  return remote;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  }[ch]));
}

const manifest = readJson(path.join(root, "deployments", "base-sepolia.public.json"), null);
const auditStatus = readJson(path.join(root, "public-docs", "audit-status.json"), null);
const governanceStatus = readJson(path.join(root, "public-docs", "governance-status.json"), null);

const remote = run("git config --get remote.origin.url", "");
const githubUrl = githubUrlFromRemote(remote);
const commit = run("git rev-parse HEAD", "");
const shortCommit = run("git rev-parse --short HEAD", "");
const branch = run("git rev-parse --abbrev-ref HEAD", "");

const contracts = manifest?.contracts
  ? Object.entries(manifest.contracts).map(([name, address]) => ({
      name,
      address,
      explorerUrl: `https://sepolia.basescan.org/address/${address}`
    }))
  : [];

const reviewPackages = [
  "release/astra-treasury-protocol-v0.1-public-testnet-source.tar.gz",
  "release/astra-treasury-protocol-v0.1.1-audit-candidate.tar.gz",
  "release/astra-treasury-protocol-v0.1.1-external-review.tar.gz",
  "release/astra-treasury-protocol-v0.1.1-audit-intake.tar.gz",
  "release/astra-treasury-protocol-v0.1.1-audit-outreach.tar.gz",
  "release/astra-treasury-protocol-v0.1.1-auditor-selection.tar.gz",
  "release/astra-treasury-protocol-v0.1.1-auditor-selection-execution.tar.gz",
  "release/astra-treasury-protocol-v0.1.1-audit-kickoff.tar.gz",
  "release/astra-treasury-protocol-v0.1.1-remediation-tracker.tar.gz",
  "release/astra-treasury-protocol-v0.1.1-mainnet-planning.tar.gz",
  "release/astra-treasury-protocol-v0.1.1-mainnet-runbook.tar.gz",
  "release/astra-treasury-protocol-v0.1.1-safe-planning.tar.gz",
  "release/astra-treasury-protocol-v0.1.1-incident-response.tar.gz",
  "release/astra-treasury-protocol-v0.1.1-governance-gate.tar.gz",
  "release/astra-treasury-protocol-v0.1.1-public-audit-page.tar.gz",
  "release/astra-treasury-protocol-v0.1.1-public-governance-page.tar.gz"
];

const publicDocs = [
  "public-docs/README.md",
  "public-docs/contracts.md",
  "public-docs/safety-workflow.md",
  "public-docs/dashboard-api.md",
  "public-docs/verification.md",
  "public-docs/audit.html",
  "public-docs/audit-status.json",
  "public-docs/governance.html",
  "public-docs/governance-status.json"
];

const status = {
  schema: "astra-public-transparency-status-v0.1",
  generatedAt: new Date().toISOString(),
  project: "AstraTreasury Protocol",
  version: manifest?.version || "0.1.1",
  network: {
    name: manifest?.network?.name || "Base Sepolia",
    chainId: manifest?.network?.chainId || 84532,
    explorer: "https://sepolia.basescan.org"
  },
  publicSite: {
    root: "https://astratreasury.ai",
    www: "https://www.astratreasury.ai",
    pages: {
      home: "/",
      audit: "/audit",
      governance: "/governance",
      transparency: "/transparency"
    }
  },
  repository: {
    remote,
    githubUrl,
    branch,
    commit,
    shortCommit
  },
  safetyStatus: {
    testnetOnly: true,
    mainnetLaunched: false,
    realTreasuryFunds: false,
    publicTokenSale: false,
    investmentProduct: false,
    mainnetBlocked: true,
    mainnetBlockReason:
      governanceStatus?.mainnet?.blockReason ||
      governanceStatus?.governanceGate?.gateReason ||
      "Mainnet remains blocked pending external audit, legal review, Safe finalization, production infrastructure, incident-response rehearsal, and go/no-go approval."
  },
  contracts,
  audit: {
    status: auditStatus?.auditReadiness?.status || "UNKNOWN",
    findings: auditStatus?.findings || null,
    api: "/api/public/audit",
    page: "/audit"
  },
  governance: {
    gateStatus: governanceStatus?.governanceGate?.gateStatus || "BLOCKING_MAINNET",
    requiredCompletion: governanceStatus?.requiredCompletion || null,
    api: "/api/public/governance",
    page: "/governance"
  },
  packages: reviewPackages.map(fileStatus),
  publicDocs: publicDocs.map(fileStatus),
  publicStatement:
    "AstraTreasury is a Base Sepolia testnet prototype. Mainnet remains blocked pending external audit, legal review, Safe finalization, production infrastructure, incident-response rehearsal, and go/no-go approval."
};

fs.writeFileSync(
  path.join(publicDocsDir, "transparency-status.json"),
  JSON.stringify(status, null, 2) + "\n"
);

const contractRows = status.contracts.length === 0
  ? "<tr><td colspan=\"3\">No contracts found in public manifest.</td></tr>"
  : status.contracts.map((contract) => {
      return `<tr><td>${escapeHtml(contract.name)}</td><td><code>${escapeHtml(contract.address)}</code></td><td><a target="_blank" rel="noreferrer" href="${escapeHtml(contract.explorerUrl)}">BaseScan</a></td></tr>`;
    }).join("");

const packageRows = status.packages.map((pkg) => {
  return `<tr><td>${escapeHtml(pkg.file)}</td><td>${pkg.exists ? "yes" : "no"}</td><td>${escapeHtml(pkg.sizeBytes)}</td></tr>`;
}).join("");

const docsRows = status.publicDocs.map((doc) => {
  return `<tr><td>${escapeHtml(doc.file)}</td><td>${doc.exists ? "yes" : "no"}</td><td>${escapeHtml(doc.sizeBytes)}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Transparency Index</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #0d1117; color: #e6edf3; }
    header { padding: 32px; background: #010409; border-bottom: 1px solid #30363d; }
    main { padding: 24px 32px 56px; display: grid; gap: 18px; }
    h1 { margin: 0 0 8px; font-size: 30px; }
    h2 { margin-top: 0; color: #58a6ff; }
    a { color: #58a6ff; }
    .muted { color: #8b949e; overflow-wrap: anywhere; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 14px; padding: 18px; box-shadow: 0 12px 30px rgba(0,0,0,.2); }
    .big { font-size: 26px; font-weight: 700; }
    .ok { color: #3fb950; font-weight: 700; }
    .warn { color: #d29922; font-weight: 700; }
    .danger { color: #f85149; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; border-bottom: 1px solid #30363d; padding: 10px 8px; vertical-align: top; }
    th { color: #58a6ff; font-size: 13px; }
    td { font-size: 13px; overflow-wrap: anywhere; }
    code { background: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 2px 5px; }
  </style>
</head>
<body>
<header>
  <h1>AstraTreasury Transparency Index</h1>
  <div class="muted">Public transparency index. Sanitized and read-only.</div>
</header>

<main>
  <section class="grid">
    <div class="card">
      <h2>Network</h2>
      <div class="big">${escapeHtml(status.network.name)}</div>
      <div class="muted">Chain ID: ${escapeHtml(status.network.chainId)}</div>
    </div>

    <div class="card">
      <h2>Mainnet</h2>
      <div class="big danger">BLOCKED</div>
      <div class="muted">${escapeHtml(status.safetyStatus.mainnetBlockReason)}</div>
    </div>

    <div class="card">
      <h2>Audit</h2>
      <div class="big">${escapeHtml(status.audit.status)}</div>
      <div class="muted"><a href="/audit">Audit readiness</a> · <a href="/api/public/audit">API</a></div>
    </div>

    <div class="card">
      <h2>Governance</h2>
      <div class="big danger">${escapeHtml(status.governance.gateStatus)}</div>
      <div class="muted"><a href="/governance">Governance gate</a> · <a href="/api/public/governance">API</a></div>
    </div>
  </section>

  <section class="card">
    <h2>Repository</h2>
    <p>Branch: <code>${escapeHtml(status.repository.branch)}</code></p>
    <p>Commit: <code>${escapeHtml(status.repository.shortCommit)}</code></p>
    <p>${status.repository.githubUrl ? `<a href="${escapeHtml(status.repository.githubUrl)}" target="_blank" rel="noreferrer">GitHub repository</a>` : "GitHub repository URL not detected."}</p>
  </section>

  <section class="card">
    <h2>Contracts</h2>
    <table>
      <thead><tr><th>Contract</th><th>Address</th><th>Explorer</th></tr></thead>
      <tbody>${contractRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Review Packages</h2>
    <table>
      <thead><tr><th>File</th><th>Exists locally</th><th>Size bytes</th></tr></thead>
      <tbody>${packageRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Public Docs</h2>
    <table>
      <thead><tr><th>File</th><th>Exists locally</th><th>Size bytes</th></tr></thead>
      <tbody>${docsRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Public Statement</h2>
    <p>${escapeHtml(status.publicStatement)}</p>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/transparency">/api/public/transparency</a></p>
    <p><a href="/">Back to public site</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(path.join(publicDocsDir, "transparency.html"), html + "\n");

console.log("Wrote public-docs/transparency-status.json");
console.log("Wrote public-docs/transparency.html");
