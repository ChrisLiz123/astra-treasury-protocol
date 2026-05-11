import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";

const root = process.cwd();
const publicDocsDir = path.join(root, "public-docs");

fs.mkdirSync(publicDocsDir, { recursive: true });

const packages = [
  {
    file: "release/astra-treasury-protocol-v0.1-public-testnet-source.tar.gz",
    title: "Public Testnet Source Package",
    category: "source",
    purpose: "Clean public source package for the v0.1 Base Sepolia testnet release."
  },
  {
    file: "release/astra-treasury-protocol-v0.1.1-audit-candidate.tar.gz",
    title: "Audit Candidate Package",
    category: "audit",
    purpose: "Audit candidate source and documentation package."
  },
  {
    file: "release/astra-treasury-protocol-v0.1.1-external-review.tar.gz",
    title: "External Review Package",
    category: "review",
    purpose: "Package for auditors and counsel."
  },
  {
    file: "release/astra-treasury-protocol-v0.1.1-audit-intake.tar.gz",
    title: "Audit Intake Package",
    category: "audit",
    purpose: "Auditor index, findings tracker, remediation workflow, and intake checklist."
  },
  {
    file: "release/astra-treasury-protocol-v0.1.1-audit-outreach.tar.gz",
    title: "Audit Outreach Package",
    category: "audit",
    purpose: "Auditor shortlist, scorecard, questionnaire, SOW checklist, and outreach log."
  },
  {
    file: "release/astra-treasury-protocol-v0.1.1-auditor-selection.tar.gz",
    title: "Auditor Selection Package",
    category: "audit",
    purpose: "Quote comparison, selection matrix, decision record, and audit-start checklist."
  },
  {
    file: "release/astra-treasury-protocol-v0.1.1-auditor-selection-execution.tar.gz",
    title: "Auditor Selection Execution Package",
    category: "audit",
    purpose: "Selected-auditor record, audit-start manifest, and kickoff references."
  },
  {
    file: "release/astra-treasury-protocol-v0.1.1-audit-kickoff.tar.gz",
    title: "Audit Kickoff Package",
    category: "audit",
    purpose: "Audit kickoff runbook, finding registry, remediation branch policy, and issue templates."
  },
  {
    file: "release/astra-treasury-protocol-v0.1.1-remediation-tracker.tar.gz",
    title: "Remediation Tracker Package",
    category: "audit",
    purpose: "Command-line audit findings and remediation tracker."
  },
  {
    file: "release/astra-treasury-protocol-v0.1.1-legal-review.tar.gz",
    title: "Legal Review Package",
    category: "legal",
    purpose: "Legal review execution package, marketing-language policy, legal issue tracker, and tokenomics checklist."
  },
  {
    file: "release/astra-treasury-protocol-v0.1.1-legal-counsel-selection.tar.gz",
    title: "Legal Counsel Selection Package",
    category: "legal",
    purpose: "Counsel outreach, scorecard, quote comparison, selection decision, and engagement checklist."
  },
  {
    file: "release/astra-treasury-protocol-v0.1.1-mainnet-planning.tar.gz",
    title: "Mainnet Planning Package",
    category: "mainnet-planning",
    purpose: "Mainnet architecture, Safe role plan, key-management plan, RPC plan, and go/no-go checklist."
  },
  {
    file: "release/astra-treasury-protocol-v0.1.1-mainnet-runbook.tar.gz",
    title: "Mainnet Dry-Run Runbook Package",
    category: "mainnet-planning",
    purpose: "Dry-run-only deployment runbook, constructor manifest, role-transfer checklist, rollback checklist."
  },
  {
    file: "release/astra-treasury-protocol-v0.1.1-safe-planning.tar.gz",
    title: "Safe Planning Package",
    category: "governance",
    purpose: "Safe multisig role-plan template, validator, and local Safe-style role-transfer dry run."
  },
  {
    file: "release/astra-treasury-protocol-v0.1.1-incident-response.tar.gz",
    title: "Incident Response Package",
    category: "operations",
    purpose: "Incident response, emergency pause drill, compromised signer runbook, RPC outage runbook, and monitoring checklist."
  },
  {
    file: "release/astra-treasury-protocol-v0.1.1-governance-gate.tar.gz",
    title: "Governance Gate Package",
    category: "governance",
    purpose: "Combined audit/legal governance gate, blocker register, signoff matrix, and mainnet-blocked status."
  },
  {
    file: "release/astra-treasury-protocol-v0.1.1-public-audit-page.tar.gz",
    title: "Public Audit Page Package",
    category: "public-site",
    purpose: "Public audit readiness page and API."
  },
  {
    file: "release/astra-treasury-protocol-v0.1.1-public-governance-page.tar.gz",
    title: "Public Governance Page Package",
    category: "public-site",
    purpose: "Public governance gate page and API."
  },
  {
    file: "release/astra-treasury-protocol-v0.1.1-public-transparency-index.tar.gz",
    title: "Public Transparency Index Package",
    category: "public-site",
    purpose: "Public transparency index page and API."
  },
  {
    file: "release/astra-treasury-protocol-v0.1.1-public-refresh.tar.gz",
    title: "Public Refresh Service Package",
    category: "operations",
    purpose: "Automated refresh loop for sanitized public audit, governance, and transparency pages."
  },
  {
    file: "release/astra-treasury-protocol-v0.1.1-evidence-archive.tar.gz",
    title: "Public Evidence Archive Package",
    category: "operations",
    purpose: "Automated evidence snapshots and public evidence archive page/API."
  },
  {
    file: "release/astra-treasury-protocol-v0.1.1-public-package-inventory.tar.gz",
    title: "Public Package Inventory Package",
    category: "public-site",
    purpose: "Public package manifest and release inventory page/API."
  }
];

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

function sha256(filePath) {
  const hash = createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function packageStatus(item) {
  const fullPath = path.join(root, item.file);

  if (!fs.existsSync(fullPath)) {
    return {
      ...item,
      exists: false,
      sizeBytes: 0,
      modifiedAt: null,
      sha256: null,
      uploadChecklist: "MISSING_LOCALLY"
    };
  }

  const stat = fs.statSync(fullPath);

  return {
    ...item,
    exists: true,
    sizeBytes: stat.size,
    modifiedAt: stat.mtime.toISOString(),
    sha256: sha256(fullPath),
    uploadChecklist: "READY_TO_UPLOAD_OR_ALREADY_UPLOADED"
  };
}

function countBy(items, key) {
  const out = {};

  for (const item of items) {
    const value = item[key] || "UNKNOWN";
    out[value] = (out[value] || 0) + 1;
  }

  return out;
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

const remote = run("git config --get remote.origin.url", "");
const commit = run("git rev-parse HEAD", "");
const shortCommit = run("git rev-parse --short HEAD", "");
const branch = run("git rev-parse --abbrev-ref HEAD", "");

const items = packages.map(packageStatus);

const status = {
  schema: "astra-public-package-inventory-v0.1",
  generatedAt: new Date().toISOString(),
  project: "AstraTreasury Protocol",
  version: "0.1.1",
  network: "Base Sepolia",
  mainnetLaunched: false,
  realTreasuryFunds: false,
  publicTokenSale: false,
  repository: {
    remote,
    githubUrl: githubUrlFromRemote(remote),
    branch,
    commit,
    shortCommit
  },
  summary: {
    total: items.length,
    existing: items.filter((item) => item.exists).length,
    missing: items.filter((item) => !item.exists).length,
    byCategory: countBy(items, "category")
  },
  packages: items,
  publicStatement:
    "These packages are review and transparency artifacts for a Base Sepolia testnet prototype. Mainnet remains blocked pending audit, legal review, Safe finalization, infrastructure readiness, incident-response rehearsal, and go/no-go approval."
};

fs.writeFileSync(
  path.join(root, "public-docs", "package-inventory.json"),
  JSON.stringify(status, null, 2) + "\n"
);

const rows = items.map((item) => {
  return `<tr>
<td>${escapeHtml(item.title)}</td>
<td>${escapeHtml(item.category)}</td>
<td>${item.exists ? "yes" : "no"}</td>
<td>${escapeHtml(item.sizeBytes)}</td>
<td><code>${escapeHtml(item.sha256 ? item.sha256.slice(0, 16) + "..." : "")}</code></td>
<td>${escapeHtml(item.purpose)}</td>
</tr>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Package Inventory</title>
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
  <h1>AstraTreasury Package Inventory</h1>
  <div class="muted">Public release and review package inventory. Sanitized and read-only.</div>
</header>

<main>
  <section class="grid">
    <div class="card">
      <h2>Total Packages</h2>
      <div class="big">${escapeHtml(status.summary.total)}</div>
      <div class="muted">Existing locally: ${escapeHtml(status.summary.existing)} | Missing: ${escapeHtml(status.summary.missing)}</div>
    </div>

    <div class="card">
      <h2>Mainnet</h2>
      <div class="big danger">BLOCKED</div>
      <div class="muted">No mainnet launch. No real treasury funds. No public token sale.</div>
    </div>

    <div class="card">
      <h2>Repository</h2>
      <div class="big"><code>${escapeHtml(shortCommit)}</code></div>
      <div class="muted">${status.repository.githubUrl ? `<a href="${escapeHtml(status.repository.githubUrl)}" target="_blank" rel="noreferrer">GitHub repository</a>` : "GitHub URL not detected."}</div>
    </div>
  </section>

  <section class="card">
    <h2>Packages</h2>
    <table>
      <thead>
        <tr>
          <th>Title</th>
          <th>Category</th>
          <th>Exists</th>
          <th>Size</th>
          <th>SHA-256</th>
          <th>Purpose</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/packages">/api/public/packages</a></p>
    <p><a href="/transparency">Transparency index</a></p>
    <p><a href="/evidence">Evidence archive</a></p>
    <p><a href="/">Back to public site</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(path.join(root, "public-docs", "packages.html"), html + "\n");

console.log("Wrote public-docs/package-inventory.json");
console.log("Wrote public-docs/packages.html");
