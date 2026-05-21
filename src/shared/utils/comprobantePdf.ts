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
  pagadoEn?: string | null;
  clienteNombre?: string;
  clienteDocumento?: string;
  clienteDireccion?: string;
  items: PdfComprobanteItem[];
}

const STORAGE_PREFIX = "comprobante_pdf_data:";

function sanitizeText(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/[()\\]/g, "\\$&")
    .replace(/\s+/g, " ")
    .trim();
}

function wrapText(text: string, maxChars: number): string[] {
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
    current = word;
  }

  if (current) lines.push(current);
  return lines.length ? lines : [clean.slice(0, maxChars)];
}

function fmtMoney(value: number): string {
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

function buildLines(data: PdfComprobanteData): string[] {
  const code = `${data.serie}-${String(data.numero).padStart(8, "0")}`;
  const lines: string[] = [
    sanitizeText(data.negocioNombre) || "TAVIX",
    ...(data.negocioRuc ? [`RUC: ${sanitizeText(data.negocioRuc)}`] : []),
    ...(data.negocioDireccion ? [sanitizeText(data.negocioDireccion)] : []),
    `Comprobante: ${data.tipoComprobante} ${code}`,
    `Pedido: P-${data.pedidoId}`,
    `Fecha: ${fmtDate(data.pagadoEn)}`,
    `Pago: ${sanitizeText(data.metodoPago) || "--"}`,
  ];

  if (data.clienteDocumento) lines.push(`Doc: ${sanitizeText(data.clienteDocumento)}`);
  if (data.clienteNombre) lines.push(`Cliente: ${sanitizeText(data.clienteNombre)}`);
  if (data.clienteDireccion) lines.push(`Direccion: ${sanitizeText(data.clienteDireccion)}`);

  lines.push("");
  lines.push("Detalle");

  for (const item of data.items) {
    for (const line of wrapText(`${item.cantidad}x ${item.producto}`, 42)) {
      lines.push(line);
    }
    lines.push(`  ${fmtMoney(item.precio)}  ->  ${fmtMoney(item.subtotal)}`);
    if (item.observaciones) {
      for (const line of wrapText(`Obs: ${item.observaciones}`, 42)) {
        lines.push(`  ${line}`);
      }
    }
  }

  lines.push("");
  lines.push(`Subtotal: ${fmtMoney(data.subtotal)}`);
  lines.push(`IGV: ${fmtMoney(data.igv)}`);
  if (Number(data.descuento ?? 0) > 0) lines.push(`Descuento: ${fmtMoney(data.descuento ?? 0)}`);
  lines.push(`Total: ${fmtMoney(data.total)}`);
  return lines;
}

function encodePdfText(text: string): string {
  return sanitizeText(text);
}

function createPdfBlob(data: PdfComprobanteData): Blob {
  const pageWidth = 595;
  const pageHeight = 842;
  const marginLeft = 48;
  const startY = 790;
  const lineHeight = 14;
  const lines = buildLines(data);
  const content: string[] = ["BT", "/F1 11 Tf"];

  lines.forEach((line, index) => {
    const y = startY - index * lineHeight;
    content.push(`1 0 0 1 ${marginLeft} ${y} Tm (${encodePdfText(line)}) Tj`);
  });
  content.push("ET");

  const stream = content.join("\n");
  const objects: string[] = [];
  const pushObject = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const fontId = pushObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const contentId = pushObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  const pageId = pushObject(
    `<< /Type /Page /Parent 4 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`,
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
