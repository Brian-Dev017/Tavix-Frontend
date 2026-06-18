import { isTakeoutTable } from "./takeoutTableRules";

export type AdminTableState =
  | "DISPONIBLE"
  | "OCUPADA"
  | "RESERVADA"
  | "INACTIVA";

export interface AdminTableRuleInput {
  numero: string;
  estado: AdminTableState;
}

export function isTakeoutAdminTable(table: AdminTableRuleInput): boolean {
  return isTakeoutTable(table);
}

export function canEditAdminTable(table: AdminTableRuleInput): boolean {
  if (isTakeoutAdminTable(table)) return table.estado === "DISPONIBLE";
  return table.estado === "DISPONIBLE" || table.estado === "RESERVADA";
}

export function canToggleAdminTable(table: AdminTableRuleInput): boolean {
  return table.estado === "DISPONIBLE" || table.estado === "INACTIVA";
}

export function canDeleteAdminTable(table: AdminTableRuleInput): boolean {
  if (isTakeoutAdminTable(table)) return false;
  return table.estado === "DISPONIBLE" || table.estado === "RESERVADA";
}
