import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "configs", "legal-full-launch-review.config.json");

const requiredFiles = [
  "docs/legal-full-launch/LEGAL_FULL_LAUNCH_REVIEW.md",
  "docs/legal-full-launch/COUNSEL_REVIEW_REQUEST.md",
  "docs/legal-full-launch/LEGAL_REVIEW_MATRIX.md",
  "docs/legal-full-launch/MARKETING_LANGUAGE_POLICY_FULL_LAUNCH.md",
  "docs/legal-full-launch/FULL_LAUNCH_LEGAL_SIGNOFF_RECORD.md",
  "docs/legal-full-launch/JURISDICTIONAL_REVIEW_TEMPLATE.md",
  "docs/legal-full-launch/LEGAL_FULL_LAUNCH_BLOCKERS.md",
  "public-docs/full-launch-status.json",
  "public-docs/stabilization-status.json",
  "public-docs/roadmap.html",
  "public-docs/trust-status.json"
];

const issues = [];

function issue(pathName, message) {
  issues.push({ path: pathName, message });
}

if (!fs.existsSync(configPath)) {
  issue("configs/legal-full-launch-review.config.json", "Missing legal full-launch config.");
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issue(file, "Missing required legal-review file.");
  }
}

if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  if (config.network?.chainId !== 8453) {
    issue("network.chainId", "Expected Base Mainnet chain ID 8453.");
  }

  if (config.legalFullLaunchApproved !== false) {
    issue("legalFullLaunchApproved", "Legal full-launch approval must remain false until counsel approves.");
  }

  if (config.fullLaunchApproved !== false) {
    issue("fullLaunchApproved", "Full launch must remain false.");
  }

  for (const [key, value] of Object.entries(config.capabilityApprovals || {})) {
    if (value !== false) {
      issue(`capabilityApprovals.${key}`, "Capability approval must remain false.");
    }
  }

  for (const [key, value] of Object.entries(config.requiredLegalReviewAreas || {})) {
    if (value !== "PENDING_COUNSEL_REVIEW") {
      issue(`requiredLegalReviewAreas.${key}`, "Review area should remain PENDING_COUNSEL_REVIEW until counsel updates it.");
    }
  }
}

const result = {
  schema: "astra-legal-full-launch-review-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
