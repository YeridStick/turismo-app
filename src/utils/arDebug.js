const FLAG_NAME = "EXPO_PUBLIC_AR_DEBUG";

const getEnv = () => {
  const processRef = globalThis.process;
  return processRef?.env || {};
};

export const isARDebugEnabled = () => {
  const env = getEnv();
  const isDevRuntime =
    globalThis.__DEV__ === true ||
    env.NODE_ENV === "development" ||
    env.NODE_ENV === "test";

  return Boolean(isDevRuntime && env[FLAG_NAME] === "true");
};

export const getARDebugElapsedMs = (startedAt) =>
  typeof startedAt === "number" ? Date.now() - startedAt : null;

export const logARDebug = (eventName, meta = {}, startedAt) => {
  if (!isARDebugEnabled()) return;

  const elapsedMs = getARDebugElapsedMs(startedAt);
  const payload = elapsedMs == null ? meta : { elapsedMs, ...meta };
  console.log(`[AR_DEBUG] ${eventName}`, payload);
};
