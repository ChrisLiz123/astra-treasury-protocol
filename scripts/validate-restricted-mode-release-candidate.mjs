import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const requiredFiles = [
  "configs/restricted-mode-release-candidate.config.json",
  "docs/restricted-mode-release-candidate/RESTRICTED_MODE_RELEASE_CANDIDATE.md",
  "docs/restricted-mode-release-candidate/RESTRICTED_MODE_RELEASE_CANDIDATE_CHECKLIST.md",
  "docs/restricted-mode-release-candidate/RESTRICTED_MODE_RELEASE_CANDIDATE_RUNBOOK.md",
  "public-docs/restricted-mode-release-candidate-status.json"
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
    issue(file, "Missing required restricted-mode release candidate file.");
  }
}

if (issues.length === 0) {
  const rc = readJson("public-docs/restricted-mode-release-candidate-status.json");

  if (rc.status !== "RESTRICTED_MODE_RELEASE_CANDIDATE_READY_DECISION_RECORDED_ALL_DISABLED") {
    issue("releaseCandidate.status", `Expected RESTRICTED_MODE_RELEASE_CANDIDATE_READY_DECISION_RECORDED_ALL_DISABLED, got ${rc.status}`);
  }

  if (!rc.releaseCandidate?.releaseCandidateHash) {
    issue("releaseCandidate.releaseCandidateHash", "Release candidate hash is missing.");
  }

  if (!Array.isArray(rc.releaseCandidate?.artifactHashes) || rc.releaseCandidate.artifactHashes.length === 0) {
    issue("releaseCandidate.artifactHashes", "Release candidate artifact hashes are missing.");
  }

  for (const artifact of rc.releaseCandidate?.artifactHashes || []) {
    if (!artifact.path || !artifact.sha256) {
      issue("releaseCandidate.artifact", "Artifact entry is missing path or sha256.");
      continue;
    }

    const full = path.join(root, artifact.path);

    if (!fs.existsSync(full)) {
      issue(artifact.path, "Release candidate artifact no longer exists.");
      continue;
    }

    const currentHash = sha256File(artifact.path);

    if (currentHash !== artifact.sha256) {
      issue(artifact.path, "Release candidate artifact hash does not match current file.");
    }
  }

  if (rc.summary?.failed !== 0) {
    issue("releaseCandidate.summary.failed", "Release candidate must have zero failed checks.");
  }
}

const result = {
  schema: "astra-restricted-mode-release-candidate-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
