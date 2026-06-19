import { describe, expect, it } from "vitest";
import { toLocalDateInput, toLocalDayRange, validateDateRange } from "./date";

describe("date helpers", () => {
  it("formats the local calendar date without converting to UTC", () => {
    expect(toLocalDateInput(new Date(2026, 5, 18))).toBe("2026-06-18");
  });

  it("uses the same local calendar date for a full-day report range", () => {
    expect(toLocalDayRange(new Date(2026, 5, 18, 23, 59, 59))).toEqual({
      desde: "2026-06-18",
      hasta: "2026-06-18",
    });
  });

  it("rejects a future ending date", () => {
    expect(validateDateRange("2026-06-18", "2026-06-19", "2026-06-18")).toBe(
      "La fecha hasta no puede ser posterior a hoy.",
    );
  });

  it("rejects an inverted range", () => {
    expect(validateDateRange("2026-06-18", "2026-06-17", "2026-06-18")).toBe(
      "La fecha desde no puede ser mayor que la fecha hasta.",
    );
  });
});
