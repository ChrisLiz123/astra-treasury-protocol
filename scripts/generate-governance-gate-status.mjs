import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "docs", "governance-gate");
const outFile = path.join(outDir, "governance-gate-status.json");
const mdFile = path.join(outDir, "GOVERNANCE_GATE_STATUS.md");

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
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

const findingsDb = readJson(path.join(root, "docs", "audit-remediation", "audit-findings.json"), { findings: [] });
const findings = Array.isArray(findingsDb.findings) ? findingsDb.findings : [];

const openCriticalHigh = findings.filter((finding) => {
  return ["CRITICAL", "HIGH"].includes(String(finding.severity || "")) &&
    !["FIX_VERIFIED", "WONT_FIX_ACCEPTED_RISK"].includes(String(finding.status || ""));
});

const status = {
  schema: "astra-governance-gate-status-v0.1",
  generatedAt: new Date().toISOString(),
  project: "AstraTreasury Protocol",
  version: "0.1.1",
  network: "Base Sepolia",
  mainnetLaunched: false,
  realTreasuryFunds: false,
  publicTokenSale: false,
  investmentProduct: false,
  gateStatus: "BLOCKING_MAINNET",
  gateReason: "External audit and legal review are not yet complete.",
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
  publicStatement: "AstraTreasury is a Base Sepolia testnet prototype. Mainnet remains blocked pending external audit, legal review, Safe finalization, production infrastructure, and go/no-go approval."
};

fs.writeFileSync(outFile, JSON.stringify(status, null, 2) + "\n");

const md = [
  "# Governance Gate Status",
  "",
  "## Status",
  "",
  "Gate status: BLOCKING_MAINNET",
  "",
  "## Reason",
  "",
  status.gateReason,
  "",
  "## Public statement",
  "",
  status.publicStatement,
  "",
  "## Findings summary",
  "",
  `Total findings: ${status.findings.total}`,
  `Open critical/high findings: ${status.findings.openCriticalHigh}`,
  "",
  "## Required completion",
  "",
  "- External audit complete: no",
  "- Legal review complete: no",
  "- Multisig finalized: no",
  "- Production RPC ready: no",
  "- Incident response rehearsed: no",
  "- Mainnet go/no-go approved: no"
];

fs.writeFileSync(mdFile, md.join("\n") + "\n");

console.log(`Wrote ${outFile}`);
console.log(`Wrote ${mdFile}`);
