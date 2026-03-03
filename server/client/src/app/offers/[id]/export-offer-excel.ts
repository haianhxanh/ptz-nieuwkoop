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
  const RED = { font: { color: { rgb: "CC0000" } } };
  const GREEN = { font: { bold: true, color: { rgb: "1A7340" } } };
  const BOLD_LARGE = { font: { bold: true, sz: 11 } };

  // ── Offer header ─────────────────────────────────────────────────────────────

  styleCell(0, 0, BOLD_TITLE);
  pushRow([`Nabídka #${offer.simple_id} - ${offer.title}`]);
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
  pushRow([]);

  // ── Column header ─────────────────────────────────────────────────────────────
  // A=SKU  B=Název  C=Množství  D=Cena/ks(N.)  E=Cena/ks(P.)  F=Celkem(N.)  G=Celkem(P.)

  const colHeader = ["SKU", "Název", "Množství", "Cena/ks (N.)", "Cena/ks (P.)", "Celkem (N.)", "Celkem (P.)"];
  const headerRowIdx = currentRow();
  for (let c = 0; c < colHeader.length; c++) styleCell(headerRowIdx, c, BOLD);
  pushRow(colHeader);

  const itemRowIndices: number[] = [];

  // ── Product groups ────────────────────────────────────────────────────────────

  for (const group of editedGroups) {
    // Group name row
    const groupNameRow = currentRow();
    styleCell(groupNameRow, 0, BOLD_ITALIC);
    pushRow([group.name, "", "", "", "", "", ""]);

    // Item rows
    for (const item of group.items) {
      itemRowIndices.push(currentRow());
      pushRow([item.sku || "", item.name, Number(item.quantity) || 1, Number(item.unit_price) || 0, "", "", ""]);
    }

    // Section subtotal
    const sectionN = group.items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    const sectionP = sectionN * sellMultiplier;
    const subtotalRow = currentRow();
    styleCell(subtotalRow, 0, MUTED);
    styleCell(subtotalRow, 5, MUTED);
    styleCell(subtotalRow, 6, MUTED);
    pushRow([`Součet — ${group.name}`, "", "", "", "", sectionN, sectionP]);

    // Section discount
    if (group.discount > 0) {
      const discRow = currentRow();
      styleCell(discRow, 0, RED);
      styleCell(discRow, 5, RED);
      styleCell(discRow, 6, RED);
      pushRow([`Sleva — ${group.name}`, "", "", "", "", -group.discount, -group.discount]);
    }
  }

  pushRow([]);

  // ── Additional items ──────────────────────────────────────────────────────────

  const hasAdditional = additionalItems.some((a) => (Number(a.price) || 0) > 0 || (Number(a.sell_price) || 0) > 0);
  if (hasAdditional) {
    const addRow = currentRow();
    styleCell(addRow, 0, BOLD);
    pushRow(["Dodatečné položky", "", "", "", "", "", ""]);
    for (const item of additionalItems) {
      const price = Number(item.price) || 0;
      const sellPrice = Number(item.sell_price) || 0;
      if (price > 0 || sellPrice > 0) {
        pushRow(["", item.title, "", "", "", price || "", sellPrice || ""]);
      }
    }
    pushRow([]);
  }

  // ── Summary ───────────────────────────────────────────────────────────────────

  const meziRow = currentRow();
  styleCell(meziRow, 0, MUTED);
  styleCell(meziRow, 5, MUTED);
  styleCell(meziRow, 6, MUTED);
  pushRow(["Mezisoučet (N./P.):", "", "", "", "", totals.itemsSubtotal, totals.itemsSubtotal * sellMultiplier]);

  if (totals.groupsDiscount > 0) {
    const slevaRow = currentRow();
    styleCell(slevaRow, 0, RED);
    styleCell(slevaRow, 5, RED);
    styleCell(slevaRow, 6, RED);
    pushRow(["Sleva celkem:", "", "", "", "", -totals.groupsDiscount, -totals.groupsDiscount]);
  }

  if (offer.tax && offer.tax > 0) {
    pushRow(["DPH:", "", "", "", "", Number(offer.tax), Number(offer.tax)]);
  }

  pushRow([]);

  const nakupRow = currentRow();
  styleCell(nakupRow, 0, BOLD_LARGE);
  styleCell(nakupRow, 5, BOLD_LARGE);
  pushRow(["Celkem nákup:", "", "", "", "", totals.total, ""]);

  const prodejRow = currentRow();
  styleCell(prodejRow, 0, BOLD_LARGE);
  styleCell(prodejRow, 6, BOLD_LARGE);
  pushRow(["Celkem prodej:", "", "", "", "", "", totals.totalSell]);

  const marze = totals.totalSell - totals.total;
  const marzePercent = totals.total > 0 ? ((marze / totals.total) * 100).toFixed(1) : "0.0";
  const marzeRow = currentRow();
  styleCell(marzeRow, 0, GREEN);
  styleCell(marzeRow, 6, GREEN);
  pushRow([`Marže (${marzePercent} %):`, "", "", "", "", "", marze]);

  pushRow([]);

  if (sellMultiplier !== 1) {
    const kRow = currentRow();
    styleCell(kRow, 0, MUTED);
    pushRow([`Koeficient prodeje: ${sellMultiplier}`]);
  }

  pushRow(["Směnný kurz:", `1 EUR = ${displayExchangeRate.toFixed(2)} CZK`]);

  if (notesText) {
    pushRow([]);
    pushRow(["Poznámka:", notesText]);
  }

  // ── Build worksheet ───────────────────────────────────────────────────────────

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Apply styles
  for (const { r, c, style } of styles) {
    const ref = XLSX.utils.encode_cell({ r, c });
    if (ws[ref]) (ws[ref] as any).s = style;
  }

  // Excel formulas for item rows (after sheet is built so we can set cell objects)
  // D = Cena/ks (N.) [col 3], E = Cena/ks (P.) [col 4], F = Celkem (N.) [col 5], G = Celkem (P.) [col 6]
  for (const rowIdx of itemRowIndices) {
    const r = rowIdx + 1; // 1-based Excel row
    ws[XLSX.utils.encode_cell({ r: rowIdx, c: 4 })] = { f: `D${r}*${sellMultiplier}`, t: "n" };
    ws[XLSX.utils.encode_cell({ r: rowIdx, c: 5 })] = { f: `C${r}*D${r}`, t: "n" };
    ws[XLSX.utils.encode_cell({ r: rowIdx, c: 6 })] = { f: `C${r}*E${r}`, t: "n" };
  }

  ws["!cols"] = [
    { wch: 22 }, // SKU
    { wch: 42 }, // Název
    { wch: 10 }, // Množství
    { wch: 16 }, // Cena/ks (N.)
    { wch: 16 }, // Cena/ks (P.)
    { wch: 16 }, // Celkem (N.)
    { wch: 16 }, // Celkem (P.)
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
