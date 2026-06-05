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

const STORAGE_PREFIX = "comprobante_pdf_data:";
const RECEIPT_CHARS = 42;

function sanitizeText(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/[()\\]/g, "\\$&")
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
  return sanitizeText(data.negocioNombre) || "LA FLOR DEL TUMBO";
}

function addBusinessHeader(lines: string[], data: PdfComprobanteData) {
  lines.push(centerLine(negocioNombre(data).toUpperCase()));
  if (data.negocioRuc) lines.push(centerLine(`RUC: ${data.negocioRuc}`));
  if (data.negocioDireccion) {
    for (const line of wrapText(data.negocioDireccion)) lines.push(centerLine(line));
  }
}

function addItems(lines: string[], data: PdfComprobanteData) {
  for (const item of data.items) {
    for (const line of wrapText(item.producto)) lines.push(line);
    lines.push(rightLine(`${item.cantidad} x ${fmtMoney(item.precio)}`, fmtMoney(item.subtotal)));
    if (item.observaciones) {
      for (const line of wrapText(`Obs: ${item.observaciones}`, RECEIPT_CHARS - 2)) {
        lines.push(`  ${line}`);
      }
    }
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
  lines.push(centerLine("Impresora termica 80mm"));
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

function buildBoletaFacturaLines(data: PdfComprobanteData): string[] {
  const lines: string[] = [];
  addBusinessHeader(lines, data);
  lines.push(separator("*"));
  lines.push(centerLine(sanitizeText(data.tipoComprobante).toUpperCase()));
  lines.push(centerLine(comprobanteCodigo(data)));
  lines.push(rightLine("Fecha", fmtDate(data.pagadoEn)));
  lines.push(rightLine("Pedido", `P-${data.pedidoId}`));
  lines.push(rightLine("Metodo", data.metodoPago));
  lines.push(separator("-"));

  if (data.clienteDocumento || data.clienteNombre || data.clienteDireccion) {
    if (data.clienteDocumento) lines.push(rightLine("Doc.", data.clienteDocumento));
    if (data.clienteNombre) {
      for (const line of wrapText(`Cliente: ${data.clienteNombre}`)) lines.push(line);
    }
    if (data.clienteDireccion) {
      for (const line of wrapText(`Direccion: ${data.clienteDireccion}`)) lines.push(line);
    }
    lines.push(separator("-"));
  }

  lines.push(rightLine("DESCRIPCION", "IMPORTE"));
  addItems(lines, data);
  lines.push(separator("="));
  lines.push(rightLine("SUBTOTAL", fmtMoney(data.subtotal)));
  lines.push(rightLine("IGV 18%", fmtMoney(data.igv)));
  if (Number(data.descuento ?? 0) > 0) {
    lines.push(rightLine("DESCUENTO", `-${fmtMoney(data.descuento)}`));
  }
  lines.push(rightLine("TOTAL A PAGAR", fmtMoney(data.total)));
  lines.push(separator("="));
  if (sanitizeText(data.metodoPago) === "EFECTIVO") {
    lines.push(rightLine("RECIBIDO", fmtMoney(data.efectivoRecibido)));
    lines.push(rightLine("VUELTO", fmtMoney(data.vuelto)));
  }
  lines.push("");
  lines.push(centerLine("Representacion impresa"));
  lines.push(centerLine("Gracias por su compra"));
  return lines;
}

function buildLines(data: PdfComprobanteData): string[] {
  return esTicket(data) ? buildTicketLines(data) : buildBoletaFacturaLines(data);
}

function encodePdfText(text: string): string {
  return sanitizeText(text);
}

function createPdfBlob(data: PdfComprobanteData): Blob {
  const pageWidth = 226.77;
  const marginLeft = 12;
  const topMargin = 20;
  const bottomMargin = 28;
  const lineHeight = 10.5;
  const lines = buildLines(data);
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

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
  triggerDownload(
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
