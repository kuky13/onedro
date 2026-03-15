import { describe, expect, it } from "vitest";
import type { TestResults } from "@/types/deviceTest";
import { filterTestResultsForStorage, sanitizeTestResultForStorage } from "@/utils/deviceTestStorage";

describe("deviceTestStorage", () => {
  it("remove detalhes redundantes mantendo métricas essenciais", () => {
    const results: TestResults = {
      display_colors: {
        status: "passed",
        score: 100,
        duration_ms: 1200,
        details: {
          colors: Object.fromEntries(Array.from({ length: 500 }, (_, i) => [`c${i}`, true])),
          passedCount: 10,
          totalColors: 10,
        },
      },
      battery: {
        status: "passed",
        score: 100,
        duration_ms: 600,
        details: {
          level: 25,
          charging: false,
          estimatedWatts: "3W",
          estimatedVolts: "5V",
          estimatedAmps: "0.6A",
        },
      },
      camera_back: {
        status: "failed",
        score: 0,
        duration_ms: 18000,
        error: "camera_permission_denied",
        details: {
          resolution: { width: 4032, height: 3024 },
          hasCapturedImage: false,
          big: Object.fromEntries(Array.from({ length: 1000 }, (_, i) => [`k${i}`, "x".repeat(10)])),
        },
      },
    };

    const out = filterTestResultsForStorage(results, { source: "quick_test" });

    expect(out.bytes_after).toBeLessThan(out.bytes_before);
    expect(out.filteredResults.display_colors!.details).toEqual({ passedCount: 10, totalColors: 10 });
    expect((out.filteredResults.battery as any).details).toMatchObject({ level: 25, charging: false, estimatedWatts: "3W" });
    expect((out.filteredResults.camera_back as any).details).toEqual({ resolution: { width: 4032, height: 3024 } });

    expect(out.outliers.some((o) => o.metric === "battery.level" && o.value === 25)).toBe(true);
    expect(out.outliers.some((o) => o.metric === "duration_ms" && o.value === 18000)).toBe(true);
    expect(out.criticalFailures.some((f) => f.test_id === "camera_back")).toBe(true);
  });

  it("não altera resultados quando não é quick_test", () => {
    const results: TestResults = {
      display_touch: {
        status: "passed",
        score: 100,
        duration_ms: 100,
        details: { touchedCells: 40, totalCells: 40, completionRate: 100 },
      },
    };
    const out = filterTestResultsForStorage(results, { source: "diagnostic_share" });
    expect(out.filteredResults).toEqual(results);
  });

  it("sempre remove campos inesperados do result ao persistir quick_test", () => {
    const persisted = sanitizeTestResultForStorage(
      "audio_mic",
      {
        status: "passed",
        score: 100,
        duration_ms: 1000,
        details: { quality: "ok", recordingDuration: 1000, huge: "x".repeat(5000) },
        completed_at: "2026-01-01T00:00:00.000Z",
      } as any,
      { source: "quick_test" },
    );
    expect((persisted as any).details).toEqual({ recordingDuration: 1000, quality: "ok" });
    expect((persisted as any).huge).toBeUndefined();
  });

  it("benchmark: reduz significativamente payload sintético", () => {
    const results: TestResults = {
      display_colors: {
        status: "passed",
        score: 100,
        duration_ms: 1200,
        details: {
          colors: Object.fromEntries(Array.from({ length: 5000 }, (_, i) => [`c${i}`, true])),
          passedCount: 10,
          totalColors: 10,
        },
      },
    };
    const out = filterTestResultsForStorage(results, { source: "quick_test" });
    const reduction = 1 - out.bytes_after / out.bytes_before;
    expect(reduction).toBeGreaterThan(0.6);
  });
});

