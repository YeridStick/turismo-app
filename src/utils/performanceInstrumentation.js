const FLAG_NAME = "EXPO_PUBLIC_PERF_INSTRUMENTATION";

const getEnvFlag = () => {
  const processRef = globalThis.process;
  if (!processRef) return false;
  return processRef.env?.[FLAG_NAME] === "true";
};

export const isPerformanceInstrumentationEnabled = () => {
  const processRef = globalThis.process;
  const isDevRuntime =
    globalThis.__DEV__ === true ||
    (processRef && processRef.env?.NODE_ENV !== "production");

  return Boolean(isDevRuntime && getEnvFlag());
};

const createEmptyStore = () => ({
  requests: new Map(),
  renders: new Map(),
  events: [],
});

const getStore = () => {
  if (!globalThis.__TURISMO_PERF_STORE__) {
    globalThis.__TURISMO_PERF_STORE__ = createEmptyStore();
  }
  return globalThis.__TURISMO_PERF_STORE__;
};

const increment = (map, key, meta = {}) => {
  const current = map.get(key) || { count: 0, meta: {} };
  const next = {
    count: current.count + 1,
    meta: { ...current.meta, ...meta },
  };
  map.set(key, next);
  return next;
};

export const recordRequestInstrumentation = (key, meta = {}) => {
  if (!isPerformanceInstrumentationEnabled() || !key) return null;
  const store = getStore();
  const result = increment(store.requests, key, meta);
  store.events.push({ type: "request", key, meta, at: Date.now() });
  return result;
};

export const recordRenderInstrumentation = (componentName, meta = {}) => {
  if (!isPerformanceInstrumentationEnabled() || !componentName) return null;
  const store = getStore();
  const result = increment(store.renders, componentName, meta);
  store.events.push({ type: "render", key: componentName, meta, at: Date.now() });
  return result;
};

export const getPerformanceInstrumentationSnapshot = () => {
  const store = getStore();
  return {
    enabled: isPerformanceInstrumentationEnabled(),
    requests: Object.fromEntries(store.requests.entries()),
    renders: Object.fromEntries(store.renders.entries()),
    events: [...store.events],
  };
};

export const resetPerformanceInstrumentation = () => {
  globalThis.__TURISMO_PERF_STORE__ = createEmptyStore();
};
