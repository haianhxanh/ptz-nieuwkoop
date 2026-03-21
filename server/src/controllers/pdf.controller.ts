import { Request, Response } from "express";
import { chromium, type Browser } from "playwright";

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.isConnected()) return browserInstance;
  browserInstance = await chromium.launch({ headless: true });
  return browserInstance;
}

interface LineItem {
  name: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  image?: string;
  vat_rate?: number;
  dimensions?: {
    height?: number;
    depth?: number;
    diameter?: number;
    opening?: number;
    length?: number;
    pot_size?: string;
  };
}

interface ItemGroup {
  id: string;
  name: string;
  notes?: string;
  discount: number;
  discount_type?: "fixed" | "percent";
  items: LineItem[];
}

interface AdditionalItem {
  title: string;
  price: number;
  sell_price?: number;
}

interface OfferTotals {
  itemsSubtotal: number;
  groupsDiscount: number;
  totalDiscountAmount: number;
  additionalCostTotal: number;
  additionalSellTotal: number;
  subtotal: number;
  total: number;
  totalSell: number;
  totalRounded?: number | null;
  totalSellExclVat: number;
}

interface PdfRequestBody {
  offer: {
    id: string;
    simple_id: number;
    title: string;
    currency: string;
    valid_until?: string;
    tax?: number;
    notes?: string;
    user?: { name?: string; email?: string; phone?: string };
    client: {
      name: string;
      email?: string;
      phone?: string;
      address?: string;
      city?: string;
      postal_code?: string;
      company_name?: string;
      company_ico?: string;
      company_dic?: string;
    };
  };
  editedGroups: ItemGroup[];
  additionalItems: AdditionalItem[];
  totals: OfferTotals;
  sellMultiplier: number;
  notesText: string;
  totalRounded?: number | null;
  company: { name: string; ico: string; dic: string; logo_url?: string };
}

function escHtml(str: string | undefined | null): string {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: currency || "CZK",
    maximumFractionDigits: 2,
  }).format(value);
}

function todayStr(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

const getUnitPrice = (item: any) => Number(item.unitPrice ?? item.unit_price ?? 0);
const getVatRate = (item: any) => Number(item.vatRate ?? item.vat_rate ?? 21);
const getDiscountType = (group: any) => group.discountType ?? group.discount_type ?? "fixed";
const getPotSize = (dimensions?: any) => dimensions?.potSize ?? dimensions?.pot_size;
const getSellPrice = (item: any) => Number(item.sellPrice ?? item.sell_price ?? 0);
const getClientPostalCode = (client: any) => client.postalCode ?? client.postal_code;
const getClientCompanyName = (client: any) => client.companyName ?? client.company_name;
const getClientCompanyIco = (client: any) => client.companyIco ?? client.company_ico;
const getClientCompanyDic = (client: any) => client.companyDic ?? client.company_dic;
const getOfferValidUntil = (offer: any) => offer.validUntil ?? offer.valid_until;
const getCompanyLogoUrl = (company: any) => company.logoUrl ?? company.logo_url;

function renderOfferHtml(data: PdfRequestBody): string {
  const { offer, editedGroups, additionalItems, totals, sellMultiplier, notesText, totalRounded, company } = data;
  const currency = offer.currency || "CZK";
  const fmt = (v: number) => fmtCurrency(v, currency);
  const client = offer.client;
  const user = offer.user;
  const hasAdditional = additionalItems.some((a) => getSellPrice(a) > 0);

  const groupsHtml = editedGroups
    .map((group) => {
      const sectionSell = group.items.reduce((sum, i) => {
        const vat = getVatRate(i) / 100;
        return sum + getUnitPrice(i) * (1 + vat) * sellMultiplier * i.quantity;
      }, 0);
      const discountAmount = getDiscountType(group) === "percent" ? (sectionSell * (group.discount || 0)) / 100 : group.discount || 0;
      const netSell = sectionSell - discountAmount;

      const rowsHtml = group.items
        .map((item) => {
          const vatRate = getVatRate(item);
          const vat = vatRate / 100;
          const sellUnitExclVat = getUnitPrice(item) * sellMultiplier;
          const sellUnit = sellUnitExclVat * (1 + vat);
          const sellTotal = sellUnit * item.quantity;
          const vatAmount = sellUnitExclVat * vat * item.quantity;
          const imgHtml = item.image ? `<img src="${escHtml(item.image)}" class="product-img" />` : `<div class="product-img-placeholder"></div>`;
          const dimParts: string[] = [];
          if (item.dimensions) {
            if (item.dimensions.height) dimParts.push(`Výška: ${item.dimensions.height} cm`);
            if (item.dimensions.diameter) dimParts.push(`Průměr: ${item.dimensions.diameter} cm`);
            if (getPotSize(item.dimensions)) dimParts.push(`Květináč: ${getPotSize(item.dimensions)} cm`);
          }
          const dimHtml = dimParts.length > 0 ? `<div class="product-dims">${dimParts.join(" &middot; ")}</div>` : "";
          return `
          <tr class="table-row">
            <td class="col-img">${imgHtml}</td>
            <td class="col-name">
              <div class="product-name">${escHtml(item.name)}</div>
              ${dimHtml}
            </td>
            <td class="col-qty">${item.quantity}</td>
            <td class="col-unit">${fmt(sellUnitExclVat)}</td>
            <td class="col-dph-rate">${vatRate} %</td>
            <td class="col-dph-amount">${fmt(vatAmount)}</td>
            <td class="col-total">${fmt(sellTotal)}</td>
          </tr>`;
        })
        .join("");

      const discountLabel = getDiscountType(group) === "percent" ? `Sleva ${group.discount} %` : "Sleva";
      const discountHtml =
        discountAmount > 0
          ? `<tr class="discount-row"><td colspan="6" class="discount-label">${discountLabel}</td><td class="discount-value">−${fmt(discountAmount)}</td></tr>`
          : "";

      const sectionNotesHtml = group.notes ? `<div class="section-notes">${escHtml(group.notes).replace(/\n/g, "<br/>")}</div>` : "";

      return `
      <div class="section-header">
        <span class="section-title">${escHtml(group.name)}</span>
        <span class="section-total">${fmt(netSell)}</span>
      </div>
      ${sectionNotesHtml}
      <table class="product-table">
        <thead>
          <tr>
            <th class="col-img"></th>
            <th class="col-name th-label">Produkt</th>
            <th class="col-qty th-label">Mn.</th>
            <th class="col-unit th-label">Cena/ks</th>
            <th class="col-dph-rate th-label">Sazba</th>
            <th class="col-dph-amount th-label">DPH</th>
            <th class="col-total th-label">Celkem s DPH</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          ${discountHtml}
        </tbody>
      </table>`;
    })
    .join("");

  const additionalHtml = hasAdditional
    ? `<div class="add-section-title">Další položky</div>
       <table class="product-table">
         <thead>
           <tr>
             <th class="col-name th-label">Položka</th>
             <th class="col-unit th-label">Cena/ks</th>
             <th class="col-dph-rate th-label">Sazba</th>
             <th class="col-dph-amount th-label">DPH</th>
             <th class="col-total th-label">Celkem s DPH</th>
           </tr>
         </thead>
         <tbody>
           ${additionalItems
            .filter((a) => getSellPrice(a) > 0)
             .map((item) => {
              const totalWithVat = getSellPrice(item);
               const price = totalWithVat / 1.21;
               const vatAmount = totalWithVat - price;
               return `
               <tr class="table-row">
                 <td class="col-name"><div class="product-name">${escHtml(item.title)}</div></td>
                 <td class="col-unit">${fmt(price)}</td>
                 <td class="col-dph-rate">21 %</td>
                 <td class="col-dph-amount">${fmt(vatAmount)}</td>
                 <td class="col-total">${fmt(totalWithVat)}</td>
               </tr>`;
             })
             .join("")}
         </tbody>
       </table>`
    : "";

  const finalSell = totalRounded != null ? Number(totalRounded) : Math.round(Number(totals.totalSell));

  let calcExclVat = 0;
  let calcInclVat = 0;
  for (const group of editedGroups) {
    const sectionSell = group.items.reduce((sum, i) => {
      const vat = getVatRate(i) / 100;
      return sum + getUnitPrice(i) * (1 + vat) * sellMultiplier * i.quantity;
    }, 0);
    const disc = getDiscountType(group) === "percent" ? (sectionSell * (group.discount || 0)) / 100 : group.discount || 0;
    const sectionExcl = group.items.reduce((sum, i) => sum + getUnitPrice(i) * sellMultiplier * i.quantity, 0);
    const exclDisc = sectionExcl > 0 && sectionSell > 0 ? sectionExcl * (1 - disc / sectionSell) : sectionExcl;
    calcExclVat += exclDisc;
    calcInclVat += sectionSell - disc;
  }
  for (const a of additionalItems) {
    const sp = getSellPrice(a);
    if (sp > 0) {
      calcInclVat += sp;
      calcExclVat += sp / 1.21;
    }
  }
  const dphAmount = calcInclVat - calcExclVat;

  const summaryRows: string[] = [];
  if (totals.groupsDiscount > 0) {
    summaryRows.push(`<div class="summary-row"><span>Sleva celkem</span><span>−${fmt(totals.groupsDiscount)}</span></div>`);
  }
  summaryRows.push(`<div class="summary-row"><span>Celkem bez DPH</span><span>${fmt(calcExclVat)}</span></div>`);
  summaryRows.push(`<div class="summary-row"><span>DPH</span><span>${fmt(dphAmount)}</span></div>`);

  const logoHtml = getCompanyLogoUrl(company)
    ? `<img src="${escHtml(getCompanyLogoUrl(company))}" class="company-logo" />`
    : `<div class="company-name">${escHtml(company.name || "Dodavatel")}</div>`;

  return `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8" />
<style>
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700&display=swap');

  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Poppins', sans-serif;
    font-size: 12px;
    color: #111111;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    max-width: 1024px;
    margin: 0 auto;
    padding: 56px 52px 80px;
    position: relative;
  }

  /* Header */
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 24px;
    margin-bottom: 32px;
  }
  .company-name { font-size: 17px; font-weight: 700; }
  .company-logo { height: 40px; max-width: 200px; margin-bottom: 4px; object-fit: contain; }
  .offer-right { text-align: right; }
  .offer-title { font-size: 12px; color: #6b7280; margin-top: 1px; }
  .offer-date { font-size: 11px; color: #6b7280; margin-top: 1px; }

  /* Info grid */
  .info-grid {
    display: flex;
    gap: 32px;
    margin-bottom: 32px;
  }
  .info-block { flex: 1; }
  .info-accent { width: 20px; height: 2px; background-color: #00582b; margin-bottom: 5px; }
  .info-label {
    font-size: 10px;
    font-weight: 700;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 6px;
  }
  .info-name { font-size: 13px; font-weight: 700; margin-bottom: 2px; }
  .info-line { font-size: 12px; margin-bottom: 1px; }
  .info-muted { font-size: 11px; color: #6b7280; margin-bottom: 1px; }
  .info-separator { border-top: 1px solid #e5e7eb; margin-top: 8px; margin-bottom: 6px; }
  .info-sub-label {
    font-size: 10px;
    font-weight: 700;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 4px;
  }

  /* Sections */
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-top: 20px;
    margin-bottom: 6px;
    background-color: #f2f2f2;
    padding: 6px 8px;
  }
  .section-notes {
    font-size: 10px;
    color: #4b5563;
    font-style: italic;
    padding: 4px 8px 6px;
    line-height: 1.4;
  }
  .section-title {
    font-size: 11px;
    font-weight: 700;
    color: #00582b;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }
  .section-total { font-size: 11px; font-weight: 700; color: #00582b; }

  /* Product table */
  .product-table {
    width: 100%;
    border-collapse: collapse;
  }
  .product-table thead tr {
    border-bottom: 0.5px solid #9ca3af;
  }
  .th-label {
    font-size: 10.5px;
    font-weight: 700;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    padding-bottom: 4px;
    text-align: left;
  }
  .col-img { width: 40px; }
  .col-name { padding: 0 6px; }
  .col-qty { width: 32px; text-align: right; font-size: 11px; }
  .col-dph-rate { width: 50px; text-align: right; font-size: 11px; }
  .col-dph-amount { width: 70px; text-align: right; font-size: 11px; }
  .col-unit { width: 110px; text-align: right; font-size: 11px; }
  .col-total { width: 120px; text-align: right; font-size: 11px; }
  .th-label.col-qty, .th-label.col-dph-rate, .th-label.col-dph-amount, .th-label.col-unit, .th-label.col-total { text-align: right; }

  .table-row td {
    padding: 5px 0;
    border-bottom: 1px solid #e5e7eb;
    vertical-align: middle;
  }
  .table-row .col-name { padding: 5px 6px; }
  .table-row .col-total { font-weight: 500; }

  .product-img {
    width: 48px;
    height: 48px;
    border-radius: 2px;
    object-fit: contain;
  }
  .product-img-placeholder {
    width: 36px;
    height: 36px;
    border-radius: 2px;
    background-color: #e5e7eb;
  }
  .product-name { font-size: 12px; font-weight: 500; }
  .product-sku { font-size: 10.5px; color: #6b7280; margin-top: 1px; }
  .product-dims { font-size: 10px; color: #9ca3af; margin-top: 1px; }

  /* Discount row */
  .discount-row td { border: none; padding: 4px 0; color:rgb(220, 68, 68);}
  .discount-label { text-align: right; font-size: 11px; padding-right: 8px !important; }
  .discount-value { text-align: right; font-size: 11px; width: 78px; }

  /* Additional items */
  .add-section-title {
    font-size: 11px;
    font-weight: 700;
    color: #00582b;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-top: 20px;
    margin-bottom: 6px;
  }
  .add-row {
    display: flex;
    justify-content: space-between;
    padding: 5px 0;
    border-bottom: 1px solid #e5e7eb;
  }
  .add-label { font-size: 12px; }
  .add-value { font-size: 12px; font-weight: 500; }

  /* Summary */
  .summary-area { margin-top: 24px; padding-top: 12px; }
  .summary-row {
    display: flex;
    justify-content: space-between;
    padding: 3px 0;
    font-size: 12px;
  }
  .total-row {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    padding-top: 10px;
    border-top: 1.5px solid #00582b;
  }
  .total-label, .total-value {
    font-size: 16px;
    font-weight: 700;
    color: #00582b;
  }

  /* Notes */
  .notes-area { margin-top: 24px; }
  .notes-label {
    font-size: 10.5px;
    font-weight: 700;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 5px;
  }
  .notes-text { font-size: 12px; line-height: 1.6; }

  /* Validity & Payment terms */
  .terms-area { margin-top: 28px; }
  .terms-label {
    font-size: 10.5px;
    font-weight: 700;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-top: 12px;
    margin-bottom: 5px;
  }
  .terms-text { font-size: 12px; line-height: 1.6; color: #374151; }

  /* Footer is handled by Playwright's displayHeaderFooter for pagination */
</style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header-row">
    <div>${logoHtml}</div>
    <div class="offer-right">
      <div class="offer-date">Datum: ${todayStr()}</div>
      ${getOfferValidUntil(offer) ? `<div class="offer-date">Platná do: ${new Date(getOfferValidUntil(offer)).toLocaleDateString("cs-CZ")}</div>` : ""}
    </div>
  </div>

  <!-- Info grid -->
  <div class="info-grid">
    <div class="info-block">
      <div class="info-accent"></div>
      <div class="info-label">Dodavatel</div>
      ${company.name ? `<div class="info-name">${escHtml(company.name)}</div>` : ""}
      ${company.ico ? `<div class="info-muted">IČO: ${escHtml(company.ico)}</div>` : ""}
      ${company.dic ? `<div class="info-muted">DIČ: ${escHtml(company.dic)}</div>` : ""}
      ${
        user?.name || user?.email || user?.phone
          ? `<div class="info-separator"></div>
             <div class="info-sub-label">Nabídku připravil/a</div>
             ${user.name ? `<div class="info-line">${escHtml(user.name)}</div>` : ""}
             ${user.email ? `<div class="info-muted">${escHtml(user.email)}</div>` : ""}
             ${user.phone ? `<div class="info-muted">${escHtml(user.phone)}</div>` : ""}`
          : ""
      }
    </div>
    <div class="info-block">
      <div class="info-accent"></div>
      <div class="info-label">Odběratel</div>
      <div class="info-name">${escHtml(client.name)}</div>
      ${getClientCompanyName(client) ? `<div class="info-line">${escHtml(getClientCompanyName(client))}</div>` : ""}
      ${getClientCompanyIco(client) ? `<div class="info-muted">IČO: ${escHtml(getClientCompanyIco(client))}</div>` : ""}
      ${getClientCompanyDic(client) ? `<div class="info-muted">DIČ: ${escHtml(getClientCompanyDic(client))}</div>` : ""}
      ${client.email ? `<div class="info-muted">${escHtml(client.email)}</div>` : ""}
      ${
        client.address
          ? `<div class="info-muted">${escHtml(client.address)}${getClientPostalCode(client) ? `, ${escHtml(getClientPostalCode(client))}` : ""}${client.city ? ` ${escHtml(client.city)}` : ""}</div>`
          : ""
      }
      ${client.phone ? `<div class="info-muted">${escHtml(client.phone)}</div>` : ""}
    </div>
  </div>

  <!-- Product sections -->
  ${groupsHtml}

  <!-- Additional items -->
  ${additionalHtml}

  <!-- Summary -->
  <div class="summary-area">
    ${summaryRows.join("")}
    <div class="total-row">
      <span class="total-label">Celkem s DPH</span>
      <span class="total-value">${fmt(finalSell)}</span>
    </div>
  </div>

  <!-- Notes -->
  ${
    notesText
      ? `<div class="notes-area">
           <div class="notes-label">Poznámka</div>
           <div class="notes-text">${escHtml(notesText)}</div>
         </div>`
      : ""
  }

  <!-- Validity & Payment terms -->
  <div class="terms-area">
    <div class="terms-text">Platnost nabídky je 14 dní.</div>
    <div class="terms-text">Po odsouhlasení cenové nabídky Vám vystavíme zálohovou fakturu. Po jejím uhrazení činí dodací lhůta přibližně 2 týdny dle dostupnosti jednotlivých položek.</div>
  </div>

</div>
</body>
</html>`;
}

export const exportOfferPdf = async (req: Request, res: Response) => {
  try {
    const body = req.body as PdfRequestBody;
    if (!body.offer || !body.editedGroups || !body.totals) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const html = renderOfferHtml(body);
    const browser = await getBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.setContent(html, { waitUntil: "networkidle" });

    const footerHtml = `
      <div style="width:100%;padding:6px 52px 0;display:flex;justify-content:center;font-family:'Poppins',sans-serif;font-size:9px;color:#6b7280;">
        <span>Strana <span class="pageNumber"></span> z <span class="totalPages"></span></span>
      </div>`;

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: footerHtml,
      margin: { top: "40px", bottom: "60px", left: "0px", right: "0px" },
    });

    await context.close();

    res.set("Content-Type", "application/pdf");
    res.set("Content-Disposition", `attachment; filename="nabidka-${body.offer.simple_id}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF generation error:", error);
    return res.status(500).json({ error: "Failed to generate PDF" });
  }
};
