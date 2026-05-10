import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");

const paperDir = path.join(projectRoot, "reports", "paper-trading");
const signalsFile = path.join(paperDir, "signals.jsonl");
const submissionsFile = path.join(paperDir, "onchain-submissions.jsonl");
const queueFile = path.join(paperDir, "approval-queue.json");
const eventsFile = path.join(paperDir, "approval-events.jsonl");

const command = process.argv[2] || "status";
const signalArg = process.argv[3];
const note = process.argv.slice(4).join(" ").trim();

fs.mkdirSync(paperDir, { recursive: true });

function now() {
  return new Date().toISOString();
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (_error) {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];

  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return {
          parseError: error.message,
          raw: line
        };
      }
    });
}

function appendJsonl(filePath, value) {
  fs.appendFileSync(filePath, JSON.stringify(value) + "\n");
}

function getSignalId(record) {
  return record?.signalId || record?.paperSignalId || record?.signal?.signalId;
}

function getSignalStatusLabel(item) {
  return item.status || "NEW";
}

function loadQueue() {
  return readJson(queueFile, {
    version: "astra-approval-queue-v0.1",
    createdAt: now(),
    updatedAt: now(),
    items: {}
  });
}

function buildSubmissionsBySignal() {
  const submissions = readJsonl(submissionsFile);
  const bySignal = new Map();

  for (const submission of submissions) {
    if (!submission?.signalId) continue;

    if (!bySignal.has(submission.signalId)) {
      bySignal.set(submission.signalId, []);
    }

    bySignal.get(submission.signalId).push(submission);
  }

  for (const list of bySignal.values()) {
    list.sort((a, b) => String(b.submittedAt || "").localeCompare(String(a.submittedAt || "")));
  }

  return bySignal;
}

function syncQueue() {
  const queue = loadQueue();
  const signals = readJsonl(signalsFile);
  const submissionsBySignal = buildSubmissionsBySignal();

  let added = 0;
  let updated = 0;

  for (const record of signals) {
    const signalId = getSignalId(record);
    if (!signalId) continue;

    const existing = queue.items[signalId];

    if (!existing) {
      queue.items[signalId] = {
        signalId,
        status: "NEW",
        createdAt: now(),
        updatedAt: now(),
        capturedAt: record.capturedAt || null,
        actionName: record.actionName || null,
        reasonCode: record.signal?.reason_code || null,
        confidenceBps: record.signal?.confidence_bps ?? null,
        riskBps: record.signal?.risk_bps ?? null,
        source: "paper-loop",
        paperRecord: record,
        approval: null,
        rejection: null,
        onchainSubmissions: []
      };
      added += 1;
    } else {
      existing.updatedAt = now();
      existing.capturedAt = existing.capturedAt || record.capturedAt || null;
      existing.actionName = existing.actionName || record.actionName || null;
      existing.reasonCode = existing.reasonCode || record.signal?.reason_code || null;
      existing.confidenceBps = existing.confidenceBps ?? record.signal?.confidence_bps ?? null;
      existing.riskBps = existing.riskBps ?? record.signal?.risk_bps ?? null;
      existing.paperRecord = existing.paperRecord || record;
      updated += 1;
    }

    const submissions = submissionsBySignal.get(signalId) || [];

    if (submissions.length > 0) {
      queue.items[signalId].status = "SUBMITTED_ONCHAIN";
      queue.items[signalId].submittedAt = submissions[0].submittedAt || now();
      queue.items[signalId].latestTxHash = submissions[0].txHash || null;
      queue.items[signalId].onchainSubmissions = submissions;
    }
  }

  queue.updatedAt = now();
  writeJson(queueFile, queue);

  return {
    queue,
    added,
    updated,
    total: Object.keys(queue.items).length
  };
}

function sortedItems(queue) {
  return Object.values(queue.items || {}).sort((a, b) => {
    const ad = a.capturedAt || a.updatedAt || a.createdAt || "";
    const bd = b.capturedAt || b.updatedAt || b.createdAt || "";
    return String(bd).localeCompare(String(ad));
  });
}

function resolveSignalId(queue, arg, preferredStatus = null) {
  const items = sortedItems(queue);

  if (!arg || arg === "latest") {
    const filtered = preferredStatus
      ? items.filter((item) => item.status === preferredStatus)
      : items;

    if (filtered.length === 0) {
      throw new Error(
        preferredStatus
          ? `No ${preferredStatus} signals found.`
          : "No signals found in approval queue."
      );
    }

    return filtered[0].signalId;
  }

  const exact = items.find((item) => item.signalId === arg);
  if (exact) return exact.signalId;

  const partialMatches = items.filter((item) => item.signalId.startsWith(arg));

  if (partialMatches.length === 1) {
    return partialMatches[0].signalId;
  }

  if (partialMatches.length > 1) {
    throw new Error(`Signal prefix matched multiple items: ${arg}`);
  }

  throw new Error(`Signal not found: ${arg}`);
}

function appendQueueEvent(type, item, extra = {}) {
  appendJsonl(eventsFile, {
    at: now(),
    type,
    signalId: item.signalId,
    status: item.status,
    actionName: item.actionName,
    reasonCode: item.reasonCode,
    note: extra.note || null,
    actor: process.env.USER || "local",
    ...extra
  });
}

function approveSignal(arg) {
  const { queue } = syncQueue();
  const signalId = resolveSignalId(queue, arg || "latest", "NEW");
  const item = queue.items[signalId];

  if (item.status === "SUBMITTED_ONCHAIN") {
    throw new Error("Cannot approve a signal that is already submitted on-chain.");
  }

  item.status = "APPROVED";
  item.updatedAt = now();
  item.approval = {
    approvedAt: now(),
    approvedBy: process.env.USER || "local",
    note: note || null
  };

  item.rejection = null;

  queue.updatedAt = now();
  writeJson(queueFile, queue);
  appendQueueEvent("APPROVED", item, { note });

  console.log(`Approved signal: ${signalId}`);
  console.log(`Action: ${item.actionName}`);
  console.log(`Reason: ${item.reasonCode}`);
}

function rejectSignal(arg) {
  const { queue } = syncQueue();
  const signalId = resolveSignalId(queue, arg || "latest", "NEW");
  const item = queue.items[signalId];

  if (item.status === "SUBMITTED_ONCHAIN") {
    throw new Error("Cannot reject a signal that is already submitted on-chain.");
  }

  item.status = "REJECTED";
  item.updatedAt = now();
  item.rejection = {
    rejectedAt: now(),
    rejectedBy: process.env.USER || "local",
    note: note || null
  };

  item.approval = null;

  queue.updatedAt = now();
  writeJson(queueFile, queue);
  appendQueueEvent("REJECTED", item, { note });

  console.log(`Rejected signal: ${signalId}`);
  console.log(`Action: ${item.actionName}`);
  console.log(`Reason: ${item.reasonCode}`);
}

function groupItems(queue) {
  const groups = {
    NEW: [],
    APPROVED: [],
    SUBMITTED_ONCHAIN: [],
    REJECTED: []
  };

  for (const item of sortedItems(queue)) {
    const status = item.status || "NEW";

    if (!groups[status]) {
      groups[status] = [];
    }

    groups[status].push(item);
  }

  return groups;
}

function printStatus(queue) {
  const groups = groupItems(queue);

  console.log("AstraTreasury paper approval queue");
  console.log("==================================");
  console.log(`Queue file: ${queueFile}`);
  console.log(`Updated: ${queue.updatedAt}`);
  console.log("");

  for (const status of ["NEW", "APPROVED", "SUBMITTED_ONCHAIN", "REJECTED"]) {
    console.log(`${status}: ${groups[status].length}`);
  }

  console.log("");
  console.log("Newest items:");
  console.table(
    sortedItems(queue).slice(0, 15).map((item) => ({
      status: item.status,
      signalId: item.signalId.slice(0, 18) + "...",
      action: item.actionName,
      reason: item.reasonCode,
      confidenceBps: item.confidenceBps,
      riskBps: item.riskBps,
      capturedAt: item.capturedAt,
      latestTxHash: item.latestTxHash || ""
    }))
  );
}

try {
  if (command === "sync") {
    const result = syncQueue();
    console.log(`Queue synced. Added ${result.added}, updated ${result.updated}, total ${result.total}.`);
    process.exit(0);
  }

  if (command === "status" || command === "list") {
    const result = syncQueue();
    printStatus(result.queue);
    process.exit(0);
  }

  if (command === "approve") {
    approveSignal(signalArg);
    process.exit(0);
  }

  if (command === "reject") {
    rejectSignal(signalArg);
    process.exit(0);
  }

  throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
