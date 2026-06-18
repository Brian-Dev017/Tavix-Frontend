import { describe, expect, it } from "vitest";
import { hasAtMostTwoDecimals, money } from "./inputValidation";

describe("input validation", () => {
  it.each([20.1, 20.2, 20.29, 0.07, 1.01])(
    "accepts valid monetary value %s",
    (value) => {
      expect(hasAtMostTwoDecimals(value)).toBe(true);
    },
  );

  it.each([20.123, 0.001, 1.999])(
    "rejects monetary value with more than two decimals: %s",
    (value) => {
      expect(hasAtMostTwoDecimals(value)).toBe(false);
    },
  );

  it.each([0, 20, 20.1, 20.12, 999999])(
    "accepts monetary value with up to two decimals: %s",
    (value) => {
      expect(money(value, "Monto")).toBeNull();
    },
  );

  it.each([20.123, 0.001])(
    "rejects monetary value with more than two decimals: %s",
    (value) => {
      expect(money(value, "Monto")).toBe(
        "Monto debe tener como máximo dos decimales",
      );
    },
  );
});
