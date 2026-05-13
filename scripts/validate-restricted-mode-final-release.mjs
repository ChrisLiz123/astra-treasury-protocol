import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const requiredFiles = [
  "configs/restricted-mode-final-release.config.json",
  "docs/restricted-mode-final-release/RESTRICTED_MODE_FINAL_RELEASE.md",
  "docs/restricted-mode-final-release/RESTRICTED_MODE_FINAL_RELEASE_CHECKLIST.md",
  "docs/restricted-mode-final-release/RESTRICTED_MODE_FINAL_RELEASE_RUNBOOK.md",
  "public-docs/restricted-mode-final-release-status.json"
];

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function sha256File(relativePath) {
  const buffer = fs.readFileSync(path.join(root, relativePath));
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required restricted-mode final release file.");
  }
}

if (issues.length === 0) {
  const finalRelease = readJson("public-docs/restricted-mode-final-release-status.json");

  if (finalRelease.status !== "RESTRICTED_MODE_FINAL_RELEASE_READY_DECISION_RECORDED_ALL_DISABLED") {
    issue("finalRelease.status", `Expected RESTRICTED_MODE_FINAL_RELEASE_READY_DECISION_RECORDED_ALL_DISABLED, got ${finalRelease.status}`);
  }

  if (!finalRelease.finalRelease?.finalReleaseHash) {
    issue("finalRelease.finalReleaseHash", "Final release hash is missing.");
  }

  if (!Array.isArray(finalRelease.finalRelease?.artifactHashes) || finalRelease.finalRelease.artifactHashes.length === 0) {
    issue("finalRelease.artifactHashes", "Final release artifact hashes are missing.");
  }

  for (const artifact of finalRelease.finalRelease?.artifactHashes || []) {
    if (!artifact.path || !artifact.sha256) {
      issue("finalRelease.artifact", "Artifact entry is missing path or sha256.");
      continue;
    }

    const full = path.join(root, artifact.path);

    if (!fs.existsSync(full)) {
      issue(artifact.path, "Final release artifact no longer exists.");
      continue;
    }

    const currentHash = sha256File(artifact.path);

    if (currentHash !== artifact.sha256) {
      issue(artifact.path, "Final release artifact hash does not match current file.");
    }
  }

  if (finalRelease.summary?.failed !== 0) {
    issue("finalRelease.summary.failed", "Final release must have zero failed checks.");
  }
}

const result = {
  schema: "astra-restricted-mode-final-release-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
