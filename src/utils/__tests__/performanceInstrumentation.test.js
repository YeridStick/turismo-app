import {
  getPerformanceInstrumentationSnapshot,
  isPerformanceInstrumentationEnabled,
  recordRenderInstrumentation,
  recordRequestInstrumentation,
  resetPerformanceInstrumentation,
} from "../performanceInstrumentation";

describe("performanceInstrumentation", () => {
  const env = globalThis.process.env;
  const flagName = "EXPO_PUBLIC_PERF_INSTRUMENTATION";
  const originalFlag = env[flagName];
  const originalDev = globalThis.__DEV__;

  afterEach(() => {
    if (originalFlag === undefined) {
      delete env[flagName];
    } else {
      env[flagName] = originalFlag;
    }
    globalThis.__DEV__ = originalDev;
    resetPerformanceInstrumentation();
  });

  it("is disabled by default", () => {
    delete env[flagName];
    globalThis.__DEV__ = true;

    expect(isPerformanceInstrumentationEnabled()).toBe(false);
    expect(recordRequestInstrumentation("GET /api/places")).toBeNull();
    expect(recordRenderInstrumentation("HomeScreen")).toBeNull();
  });

  it("records requests and renders when explicitly enabled in dev", () => {
    env[flagName] = "true";
    globalThis.__DEV__ = true;

    recordRequestInstrumentation("GET /api/places", { flow: "Home mount" });
    recordRequestInstrumentation("GET /api/places", { flow: "Refresh" });
    recordRenderInstrumentation("HomeScreen");

    const snapshot = getPerformanceInstrumentationSnapshot();

    expect(snapshot.enabled).toBe(true);
    expect(snapshot.requests["GET /api/places"].count).toBe(2);
    expect(snapshot.renders.HomeScreen.count).toBe(1);
    expect(snapshot.events).toHaveLength(3);
  });

  it("does not record in production even when flag is set", () => {
    env[flagName] = "true";
    globalThis.__DEV__ = false;
    const originalNodeEnv = env.NODE_ENV;
    env.NODE_ENV = "production";

    try {
      expect(isPerformanceInstrumentationEnabled()).toBe(false);
      expect(recordRequestInstrumentation("GET /api/places")).toBeNull();
    } finally {
      env.NODE_ENV = originalNodeEnv;
    }
  });
});
