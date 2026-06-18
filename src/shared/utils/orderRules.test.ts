import { describe, expect, it } from "vitest";
import {
  isColdDrinksCategory,
  kitchenDispatchMessage,
  normalizeCategoryName,
  sumItemQuantities,
} from "./orderRules";

describe("order rules", () => {
  it("normalizes accents, case and whitespace", () => {
    expect(normalizeCategoryName("  Bebidas frías ")).toBe("bebidas frias");
  });

  it("identifies the cold drinks category", () => {
    expect(isColdDrinksCategory("BEBIDAS FRIAS")).toBe(true);
    expect(isColdDrinksCategory("Bebidas calientes")).toBe(false);
  });

  it("counts units instead of distinct rows", () => {
    expect(sumItemQuantities([{ cantidad: 2 }, { cantidad: 3 }])).toBe(5);
  });

  it("describes kitchen and direct-delivery units in mixed orders", () => {
    expect(kitchenDispatchMessage(3, 2)).toBe(
      "3 unidades enviadas a cocina y 2 bebidas frías para entrega directa",
    );
  });

  it("does not claim kitchen delivery when only cold drinks are sent", () => {
    expect(kitchenDispatchMessage(0, 1)).toBe(
      "1 bebida fría lista para entrega directa",
    );
  });
});
