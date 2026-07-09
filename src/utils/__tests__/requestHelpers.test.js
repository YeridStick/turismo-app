import {
  buildRequestKey,
  createInFlightDeduper,
  extractArrayPayload,
  isMutationMethod,
  stableSerialize,
} from "../requestHelpers";

describe("requestHelpers", () => {
  describe("stableSerialize", () => {
    it("serializes object keys in stable order", () => {
      const first = stableSerialize({ b: 2, a: 1 });
      const second = stableSerialize({ a: 1, b: 2 });

      expect(first).toBe(second);
      expect(first).toBe('{"a":1,"b":2}');
    });

    it("serializes nested objects and arrays deterministically", () => {
      const first = stableSerialize({
        filters: { category: "todos", radius: 5 },
        page: 0,
        tags: ["huila", "nearby"],
      });
      const second = stableSerialize({
        tags: ["huila", "nearby"],
        page: 0,
        filters: { radius: 5, category: "todos" },
      });

      expect(first).toBe(second);
    });

    it("omits undefined values without omitting null", () => {
      expect(stableSerialize({ a: undefined, b: null })).toBe('{"b":null}');
    });
  });

  describe("buildRequestKey", () => {
    it("builds equivalent keys for equivalent params with different key order", () => {
      const first = buildRequestKey({
        method: "get",
        endpoint: "/api/places/search",
        params: { page: 0, size: 10, mode: "ALL" },
      });
      const second = buildRequestKey({
        method: "GET",
        endpoint: "/api/places/search",
        params: { mode: "ALL", size: 10, page: 0 },
      });

      expect(first).toBe(second);
      expect(first).toContain("GET /api/places/search");
    });

    it("includes scope when provided", () => {
      const key = buildRequestKey({
        endpoint: "/api/notifications",
        params: { page: 0 },
        scope: { account: "user@example.com" },
      });

      expect(key).toContain("scope=");
      expect(key).toContain("user@example.com");
    });
  });

  describe("isMutationMethod", () => {
    it("detects mutation methods", () => {
      expect(isMutationMethod("POST")).toBe(true);
      expect(isMutationMethod("patch")).toBe(true);
      expect(isMutationMethod("DELETE")).toBe(true);
      expect(isMutationMethod("GET")).toBe(false);
    });
  });

  describe("extractArrayPayload", () => {
    it("returns array payloads unchanged", () => {
      expect(extractArrayPayload([{ id: 1 }])).toEqual([{ id: 1 }]);
    });

    it("extracts arrays from axios-style data.data", () => {
      expect(extractArrayPayload({ data: { data: [{ id: 1 }] } })).toEqual([
        { id: 1 },
      ]);
    });

    it("extracts arrays from content", () => {
      expect(extractArrayPayload({ data: { content: [{ id: 2 }] } })).toEqual([
        { id: 2 },
      ]);
    });

    it("extracts arrays from items", () => {
      expect(extractArrayPayload({ data: { items: [{ id: 3 }] } })).toEqual([
        { id: 3 },
      ]);
    });

    it("returns an empty array for unsupported payloads", () => {
      expect(extractArrayPayload({ data: { value: "nope" } })).toEqual([]);
      expect(extractArrayPayload(null)).toEqual([]);
    });
  });

  describe("createInFlightDeduper", () => {
    it("reuses a promise for an equivalent in-flight key", async () => {
      const deduper = createInFlightDeduper();
      const factory = jest.fn(
        () => new Promise((resolve) => setTimeout(() => resolve("ok"), 0)),
      );

      const first = deduper.run("GET /api/places", factory);
      const second = deduper.run("GET /api/places", factory);

      expect(first).toBe(second);
      expect(factory).toHaveBeenCalledTimes(1);
      expect(deduper.size()).toBe(1);
      await expect(first).resolves.toBe("ok");
      expect(deduper.size()).toBe(0);
    });

    it("cleans up failed requests", async () => {
      const deduper = createInFlightDeduper();

      await expect(
        deduper.run("GET /api/fail", () => Promise.reject(new Error("boom"))),
      ).rejects.toThrow("boom");

      expect(deduper.has("GET /api/fail")).toBe(false);
    });

    it("runs again after the previous request is settled", async () => {
      const deduper = createInFlightDeduper();
      const factory = jest.fn().mockResolvedValue("ok");

      await deduper.run("GET /api/places", factory);
      await deduper.run("GET /api/places", factory);

      expect(factory).toHaveBeenCalledTimes(2);
    });
  });
});
