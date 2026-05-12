import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");

const outDir = path.join(projectRoot, "reports", "public-refresh");
const heartbeatFile = path.join(outDir, "heartbeat.json");
const eventsFile = path.join(outDir, "events.jsonl");

const intervalSeconds = Number(process.env.PUBLIC_REFRESH_INTERVAL_SECONDS || "900");
const once = process.argv.includes("--once");

fs.mkdirSync(outDir, { recursive: true });

function now() {
  return new Date().toISOString();
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function appendJsonl(filePath, value) {
  fs.appendFileSync(filePath, JSON.stringify(value) + "\n");
}

function runNpmScript(scriptName) {
  const startedAt = Date.now();

  const stdout = execFileSync("npm", ["run", scriptName], {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  return {
    scriptName,
    durationMs: Date.now() - startedAt,
    stdout: stdout.slice(-2000)
  };
}

function fileStatus(relativePath) {
  const fullPath = path.join(projectRoot, relativePath);

  try {
    const stat = fs.statSync(fullPath);

    return {
      file: relativePath,
      exists: true,
      sizeBytes: stat.size,
      modifiedAt: stat.mtime.toISOString()
    };
  } catch {
    return {
      file: relativePath,
      exists: false
    };
  }
}

function refreshOnce() {
  const startedAt = now();
  const results = [];

  console.log(`[${startedAt}] refreshing public status pages...`);

  const scripts = [
    "audit:tracker:report",
    "governance:gate:status",
    "docs:audit-public",
    "docs:governance-public",
    "docs:transparency-public",
    "docs:packages-public",
    "docs:live-public"
  ];

  for (const script of scripts) {
    console.log(`Running ${script}...`);
    results.push(runNpmScript(script));
  }

  const files = [
    "public-docs/audit.html",
    "public-docs/audit-status.json",
    "public-docs/governance.html",
    "public-docs/governance-status.json",
    "public-docs/transparency.html",
    "public-docs/transparency-status.json",
    "public-docs/packages.html",
    "public-docs/package-inventory.json",
    "public-docs/live.html",
    "public-docs/live-status.json"
  ].map(fileStatus);

  const missingFiles = files.filter((item) => !item.exists);

  const heartbeat = {
    status: missingFiles.length === 0 ? "OK" : "WARN",
    startedAt,
    checkedAt: now(),
    intervalSeconds,
    mode: once ? "once" : "loop",
    scripts: results.map((item) => ({
      scriptName: item.scriptName,
      durationMs: item.durationMs
    })),
    files,
    missingFiles
  };

  writeJson(heartbeatFile, heartbeat);
  appendJsonl(eventsFile, heartbeat);

  console.log(`[${heartbeat.checkedAt}] public refresh ${heartbeat.status}`);

  if (missingFiles.length > 0) {
    console.log("Missing files:");
    console.table(missingFiles);
  }

  return heartbeat;
}

function runSafely() {
  try {
    return refreshOnce();
  } catch (error) {
    const event = {
      status: "ERROR",
      checkedAt: now(),
      message: error.message,
      stack: error.stack
    };

    writeJson(heartbeatFile, event);
    appendJsonl(eventsFile, event);

    console.error(`[${event.checkedAt}] public refresh ERROR: ${error.message}`);

    if (once) {
      process.exit(1);
    }

    return event;
  }
}

runSafely();

if (!once) {
  console.log(`AstraTreasury public refresh loop running every ${intervalSeconds} seconds.`);
  setInterval(runSafely, intervalSeconds * 1000);
}
