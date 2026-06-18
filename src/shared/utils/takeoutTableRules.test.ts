import { describe, expect, it } from "vitest";
import {
  canAccessTakeoutTable,
  findTakeoutTable,
  type TakeoutTableState,
} from "./takeoutTableRules";

function mesa(numero: string, estado: TakeoutTableState) {
  return { numero, estado };
}

describe("takeout table rules", () => {
  it("finds the takeout table by its label", () => {
    expect(
      findTakeoutTable([
        mesa("1", "DISPONIBLE"),
        mesa("Para llevar", "DISPONIBLE"),
      ]),
    ).toEqual(mesa("Para llevar", "DISPONIBLE"));
  });

  it("allows access only while the takeout table is available", () => {
    expect(
      canAccessTakeoutTable(mesa("Para llevar", "DISPONIBLE")),
    ).toBe(true);
    expect(
      canAccessTakeoutTable(mesa("Para llevar", "INACTIVA")),
    ).toBe(false);
    expect(canAccessTakeoutTable(null)).toBe(false);
  });
});
