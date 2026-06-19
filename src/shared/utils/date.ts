export function toLocalDateInput(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toLocalDayRange(date = new Date()): {
  desde: string;
  hasta: string;
} {
  const localDate = toLocalDateInput(date);
  return { desde: localDate, hasta: localDate };
}

export function validateDateRange(
  desde: string,
  hasta: string,
  maxDate = toLocalDateInput(),
): string | null {
  if (!desde) return "La fecha desde es obligatoria.";
  if (!hasta) return "La fecha hasta es obligatoria.";
  if (desde > hasta) return "La fecha desde no puede ser mayor que la fecha hasta.";
  if (desde > maxDate) return "La fecha desde no puede ser posterior a hoy.";
  if (hasta > maxDate) return "La fecha hasta no puede ser posterior a hoy.";
  return null;
}
