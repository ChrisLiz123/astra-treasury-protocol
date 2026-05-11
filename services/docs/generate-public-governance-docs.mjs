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

function readText(filePath, fallback = "") {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return fallback;
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

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  }[ch]));
}

const governanceStatus = readJson(
  path.join(root, "docs", "governance-gate", "governance-gate-status.json"),
  null
);

const findingsDb = readJson(
  path.join(root, "docs", "audit-remediation", "audit-findings.json"),
  { findings: [] }
);

const findings = Array.isArray(findingsDb.findings) ? findingsDb.findings : [];

const blockerRegister = readText(
  path.join(root, "docs", "governance-gate", "MAINNET_BLOCKER_REGISTER.md"),
  ""
);

const signoffMatrix = readText(
  path.join(root, "docs", "governance-gate", "SIGNOFF_MATRIX.md"),
  ""
);

const openCriticalHigh = findings.filter((finding) => {
  return ["CRITICAL", "HIGH"].includes(String(finding.severity || "")) &&
    !["FIX_VERIFIED", "WONT_FIX_ACCEPTED_RISK"].includes(String(finding.status || ""));
});

const publicStatus = {
  schema: "astra-public-governance-status-v0.1",
  generatedAt: new Date().toISOString(),
  project: "AstraTreasury Protocol",
  version: "0.1.1",
  network: "Base Sepolia",
  publicSite: {
    root: "https://astratreasury.ai",
    www: "https://www.astratreasury.ai"
  },
  governanceGate: governanceStatus || {
    gateStatus: "BLOCKING_MAINNET",
    gateReason: "Governance gate status has not been generated yet."
  },
  mainnet: {
    launched: false,
    blocked: true,
    blockReason:
      governanceStatus?.gateReason ||
      "Mainnet remains blocked pending external audit, legal review, Safe finalization, production infrastructure, and go/no-go approval."
  },
  safety: {
    realTreasuryFunds: false,
    publicTokenSale: false,
    investmentProduct: false,
    testnetOnly: true
  },
  findings: {
    total: findings.length,
    openCriticalHigh: openCriticalHigh.length,
    bySeverity: countBy(findings, "severity"),
    byStatus: countBy(findings, "status")
  },
  requiredCompletion: {
    externalAuditComplete: false,
    legalReviewComplete: false,
    multisigFinalized: false,
    productionRpcReady: false,
    incidentResponseRehearsed: false,
    mainnetGoNoGoApproved: false
  },
  documents: {
    blockerRegisterExists: blockerRegister.length > 0,
    signoffMatrixExists: signoffMatrix.length > 0,
    governanceGateDocs: [
      "docs/governance-gate/COMBINED_AUDIT_LEGAL_GATE.md",
      "docs/governance-gate/MAINNET_BLOCKER_REGISTER.md",
      "docs/governance-gate/SIGNOFF_MATRIX.md",
      "docs/governance-gate/GOVERNANCE_GATE_DECISION_RECORD.md",
      "docs/governance-gate/GOVERNANCE_GATE_STATUS.md"
    ]
  },
  publicStatement:
    "AstraTreasury is a Base Sepolia testnet prototype. Mainnet remains blocked pending external audit, legal review, Safe finalization, production infrastructure, incident-response rehearsal, and go/no-go approval."
};

fs.writeFileSync(
  path.join(publicDocsDir, "governance-status.json"),
  JSON.stringify(publicStatus, null, 2) + "\n"
);

const requiredRows = Object.entries(publicStatus.requiredCompletion)
  .map(([key, value]) => {
    return `<tr><td>${escapeHtml(key)}</td><td>${value ? "complete" : "not complete"}</td></tr>`;
  })
  .join("");

const findingRows = [
  ["Total findings", publicStatus.findings.total],
  ["Open critical/high findings", publicStatus.findings.openCriticalHigh],
  ["By severity", JSON.stringify(publicStatus.findings.bySeverity)],
  ["By status", JSON.stringify(publicStatus.findings.byStatus)]
]
  .map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`)
  .join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Governance Gate</title>
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
  <h1>AstraTreasury Governance Gate</h1>
  <div class="muted">Public sanitized governance-gate snapshot. Mainnet remains blocked.</div>
</header>

<main>
  <section class="grid">
    <div class="card">
      <h2>Governance Gate</h2>
      <div class="big danger">${escapeHtml(publicStatus.governanceGate.gateStatus || "BLOCKING_MAINNET")}</div>
      <div class="muted">${escapeHtml(publicStatus.governanceGate.gateReason || publicStatus.mainnet.blockReason)}</div>
    </div>

    <div class="card">
      <h2>Mainnet</h2>
      <div class="big danger">BLOCKED</div>
      <div class="muted">No mainnet launch. No real treasury funds. No public token sale.</div>
    </div>

    <div class="card">
      <h2>Network</h2>
      <div class="big">Base Sepolia</div>
      <div class="muted">Public testnet prototype only.</div>
    </div>

    <div class="card">
      <h2>Findings</h2>
      <div class="big">${escapeHtml(publicStatus.findings.total)}</div>
      <div class="muted">Open critical/high: ${escapeHtml(publicStatus.findings.openCriticalHigh)}</div>
    </div>
  </section>

  <section class="card">
    <h2>Required Completion Gates</h2>
    <table>
      <thead><tr><th>Gate</th><th>Status</th></tr></thead>
      <tbody>${requiredRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Findings Summary</h2>
    <table>
      <thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody>${findingRows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Public Statement</h2>
    <p>${escapeHtml(publicStatus.publicStatement)}</p>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/governance">/api/public/governance</a></p>
    <p><a href="/audit">Audit readiness</a></p>
    <p><a href="/">Back to public site</a></p>
  </section>
</main>
</body>
</html>`;

fs.writeFileSync(path.join(publicDocsDir, "governance.html"), html + "\n");

console.log("Wrote public-docs/governance-status.json");
console.log("Wrote public-docs/governance.html");
