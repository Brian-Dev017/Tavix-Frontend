import { describe, expect, it } from "vitest";
import { moneyInputProps } from "./moneyInput";

describe("money input props", () => {
  it("uses a dot separator and limits input to two decimals", () => {
    expect(moneyInputProps).toEqual({
      mode: "decimal",
      locale: "en-US",
      useGrouping: false,
      step: 0.01,
      minFractionDigits: 0,
      maxFractionDigits: 2,
    });
  });
});
