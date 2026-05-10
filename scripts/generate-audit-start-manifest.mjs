import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const outDir = path.join(root, "docs", "audit-start");
const outFile = path.join(outDir, "AUDIT_START_MANIFEST.md");
const jsonFile = path.join(outDir, "audit-start-manifest.json");

fs.mkdirSync(outDir, { recursive: true });

function run(command) {
  return execSync(command, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

const commit = run("git rev-parse HEAD");
const shortCommit = run("git rev-parse --short HEAD");
const branch = run("git rev-parse --abbrev-ref HEAD");
const status = run("git status --short");

const packageFiles = [
  "release/astra-treasury-protocol-v0.1.1-audit-candidate.tar.gz",
  "release/astra-treasury-protocol-v0.1.1-external-review.tar.gz",
  "release/astra-treasury-protocol-v0.1.1-audit-intake.tar.gz",
  "release/astra-treasury-protocol-v0.1.1-audit-outreach.tar.gz",
  "release/astra-treasury-protocol-v0.1.1-auditor-selection.tar.gz",
  "release/astra-treasury-protocol-v0.1.1-audit-kickoff.tar.gz",
  "release/astra-treasury-protocol-v0.1.1-mainnet-planning.tar.gz",
  "release/astra-treasury-protocol-v0.1.1-mainnet-runbook.tar.gz",
  "release/astra-treasury-protocol-v0.1.1-safe-planning.tar.gz",
  "release/astra-treasury-protocol-v0.1.1-incident-response.tar.gz"
];

const manifest = {
  schema: "astra-audit-start-manifest-v0.1",
  generatedAt: new Date().toISOString(),
  project: "AstraTreasury Protocol",
  version: "0.1.1",
  auditStatus: "pending-auditor-selection-or-kickoff",
  network: "Base Sepolia",
  mainnetLaunched: false,
  realTreasuryFunds: false,
  publicTokenSale: false,
  git: {
    branch,
    commit,
    shortCommit,
    workingTreeClean: status.length === 0,
    status
  },
  packages: Object.fromEntries(
    packageFiles.map((file) => [
      file,
      {
        exists: exists(file)
      }
    ])
  ),
  requiredGates: [
    "npm run release:prepare",
    "npm run audit:full",
    "npm run audit:kickoff:gate",
    "npm run domain:check"
  ]
};

fs.writeFileSync(jsonFile, JSON.stringify(manifest, null, 2) + "\n");

const md = [
  "# AstraTreasury Audit Start Manifest",
  "",
  "## Project",
  "",
  "AstraTreasury Protocol v0.1.1",
  "",
  "## Status",
  "",
  "Mainnet launched: no",
  "Real treasury funds: no",
  "Public token sale: no",
  "Investment product: no",
  "",
  "## Git",
  "",
  `Branch: \`${branch}\``,
  `Commit: \`${commit}\``,
  `Short commit: \`${shortCommit}\``,
  `Working tree clean: \`${status.length === 0 ? "yes" : "no"}\``,
  "",
  "## Required gates",
  "",
  "- npm run release:prepare",
  "- npm run audit:full",
  "- npm run audit:kickoff:gate",
  "- npm run domain:check",
  "",
  "## Packages",
  "",
  "| Package | Exists |",
  "|---|---|",
  ...packageFiles.map((file) => `| ${file} | ${exists(file) ? "yes" : "no"} |`),
  "",
  "## Rule",
  "",
  "This manifest records the exact repository state intended for auditor kickoff. Mainnet remains blocked."
];

fs.writeFileSync(outFile, md.join("\n") + "\n");

console.log(`Wrote ${outFile}`);
console.log(`Wrote ${jsonFile}`);

if (status.length !== 0) {
  console.log("Warning: working tree is not clean.");
  console.log(status);
}
