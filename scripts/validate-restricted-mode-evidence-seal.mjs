import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();

const requiredFiles = [
  "configs/restricted-mode-evidence-seal.config.json",
  "docs/restricted-mode-evidence-seal/RESTRICTED_MODE_EVIDENCE_SEAL.md",
  "docs/restricted-mode-evidence-seal/RESTRICTED_MODE_EVIDENCE_SEAL_CHECKLIST.md",
  "docs/restricted-mode-evidence-seal/RESTRICTED_MODE_EVIDENCE_SEAL_RUNBOOK.md",
  "public-docs/restricted-mode-evidence-seal-status.json"
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
    issue(file, "Missing required evidence seal file.");
  }
}

if (issues.length === 0) {
  const seal = readJson("public-docs/restricted-mode-evidence-seal-status.json");

  if (seal.status !== "RESTRICTED_MODE_EVIDENCE_SEALED_DECISION_RECORDED_ALL_DISABLED") {
    issue("seal.status", `Expected RESTRICTED_MODE_EVIDENCE_SEALED_DECISION_RECORDED_ALL_DISABLED, got ${seal.status}`);
  }

  if (!seal.seal?.sealHash) {
    issue("seal.seal.sealHash", "Seal hash is missing.");
  }

  if (!Array.isArray(seal.seal?.artifactHashes) || seal.seal.artifactHashes.length === 0) {
    issue("seal.seal.artifactHashes", "Artifact hashes are missing.");
  }

  for (const artifact of seal.seal?.artifactHashes || []) {
    if (!artifact.path || !artifact.sha256) {
      issue("seal.artifact", "Artifact entry is missing path or sha256.");
      continue;
    }

    const full = path.join(root, artifact.path);

    if (!fs.existsSync(full)) {
      issue(artifact.path, "Sealed artifact no longer exists.");
      continue;
    }

    const currentHash = sha256File(artifact.path);

    if (currentHash !== artifact.sha256) {
      issue(artifact.path, "Sealed artifact hash does not match current file.");
    }
  }

  if (seal.fullLaunchApproved !== undefined && seal.fullLaunchApproved !== false) {
    issue("seal.fullLaunchApproved", "Seal must not approve full launch.");
  }

  if (seal.summary?.failed !== 0) {
    issue("seal.summary.failed", "Seal must have zero failed checks.");
  }
}

const result = {
  schema: "astra-restricted-mode-evidence-seal-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
