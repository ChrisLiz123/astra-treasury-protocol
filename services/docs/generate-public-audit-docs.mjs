import fs from "node:fs";
import path from "node:path";

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

function countBy(items, key) {
  const out = {};

  for (const item of items || []) {
    const value = item?.[key] || "UNKNOWN";
    out[value] = (out[value] || 0) + 1;
  }

  return out;
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

const findingsDb = readJson(path.join(root, "docs", "audit-remediation", "audit-findings.json"), {
  findings: []
});

const auditStartManifest = readJson(path.join(root, "docs", "audit-start", "audit-start-manifest.json"), null);

const findings = Array.isArray(findingsDb.findings) ? findingsDb.findings : [];

const packageFiles = [
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
  "release/astra-treasury-protocol-v0.1.1-incident-response.tar.gz"
];

const openFindings = findings.filter((finding) => {
  return !["FIX_VERIFIED", "WONT_FIX_ACCEPTED_RISK"].includes(String(finding.status || ""));
});

const criticalOrHighOpen = openFindings.filter((finding) => {
  return ["CRITICAL", "HIGH"].includes(String(finding.severity || ""));
});

const status = {
  schema: "astra-public-audit-status-v0.1",
  generatedAt: new Date().toISOString(),
  project: "AstraTreasury Protocol",
  version: "0.1.1",
  network: "Base Sepolia",
  publicSite: {
    root: "https://astratreasury.ai",
    www: "https://www.astratreasury.ai"
  },
  auditReadiness: {
    status: criticalOrHighOpen.length === 0 ? "READY_FOR_EXTERNAL_AUDIT" : "BLOCKED_BY_OPEN_HIGH_SEVERITY_FINDINGS",
    mainnetBlocked: true,
    mainnetBlockReason: "Mainnet remains blocked pending external audit, legal review, multisig finalization, production RPC setup, and go/no-go approval.",
    realTreasuryFunds: false,
    publicTokenSale: false,
    investmentProduct: false
  },
  findings: {
    total: findings.length,
    open: openFindings.length,
    criticalOrHighOpen: criticalOrHighOpen.length,
    byStatus: countBy(findings, "status"),
    bySeverity: countBy(findings, "severity"),
    items: findings.map((finding) => ({
      id: finding.id,
      source: finding.source,
      severity: finding.severity,
      title: finding.title,
      status: finding.status,
      owner: finding.owner,
      retestStatus: finding.retestStatus,
      notes: finding.notes
    }))
  },
  auditStart: {
    manifestExists: Boolean(auditStartManifest),
    manifest: auditStartManifest
  },
  packages: packageFiles.map(fileStatus),
  publicDocs: [
    "/docs/README.md",
    "/docs/contracts.md",
    "/docs/safety-workflow.md",
    "/docs/verification.md",
    "/audit",
    "/api/public/audit"
  ]
};

fs.writeFileSync(
  path.join(publicDocsDir, "audit-status.json"),
  JSON.stringify(status, null, 2) + "\n"
);

const packageRows = status.packages.map((pkg) => {
  return "<tr><td>" + escapeHtml(pkg.file) + "</td><td>" + (pkg.exists ? "yes" : "no") + "</td><td>" + escapeHtml(pkg.sizeBytes) + "</td></tr>";
}).join("");

const findingRows = status.findings.items.length === 0
  ? "<tr><td colspan=\"5\">No findings recorded.</td></tr>"
  : status.findings.items.map((finding) => {
      return "<tr><td>" + escapeHtml(finding.id) + "</td><td>" + escapeHtml(finding.severity) + "</td><td>" + escapeHtml(finding.status) + "</td><td>" + escapeHtml(finding.title) + "</td><td>" + escapeHtml(finding.retestStatus || "") + "</td></tr>";
    }).join("");

const html = [
  "<!doctype html>",
  "<html lang=\"en\">",
  "<head>",
  "  <meta charset=\"utf-8\" />",
  "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />",
  "  <title>AstraTreasury Audit Readiness</title>",
  "  <style>",
  "    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; }",
  "    body { margin: 0; background: #0d1117; color: #e6edf3; }",
  "    header { padding: 32px; background: #010409; border-bottom: 1px solid #30363d; }",
  "    main { padding: 24px 32px 56px; display: grid; gap: 18px; }",
  "    h1 { margin: 0 0 8px; font-size: 30px; }",
  "    h2 { margin-top: 0; color: #58a6ff; }",
  "    a { color: #58a6ff; }",
  "    .muted { color: #8b949e; overflow-wrap: anywhere; }",
  "    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; }",
  "    .card { background: #161b22; border: 1px solid #30363d; border-radius: 14px; padding: 18px; box-shadow: 0 12px 30px rgba(0,0,0,.2); }",
  "    .big { font-size: 26px; font-weight: 700; }",
  "    .ok { color: #3fb950; font-weight: 700; }",
  "    .warn { color: #d29922; font-weight: 700; }",
  "    .danger { color: #f85149; font-weight: 700; }",
  "    table { width: 100%; border-collapse: collapse; }",
  "    th, td { text-align: left; border-bottom: 1px solid #30363d; padding: 10px 8px; vertical-align: top; }",
  "    th { color: #58a6ff; font-size: 13px; }",
  "    td { font-size: 13px; overflow-wrap: anywhere; }",
  "    code { background: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 2px 5px; }",
  "  </style>",
  "</head>",
  "<body>",
  "<header>",
  "  <h1>AstraTreasury Audit Readiness</h1>",
  "  <div class=\"muted\">Public audit-readiness snapshot. Sanitized and read-only.</div>",
  "</header>",
  "<main>",
  "  <section class=\"grid\">",
  "    <div class=\"card\"><h2>Audit Status</h2><div class=\"big ok\">" + escapeHtml(status.auditReadiness.status) + "</div><div class=\"muted\">Generated " + escapeHtml(status.generatedAt) + "</div></div>",
  "    <div class=\"card\"><h2>Mainnet</h2><div class=\"big danger\">BLOCKED</div><div class=\"muted\">" + escapeHtml(status.auditReadiness.mainnetBlockReason) + "</div></div>",
  "    <div class=\"card\"><h2>Findings</h2><div class=\"big\">" + escapeHtml(status.findings.total) + "</div><div class=\"muted\">Open: " + escapeHtml(status.findings.open) + " | Critical/High open: " + escapeHtml(status.findings.criticalOrHighOpen) + "</div></div>",
  "    <div class=\"card\"><h2>Network</h2><div class=\"big\">Base Sepolia</div><div class=\"muted\">No mainnet launch. No real treasury funds.</div></div>",
  "  </section>",
  "  <section class=\"card\">",
  "    <h2>Findings</h2>",
  "    <table><thead><tr><th>ID</th><th>Severity</th><th>Status</th><th>Title</th><th>Retest</th></tr></thead><tbody>" + findingRows + "</tbody></table>",
  "  </section>",
  "  <section class=\"card\">",
  "    <h2>Review Packages</h2>",
  "    <table><thead><tr><th>File</th><th>Exists</th><th>Size bytes</th></tr></thead><tbody>" + packageRows + "</tbody></table>",
  "  </section>",
  "  <section class=\"card\">",
  "    <h2>Public API</h2>",
  "    <p><a href=\"/api/public/audit\">/api/public/audit</a></p>",
  "    <p><a href=\"/\">Back to public site</a></p>",
  "  </section>",
  "</main>",
  "</body>",
  "</html>"
].join("\\n");

fs.writeFileSync(path.join(publicDocsDir, "audit.html"), html + "\\n");

console.log("Wrote public-docs/audit-status.json");
console.log("Wrote public-docs/audit.html");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>\\\"]/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\\\"": "&quot;"
  }[ch]));
}
