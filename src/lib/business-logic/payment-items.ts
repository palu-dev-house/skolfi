export interface PaymentItemTarget {
  tuitionId?: string | null;
  feeBillId?: string | null;
  serviceFeeBillId?: string | null;
}

/**
 * App-level invariant: a Payment or OnlinePaymentItem must reference exactly
 * one of tuitionId / feeBillId / serviceFeeBillId. Throws otherwise.
 */
export function assertSingleBillTarget(item: PaymentItemTarget): void {
  const set = [item.tuitionId, item.feeBillId, item.serviceFeeBillId].filter(
    (v) => v != null && v !== "",
  );
  if (set.length === 0) {
    throw new Error(
      "Payment item must set one of tuitionId, feeBillId, or serviceFeeBillId",
    );
  }
  if (set.length > 1) {
    throw new Error(
      "Payment item must set exactly one of tuitionId, feeBillId, or serviceFeeBillId",
    );
  }
}

export type BillTargetType = "tuition" | "feeBill" | "serviceFeeBill";

/**
 * Narrow a payment item to its discriminator. Call `assertSingleBillTarget`
 * first (or rely on it here — this helper also asserts).
 */
export function resolveBillTargetType(item: PaymentItemTarget): BillTargetType {
  assertSingleBillTarget(item);
  if (item.tuitionId) return "tuition";
  if (item.feeBillId) return "feeBill";
  return "serviceFeeBill";
}
