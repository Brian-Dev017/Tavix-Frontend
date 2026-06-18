export function normalizeCategoryName(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function isColdDrinksCategory(value: unknown): boolean {
  return normalizeCategoryName(value) === "bebidas frias";
}

export function sumItemQuantities(
  items: Array<{ cantidad: number }>,
): number {
  return items.reduce(
    (total, item) => total + Math.max(0, Number(item.cantidad) || 0),
    0,
  );
}

export function kitchenDispatchMessage(
  kitchenUnits: number,
  directUnits: number,
): string {
  const kitchen = Math.max(0, Number(kitchenUnits) || 0);
  const direct = Math.max(0, Number(directUnits) || 0);

  if (kitchen > 0 && direct > 0) {
    return `${kitchen} unidad${kitchen !== 1 ? "es" : ""} enviada${kitchen !== 1 ? "s" : ""} a cocina y ${direct} bebida${direct !== 1 ? "s" : ""} fría${direct !== 1 ? "s" : ""} para entrega directa`;
  }
  if (kitchen > 0) {
    return `${kitchen} unidad${kitchen !== 1 ? "es" : ""} enviada${kitchen !== 1 ? "s" : ""} a cocina`;
  }
  return `${direct} bebida${direct !== 1 ? "s" : ""} fría${direct !== 1 ? "s" : ""} lista${direct !== 1 ? "s" : ""} para entrega directa`;
}
