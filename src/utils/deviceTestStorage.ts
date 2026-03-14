import type { DeviceInfo, TestResult, TestResults } from "@/types/deviceTest";

type StorageContext = {
  source?: string | undefined;
};

type FilterOutput = {
  filteredResults: TestResults;
  criticalFailures: Array<{ test_id: string; error?: string; score?: number }>;
  perfMetrics: {
    total_tests: number;
    passed: number;
    failed: number;
    skipped: number;
    avg_duration_ms: number | null;
    total_duration_ms: number;
    longest_test_id: string | null;
    longest_duration_ms: number | null;
  };
  outliers: Array<{ test_id: string; metric: string; value: number; rule: string }>;
  bytes_before: number;
  bytes_after: number;
};

const CRITICAL_TEST_IDS = new Set([
  "display_touch",
  "audio_speaker",
  "audio_mic",
  "camera_front",
  "camera_back",
  "buttons",
  "battery",
]);

const DETAILS_ALLOWLIST_BY_TEST: Record<string, string[]> = {
  display_touch: ["touchedCells", "totalCells", "completionRate"],
  display_colors: ["passedCount", "totalColors"],
  audio_mic: ["recordingDuration", "maxLevel", "quality"],
  audio_speaker: [],
  camera_front: ["resolution", "facing"],
  camera_back: ["resolution", "facing", "flashUsed"],
  vibration: ["testedPatterns", "totalPatterns"],
  buttons: ["buttons", "testedCount", "workingCount"],
  battery: ["level", "charging", "estimatedWatts", "chargingSpeed"],
  sensors: ["accelerometer", "gyroscope", "proximitySupported", "proximityTested"],
  location: ["accuracy", "gpsWorking", "city", "state"],
};

const OUTLIER_RULES = {
  score_low: { minScore: 70 },
  duration_high: { maxDurationMs: 15_000 },
  battery_low: { minBatteryLevel: 30 },
  gps_accuracy_low: { maxAccuracy: 100 },
} as const;

const utf8Bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length;

const pick = (obj: Record<string, any>, keys: string[]) => {
  const out: Record<string, any> = {};
  for (const k of keys) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
};

export const sanitizeDeviceInfoForStorage = async (
  base: DeviceInfo,
  runtime: DeviceInfo,
  ctx: StorageContext,
): Promise<DeviceInfo> => {
  const merged: DeviceInfo = {
    ...base,
    ...runtime,
  };

  const source = merged.source ?? ctx.source;

  if (source === "quick_test") {
    const userAgent = (runtime as any)?.user_agent ?? (merged as any)?.user_agent;
    let ua_hash: string | undefined;
    if (typeof userAgent === "string" && userAgent.length > 0 && crypto?.subtle) {
      const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(userAgent));
      ua_hash = Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }

    const name = (base as any)?.name ?? (merged as any)?.name;
    return {
      source: "quick_test",
      ...(name ? { name } : {}),
      screen_resolution: merged.screen_resolution,
      platform: merged.platform,
      language: merged.language,
      viewport: merged.viewport,
      ...(ua_hash ? { ua_hash } : {}),
    } as any;
  }

  return merged;
};

export const sanitizeTestResultForStorage = (testId: string, result: TestResult, ctx: StorageContext): TestResult => {
  if (ctx.source !== "quick_test") return result;

  const allow = DETAILS_ALLOWLIST_BY_TEST[testId] ?? [];
  const details = (result as any)?.details;

  const base: TestResult = {
    status: result.status,
    ...(result.score !== undefined ? { score: result.score } : {}),
    ...(result.duration_ms !== undefined ? { duration_ms: result.duration_ms } : {}),
    ...(result.completed_at !== undefined ? { completed_at: result.completed_at } : {}),
    ...(result.error !== undefined ? { error: result.error } : {}),
  };

  if (!details || typeof details !== "object") return base;

  if (result.status === "failed" || CRITICAL_TEST_IDS.has(testId)) {
    const kept = pick(details, allow);
    return Object.keys(kept).length ? ({ ...base, details: kept } as any) : base;
  }

  if (result.status === "passed") {
    const kept = pick(details, allow);
    return Object.keys(kept).length ? ({ ...base, details: kept } as any) : base;
  }

  return base;
};

export const filterTestResultsForStorage = (results: TestResults, ctx: StorageContext): FilterOutput => {
  const bytes_before = utf8Bytes(results);

  const filteredEntries = Object.entries(results).map(([testId, res]) => [
    testId,
    sanitizeTestResultForStorage(testId, res, ctx),
  ] as const);

  const filteredResults = Object.fromEntries(filteredEntries) as TestResults;
  const bytes_after = utf8Bytes(filteredResults);

  const vals = Object.values(filteredResults);
  const total_tests = vals.length;
  const passed = vals.filter((r) => r.status === "passed").length;
  const failed = vals.filter((r) => r.status === "failed").length;
  const skipped = vals.filter((r) => r.status === "skipped").length;

  const durations = Object.entries(filteredResults)
    .map(([id, r]) => ({ id, d: typeof r.duration_ms === "number" ? r.duration_ms : null }))
    .filter((x) => x.d !== null) as Array<{ id: string; d: number }>;
  const total_duration_ms = durations.reduce((acc, x) => acc + x.d, 0);
  const avg_duration_ms = durations.length ? Math.round(total_duration_ms / durations.length) : null;
  const longest = durations.length
    ? durations.reduce((a, b) => (b.d > a.d ? b : a))
    : null;

  const criticalFailures = Object.entries(filteredResults)
    .filter(([testId, r]) => r.status === "failed" && CRITICAL_TEST_IDS.has(testId))
    .map(([test_id, r]) => ({ test_id, error: r.error, score: r.score }));

  const outliers: Array<{ test_id: string; metric: string; value: number; rule: string }> = [];
  for (const [test_id, r] of Object.entries(filteredResults)) {
    if (typeof r.score === "number" && r.score < OUTLIER_RULES.score_low.minScore) {
      outliers.push({ test_id, metric: "score", value: r.score, rule: `score<${OUTLIER_RULES.score_low.minScore}` });
    }
    if (typeof r.duration_ms === "number" && r.duration_ms > OUTLIER_RULES.duration_high.maxDurationMs) {
      outliers.push({
        test_id,
        metric: "duration_ms",
        value: r.duration_ms,
        rule: `duration_ms>${OUTLIER_RULES.duration_high.maxDurationMs}`,
      });
    }

    const details = (r as any)?.details;
    if (test_id === "battery" && details && typeof details.level === "number" && details.level < OUTLIER_RULES.battery_low.minBatteryLevel) {
      outliers.push({
        test_id,
        metric: "battery.level",
        value: details.level,
        rule: `battery.level<${OUTLIER_RULES.battery_low.minBatteryLevel}`,
      });
    }

    if (test_id === "location" && details && typeof details.accuracy === "number" && details.accuracy > OUTLIER_RULES.gps_accuracy_low.maxAccuracy) {
      outliers.push({
        test_id,
        metric: "location.accuracy",
        value: details.accuracy,
        rule: `location.accuracy>${OUTLIER_RULES.gps_accuracy_low.maxAccuracy}`,
      });
    }
  }

  return {
    filteredResults,
    criticalFailures,
    perfMetrics: {
      total_tests,
      passed,
      failed,
      skipped,
      avg_duration_ms,
      total_duration_ms,
      longest_test_id: longest?.id ?? null,
      longest_duration_ms: longest?.d ?? null,
    },
    outliers,
    bytes_before,
    bytes_after,
  };
};

