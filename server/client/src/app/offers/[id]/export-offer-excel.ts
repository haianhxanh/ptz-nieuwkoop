import * as XLSX from "xlsx-js-style";
import type { Offer, ItemGroup, AdditionalItem } from "@/lib/api";

export type OfferTotals = {
  itemsSubtotal: number;
  groupsDiscount: number;
  totalDiscountAmount: number;
  additionalCostTotal: number;
  additionalSellTotal: number;
  subtotal: number;
  total: number;
  totalSell: number;
  totalSellExclVat: number;
};

type StyleRecord = { r: number; c: number; style: object };

export function buildAndDownloadOfferExcel(
  offer: Offer,
  editedGroups: ItemGroup[],
  additionalItems: AdditionalItem[],
  totals: OfferTotals,
  displayExchangeRate: number,
  notesText: string,
  onSuccess: () => void,
  sellMultiplier = 1,
): void {
  const wb = XLSX.utils.book_new();
  const data: (string | number)[][] = [];
  const styles: StyleRecord[] = [];

  const pushRow = (row: (string | number)[]) => {
    data.push(row);
  };
  const currentRow = () => data.length;
  const styleCell = (r: number, c: number, style: object) => styles.push({ r, c, style });

  const BOLD = { font: { bold: true } };
  const BOLD_ITALIC = { font: { bold: true, italic: true } };
  const BOLD_TITLE = { font: { bold: true, sz: 14 } };
  const MUTED = { font: { color: { rgb: "999999" } } };
  const DARK_GRAY = { font: { bold: true, color: { rgb: "555555" } } };
  const RED = { font: { color: { rgb: "CC0000" } } };
  const GREEN = { font: { bold: true, color: { rgb: "1A7340" } } };
  const BOLD_LARGE = { font: { bold: true, sz: 11 } };
  const HEADER_BG = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "000000" } } };
  const GROUP_BG = { font: { bold: true, italic: true }, fill: { fgColor: { rgb: "D5F5E3" } } };
  const LIGHT_GRAY_BG = { font: { bold: true }, fill: { fgColor: { rgb: "F2F2F2" } } };

  // ── Offer header ─────────────────────────────────────────────────────────────

  styleCell(0, 0, BOLD_TITLE);
  pushRow([`${offer.title}`]);
  pushRow([]);
  pushRow(["Klient:", offer.customer.name]);
  pushRow(["Email:", offer.customer.email]);
  if (offer.customer.phone) pushRow(["Telefon:", offer.customer.phone]);
  if (offer.customer.company_name) {
    pushRow(["Firma:", offer.customer.company_name]);
    if (offer.customer.company_ico) pushRow(["IČO:", offer.customer.company_ico]);
    if (offer.customer.company_dic) pushRow(["DIČ:", offer.customer.company_dic]);
  }
  if (offer.customer.address) {
    pushRow(["Adresa:", offer.customer.address]);
    pushRow(["", `${offer.customer.postal_code} ${offer.customer.city}`]);
    if (offer.customer.country) pushRow(["", offer.customer.country]);
  }
  pushRow([]);
  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;
  pushRow(["Datum:", todayStr]);
  const multiplierRowIdx = currentRow();
  pushRow(["Koeficient:", sellMultiplier]);
  pushRow([]);

  // B column of the multiplier row, used as a variable in formulas
  const MULTIPLIER_CELL = `$B$${multiplierRowIdx + 1}`;

  // ── Column header ─────────────────────────────────────────────────────────────
  // A=SKU  B=Název  C=Množství  D=Cena/ks(N.)  E=DPH(%)  F=Cena/ks(P. vč. DPH)  G=Celkem(N.)  H=Celkem(P. vč. DPH)

  const colHeader = ["SKU", "Název", "Množství", "Cena/ks (N.)", "DPH (%)", "Cena/ks (P. vč. DPH)", "Celkem (N.)", "Celkem (P. vč. DPH)"];
  const headerRowIdx = currentRow();
  for (let c = 0; c < colHeader.length; c++) styleCell(headerRowIdx, c, HEADER_BG);
  pushRow(colHeader);

  const itemRowIndices: number[] = [];

  // ── Product groups ────────────────────────────────────────────────────────────

  for (const group of editedGroups) {
    const groupNameRow = currentRow();
    for (let c = 0; c < 8; c++) styleCell(groupNameRow, c, GROUP_BG);
    pushRow([group.name, "", "", "", "", "", "", ""]);

    for (const item of group.items) {
      const vatRate = item.vat_rate ?? 21;
      itemRowIndices.push(currentRow());
      pushRow([item.sku || "", item.name, Number(item.quantity) || 1, Number(item.unit_price) || 0, vatRate, "", "", ""]);
    }

    const sectionN = Math.round(group.items.reduce((s, i) => s + i.unit_price * i.quantity, 0) * 100) / 100;
    const sectionP =
      Math.round(
        group.items.reduce((s, i) => {
          const vat = (i.vat_rate ?? 21) / 100;
          return s + i.unit_price * (1 + vat) * sellMultiplier * i.quantity;
        }, 0) * 100,
      ) / 100;
    const rawDiscount = Number(group.discount) || 0;
    const discount = group.discount_type === "percent" ? Math.round(sectionP * rawDiscount / 100 * 100) / 100 : rawDiscount;
    const discountLabel = group.discount_type === "percent" ? `Sleva ${rawDiscount} % — ${group.name}` : `Sleva — ${group.name}`;

    if (discount > 0) {
      const discRow = currentRow();
      styleCell(discRow, 0, RED);
      styleCell(discRow, 6, RED);
      styleCell(discRow, 7, RED);
      pushRow([discountLabel, "", "", "", "", "", -discount, -discount]);
    }

    const netN = Math.round((sectionN - discount) * 100) / 100;
    const netP = Math.round((sectionP - discount) * 100) / 100;
    const subtotalRow = currentRow();
    styleCell(subtotalRow, 0, DARK_GRAY);
    styleCell(subtotalRow, 6, DARK_GRAY);
    styleCell(subtotalRow, 7, DARK_GRAY);
    pushRow([`Součet — ${group.name}`, "", "", "", "", "", netN, netP]);
  }

  pushRow([]);

  // ── Additional items ──────────────────────────────────────────────────────────

  const hasAdditional = additionalItems.some((a) => (Number(a.price) || 0) > 0 || (Number(a.sell_price) || 0) > 0);
  if (hasAdditional) {
    const addRow = currentRow();
    for (let c = 0; c < 8; c++) styleCell(addRow, c, LIGHT_GRAY_BG);
    pushRow(["Dodatečné položky", "", "", "", "", "", "", ""]);
    for (const item of additionalItems) {
      const price = Number(item.price) || 0;
      const sellPrice = Number(item.sell_price) || 0;
      if (price > 0 || sellPrice > 0) {
        pushRow(["", item.title, "", "", "", "", price || "", sellPrice || ""]);
      }
    }
    pushRow([]);
  }

  // ── Summary ───────────────────────────────────────────────────────────────────

  const meziRow = currentRow();
  styleCell(meziRow, 0, MUTED);
  styleCell(meziRow, 6, MUTED);
  styleCell(meziRow, 7, MUTED);
  pushRow(["Mezisoučet (N. / P. vč. DPH):", "", "", "", "", "", totals.itemsSubtotal, totals.totalSell - totals.additionalSellTotal + totals.groupsDiscount]);

  if (totals.groupsDiscount > 0) {
    const slevaRow = currentRow();
    styleCell(slevaRow, 0, RED);
    styleCell(slevaRow, 6, RED);
    styleCell(slevaRow, 7, RED);
    pushRow(["Sleva celkem:", "", "", "", "", "", -totals.groupsDiscount, -totals.groupsDiscount]);
  }

  pushRow([]);

  const nakupRow = currentRow();
  styleCell(nakupRow, 0, BOLD_LARGE);
  styleCell(nakupRow, 6, BOLD_LARGE);
  pushRow(["Celkem nákup:", "", "", "", "", "", totals.total, ""]);

  const prodejRow = currentRow();
  styleCell(prodejRow, 0, BOLD_LARGE);
  styleCell(prodejRow, 7, BOLD_LARGE);
  pushRow(["Celkem prodej (vč. DPH):", "", "", "", "", "", "", totals.totalSell]);

  const prodejExclRow = currentRow();
  styleCell(prodejExclRow, 0, MUTED);
  styleCell(prodejExclRow, 7, MUTED);

  const marze = totals.totalSell - totals.total;
  const marzePercent = totals.total > 0 ? ((marze / totals.total) * 100).toFixed(1) : "0.0";
  const marzeRow = currentRow();
  styleCell(marzeRow, 0, GREEN);
  styleCell(marzeRow, 7, GREEN);
  pushRow([`Marže (${marzePercent} %):`, "", "", "", "", "", "", marze]);

  pushRow([]);

  pushRow(["Směnný kurz:", `1 EUR = ${displayExchangeRate.toFixed(2)} CZK`]);

  if (notesText) {
    pushRow([]);
    pushRow(["Poznámka:", notesText]);
  }

  // ── Build worksheet ───────────────────────────────────────────────────────────

  const ws = XLSX.utils.aoa_to_sheet(data);

  for (const { r, c, style } of styles) {
    const ref = XLSX.utils.encode_cell({ r, c });
    if (ws[ref]) (ws[ref] as any).s = style;
  }

  const NUM_FMT_2 = { numFmt: "#,##0.00" };

  // D=Cena/ks(N.) [col3]  E=DPH% [col4]  F=Cena/ks(P. vč. DPH) [col5]  G=Celkem(N.) [col6]  H=Celkem(P. vč. DPH) [col7]
  for (const rowIdx of itemRowIndices) {
    const r = rowIdx + 1;
    ws[XLSX.utils.encode_cell({ r: rowIdx, c: 5 })] = { f: `ROUND(D${r}*(1+E${r}/100)*${MULTIPLIER_CELL},2)`, t: "n", s: NUM_FMT_2 };
    ws[XLSX.utils.encode_cell({ r: rowIdx, c: 6 })] = { f: `ROUND(C${r}*D${r},2)`, t: "n", s: NUM_FMT_2 };
    ws[XLSX.utils.encode_cell({ r: rowIdx, c: 7 })] = { f: `ROUND(C${r}*F${r},2)`, t: "n", s: NUM_FMT_2 };
  }

  // Apply 2-decimal number format to all numeric summary cells
  for (const { r, c } of styles) {
    if (c >= 3 && c <= 7) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (ws[ref] && (ws[ref] as any).t === "n") {
        (ws[ref] as any).s = { ...(ws[ref] as any).s, numFmt: "#,##0.00" };
        (ws[ref] as any).v = Math.round((ws[ref] as any).v * 100) / 100;
      }
    }
  }

  ws["!cols"] = [
    { wch: 22 }, // SKU
    { wch: 42 }, // Název
    { wch: 10 }, // Množství
    { wch: 16 }, // Cena/ks (N.)
    { wch: 10 }, // DPH (%)
    { wch: 22 }, // Cena/ks (P. vč. DPH)
    { wch: 16 }, // Celkem (N.)
    { wch: 22 }, // Celkem (P. vč. DPH)
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Nabídka");

  const now = new Date();
  const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}`;
  const safeTitle = offer.title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "_");
  const filename = `nabidka-${offer.simple_id}-${safeTitle}_${ts}.xlsx`;
  XLSX.writeFile(wb, filename);
  onSuccess();
}
