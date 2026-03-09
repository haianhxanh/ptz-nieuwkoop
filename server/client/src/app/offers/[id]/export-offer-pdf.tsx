import { Document, Page, Text, View, Image, StyleSheet, pdf, Font } from "@react-pdf/renderer";
import type { Offer, ItemGroup, AdditionalItem } from "@/lib/api";
import type { OfferTotals } from "./export-offer-excel";
import { exchangeRateApi } from "@/lib/api";

// ── Fonts ─────────────────────────────────────────────────────────────────────

const fontBase = typeof window !== "undefined" ? window.location.origin + "/app" : "";

Font.register({
  family: "Poppins",
  fonts: [
    { src: `${fontBase}/fonts/Poppins-Regular.ttf`, fontWeight: 400 },
    { src: `${fontBase}/fonts/Poppins-Medium.ttf`, fontWeight: 500 },
    { src: `${fontBase}/fonts/Poppins-Bold.ttf`, fontWeight: 700 },
  ],
});

Font.registerHyphenationCallback((word) => [word]);

// ── Palette ───────────────────────────────────────────────────────────────────

const ink = "#111111";
const muted = "#6b7280";
const border = "#e5e7eb";
const green = "#00582b";

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: "Poppins",
    fontWeight: 400,
    fontSize: 10,
    color: ink,
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 52,
    lineHeight: 1.5,
  },

  // ── Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 24,
    marginBottom: 32,
  },
  companyName: { fontSize: 15, fontWeight: 700, color: ink },
  offerRight: { alignItems: "flex-end" },
  offerTitle: { fontSize: 10, color: muted, marginTop: 1 },
  offerDate: { fontSize: 9, color: muted, marginTop: 1 },

  // ── Info grid (no background)
  infoGrid: { flexDirection: "row", gap: 32, marginBottom: 32 },
  infoBlock: { flex: 1 },
  infoAccent: { width: 20, height: 2, backgroundColor: green, marginBottom: 5 },
  infoLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  infoName: { fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 },
  infoLine: { fontSize: 10, color: ink, marginBottom: 1 },
  infoMuted: { fontSize: 9, color: muted, marginBottom: 1 },
  infoSeparator: { borderTopWidth: 1, borderTopColor: border, marginTop: 8, marginBottom: 6 },
  infoSubLabel: { fontSize: 8, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },

  // ── Section
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 20, marginBottom: 6 },
  sectionTitle: { fontSize: 9, fontWeight: 700, color: green, textTransform: "uppercase", letterSpacing: 0.8 },
  sectionTotal: { fontSize: 9, fontWeight: 700, color: green },

  // ── Table
  tableHead: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#9ca3af", paddingBottom: 4, marginBottom: 2 },
  tableHeadCell: { fontSize: 8.5, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 0.4 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: border },

  colImg: { width: 28 },
  colName: { flex: 1, paddingHorizontal: 6 },
  colQty: { width: 38, textAlign: "right" },
  colUnit: { width: 72, textAlign: "right" },
  colTotal: { width: 78, textAlign: "right" },

  productImg: { width: 24, height: 24, borderRadius: 2 },
  productImgPlaceholder: { width: 24, height: 24, borderRadius: 2, backgroundColor: border },
  productName: { fontSize: 10, fontWeight: 500, color: ink },
  productSku: { fontSize: 8.5, color: muted, marginTop: 1 },

  // ── Discount
  discountRow: { flexDirection: "row", justifyContent: "flex-end", paddingVertical: 4 },
  discountLabel: { fontSize: 9, color: ink, marginRight: 8 },
  discountValue: { width: 78, textAlign: "right", fontSize: 9, color: ink },

  // ── Additional items
  addSectionTitle: { fontSize: 9, fontWeight: 700, color: green, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 20, marginBottom: 6 },
  addRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: border },
  addLabel: { fontSize: 10, color: ink },
  addValue: { fontSize: 10, fontWeight: 500 },

  // ── Summary
  summaryArea: { marginTop: 24, paddingTop: 12 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  summaryLabel: { fontSize: 10, color: ink },
  summaryValue: { fontSize: 10 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 10, borderTopWidth: 1.5, borderTopColor: green },
  totalLabel: { fontSize: 14, fontWeight: 700, color: green },
  totalValue: { fontSize: 14, fontWeight: 700, color: green },

  // ── Notes
  notesArea: { marginTop: 24 },
  notesLabel: { fontSize: 8.5, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 5 },
  notesText: { fontSize: 10, color: ink, lineHeight: 1.6 },

  // ── Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: border,
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: muted },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(value: number, currency: string): string {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: currency || "CZK", maximumFractionDigits: 0 }).format(value);
}

function todayStr(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function proxyImageUrl(originalUrl: string): string {
  return `/api/offers/image-proxy?url=${encodeURIComponent(originalUrl)}`;
}

// ── PDF Document ──────────────────────────────────────────────────────────────

type Props = {
  offer: Offer;
  editedGroups: ItemGroup[];
  additionalItems: AdditionalItem[];
  totals: OfferTotals;
  sellMultiplier: number;
  notesText: string;
  company: { name: string; ico: string; dic: string; logo_url?: string };
};

function OfferPdfDocument({ offer, editedGroups, additionalItems, totals, sellMultiplier, notesText, company }: Props) {
  const currency = offer.currency || "CZK";
  const user = offer.user;
  const customer = offer.customer;
  const hasAdditional = additionalItems.some((a) => (Number(a.sell_price) || 0) > 0);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── Header ── */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.companyName}>{company.name || "Dodavatel"}</Text>
          </View>
          <View style={s.offerRight}>
            <Text style={s.offerTitle}>{offer.title}</Text>
            <Text style={s.offerDate}>Datum: {todayStr()}</Text>
            {offer.valid_until && <Text style={s.offerDate}>Platná do: {new Date(offer.valid_until).toLocaleDateString("cs-CZ")}</Text>}
          </View>
        </View>

        {/* ── Info grid ── */}
        <View style={s.infoGrid}>
          {/* Dodavatel */}
          <View style={s.infoBlock}>
            <View style={s.infoAccent} />
            <Text style={s.infoLabel}>Dodavatel</Text>
            {company.name ? <Text style={s.infoName}>{company.name}</Text> : null}
            {company.ico ? <Text style={s.infoMuted}>IČO: {company.ico}</Text> : null}
            {company.dic ? <Text style={s.infoMuted}>DIČ: {company.dic}</Text> : null}

            {(user?.name || user?.email || user?.phone) && (
              <>
                <View style={s.infoSeparator} />
                <Text style={s.infoSubLabel}>Nabídku připravil/a</Text>
                {user.name ? <Text style={s.infoLine}>{user.name}</Text> : null}
                {user.email ? <Text style={s.infoMuted}>{user.email}</Text> : null}
                {user.phone ? <Text style={s.infoMuted}>{user.phone}</Text> : null}
              </>
            )}
          </View>

          {/* Odběratel */}
          <View style={s.infoBlock}>
            <View style={s.infoAccent} />
            <Text style={s.infoLabel}>Odběratel</Text>
            <Text style={s.infoName}>{customer.name}</Text>
            {customer.company_name ? <Text style={s.infoLine}>{customer.company_name}</Text> : null}
            {customer.company_ico ? <Text style={s.infoMuted}>IČO: {customer.company_ico}</Text> : null}
            {customer.company_dic ? <Text style={s.infoMuted}>DIČ: {customer.company_dic}</Text> : null}
            {customer.email ? <Text style={s.infoMuted}>{customer.email}</Text> : null}
            {customer.phone ? <Text style={s.infoMuted}>{customer.phone}</Text> : null}
            {customer.address ? (
              <Text style={s.infoMuted}>
                {customer.address}
                {customer.postal_code ? `, ${customer.postal_code}` : ""}
                {customer.city ? ` ${customer.city}` : ""}
              </Text>
            ) : null}
          </View>
        </View>

        {/* ── Product sections ── */}
        {editedGroups.map((group) => {
          const sectionSell = group.items.reduce((sum, i) => sum + i.unit_price * i.quantity * sellMultiplier, 0);
          const netSell = sectionSell - (group.discount || 0);

          return (
            <View key={group.id}>
              <View style={s.sectionRow}>
                <Text style={s.sectionTitle}>{group.name}</Text>
                <Text style={s.sectionTotal}>{fmt(netSell, currency)}</Text>
              </View>

              <View style={s.tableHead}>
                <View style={s.colImg} />
                <Text style={[s.tableHeadCell, s.colName]}>Produkt</Text>
                <Text style={[s.tableHeadCell, s.colQty]}>Mn.</Text>
                <Text style={[s.tableHeadCell, s.colUnit]}>Cena/ks</Text>
                <Text style={[s.tableHeadCell, s.colTotal]}>Celkem</Text>
              </View>

              {group.items.map((item, idx) => {
                const sellUnit = item.unit_price * sellMultiplier;
                const sellTotal = sellUnit * item.quantity;
                const imgSrc = item.image ? proxyImageUrl(item.image) : null;

                return (
                  <View key={idx} style={s.tableRow}>
                    <View style={s.colImg}>{imgSrc ? <Image src={imgSrc} style={s.productImg} /> : <View style={s.productImgPlaceholder} />}</View>
                    <View style={s.colName}>
                      <Text style={s.productName}>{item.name}</Text>
                      {item.sku ? <Text style={s.productSku}>{item.sku}</Text> : null}
                    </View>
                    <Text style={[s.colQty, { fontSize: 9 }]}>{item.quantity}</Text>
                    <Text style={[s.colUnit, { fontSize: 9 }]}>{fmt(sellUnit, currency)}</Text>
                    <Text style={[s.colTotal, { fontSize: 9, fontWeight: 500 }]}>{fmt(sellTotal, currency)}</Text>
                  </View>
                );
              })}

              {group.discount > 0 && (
                <View style={s.discountRow}>
                  <Text style={s.discountLabel}>Sleva</Text>
                  <Text style={s.discountValue}>−{fmt(group.discount, currency)}</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* ── Additional items ── */}
        {hasAdditional && (
          <View>
            <Text style={s.addSectionTitle}>Další položky</Text>
            {additionalItems
              .filter((a) => (Number(a.sell_price) || 0) > 0)
              .map((item, idx) => (
                <View key={idx} style={s.addRow}>
                  <Text style={s.addLabel}>{item.title}</Text>
                  <Text style={s.addValue}>{fmt(Number(item.sell_price), currency)}</Text>
                </View>
              ))}
          </View>
        )}

        {/* ── Summary ── */}
        <View style={s.summaryArea}>
          {totals.groupsDiscount > 0 && (
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Sleva celkem</Text>
              <Text style={s.summaryValue}>−{fmt(totals.groupsDiscount, currency)}</Text>
            </View>
          )}
          {offer.tax && Number(offer.tax) > 0 && (
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>DPH</Text>
              <Text style={s.summaryValue}>{fmt(Number(offer.tax), currency)}</Text>
            </View>
          )}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Celkem</Text>
            <Text style={s.totalValue}>{fmt(totals.totalSell, currency)}</Text>
          </View>
        </View>

        {/* ── Notes ── */}
        {notesText ? (
          <View style={s.notesArea}>
            <Text style={s.notesLabel}>Poznámka</Text>
            <Text style={s.notesText}>{notesText}</Text>
          </View>
        ) : null}

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Nabídka #{offer.simple_id} — {offer.title}
          </Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Strana ${pageNumber} z ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

// ── Export function ───────────────────────────────────────────────────────────

export async function downloadOfferPdf(
  offer: Offer,
  editedGroups: ItemGroup[],
  additionalItems: AdditionalItem[],
  totals: OfferTotals,
  sellMultiplier: number,
  notesText: string,
  onSuccess: () => void,
) {
  // Use snapshotted company profile from the offer; fall back to API config
  let companyData: { name: string; ico: string; dic: string; logo_url?: string };
  if (offer.company_profile) {
    companyData = {
      name: offer.company_profile.company_name,
      ico: offer.company_profile.company_ico,
      dic: offer.company_profile.company_dic,
      logo_url: offer.company_profile.logo_url,
    };
  } else {
    const { company } = await exchangeRateApi.get();
    companyData = { name: company.name, ico: company.ico, dic: company.dic ?? "" };
  }

  const blob = await pdf(
    <OfferPdfDocument
      offer={offer}
      editedGroups={editedGroups}
      additionalItems={additionalItems}
      totals={totals}
      sellMultiplier={sellMultiplier}
      notesText={notesText}
      company={companyData}
    />,
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeTitle = offer.title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "_");
  const ts = todayStr().replace(/\./g, "-");
  a.href = url;
  a.download = `nabidka-${offer.simple_id}-${safeTitle}_${ts}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
  onSuccess();
}
