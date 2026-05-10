import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");

const outDir = path.join(projectRoot, "reports", "paper-trading");
const latestFile = path.join(outDir, "latest.json");
const latestObservedFile = path.join(outDir, "latest-observed.json");
const signalsFile = path.join(outDir, "signals.jsonl");
const stateFile = path.join(outDir, "state.json");
const heartbeatFile = path.join(outDir, "heartbeat.json");
const errorsFile = path.join(outDir, "errors.jsonl");

const intervalSeconds = Number(process.env.PAPER_SIGNAL_INTERVAL_SECONDS || "300");
const skipDuplicates = process.env.PAPER_SIGNAL_SKIP_DUPLICATES !== "false";
const once = process.argv.includes("--once");

const ACTION_NAMES = [
  "HOLD",
  "ADD_LIQUIDITY",
  "REMOVE_LIQUIDITY",
  "BUYBACK_SMALL",
  "REBALANCE_TO_STABLES",
  "REBALANCE_TO_ETH",
  "GRANT",
  "PAUSE_RISKY_ACTIONS"
];

fs.mkdirSync(outDir, { recursive: true });

function sha256Hex(value) {
  return "0x" + createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  return JSON.stringify(value, Object.keys(value).sort());
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (_error) {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function appendJsonl(filePath, value) {
  fs.appendFileSync(filePath, JSON.stringify(value) + "\n");
}

function actionName(actionType) {
  return ACTION_NAMES[Number(actionType)] || `UNKNOWN_${actionType}`;
}

function normalizeSignal(signal) {
  return {
    model_version: String(signal.model_version),
    action_type: Number(signal.action_type),
    confidence_bps: Number(signal.confidence_bps),
    risk_bps: Number(signal.risk_bps),
    max_size_usd: Number(signal.max_size_usd),
    data_hash: String(signal.data_hash),
    reason_code: String(signal.reason_code),
    generated_at: Number(signal.generated_at)
  };
}

function validateSignal(signal) {
  if (!signal.model_version) throw new Error("Missing signal.model_version");
  if (!Number.isFinite(signal.action_type)) throw new Error("Invalid signal.action_type");
  if (!Number.isFinite(signal.confidence_bps)) throw new Error("Invalid signal.confidence_bps");
  if (!Number.isFinite(signal.risk_bps)) throw new Error("Invalid signal.risk_bps");
  if (!Number.isFinite(signal.max_size_usd)) throw new Error("Invalid signal.max_size_usd");
  if (!/^0x[a-fA-F0-9]{64}$/.test(signal.data_hash)) throw new Error("Invalid signal.data_hash");
  if (!signal.reason_code) throw new Error("Missing signal.reason_code");
  if (!Number.isFinite(signal.generated_at)) throw new Error("Invalid signal.generated_at");
}

function makeSignalId(signal) {
  const payload = JSON.stringify({
    model_version: signal.model_version,
    action_type: signal.action_type,
    confidence_bps: signal.confidence_bps,
    risk_bps: signal.risk_bps,
    max_size_usd: signal.max_size_usd,
    data_hash: signal.data_hash,
    reason_code: signal.reason_code,
    generated_at: signal.generated_at
  });

  return sha256Hex(payload);
}

function makeFingerprint(signal) {
  const payload = JSON.stringify({
    model_version: signal.model_version,
    action_type: signal.action_type,
    confidence_bps: signal.confidence_bps,
    risk_bps: signal.risk_bps,
    max_size_usd: signal.max_size_usd,
    data_hash: signal.data_hash,
    reason_code: signal.reason_code
  });

  return sha256Hex(payload);
}

function initialState() {
  return {
    version: "paper-state-v0.1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    cashUsd: 1_000_000,
    liquidityUsd: 0,
    astpTokens: 0,
    lastTokenPriceUsd: 0,
    totalPaperValueUsd: 1_000_000,
    signalCount: 0,
    appliedPaperActionCount: 0
  };
}

function updatePaperState(currentState, snapshot, signal) {
  const state = currentState || initialState();

  const tokenPriceUsd = Number(snapshot.token_price_usd || state.lastTokenPriceUsd || 0);
  const maxSizeUsd = Math.max(0, Number(signal.max_size_usd || 0));
  const actionType = Number(signal.action_type);

  let paperEffect = {
    applied: false,
    action: "NOOP",
    amountUsd: 0,
    astpTokensDelta: 0,
    note: "No virtual portfolio change for this signal type."
  };

  if (tokenPriceUsd > 0) {
    state.lastTokenPriceUsd = tokenPriceUsd;
  }

  if (actionType === 1) {
    const amountUsd = Math.min(maxSizeUsd, state.cashUsd);

    if (amountUsd > 0) {
      state.cashUsd -= amountUsd;
      state.liquidityUsd += amountUsd;

      paperEffect = {
        applied: true,
        action: "VIRTUAL_ADD_LIQUIDITY",
        amountUsd,
        astpTokensDelta: 0,
        note: "Moved virtual USD from cash reserve into simulated liquidity allocation."
      };
    }
  } else if (actionType === 2) {
    const amountUsd = Math.min(maxSizeUsd, state.liquidityUsd);

    if (amountUsd > 0) {
      state.liquidityUsd -= amountUsd;
      state.cashUsd += amountUsd;

      paperEffect = {
        applied: true,
        action: "VIRTUAL_REMOVE_LIQUIDITY",
        amountUsd,
        astpTokensDelta: 0,
        note: "Moved virtual USD from simulated liquidity allocation back to cash reserve."
      };
    }
  } else if (actionType === 3) {
    const amountUsd = Math.min(maxSizeUsd, state.cashUsd);

    if (amountUsd > 0 && tokenPriceUsd > 0) {
      const astpTokensBought = amountUsd / tokenPriceUsd;

      state.cashUsd -= amountUsd;
      state.astpTokens += astpTokensBought;

      paperEffect = {
        applied: true,
        action: "VIRTUAL_BUYBACK_SMALL",
        amountUsd,
        astpTokensDelta: astpTokensBought,
        note: "Used virtual cash to buy simulated ASTP at snapshot price."
      };
    }
  } else if (actionType === 7) {
    paperEffect = {
      applied: true,
      action: "VIRTUAL_PAUSE_RISKY_ACTIONS",
      amountUsd: 0,
      astpTokensDelta: 0,
      note: "Marked simulated treasury as risk-paused. No virtual funds moved."
    };
  }

  state.signalCount += 1;

  if (paperEffect.applied) {
    state.appliedPaperActionCount += 1;
  }

  const astpMarketValueUsd = state.astpTokens * Math.max(state.lastTokenPriceUsd, 0);

  state.totalPaperValueUsd = state.cashUsd + state.liquidityUsd + astpMarketValueUsd;
  state.updatedAt = new Date().toISOString();

  return { state, paperEffect };
}

function runAiSimulator() {
  const raw = execFileSync("python3", ["services/ai-engine/main.py"], {
    cwd: projectRoot,
    encoding: "utf8"
  });

  return JSON.parse(raw);
}

function runOnce() {
  const capturedAt = new Date().toISOString();
  const aiOutput = runAiSimulator();

  if (!aiOutput.signal) {
    throw new Error("AI simulator output did not contain signal object.");
  }

  const snapshot = aiOutput.snapshot || {};
  const signal = normalizeSignal(aiOutput.signal);

  validateSignal(signal);

  const signalId = makeSignalId(signal);
  const fingerprint = makeFingerprint(signal);
  const previousLatest = readJson(latestFile, null);
  const duplicate = skipDuplicates && previousLatest?.fingerprint === fingerprint;

  const latestObserved = {
    observedAt: capturedAt,
    signalId,
    fingerprint,
    actionName: actionName(signal.action_type),
    duplicateOfLatestPending: duplicate,
    snapshot,
    signal
  };

  writeJson(latestObservedFile, latestObserved);

  const heartbeat = {
    status: "OK",
    mode: once ? "once" : "loop",
    checkedAt: capturedAt,
    intervalSeconds,
    skipDuplicates,
    lastObservedSignalId: signalId,
    lastObservedFingerprint: fingerprint,
    lastObservedActionName: actionName(signal.action_type),
    duplicateSkipped: duplicate
  };

  writeJson(heartbeatFile, heartbeat);

  if (duplicate) {
    console.log(`[${capturedAt}] duplicate skipped: ${actionName(signal.action_type)} ${signal.reason_code}`);
    return;
  }

  const currentState = readJson(stateFile, null);
  const { state, paperEffect } = updatePaperState(currentState, snapshot, signal);
  writeJson(stateFile, state);

  const record = {
    schema: "astra-paper-signal-v0.1",
    capturedAt,
    signalId,
    paperSignalId: signalId,
    fingerprint,
    status: "PENDING_MANUAL_APPROVAL",
    manualApprovalRequired: true,
    submittedOnChain: false,
    eligibleForManualSubmission: signal.action_type !== 0,
    actionName: actionName(signal.action_type),
    snapshot,
    signal,
    paperEffect,
    paperStateAfter: state,
    safety: {
      privateKeyUsed: false,
      onChainTransactionSent: false,
      treasuryFundsMoved: false,
      note: "Paper-trading signal only. Manual approval is required before any on-chain submission."
    }
  };

  appendJsonl(signalsFile, record);
  writeJson(latestFile, record);

  console.log(
    `[${capturedAt}] new paper signal: ${record.actionName} | ${signal.reason_code} | signalId=${signalId}`
  );
}

function runSafely() {
  try {
    runOnce();
  } catch (error) {
    const errorRecord = {
      at: new Date().toISOString(),
      message: error.message,
      stack: error.stack
    };

    appendJsonl(errorsFile, errorRecord);

    writeJson(heartbeatFile, {
      status: "ERROR",
      checkedAt: errorRecord.at,
      message: error.message
    });

    console.error(`[${errorRecord.at}] paper loop error: ${error.message}`);
  }
}

runSafely();

if (!once) {
  console.log(`Astra paper-trading loop running every ${intervalSeconds} seconds.`);
  console.log(`Reports directory: ${outDir}`);

  setInterval(runSafely, intervalSeconds * 1000);
}
