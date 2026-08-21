import {
  extractPaymentStatus,
  isPaymentPending,
  mergePaymentSnapshot,
  shouldAcceptPaymentSnapshot,
} from "../paymentState";

describe("paymentState", () => {
  it("extracts the backend envelope without trusting checkout data", () => {
    expect(extractPaymentStatus({ data: { data: { paymentStatus: "paid" } } })).toEqual({
      paymentStatus: "paid",
    });
  });

  it("recognizes only controlled pending states", () => {
    expect(isPaymentPending("processing")).toBe(true);
    expect(isPaymentPending("redirected")).toBe(false);
  });

  it("merges authoritative payment fields into reservation state", () => {
    expect(mergePaymentSnapshot({ id: "r1", status: "awaiting_payment" }, {
      reservationStatus: "confirmed",
      paymentStatus: "paid",
      providerTransactionId: "tx-1",
    })).toMatchObject({
      status: "confirmed",
      paymentStatus: "paid",
      paymentId: "tx-1",
    });
  });

  it("does not allow a stale response to downgrade a terminal state", () => {
    expect(shouldAcceptPaymentSnapshot("paid", "processing")).toBe(false);
    expect(shouldAcceptPaymentSnapshot("paid", "paid")).toBe(true);
  });
});

