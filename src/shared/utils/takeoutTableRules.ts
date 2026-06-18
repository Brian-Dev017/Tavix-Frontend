export type TakeoutTableState =
  | "DISPONIBLE"
  | "OCUPADA"
  | "RESERVADA"
  | "INACTIVA";

export interface TakeoutTableRuleInput {
  numero: string;
  estado: TakeoutTableState;
}

export function isTakeoutTable(table: TakeoutTableRuleInput): boolean {
  return table.numero.trim().toLowerCase().includes("llevar");
}

export function findTakeoutTable<T extends TakeoutTableRuleInput>(
  tables: T[],
): T | null {
  return tables.find(isTakeoutTable) ?? null;
}

export function canAccessTakeoutTable(
  table: TakeoutTableRuleInput | null | undefined,
): boolean {
  return Boolean(table && isTakeoutTable(table) && table.estado === "DISPONIBLE");
}
