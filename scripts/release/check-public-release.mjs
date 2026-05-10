import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();

const requiredFiles = [
  "README.md",
  "DISCLAIMER.md",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "deployments/base-sepolia.public.json"
];

const forbiddenTrackedPrefixes = [
  "reports/",
  "backups/",
  "node_modules/",
  "artifacts/",
  "cache/",
  "release/",
  "out/",
  "artifacts-local/"
];

const forbiddenTrackedExact = [
  "deployments/base-sepolia.env",
  ".env",
  ".env.local"
];

const forbiddenPatterns = [
  /BASE_SEPOLIA_PRIVATE_KEY\s*=\s*0x[0-9a-fA-F]{64}/,
  /PRIVATE_KEY\s*=\s*0x[0-9a-fA-F]{64}/,
  /packages\.applied-caas-gateway1\.internal\.api\.openai\.org/
];

let failed = false;

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    console.error(`Missing required public release file: ${file}`);
    failed = true;
  }
}

let trackedFiles = [];

try {
  trackedFiles = execSync("git ls-files", { encoding: "utf8" })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
} catch {
  trackedFiles = [];
}

for (const file of trackedFiles) {
  if (forbiddenTrackedExact.includes(file)) {
    console.error(`Forbidden tracked file: ${file}`);
    failed = true;
  }

  for (const prefix of forbiddenTrackedPrefixes) {
    if (file.startsWith(prefix)) {
      console.error(`Forbidden tracked path: ${file}`);
      failed = true;
    }
  }
}

for (const file of collectFiles(root)) {
  const rel = path.relative(root, file).replaceAll("\\", "/");

  if (
    rel.startsWith(".git/") ||
    rel.startsWith("node_modules/") ||
    rel.startsWith("reports/") ||
    rel.startsWith("backups/") ||
    rel.startsWith("artifacts/") ||
    rel.startsWith("cache/") ||
    rel.startsWith("release/") ||
    rel.startsWith("out/") ||
    rel.startsWith("artifacts-local/") ||
    rel === "deployments/base-sepolia.env"
  ) {
    continue;
  }

  const stat = fs.statSync(file);
  if (stat.size > 2_000_000) continue;

  const text = fs.readFileSync(file, "utf8");

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(text)) {
      console.error(`Forbidden private/internal pattern found in: ${rel}`);
      failed = true;
    }
  }
}

if (failed) {
  console.error("Public release check failed.");
  process.exit(1);
}

console.log("Public release check passed.");

function collectFiles(dir) {
  const out = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (
        [
          ".git",
          "node_modules",
          "reports",
          "backups",
          "artifacts",
          "cache",
          "release",
          "out",
          "artifacts-local"
        ].includes(entry.name)
      ) {
        continue;
      }

      out.push(...collectFiles(full));
      continue;
    }

    out.push(full);
  }

  return out;
}
