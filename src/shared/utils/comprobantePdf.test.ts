import { describe, expect, it } from "vitest";
import {
  buildComprobanteLines,
  type PdfComprobanteData,
} from "./comprobantePdf";

function comprobante(tipoComprobante: string): PdfComprobanteData {
  return {
    comprobanteId: 1,
    pedidoId: 2,
    tipoComprobante,
    negocioNombre: "La Flor del Tumbo",
    negocioRuc: "20123456789",
    negocioDireccion: "Lima",
    negocioLogoUrl: "",
    serie: "B001",
    numero: 4,
    metodoPago: "EFECTIVO",
    subtotal: 20,
    igv: 3.05,
    descuento: 0,
    total: 20,
    efectivoRecibido: 20,
    vuelto: 0,
    pagadoEn: "2026-06-18T10:00:00",
    clienteDocumento: "",
    clienteNombre: "",
    clienteDireccion: "",
    items: [
      {
        producto: "Ceviche",
        cantidad: 1,
        precio: 20,
        subtotal: 20,
        observaciones: "Sin cebolla",
      },
    ],
  };
}

describe("comprobante lines", () => {
  it.each(["Ticket", "Boleta", "Factura"])(
    "does not print operational notes or printer references in %s",
    (tipo) => {
      const text = buildComprobanteLines(comprobante(tipo)).join("\n");
      expect(text).not.toMatch(/impresora/i);
      expect(text).not.toMatch(/sin cebolla/i);
      expect(text).not.toMatch(/obs:/i);
    },
  );
});
