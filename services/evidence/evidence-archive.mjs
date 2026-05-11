import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const reportsDir = path.join(root, "reports", "evidence");
const archivesDir = path.join(reportsDir, "archives");
const publicDocsDir = path.join(root, "public-docs");

const latestFile = path.join(reportsDir, "latest-evidence.json");
const heartbeatFile = path.join(reportsDir, "heartbeat.json");
const publicIndexFile = path.join(publicDocsDir, "evidence-index.json");
const publicHtmlFile = path.join(publicDocsDir, "evidence.html");

const intervalSeconds = Number(process.env.EVIDENCE_ARCHIVE_INTERVAL_SECONDS || "86400");
const retentionDays = Number(process.env.EVIDENCE_RETENTION_DAYS || "90");
const publicLimit = Number(process.env.EVIDENCE_PUBLIC_LIMIT || "30");
const once = process.argv.includes("--once");

fs.mkdirSync(reportsDir, { recursive: true });
fs.mkdirSync(archivesDir, { recursive: true });
fs.mkdirSync(publicDocsDir, { recursive: true });

function now() {
  return new Date().toISOString();
}

function safeTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function readJson(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return {
      error: error.message
    };
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function run(command, args, fallback = "") {
  try {
    return execFileSync(command, args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch {
    return fallback;
  }
}

function runNpm(scriptName) {
  const started = Date.now();

  const stdout = execFileSync("npm", ["run", scriptName], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  return {
    scriptName,
    durationMs: Date.now() - started,
    stdoutTail: stdout.slice(-1000)
  };
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

async function httpsCheck(url) {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(10000)
    });

    return {
      url,
      ok: res.ok,
      status: res.status,
      statusText: res.statusText
    };
  } catch (error) {
    return {
      url,
      ok: false,
      error: error.message
    };
  }
}

function listArchives() {
  if (!fs.existsSync(archivesDir)) return [];

  return fs
    .readdirSync(archivesDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join(archivesDir, name))
    .sort()
    .reverse();
}

function pruneOldArchives() {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  let deleted = 0;

  for (const file of listArchives()) {
    const stat = fs.statSync(file);

    if (stat.mtime.getTime() < cutoff) {
      fs.unlinkSync(file);
      deleted += 1;
    }
  }

  return deleted;
}

function makePublicIndex() {
  const archives = listArchives();
  const items = [];

  for (const file of archives.slice(0, publicLimit)) {
    const snapshot = readJson(file, null);

    if (!snapshot) continue;

    items.push({
      snapshotId: snapshot.snapshotId,
      generatedAt: snapshot.generatedAt,
      git: snapshot.git,
      network: snapshot.network,
      mainnetBlocked: snapshot.safetyStatus?.mainnetBlocked ?? true,
      auditStatus: snapshot.audit?.status || "UNKNOWN",
      governanceGateStatus: snapshot.governance?.gateStatus || "UNKNOWN",
      openCriticalHighFindings: snapshot.audit?.openCriticalHighFindings ?? null,
      publicChecksOk: snapshot.publicChecks?.every((item) => item.ok) ?? false,
      packageCount: snapshot.packages?.length || 0
    });
  }

  const index = {
    schema: "astra-public-evidence-index-v0.1",
    generatedAt: now(),
    retentionDays,
    publicLimit,
    snapshotCount: items.length,
    project: "AstraTreasury Protocol",
    network: "Base Sepolia",
    mainnetLaunched: false,
    realTreasuryFunds: false,
    publicTokenSale: false,
    mainnetBlocked: true,
    items
  };

  writeJson(publicIndexFile, index);
  writeEvidenceHtml(index);

  return index;
}

function writeEvidenceHtml(index) {
  const rows = index.items.length === 0
    ? '<tr><td colspan="7">No evidence snapshots yet.</td></tr>'
    : index.items.map((item) => {
        return `<tr>
<td>${escapeHtml(item.generatedAt)}</td>
<td><code>${escapeHtml(item.git?.shortCommit || "")}</code></td>
<td>${escapeHtml(item.auditStatus)}</td>
<td>${escapeHtml(item.governanceGateStatus)}</td>
<td>${item.mainnetBlocked ? "yes" : "no"}</td>
<td>${item.publicChecksOk ? "yes" : "no"}</td>
<td>${escapeHtml(item.packageCount)}</td>
</tr>`;
      }).join("");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AstraTreasury Evidence Archive</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #0d1117; color: #e6edf3; }
    header { padding: 32px; background: #010409; border-bottom: 1px solid #30363d; }
    main { padding: 24px 32px 56px; display: grid; gap: 18px; }
    h1 { margin: 0 0 8px; font-size: 30px; }
    h2 { margin-top: 0; color: #58a6ff; }
    a { color: #58a6ff; }
    .muted { color: #8b949e; overflow-wrap: anywhere; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 14px; padding: 18px; box-shadow: 0 12px 30px rgba(0,0,0,.2); }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; border-bottom: 1px solid #30363d; padding: 10px 8px; vertical-align: top; }
    th { color: #58a6ff; font-size: 13px; }
    td { font-size: 13px; overflow-wrap: anywhere; }
    code { background: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 2px 5px; }
  </style>
</head>
<body>
<header>
  <h1>AstraTreasury Evidence Archive</h1>
  <div class="muted">Sanitized historical snapshots of public audit, governance, and transparency status.</div>
</header>

<main>
  <section class="card">
    <h2>Current Policy</h2>
    <p>Mainnet remains blocked. AstraTreasury is a Base Sepolia testnet prototype with no real treasury funds and no public token sale.</p>
    <p>Retention: ${escapeHtml(retentionDays)} days. Public index limit: ${escapeHtml(publicLimit)} snapshots.</p>
  </section>

  <section class="card">
    <h2>Snapshots</h2>
    <table>
      <thead>
        <tr>
          <th>Generated</th>
          <th>Commit</th>
          <th>Audit</th>
          <th>Governance</th>
          <th>Mainnet blocked</th>
          <th>Public checks OK</th>
          <th>Packages</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Public API</h2>
    <p><a href="/api/public/evidence">/api/public/evidence</a></p>
    <p><a href="/transparency">Transparency index</a></p>
    <p><a href="/">Back to public site</a></p>
  </section>
</main>
</body>
</html>`;

  fs.writeFileSync(publicHtmlFile, html + "\n");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  }[ch]));
}

async function createEvidenceSnapshot() {
  const snapshotId = safeTimestamp();

  console.log(`[${now()}] regenerating public status docs...`);

  const scriptResults = [
    runNpm("public:refresh:once"),
    runNpm("transparency:public:gate")
  ];

  const remote = run("git", ["config", "--get", "remote.origin.url"]);
  const commit = run("git", ["rev-parse", "HEAD"]);
  const shortCommit = run("git", ["rev-parse", "--short", "HEAD"]);
  const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"]);

  const auditStatus = readJson(path.join(publicDocsDir, "audit-status.json"), {});
  const governanceStatus = readJson(path.join(publicDocsDir, "governance-status.json"), {});
  const transparencyStatus = readJson(path.join(publicDocsDir, "transparency-status.json"), {});

  const publicChecks = await Promise.all([
    httpsCheck("https://astratreasury.ai/"),
    httpsCheck("https://astratreasury.ai/audit"),
    httpsCheck("https://astratreasury.ai/governance"),
    httpsCheck("https://astratreasury.ai/transparency"),
    httpsCheck("https://astratreasury.ai/api/public/audit"),
    httpsCheck("https://astratreasury.ai/api/public/governance"),
    httpsCheck("https://astratreasury.ai/api/public/transparency")
  ]);

  const packageFiles = [
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
    "release/astra-treasury-protocol-v0.1.1-public-governance-page.tar.gz",
    "release/astra-treasury-protocol-v0.1.1-public-transparency-index.tar.gz",
    "release/astra-treasury-protocol-v0.1.1-public-refresh.tar.gz"
  ];

  const snapshot = {
    schema: "astra-evidence-snapshot-v0.1",
    snapshotId,
    generatedAt: now(),
    project: "AstraTreasury Protocol",
    version: "0.1.1",
    network: {
      name: "Base Sepolia",
      chainId: 84532
    },
    git: {
      remote,
      githubUrl: githubUrlFromRemote(remote),
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
      mainnetBlocked: true
    },
    audit: {
      status: auditStatus?.auditReadiness?.status || "UNKNOWN",
      openFindings: auditStatus?.findings?.open ?? null,
      openCriticalHighFindings: auditStatus?.findings?.criticalOrHighOpen ?? null
    },
    governance: {
      gateStatus: governanceStatus?.governanceGate?.gateStatus || "BLOCKING_MAINNET",
      mainnetBlocked: governanceStatus?.mainnet?.blocked ?? true
    },
    transparency: {
      generatedAt: transparencyStatus?.generatedAt || null,
      repository: transparencyStatus?.repository || null
    },
    publicChecks,
    publicChecksOk: publicChecks.every((item) => item.ok),
    packages: packageFiles.map(fileStatus),
    scriptResults
  };

  const archiveFile = path.join(archivesDir, `${snapshotId}.json`);

  writeJson(archiveFile, snapshot);
  writeJson(latestFile, snapshot);

  const deleted = pruneOldArchives();
  const publicIndex = makePublicIndex();

  const heartbeat = {
    status: snapshot.publicChecksOk ? "OK" : "WARN",
    checkedAt: now(),
    snapshotId,
    archiveFile,
    deletedOldArchives: deleted,
    publicIndexCount: publicIndex.snapshotCount,
    intervalSeconds,
    retentionDays
  };

  writeJson(heartbeatFile, heartbeat);

  console.log(`[${heartbeat.checkedAt}] evidence snapshot ${heartbeat.status}: ${snapshotId}`);
  return heartbeat;
}

async function runSafely() {
  try {
    return await createEvidenceSnapshot();
  } catch (error) {
    const event = {
      status: "ERROR",
      checkedAt: now(),
      message: error.message,
      stack: error.stack
    };

    writeJson(heartbeatFile, event);
    console.error(`[${event.checkedAt}] evidence archive ERROR: ${error.message}`);

    if (once) process.exit(1);
    return event;
  }
}

await runSafely();

if (!once) {
  console.log(`AstraTreasury evidence archive running every ${intervalSeconds} seconds.`);
  setInterval(runSafely, intervalSeconds * 1000);
}
