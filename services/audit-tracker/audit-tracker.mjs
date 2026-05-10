import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const dataFile = path.join(root, "docs", "audit-remediation", "audit-findings.json");
const trackerMd = path.join(root, "docs", "audit-intake", "FINDINGS_TRACKER.md");
const registryMd = path.join(root, "docs", "audit-kickoff", "FINDING_ID_REGISTRY.md");
const remediationLogMd = path.join(root, "docs", "audit-remediation", "REMEDIATION_LOG.md");

const command = process.argv[2] || "help";

const allowedStatuses = [
  "OPEN",
  "ACKNOWLEDGED",
  "FIX_IN_PROGRESS",
  "FIXED_PENDING_RETEST",
  "FIX_VERIFIED",
  "WONT_FIX_ACCEPTED_RISK"
];

const allowedSeverities = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "INFORMATIONAL"
];

function now() {
  return new Date().toISOString();
}

function ensureDirs() {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.mkdirSync(path.dirname(trackerMd), { recursive: true });
  fs.mkdirSync(path.dirname(registryMd), { recursive: true });
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

function git(command) {
  try {
    return execSync(command, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "";
  }
}

function loadDb() {
  ensureDirs();

  const db = readJson(dataFile, null);

  if (db) return db;

  return {
    schema: "astra-audit-findings-v0.1",
    createdAt: now(),
    updatedAt: now(),
    project: "AstraTreasury Protocol",
    version: "0.1.1",
    findings: [
      {
        id: "ASTRA-001",
        source: "Internal",
        severity: "MEDIUM",
        title: "Cancelled signals executable in v0.1.0",
        status: "FIX_VERIFIED",
        owner: "AstraTreasury",
        branch: "fixed-before-tracker",
        fixCommit: "",
        retestStatus: "Local stateful audit passing",
        notes: "Found internally and fixed in v0.1.1 before external audit.",
        createdAt: now(),
        updatedAt: now()
      }
    ]
  };
}

function saveDb(db) {
  db.updatedAt = now();
  writeJson(dataFile, db);
  renderDocs(db);
}

function nextFindingId(db) {
  let max = 0;

  for (const finding of db.findings) {
    const match = String(finding.id || "").match(/^ASTRA-(\d+)$/);
    if (!match) continue;
    max = Math.max(max, Number(match[1]));
  }

  return `ASTRA-${String(max + 1).padStart(3, "0")}`;
}

function parseArgs(argv) {
  const out = {};
  let key = null;

  for (const item of argv) {
    if (item.startsWith("--")) {
      key = item.slice(2);
      out[key] = true;
      continue;
    }

    if (key) {
      out[key] = item;
      key = null;
    }
  }

  return out;
}

function findFinding(db, id) {
  const finding = db.findings.find((item) => item.id === id);

  if (!finding) {
    throw new Error(`Finding not found: ${id}`);
  }

  return finding;
}

function normalizeSeverity(value) {
  const sev = String(value || "INFORMATIONAL").toUpperCase();
  if (!allowedSeverities.includes(sev)) {
    throw new Error(`Invalid severity: ${value}. Use: ${allowedSeverities.join(", ")}`);
  }
  return sev;
}

function normalizeStatus(value) {
  const status = String(value || "OPEN").toUpperCase();
  if (!allowedStatuses.includes(status)) {
    throw new Error(`Invalid status: ${value}. Use: ${allowedStatuses.join(", ")}`);
  }
  return status;
}

function slug(value) {
  return String(value || "finding")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "finding";
}

function renderDocs(db) {
  const sorted = [...db.findings].sort((a, b) => a.id.localeCompare(b.id));

  const tracker = [
    "# Audit Findings Tracker",
    "",
    "## Status legend",
    "",
    "- OPEN",
    "- ACKNOWLEDGED",
    "- FIX_IN_PROGRESS",
    "- FIXED_PENDING_RETEST",
    "- FIX_VERIFIED",
    "- WONT_FIX_ACCEPTED_RISK",
    "",
    "## Severity legend",
    "",
    "- CRITICAL",
    "- HIGH",
    "- MEDIUM",
    "- LOW",
    "- INFORMATIONAL",
    "",
    "## Findings",
    "",
    "| ID | Severity | Title | Status | Owner | Fix Branch | Fix Commit | Retest Status | Notes |",
    "|---|---|---|---|---|---|---|---|---|",
    ...sorted.map((f) =>
      `| ${f.id} | ${f.severity} | ${escapeMd(f.title)} | ${f.status} | ${escapeMd(f.owner || "")} | ${escapeMd(f.branch || "")} | ${escapeMd(f.fixCommit || "")} | ${escapeMd(f.retestStatus || "")} | ${escapeMd(f.notes || "")} |`
    ),
    "",
    "## Process",
    "",
    "1. Every finding gets an ID.",
    "2. Every finding gets an owner.",
    "3. Every fix gets a commit hash.",
    "4. Every fix gets a regression test where possible.",
    "5. Every fix is retested before closure.",
    "6. Critical and high findings block mainnet."
  ];

  fs.writeFileSync(trackerMd, tracker.join("\n") + "\n");

  const registry = [
    "# Finding ID Registry",
    "",
    "## Format",
    "",
    "ASTRA-001, ASTRA-002, ASTRA-003, and so on.",
    "",
    "## Registry",
    "",
    "| ID | Source | Severity | Title | Status | Notes |",
    "|---|---|---|---|---|---|",
    ...sorted.map((f) =>
      `| ${f.id} | ${escapeMd(f.source || "")} | ${f.severity} | ${escapeMd(f.title)} | ${f.status} | ${escapeMd(f.notes || "")} |`
    ),
    "",
    "## Rule",
    "",
    "Every external audit finding must be added to this registry and to the findings tracker."
  ];

  fs.writeFileSync(registryMd, registry.join("\n") + "\n");

  const log = [
    "# Remediation Log",
    "",
    `Generated at: ${now()}`,
    "",
    "| ID | Status | Branch | Fix Commit | Updated |",
    "|---|---|---|---|---|",
    ...sorted.map((f) =>
      `| ${f.id} | ${f.status} | ${escapeMd(f.branch || "")} | ${escapeMd(f.fixCommit || "")} | ${f.updatedAt || ""} |`
    )
  ];

  fs.writeFileSync(remediationLogMd, log.join("\n") + "\n");
}

function escapeMd(value) {
  return String(value || "").replaceAll("|", "\\|").replace(/\n/g, " ");
}

function printHelp() {
  console.log(`AstraTreasury Audit Tracker

Commands:
  init
  list
  add --severity MEDIUM --title "Title" --source Auditor --owner Name
  update ASTRA-002 --status FIX_IN_PROGRESS --owner Name --notes "..."
  branch ASTRA-002
  fix ASTRA-002
  retest ASTRA-002 --status FIX_VERIFIED --notes "Retested by auditor"
  report

Examples:
  npm run audit:tracker -- add --severity HIGH --title "Policy bypass" --source Auditor --owner Alex
  npm run audit:tracker -- branch ASTRA-002
  npm run audit:tracker -- fix ASTRA-002
  npm run audit:tracker -- retest ASTRA-002 --status FIX_VERIFIED --notes "Auditor retest passed"
`);
}

function cmdInit() {
  const db = loadDb();
  saveDb(db);
  console.log(`Initialized audit tracker at ${dataFile}`);
}

function cmdList() {
  const db = loadDb();

  console.table(
    db.findings.map((f) => ({
      id: f.id,
      severity: f.severity,
      status: f.status,
      owner: f.owner,
      title: f.title,
      branch: f.branch,
      fixCommit: f.fixCommit
    }))
  );
}

function cmdAdd(args) {
  const db = loadDb();

  const title = args.title;
  if (!title || title === true) {
    throw new Error("Missing --title");
  }

  const id = args.id && args.id !== true ? args.id : nextFindingId(db);
  const severity = normalizeSeverity(args.severity);
  const status = normalizeStatus(args.status || "OPEN");

  if (db.findings.some((item) => item.id === id)) {
    throw new Error(`Finding already exists: ${id}`);
  }

  const finding = {
    id,
    source: args.source && args.source !== true ? args.source : "Auditor",
    severity,
    title,
    status,
    owner: args.owner && args.owner !== true ? args.owner : "TBD",
    branch: "",
    fixCommit: "",
    retestStatus: "",
    notes: args.notes && args.notes !== true ? args.notes : "",
    createdAt: now(),
    updatedAt: now()
  };

  db.findings.push(finding);
  saveDb(db);

  console.log(`Added finding ${id}: ${title}`);
}

function cmdUpdate(id, args) {
  const db = loadDb();
  const finding = findFinding(db, id);

  if (args.severity && args.severity !== true) finding.severity = normalizeSeverity(args.severity);
  if (args.status && args.status !== true) finding.status = normalizeStatus(args.status);
  if (args.title && args.title !== true) finding.title = args.title;
  if (args.owner && args.owner !== true) finding.owner = args.owner;
  if (args.source && args.source !== true) finding.source = args.source;
  if (args.branch && args.branch !== true) finding.branch = args.branch;
  if (args.fixCommit && args.fixCommit !== true) finding.fixCommit = args.fixCommit;
  if (args.retestStatus && args.retestStatus !== true) finding.retestStatus = args.retestStatus;
  if (args.notes && args.notes !== true) finding.notes = args.notes;

  finding.updatedAt = now();

  saveDb(db);
  console.log(`Updated ${id}`);
}

function cmdBranch(id) {
  const db = loadDb();
  const finding = findFinding(db, id);
  const branch = `remediation/${id}-${slug(finding.title)}`;

  finding.status = "FIX_IN_PROGRESS";
  finding.branch = branch;
  finding.updatedAt = now();

  saveDb(db);

  const currentBranch = git("git rev-parse --abbrev-ref HEAD");

  if (currentBranch !== branch) {
    try {
      execSync(`git checkout -b ${branch}`, { cwd: root, stdio: "inherit" });
    } catch {
      execSync(`git checkout ${branch}`, { cwd: root, stdio: "inherit" });
    }
  }

  console.log(`Remediation branch ready: ${branch}`);
}

function cmdFix(id) {
  const db = loadDb();
  const finding = findFinding(db, id);

  const commit = git("git rev-parse HEAD");

  finding.fixCommit = commit;
  finding.status = "FIXED_PENDING_RETEST";
  finding.updatedAt = now();
  finding.retestStatus = finding.retestStatus || "Pending retest";

  saveDb(db);

  console.log(`Recorded fix for ${id}: ${commit}`);
}

function cmdRetest(id, args) {
  const status = normalizeStatus(args.status || "FIX_VERIFIED");

  if (!["FIX_VERIFIED", "WONT_FIX_ACCEPTED_RISK", "FIXED_PENDING_RETEST"].includes(status)) {
    throw new Error("Retest status should usually be FIX_VERIFIED, WONT_FIX_ACCEPTED_RISK, or FIXED_PENDING_RETEST");
  }

  const db = loadDb();
  const finding = findFinding(db, id);

  finding.status = status;
  finding.retestStatus = args.notes && args.notes !== true ? args.notes : status;
  finding.updatedAt = now();

  saveDb(db);

  console.log(`Retest updated for ${id}: ${status}`);
}

function cmdReport() {
  const db = loadDb();
  renderDocs(db);

  const counts = {};

  for (const finding of db.findings) {
    counts[finding.status] = (counts[finding.status] || 0) + 1;
  }

  console.log("Audit findings status:");
  console.table(counts);
  console.log(`Wrote ${trackerMd}`);
  console.log(`Wrote ${registryMd}`);
  console.log(`Wrote ${remediationLogMd}`);
}

try {
  ensureDirs();

  if (command === "help") printHelp();
  else if (command === "init") cmdInit();
  else if (command === "list") cmdList();
  else if (command === "add") cmdAdd(parseArgs(process.argv.slice(3)));
  else if (command === "update") cmdUpdate(process.argv[3], parseArgs(process.argv.slice(4)));
  else if (command === "branch") cmdBranch(process.argv[3]);
  else if (command === "fix") cmdFix(process.argv[3]);
  else if (command === "retest") cmdRetest(process.argv[3], parseArgs(process.argv.slice(4)));
  else if (command === "report") cmdReport();
  else throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
