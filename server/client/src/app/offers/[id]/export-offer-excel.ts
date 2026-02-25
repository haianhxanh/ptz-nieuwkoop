import * as XLSX from "xlsx-js-style";
import type { Offer, LineItem, AdditionalItem } from "@/lib/api";
import { formatDate } from "./utils";

export type OfferTotals = {
  itemsSubtotal: number;
  itemsDiscount: number;
  orderDiscount: number;
  totalDiscountAmount: number;
  additionalTotal: number;
  subtotal: number;
  subtotalWithAdditional: number;
  total: number;
};

export function buildAndDownloadOfferExcel(
  offer: Offer,
  editedItems: LineItem[],
  additionalItems: AdditionalItem[],
  totals: OfferTotals,
  displayExchangeRate: number,
  notesText: string,
  onSuccess: () => void,
): void {
  const wb = XLSX.utils.book_new();
  const data: (string | number)[][] = [];

  data.push([`Nabídka #${offer.simple_id} - ${offer.title}`]);
  data.push([]);
  data.push(["Zákazník:", offer.customer.name]);
  data.push(["Email:", offer.customer.email]);
  if (offer.customer.phone) data.push(["Telefon:", offer.customer.phone]);
  if (offer.customer.address) {
    data.push(["Adresa:", offer.customer.address]);
    data.push(["", `${offer.customer.postal_code} ${offer.customer.city}`]);
    if (offer.customer.country) data.push(["", offer.customer.country]);
  }
  data.push([]);
  data.push(["Vytvořeno:", formatDate(offer.created_at)]);
  data.push([]);

  const productHeaderRowIndex = data.length;
  data.push(["SKU", "Název", "Množství", "Cena/ks (Kč)", "Sleva", "Celkem"]);
  editedItems.forEach((item) => {
    data.push([item.sku || "", item.name, Number(item.quantity) || 1, Number(item.unit_price) || 0, Number(item.discount) || 0, ""]);
  });
  additionalItems.forEach((item) => {
    const price = Number(item.price) || 0;
    if (price > 0) {
      data.push(["", item.title, 1, price, 0, ""]);
    }
  });
  data.push([]);

  const tableRowCount = editedItems.length + additionalItems.filter((a) => Number(a.price) > 0).length;
  const emptyToF = ["", "", "", ""];
  const summaryStartRowIndex = data.length;

  data.push(["Mezisoučet:", ...emptyToF, ""]);
  if (totals.orderDiscount > 0) {
    data.push(["Sleva na objednávku:", ...emptyToF, -(totals.orderDiscount || 0)]);
  }
  if (offer.tax && offer.tax > 0) {
    data.push(["DPH:", ...emptyToF, Number(offer.tax) || 0]);
  }
  data.push(["Celkem:", ...emptyToF, "", offer.currency]);
  data.push([]);
  data.push(["Směnný kurz:", `1 EUR = ${displayExchangeRate.toFixed(2)} CZK`]);
  if (notesText) {
    data.push([]);
    data.push(["Poznámka:", notesText]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);

  for (let c = 0; c <= 5; c++) {
    const ref = XLSX.utils.encode_cell({ r: productHeaderRowIndex, c });
    if (ws[ref]) (ws[ref] as { s?: { font: { bold: boolean } } }).s = { font: { bold: true } };
  }

  const firstItemExcelRow = productHeaderRowIndex + 2;
  const lastItemExcelRow = productHeaderRowIndex + tableRowCount + 1;
  for (let i = 0; i < tableRowCount; i++) {
    const excelRow = firstItemExcelRow + i;
    const cellRef = XLSX.utils.encode_cell({ r: productHeaderRowIndex + 1 + i, c: 5 });
    ws[cellRef] = { f: `C${excelRow}*D${excelRow}-E${excelRow}`, t: "n" };
  }

  const mezisoučetCell = XLSX.utils.encode_cell({ r: summaryStartRowIndex, c: 5 });
  ws[mezisoučetCell] = { f: `SUM(F${firstItemExcelRow}:F${lastItemExcelRow})`, t: "n" };

  const summaryValueCount = 1 + (totals.orderDiscount > 0 ? 1 : 0) + (offer.tax && offer.tax > 0 ? 1 : 0);
  let summaryRow = summaryStartRowIndex + 1;
  if (totals.orderDiscount > 0) {
    ws[XLSX.utils.encode_cell({ r: summaryRow, c: 5 })] = { t: "n", v: -(totals.orderDiscount || 0) };
    summaryRow++;
  }
  if (offer.tax && offer.tax > 0) {
    ws[XLSX.utils.encode_cell({ r: summaryRow, c: 5 })] = { t: "n", v: Number(offer.tax) || 0 };
    summaryRow++;
  }
  const celkemRowIndex = summaryStartRowIndex + summaryValueCount;
  const celkemCell = XLSX.utils.encode_cell({ r: celkemRowIndex, c: 5 });
  const excelSummaryFirst = summaryStartRowIndex + 1;
  const excelSummaryLast = summaryStartRowIndex + summaryValueCount;
  ws[celkemCell] = { f: `SUM(F${excelSummaryFirst}:F${excelSummaryLast})`, t: "n" };

  ws["!cols"] = [{ wch: 15 }, { wch: 40 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 15 }];

  XLSX.utils.book_append_sheet(wb, ws, "Nabídka");

  const now = new Date();
  const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}`;
  const filename = `nabidka-${offer.simple_id}-${offer.title.replace(/[^a-z0-9]/gi, "_")}_${ts}.xlsx`;
  XLSX.writeFile(wb, filename);
  onSuccess();
}
