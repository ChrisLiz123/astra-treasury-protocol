import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const configFile = path.join(root, "configs", "restricted-launch-announcement.config.json");

const requiredFiles = [
  "docs/announcement/RESTRICTED_LAUNCH_ANNOUNCEMENT.md",
  "docs/announcement/SOCIAL_POST_TEMPLATE.md",
  "docs/announcement/LONG_FORM_POST_TEMPLATE.md",
  "docs/announcement/PUBLIC_FAQ.md",
  "docs/announcement/ANNOUNCEMENT_REVIEW_CHECKLIST.md",
  "public-docs/restricted-launch-status.json",
  "public-docs/mainnet-monitor-status.json",
  "public-docs/mainnet-execution-status.json",
  "public-docs/incident-summary.json",
  "public-docs/transparency-status.json"
];

const config = JSON.parse(fs.readFileSync(configFile, "utf8"));

const issues = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    issues.push({ file, issue: "missing required file" });
  }
}

const announcementFiles = [
  "docs/announcement/RESTRICTED_LAUNCH_ANNOUNCEMENT.md",
  "docs/announcement/SOCIAL_POST_TEMPLATE.md",
  "docs/announcement/LONG_FORM_POST_TEMPLATE.md",
  "docs/announcement/PUBLIC_FAQ.md"
];

// The validator checks publishable announcement copy.
// It intentionally does not scan ANNOUNCEMENT_REVIEW_CHECKLIST.md because that file lists prohibited examples.


for (const file of announcementFiles) {
  if (!fs.existsSync(path.join(root, file))) continue;

  const text = fs.readFileSync(path.join(root, file), "utf8").toLowerCase();

  for (const phrase of config.prohibitedClaims || []) {
    if (text.includes(String(phrase).toLowerCase())) {
      issues.push({
        file,
        issue: `contains prohibited phrase: ${phrase}`
      });
    }
  }
}

const launchStatus = JSON.parse(fs.readFileSync(path.join(root, "public-docs", "restricted-launch-status.json"), "utf8"));
const executionStatus = JSON.parse(fs.readFileSync(path.join(root, "public-docs", "mainnet-execution-status.json"), "utf8"));
const incidents = JSON.parse(fs.readFileSync(path.join(root, "public-docs", "incident-summary.json"), "utf8"));

if (launchStatus.status !== "RESTRICTED_LAUNCH_READY") {
  issues.push({
    file: "public-docs/restricted-launch-status.json",
    issue: `expected RESTRICTED_LAUNCH_READY, got ${launchStatus.status}`
  });
}

if (executionStatus.mode !== "MAINNET_EXECUTION_QUEUE_DISABLED") {
  issues.push({
    file: "public-docs/mainnet-execution-status.json",
    issue: `expected MAINNET_EXECUTION_QUEUE_DISABLED, got ${executionStatus.mode}`
  });
}

if (Number(incidents?.summary?.active || 0) !== 0) {
  issues.push({
    file: "public-docs/incident-summary.json",
    issue: "active incidents must be zero before announcement"
  });
}

const result = {
  schema: "astra-restricted-launch-announcement-validation-v0.1",
  checkedAt: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  issues
};

console.log(JSON.stringify(result, null, 2));

if (issues.length > 0) {
  process.exit(1);
}
