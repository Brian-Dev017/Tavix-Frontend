import { describe, expect, it } from "vitest";
import {
  digitsInput,
  dni,
  hasAtMostTwoDecimals,
  money,
  personNameInput,
  ruc,
} from "./inputValidation";

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

  it("rechaza letras en DNI y RUC aunque tengan la longitud requerida", () => {
    expect(dni("1234567A")).not.toBeNull();
    expect(ruc("2012345678A")).not.toBeNull();
  });

  it("filtra documentos pegados y limita su longitud", () => {
    expect(digitsInput("20A123-45678999", 11)).toBe("20123456789");
    expect(digitsInput("12A3456789", 8)).toBe("12345678");
  });

  it("filtra numeros del nombre y conserva letras espanolas", () => {
    expect(personNameInput("María José")).toBe("María José");
    expect(personNameInput("María J0sé 123")).toBe("María Jsé ");
  });
});
