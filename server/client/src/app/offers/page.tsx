"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { offersApi, type Offer } from "@/lib/api";
import { Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const statusConfig = {
  draft: { label: "Koncept", variant: "secondary" as const },
  sent: { label: "Odesláno", variant: "default" as const },
  accepted: { label: "Přijato", variant: "success" as const },
  rejected: { label: "Odmítnuto", variant: "destructive" as const },
  expired: { label: "Vypršelo", variant: "outline" as const },
};

function computeSellTotal(offer: Offer): number {
  const multiplier = Number(offer.sell_multiplier) || 1;
  const groups = (offer.items as any[]) || [];
  let subtotal = 0;
  for (const g of groups) {
    for (const item of g.items || []) {
      const vat = (item.vat_rate ?? 21) / 100;
      subtotal += item.unit_price * (1 + vat) * multiplier * item.quantity;
    }
  }
  const additionalSell = ((offer as any).additional_items || []).reduce((s: number, a: any) => s + (Number(a.sell_price) || 0), 0);
  const discount = Number(offer.discount) || 0;
  return subtotal - discount + additionalSell;
}

export default function OffersPage() {
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      setLoading(true);
      const data = await offersApi.list();
      if (data.success) {
        setOffers(data.data);
      }
    } catch (err) {
      setError("Chyba při načítání nabídek");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (offer: Offer, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await offersApi.duplicate(offer.simple_id.toString());
      toast.success("Nabídka duplikována");
      loadOffers();
    } catch {
      toast.error("Nepodařilo se duplikovat nabídku");
    }
  };

  const handleDelete = async (offer: Offer, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(offer.simple_id.toString());
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await offersApi.delete(confirmDeleteId);
      toast.success("Nabídka smazána");
      setConfirmDeleteId(null);
      loadOffers();
    } catch {
      toast.error("Nepodařilo se smazat nabídku");
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  };

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency: currency || "CZK",
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Seznam nabídek</CardTitle>
            <Button onClick={() => router.push("/products")}>Vytvořit novou nabídku</Button>
          </CardHeader>
          <CardContent>
            {loading && <div className="py-8 text-center text-muted-foreground">Načítání...</div>}

            {error && <div className="rounded-md bg-destructive/10 p-4 text-destructive">{error}</div>}

            {!loading && !error && offers.length === 0 && (
              <div className="py-12 text-center">
                <h3 className="mb-2 text-lg font-semibold">Zatím žádné nabídky</h3>
                <p className="mb-4 text-muted-foreground">Začněte vytvořením nové nabídky pro klienta</p>
                <Button onClick={() => router.push("/products")}>Vytvořit nabídku</Button>
              </div>
            )}

            {!loading && !error && offers.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>Název</TableHead>
                    <TableHead>Klient</TableHead>
                    <TableHead>Stav</TableHead>
                    <TableHead>Počet položek</TableHead>
                    <TableHead>Celkem P.</TableHead>
                    <TableHead>Vytvořeno</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.map((offer) => (
                    <TableRow key={offer.id} className="cursor-pointer" onClick={() => router.push(`/offers/${offer.simple_id}`)}>
                      <TableCell className="font-mono font-semibold">#{offer.simple_id}</TableCell>
                      <TableCell className="font-semibold">{offer.title}</TableCell>
                      <TableCell>
                        <div>{offer.customer.name}</div>
                        <div className="text-sm text-muted-foreground">{offer.customer.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[offer.status].variant}>{statusConfig[offer.status].label}</Badge>
                      </TableCell>
                      <TableCell>{offer.items?.length || 0}</TableCell>
                      <TableCell className="font-semibold">
                        {formatPrice(offer.total_rounded != null ? Number(offer.total_rounded) : Math.round(computeSellTotal(offer)), offer.currency)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(offer.created_at)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="Duplikovat"
                            onClick={(e) => handleDuplicate(offer, e)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            title="Smazat"
                            onClick={(e) => handleDelete(offer, e)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteId(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Smazat nabídku?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Tato akce je nevratná. Nabídka bude trvale odstraněna.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
              Zrušit
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Smazat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
