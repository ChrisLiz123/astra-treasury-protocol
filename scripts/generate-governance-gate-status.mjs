import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "docs", "governance-gate");
const outFile = path.join(outDir, "governance-gate-status.json");
const mdFile = path.join(outDir, "GOVERNANCE_GATE_STATUS.md");

fs.mkdirSync(outDir, { recursive: true });

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
const mainnetManifest = readJson(path.join(root, "deployments", "base-mainnet.public.json"), null);
const postdeploy = readJson(path.join(root, "reports", "mainnet-postdeploy", "mainnet-postdeploy-check-v1.json"), null);

const findings = Array.isArray(findingsDb.findings) ? findingsDb.findings : [];
const openCriticalHigh = findings.filter((finding) => {
  return ["CRITICAL", "HIGH"].includes(String(finding.severity || "")) &&
    !["FIX_VERIFIED", "WONT_FIX_ACCEPTED_RISK"].includes(String(finding.status || ""));
});

const contractsDeployed = Boolean(mainnetManifest?.contracts);
const postdeployPassed = postdeploy?.status === "PASS";

const gateStatus = contractsDeployed && postdeployPassed
  ? "MAINNET_CONTRACTS_DEPLOYED_RESTRICTED_OPERATION"
  : "BLOCKING_MAINNET_DEPLOYMENT";

const gateReason = contractsDeployed && postdeployPassed
  ? "Base Mainnet contracts are deployed and post-deployment checks passed. Public sale, real treasury funding, staking/rewards, buybacks, and autonomous execution remain blocked."
  : "Mainnet deployment remains blocked until deployment and post-deployment verification are complete.";

const status = {
  schema: "astra-governance-gate-status-v0.2",
  generatedAt: new Date().toISOString(),
  project: "AstraTreasury Protocol",
  version: "0.1.1",
  network: contractsDeployed ? "Base Mainnet" : "Base Sepolia",
  baseMainnetContractsDeployed: contractsDeployed,
  postdeployVerificationPassed: postdeployPassed,
  publicTokenSale: false,
  realTreasuryFunds: false,
  stakingOrRewardsLaunch: false,
  buybackProgram: false,
  autonomousExecution: false,
  gateStatus,
  gateReason,
  findings: {
    total: findings.length,
    openCriticalHigh: openCriticalHigh.length,
    bySeverity: countBy(findings, "severity"),
    byStatus: countBy(findings, "status")
  },
  launchPermissions: {
    contractsDeployed,
    governanceSafeSetupComplete: postdeployPassed,
    publicTokenSaleApproved: false,
    realTreasuryFundingApproved: false,
    stakingOrRewardsApproved: false,
    buybackProgramApproved: false,
    autonomousExecutionApproved: false
  },
  publicStatement:
    "AstraTreasury Base Mainnet contracts are deployed and verified, but public token sale, real treasury funding, staking/rewards, buybacks, and autonomous execution remain disabled."
};

fs.writeFileSync(outFile, JSON.stringify(status, null, 2) + "\n");

const md = [
  "# Governance Gate Status",
  "",
  `Gate status: ${gateStatus}`,
  "",
  "## Reason",
  "",
  gateReason,
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
  "## Restricted items",
  "",
  "- Public token sale: no",
  "- Real treasury funding: no",
  "- Staking/rewards launch: no",
  "- Buyback program: no",
  "- Autonomous execution: no"
];

fs.writeFileSync(mdFile, md.join("\n") + "\n");

console.log(`Wrote ${outFile}`);
console.log(`Wrote ${mdFile}`);
