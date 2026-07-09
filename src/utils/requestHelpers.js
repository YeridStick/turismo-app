const DEFAULT_METHOD = "GET";
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const isPlainObject = (value) => {
  if (!value || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

export const stableSerialize = (value) => {
  if (value === undefined) return "";
  if (value === null) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }
  if (!isPlainObject(value)) return JSON.stringify(String(value));

  return `{${Object.keys(value)
    .sort()
    .filter((key) => value[key] !== undefined)
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
    .join(",")}}`;
};

export const buildRequestKey = ({
  method = DEFAULT_METHOD,
  endpoint,
  url,
  params,
  scope,
} = {}) => {
  const normalizedMethod = String(method || DEFAULT_METHOD).toUpperCase();
  const target = endpoint || url || "";
  const scopePart = scope ? ` scope=${stableSerialize(scope)}` : "";
  const paramsPart = params ? ` params=${stableSerialize(params)}` : "";

  return `${normalizedMethod} ${target}${scopePart}${paramsPart}`;
};

export const isMutationMethod = (method) =>
  MUTATION_METHODS.has(String(method || "").toUpperCase());

export const extractArrayPayload = (payload) => {
  const value = payload?.data?.data ?? payload?.data ?? payload;

  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.content)) return value.content;
  if (Array.isArray(value?.items)) return value.items;

  return [];
};

export const createInFlightDeduper = () => {
  const inFlight = new Map();

  const run = (key, factory) => {
    if (!key) {
      throw new Error("createInFlightDeduper.run requires a request key.");
    }
    if (typeof factory !== "function") {
      throw new Error("createInFlightDeduper.run requires a factory function.");
    }
    if (inFlight.has(key)) {
      return inFlight.get(key);
    }

    let request;
    try {
      request = Promise.resolve(factory());
    } catch (error) {
      request = Promise.reject(error);
    }

    request = request.finally(() => {
      inFlight.delete(key);
    });

    inFlight.set(key, request);
    return request;
  };

  return {
    run,
    has: (key) => inFlight.has(key),
    clear: (key) => {
      if (key) {
        inFlight.delete(key);
        return;
      }
      inFlight.clear();
    },
    size: () => inFlight.size,
  };
};
