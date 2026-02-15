export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("cs-CZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: currency || "CZK",
  }).format(amount);
}

export function currencyLabel(currency: string): string {
  return currency === "CZK" ? "Kč" : currency || "Kč";
}
