import { describe, expect, it } from "vitest";
import {
  buildComprobanteLines,
  type PdfComprobanteData,
} from "./comprobantePdf";

function comprobante(
  tipoComprobante: string,
  overrides: Partial<PdfComprobanteData> = {},
): PdfComprobanteData {
  return {
    comprobanteId: 1,
    pedidoId: 2,
    tipoComprobante,
    negocioNombre: "La Flor del Tumbo",
    negocioRuc: "20608280333",
    negocioDireccion: "Cal. Cesar Morelli 139 P-3, San Borja, Lima",
    negocioLogoUrl: "",
    negocioIgvPorcentaje: 18,
    serie: tipoComprobante === "Factura" ? "F001" : "B001",
    numero: 42,
    metodoPago: "EFECTIVO",
    subtotal: 38.98,
    igv: 7.02,
    descuento: 0,
    total: 46,
    efectivoRecibido: 50,
    vuelto: 4,
    pagadoEn: "2026-06-18T11:33:00-05:00",
    clienteDocumento:
      tipoComprobante === "Factura" ? "20123456789" : "12345678",
    clienteNombre:
      tipoComprobante === "Factura"
        ? "Empresa Prueba SAC"
        : "María José Pérez",
    clienteDireccion:
      tipoComprobante === "Factura" ? "Av. Principal 123" : "",
    items: [
      {
        producto: "Ceviche clásico",
        cantidad: 2,
        precio: 20,
        subtotal: 40,
        observaciones: "Sin cebolla",
      },
      {
        producto: "Chicha morada",
        cantidad: 1,
        precio: 6,
        subtotal: 6,
        observaciones: null,
      },
    ],
    ...overrides,
  };
}

describe("comprobante lines", () => {
  it.each(["Ticket", "Boleta", "Factura"])(
    "no imprime observaciones operativas ni referencias a impresoras en %s",
    (tipo) => {
      const text = buildComprobanteLines(comprobante(tipo)).join("\n");
      expect(text).not.toMatch(/impresora/i);
      expect(text).not.toMatch(/sin cebolla/i);
      expect(text).not.toMatch(/obs:/i);
    },
  );

  it("construye la boleta térmica en el orden aprobado", () => {
    const lines = buildComprobanteLines(comprobante("Boleta"));
    const text = lines.join("\n");

    expect(text).toContain("LA FLOR DEL TUMBO");
    expect(text).toContain("RUC: 20608280333");
    expect(text).toContain("BOLETA DE VENTA ELECTRONICA");
    expect(text).toContain("B001-00000042");
    expect(text).toContain("DNI: 12345678");
    expect(text).toContain("CLIENTE: MARIA JOSE PEREZ");
    expect(text.indexOf("DNI: 12345678")).toBeLessThan(
      text.indexOf("Descripcion"),
    );
    expect(text).toContain("Descripcion");
    expect(text).toContain("Cant.");
    expect(text).toContain("Precio");
    expect(text).toContain("Total");
    expect(text).toContain("CEVICHE CLASICO");
    expect(text).toContain("CHICHA MORADA");
    expect(text).toContain("S/ 20.00");
    expect(text).toContain("S/ 40.00");
    expect(text).toContain("3 UNIDAD(ES)");
    expect(text).toContain("Op. Exonerada");
    expect(text).toContain("Op. Inafecta");
    expect(text).toContain("Op. Gravada");
    expect(text).toContain("I.G.V. (18%)");
    expect(text).toContain("Importe Total");
    expect(text).toContain("TOTAL A PAGAR");
    expect(text).toContain("CUARENTA Y SEIS Y 00/100 SOLES");
    expect(text).toContain("SOLES");
    expect(text).toContain("VUELTO");
    expect(text).toContain("18.06.26 | 11:33");
  });

  it("construye factura con datos fiscales antes del detalle", () => {
    const text = buildComprobanteLines(comprobante("Factura")).join("\n");

    expect(text).toContain("FACTURA ELECTRONICA");
    expect(text).toContain("F001-00000042");
    expect(text).toContain("RUC: 20123456789");
    expect(text).toContain("CLIENTE: EMPRESA PRUEBA SAC");
    expect(text).toContain("DIRECCION: AV. PRINCIPAL 123");
    expect(text.indexOf("RUC: 20123456789")).toBeLessThan(
      text.indexOf("Descripcion"),
    );
  });

  it("muestra descuento y método digital sin efectivo ni vuelto", () => {
    const text = buildComprobanteLines(
      comprobante("Boleta", {
        metodoPago: "YAPE",
        descuento: 2,
        total: 44,
        efectivoRecibido: null,
        vuelto: null,
      }),
    ).join("\n");

    expect(text).toContain("Descuento");
    expect(text).toContain("-S/ 2.00");
    expect(text).toContain("METODO");
    expect(text).toContain("YAPE");
    expect(text).not.toContain("VUELTO");
    expect(text).not.toMatch(/^SOLES/m);
  });

  it("envuelve productos largos sin perder sus importes", () => {
    const lines = buildComprobanteLines(
      comprobante("Boleta", {
        items: [
          {
            producto: "Hamburguesa artesanal especial de la casa",
            cantidad: 12,
            precio: 25.5,
            subtotal: 306,
          },
        ],
      }),
    );

    expect(lines.some((line) => line.includes("HAMBURGUESA"))).toBe(true);
    expect(lines.some((line) => line.includes("12"))).toBe(true);
    expect(lines.some((line) => line.includes("25.50"))).toBe(true);
    expect(lines.some((line) => line.includes("306.00"))).toBe(true);
    expect(lines.every((line) => line.length <= 42)).toBe(true);
  });

  it.each([
    [0, "CERO Y 00/100 SOLES"],
    [21.5, "VEINTIUNO Y 50/100 SOLES"],
    [100, "CIEN Y 00/100 SOLES"],
    [
      999999.99,
      "NOVECIENTOS NOVENTA Y NUEVE MIL NOVECIENTOS NOVENTA Y NUEVE Y 99/100 SOLES",
    ],
  ])("convierte S/ %s a letras", (total, expected) => {
    const text = buildComprobanteLines(
      comprobante("Boleta", { total }),
    ).join("\n").replace(/\s+/g, " ");

    expect(text).toContain(expected);
  });
});
