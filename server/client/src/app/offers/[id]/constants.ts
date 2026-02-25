import type { AdditionalItem, OfferStatus } from "@/lib/api";

export const DEFAULT_ADDITIONAL_ITEMS: AdditionalItem[] = [
  { title: "Práce", price: 0 },
  { title: "Substrát", price: 0 },
];

export const statusConfig: Record<
  OfferStatus,
  { label: string; variant: "secondary" | "default" | "success" | "destructive" | "outline" }
> = {
  draft: { label: "Koncept", variant: "secondary" },
  sent: { label: "Odesláno", variant: "default" },
  accepted: { label: "Přijato", variant: "success" },
  rejected: { label: "Odmítnuto", variant: "destructive" },
  expired: { label: "Vypršelo", variant: "outline" },
};
