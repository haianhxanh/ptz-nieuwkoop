import type { Offer, ItemGroup, AdditionalItem } from "@/lib/api";
import type { OfferTotals } from "./export-offer-excel";
import { exchangeRateApi } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";

function todayStr(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

export async function downloadOfferPdf(
  offer: Offer,
  editedGroups: ItemGroup[],
  additionalItems: AdditionalItem[],
  totals: OfferTotals,
  sellMultiplier: number,
  notesText: string,
  totalRounded: number | null,
  onSuccess: () => void,
) {
  let companyData: { name: string; ico: string; dic: string; logo_url?: string };
  if (offer.companyProfile) {
    companyData = {
      name: offer.companyProfile.companyName,
      ico: offer.companyProfile.companyIco,
      dic: offer.companyProfile.companyDic,
      logo_url: offer.companyProfile.logoUrl,
    };
  } else {
    const { company, companies } = await exchangeRateApi.get();
    const logoUrl = companies?.[0]?.logoUrl;
    companyData = { name: company.name, ico: company.ico, dic: company.dic ?? "", logo_url: logoUrl };
  }

  const res = await fetch(`${API_URL}/api/offers/export-pdf`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      offer,
      editedGroups,
      additionalItems,
      totals,
      sellMultiplier,
      notesText,
      totalRounded,
      company: companyData,
    }),
  });

  if (!res.ok) {
    throw new Error(`PDF generation failed: ${res.status}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeTitle = offer.title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "_");
  const ts = todayStr().replace(/\./g, "-");
  a.href = url;
  a.download = `nabidka-${offer.simpleId}-${safeTitle}_${ts}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
  onSuccess();
}
