import { downloadBlob } from "@/shared/utils/reportExport";

export interface PdfComprobanteItem {
  producto: string;
  cantidad: number;
  precio: number;
  subtotal: number;
  observaciones?: string | null;
}

export interface PdfComprobanteData {
  comprobanteId: number;
  pedidoId: number;
  tipoComprobante: string;
  negocioNombre?: string;
  negocioRuc?: string;
  negocioDireccion?: string;
  negocioLogoUrl?: string;
  negocioIgvPorcentaje?: number | null;
  serie: string;
  numero: number;
  metodoPago: string;
  subtotal: number;
  igv: number;
  descuento?: number;
  total: number;
  efectivoRecibido?: number | null;
  vuelto?: number | null;
  pagadoEn?: string | null;
  clienteNombre?: string;
  clienteDocumento?: string;
  clienteDireccion?: string;
  items: PdfComprobanteItem[];
}

export interface ComprobantePdfSource {
  comprobanteId: number;
  pedidoId: number;
  tipoComprobante: string;
  serie: string;
  numero: number;
  metodoPago: string;
  subtotal: number;
  igv: number;
  descuento?: number | null;
  total: number;
  efectivoRecibido?: number | null;
  vuelto?: number | null;
  pagadoEn?: string | null;
  clienteDocumento?: string | null;
  clienteNombre?: string | null;
  clienteDireccion?: string | null;
  negocioNombre?: string | null;
  negocioRuc?: string | null;
  negocioDireccion?: string | null;
  negocioLogoUrl?: string | null;
  negocioIgvPorcentaje?: number | null;
  items: Array<{
    producto: string;
    cantidad: number;
    precio: number;
    subtotal: number;
    observaciones?: string | null;
  }>;
}

const STORAGE_PREFIX = "comprobante_pdf_data:";
const RECEIPT_CHARS = 42;
const DESCRIPTION_WIDTH = 18;
const QUANTITY_WIDTH = 5;
const PRICE_WIDTH = 8;
const TOTAL_WIDTH = 11;

function sanitizeText(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wrapText(text: string, maxChars = RECEIPT_CHARS): string[] {
  const clean = sanitizeText(text);
  if (!clean) return [""];
  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word.length > maxChars ? word.slice(0, maxChars) : word;
  }

  if (current) lines.push(current);
  return lines.length ? lines : [clean.slice(0, maxChars)];
}

function fmtMoney(value: number | null | undefined): string {
  return `S/ ${Number(value ?? 0).toFixed(2)}`;
}

function fmtDate(value?: string | null): string {
  if (!value) return "--";
  return new Date(value).toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtReceiptDate(value?: string | null): string {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  const parts = new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "--";
  return `${get("day")}.${get("month")}.${get("year")} | ${get("hour")}:${get("minute")}`;
}

function separator(char = "-"): string {
  return char.repeat(RECEIPT_CHARS);
}

function centerLine(value: string): string {
  const text = sanitizeText(value);
  if (text.length >= RECEIPT_CHARS) return text.slice(0, RECEIPT_CHARS);
  const left = Math.floor((RECEIPT_CHARS - text.length) / 2);
  return `${" ".repeat(left)}${text}`;
}

function rightLine(left: string, right: string): string {
  const cleanRight = sanitizeText(right);
  let cleanLeft = sanitizeText(left);
  const available = Math.max(1, RECEIPT_CHARS - cleanRight.length - 1);
  if (cleanLeft.length > available) cleanLeft = cleanLeft.slice(0, available);
  return `${cleanLeft}${" ".repeat(Math.max(1, RECEIPT_CHARS - cleanLeft.length - cleanRight.length))}${cleanRight}`;
}

function comprobanteCodigo(data: PdfComprobanteData): string {
  return `${sanitizeText(data.serie)}-${String(data.numero).padStart(8, "0")}`;
}

function esTicket(data: PdfComprobanteData): boolean {
  return sanitizeText(data.tipoComprobante).toLowerCase().includes("ticket");
}

function negocioNombre(data: PdfComprobanteData): string {
  return (
    sanitizeText(data.negocioNombre) ||
    (esTicket(data) ? "LA FLOR DEL TUMBO" : "")
  );
}

function addBusinessHeader(lines: string[], data: PdfComprobanteData) {
  const nombre = negocioNombre(data);
  if (nombre) lines.push(centerLine(nombre.toUpperCase()));
  if (data.negocioRuc) lines.push(centerLine(`RUC: ${data.negocioRuc}`));
  if (data.negocioDireccion) {
    for (const line of wrapText(data.negocioDireccion.toUpperCase())) {
      lines.push(centerLine(line));
    }
  }
}

function addItems(lines: string[], data: PdfComprobanteData) {
  for (const item of data.items) {
    for (const line of wrapText(item.producto)) lines.push(line);
    lines.push(rightLine(`${item.cantidad} x ${fmtMoney(item.precio)}`, fmtMoney(item.subtotal)));
    lines.push(separator("-"));
  }
}

function buildTicketLines(data: PdfComprobanteData): string[] {
  const lines: string[] = [];
  addBusinessHeader(lines, data);
  lines.push("");
  lines.push(centerLine(`Ticket de venta #${data.numero}`));
  lines.push("");
  lines.push(centerLine(fmtDate(data.pagadoEn)));
  lines.push(centerLine("Lo atendio: Caja"));
  lines.push(centerLine("Cliente: Mostrador"));
  lines.push("");
  lines.push(centerLine("-".repeat(24)));
  addItems(lines, data);
  lines.push(centerLine("-".repeat(24)));
  lines.push(rightLine("Total", fmtMoney(data.total)));
  if (sanitizeText(data.metodoPago) === "EFECTIVO") {
    lines.push(rightLine("Su pago", fmtMoney(data.efectivoRecibido)));
    lines.push(rightLine("Cambio", fmtMoney(data.vuelto)));
  } else {
    lines.push(rightLine("Pago", data.metodoPago));
  }
  lines.push("");
  lines.push(centerLine("Gracias por su visita"));
  return lines;
}

const UNITS = [
  "",
  "UNO",
  "DOS",
  "TRES",
  "CUATRO",
  "CINCO",
  "SEIS",
  "SIETE",
  "OCHO",
  "NUEVE",
  "DIEZ",
  "ONCE",
  "DOCE",
  "TRECE",
  "CATORCE",
  "QUINCE",
  "DIECISEIS",
  "DIECISIETE",
  "DIECIOCHO",
  "DIECINUEVE",
  "VEINTE",
  "VEINTIUNO",
  "VEINTIDOS",
  "VEINTITRES",
  "VEINTICUATRO",
  "VEINTICINCO",
  "VEINTISEIS",
  "VEINTISIETE",
  "VEINTIOCHO",
  "VEINTINUEVE",
];

const TENS = [
  "",
  "",
  "",
  "TREINTA",
  "CUARENTA",
  "CINCUENTA",
  "SESENTA",
  "SETENTA",
  "OCHENTA",
  "NOVENTA",
];

const HUNDREDS = [
  "",
  "CIENTO",
  "DOSCIENTOS",
  "TRESCIENTOS",
  "CUATROCIENTOS",
  "QUINIENTOS",
  "SEISCIENTOS",
  "SETECIENTOS",
  "OCHOCIENTOS",
  "NOVECIENTOS",
];

function integerToWords(value: number): string {
  const n = Math.trunc(Math.max(0, Math.min(999999, value)));
  if (n === 0) return "CERO";
  if (n < 30) return UNITS[n];
  if (n < 100) {
    const unit = n % 10;
    return `${TENS[Math.trunc(n / 10)]}${unit ? ` Y ${UNITS[unit]}` : ""}`;
  }
  if (n === 100) return "CIEN";
  if (n < 1000) {
    return `${HUNDREDS[Math.trunc(n / 100)]} ${integerToWords(n % 100)}`.trim();
  }
  const thousands = Math.trunc(n / 1000);
  const rest = n % 1000;
  const thousandsText =
    thousands === 1
      ? "MIL"
      : `${integerToWords(thousands).replace(/VEINTIUNO$/, "VEINTIUN").replace(/ Y UNO$/, " Y UN").replace(/UNO$/, "UN")} MIL`;
  return `${thousandsText}${rest ? ` ${integerToWords(rest)}` : ""}`;
}

function moneyToWords(value: number): string {
  const safe = Math.max(0, Math.min(999999.99, Number(value) || 0));
  const roundedCents = Math.round(safe * 100);
  const integer = Math.trunc(roundedCents / 100);
  const cents = roundedCents % 100;
  return `${integerToWords(integer)} Y ${String(cents).padStart(2, "0")}/100 SOLES`;
}

function formatColumns(
  description: string,
  quantity: string,
  price: string,
  total: string,
): string {
  return [
    sanitizeText(description).slice(0, DESCRIPTION_WIDTH).padEnd(DESCRIPTION_WIDTH),
    sanitizeText(quantity).slice(0, QUANTITY_WIDTH).padStart(QUANTITY_WIDTH),
    sanitizeText(price).slice(0, PRICE_WIDTH).padStart(PRICE_WIDTH),
    sanitizeText(total).slice(0, TOTAL_WIDTH).padStart(TOTAL_WIDTH),
  ].join("");
}

function itemLines(item: PdfComprobanteItem): string[] {
  const descriptions = wrapText(item.producto.toUpperCase(), DESCRIPTION_WIDTH);
  return descriptions.map((description, index) =>
    formatColumns(
      description,
      index === 0 ? String(item.cantidad) : "",
      index === 0 ? `S/ ${Number(item.precio).toFixed(2)}` : "",
      index === 0 ? `S/ ${Number(item.subtotal).toFixed(2)}` : "",
    ),
  );
}

function comprobanteTitle(data: PdfComprobanteData): string {
  const tipo = sanitizeText(data.tipoComprobante).toLowerCase();
  return tipo.includes("factura")
    ? "FACTURA ELECTRONICA"
    : "BOLETA DE VENTA ELECTRONICA";
}

function addClient(lines: string[], data: PdfComprobanteData) {
  const factura = comprobanteTitle(data).startsWith("FACTURA");
  if (data.clienteDocumento) {
    lines.push(`${factura ? "RUC" : "DNI"}: ${sanitizeText(data.clienteDocumento)}`);
  }
  if (data.clienteNombre) {
    for (const line of wrapText(`CLIENTE: ${data.clienteNombre.toUpperCase()}`)) {
      lines.push(line);
    }
  }
  if (factura && data.clienteDireccion) {
    for (const line of wrapText(`DIRECCION: ${data.clienteDireccion.toUpperCase()}`)) {
      lines.push(line);
    }
  }
}

function addFiscalSummary(lines: string[], data: PdfComprobanteData) {
  const igvPercentage = Number(data.negocioIgvPorcentaje ?? 18);
  lines.push(rightLine("Op. Exonerada", fmtMoney(0)));
  lines.push(rightLine("Op. Inafecta", fmtMoney(0)));
  lines.push(rightLine("Op. Gravada", fmtMoney(data.subtotal)));
  lines.push(rightLine(`I.G.V. (${igvPercentage.toFixed(0)}%)`, fmtMoney(data.igv)));
  if (Number(data.descuento ?? 0) > 0) {
    lines.push(rightLine("Descuento", `-S/ ${Number(data.descuento).toFixed(2)}`));
  }
  lines.push(rightLine("Importe Total", fmtMoney(data.total)));
}

function buildBoletaFacturaLines(data: PdfComprobanteData): string[] {
  const lines: string[] = [];
  addBusinessHeader(lines, data);
  lines.push(separator("-"));
  lines.push(centerLine(comprobanteTitle(data)));
  lines.push(centerLine(comprobanteCodigo(data)));
  addClient(lines, data);
  lines.push(separator("-"));
  lines.push(formatColumns("Descripcion", "Cant.", "Precio", "Total"));
  lines.push(separator("-"));
  for (const item of data.items) lines.push(...itemLines(item));
  lines.push(`${data.items.reduce((sum, item) => sum + Number(item.cantidad || 0), 0)} UNIDAD(ES)`);
  lines.push(separator("-"));
  addFiscalSummary(lines, data);
  lines.push(separator("-"));
  lines.push(rightLine("TOTAL A PAGAR", fmtMoney(data.total)));
  for (const line of wrapText(moneyToWords(data.total))) lines.push(centerLine(line));
  if (sanitizeText(data.metodoPago) === "EFECTIVO") {
    lines.push(rightLine("SOLES", fmtMoney(data.efectivoRecibido)));
    lines.push(rightLine("VUELTO", fmtMoney(data.vuelto)));
  } else {
    lines.push(rightLine("METODO", data.metodoPago));
  }
  lines.push(separator("-"));
  lines.push(centerLine(fmtReceiptDate(data.pagadoEn)));
  return lines;
}

export function buildComprobanteLines(data: PdfComprobanteData): string[] {
  return esTicket(data) ? buildTicketLines(data) : buildBoletaFacturaLines(data);
}

function encodePdfText(text: string): string {
  return sanitizeText(text).replace(/[()\\]/g, "\\$&");
}

function createPdfBlob(data: PdfComprobanteData): Blob {
  const pageWidth = 226.77;
  const marginLeft = 12;
  const topMargin = 20;
  const bottomMargin = 28;
  const lineHeight = 10.5;
  const lines = buildComprobanteLines(data);
  const pageHeight = Math.max(420, topMargin + bottomMargin + lines.length * lineHeight);
  const startY = pageHeight - topMargin;
  const content: string[] = ["BT", "/F1 8.5 Tf"];

  lines.forEach((line, index) => {
    const y = startY - index * lineHeight;
    content.push(`1 0 0 1 ${marginLeft} ${y.toFixed(2)} Tm (${encodePdfText(line)}) Tj`);
  });
  content.push("ET");

  const stream = content.join("\n");
  const objects: string[] = [];
  const pushObject = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const fontId = pushObject("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>");
  const contentId = pushObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  const pageId = pushObject(
    `<< /Type /Page /Parent 4 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight.toFixed(2)}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`,
  );
  const pagesId = pushObject(`<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`);
  const catalogId = pushObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefPosition = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefPosition}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

export function toPdfComprobanteData(
  source: ComprobantePdfSource,
): PdfComprobanteData {
  return {
    comprobanteId: source.comprobanteId,
    pedidoId: source.pedidoId,
    tipoComprobante: source.tipoComprobante,
    serie: source.serie,
    numero: source.numero,
    metodoPago: source.metodoPago,
    subtotal: source.subtotal,
    igv: source.igv,
    descuento: source.descuento ?? 0,
    total: source.total,
    efectivoRecibido: source.efectivoRecibido ?? null,
    vuelto: source.vuelto ?? null,
    pagadoEn: source.pagadoEn ?? null,
    clienteDocumento: source.clienteDocumento ?? "",
    clienteNombre: source.clienteNombre ?? "",
    clienteDireccion: source.clienteDireccion ?? "",
    negocioNombre: source.negocioNombre ?? "",
    negocioRuc: source.negocioRuc ?? "",
    negocioDireccion: source.negocioDireccion ?? "",
    negocioLogoUrl: source.negocioLogoUrl ?? "",
    negocioIgvPorcentaje: source.negocioIgvPorcentaje ?? 18,
    items: source.items.map((item) => ({
      producto: item.producto,
      cantidad: item.cantidad,
      precio: item.precio,
      subtotal: item.subtotal,
      observaciones: item.observaciones ?? null,
    })),
  };
}

export function saveComprobantePdfData(data: PdfComprobanteData) {
  localStorage.setItem(`${STORAGE_PREFIX}${data.comprobanteId}`, JSON.stringify(data));
}

export function loadComprobantePdfData(comprobanteId: number): PdfComprobanteData | null {
  const raw = localStorage.getItem(`${STORAGE_PREFIX}${comprobanteId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PdfComprobanteData;
  } catch {
    return null;
  }
}

export function downloadComprobantePdf(data: PdfComprobanteData) {
  downloadBlob(
    createPdfBlob(data),
    `comprobante-${data.serie}-${String(data.numero).padStart(8, "0")}.pdf`,
  );
}

export function openComprobantePdf(data: PdfComprobanteData) {
  const blob = createPdfBlob(data);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
