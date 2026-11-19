import { describe, expect, it } from "vitest";
import { formatFcfa } from "../lib/format-fcfa";

describe("formatFcfa", () => {
  it("formats XAF amounts with French grouping and no decimal places", () => {
    expect(formatFcfa(4500)).toBe("4\u202f500\u202fFCFA");
  });

  it("formats zero", () => {
    expect(formatFcfa(0)).toBe("0\u202fFCFA");
  });

  it.each([-1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid amount %s",
    (amount) => {
      expect(() => formatFcfa(amount)).toThrow(RangeError);
    },
  );
});
