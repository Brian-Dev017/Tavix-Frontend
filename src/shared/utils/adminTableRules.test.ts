import { describe, expect, it } from "vitest";
import {
  canDeleteAdminTable,
  canEditAdminTable,
  canToggleAdminTable,
  isTakeoutAdminTable,
  type AdminTableState,
} from "./adminTableRules";

function mesa(numero: string, estado: AdminTableState) {
  return { numero, estado };
}

describe("admin table rules", () => {
  it("identifies the takeout table", () => {
    expect(isTakeoutAdminTable(mesa("Para llevar", "DISPONIBLE"))).toBe(true);
    expect(isTakeoutAdminTable(mesa("1", "DISPONIBLE"))).toBe(false);
  });

  it("allows editing and toggling an available takeout table", () => {
    const takeout = mesa("Para llevar", "DISPONIBLE");
    expect(canEditAdminTable(takeout)).toBe(true);
    expect(canToggleAdminTable(takeout)).toBe(true);
  });

  it("blocks editing but allows reactivating an inactive takeout table", () => {
    const takeout = mesa("Para llevar", "INACTIVA");
    expect(canEditAdminTable(takeout)).toBe(false);
    expect(canToggleAdminTable(takeout)).toBe(true);
  });

  it("blocks takeout table actions while occupied", () => {
    const takeout = mesa("Para llevar", "OCUPADA");
    expect(canEditAdminTable(takeout)).toBe(false);
    expect(canToggleAdminTable(takeout)).toBe(false);
  });

  it("never allows deleting the takeout table", () => {
    expect(
      canDeleteAdminTable(mesa("Para llevar", "DISPONIBLE")),
    ).toBe(false);
    expect(canDeleteAdminTable(mesa("Para llevar", "INACTIVA"))).toBe(false);
  });
});
